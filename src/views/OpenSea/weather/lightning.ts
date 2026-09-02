import * as THREE from 'three/webgpu'
import { Fn, uniform, attribute, vec3, vec4, smoothstep, exp } from 'three/tsl'

export interface LightningOptions {
  camera?: THREE.Camera
  flashUniform?: { value: number }
  flashDirUniform?: { value: THREE.Vector3 }
  /** 天空/海面闪光强度，0 只显示闪电本身 */
  flashScale?: number
}

interface Strip {
  pts: THREE.Vector3[]
  prog: number[]
  widthScale: number
  intensity: number
}

type Phase = 'idle' | 'leader' | 'return' | 'hold' | 'decay'

/**
 * 风暴闪电：分形中点位移路径 + 芯核/光晕双层（面向相机）+ 真实先导/回击/再击时序。
 * 每次事件随机 1～3 道，可同时或错开出现。
 */
export function createLightningSystem(
  scene: THREE.Scene,
  options: LightningOptions = {},
) {
  const camera = options.camera
  const flashUniform = options.flashUniform
  const flashDirUniform = options.flashDirUniform
  let flashScale = Math.max(0, options.flashScale ?? 0)

  /* ============================================================
     微调区
     ------------------------------------------------------------
     路径：高空细长主干（尽量占满视野高度）+ 少量横向分叉。
     时序：先导 → 回击 → 随机停留 → 随机淡出。
     数量：每次 1～3 道，同时或先后。
     ============================================================ */
  const MAX_BOLTS = 3
  const MAIN_SUBDIV = 6
  const MAIN_OFFSET = 0.22
  const BRANCH_LEVELS = 2
  const BRANCH_COUNT_MIN = 2
  const BRANCH_COUNT_RANGE = 3
  const BRANCH_SUB_CHANCE = 0.28
  const BRANCH_LEN_MIN = 0.55
  const BRANCH_LEN_RANGE = 0.42
  const CORE_WIDTH = 0.055
  const GLOW_WIDTH = 0.62
  const TAPER = 0.42
  const SEA_CLEARANCE = 3.2
  const AUTO_FIRST_MIN = 1
  const AUTO_FIRST_RANGE = 3
  const AUTO_INTERVAL_MIN = 4
  const AUTO_INTERVAL_RANGE = 7
  const LEADER_TIME_MIN = 0.14
  const LEADER_TIME_RANGE = 0.1
  const LEADER_STEPS = 12
  const LEADER_OPACITY = 0.55
  const RETURN_ATTACK = 0.08
  const FLASH_STRENGTH = 1.15
  const HOLD_MIN = 1.8
  const HOLD_RANGE = 2.8
  const FADE_MIN = 1.8
  const FADE_RANGE = 2.6
  const STROKE_INTERVAL_MIN = 0.12
  const STROKE_INTERVAL_MAX = 0.45
  const STROKE_DECAY = 0.78
  const STAGGER_MIN = 0.16
  const STAGGER_RANGE = 0.72

  const tmpDir = new THREE.Vector3()
  const tmpView = new THREE.Vector3()
  const tmpPerp = new THREE.Vector3()
  const tmpFwd = new THREE.Vector3()
  const tmpRight = new THREE.Vector3()
  const tmpUp = new THREE.Vector3(0, 1, 0)

  function pathLen(path: THREE.Vector3[]) {
    let len = 0
    for (let i = 1; i < path.length; i++) len += path[i].distanceTo(path[i - 1])
    return len
  }

  function accumulateProgress(path: THREE.Vector3[], start = 0, span = 1) {
    const total = pathLen(path)
    const prog: number[] = []
    let cum = 0
    for (let i = 0; i < path.length; i++) {
      if (i > 0) cum += path[i].distanceTo(path[i - 1])
      const t = total > 0 ? cum / total : i / Math.max(1, path.length - 1)
      prog.push(start + t * span)
    }
    return prog
  }

  function midpointDisplace(
    start: THREE.Vector3,
    end: THREE.Vector3,
    depth: number,
    amplitude: number,
  ): THREE.Vector3[] {
    if (depth <= 0 || start.distanceTo(end) < 1.2) return [start.clone(), end.clone()]
    const mid = start.clone().lerp(end, 0.42 + Math.random() * 0.16)
    tmpDir.copy(end).sub(start)
    const len = tmpDir.length()
    if (len < 1e-4) return [start.clone(), end.clone()]
    tmpDir.multiplyScalar(1 / len)
    tmpPerp.crossVectors(tmpDir, tmpUp)
    if (tmpPerp.lengthSq() < 1e-6) tmpPerp.set(1, 0, 0)
    tmpPerp.normalize()
    const binormal = tmpView.crossVectors(tmpDir, tmpPerp).normalize()
    const mag = amplitude * len * (0.35 + Math.random() * 0.65)
    const ang = Math.random() * Math.PI * 2
    mid.addScaledVector(tmpPerp, Math.cos(ang) * mag)
    mid.addScaledVector(binormal, Math.sin(ang) * mag * 0.4)
    const nextAmp = amplitude * 0.5
    const left = midpointDisplace(start, mid, depth - 1, nextAmp)
    const right = midpointDisplace(mid, end, depth - 1, nextAmp)
    return left.concat(right.slice(1))
  }

  function spawnBranch(
    origin: THREE.Vector3,
    tangent: THREE.Vector3,
    length: number,
    depth: number,
    parentProg: number,
    level: number,
    jagged: number,
    out: Strip[],
  ) {
    tmpPerp.crossVectors(tangent, tmpUp)
    if (tmpPerp.lengthSq() < 1e-6) tmpPerp.set(1, 0, 0)
    tmpPerp.normalize()
    if (Math.random() < 0.5) tmpPerp.negate()
    const fork = tangent.clone().normalize()
    fork.y *= 0.05 + Math.random() * 0.55
    fork.addScaledVector(tmpPerp, 0.7 + Math.random() * 2.6)
    fork.y -= Math.random() * 0.35
    fork.normalize()
    const end = origin.clone().addScaledVector(fork, length)
    end.y = Math.max(SEA_CLEARANCE, end.y)
    const pts = midpointDisplace(origin, end, depth, jagged * (0.75 - level * 0.18))
    const span = 0.06 + Math.random() * 0.18
    const widthScale = level === 1 ? 0.32 + Math.random() * 0.16 : 0.14 + Math.random() * 0.12
    const intensity = level === 1 ? 0.62 + Math.random() * 0.28 : 0.35 + Math.random() * 0.25
    out.push({
      pts,
      prog: accumulateProgress(pts, parentProg, span),
      widthScale,
      intensity,
    })
    if (level >= BRANCH_LEVELS || pts.length < 5) return
    if (Math.random() > BRANCH_SUB_CHANCE) return
    const idx = 2 + Math.floor(Math.random() * (pts.length - 3))
    const subTan = pts[Math.min(pts.length - 1, idx + 1)].clone().sub(pts[idx])
    if (subTan.lengthSq() < 1e-4) return
    spawnBranch(
      pts[idx],
      subTan,
      length * (0.4 + Math.random() * 0.45),
      Math.max(2, depth - 1),
      parentProg + span * (idx / (pts.length - 1)),
      level + 1,
      jagged,
      out,
    )
  }

  function pickDistance(band: number) {
    if (band === 0) return 30 + Math.random() * 28
    if (band === 1) return 68 + Math.random() * 52
    return 135 + Math.random() * 130
  }

  function frontPlacement(slot: number, total: number, band: number) {
    const camPos = camera?.position
    if (!camPos || !camera) {
      const angle = Math.random() * Math.PI * 2
      const dist = pickDistance(band)
      const height = 24 + Math.random() * 50
      const topY = 18 + height
      const hangY = Math.max(SEA_CLEARANCE, topY - height * (0.55 + Math.random() * 0.45))
      return {
        start: new THREE.Vector3(Math.cos(angle) * dist, topY, Math.sin(angle) * dist),
        end: new THREE.Vector3(
          Math.cos(angle) * dist + (Math.random() - 0.5) * height * 0.6,
          hangY,
          Math.sin(angle) * dist + (Math.random() - 0.5) * height * 0.25,
        ),
      }
    }
    camera.getWorldDirection(tmpFwd)
    tmpFwd.y *= 0.18
    if (tmpFwd.lengthSq() < 1e-6) tmpFwd.set(0, 0, -1)
    tmpFwd.normalize()
    tmpRight.crossVectors(tmpFwd, tmpUp)
    if (tmpRight.lengthSq() < 1e-6) tmpRight.set(1, 0, 0)
    tmpRight.normalize()
    tmpView.crossVectors(tmpRight, tmpFwd)
    if (tmpView.lengthSq() < 1e-6) tmpView.set(0, 1, 0)
    tmpView.normalize()

    const dist = pickDistance(band)
    const yaw = (Math.random() - 0.5) * 1.35 + (total > 1 ? (slot - (total - 1) * 0.5) * 0.42 : 0)
    const pitch = -0.18 + Math.random() * 0.58
    tmpDir.copy(tmpFwd)
      .addScaledVector(tmpRight, Math.tan(yaw))
      .addScaledVector(tmpView, Math.tan(pitch))
    tmpDir.normalize()

    const height = 22 + Math.random() * 56
    const anchor = camPos.clone().addScaledVector(tmpDir, dist)
    const start = anchor.clone()
    start.y += height * (0.42 + Math.random() * 0.28)
    start.addScaledVector(tmpRight, (Math.random() - 0.5) * 14)
    const drop = 0.52 + Math.random() * 0.48
    const end = anchor.clone()
    end.y = Math.max(SEA_CLEARANCE, start.y - height * drop)
    end.addScaledVector(tmpRight, (Math.random() - 0.5) * height * 0.62)
    end.addScaledVector(tmpFwd, (Math.random() - 0.5) * height * 0.22)
    return { start, end }
  }

  function buildStrips(slot: number, total: number, band: number, flashDir: THREE.Vector3): Strip[] {
    const { start, end } = frontPlacement(slot, total, band)
    const jagged = 0.1 + Math.random() * 0.34
    const subdiv = 5 + Math.floor(Math.random() * 3)
    const main = midpointDisplace(start, end, subdiv, jagged)
    const mainProg = accumulateProgress(main)
    const out: Strip[] = [{ pts: main, prog: mainProg, widthScale: 1, intensity: 1 }]

    const skipLo = Math.floor(main.length * (0.08 + Math.random() * 0.1))
    const skipHi = Math.floor(main.length * (0.55 + Math.random() * 0.25))
    const span = Math.max(1, skipHi - skipLo)
    const want = Math.random() < 0.16
      ? 0
      : 1 + Math.floor(Math.random() * (BRANCH_COUNT_MIN + BRANCH_COUNT_RANGE))
    const trunkLen = Math.max(12, start.distanceTo(end))
    for (let n = 0; n < want; n++) {
      const i = skipLo + Math.floor((n + Math.random()) * span / Math.max(1, want))
      const clamped = Math.max(skipLo, Math.min(skipHi - 1, i))
      const a = main[clamped]
      const b = main[Math.min(main.length - 1, clamped + 1)]
      const tan = b.clone().sub(a)
      if (tan.lengthSq() < 1e-4) continue
      const len = trunkLen * (0.28 + Math.random() * 0.7)
      spawnBranch(a, tan, len, 3 + Math.floor(Math.random() * 3), mainProg[clamped], 1, jagged, out)
    }

    const mid = main[Math.floor(main.length * (0.18 + Math.random() * 0.3))]
    flashDir.set(mid.x, Math.max(mid.y, 12), mid.z).normalize()
    return out
  }

  function vertexCount(list: Strip[]) {
    let n = 0
    for (const s of list) n += Math.max(0, s.pts.length - 1) * 6
    return n
  }

  function ensureGeometry(mesh: THREE.Mesh, count: number) {
    const geo = mesh.geometry
    const pos = geo.getAttribute('position')
    if (pos && pos.count === count) return geo
    geo.dispose()
    const next = new THREE.BufferGeometry()
    next.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    next.setAttribute('progress', new THREE.BufferAttribute(new Float32Array(count), 1))
    next.setAttribute('across', new THREE.BufferAttribute(new Float32Array(count), 1))
    next.setAttribute('bright', new THREE.BufferAttribute(new Float32Array(count), 1))
    mesh.geometry = next
    return next
  }

  function writeRibbon(
    geo: THREE.BufferGeometry,
    strips: Strip[],
    width: number,
    updateStatic: boolean,
  ) {
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    const progAttr = geo.getAttribute('progress') as THREE.BufferAttribute
    const acrossAttr = geo.getAttribute('across') as THREE.BufferAttribute
    const intensAttr = geo.getAttribute('bright') as THREE.BufferAttribute
    const camPos = camera?.position
    let w = 0
    for (const strip of strips) {
      const path = strip.pts
      const n = path.length
      if (n < 2) continue
      const half: number[] = []
      const perp: THREE.Vector3[] = []
      for (let i = 0; i < n; i++) {
        const p = path[i]
        tmpDir.copy(path[Math.min(n - 1, i + 1)]).sub(path[Math.max(0, i - 1)])
        if (tmpDir.lengthSq() < 1e-6) tmpDir.set(0, -1, 0)
        tmpDir.normalize()
        if (camPos) tmpView.copy(camPos).sub(p)
        else tmpView.copy(tmpUp)
        tmpPerp.crossVectors(tmpDir, tmpView)
        if (tmpPerp.lengthSq() < 1e-6) tmpPerp.crossVectors(tmpDir, tmpUp)
        if (tmpPerp.lengthSq() < 1e-6) tmpPerp.set(1, 0, 0)
        tmpPerp.normalize()
        const t = n > 1 ? i / (n - 1) : 0
        const halfW = (width / 2) * strip.widthScale * (TAPER + (1 - TAPER) * (1 - t * 0.85))
        perp.push(tmpPerp.clone())
        half.push(halfW)
      }
      for (let i = 0; i < n - 1; i++) {
        const a = path[i]
        const b = path[i + 1]
        const pa = strip.prog[i]
        const pb = strip.prog[i + 1]
        const ha = half[i]
        const hb = half[i + 1]
        const oa = perp[i]
        const ob = perp[i + 1]
        const verts = [
          [a.x - oa.x * ha, a.y - oa.y * ha, a.z - oa.z * ha, pa, -1, strip.intensity],
          [a.x + oa.x * ha, a.y + oa.y * ha, a.z + oa.z * ha, pa, 1, strip.intensity],
          [b.x - ob.x * hb, b.y - ob.y * hb, b.z - ob.z * hb, pb, -1, strip.intensity],
          [a.x + oa.x * ha, a.y + oa.y * ha, a.z + oa.z * ha, pa, 1, strip.intensity],
          [b.x + ob.x * hb, b.y + ob.y * hb, b.z + ob.z * hb, pb, 1, strip.intensity],
          [b.x - ob.x * hb, b.y - ob.y * hb, b.z - ob.z * hb, pb, -1, strip.intensity],
        ]
        for (const v of verts) {
          pos.setXYZ(w, v[0], v[1], v[2])
          if (updateStatic) {
            progAttr.setX(w, v[3])
            acrossAttr.setX(w, v[4])
            intensAttr.setX(w, v[5])
          }
          w += 1
        }
      }
    }
    pos.needsUpdate = true
    if (updateStatic) {
      progAttr.needsUpdate = true
      acrossAttr.needsUpdate = true
      intensAttr.needsUpdate = true
    }
    geo.computeBoundingSphere()
  }

  function createBolt() {
    const uProgress = uniform(1.0)
    const uOpacity = uniform(0.0)
    const uCoreBoost = uniform(1.0)
    const uGlowBoost = uniform(1.0)

    function makeBoltMaterial(kind: 'core' | 'glow') {
      const mat = new THREE.MeshBasicNodeMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      mat.fragmentNode = Fn(() => {
        const prog = attribute('progress')
        const across = attribute('across')
        const intens = attribute('bright')
        const reveal = smoothstep(uProgress.sub(0.035), uProgress.add(0.002), prog)
        const radial = exp(across.mul(across).mul(kind === 'core' ? -36.0 : -6.5))
        const boost = kind === 'core' ? uCoreBoost : uGlowBoost
        const rgb = kind === 'core'
          ? vec3(1.55, 1.42, 1.7)
          : vec3(0.55, 0.72, 1.15)
        const lum = uOpacity.mul(boost).mul(reveal).mul(radial).mul(intens)
        return vec4(rgb.mul(lum), 1.0)
      })()
      return mat
    }

    const coreMaterial = makeBoltMaterial('core')
    const glowMaterial = makeBoltMaterial('glow')
    const coreMesh = new THREE.Mesh(new THREE.BufferGeometry(), coreMaterial)
    const glowMesh = new THREE.Mesh(new THREE.BufferGeometry(), glowMaterial)
    coreMesh.visible = false
    glowMesh.visible = false
    coreMesh.frustumCulled = false
    glowMesh.frustumCulled = false
    coreMesh.renderOrder = 3
    glowMesh.renderOrder = 2
    scene.add(glowMesh)
    scene.add(coreMesh)

    let leaderDuration = LEADER_TIME_MIN
    let holdDuration = HOLD_MIN
    let fadeDuration = FADE_MIN
    let screenFlash = 0
    let boltOpacity = 0
    let coreBoost = 1
    let glowBoost = 1
    let active = false
    let phase: Phase = 'idle'
    let phaseT = 0
    let progress = 0
    let delay = 0
    let pendingSlot = 0
    let pendingTotal = 1
    let pendingBand = 1
    let strokes: { t: number; strength: number; fired: boolean }[] = []
    let strips: Strip[] = []
    const flashDir = new THREE.Vector3(0, 1, 0)

    function applyLook() {
      uProgress.value = progress
      uOpacity.value = boltOpacity
      uCoreBoost.value = coreBoost
      uGlowBoost.value = glowBoost
    }

    function rebuild(updateStatic: boolean) {
      const count = vertexCount(strips)
      if (count < 6) return
      writeRibbon(ensureGeometry(coreMesh, count), strips, CORE_WIDTH, updateStatic)
      writeRibbon(ensureGeometry(glowMesh, count), strips, GLOW_WIDTH, updateStatic)
    }

    function hide() {
      coreMesh.visible = false
      glowMesh.visible = false
      active = false
      phase = 'idle'
      phaseT = 0
      progress = 0
      delay = 0
      boltOpacity = 0
      screenFlash = 0
      coreBoost = 1
      glowBoost = 1
      strokes = []
      uProgress.value = 0
      uOpacity.value = 0
      uCoreBoost.value = 1
      uGlowBoost.value = 1
    }

    function strikeReturn() {
      phase = 'return'
      phaseT = 0
      progress = 1
      boltOpacity = 1
      coreBoost = 26
      glowBoost = 9
      screenFlash = FLASH_STRENGTH
      const count = 4 + Math.floor(Math.random() * 4)
      strokes = []
      let t = 0
      let strength = FLASH_STRENGTH * STROKE_DECAY
      for (let i = 0; i < count; i++) {
        t += STROKE_INTERVAL_MIN + Math.random() * (STROKE_INTERVAL_MAX - STROKE_INTERVAL_MIN)
        strokes.push({ t, strength, fired: false })
        strength *= STROKE_DECAY
      }
    }

    function strike() {
      strips = buildStrips(pendingSlot, pendingTotal, pendingBand, flashDir)
      rebuild(true)
      coreMesh.visible = true
      glowMesh.visible = true
      phase = 'leader'
      phaseT = 0
      progress = 0
      delay = 0
      leaderDuration = LEADER_TIME_MIN + Math.random() * LEADER_TIME_RANGE
      holdDuration = HOLD_MIN + Math.random() * HOLD_RANGE
      fadeDuration = FADE_MIN + Math.random() * FADE_RANGE
      strokes = []
      screenFlash = 0
      boltOpacity = LEADER_OPACITY
      coreBoost = 1.4
      glowBoost = 1.8
      active = true
      applyLook()
    }

    function arm(wait: number, slot: number, total: number, band: number) {
      pendingSlot = slot
      pendingTotal = total
      pendingBand = band
      delay = Math.max(0, wait)
      if (delay <= 0) strike()
    }

    function update(dt: number) {
      if (delay > 0) {
        delay -= dt
        if (delay <= 0) {
          delay = 0
          strike()
        }
        return
      }
      if (!active) return

      rebuild(false)
      phaseT += dt

      if (phase === 'leader') {
        const raw = Math.min(1, phaseT / leaderDuration)
        progress = Math.min(1, Math.ceil(raw * LEADER_STEPS) / LEADER_STEPS)
        boltOpacity = LEADER_OPACITY
        coreBoost = 1.4
        glowBoost = 1.8
        screenFlash = 0
        if (raw >= 1) strikeReturn()
      } else if (phase === 'return') {
        progress = 1
        boltOpacity = 1
        coreBoost = 26
        glowBoost = 9
        if (phaseT >= RETURN_ATTACK) {
          phase = 'hold'
          phaseT = 0
        }
      } else if (phase === 'hold') {
        progress = 1
        const flicker = 0.9 + 0.1 * Math.sin(phaseT * 17.0) * Math.sin(phaseT * 41.0)
        boltOpacity = flicker
        coreBoost = 16 * flicker
        glowBoost = 6.2 * flicker
        screenFlash = Math.max(screenFlash - dt * 1.6, 0.18 * flicker)
        for (const s of strokes) {
          if (!s.fired && phaseT >= s.t) {
            s.fired = true
            screenFlash = s.strength
            coreBoost = 24 * (s.strength / FLASH_STRENGTH)
            glowBoost = 8.5 * (s.strength / FLASH_STRENGTH)
            boltOpacity = 1
          }
        }
        if (phaseT >= holdDuration) {
          phase = 'decay'
          phaseT = 0
        }
      } else if (phase === 'decay') {
        const fade = Math.max(0, 1 - phaseT / fadeDuration)
        const smooth = fade * fade * (3 - 2 * fade)
        boltOpacity = smooth
        coreBoost = 12 * smooth + 0.5
        glowBoost = 5 * smooth + 0.25
        screenFlash = Math.max(screenFlash - dt * (1.2 / Math.max(0.4, fadeDuration * 0.35)), 0) * smooth
        if (fade <= 0) {
          hide()
          return
        }
      }

      applyLook()
    }

    function dispose() {
      scene.remove(coreMesh)
      scene.remove(glowMesh)
      coreMesh.geometry.dispose()
      glowMesh.geometry.dispose()
      coreMaterial.dispose()
      glowMaterial.dispose()
    }

    return {
      busy: () => active || delay > 0,
      getScreenFlash: () => screenFlash,
      getFlashDir: () => flashDir,
      arm,
      hide,
      update,
      dispose,
    }
  }

  const bolts = Array.from({ length: MAX_BOLTS }, () => createBolt())
  let nextStrike = AUTO_FIRST_MIN + Math.random() * AUTO_FIRST_RANGE

  function syncSceneFlash() {
    let maxFlash = 0
    let dir: THREE.Vector3 | null = null
    for (const bolt of bolts) {
      const f = bolt.getScreenFlash()
      if (f >= maxFlash) {
        maxFlash = f
        dir = bolt.getFlashDir()
      }
    }
    if (flashUniform) flashUniform.value = Math.max(maxFlash * flashScale, 0)
    if (flashDirUniform && dir && maxFlash > 0) flashDirUniform.value.copy(dir)
  }

  function anyBusy() {
    return bolts.some((b) => b.busy())
  }

  function startBurst() {
    const want = 1 + Math.floor(Math.random() * MAX_BOLTS)
    const simultaneous = want === 1 || Math.random() < 0.42
    const chosen: typeof bolts = []
    for (const bolt of bolts) {
      if (chosen.length >= want) break
      if (!bolt.busy()) chosen.push(bolt)
    }
    for (const bolt of bolts) {
      if (chosen.length >= want) break
      if (!chosen.includes(bolt)) {
        bolt.hide()
        chosen.push(bolt)
      }
    }

    const bands = [0, 1, 2]
    for (let i = bands.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = bands[i]
      bands[i] = bands[j]
      bands[j] = tmp
    }
    let wait = 0
    chosen.forEach((bolt, i) => {
      const delay = simultaneous ? 0 : wait
      if (!simultaneous && i < chosen.length - 1) {
        wait += STAGGER_MIN + Math.random() * STAGGER_RANGE
      }
      bolt.arm(delay, i, chosen.length, bands[i])
    })
  }

  function trigger() {
    startBurst()
    nextStrike = AUTO_INTERVAL_MIN + Math.random() * AUTO_INTERVAL_RANGE
  }

  function update(dt: number) {
    if (!anyBusy()) {
      nextStrike -= dt
      if (nextStrike <= 0) {
        nextStrike = AUTO_INTERVAL_MIN + Math.random() * AUTO_INTERVAL_RANGE
        startBurst()
      }
    }

    for (const bolt of bolts) bolt.update(dt)
    syncSceneFlash()
  }

  function reset() {
    for (const bolt of bolts) bolt.hide()
    if (flashUniform) flashUniform.value = 0
    nextStrike = 3 + Math.random() * 5
  }

  function dispose() {
    for (const bolt of bolts) bolt.dispose()
  }

  function setFlashScale(value: number) {
    flashScale = Math.max(0, value)
    syncSceneFlash()
  }

  return { update, reset, dispose, trigger, setFlashScale }
}
