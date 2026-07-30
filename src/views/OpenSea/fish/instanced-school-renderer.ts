import * as THREE from 'three/webgpu'
import { fishConfig } from './config.js'
import {
  addFishCurveAttributes,
  enableFishCurveDeformation,
  markFishCurveAttributesNeedsUpdate,
  readFishCurveAttributes,
  updateFishCurveAttributes,
} from './curve-deformation.js'
import {
  createFishModelInstance,
  createFishModelInstanceByKey,
  disposeFishMaterial,
} from './model-loader.js'
import { readFishDirection, writeFishOrientationQuaternion } from './pose.js'
import type { FishState } from './types.js'

const unitScale = new THREE.Vector3(1, 1, 1)
const tmpDirection = new THREE.Vector3()
const tmpQuaternion = new THREE.Quaternion()
const tmpMatrix = new THREE.Matrix4()
const tmpScale = new THREE.Vector3()

export function createFishMesh(capacity: number, variantIndex = 0): THREE.InstancedMesh {
  const { geometry, material, useAppearanceVariants, renderScale } = createFishModelInstance(variantIndex)
  return createFishMeshFromModel(capacity, geometry, material, useAppearanceVariants, renderScale)
}

export function createFishMeshByKey(capacity: number, modelKey: string): THREE.InstancedMesh | null {
  const instance = createFishModelInstanceByKey(modelKey)
  if (!instance) return null
  const { geometry, material, useAppearanceVariants, renderScale } = instance
  return createFishMeshFromModel(capacity, geometry, material, useAppearanceVariants, renderScale)
}

export function setFishMeshCount(mesh: THREE.InstancedMesh | null, count: number): void {
  if (!mesh) return
  mesh.count = Math.max(0, Math.min(count, (mesh as any).userData.capacity ?? count))
}

function createFishMeshFromModel(
  capacity: number, geometry: THREE.BufferGeometry, material: THREE.Material,
  useAppearanceVariants: boolean, renderScale = 1,
): THREE.InstancedMesh {
  addFishCurveAttributes(geometry, capacity)
  enableFishCurveDeformation(material)

  const mesh = new THREE.InstancedMesh(geometry, material, capacity)
  ;(mesh as any).userData.capacity = capacity
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), fishConfig.renderBoundsRadius)
  mesh.castShadow = true
  mesh.renderOrder = 2
  ;(mesh as any).userData.renderScale = renderScale

  for (let i = 0; i < capacity; i += 1) {
    // When the material uses vertexColors (e.g. koi), instance color
    // must be white so the baked vertex colors show through.
    const useVertexColors = (material as THREE.MeshStandardMaterial).vertexColors
    if (useVertexColors) {
      mesh.setColorAt(i, new THREE.Color(0xffffff))
    } else {
      const variant = useAppearanceVariants
        ? fishConfig.appearanceVariants[i % fishConfig.appearanceVariants.length]
        : fishConfig.bodyColor
      mesh.setColorAt(
        i,
        i === fishConfig.highlightedIndex ? fishConfig.highlightedColor : variant,
      )
    }
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

  return mesh
}

export function disposeFishMesh(mesh: THREE.InstancedMesh | null): void {
  if (!mesh) return
  mesh.geometry.dispose()
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => disposeFishMaterial(m))
  } else {
    disposeFishMaterial(mesh.material)
  }
}

export function updateFishInstances(
  mesh: THREE.InstancedMesh | null,
  fish: FishState[],
): void {
  if (!mesh) return
  const curveAttributes = readFishCurveAttributes(mesh.geometry)
  const fishScale = fishConfig.renderScale * ((mesh as any).userData.renderScale ?? 1)
  const count = Math.min(fish.length, mesh.count)

  for (let i = 0; i < count; i += 1) {
    const currentFish: FishState | undefined = fish[i]
    if (!currentFish) continue
    const direction = readFishDirection(currentFish, tmpDirection)
    writeFishOrientationQuaternion(currentFish, direction, tmpQuaternion)
    updateFishCurveAttributes(curveAttributes, i, currentFish, tmpQuaternion)
    tmpMatrix.compose(currentFish.position, tmpQuaternion, tmpScale.copy(unitScale).multiplyScalar(fishScale))
    mesh.setMatrixAt(i, tmpMatrix)
  }

  mesh.instanceMatrix.needsUpdate = true
  markFishCurveAttributesNeedsUpdate(curveAttributes)
}
