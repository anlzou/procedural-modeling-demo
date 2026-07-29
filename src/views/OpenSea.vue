<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import {
  Fn, pass, uniform, float, vec2, vec3, vec4,
  sin, cos, dot, cross, normalize, mix, pow, max, clamp,
  fract, floor, smoothstep, distance, reflect, If,
  positionLocal, positionWorld, cameraPosition
} from 'three/tsl'
import InfoPanel from '../components/InfoPanel.vue'
import ControlPanel from '../components/ControlPanel.vue'

/* ---------------------------------------------------------------------------
   Reactive state
   --------------------------------------------------------------------------- */
const containerRef = ref(null)
const fpsDisplay = ref('--')
const qualityLabel = ref('中')
const qualityBadge = ref('自适应')
const timeLabel = ref('午后')
const seaValue = ref('0.93')
const currentLang = ref('zh')

/* ---------------------------------------------------------------------------
   i18n — English / Chinese localization
   --------------------------------------------------------------------------- */
const L10N = {
  en: {
    'panel.eyebrow': 'Realtime Ocean',
    'panel.subtitle': 'Gerstner swell · FBM micro-surface · spectral sky',
    'panel.seaState': 'Sea State',
    'panel.timeOfDay': 'Time of Day',
    'panel.drift': 'Drift',
    'panel.uhd': 'Ultra HD',
    'panel.hint': 'DRAG TO ORBIT — SCROLL TO ZOOM',
    'time.dusk': 'DUSK',
    'time.golden': 'GOLDEN HOUR',
    'time.afternoon': 'AFTERNOON',
    'time.midday': 'MIDDAY',
    'quality.adaptive': 'ADAPTIVE',
    'quality.ultraHd': 'ULTRA HD',
    'quality.bench': 'BENCH',
    'quality.max': 'MAX',
    'tier.0': 'Ultra',
    'tier.1': 'High',
    'tier.2': 'Medium',
    'tier.3': 'Low',
    'tier.4': 'Potato',
  },
  zh: {
    'panel.eyebrow': '实时海洋',
    'panel.subtitle': '格斯特纳涌浪 · FBM微表面 · 光谱天空',
    'panel.seaState': '海况',
    'panel.timeOfDay': '时段',
    'panel.drift': '漫游',
    'panel.uhd': '超高清',
    'panel.hint': '拖拽旋转 — 滚轮缩放',
    'time.dusk': '黄昏',
    'time.golden': '黄金时段',
    'time.afternoon': '午后',
    'time.midday': '正午',
    'quality.adaptive': '自适应',
    'quality.ultraHd': '超高清',
    'quality.bench': '测试',
    'quality.max': '最高',
    'tier.0': '极致',
    'tier.1': '高',
    'tier.2': '中',
    'tier.3': '低',
    'tier.4': '基础',
  }
}

function t(key) {
  return (L10N[currentLang.value] && L10N[currentLang.value][key]) || (L10N.en[key]) || key
}

/* ---------------------------------------------------------------------------
   Quality Manager — adaptive performance scaling
   --------------------------------------------------------------------------- */
