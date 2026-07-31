import * as THREE from 'three/webgpu'

/**
 * 风暴闪电系统：
 *  - 随机时间触发一道锯齿闪电束（LineSegments，叠加混合）
 *  - 同时点亮传入的 uLightning 闪光 uniform，让天空/海洋瞬间变亮（双闪+衰减）
 */

export function createLightningSystem(
  scene: THREE.Scene,
  flashUniform?: { value: number },
) {
  // 闪电束材质（蓝白、叠加、不写深度）
  const boltMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(0.85, 0.9, 1.0),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const boltLine = new THREE.LineSegments(new THREE.BufferGeometry(), boltMaterial)
  boltLine.visible = false
  boltLine.frustumCulled = false
  scene.add(boltLine)

  let nextStrike = 2 + Math.random() * 4 // 首次 2~6s
  let flash = 0 // 当前闪光强度 0~1
  let active = false

  /** 生成一道随机锯齿闪电几何体（含分支） */
  function buildBoltGeometry() {
    const positions: number[] = []
    const topY = 55 + Math.random() * 30
    const angle = Math.random() * Math.PI * 2
    const dist = 40 + Math.random() * 120
    let x = Math.cos(angle) * dist
    let y = topY
    let z = Math.sin(angle) * dist
    const segments = 10 + Math.floor(Math.random() * 5)
    const step = topY / segments

    for (let i = 0; i < segments; i++) {
      const nx = x + (Math.random() - 0.5) * 9
      const ny = y - step
      const nz = z + (Math.random() - 0.5) * 9
      positions.push(x, y, z, nx, ny, nz)
      x = nx; y = ny; z = nz

      // 随机分支
      if (i > 2 && Math.random() < 0.3) {
        const bx = x + (Math.random() - 0.5) * 12
        const by = y - step * (0.4 + Math.random() * 0.6)
        const bz = z + (Math.random() - 0.5) * 12
        positions.push(x, y, z, bx, by, bz)
      }
    }

    boltLine.geometry.dispose()
    boltLine.geometry = new THREE.BufferGeometry()
    boltLine.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(positions), 3),
    )
  }

  /** 触发一次闪电 */
  function strike() {
    buildBoltGeometry()
    boltLine.visible = true
    flash = 1
    active = true
    boltMaterial.opacity = 1
    if (flashUniform) flashUniform.value = 1
  }

  function update(dt: number) {
    if (active) {
      // 快衰减 + 二次闪（经典双闪效果）
      flash -= dt * 4
      if (flash < 0.35 && Math.random() < 0.35) {
        flash = 0.6
        if (flashUniform) flashUniform.value = flash
      }
      if (flash <= 0) {
        flash = 0
        active = false
        boltLine.visible = false
        boltMaterial.opacity = 0
        if (flashUniform) flashUniform.value = 0
      } else {
        boltMaterial.opacity = flash
        if (flashUniform) flashUniform.value = flash
      }
    } else {
      nextStrike -= dt
      if (nextStrike <= 0) {
        nextStrike = 4 + Math.random() * 8 // 间隔 4~12s
        strike()
      }
    }
  }

  /** 离开风暴时重置，避免残留 */
  function reset() {
    active = false
    flash = 0
    boltLine.visible = false
    boltMaterial.opacity = 0
    if (flashUniform) flashUniform.value = 0
    nextStrike = 3 + Math.random() * 5
  }

  function dispose() {
    scene.remove(boltLine)
    boltLine.geometry.dispose()
    boltMaterial.dispose()
  }

  return { update, reset, dispose }
}
