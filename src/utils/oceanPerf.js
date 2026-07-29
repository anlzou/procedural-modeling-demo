/**
 * Open Sea Adaptive Quality Manager
 *
 * Usage:
 *   import { createPerfEngine } from '../utils/oceanPerf.js'
 *   const PERF = createPerfEngine({ THREE, scene, renderer, postProcessing, ... })
 *   // Then call PERF.tick(dt) each frame
 */

export function createPerfEngine(ctx) {
  const {
    THREE,              // three/webgpu namespace
    sceneRef,           // () => scene     — getter for mutable scene
    rendererRef,        // () => renderer  — getter for mutable renderer
    cameraRef,          // () => camera    — getter for mutable camera
    postProcessingRef,  // () => postProcessing
    wavePosition,       // TSL Fn node
    oceanColor,         // TSL Fn node
    skyDomeColor,       // TSL Fn node
    positionLocal,      // TSL positionLocal
    pass,               // TSL pass()
    bloom,              // TSL bloom()
    uTime,              // TSL uniform
    uSeaUniform,        // TSL uniform
    uFbmOctaves,        // TSL uniform
    fpsDisplay,         // Vue ref
    qualityBadge,       // Vue ref
    qualityLabel,       // Vue ref
    t,                  // i18n t(lang, key) function
  } = ctx

  // ---- tunable thresholds ----
  const TARGET_FPS = 55
  const UPSCALE_FPS = 58
  const DOWNSCALE_FPS = 35
  const BENCHMARK_FRAMES = 20
  const RECORD_WINDOW = 0.8
  const EMA_ALPHA = 0.06
  const DEBT_THRESHOLD = 3
  const CREDIT_THRESHOLD = 5
  const TIER_COOLDOWN_FRAMES = 90
  const PR_SMOOTH_RATE = 0.12

  // ---- quality tiers ----
  const tiers = [
    { pr: 2.0, ms: 440, sw: 48, sh: 24, bi: 1.0, fbm: 3, glitter: true, foam: true },
    { pr: 1.5, ms: 340, sw: 36, sh: 18, bi: 0.7, fbm: 3, glitter: true, foam: true },
    { pr: 1.2, ms: 260, sw: 28, sh: 14, bi: 0.4, fbm: 2, glitter: true, foam: false },
    { pr: 1.0, ms: 200, sw: 24, sh: 12, bi: 0.0, fbm: 2, glitter: false, foam: false },
    { pr: 0.75, ms: 140, sw: 16, sh: 8, bi: 0.0, fbm: 1, glitter: false, foam: false },
  ]

  // ---- live state ----
  let tier = 2
  let prevTier = 2
  let ultraHd = false
  let savedTier = 2
  let adapt = true

  // ---- smooth state ----
  let smoothFps = 60
  let downscaleDebt = 0
  let upscaleCredit = 0
  let changeCooldown = 0
  let currentPr = 0
  let targetPr = 0

  // ---- benchmark state ----
  let benchPhase = true
  let benchFrames = 0
  let benchAccum = 0

  // ---- fps display helpers ----
  let fpsTimer = 0
  let fpsFrames = 0

  const cfg = () => tiers[tier] || tiers[2]

  /* ---- quality badge ---- */
  function updateQualityBadge() {
    if (ultraHd) {
      qualityBadge.value = t('quality.ultraHd')
      qualityLabel.value = t('quality.max')
    } else if (benchPhase) {
      qualityBadge.value = t('quality.bench')
      qualityLabel.value = '…'
    } else {
      qualityBadge.value = t('quality.adaptive')
      qualityLabel.value = t('tier.' + tier) || '—'
    }
  }

  /* ================================================================
     Scene rebuild helpers (depend on external TSL nodes & scene refs)
     ================================================================ */

  function rebuildOceanMesh(segs) {
    const scene = sceneRef()
    const renderer = rendererRef()
    if (!scene) return
    if (window.__ocean) {
      window.__ocean.geometry.dispose()
      scene.remove(window.__ocean)
    }
    const geo = new THREE.PlaneGeometry(420, 420, segs, segs)
    geo.rotateX(-Math.PI / 2)
    const mat = new THREE.MeshBasicNodeMaterial()
    mat.positionNode = wavePosition(positionLocal.xz, uTime, uSeaUniform)
    mat.colorNode = oceanColor()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.frustumCulled = false
    scene.add(mesh)
    window.__ocean = mesh
  }

  function rebuildSkyDome(segW, segH) {
    const scene = sceneRef()
    if (!scene) return
    if (window.__sky) {
      window.__sky.geometry.dispose()
      scene.remove(window.__sky)
    }
    const w = Math.max(segW, 8)
    const h = Math.max(segH, 4)
    const geo = new THREE.SphereGeometry(4000, w, h)
    const mat = new THREE.MeshBasicNodeMaterial()
    mat.side = THREE.BackSide
    mat.depthWrite = false
    mat.colorNode = skyDomeColor()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = -1
    mesh.frustumCulled = false
    scene.add(mesh)
    window.__sky = mesh
  }

  function rebuildPostProcessing(bi) {
    const pp = postProcessingRef()
    if (!pp) return
    const cam = cameraRef()
    if (!cam) return
    const scenePass = pass(sceneRef(), cam)
    const sceneColor = scenePass.getTextureNode('output')
    if (bi > 0.001) {
      pp.outputNode = sceneColor.add(bloom(sceneColor, 0.4 * bi, 0.3 * bi, 0.9))
    } else {
      pp.outputNode = sceneColor
    }
  }

  /* ---- rebuild all scene objects from current tier ---- */
  function rebuildScene() {
    const c = cfg()
    uFbmOctaves.value = c.fbm
    if (prevTier !== tier || !benchPhase) {
      rebuildOceanMesh(c.ms)
      rebuildSkyDome(c.sw, c.sh)
      rebuildPostProcessing(c.bi)
      targetPr = Math.min(window.devicePixelRatio, c.pr)
    }
    prevTier = tier
  }

  /* ================================================================
     Pixel ratio smoothing
     ================================================================ */

  function initPixelRatio() {
    targetPr = Math.min(window.devicePixelRatio, cfg().pr)
    currentPr = targetPr
  }

  function tickPixelRatio() {
    if (currentPr === 0) {
      currentPr = targetPr
      return
    }
    const diff = targetPr - currentPr
    if (Math.abs(diff) < 0.005) {
      if (currentPr !== targetPr) {
        currentPr = targetPr
        const r = rendererRef()
        if (r) r.setPixelRatio(currentPr)
      }
      return
    }
    currentPr += diff * PR_SMOOTH_RATE
    const r = rendererRef()
    if (r) r.setPixelRatio(currentPr)
  }

  /* ---- change tier ---- */
  function changeTier(newTier) {
    const clamped = Math.max(0, Math.min(4, newTier))
    if (clamped === tier) return
    tier = clamped
    changeCooldown = TIER_COOLDOWN_FRAMES
    downscaleDebt = 0
    upscaleCredit = 0
    uFbmOctaves.value = cfg().fbm
    targetPr = Math.min(window.devicePixelRatio, cfg().pr)
    rebuildOceanMesh(cfg().ms)
    rebuildSkyDome(cfg().sw, cfg().sh)
    rebuildPostProcessing(cfg().bi)
    prevTier = tier
    updateQualityBadge()
  }

  /* ================================================================
     Initial tier detection
     ================================================================ */
  async function pickInitialTier() {
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
  }

  /* ---- finish benchmark ---- */
  async function finishBenchmark() {
    const fps = benchFrames / benchAccum
    if (fps < DOWNSCALE_FPS && tier < 4) {
      tier += 1
      benchFrames = 0
      benchAccum = 0
      rebuildScene()
      return
    }
    benchPhase = false
    smoothFps = fps
    fpsTimer = 0
    fpsFrames = 0
    fpsDisplay.value = String(Math.round(fps))
    updateQualityBadge()
  }

  /* ---- per-frame tick ---- */
  function tick(dt) {
    if (!adapt) return

    // Benchmark phase
    if (benchPhase) {
      benchAccum += dt
      benchFrames += 1
      if (benchFrames >= BENCHMARK_FRAMES) {
        finishBenchmark()
      }
      return
    }

    // Smooth pixel ratio every frame
    tickPixelRatio()

    // Cooldown countdown (frame-based)
    if (changeCooldown > 0) {
      changeCooldown--
      return
    }

    // EMA-smoothed FPS from frame time
    const frameMs = dt * 1000
    smoothFps = smoothFps * (1 - EMA_ALPHA) + (1000 / Math.max(frameMs, 0.1)) * EMA_ALPHA
    const fps = smoothFps

    // Three-zone hysteresis
    if (fps < DOWNSCALE_FPS) {
      downscaleDebt++
      upscaleCredit = 0
      if (downscaleDebt >= DEBT_THRESHOLD && tier < 4) {
        downscaleDebt = 0
        changeTier(tier + 1)
      }
    } else if (fps >= UPSCALE_FPS) {
      upscaleCredit++
      downscaleDebt = 0
      if (upscaleCredit >= CREDIT_THRESHOLD && tier > 0) {
        upscaleCredit = 0
        changeTier(tier - 1)
      }
    } else {
      downscaleDebt = Math.max(0, downscaleDebt - 0.15)
      upscaleCredit = Math.max(0, upscaleCredit - 0.15)
    }

    // Update display FPS (for UI only)
    fpsTimer += dt
    fpsFrames += 1
    if (fpsTimer >= RECORD_WINDOW) {
      fpsTimer = 0
      fpsFrames = 0
    }
  }

  /* ---- Ultra HD toggle ---- */
  function toggleUltraHd() {
    ultraHd = !ultraHd
    if (ultraHd) {
      savedTier = tier
      adapt = false
      benchPhase = false
      tier = 0
    } else {
      tier = savedTier
      adapt = true
    }
    targetPr = Math.min(window.devicePixelRatio, cfg().pr)
    rebuildOceanMesh(cfg().ms)
    rebuildSkyDome(cfg().sw, cfg().sh)
    rebuildPostProcessing(cfg().bi)
    prevTier = tier
    updateQualityBadge()
  }

  /* ---- public API ---- */
  return {
    get tier() { return tier },
    set tier(v) { tier = v },
    get prevTier() { return prevTier },
    set prevTier(v) { prevTier = v },
    get ultraHd() { return ultraHd },
    get benchPhase() { return benchPhase },
    get adapt() { return adapt },
    get cfg() { return cfg() },
    get changeCooldown() { return changeCooldown },
    benchTier: 2,
    tick,
    toggleUltraHd,
    pickInitialTier,
    initPixelRatio,
    rebuildScene,
    rebuildOceanMesh: (arg) => {
      const segs = typeof arg === 'object' ? arg.ms : arg
      rebuildOceanMesh(segs || cfg().ms)
    },
    rebuildSkyDome: (arg1, arg2) => {
      const sw = typeof arg1 === 'object' ? arg1.sw : arg1
      const sh = typeof arg1 === 'object' ? arg1.sh : arg2
      rebuildSkyDome(sw || cfg().sw, sh || cfg().sh)
    },
    rebuildPostProcessing: (arg) => {
      const bi = typeof arg === 'object' ? arg.bi : arg
      rebuildPostProcessing(bi !== undefined ? bi : cfg().bi)
    },
    applyPixelRatio: () => { targetPr = Math.min(window.devicePixelRatio, cfg().pr) },
    updateQualityBadge,
  }
}
