import * as THREE from 'three/webgpu'

// ── 波纹配置 ──────────────────────────────────────────────
const RIPPLE_POOL = 100      // 波纹对象池大小（同时最多显示的波纹数）
const EXPAND_SPEED = 0.3     // 扩展速度（半径单位/秒）
const MAX_RADIUS = 0.1       // 最大半径
const FADE_DURATION = 0.4    // 淡出时长（秒）
const RING_SEGMENTS = 20     // 环形几何体分段数

// 单个波纹的状态
interface Ripple {
  x: number
  z: number
  radius: number          // 当前半径
  life: number            // 生命值 0..1，1=刚生成，0=消亡
  mesh: THREE.Mesh | null
  active: boolean         // 是否激活
}

export function createRippleSystem(scene: THREE.Scene) {
  // 共享的环形几何体（内径 0.01 → 外径 0.06，通过 scale 放大）
  const baseGeo = new THREE.RingGeometry(0.01, 0.06, RING_SEGMENTS)
  baseGeo.rotateX(-Math.PI / 2)  // 平放在 XZ 平面（海面 Y=0）

  const ripples: Ripple[] = []
  const pool: THREE.Mesh[] = []

  // 预分配对象池
  for (let i = 0; i < RIPPLE_POOL; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.6, 0.75, 0.95),  // 蓝白色，与海洋色调一致
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,           // 叠加混合，适配 Bloom
    })
    const mesh = new THREE.Mesh(baseGeo, mat)
    mesh.visible = false
    mesh.frustumCulled = false
    scene.add(mesh)
    pool.push(mesh)

    ripples.push({ x: 0, z: 0, radius: 0, life: 0, mesh, active: false })
  }

  let nextPoolIdx = 0   // 循环索引，轮流分配池中的波纹

  /** 在海面 (x, z) 处生成一个波纹 */
  function spawn(x: number, z: number) {
    // 从池中找到第一个非活跃的波纹
    for (let tries = 0; tries < RIPPLE_POOL; tries++) {
      const idx = nextPoolIdx % RIPPLE_POOL
      nextPoolIdx++
      const r = ripples[idx]
      if (!r.active) {
        r.x = x
        r.z = z
        r.radius = 0.05           // 初始半径
        r.life = 1                 // 满生命
        r.active = true
        r.mesh!.visible = true
        r.mesh!.position.set(x, 0, z)  // Y=0 为海面
        return
      }
    }
  }

  /** 每帧更新所有活跃波纹：扩展半径 + 淡出透明度 */
  function update(dt: number) {
    const cappedDt = Math.min(dt, 0.05)

    for (let i = 0; i < RIPPLE_POOL; i++) {
      const r = ripples[i]
      if (!r.active) continue

      // 生命衰减
      r.life -= cappedDt / FADE_DURATION
      if (r.life <= 0) {
        r.active = false
        r.mesh!.visible = false
        r.mesh!.material.opacity = 0
        continue
      }

      // 半径扩展
      r.radius += EXPAND_SPEED * cappedDt
      if (r.radius > MAX_RADIUS) r.radius = MAX_RADIUS

      // 通过 scale 放大环形（RingGeometry 固定大小，用 scale 控制显示大小）
      const scale = r.radius / 0.06
      r.mesh!.scale.set(scale, scale, scale)

      // 透明度随生命值线性淡出
      const alpha = r.life * 0.5
      r.mesh!.material.opacity = alpha
    }
  }

  /** 清理所有波纹 Mesh */
  function dispose() {
    for (const r of ripples) {
      if (r.mesh) {
        scene.remove(r.mesh)
        r.mesh.geometry?.dispose()
        r.mesh.material?.dispose()
      }
    }
  }

  return { spawn, update, dispose }
}