const PERF = {
  TARGET_FPS: 55,
  UPSCALE_FPS: 58,
  DOWNSCALE_FPS: 35,
  BENCHMARK_FRAMES: 20,
  STABLE_WINDOW: 2.5,
  RECORD_WINDOW: 0.8,

  tiers: [
    { pr: 2.0, ms: 440, sw: 48, sh: 24, bi: 1.0, fbm: 3, glitter: true, foam: true },
    { pr: 1.5, ms: 340, sw: 36, sh: 18, bi: 0.7, fbm: 3, glitter: true, foam: true },
    { pr: 1.2, ms: 260, sw: 28, sh: 14, bi: 0.4, fbm: 2, glitter: true, foam: false },
    { pr: 1.0, ms: 200, sw: 24, sh: 12, bi: 0.0, fbm: 2, glitter: false, foam: false },
    { pr: 0.75, ms: 140, sw: 16, sh: 8, bi: 0.0, fbm: 1, glitter: false, foam: false },
  ],

  tier: 2,
  prevTier: 2,
  benchTier: 2,
  locked: false,
  lockTimer: 0,
  ultraHd: false,
  savedTier: 2,
  stableTime: 0,
  timer: 0,
  frames: 0,
  benchPhase: true,
  benchFrames: 0,
  benchAccum: 0,
  adapt: true,

  get cfg() { return PERF.tiers[PERF.tier] || PERF.tiers[2] },

  async pickInitialTier() {
    const dpr = window.devicePixelRatio || 1
    const screenArea = window.innerWidth * window.innerHeight
    let gpuPower = dpr * 4
    try {
      const adapter = await navigator.gpu.requestAdapter()
      if (adapter) {
        const info = adapter.info || {}
        const vendor = (info.vendor || '').toLowerCase()
        const arch = (info.architecture || '').toLowerCase()
        const isLowEnd = /intel|mesa|llvmpipe|swiftshader|mali(?!(g7|g8))/.test(vendor + arch)
        const isHighEnd = /nvidia|amd|radeon|apple(?=.*(?:m[2-4]|a17|ultra))/i.test(vendor + arch)
        if (isLowEnd) gpuPower *= 0.4
        if (isHighEnd) gpuPower *= 2.2
        if (screenArea > 3_600_000) gpuPower *= 0.7
      }
    } catch { /* ignore */ }
    if (gpuPower >= 6) return 0
    if (gpuPower >= 3) return 1
    if (gpuPower >= 2) return 2
    if (gpuPower >= 1) return 3
    return 4
  },

  rebuildScene() {
    const cfg = PERF.cfg
    uFbmOctaves.value = cfg.fbm
    if (PERF.prevTier !== PERF.tier || !PERF.benchPhase) {
      PERF.rebuildOceanMesh(cfg)
      PERF.rebuildSkyDome(cfg)
      PERF.rebuildPostProcessing(cfg)
      PERF.applyPixelRatio(cfg)
    }
    PERF.prevTier = PERF.tier
  },

  rebuildOceanMesh(cfg) {
    if (window.__ocean) {
      window.__ocean.geometry.dispose()
      scene.remove(window.__ocean)
    }
    const segs = cfg.ms
    const geo = new THREE.PlaneGeometry(420, 420, segs, segs)
    geo.rotateX(-Math.PI / 2)
    const mat = new THREE.MeshBasicNodeMaterial()
    mat.positionNode = wavePosition(positionLocal.xz, uTime, uSeaUniform)
    mat.colorNode = oceanColor()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.frustumCulled = false
    scene.add(mesh)
    window.__ocean = mesh
  },

  rebuildSkyDome(cfg) {
    if (window.__sky) {
      window.__sky.geometry.dispose()
      scene.remove(window.__sky)
    }
    const segW = Math.max(cfg.sw, 8)
    const segH = Math.max(cfg.sh, 4)
    const geo = new THREE.SphereGeometry(4000, segW, segH)
    const mat = new THREE.MeshBasicNodeMaterial()
    mat.side = THREE.BackSide
    mat.depthWrite = false
    mat.colorNode = skyDomeColor()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = -1
    mesh.frustumCulled = false
    scene.add(mesh)
    window.__sky = mesh
  },

  rebuildPostProcessing(cfg) {
    if (!postProcessing) return
    const scenePass = pass(scene, camera)
    const sceneColor = scenePass.getTextureNode('output')
    if (cfg.bi > 0.001) {
      postProcessing.outputNode = sceneColor.add(bloom(sceneColor, 0.4 * cfg.bi, 0.3 * cfg.bi, 0.9))
    } else {
      postProcessing.outputNode = sceneColor
    }
  },

  applyPixelRatio(cfg) {
    const pr = Math.min(window.devicePixelRatio, cfg.pr)
    renderer.setPixelRatio(pr)
  },

  tick(dt) {
    if (!PERF.adapt) return
    PERF.timer += dt
    PERF.frames += 1
    if (PERF.benchPhase) {
      PERF.benchAccum += dt
      PERF.benchFrames += 1
      if (PERF.benchFrames >= PERF.BENCHMARK_FRAMES) {
        PERF.finishBenchmark()
      }
      return
    }
    if (PERF.timer >= PERF.RECORD_WINDOW) {
      const fps = PERF.frames / PERF.timer
      PERF.frames = 0
      PERF.timer = 0
      if (PERF.locked) {
        PERF.lockTimer -= PERF.RECORD_WINDOW
        if (PERF.lockTimer <= 0) PERF.locked = false
        return
      }
      if (fps < PERF.DOWNSCALE_FPS && PERF.tier < 4) {
        PERF.tier = Math.min(PERF.tier + 1, 4)
        PERF.locked = true
        PERF.lockTimer = 2.0
        PERF.stableTime = 0
        PERF.rebuildScene()
        updateQualityBadge()
      } else if (fps >= PERF.UPSCALE_FPS && PERF.tier > 0) {
        PERF.stableTime += PERF.RECORD_WINDOW
        if (PERF.stableTime >= PERF.STABLE_WINDOW) {
          PERF.tier = Math.max(PERF.tier - 1, 0)
          PERF.locked = true
          PERF.lockTimer = 2.5
          PERF.stableTime = 0
          PERF.rebuildScene()
          updateQualityBadge()
        }
      } else {
        PERF.stableTime = Math.max(0, PERF.stableTime - PERF.RECORD_WINDOW * 0.3)
      }
    }
  },

  async finishBenchmark() {
    const fps = PERF.benchFrames / PERF.benchAccum
    if (fps < PERF.DOWNSCALE_FPS && PERF.tier < 4) {
      PERF.tier += 1
      PERF.benchFrames = 0
      PERF.benchAccum = 0
      PERF.rebuildScene()
      return
    }
    PERF.benchPhase = false
    PERF.timer = 0
    PERF.frames = 0
    fpsDisplay.value = String(Math.round(fps))
    updateQualityBadge()
  },

  toggleUltraHd() {
    PERF.ultraHd = !PERF.ultraHd
    if (PERF.ultraHd) {
      PERF.savedTier = PERF.tier
      PERF.adapt = false
      PERF.benchPhase = false
      PERF.tier = 0
    } else {
      PERF.tier = PERF.savedTier
      PERF.adapt = true
      PERF.stableTime = 0
      PERF.timer = 0
      PERF.frames = 0
    }
    PERF.locked = true
    PERF.lockTimer = 2.0
    PERF.rebuildScene()
    updateQualityBadge()
  }
}

