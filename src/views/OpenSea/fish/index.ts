import * as THREE from 'three/webgpu'
import { FishSchoolSimulation } from './simulation.js'
import {
  createFishMeshByKey,
  setFishMeshCount,
  disposeFishMesh,
  updateFishInstances,
} from './instanced-school-renderer.js'
import { loadFishModel, isReady, createFishModelInstanceByKey } from './model-loader.js'
import { createCameraRig } from './camera-rig.js'
import { createDefaultSettings, fishConfig, obstacles, virtualAquarium, setAquariumSize } from './config.js'
import type { FishState, SimulationSettings } from './types.js'

export interface FishSystemOptions {
  scene: THREE.Scene
  controls: any
  sardineCount?: number
  koiCount?: number
  aquariumSize?: number
  showBoundary?: boolean
}

export interface FishControls {
  sardineCount: { value: number; min: number; max: number }
  koiCount: { value: number; min: number; max: number }
  perception: { value: number; min: number; max: number; step: number }
  sardineSpeed: { value: number; min: number; max: number; step: number }
  separation: { value: number; min: number; max: number; step: number }
  avoidance: { value: number; min: number; max: number; step: number }
  turnRate: { value: number; min: number; max: number; step: number }
  topMargin: { value: number; min: number; max: number; step: number }
  koiPerception: { value: number; min: number; max: number; step: number }
  koiSeparation: { value: number; min: number; max: number; step: number }
  koiAvoidance: { value: number; min: number; max: number; step: number }
  koiTurnRate: { value: number; min: number; max: number; step: number }
  koiTopMargin: { value: number; min: number; max: number; step: number }
  koiSpeed: { value: number; min: number; max: number; step: number }
}

export interface FishSystem {
  cameraRig: ReturnType<typeof createCameraRig>
  controls: FishControls
  ready: boolean
  getRandomFish(): FishState | null
  update(dt: number): void
  updateLights(sunDir: THREE.Vector3, sunColor: THREE.Color): void
  resizeAquarium(size: number): void
  toggleBoundary(show: boolean): void
  resize(width: number, height: number): void
  dispose(): void
}

