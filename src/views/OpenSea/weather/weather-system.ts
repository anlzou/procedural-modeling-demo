import * as THREE from 'three/webgpu'
import { createRainSystem, type RainConfig } from './rain.js'
import { createSnowSystem, type SnowConfig } from './snow.js'
import { createRippleSystem } from './ripples.js'
import { createLightningSystem } from './lightning.js'

export type WeatherType = 'clear' | 'rain' | 'snow' | 'storm'

export interface WeatherConfig {
  rain?: RainConfig
  snow?: SnowConfig
  camera?: THREE.Camera
  /** TSL uniform（uLightning），闪电时短暂点亮天空/海洋 */
  lightningUniform?: { value: number }
  lightningDirUniform?: { value: THREE.Vector3 }
}

export function createWeatherSystem(scene: THREE.Scene, config?: WeatherConfig) {
  let rain: ReturnType<typeof createRainSystem> | null = null
  let stormRain: ReturnType<typeof createRainSystem> | null = null
  let snow: ReturnType<typeof createSnowSystem> | null = null
  let ripples: ReturnType<typeof createRippleSystem> | null = null
  let lightning: ReturnType<typeof createLightningSystem> | null = null

  let currentWeather: WeatherType = 'clear'
  let elapsed = 0
  let rippleTimer = 0
  let lightningFlashScale = 0

  function ensureRain() {
    if (!rain) rain = createRainSystem(scene, { count: 2000, ...config?.rain })
    return rain
  }

  function ensureStormRain() {
    if (!stormRain) {
      stormRain = createRainSystem(scene, {
        count: 3500,
        color: new THREE.Color(0.45, 0.55, 0.75),
        intensity: 2,
        ...config?.rain,
      })
    }
    return stormRain
  }

  function ensureSnow() {
    if (!snow) snow = createSnowSystem(scene, { count: 1200, ...config?.snow })
    return snow
  }

  function ensureRipples() {
    if (!ripples) ripples = createRippleSystem(scene)
    return ripples
  }

  function ensureLightning() {
    if (!lightning) {
      lightning = createLightningSystem(scene, {
        camera: config?.camera,
        flashUniform: config?.lightningUniform,
        flashDirUniform: config?.lightningDirUniform,
        flashScale: lightningFlashScale,
      })
    }
    return lightning
  }

  function setWeather(type: WeatherType) {
    currentWeather = type
    if (type === 'rain') ensureRain().setVisible(true)
    else rain?.setVisible(false)
    if (type === 'storm') ensureStormRain().setVisible(true)
    else stormRain?.setVisible(false)
    if (type === 'snow') ensureSnow().setVisible(true)
    else snow?.setVisible(false)
    if (type === 'storm') ensureLightning()
    else lightning?.reset()
    if (type === 'rain' || type === 'storm') ensureRipples()
    rippleTimer = 0
  }

  function update(dt: number) {
    elapsed += dt
    rain?.update(dt, elapsed)
    stormRain?.update(dt, elapsed)
    snow?.update(dt, elapsed)

    if (currentWeather === 'storm') {
      ensureLightning().update(dt)
    }

    const isRainActive = currentWeather === 'rain' || currentWeather === 'storm'
    if (isRainActive && dt > 0) {
      const surface = ensureRipples()
      rippleTimer += dt
      const interval = currentWeather === 'storm' ? 0.04 : 0.08
      const radius = currentWeather === 'storm' ? 45 : 35
      while (rippleTimer >= interval) {
        rippleTimer -= interval
        const angle = Math.random() * Math.PI * 2
        const dist = 2 + Math.random() * radius
        surface.spawn(Math.cos(angle) * dist, Math.sin(angle) * dist)
      }
    }

    ripples?.update(dt)
  }

  function dispose() {
    rain?.dispose()
    stormRain?.dispose()
    snow?.dispose()
    ripples?.dispose()
    lightning?.dispose()
  }

  /** 手动触发一道闪电（供快捷键 L 调用；仅在风暴模式下有意义） */
  function triggerLightning() {
    if (currentWeather !== 'storm') return
    ensureLightning().trigger()
  }

  /** 天空/海面闪光，0 只显示闪电 */
  function setLightningFlash(value: number) {
    lightningFlashScale = Math.max(0, value)
    lightning?.setFlashScale(lightningFlashScale)
  }

  return {
    get currentWeather() { return currentWeather },
    setWeather,
    update,
    dispose,
    triggerLightning,
    setLightningFlash,
  }
}
