<script setup>
import { ref, defineAsyncComponent, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import {
  Fn, pass, uniform, float, vec2, vec3, vec4,
  sin, cos, dot, cross, normalize, mix, pow, max, clamp,
  fract, floor, smoothstep, distance, reflect, If,
  positionLocal, positionWorld, cameraPosition
} from 'three/tsl'
import InfoPanel from '../../components/InfoPanel.vue'
import { t as i18nT } from '../../utils/oceanI18n.js'
import { createPerfEngine } from '../../utils/oceanPerf.js'
import { createFishSystem } from './fish/index.js'
const ControlPanel = defineAsyncComponent(() => import('../../components/ControlPanel.vue'))

/* ---------------------------------------------------------------------------
   Reactive state
   --------------------------------------------------------------------------- */
const containerRef = ref(null)
const fpsDisplay = ref('--')
const qualityLabel = ref('中')
const qualityBadge = ref('自适应')
const timeLabel = ref('午后')
const timeSliderValue = ref(55)
const realTimeMode = ref(true)
const seaValue = ref('0.93')
const currentLang = ref('zh')
const driftEnabled = ref(true)

// Fish system state
const fishSystem = ref(null)
const fishReady = ref(false)
const fishCamActive = ref(false)
const fishLoadError = ref('')
const fishLoadProgress = ref(0)
const fishModelKeys = ref([])
const simPaused = ref(false)
const simSpeed = ref(1)
const aquariumSize = ref(20)
const showBoundary = ref(false)

// Fish slider display values (reactive mirrors for template binding)
const fishDisplay = ref({
  sardineCount: 0, koiCount: 0, perception: 2.7,
  sardineSpeed: 1.0, separation: 1.35, avoidance: 10,
  turnRate: 4, topMargin: 0.42,
  koiPerception: 2.7, koiSpeed: 1.0, koiSeparation: 1.35,
  koiAvoidance: 10, koiTurnRate: 4, koiTopMargin: 0.42,
})

function t(key) {
  return i18nT(currentLang.value, key)
}

/* ---------------------------------------------------------------------------
   Quality Manager — adaptive performance scaling (extracted)
   Initialized after TSL shader functions are defined (see below).
   --------------------------------------------------------------------------- */
let PERF

function initPerfEngine() {
  PERF = createPerfEngine({
    THREE,
    sceneRef: () => scene,
    rendererRef: () => renderer,
    cameraRef: () => camera,
    postProcessingRef: () => postProcessing,
    wavePosition,
    oceanColor,
    skyDomeColor,
    positionLocal,
    pass,
    bloom,
    uTime,
    uSeaUniform,
    uFbmOctaves,
    fpsDisplay,
    qualityBadge,
    qualityLabel,
    t,
  })
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
const uNightFactor = uniform(0.0)

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
  // Sun glow — soft halo
  col.addAssign(uSunColor.mul(pow(s, 10.0).mul(0.18)))
  // Sun disc — bright circle
  col.addAssign(uSunColor.mul(smoothstep(0.9990, 0.9997, s).mul(40.0)))
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

  // Moon: full circular disc (圆形)
  // Moon sits opposite the sun with a slight inclination offset
  const moonDir = uSunDir.negate().add(vec3(0.0, 0.15, 0.0)).normalize()
  const moonDot = max(dot(dir, moonDir), 0.0)

  // Soft glow around the moon
  const moonGlow = pow(moonDot, 6.0).mul(0.06)

  // Full moon disc
  const moonDisc = smoothstep(0.9992, 0.9997, moonDot).mul(4.0)

  col.addAssign(uNightFactor.mul(vec3(0.30, 0.35, 0.55).mul(moonGlow.add(moonDisc))))

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

  // Moonlight reflection on water — moon opposite sun
  const moonDir2 = uSunDir.negate().add(vec3(0.0, 0.15, 0.0)).normalize()
  const Hmoon = normalize(moonDir2.add(V))
  const ndhm = max(dot(N, Hmoon), 0.0)
  const moonSpec = pow(ndhm, 80.0).mul(0.06)
  col.addAssign(uNightFactor.mul(vec3(0.30, 0.35, 0.55).mul(moonSpec)))

  const foamNoise = fbm(xz.mul(1.1).add(vec2(uTime.mul(0.22), uTime.mul(0.14)))).mul(0.5).add(0.5)
  const foamMask = smoothstep(0.5, 0.95, foamNoise).mul(smoothstep(1.0, 2.0, crest))
  col.assign(mix(col, vec3(0.82, 0.88, 0.90), clamp(foamMask.mul(0.85), 0.0, 1.0)))
  const camDist = distance(cameraPosition, P)
  col.assign(mix(col, uHorizonColor, smoothstep(150.0, 290.0, camDist)))
  return vec4(col, 1.0)
})