function updateQualityBadge() {
  if (PERF.ultraHd) {
    qualityBadge.value = t('quality.ultraHd')
    qualityLabel.value = t('quality.max')
  } else if (PERF.benchPhase) {
    qualityBadge.value = t('quality.bench')
    qualityLabel.value = '…'
  } else {
    qualityBadge.value = t('quality.adaptive')
    qualityLabel.value = t('tier.' + PERF.tier) || '—'
  }
}

/* ---------------------------------------------------------------------------
   Uniforms
   --------------------------------------------------------------------------- */
const uTime = uniform(0.0)
const uSeaUniform = uniform(0.925)
const uSunDir = uniform(new THREE.Vector3(0, 1, 0))
const uSunColor = uniform(new THREE.Color(1, 1, 1))
const uHorizonColor = uniform(new THREE.Color(0.52, 0.68, 0.82))
const uZenithColor = uniform(new THREE.Color(0.07, 0.2, 0.42))
const uDeepColor = uniform(new THREE.Color(0.015, 0.09, 0.11))
const uShallowColor = uniform(new THREE.Color(0.06, 0.32, 0.36))
const uFbmOctaves = uniform(3)

/* ---------------------------------------------------------------------------
   Waves — five directional Gerstner components
   --------------------------------------------------------------------------- */
const WAVE_DEFS = [
  { dir: [1.0, 0.0], wavelength: 60.0, steepness: 0.12 },
  { dir: [0.6, 0.8], wavelength: 31.0, steepness: 0.12 },
  { dir: [-0.7, 0.7], wavelength: 18.0, steepness: 0.09 },
  { dir: [0.3, -0.95], wavelength: 9.5, steepness: 0.07 },
  { dir: [-0.35, -0.94], wavelength: 5.0, steepness: 0.05 }
]

const WAVES = WAVE_DEFS.map(({ dir, wavelength, steepness }) => {
  const len = Math.hypot(dir[0], dir[1])
  const k = (Math.PI * 2) / wavelength
  return {
    dir: vec2(dir[0] / len, dir[1] / len),
    k: float(k),
    c: float(Math.sqrt(9.8 * k)),
    amp: float(steepness / k),
    steep: float(steepness)
  }
})

const wavePosition = Fn(([xz, time, sea]) => {
  const pos = vec3(xz.x, 0.0, xz.y).toVar()
  for (const w of WAVES) {
    const a = w.amp.mul(sea)
    const f = w.k.mul(dot(w.dir, xz).sub(time.mul(w.c)))
    pos.x.addAssign(a.mul(w.dir.x).mul(cos(f)))
    pos.y.addAssign(a.mul(sin(f)))
    pos.z.addAssign(a.mul(w.dir.y).mul(cos(f)))
  }
  return pos
})

