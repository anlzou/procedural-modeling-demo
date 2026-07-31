import * as THREE from 'three/webgpu'

/**
 * 流星（shooting star）系统 — 仅用于 Clear 晴朗夜空
 *
 * 实现：
 *  - 拖尾：一条 Line（2 顶点），头部亮白蓝、尾部透明（顶点色渐变）
 *  - 头部：一个发光 Sprite（径向渐变贴图），叠加混合 → 适配 Bloom
 *  - 在相机前方天空随机起点生成，沿天空切线方向快速划过，短暂停留后淡出
 */

export function createMeteorSystem(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
  // ---- 拖尾线段（2 个顶点：头 + 尾） ----
  const trailGeo = new THREE.BufferGeometry()
  const positions = new Float32Array(6)
  const colors = new Float32Array(6)
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

  // ---- 头部发光 Sprite（径向渐变） ----
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.3, 'rgba(200,220,255,0.7)')
  grad.addColorStop(1, 'rgba(200,220,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 32, 32)
  const headTex = new THREE.CanvasTexture(canvas)
  headTex.needsUpdate = true

  const headMat = new THREE.SpriteMaterial({
    map: headTex,
    color: new THREE.Color(0.9, 0.95, 1.0),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const head = new THREE.Sprite(headMat)
  head.scale.set(60, 60, 1)
  scene.add(head)

  // ---- 常量 ----
  const WORLD_UP = new THREE.Vector3(0, 1, 0)
  const TRAIL_LEN = 140 // 拖尾长度（世界单位）
  const SPEED = 950 // 移动速度
  const LIFE = 1.4 // 存在时长（秒）
  const SPAWN_MIN_R = 1500
  const SPAWN_RANGE = 1000

  // ---- 状态 ----
  let timer = 4 + Math.random() * 8 // 首次流星延迟
  let active = false
  let life = 0
  const pos = new THREE.Vector3()
  const vel = new THREE.Vector3()
  const tmp = new THREE.Vector3()

  /** 在相机前方天空随机生成一颗流星 */
  function spawn() {
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)

    // 围绕相机朝向的随机水平偏移 + 上偏
    const theta = (Math.random() - 0.5) * 1.4
    dir.applyAxisAngle(WORLD_UP, theta)
    dir.y += 0.15 + Math.random() * 0.35
    dir.normalize()

    const radius = SPAWN_MIN_R + Math.random() * SPAWN_RANGE
    pos.copy(camera.position).addScaledVector(dir, radius)

    // 速度：天空切线方向（近似水平划过）+ 轻微下落
    vel.crossVectors(dir, WORLD_UP).normalize()
    if (Math.random() < 0.5) vel.multiplyScalar(-1) // 随机向左/右划过
    vel.multiplyScalar(SPEED)
    vel.y -= 260

    life = LIFE
    active = true
  }

  function update(dt: number) {
    if (active) {
      life -= dt
      if (life <= 0) {
        deactivate()
        timer = 5 + Math.random() * 12 // 下次流星间隔 5~17s
        return
      }

      // 移动
      pos.addScaledVector(vel, dt)

      // 淡入淡出（开头快闪、末尾渐隐）
      const fade = Math.min(1, life / 0.35, (LIFE - life) / 0.12)

      // 更新拖尾：头部 + 沿 -vel 方向的尾部
      tmp.copy(vel).normalize()
      positions[0] = pos.x
      positions[1] = pos.y
      positions[2] = pos.z
      positions[3] = pos.x - tmp.x * TRAIL_LEN
      positions[4] = pos.y - tmp.y * TRAIL_LEN
      positions[5] = pos.z - tmp.z * TRAIL_LEN

      // 颜色：头亮白蓝 → 尾透明
      const b = 1.4 * fade
      colors[0] = 0.7 * b; colors[1] = 0.85 * b; colors[2] = 1.0 * b
      colors[3] = 0; colors[4] = 0; colors[5] = 0

      trailGeo.attributes.position.needsUpdate = true
      trailGeo.attributes.color.needsUpdate = true
      trailMat.opacity = fade

      // 头部光点跟随
      head.position.copy(pos)
      headMat.opacity = fade
    } else {
      timer -= dt
      if (timer <= 0) spawn()
    }
  }

  function deactivate() {
    active = false
    trailMat.opacity = 0
    headMat.opacity = 0
    trail.visible = false
    head.visible = false
  }

  /** 离开 Clear 夜晚时重置 */
  function reset() {
    deactivate()
    timer = 5 + Math.random() * 10
  }

  function dispose() {
    scene.remove(trail)
    scene.remove(head)
    trailGeo.dispose()
    trailMat.dispose()
    headTex.dispose()
    headMat.dispose()
  }

  return { update, reset, dispose }
}