// Initialize PERF engine after all TSL functions are defined
initPerfEngine()

/* ---------------------------------------------------------------------------
   Scene variables
   --------------------------------------------------------------------------- */
let renderer, scene, camera, controls, postProcessing
let lastNow = 0
let lastRealTimeSync = 0
let revealed = false
let fpsAccum = 0
let fpsCount = 0
let onSpaceKey = null
/** Snapshot of the camera state when the page first loads */
const initialCamState = { pos: new THREE.Vector3(), target: new THREE.Vector3() }

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
const NIGHT = {
  zenith: new THREE.Color(0.005, 0.008, 0.03),
  horizon: new THREE.Color(0.08, 0.12, 0.25),
  sun: new THREE.Color(0.30, 0.35, 0.55),
  intensity: 0.3,
  deep: new THREE.Color(0.002, 0.005, 0.015),
  shallow: new THREE.Color(0.01, 0.03, 0.06)
}

function getTimeLabel(val) {
  if (val < 0.15) return t('time.midnight')
  if (val < 0.30) return t('time.dawn')
  if (val < 0.70) return t('time.midday')
  if (val < 0.85) return t('time.dusk')
  return t('time.midnight')
}

function applyTimeOfDay(t) {
  // Time-of-day cycle: 0=午夜(midnight) → 0.15=晨曦(dawn) → 0.30=正午(noon) → 0.70=黄昏(dusk) → 0.85=午夜 → 1.0
  // Sun arcs east→south→west (azimuth = t * 2π), peaking at 1.0 rad (57°) at noon
  let paletteT, paletteA, paletteB

  // Palette transitions aligned with labels:
  // 0──0.15 午夜(NIGHT) ──0.30 晨曦(NIGHT→DUSK→DAY) ──0.70 正午(DAY) ──0.85 黄昏(DUSK→NIGHT) ──1.0 午夜
  if (t < 0.15) {
    // Night (deep)
    paletteT = 0
    paletteA = NIGHT; paletteB = NIGHT
  } else if (t < 0.22) {
    // Dawn twilight: Night → Dusk
    paletteT = (t - 0.15) / 0.07
    paletteA = NIGHT; paletteB = DUSK
  } else if (t < 0.30) {
    // Sunrise: Dusk → Day
    paletteT = (t - 0.22) / 0.08
    paletteA = DUSK; paletteB = DAY
  } else if (t < 0.70) {
    // Day (midday plateau)
    paletteT = 0
    paletteA = DAY; paletteB = DAY
  } else if (t < 0.78) {
    // Sunset: Day → Dusk
    paletteT = (t - 0.70) / 0.08
    paletteA = DAY; paletteB = DUSK
  } else if (t < 0.85) {
    // Evening twilight: Dusk → Night
    paletteT = (t - 0.78) / 0.07
    paletteA = DUSK; paletteB = NIGHT
  } else {
    // Night (deep)
    paletteT = 0
    paletteA = NIGHT; paletteB = NIGHT
  }

  const w = paletteT

  // Sun elevation: smooth arc peaking at 1.0 rad (57°) at noon
  const noonPeak = 1.0  // radians — clearly visible above horizon
  const nightLow = -0.35
  let elevation
  if (t < 0.15) {
    elevation = nightLow
  } else if (t < 0.30) {
    // Dawn rise: below horizon → above
    const p = (t - 0.15) / 0.15
    const sp = p * p * (3 - 2 * p)  // smoothstep
    elevation = THREE.MathUtils.lerp(nightLow, noonPeak * 0.4, sp)
  } else if (t < 0.50) {
    // Climb to zenith
    const p = (t - 0.30) / 0.20
    const sp = p * p * (3 - 2 * p)
    elevation = THREE.MathUtils.lerp(noonPeak * 0.4, noonPeak, sp)
  } else if (t < 0.70) {
    // Descend from zenith
    const p = (t - 0.50) / 0.20
    const sp = p * p * (3 - 2 * p)
    elevation = THREE.MathUtils.lerp(noonPeak, noonPeak * 0.4, sp)
  } else if (t < 0.85) {
    // Sunset: above horizon → below
    const p = (t - 0.70) / 0.15
    const sp = p * p * (3 - 2 * p)
    elevation = THREE.MathUtils.lerp(noonPeak * 0.4, nightLow, sp)
  } else {
    elevation = nightLow
  }

  // Azimuth: continuous full-circle sweep — east(π/2) → south(π) → west(3π/2)
  // At t=0.25 (dawn):  az = π/2 → sun in east (+x)
  // At t=0.50 (noon):  az = π   → sun in south (+z)
  // At t=0.75 (dusk):  az = 3π/2 → sun in west (-x)
  const azimuth = t * 2 * Math.PI

  uSunDir.value.set(
    Math.cos(elevation) * Math.sin(azimuth),
    Math.sin(elevation),
    -Math.cos(elevation) * Math.cos(azimuth)
  )

  // Night factor: 1=full night (moon visible), 0=full day
  let nightFactor
  if (t < 0.15) {
    nightFactor = 1.0
  } else if (t < 0.30) {
    // Night → Day
    nightFactor = 1.0 - (t - 0.15) / 0.15
  } else if (t < 0.70) {
    nightFactor = 0
  } else if (t < 0.85) {
    // Day → Night
    nightFactor = (t - 0.70) / 0.15
  } else {
    nightFactor = 1.0
  }
  uNightFactor.value = nightFactor

  // Smoothstep the palette interpolation for natural transitions
  const sw = w * w * (3 - 2 * w)

  uZenithColor.value.copy(paletteA.zenith).lerp(paletteB.zenith, sw)
  uHorizonColor.value.copy(paletteA.horizon).lerp(paletteB.horizon, sw)
  uDeepColor.value.copy(paletteA.deep).lerp(paletteB.deep, sw)
  uShallowColor.value.copy(paletteA.shallow).lerp(paletteB.shallow, sw)
  const intensity = THREE.MathUtils.lerp(paletteA.intensity, paletteB.intensity, sw)
  uSunColor.value.copy(paletteA.sun).lerp(paletteB.sun, sw).multiplyScalar(intensity)

  timeLabel.value = getTimeLabel(t)
}