const waveNormal = Fn(([xz, time, sea]) => {
  const tangent = vec3(1.0, 0.0, 0.0).toVar()
  const binormal = vec3(0.0, 0.0, 1.0).toVar()
  for (const w of WAVES) {
    const wa = w.steep.mul(sea)
    const f = w.k.mul(dot(w.dir, xz).sub(time.mul(w.c)))
    const sf = sin(f)
    const cf = cos(f)
    tangent.x.addAssign(wa.negate().mul(w.dir.x).mul(w.dir.x).mul(sf))
    tangent.y.addAssign(wa.mul(w.dir.x).mul(cf))
    tangent.z.addAssign(wa.negate().mul(w.dir.x).mul(w.dir.y).mul(sf))
    binormal.x.addAssign(wa.negate().mul(w.dir.x).mul(w.dir.y).mul(sf))
    binormal.y.addAssign(wa.mul(w.dir.y).mul(cf))
    binormal.z.addAssign(wa.negate().mul(w.dir.y).mul(w.dir.y).mul(sf))
  }
  return normalize(cross(binormal, tangent))
})

const waveCrest = Fn(([xz, time, sea]) => {
  const crest = float(0.0).toVar()
  for (const w of WAVES) {
    const f = w.k.mul(dot(w.dir, xz).sub(time.mul(w.c)))
    crest.addAssign(w.amp.mul(sea).mul(sin(f)))
  }
  return crest
})

/* ---------------------------------------------------------------------------
   Noise — 2D gradient noise + FBM
   --------------------------------------------------------------------------- */
const hash2 = Fn(([p]) => {
  const v = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))
  return fract(sin(v).mul(43758.5453)).mul(2.0).sub(1.0)
})

const gradNoise = Fn(([p]) => {
  const i = floor(p)
  const f = fract(p)
  const u = f.mul(f).mul(f).mul(f.mul(f.mul(6.0).sub(15.0)).add(10.0))
  const n00 = dot(hash2(i), f)
  const n10 = dot(hash2(i.add(vec2(1.0, 0.0))), f.sub(vec2(1.0, 0.0)))
  const n01 = dot(hash2(i.add(vec2(0.0, 1.0))), f.sub(vec2(0.0, 1.0)))
  const n11 = dot(hash2(i.add(vec2(1.0, 1.0))), f.sub(vec2(1.0, 1.0)))
  return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y)
})

const fbm = Fn(([p]) => {
  const val = gradNoise(p).toVar()
  const amp = float(0.5).toVar()
  const pp = vec2(p.x, p.y).toVar()
  If(uFbmOctaves.greaterThan(1), () => {
    pp.mulAssign(2.04); pp.addAssign(vec2(17.3, 9.1))
    val.addAssign(gradNoise(pp).mul(amp)); amp.mulAssign(0.5)
  })
  If(uFbmOctaves.greaterThan(2), () => {
    pp.mulAssign(2.01); pp.addAssign(vec2(25.4, 19.5))
    val.addAssign(gradNoise(pp).mul(amp)); amp.mulAssign(0.5)
  })
  return val
})

const detailHeight = Fn(([xz, time]) => {
  const driftA = vec2(time.mul(0.55), time.mul(0.32))
  const driftB = vec2(time.mul(-0.4), time.mul(0.5))
  return fbm(xz.mul(0.85).add(driftA)).add(fbm(xz.mul(2.1).add(driftB)).mul(0.45))
})

/* ---------------------------------------------------------------------------
   Sky
   --------------------------------------------------------------------------- */
const skyColor = Fn(([dir]) => {
  const d = normalize(dir)
  const up = clamp(d.y, -0.15, 1.0)
  const col = mix(uHorizonColor, uZenithColor, pow(max(up, 0.0), 0.42)).toVar()
  const haze = smoothstep(0.0, -0.15, d.y)
  col.assign(mix(col, uDeepColor.mul(1.4).add(uHorizonColor.mul(0.25)), haze))
  const s = max(dot(d, uSunDir), 0.0)
  col.addAssign(uSunColor.mul(pow(s, 10.0).mul(0.18)))
  col.addAssign(uSunColor.mul(smoothstep(0.9994, 0.9998, s).mul(30.0)))
  return col
})

