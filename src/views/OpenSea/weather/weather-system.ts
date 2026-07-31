import * as THREE from 'three/webgpu'
import { createRainSystem, type RainConfig } from './rain.js'
import { createSnowSystem, type SnowConfig } from './snow.js'
import { createRippleSystem } from './ripples.js'
import { createLightningSystem } from './lightning.js'

export type WeatherType = 'clear' | 'rain' | 'snow' | 'storm'

export interface WeatherConfig {
  rain?: RainConfig
  snow?: SnowConfig
  /** TSL uniform（uLightning），闪电时短暂点亮天空/海洋 */
  lightningUniform?: { value: number }
}

export function createWeatherSystem(scene: THREE.Scene, config?: WeatherConfig) {
  const rain = createRainSystem(scene, { count: 2000, ...config?.rain })
  const stormRain = createRainSystem(scene, { count: 3500, color: new THREE.Color(0.45, 0.55, 0.75), intensity: 2, ...config?.rain })
  const snow = createSnowSystem(scene, { count: 1200, ...config?.snow })
  const ripples = createRippleSystem(scene)
  const lightning = createLightningSystem(scene, config?.lightningUniform)

  let currentWeather: WeatherType = 'clear'
  let elapsed = 0
  let rippleTimer = 0

  function setWeather(type: WeatherType) {
    currentWeather = type
    rain.setVisible(type === 'rain')
    stormRain.setVisible(type === 'storm')
    snow.setVisible(type === 'snow')
    if (type !== 'storm') lightning.reset()
    rippleTimer = 0
  }

  function update(dt: number) {
    elapsed += dt
    rain.update(dt, elapsed)
    stormRain.update(dt, elapsed)
    snow.update(dt, elapsed)

    // 风暴：闪电
    if (currentWeather === 'storm') {
      lightning.update(dt)
    }

    // Spawn ripples from rain hitting the ocean surface (timer-based)
    const isRainActive = currentWeather === 'rain' || currentWeather === 'storm'
    if (isRainActive && dt > 0) {
      rippleTimer += dt
      const interval = currentWeather === 'storm' ? 0.04 : 0.08
      const radius = currentWeather === 'storm' ? 45 : 35
      while (rippleTimer >= interval) {
        rippleTimer -= interval
        const angle = Math.random() * Math.PI * 2
        const dist = 2 + Math.random() * radius
        ripples.spawn(Math.cos(angle) * dist, Math.sin(angle) * dist)
      }
    }

    ripples.update(dt)
  }

  function dispose() {
    rain.dispose()
    stormRain.dispose()
    snow.dispose()
    ripples.dispose()
    lightning.dispose()
  }

  setWeather('clear')

  return {
    get currentWeather() { return currentWeather },
    setWeather,
    update,
    dispose,
  }
}