/** Sync time-of-day slider with the current system clock */
function syncTimeWithSystem() {
  const now = new Date()
  const sec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const t = sec / 86400  // 0.0 (midnight) → 1.0 (next midnight)
  timeSliderValue.value = Math.round(t * 100)
  applyTimeOfDay(t)
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
  const val = Number(e.target.value)
  timeSliderValue.value = val
  realTimeMode.value = false
  applyTimeOfDay(val / 100)
}

function toggleDrift() {
  driftEnabled.value = !driftEnabled.value
  if (controls) {
    controls.autoRotate = driftEnabled.value
  }
}

function toggleUltraHd() {
  PERF.toggleUltraHd()
}

function toggleLang() {
  currentLang.value = currentLang.value === 'en' ? 'zh' : 'en'
  PERF.updateQualityBadge()
  applyTimeOfDay(timeSliderValue.value / 100)
}

/* ---------------------------------------------------------------------------
   Camera reset
   --------------------------------------------------------------------------- */
function onResetCamera() {
  camera.position.copy(initialCamState.pos)
  controls.target.copy(initialCamState.target)
  controls.update()
  if (fishSystem.value?.cameraRig.active) {
    fishSystem.value.cameraRig.exit()
  }
}

function onToggleFishCam() {
  if (!fishSystem.value?.ready) return
  if (fishSystem.value.cameraRig.active) {
    fishSystem.value.cameraRig.exit()
    onResetCamera()
  } else {
    const fish = fishSystem.value.getRandomFish()
    fishSystem.value.cameraRig.enter(fish)
  }
}