const skyDomeColor = Fn(() => {
  const dir = normalize(positionLocal)
  const col = skyColor(dir).toVar()
  const band = smoothstep(0.03, 0.16, dir.y).mul(smoothstep(0.6, 0.22, dir.y))
  const cloudUV = dir.xz.div(dir.y.add(0.18)).mul(0.55)
  const cloudDrift = vec2(uTime.mul(0.006), uTime.mul(0.003))
  const cloudNoise = fbm(cloudUV.add(cloudDrift)).mul(0.5).add(0.5)
  const cloudMask = smoothstep(0.62, 0.95, cloudNoise).mul(band)
  const sunTint = normalize(uSunColor.add(vec3(0.0001)))
  const cloudColor = vec3(0.92, 0.90, 0.87).mul(mix(vec3(1.0), sunTint, 0.35))
  col.assign(mix(col, cloudColor, clamp(cloudMask, 0.0, 1.0).mul(0.6)))
  return vec4(col, 1.0)
})

/* ---------------------------------------------------------------------------
   Ocean
   --------------------------------------------------------------------------- */
const oceanColor = Fn(() => {
  const P = positionWorld
  const xz = P.xz
  const N0 = waveNormal(xz, uTime, uSeaUniform)
  const eps = 0.1
  const h0 = detailHeight(xz, uTime)
  const hx = detailHeight(xz.add(vec2(eps, 0.0)), uTime)
  const hz = detailHeight(xz.add(vec2(0.0, eps)), uTime)
  const detailGain = float(1.5).mul(uSeaUniform.mul(0.6).add(0.4))
  const N = normalize(N0.add(vec3(h0.sub(hx), 0.0, h0.sub(hz)).mul(detailGain)))
  const V = normalize(cameraPosition.sub(P))
  const crest = waveCrest(xz, uTime, uSeaUniform)
  const baseColor = mix(uDeepColor, uShallowColor, clamp(crest.mul(0.35).add(0.45), 0.0, 1.0))
  const glow = pow(max(dot(V, uSunDir), 0.0), 3.0).mul(max(crest, 0.0)).mul(0.18)
  const waterColor = baseColor.add(uShallowColor.mul(uSunColor).mul(glow)).toVar()
  const R = reflect(V.negate(), N)
  const RDir = normalize(vec3(R.x, max(R.y, 0.04), R.z))
  const reflection = skyColor(RDir)
  const fresnel = float(0.02).add(float(0.98).mul(pow(max(dot(N, V), 0.0).oneMinus(), 5.0)))
  const col = mix(waterColor, reflection, fresnel).toVar()
  const H = normalize(uSunDir.add(V))
  const ndh = max(dot(N, H), 0.0)
  const sparkleNoise = fbm(xz.mul(1.7).add(vec2(uTime.mul(0.9), uTime.mul(-0.7)))).mul(0.5).add(0.5)
  const sparkle = pow(ndh, 500.0).mul(mix(0.4, 3.4, sparkleNoise))
  const sheen = pow(ndh, 48.0).mul(0.12)
  col.addAssign(uSunColor.mul(sparkle.add(sheen)))
  const foamNoise = fbm(xz.mul(1.1).add(vec2(uTime.mul(0.22), uTime.mul(0.14)))).mul(0.5).add(0.5)
  const foamMask = smoothstep(0.5, 0.95, foamNoise).mul(smoothstep(1.0, 2.0, crest))
  col.assign(mix(col, vec3(0.82, 0.88, 0.90), clamp(foamMask.mul(0.85), 0.0, 1.0)))
  const camDist = distance(cameraPosition, P)
  col.assign(mix(col, uHorizonColor, smoothstep(150.0, 290.0, camDist)))
  return vec4(col, 1.0)
})

/* ---------------------------------------------------------------------------
   Scene variables
   --------------------------------------------------------------------------- */
let renderer, scene, camera, controls, postProcessing
let lastNow = 0
let revealed = false
let fpsAccum = 0
let fpsCount = 0

/* ---------------------------------------------------------------------------
   Time of day
   --------------------------------------------------------------------------- */
