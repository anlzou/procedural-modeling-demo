import * as THREE from 'three/webgpu'

export interface SnowConfig {
  count?: number
  bounds?: { yMin: number; yMax: number; xRange: number; zRange: number; originX: number; originZ: number }
}

const defaultConfig: Required<SnowConfig> = {
  count: 1200,
  bounds: { yMin: 8, yMax: 25, xRange: 120, zRange: 120, originX: 0, originZ: 0 },
}

function makeSnowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.3, 'rgba(255,255,255,0.85)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 32, 32)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export function createSnowSystem(scene: THREE.Scene, config?: SnowConfig) {
  const cfg = { ...defaultConfig, ...config }
  if (config?.bounds) cfg.bounds = { ...defaultConfig.bounds, ...config.bounds }
  const count = cfg.count, bounds = cfg.bounds

  const spriteTexture = makeSnowTexture()
  const spriteMaterial = new THREE.SpriteMaterial({
    map: spriteTexture,
    color: new THREE.Color(0.95, 0.97, 1.0),
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })

  const sprites: THREE.Sprite[] = []
  for (let i = 0; i < count; i++) {
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.visible = false
    sprite.scale.set(0.35, 0.35, 1)
    scene.add(sprite)
    sprites.push(sprite)
  }

  const particles: { x: number; y: number; z: number; vx: number; vy: number; vz: number; size: number; spawnDelay: number }[] = []
  let visible = false

  function respawn(p: typeof particles[0]) {
    p.x = bounds.originX + (Math.random() - 0.5) * bounds.xRange
    p.y = bounds.yMax + Math.random() * 8
    p.z = bounds.originZ + (Math.random() - 0.5) * bounds.zRange
    p.vx = (Math.random() - 0.5) * 0.5
    p.vy = -(0.8 + Math.random() * 1.2)
    p.vz = (Math.random() - 0.5) * 0.5
    p.spawnDelay = 0
  }

  for (let i = 0; i < count; i++) {
    const p = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 0.25 + Math.random() * 0.25, spawnDelay: 0 }
    respawn(p)
    p.y = bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin + 15)
    p.spawnDelay = Math.random() * 0.1
    particles.push(p)
  }

  function syncSprites() {
    for (let i = 0; i < count; i++) {
      const p = particles[i]
      const sprite = sprites[i]
      if (p.spawnDelay > 0 || !visible) {
        sprite.visible = false
        continue
      }
      sprite.visible = true
      sprite.position.set(p.x, p.y, p.z)
      sprite.scale.set(p.size, p.size, 1)
    }
  }

  function setVisible(on: boolean) {
    visible = on
    if (!on) {
      for (const s of sprites) s.visible = false
    }
  }

  function update(dt: number, elapsedTime: number) {
    if (!visible) return
    const cappedDt = Math.min(dt, 0.2)
    const sway = 0.3
    for (let i = 0; i < count; i++) {
      const p = particles[i]
      if (p.spawnDelay > 0) { p.spawnDelay -= cappedDt; continue }
      p.x += p.vx * cappedDt; p.y += p.vy * cappedDt; p.z += p.vz * cappedDt
      const to = p.z * 0.1 + p.x * 0.05
      p.x += Math.sin(elapsedTime * 0.8 + to) * sway * cappedDt
      p.z += Math.cos(elapsedTime * 0.6 + to) * sway * cappedDt
      p.y += Math.sin(elapsedTime * 2.0 + p.x * 0.1) * 0.05 * cappedDt
      if (p.y < -2) { respawn(p); p.spawnDelay = Math.random() * 0.2 }
    }
    syncSprites()
  }

  function dispose() {
    for (const s of sprites) { scene.remove(s) }
    spriteTexture.dispose()
    spriteMaterial.dispose()
  }

  syncSprites()
  return { setVisible, update, dispose }
}
