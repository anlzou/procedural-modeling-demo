import * as THREE from 'three/webgpu'

/**
 * 流星（shooting star）系统 — 仅用于 Clear 晴朗夜空
 *
 * 实现：
 *  - 拖尾：一条 Line（2 顶点），头部亮白蓝、尾部透明（顶点色渐变）
 *  - 头部：一个发光 Sprite（径向渐变贴图），叠加混合 → 适配 Bloom
 *  - 从相机后/屏幕外划出，从左上角或右上角进入视野，斜向划过屏幕落向对侧远方海面
 */

export function createMeteorSystem(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
  // ---- 常量 ----
  const TRAIL_LEN = 300 // 拖尾长度（世界单位）
  const ENTRY_DIST_MIN = 500 // 进入视野时的深度（起点，较近）
  const ENTRY_DIST_RANGE = 300 // 深度随机范围（500~800）
  const BEHIND_LEN = 900 // 从屏幕外/相机后方延伸出的起点长度
  const SPEED_BASE = 600 // 飞行速度基准
  const SPEED_RANGE = 150 // 飞行速度随机范围
  const LAND_MIN = 0.75 // 落点至少在对侧海平面 3/4 处（NDC x 绝对值）
  const SEA_FADE_H = 14 // 距海面（y=0）该高度内开始淡出
  const FADE_DIST = 2600 // 距相机超过该距离后开始淡出（兜底，远方变暗）
  const FADE_RANGE = 900 // 淡出过渡距离
  const POOL_SIZE = 6 // 同时最多存在的流星数

  // ---- 头部发光 Sprite 纹理（所有流星共享） ----
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  grad.addColorStop(0, 'rgba(255,255,255,0.4)')
  grad.addColorStop(0.3, 'rgba(200,220,255,0.5)')
  grad.addColorStop(1, 'rgba(200,220,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 32, 32)
  const headTex = new THREE.CanvasTexture(canvas)
  headTex.needsUpdate = true

  interface Meteor {
    active: boolean
    life: number
    lifeTotal: number
    pos: THREE.Vector3
    vel: THREE.Vector3
    trailGeo: THREE.BufferGeometry
    trailMat: THREE.LineBasicMaterial
    trail: THREE.Line
    headMat: THREE.SpriteMaterial
    head: THREE.Sprite
  }

  /** 创建一个流星（拖尾 Line + 头部 Sprite），初始不可见 */
  function createMeteor(): Meteor {
    // 拖尾线段（2 个顶点：头 + 尾）
    const positions = new Float32Array(6)
    const colors = new Float32Array(6)
    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    trailGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const trail = new THREE.Line(trailGeo, trailMat)
    trail.frustumCulled = false
    scene.add(trail)

    // 头部发光 Sprite（径向渐变）
    const headMat = new THREE.SpriteMaterial({
      map: headTex,
      color: new THREE.Color(0.75, 0.85, 1.0),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const head = new THREE.Sprite(headMat)
    head.scale.set(32, 32, 1)
    scene.add(head)

    return {
      active: false,
      life: 0,
      lifeTotal: 0,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      trailGeo, trailMat, trail, headMat, head,
    }
  }

  // ---- 流星池 ----
  const meteors: Meteor[] = []
  for (let i = 0; i < POOL_SIZE; i++) meteors.push(createMeteor())

  const tmp = new THREE.Vector3()
  let timer = 4 + Math.random() * 8 // 自动出现的首次延迟

  /** 屏幕 NDC 坐标 → 从相机出发的世界方向 */
  function ndcToWorldDir(ndcX: number, ndcY: number, out: THREE.Vector3) {
    camera.updateMatrixWorld()
    out.set(ndcX, ndcY, 0.5).unproject(camera)
    out.sub(camera.position).normalize()
    return out
  }

  /** 将屏幕 NDC 坐标投影为相机前方指定深度处的世界点 */
  function ndcToWorld(ndcX: number, ndcY: number, depth: number, out: THREE.Vector3) {
    ndcToWorldDir(ndcX, ndcY, out)
    out.multiplyScalar(depth).add(camera.position)
    return out
  }

  /** 屏幕 NDC 坐标对应的海平面（y=0）世界交点；射线不朝下时返回 null */
  function rayHitSea(ndcX: number, ndcY: number, out: THREE.Vector3): THREE.Vector3 | null {
    ndcToWorldDir(ndcX, ndcY, out)
    if (out.y >= -0.0001) return null
    const t = -camera.position.y / out.y
    out.multiplyScalar(t).add(camera.position)
    return out
  }

  /** 生成一颗流星：从相机后/屏幕外划出，左上角或右上角进入视野，斜向飞向对侧远方海面（远离相机） */
  function spawn(m: Meteor) {
    camera.updateMatrixWorld()

    // 随机选边：从左上角或右上角进入视野
    const fromLeft = Math.random() < 0.5
    const entryX = fromLeft ? -(0.75 + Math.random() * 0.25) : 0.75 + Math.random() * 0.25
    const entryY = 0.85 + Math.random() * 0.15 // 屏幕顶部角落

    // 进入视野的世界点：顶部角落、较近深度（之后向远方飞去）
    const entryDepth = ENTRY_DIST_MIN + Math.random() * ENTRY_DIST_RANGE
    const entry = new THREE.Vector3()
    ndcToWorld(entryX, entryY, entryDepth, entry)

    // 落点：对侧海平面至少 3/4 处；y 贴近地平线（NDC y≈0）→ 前方远方海面
    // （相机高度很低，越接近地平线的海面点越远 → 落点比进入点更远，流星向远方飞）
    const landX = fromLeft ? LAND_MIN + Math.random() * 0.25 : -(LAND_MIN + Math.random() * 0.25)
    const landY = -0.002 - Math.random() * 0.008 // ≈ -0.002 ~ -0.01（地平线附近）
    const landing = new THREE.Vector3()
    if (!rayHitSea(landX, landY, landing)) {
      // 兜底：相机前方更远海面
      ndcToWorldDir(0, -0.05, tmp)
      landing.copy(camera.position).addScaledVector(tmp, entryDepth * 2)
      landing.y = 0
    }

    // 飞行方向：从进入点指向对侧远方海面（远离相机、斜向下、横向越过屏幕）
    tmp.copy(landing).sub(entry).normalize()

    // 起点：沿反方向延伸出屏幕外/相机后方 → 营造“从相机后面划出”
    m.pos.copy(entry).addScaledVector(tmp, -BEHIND_LEN)

    const speed = SPEED_BASE + Math.random() * SPEED_RANGE
    m.vel.copy(tmp).multiplyScalar(speed)

    // 生命周期 = 从背后起点到落海点全程（略留余量，落海时自然淡出回收）
    m.lifeTotal = (m.pos.distanceTo(landing) / speed) * 1.1
    m.life = m.lifeTotal
    m.active = true
    m.trail.visible = true
    m.head.visible = true
  }

  /** 自动生成（定时触发） */
  function autoSpawn() {
    const slot = meteors.find((m) => !m.active)
    if (slot) spawn(slot)
  }

  /** 手动触发一颗流星（快捷键 M，可连续触发） */
  function trigger() {
    // 优先空闲槽位；若已满则覆盖第一个，保证每次按键都能触发
    const slot = meteors.find((m) => !m.active) ?? meteors[0]
    spawn(slot)
  }

  function update(dt: number) {
    // 自动出现的计时
    timer -= dt
    if (timer <= 0) {
      autoSpawn()
      timer = 5 + Math.random() * 12 // 下次流星间隔 5~17s
    }

    for (const m of meteors) {
      if (!m.active) continue

      m.life -= dt
      if (m.life <= 0) {
        deactivate(m)
        continue
      }

      // 移动
      m.pos.addScaledVector(m.vel, dt)

      // 淡入淡出：
      //  - 开头快闪
      //  - 生命末尾渐隐
      //  - 接近海面时逐渐变暗（落到海平面消失）
      //  - 距相机过远时淡出（兜底）
      const fadeIn = Math.min(1, (m.lifeTotal - m.life) / 0.15)
      const fadeOut = Math.min(1, m.life / 0.35)
      const seaFade = Math.max(0, Math.min(1, m.pos.y / SEA_FADE_H))
      const distToCam = m.pos.distanceTo(camera.position)
      const distFade = Math.max(0, Math.min(1, 1 - (distToCam - FADE_DIST) / FADE_RANGE))
      const fade = Math.min(fadeIn, fadeOut, seaFade, distFade)

      // 已完全不可见（落海 / 飞远）→ 提前回收
      if (fade <= 0.01) {
        deactivate(m)
        continue
      }

      // 更新拖尾：头部 + 沿 -vel 方向的尾部
      const posArr = m.trailGeo.attributes.position.array as Float32Array
      const colArr = m.trailGeo.attributes.color.array as Float32Array
      tmp.copy(m.vel).normalize()
      posArr[0] = m.pos.x
      posArr[1] = m.pos.y
      posArr[2] = m.pos.z
      posArr[3] = m.pos.x - tmp.x * TRAIL_LEN
      posArr[4] = m.pos.y - tmp.y * TRAIL_LEN
      posArr[5] = m.pos.z - tmp.z * TRAIL_LEN

      // 颜色：头淡蓝白 → 尾透明（更柔和，避免过亮）
      const b = fade
      colArr[0] = 0.6 * b; colArr[1] = 0.75 * b; colArr[2] = 0.95 * b
      colArr[3] = 0; colArr[4] = 0; colArr[5] = 0

      m.trailGeo.attributes.position.needsUpdate = true
      m.trailGeo.attributes.color.needsUpdate = true
      m.trailMat.opacity = fade

      // 头部光点跟随：位置 + 随距离远去逐渐变小（参考距离 800 时尺寸 32）
      m.head.position.copy(m.pos)
      const headScale = 32 * Math.max(0.25, Math.min(1, 800 / Math.max(distToCam, 1)))
      m.head.scale.set(headScale, headScale, 1)
      m.headMat.opacity = fade
    }
  }

  function deactivate(m: Meteor) {
    m.active = false
    m.trailMat.opacity = 0
    m.headMat.opacity = 0
    m.trail.visible = false
    m.head.visible = false
  }

  /** 离开 Clear 夜晚时重置 */
  function reset() {
    for (const m of meteors) deactivate(m)
    timer = 5 + Math.random() * 10
  }

  function dispose() {
    for (const m of meteors) {
      scene.remove(m.trail)
      scene.remove(m.head)
      m.trailGeo.dispose()
      m.trailMat.dispose()
      m.headMat.dispose()
    }
    headTex.dispose()
  }

  return { update, reset, dispose, trigger }
}