export function createFishSystem(options: FishSystemOptions): FishSystem {
  const { scene, controls: orbitControls, aquariumSize: initSize, showBoundary: initShowBoundary } = options

  // ---- Simulation setup ----
  const sardineSettings = createDefaultSettings()
  const koiSettings = createDefaultSettings()
  const sardineSim = new FishSchoolSimulation({ aquarium: virtualAquarium, obstacles, settings: sardineSettings })
  const koiSim = new FishSchoolSimulation({ aquarium: virtualAquarium, obstacles, settings: koiSettings })

  // ---- Camera (uses existing OrbitControls from parent) ----
  const cameraRig = createCameraRig(orbitControls)

  /** Pick a random fish from sardines or koi */
  function getRandomFish(): FishState | null {
    const allFish: FishState[] = []
    for (const f of sardineSim.fish) {
      allFish.push({ ...f })
    }
    for (const f of koiSim.fish) {
      allFish.push({ ...f })
    }
    if (allFish.length === 0) return null
    return allFish[Math.floor(Math.random() * allFish.length)]
  }

  // ---- Rendering ----
  const sardineCapacity = 1000
  const koiCapacity = 1000
  let sardineMesh: THREE.InstancedMesh | null = null
  let koiMesh: THREE.InstancedMesh | null = null

  // ---- Lights for fish (OpenSea has no Three.js lights, only TSL procedural) ----
  const ambientLight = new THREE.AmbientLight(0x446688, 0.6)
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x1b3024, 0.8)
  const fishSunLight = new THREE.DirectionalLight(0xffeedd, 2.2)
  fishSunLight.position.set(0.8, 15, 0.6)
  fishSunLight.castShadow = false
  scene.add(ambientLight)
  scene.add(hemiLight)
  scene.add(fishSunLight)

  // ---- Controls state ----
  const baseMinSpeed = sardineSettings.minSpeed
  const baseMaxSpeed = sardineSettings.maxSpeed

  const controls: FishControls = {
    sardineCount: { value: 0, min: 0, max: 1000 },
    koiCount: { value: 0, min: 0, max: 1000 },
    perception: { value: 2.7, min: 1.2, max: 5.2, step: 0.1 },
    sardineSpeed: { value: 1.0, min: 0.2, max: 2.0, step: 0.05 },
    separation: { value: 1.35, min: 0.4, max: 3.0, step: 0.1 },
    avoidance: { value: 10, min: 0, max: 20, step: 0.5 },
    turnRate: { value: 4, min: 0.5, max: 8, step: 0.1 },
    topMargin: { value: 0.42, min: 0, max: 2, step: 0.05 },
    koiPerception: { value: 2.7, min: 1.2, max: 5.2, step: 0.1 },
    koiSeparation: { value: 1.35, min: 0.4, max: 3.0, step: 0.1 },
    koiAvoidance: { value: 10, min: 0, max: 20, step: 0.5 },
    koiTurnRate: { value: 4, min: 0.5, max: 8, step: 0.1 },
    koiTopMargin: { value: 0.42, min: 0, max: 2, step: 0.05 },
    koiSpeed: { value: 1.0, min: 0.2, max: 2.0, step: 0.05 },
  }

  function buildMeshes() {
    const sm = createFishMeshByKey(sardineCapacity, 'cartoon')
    if (sm) {
      sardineMesh = sm
      setFishMeshCount(sardineMesh, sardineSim.fish.length)
      scene.add(sardineMesh)
      updateFishInstances(sardineMesh, sardineSim.fish)
    }
    const km = createFishMeshByKey(koiCapacity, 'koi')
    if (km) {
      koiMesh = km
      setFishMeshCount(koiMesh, koiSim.fish.length)
      scene.add(koiMesh)
      if (koiSim.fish.length > 0) updateFishInstances(koiMesh, koiSim.fish)
    }
  }

  function applySimulationSettingsFromControls() {
    sardineSettings.perceptionRadius = controls.perception.value
    sardineSettings.separateWeight = controls.separation.value
    sardineSettings.avoidCollisionWeight = controls.avoidance.value
    sardineSettings.maxTurnRate = controls.turnRate.value
    sardineSettings.topBoundaryMargin = controls.topMargin.value
    const speedScale = controls.sardineSpeed.value
    sardineSettings.minSpeed = baseMinSpeed * speedScale
    sardineSettings.maxSpeed = baseMaxSpeed * speedScale

    koiSettings.perceptionRadius = controls.koiPerception.value
    koiSettings.separateWeight = controls.koiSeparation.value
    koiSettings.avoidCollisionWeight = controls.koiAvoidance.value
    koiSettings.maxTurnRate = controls.koiTurnRate.value
    koiSettings.topBoundaryMargin = controls.koiTopMargin.value
    const koiSpeedScale = controls.koiSpeed.value
    koiSettings.minSpeed = baseMinSpeed * koiSpeedScale
    koiSettings.maxSpeed = baseMaxSpeed * koiSpeedScale
  }

  function onControlChange() {
    applySimulationSettingsFromControls()
  }

  function onSardineCountChange(value: number) {
    controls.sardineCount.value = value
    sardineSim.setCount(value)
    setFishMeshCount(sardineMesh, sardineSim.fish.length)
    updateFishInstances(sardineMesh, sardineSim.fish)
  }

  function onKoiCountChange(value: number) {
    controls.koiCount.value = value
    koiSim.setCount(value)
    setFishMeshCount(koiMesh, koiSim.fish.length)
    if (koiMesh) updateFishInstances(koiMesh, koiSim.fish)
  }

  // ------- Visual boundary wireframe -------
  const boundaryGroup = new THREE.Group()
  boundaryGroup.renderOrder = -1
  scene.add(boundaryGroup)
  let boundaryVisible = true

  function rebuildBoundary() {
    // Clear old boundary
    while (boundaryGroup.children.length) {
      const child = boundaryGroup.children[0]
      child.geometry?.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
        else child.material.dispose()
      }
      boundaryGroup.remove(child)
    }

    const hs = virtualAquarium.halfSize
    const c = virtualAquarium.center
    const geo = new THREE.BoxGeometry(hs.x * 2, hs.y * 2, hs.z * 2)
    const edges = new THREE.EdgesGeometry(geo)
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x8fe9e4,
      transparent: true,
      opacity: 0.15,
    })
    const wireframe = new THREE.LineSegments(edges, lineMat)
    wireframe.position.copy(c)
    boundaryGroup.add(wireframe)

    const pillarMat = new THREE.LineBasicMaterial({
      color: 0x8fe9e4,
      transparent: true,
      opacity: 0.08,
    })
    const corners = [
      [-1, -1, -1], [-1, -1, 1], [1, -1, -1], [1, -1, 1],
      [-1, 1, -1], [-1, 1, 1], [1, 1, -1], [1, 1, 1],
    ]
    const topY = c.y + hs.y
    const bottomY = c.y - hs.y - 0.5
    for (const [sx, sy, sz] of corners) {
      const pillarGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(sx * hs.x, bottomY, sz * hs.z),
        new THREE.Vector3(sx * hs.x, topY, sz * hs.z),
      ])
      const pillar = new THREE.Line(pillarGeo, pillarMat)
      boundaryGroup.add(pillar)
    }
  }

  // ---- Initialization ----
  let ready = false

  async function init() {
    try {
      await loadFishModel()
    } catch (e) {
      console.warn('Fish model loading error.', e)
    }
    if (!isReady()) {
      console.error('Fish models failed to load — fish will not appear.')
      return
    }
    sardineSim.reset(controls.sardineCount.value)
    koiSim.reset(controls.koiCount.value, 142)
    // Apply initial aquarium size and boundary visibility
    if (initSize && initSize !== 100) {
      setAquariumSize(initSize)
    }
    buildMeshes()
    rebuildBoundary()
    if (initShowBoundary === false) {
      boundaryGroup.visible = false
    }
    ready = true
  }
  init()

  // ---- Aquarium controls ----
  function resizeAquarium(size: number) {
    setAquariumSize(size)
    // Re-seed fish positions to fit new bounds
    sardineSim.reset(sardineSim.fish.length)
    koiSim.reset(koiSim.fish.length, 142)
    updateFishInstances(sardineMesh, sardineSim.fish)
    if (koiMesh) updateFishInstances(koiMesh, koiSim.fish)
    rebuildBoundary()
  }

  function toggleBoundary(show: boolean) {
    boundaryVisible = show
    boundaryGroup.visible = show
  }

  // ---- Update ----
  function update(dt: number) {
    if (!ready) return
    const simDt = Math.min(dt, 1 / 30)
    if (simDt <= 0) return

    sardineSim.update(simDt)
    koiSim.update(simDt)

    updateFishInstances(sardineMesh, sardineSim.fish)
    if (koiMesh) updateFishInstances(koiMesh, koiSim.fish)

    cameraRig.update(simDt)
  }

  function resize(width: number, height: number) {
    cameraRig.resize(width, height)
  }

  function updateLights(sunDir: THREE.Vector3, sunColor: THREE.Color) {
    fishSunLight.position.copy(sunDir).multiplyScalar(80)
    fishSunLight.color.copy(sunColor)
    const intensity = Math.max(sunColor.r, sunColor.g, sunColor.b)
    fishSunLight.intensity = intensity * 0.8
    ambientLight.intensity = 0.15 + intensity * 0.2
    hemiLight.intensity = 0.3 + intensity * 0.4
  }

  function dispose() {
    disposeFishMesh(sardineMesh)
    disposeFishMesh(koiMesh)
    scene.remove(ambientLight)
    scene.remove(hemiLight)
    scene.remove(fishSunLight)
  }

  // ---- Start ----
  init()

  return {
    get ready() { return ready },
    cameraRig,
    controls,
    getRandomFish,
    update,
    updateLights,
    resizeAquarium,
    toggleBoundary,
    resize,
    dispose,
    onControlChange,
    onSardineCountChange,
    onKoiCountChange,
  }
}