const DAY = {
  zenith: new THREE.Color(0.07, 0.20, 0.42),
  horizon: new THREE.Color(0.52, 0.68, 0.82),
  sun: new THREE.Color(1.0, 0.93, 0.80),
  intensity: 1.6,
  deep: new THREE.Color(0.015, 0.09, 0.11),
  shallow: new THREE.Color(0.06, 0.32, 0.36)
}
const DUSK = {
  zenith: new THREE.Color(0.03, 0.05, 0.16),
  horizon: new THREE.Color(0.85, 0.36, 0.16),
  sun: new THREE.Color(1.0, 0.42, 0.14),
  intensity: 2.6,
  deep: new THREE.Color(0.02, 0.045, 0.075),
  shallow: new THREE.Color(0.09, 0.15, 0.20)
}

function getTimeLabel(val) {
  if (val < 0.12) return t('time.dusk')
  if (val < 0.30) return t('time.golden')
  if (val < 0.62) return t('time.afternoon')
  return t('time.midday')
}

function applyTimeOfDay(t) {
  const elevation = THREE.MathUtils.lerp(-0.05, 0.62, t)
  const azimuth = THREE.MathUtils.lerp(-0.9, 0.9, t)
  uSunDir.value.set(
    Math.cos(elevation) * Math.sin(azimuth),
    Math.sin(elevation),
    -Math.cos(elevation) * Math.cos(azimuth)
  )
  const x = THREE.MathUtils.clamp(elevation / 0.42, 0, 1)
  const w = x * x * (3 - 2 * x)
  uZenithColor.value.copy(DUSK.zenith).lerp(DAY.zenith, w)
  uHorizonColor.value.copy(DUSK.horizon).lerp(DAY.horizon, w)
  uDeepColor.value.copy(DUSK.deep).lerp(DAY.deep, w)
  uShallowColor.value.copy(DUSK.shallow).lerp(DAY.shallow, w)
  const intensity = THREE.MathUtils.lerp(DUSK.intensity, DAY.intensity, w)
  uSunColor.value.copy(DUSK.sun).lerp(DAY.sun, w).multiplyScalar(intensity)
  timeLabel.value = getTimeLabel(t)
}

/* ---------------------------------------------------------------------------
   Controls handlers
   --------------------------------------------------------------------------- */
function onSeaStateChange(e) {
  const val = Number(e.target.value)
  uSeaUniform.value = 0.25 + (val / 100) * 1.5
  seaValue.value = uSeaUniform.value.toFixed(2)
}

function onTimeOfDayChange(e) {
  applyTimeOfDay(Number(e.target.value) / 100)
}

function toggleDrift() {
  if (controls) {
    controls.autoRotate = !controls.autoRotate
  }
}

function toggleUltraHd() {
  PERF.toggleUltraHd()
}

function toggleLang() {
  currentLang.value = currentLang.value === 'en' ? 'zh' : 'en'
  updateQualityBadge()
  applyTimeOfDay(Number(document.getElementById('time-range')?.value || 55) / 100)
}

/* ---------------------------------------------------------------------------
   Animation
   --------------------------------------------------------------------------- */
function revealUI() {
  revealed = true
}

async function frame() {
  const now = performance.now()
  const rawDt = (now - lastNow) / 1000
  lastNow = now
  const dt = Math.min(rawDt, 0.1)
  uTime.value += dt
  PERF.tick(dt)
  controls.update()
  await postProcessing.renderAsync()
  fpsAccum += dt
  fpsCount += 1
  if (fpsAccum >= 0.5) {
    if (!PERF.benchPhase) {
      fpsDisplay.value = String(Math.round(fpsCount / fpsAccum))
    }
    fpsAccum = 0
    fpsCount = 0
  }
  if (!revealed) revealUI()
  updateQualityBadge()
}

/* ---------------------------------------------------------------------------
   Init
   --------------------------------------------------------------------------- */
async function init() {
  if (!('gpu' in navigator) || !navigator.gpu) {
    console.error('[OpenSea] WebGPU unavailable')
    return
  }
  try {
    PERF.tier = await PERF.pickInitialTier()
    PERF.prevTier = PERF.tier
    PERF.benchTier = PERF.tier
    uFbmOctaves.value = PERF.cfg.fbm

    renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    containerRef.value.appendChild(renderer.domElement)

    scene = new THREE.Scene()
    scene.background = new THREE.Color('#05070a')

    camera = new THREE.PerspectiveCamera(55, containerRef.value.clientWidth / containerRef.value.clientHeight, 0.5, 8000)
    camera.position.set(0, 5.5, 17)

    PERF.rebuildOceanMesh(PERF.cfg)
    PERF.rebuildSkyDome(PERF.cfg)

    postProcessing = new THREE.PostProcessing(renderer)
    PERF.rebuildPostProcessing(PERF.cfg)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.minDistance = 4
    controls.maxDistance = 120
    controls.minPolarAngle = 0.15
    controls.maxPolarAngle = Math.PI * 0.495
    controls.target.set(0, 1.5, 0)
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.25
    controls.update()

    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibilityChange)

    applyTimeOfDay(0.55)

    await renderer.init()
    lastNow = performance.now()
    renderer.setAnimationLoop(frame)
  } catch (err) {
    console.error('[OpenSea] initialization failed:', err)
  }
}

