import * as THREE from 'three/webgpu'

export interface RainConfig {
  count?: number
  bounds?: { yMin: number; yMax: number; xRange: number; zRange: number; originX: number; originZ: number }
  color?: THREE.Color
  intensity?: number
}

const defaultConfig: Required<RainConfig> = {
  count: 2000,
  bounds: { yMin: 8, yMax: 25, xRange: 120, zRange: 120, originX: 0, originZ: 0 },
  color: new THREE.Color(0.55, 0.65, 0.85),
  intensity: 1,
}

export function createRainSystem(scene: THREE.Scene, config?: RainConfig) {
  const cfg = { ...defaultConfig, ...config }
  if (config?.bounds) cfg.bounds = { ...defaultConfig.bounds, ...config.bounds }
  if (config?.color) cfg.color = config.color

  const count = cfg.count, bounds = cfg.bounds, rainColor = cfg.color

  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 6)
  const colors = new Float32Array(count * 6)
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })

  const mesh = new THREE.LineSegments(geometry, material)
  mesh.frustumCulled = false
  mesh.visible = false
  scene.add(mesh)

  const particles: { x: number; y: number; z: number; vx: number; vy: number; vz: number; spawnDelay: number }[] = []
  let visible = false

  function respawn(p: typeof particles[0]) {
    p.x = bounds.originX + (Math.random() - 0.5) * bounds.xRange
    p.y = bounds.yMax + Math.random() * 6
    p.z = bounds.originZ + (Math.random() - 0.5) * bounds.zRange
    p.vx = (Math.random() - 0.5) * 0.3
    p.vy = -(7 + Math.random() * 7) * (cfg.intensity > 1 ? 1.3 : 1)
    p.vz = (Math.random() - 0.5) * 0.3
    p.spawnDelay = 0
  }

  for (let i = 0; i < count; i++) {
    const p = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spawnDelay: 0 }
    respawn(p)
    p.y = bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin + 10)
    p.spawnDelay = Math.random() * 2
    particles.push(p)
  }

  function syncGeometry() {
    const pos = geometry.attributes.position.array as Float32Array
    const col = geometry.attributes.color.array as Float32Array
    const dir = new THREE.Vector3()

    for (let i = 0; i < count; i++) {
      const p = particles[i]; const i6 = i * 6
      if (p.spawnDelay > 0) {
        pos[i6] = pos[i6 + 3] = 0; pos[i6 + 1] = pos[i6 + 4] = -100; pos[i6 + 2] = pos[i6 + 5] = 0
        col[i6] = col[i6 + 1] = col[i6 + 2] = 0; col[i6 + 3] = col[i6 + 4] = col[i6 + 5] = 0
        continue
      }
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz)
      const dropLen = Math.min(speed * 0.08, 0.4)
      dir.set(p.vx, p.vy, p.vz).normalize()
      pos[i6] = p.x; pos[i6 + 1] = p.y; pos[i6 + 2] = p.z
      pos[i6 + 3] = p.x - dir.x * dropLen; pos[i6 + 4] = p.y - dir.y * dropLen; pos[i6 + 5] = p.z - dir.z * dropLen
      col[i6] = rainColor.r * 0.85; col[i6 + 1] = rainColor.g * 0.85; col[i6 + 2] = rainColor.b * 0.85
      col[i6 + 3] = rainColor.r * 0.3; col[i6 + 4] = rainColor.g * 0.3; col[i6 + 5] = rainColor.b * 0.3
    }
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
  }

  function setVisible(on: boolean) { visible = on; mesh.visible = on }
  function update(dt: number, elapsedTime: number) {
    if (!visible) return
    const cappedDt = Math.min(dt, 0.2)
    const isStorm = cfg.intensity > 1
    const windStr = isStorm ? 0.8 : 0.025

    // 风暴：随时间变化的随机风向（多正弦波合成自然变化）
    let windDirX = 0, windDirZ = 0
    if (isStorm) {
      const angle = elapsedTime * 0.8
        + Math.sin(elapsedTime * 0.07) * 1.5
        + Math.sin(elapsedTime * 0.13) * 0.8
      const strength = 1.0 + Math.sin(elapsedTime * 0.05) * 0.4
      windDirX = Math.cos(angle) * strength * 0.6
      windDirZ = Math.sin(angle) * strength * 0.6
    }

    for (let i = 0; i < count; i++) {
      const p = particles[i]
      if (p.spawnDelay > 0) { p.spawnDelay -= cappedDt; continue }
      p.x += p.vx * cappedDt; p.y += p.vy * cappedDt; p.z += p.vz * cappedDt
      // 风暴：随机风向持续力 + 阵风弹性扰动
      if (isStorm) {
        p.x += windDirX * cappedDt
        p.z += windDirZ * cappedDt
        const gust = Math.sin(elapsedTime * 2.0 + p.x * 0.1 + p.z * 0.08) * 2.0
        p.vx += (gust * 0.7 - p.vx) * 0.02
        p.vz += (gust * 0.5 - p.vz) * 0.02
      }
      p.x += Math.sin(elapsedTime * 1.5 + p.z * 0.05) * windStr * cappedDt
      p.z += Math.cos(elapsedTime * 1.2 + p.x * 0.03) * windStr * cappedDt
      if (p.y < -2) { respawn(p); p.spawnDelay = Math.random() * 0.08 }
    }
    syncGeometry()
  }

  function dispose() { scene.remove(mesh); geometry.dispose(); material.dispose() }

  syncGeometry()
  return { setVisible, update, dispose, mesh, particles, get count() { return count } }
}