function onTogglePlay(playing) {
  simPaused.value = !playing
}

function onUpdateSpeed(val) {
  simSpeed.value = val
}

function onAquariumSizeChange(e) {
  const val = Number(e.target.value)
  aquariumSize.value = val
  if (fishSystem.value) fishSystem.value.resizeAquarium(val)
}

function toggleBoundary() {
  showBoundary.value = !showBoundary.value
  if (fishSystem.value) fishSystem.value.toggleBoundary(showBoundary.value)
}

/* ---------------------------------------------------------------------------
   Fish controls handlers
   --------------------------------------------------------------------------- */
function onFishControl(key, e) {
  const val = Number(e.target.value)
  if (!fishSystem.value) return
  fishDisplay.value[key] = val
  const ctrl = fishSystem.value.controls
  switch (key) {
    case 'sardineCount': fishSystem.value.onSardineCountChange(val); break
    case 'koiCount': fishSystem.value.onKoiCountChange(val); break
    default:
      if (key in ctrl) {
        ctrl[key].value = val
        fishSystem.value.onControlChange()
      }
  }
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

  // Sync with system clock when real-time mode is active (~1s interval)
  if (realTimeMode.value && rawDt < 0.15) {
    if (now - lastRealTimeSync > 1000) {
      lastRealTimeSync = now
      syncTimeWithSystem()
    }
  }

  // Advance ocean and fish simulation (paused when simPaused)
  if (!simPaused.value) {
    uTime.value += dt * simSpeed.value

    // Update fish simulation and switch camera if needed
    if (fishSystem.value?.ready) {
      fishSystem.value.update(dt)
      // Sync fish directional light with procedural sun
      fishSystem.value.updateLights(uSunDir.value, uSunColor.value)
      fishCamActive.value = fishSystem.value.cameraRig.active
      if (fishCamActive.value) {
        controls.enabled = false
        // Copy fish camera state to the main camera for post-processing
        const fishCam = fishSystem.value.cameraRig.activeCamera
        camera.position.copy(fishCam.position)
        camera.quaternion.copy(fishCam.quaternion)
        camera.up.copy(fishCam.up)
        camera.aspect = containerRef.value.clientWidth / containerRef.value.clientHeight
        camera.updateProjectionMatrix()
      } else {
        controls.enabled = true
      }
    }
  }

  // Track fish model download progress and ready state
  if (fishSystem.value) {
    fishReady.value = fishSystem.value.ready
    if (!fishSystem.value.ready) {
      fishLoadProgress.value = fishSystem.value.loadProgress
    } else if (fishLoadProgress.value < 1) {
      fishLoadProgress.value = 1
    }
  }

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
  PERF.updateQualityBadge()
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
    PERF.initPixelRatio()
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

    // Save initial camera state for reset
    initialCamState.pos.copy(camera.position)
    initialCamState.target.copy(controls.target)

    // Initialize fish system
    fishSystem.value = createFishSystem({ scene, controls, aquariumSize: 20, showBoundary: false })
    fishCamActive.value = false
    fishModelKeys.value = fishSystem.value.modelKeys
    // Show error toast if fish model failed to load
    setTimeout(() => {
      if (fishSystem.value?.loadError) {
        fishLoadError.value = fishSystem.value.loadError
        setTimeout(() => { fishLoadError.value = '' }, 6000)
      }
    }, 3000)

    // Space key → toggle fish cam
    onSpaceKey = (e) => {
      if (e.code !== 'Space' || e.repeat) return
      e.preventDefault()
      onToggleFishCam()
    }
    window.addEventListener('keydown', onSpaceKey)

    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibilityChange)

    applyTimeOfDay(0.55)
    syncTimeWithSystem()

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
  if (fishSystem.value) fishSystem.value.resize(w, h)
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
  fishSystem.value?.dispose()
  if (onSpaceKey) window.removeEventListener('keydown', onSpaceKey)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  controls?.dispose()
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

    <!-- Fish load error toast -->
    <div v-if="fishLoadError" class="error-toast">{{ fishLoadError }}</div>

    <!-- InfoPanel with ocean controls -->
    <InfoPanel>
      <template #header>
        <div class="eyebrow">{{ t('panel.eyebrow') }}</div>
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <h1 class="title" style="margin:0;">OPEN SEA</h1>
          <button class="pill lang-pill" type="button" :aria-label="'Switch language'"
            @click="toggleLang">{{ currentLang === 'en' ? '中' : 'EN' }}</button>
        </div>
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
          <span style="display:flex;align-items:center;gap:6px;">
            <span class="control-value">{{ timeLabel }}</span>
            <button class="pill lang-pill" style="font-size:9px;min-width:30px;padding:6px 4px;"
              :class="{ active: realTimeMode }"
              @click="realTimeMode = !realTimeMode">{{ realTimeMode ? 'ON' : 'OFF' }}</button>
          </span>
        </div>
        <input id="time-range" type="range" min="0" max="100" step="1"
          :value="timeSliderValue" @input="onTimeOfDayChange"
          :aria-label="t('panel.timeOfDay')" />
      </div>

      <!-- Aquarium Size & Show Boundary -->
      <div class="control">
        <div class="control-head">
          <label for="aquarium-size">{{ t('panel.aquariumSize') }}</label>
          <span style="display:flex;align-items:center;gap:6px;">
            <span class="control-value">{{ aquariumSize }} × {{ aquariumSize }}</span>
            <button class="pill lang-pill" style="font-size:9px;min-width:30px;padding:6px 4px;"
              :class="{ active: showBoundary }" @click="toggleBoundary">{{ showBoundary ? 'ON' : 'OFF' }}</button>
          </span>
        </div>
        <input id="aquarium-size" type="range" min="20" max="100" :value="aquariumSize" step="1"
          @input="onAquariumSizeChange" />
      </div>

      <!-- Fish School Controls -->
      <div class="control">
        <div class="control-head" style="margin-top:12px;">
          <span style="color:#8fe9e4;letter-spacing:0.1em;">{{ t('fish.title') }}</span>
          <span v-if="fishModelKeys.length" class="control-value" style="font-size:8px;opacity:0.5;">{{ fishModelKeys.join(' · ') }}</span>
        </div>
      </div>

      <!-- Fish model download progress -->
      <div v-if="fishLoadProgress < 1" class="fish-progress-wrap">
        <div class="fish-progress-head">
          <span class="fish-progress-pct">{{ Math.round(fishLoadProgress * 100) }}%</span>
        </div>
        <div class="fish-progress-track">
          <div class="fish-progress-bar" :style="{ width: Math.max(fishLoadProgress * 100, 2) + '%' }"></div>
        </div>
      </div>

      <div class="control">
        <div class="control-head">
          <label for="sardine-count" data-i18n="fish.sardineCount">{{ t('fish.sardineCount') }}</label>
          <span class="control-value">{{ fishDisplay.sardineCount }}</span>
        </div>
        <input id="sardine-count" type="range" :min="0" :max="1000" step="1" :value="fishDisplay.sardineCount"
          :disabled="!fishReady"
          @input="onFishControl('sardineCount', $event)" />
      </div>

      <div class="control">
        <div class="control-head">
          <label for="koi-count" data-i18n="fish.koiCount">{{ t('fish.koiCount') }}</label>
          <span class="control-value">{{ fishDisplay.koiCount }}</span>
        </div>
        <input id="koi-count" type="range" :min="0" :max="1000" step="1" :value="fishDisplay.koiCount"
          :disabled="!fishReady"
          @input="onFishControl('koiCount', $event)" />
      </div>

      <div class="control">
        <div class="control-head">
          <label for="fish-perception" data-i18n="fish.perception">{{ t('fish.perception') }}</label>
          <span class="control-value">{{ fishDisplay.perception }}</span>
        </div>
        <input id="fish-perception" type="range" :min="1.2" :max="5.2" step="0.1"
          :value="fishDisplay.perception" @input="onFishControl('perception', $event)" />
      </div>

      <div class="control">
        <div class="control-head">
          <label for="sardine-speed" data-i18n="fish.sardineSpeed">{{ t('fish.sardineSpeed') }}</label>
          <span class="control-value">{{ fishDisplay.sardineSpeed }}</span>
        </div>
        <input id="sardine-speed" type="range" :min="0.2" :max="2.0" step="0.05"
          :value="fishDisplay.sardineSpeed" @input="onFishControl('sardineSpeed', $event)" />
      </div>

      <div class="control">
        <div class="control-head">
          <label for="fish-separation" data-i18n="fish.separation">{{ t('fish.separation') }}</label>
          <span class="control-value">{{ fishDisplay.separation }}</span>
        </div>
        <input id="fish-separation" type="range" :min="0.4" :max="3.0" step="0.1"
          :value="fishDisplay.separation" @input="onFishControl('separation', $event)" />
      </div>

      <div class="control">
        <div class="control-head">
          <label for="fish-avoidance" data-i18n="fish.avoidance">{{ t('fish.avoidance') }}</label>
          <span class="control-value">{{ fishDisplay.avoidance }}</span>
        </div>
        <input id="fish-avoidance" type="range" :min="0" :max="20" step="0.5"
          :value="fishDisplay.avoidance" @input="onFishControl('avoidance', $event)" />
      </div>

      <div class="control">
        <div class="control-head">
          <label for="fish-turn-rate" data-i18n="fish.turnRate">{{ t('fish.turnRate') }}</label>
          <span class="control-value">{{ fishDisplay.turnRate }}</span>
        </div>
        <input id="fish-turn-rate" type="range" :min="0.5" :max="8" step="0.1"
          :value="fishDisplay.turnRate" @input="onFishControl('turnRate', $event)" />
      </div>

      <div class="control">
        <div class="control-head">
          <label for="fish-top-margin" data-i18n="fish.topMargin">{{ t('fish.topMargin') }}</label>
          <span class="control-value">{{ fishDisplay.topMargin }}</span>
        </div>
        <input id="fish-top-margin" type="range" :min="0" :max="2" step="0.05"
          :value="fishDisplay.topMargin" @input="onFishControl('topMargin', $event)" />
      </div>

      <!-- Koi Controls -->
      <div class="control">
        <div class="control-head" style="margin-top:6px;">
          <span style="color:#ff8c2a;letter-spacing:0.1em;">{{ t('fish.koiGroup') }}</span>
        </div>
      </div>

      <div class="control">
        <div class="control-head">
          <label for="koi-perception" data-i18n="fish.koiPerception">{{ t('fish.koiPerception') }}</label>
          <span class="control-value">{{ fishDisplay.koiPerception }}</span>
        </div>
        <input id="koi-perception" type="range" :min="1.2" :max="5.2" step="0.1"
          :value="fishDisplay.koiPerception" @input="onFishControl('koiPerception', $event)" />
      </div>

      <div class="control">
        <div class="control-head">
          <label for="koi-speed" data-i18n="fish.koiSpeed">{{ t('fish.koiSpeed') }}</label>
          <span class="control-value">{{ fishDisplay.koiSpeed }}</span>
        </div>
        <input id="koi-speed" type="range" :min="0.2" :max="2.0" step="0.05"
          :value="fishDisplay.koiSpeed" @input="onFishControl('koiSpeed', $event)" />
      </div>

      <div class="control">
        <div class="control-head">
          <label for="koi-separation" data-i18n="fish.koiSeparation">{{ t('fish.koiSeparation') }}</label>
          <span class="control-value">{{ fishDisplay.koiSeparation }}</span>
        </div>
        <input id="koi-separation" type="range" :min="0.4" :max="3.0" step="0.1"
          :value="fishDisplay.koiSeparation" @input="onFishControl('koiSeparation', $event)" />
      </div>

      <div class="control">
        <div class="control-head">
          <label for="koi-avoidance" data-i18n="fish.koiAvoidance">{{ t('fish.koiAvoidance') }}</label>
          <span class="control-value">{{ fishDisplay.koiAvoidance }}</span>
        </div>
        <input id="koi-avoidance" type="range" :min="0" :max="20" step="0.5"
          :value="fishDisplay.koiAvoidance" @input="onFishControl('koiAvoidance', $event)" />
      </div>

      <div class="control">
        <div class="control-head">
          <label for="koi-turn-rate" data-i18n="fish.koiTurnRate">{{ t('fish.koiTurnRate') }}</label>
          <span class="control-value">{{ fishDisplay.koiTurnRate }}</span>
        </div>
        <input id="koi-turn-rate" type="range" :min="0.5" :max="8" step="0.1"
          :value="fishDisplay.koiTurnRate" @input="onFishControl('koiTurnRate', $event)" />
      </div>

      <div class="control">
        <div class="control-head">
          <label for="koi-top-margin" data-i18n="fish.koiTopMargin">{{ t('fish.koiTopMargin') }}</label>
          <span class="control-value">{{ fishDisplay.koiTopMargin }}</span>
        </div>
        <input id="koi-top-margin" type="range" :min="0" :max="2" step="0.05"
          :value="fishDisplay.koiTopMargin" @input="onFishControl('koiTopMargin', $event)" />
      </div>

      <!-- Hint -->
      <div class="hint-content" aria-hidden="true">{{ t('panel.hint') }} · {{ t('fish.cameraToggle') }}</div>
    </InfoPanel>

    <!-- ControlPanel with transparency slider -->
    <ControlPanel :fps="Number(fpsDisplay)" :showAnimation="true"
      :qualityBadge="qualityBadge" :qualityLabel="qualityLabel"
      :fishCamActive="fishCamActive" :ultraHd="PERF?.ultraHd ?? false" :showCameraControls="true"
      @resetCamera="onResetCamera" @toggleFishCam="onToggleFishCam"
      @togglePlay="onTogglePlay" @updateSpeed="onUpdateSpeed" @toggleUltraHd="toggleUltraHd" />
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

.control :deep(input[type="range"]:disabled) {
  opacity: 0.35;
  cursor: not-allowed;
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

.error-toast {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  padding: 10px 22px;
  border-radius: 8px;
  background: rgba(233, 115, 106, 0.88);
  backdrop-filter: blur(8px);
  color: #fff;
  white-space: nowrap;
  animation: toastIn 0.35s ease;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(12px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.fish-progress-wrap {
  margin-bottom: 16px;
  position: relative;
}

.fish-progress-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 8px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}

.fish-progress-pct {
  color: #8fe9e4;
}

.fish-progress-track {
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.fish-progress-bar {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #8fe9e4, #5bc0be);
  transition: width 0.25s ease;
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