function onResize() {
  if (!camera || !renderer) return
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  PERF.applyPixelRatio(PERF.cfg)
  renderer.setSize(w, h)
}

function onVisibilityChange() {
  if (document.hidden) {
    renderer.setAnimationLoop(null)
  } else {
    lastNow = performance.now()
    renderer.setAnimationLoop(frame)
  }
}

/* ---------------------------------------------------------------------------
   Lifecycle
   --------------------------------------------------------------------------- */
onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  if (renderer) {
    renderer.setAnimationLoop(null)
  }
  window.removeEventListener('resize', onResize)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  controls?.dispose()
  controls?.domElement?.remove()
  if (window.__ocean) {
    window.__ocean.geometry.dispose()
    scene?.remove(window.__ocean)
  }
  if (window.__sky) {
    window.__sky.geometry.dispose()
    scene?.remove(window.__sky)
  }
  if (renderer?.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement)
  }
  renderer?.dispose()
})
</script>

<template>
  <div ref="containerRef" class="open-sea-container">
    <!-- Vignette overlay -->
    <div class="vignette" aria-hidden="true"></div>

    <!-- InfoPanel with ocean controls -->
    <InfoPanel>
      <template #header>
        <div class="eyebrow">{{ t('panel.eyebrow') }}</div>
        <h1 class="title">OPEN SEA</h1>
        <p class="subtitle">{{ t('panel.subtitle') }}</p>
      </template>

      <!-- Sea State -->
      <div class="control">
        <div class="control-head">
          <label for="sea-range" data-i18n="panel.seaState">{{ t('panel.seaState') }}</label>
          <span class="control-value">{{ seaValue }}</span>
        </div>
        <input id="sea-range" type="range" min="0" max="100" value="45" step="1"
          @input="onSeaStateChange" :aria-label="t('panel.seaState')" />
      </div>

      <!-- Time of Day -->
      <div class="control">
        <div class="control-head">
          <label for="time-range" data-i18n="panel.timeOfDay">{{ t('panel.timeOfDay') }}</label>
          <span class="control-value">{{ timeLabel }}</span>
        </div>
        <input id="time-range" type="range" min="0" max="100" value="55" step="1"
          @input="onTimeOfDayChange" :aria-label="t('panel.timeOfDay')" />
      </div>

      <!-- Quality bar -->
      <div class="quality-bar">
        <span class="badge" :class="{ uhd: PERF.ultraHd }">{{ qualityBadge }}</span>
        <span class="badge-label">{{ qualityLabel }}</span>
        <button class="pill pill-uhd" type="button" :class="{ active: PERF.ultraHd }"
          :aria-pressed="PERF.ultraHd" @click="toggleUltraHd">{{ t('panel.uhd') }}</button>
      </div>

      <!-- Panel footer -->
      <div class="panel-footer">
        <button class="pill active" type="button" :aria-pressed="true"
          @click="toggleDrift">{{ t('panel.drift') }}</button>
        <button class="pill lang-pill" type="button" :aria-label="'Switch language'"
          @click="toggleLang">{{ currentLang === 'en' ? '中' : 'EN' }}</button>
        <div class="fps"><span>{{ fpsDisplay }}</span> FPS</div>
      </div>

      <!-- Hint -->
      <div class="hint-content" aria-hidden="true">{{ t('panel.hint') }}</div>
    </InfoPanel>

    <!-- ControlPanel with transparency slider -->
    <ControlPanel :fps="Number(fpsDisplay)" :showAnimation="false" />
  </div>
</template>

<style scoped>
.open-sea-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #05070a;
}

.open-sea-container :deep(canvas) {
  position: absolute;
  inset: 0;
  display: block;
  touch-action: none;
}

.vignette {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    radial-gradient(ellipse 130% 95% at 50% 38%, transparent 52%, rgba(2, 4, 7, 0.55) 100%),
    linear-gradient(to bottom, transparent 68%, rgba(2, 4, 7, 0.38) 100%);
}

/* Ocean panel styles — used inside InfoPanel slots */
.eyebrow {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.title {
  margin-top: 7px;
  font-size: 21px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: #fff;
}

.subtitle {
  margin-top: 7px;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.38);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control {
  margin-top: 22px;
}

.control-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.control-head label {
  cursor: pointer;
}

.control-value {
  color: #8fe9e4;
  letter-spacing: 0.14em;
}

.control :deep(input[type="range"]) {
  -webkit-appearance: none;
  appearance: none;
  display: block;
  width: 100%;
  height: 22px;
  margin-top: 8px;
  background: transparent;
  cursor: pointer;
}

.control :deep(input[type="range"]:focus) {
  outline: none;
}

.control :deep(input[type="range"]::-webkit-slider-runnable-track) {
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
}

.control :deep(input[type="range"]::-webkit-slider-thumb) {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  margin-top: -4.5px;
  border: none;
  border-radius: 50%;
  background: #8fe9e4;
  box-shadow: 0 0 8px rgba(143, 233, 228, 0.85), 0 0 18px rgba(143, 233, 228, 0.35);
  transition: transform 0.15s ease;
}

.control :deep(input[type="range"]::-webkit-slider-thumb:hover) {
  transform: scale(1.25);
}

.control :deep(input[type="range"]::-moz-range-track) {
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
}

.control :deep(input[type="range"]::-moz-range-thumb) {
  width: 12px;
  height: 12px;
  border: none;
  border-radius: 50%;
  background: #8fe9e4;
  box-shadow: 0 0 8px rgba(143, 233, 228, 0.85), 0 0 18px rgba(143, 233, 228, 0.35);
  transition: transform 0.15s ease;
}

.control :deep(input[type="range"]::-moz-range-thumb:hover) {
  transform: scale(1.25);
}

.quality-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.badge {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 8px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 4px;
  background: rgba(143, 233, 228, 0.12);
  border: 1px solid rgba(143, 233, 228, 0.3);
  color: #8fe9e4;
}

.badge.uhd {
  background: rgba(255, 200, 100, 0.12);
  border-color: rgba(255, 200, 100, 0.4);
  color: #ffd866;
}

.badge-label {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.15em;
  color: rgba(255, 255, 255, 0.4);
}

.pill-uhd {
  margin-left: auto;
  padding: 4px 12px 4px 14px;
  font-size: 9px;
  letter-spacing: 0.2em;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
  color: rgba(255, 255, 255, 0.42);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.1s ease;
  font-family: 'Geist Mono', ui-monospace, monospace;
  text-transform: uppercase;
}

.pill-uhd:hover {
  color: rgba(255, 255, 255, 0.7);
}

.pill-uhd:active {
  transform: scale(0.95);
}

.pill-uhd.active {
  background: rgba(143, 233, 228, 0.14);
  border-color: rgba(143, 233, 228, 0.55);
  color: #d9f7f4;
}

.pill-uhd.active:hover {
  color: #effffd;
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.pill {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  padding: 8px 15px 8px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
  color: rgba(255, 255, 255, 0.42);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.1s ease;
}

.pill:hover {
  color: rgba(255, 255, 255, 0.7);
}

.pill:active {
  transform: scale(0.95);
}

.pill.active {
  background: rgba(143, 233, 228, 0.14);
  border-color: rgba(143, 233, 228, 0.55);
  color: #d9f7f4;
}

.pill.active:hover {
  color: #effffd;
}

.pill.lang-pill {
  min-width: 34px;
  padding: 8px 6px;
  text-align: center;
  letter-spacing: 0.06em;
  font-size: 11px;
}

.pill.lang-pill:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.7);
}

.fps {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.2em;
  color: rgba(255, 255, 255, 0.4);
}

.fps span {
  color: rgba(255, 255, 255, 0.88);
}

.hint-content {
  margin-top: 20px;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.42em;
  text-indent: 0.42em;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.32);
  text-align: center;
}

@media (max-width: 768px) {
  .subtitle {
    font-size: 8.5px;
    letter-spacing: 0.04em;
    white-space: normal;
  }

  .quality-bar {
    margin-top: 14px;
    padding-top: 11px;
  }

  .badge-label {
    font-size: 9px;
  }

  .hint-content {
    display: none;
  }
}
</style>
