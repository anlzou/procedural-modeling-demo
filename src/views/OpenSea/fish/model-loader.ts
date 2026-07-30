import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { fishConfig } from './config.js'
import type { FishModelInstance } from './types.js'

interface FishModelSource {
  key: string
  url: URL
  axes: THREE.Matrix4
}

interface FishModel {
  key: string
  geometry: THREE.BufferGeometry
  material: THREE.Material
  renderScale?: number
}

const fishModelSources: FishModelSource[] = [
  {
    key: '',
    url: new URL('./models/cartoon.glb', import.meta.url),
    axes: new THREE.Matrix4().set(0, -1, 0, 0, -1, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1),
  },
]

const tmpCenter = new THREE.Vector3()
const tmpSize = new THREE.Vector3()

let fishModels: FishModel[] = []
let loadDone = false
let loadError: string | null = null
let loadProgress = 0
let loadPromise: Promise<void> | null = null

/** Returns true once GLB models have finished loading */
export function isReady(): boolean {
  return loadDone && loadError === null
}

/** Returns the last load error message, or null if loading succeeded */
export function getLoadError(): string | null {
  return loadError
}

/** Returns download progress 0–1, or 0 if not yet started */
export function getLoadProgress(): number {
  return loadProgress
}

/** Returns the list of model keys being loaded */
export function getModelKeys(): string[] {
  return fishModelSources.map((s) => s.key)
}

export async function loadFishModel(): Promise<void> {
  if (loadPromise) return loadPromise
  loadPromise = _load()
  return loadPromise
}

async function _load(): Promise<void> {
  const MAX_RETRIES = 5
  const RETRY_DELAY = 6 * 1000 // 6 seconds

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    loadError = null
    loadProgress = 0
    const results = await Promise.allSettled(
      fishModelSources.map((s) => loadWithProgress(s.url.href)),
    )
    const loaded: FishModel[] = []
    for (let i = 0; i < results.length; i += 1) {
      const src = fishModelSources[i]
      const r = results[i]
      if (r.status === 'fulfilled') {
        loaded.push(createFishModelFromGltf(r.value, src))
      } else {
        console.warn(`Failed to load ${src.key} fish model (attempt ${attempt}/${MAX_RETRIES}).`, r.reason)
      }
    }
    if (loaded.length) {
      fishModels = loaded
      const cartoon = loaded.find((m) => m.key === 'cartoon') ?? loaded[0]
      fishModels.push(createKoiModelFromBase(cartoon))
      loadDone = true
      return
    }
    if (attempt < MAX_RETRIES) {
      console.warn(`Fish model load attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${RETRY_DELAY / 1000}s...`)
      await new Promise((r) => setTimeout(r, RETRY_DELAY))
    }
  }
  loadError = '鱼模型文件下载失败，请检查网络连接后刷新页面重试'
  loadDone = true
  console.error('All fish models failed to load after 5 retries.')
}

/** Load a single GLB with XHR progress tracking */
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

function loadWithProgress(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)
    loader.load(
      url,
      (gltf: any) => resolve(gltf),
      (xhr: ProgressEvent) => {
        if (xhr.total > 0) {
          loadProgress = xhr.loaded / xhr.total
        }
      },
      (err: any) => reject(err),
    )
  })
}

function findPrimaryMesh(root: THREE.Object3D): THREE.Mesh | null {
  let result: THREE.Mesh | null = null
  root.traverse((obj: THREE.Object3D) => { if (obj instanceof THREE.Mesh && obj.geometry && !result) result = obj })
  return result
}

function createFishModelFromGltf(gltf: any, src: FishModelSource): FishModel {
  const scene = gltf.scene ?? gltf
  scene.updateWorldMatrix(true, true)
  const mesh = findPrimaryMesh(scene)
  if (!mesh) throw new Error(`Fish model ${src.key} has no mesh.`)
  return { key: src.key, geometry: createFishGeometry(mesh, src), material: cloneFishMaterial(mesh.material) }
}

/* ================================================================
   Koi — generated texture variant derived from cartoon geometry
   ================================================================ */

let koiTexture: THREE.CanvasTexture | null = null

function getKoiTexture(): THREE.CanvasTexture {
  if (koiTexture) return koiTexture
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  // White base
  ctx.fillStyle = '#fff0dc'
  ctx.fillRect(0, 0, 256, 256)

  // Three irregular red patches (Taisho Sanshoku 大正三色)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0)'

  // Patch A — shoulder
  ctx.beginPath()
  ctx.ellipse(120, 80, 55, 40, 0.2, 0, Math.PI * 2)
  ctx.fillStyle = '#d61f16'
  ctx.fill()

  // Patch B — mid-body
  ctx.beginPath()
  ctx.ellipse(90, 140, 45, 35, -0.15, 0, Math.PI * 2)
  ctx.fillStyle = '#d61f16'
  ctx.fill()

  // Patch C — tail
  ctx.beginPath()
  ctx.ellipse(140, 190, 35, 28, 0.3, 0, Math.PI * 2)
  ctx.fillStyle = '#cc1a12'
  ctx.fill()

  // Dark accent edges on patches
  ctx.globalCompositeOperation = 'source-atop'
  ctx.shadowBlur = 12

  ctx.restore()

  // Subtle dorsal warm gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, 'rgba(244, 178, 74, 0.18)')
  grad.addColorStop(0.5, 'rgba(244, 178, 74, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)

  koiTexture = new THREE.CanvasTexture(canvas)
  koiTexture.wrapS = THREE.RepeatWrapping
  koiTexture.wrapT = THREE.RepeatWrapping
  koiTexture.repeat.set(1, 0.6)
  koiTexture.offset.set(0, 0.2)
  return koiTexture
}

function createKoiModelFromBase(base: FishModel): FishModel {
  const geo = base.geometry.clone()
  const mat = cloneFishMaterial(base.material) as THREE.MeshStandardMaterial
  mat.color.setHex(0xfff0dc)
  mat.map = getKoiTexture()
  mat.needsUpdate = true
  return { key: 'koi', geometry: geo, material: mat, renderScale: 1.15 }
}

/* ================================================================
   Geometry / material helpers
   ================================================================ */

function createFishGeometry(mesh: THREE.Mesh, src: FishModelSource): THREE.BufferGeometry {
  const geo = mesh.geometry.clone()
  geo.applyMatrix4(src.axes)
  geo.computeBoundingBox()
  const box = geo.boundingBox!
  box.getCenter(tmpCenter); box.getSize(tmpSize)
  const maxDim = Math.max(tmpSize.x, tmpSize.y, tmpSize.z)
  if (maxDim > 0.0001) { geo.translate(-tmpCenter.x, -tmpCenter.y, -tmpCenter.z); geo.scale(1 / maxDim, 1 / maxDim, 1 / maxDim) }
  geo.scale(fishConfig.length * 0.5, fishConfig.length * 0.5, fishConfig.length * 0.5)
  geo.computeVertexNormals()
  return geo
}

function cloneFishMaterial(material: THREE.Material | THREE.Material[]): THREE.Material {
  const src = Array.isArray(material) ? material[0] : material
  const m = src.clone()
  if ('roughness' in m) m.roughness = 1
  if ('roughnessMap' in m) m.roughnessMap = undefined
  if ('metalness' in m) m.metalness = 0
  if ('metalnessMap' in m) m.metalnessMap = undefined
  m.side = THREE.FrontSide; m.needsUpdate = true
  return m
}

/* ================================================================
   Public API
   ================================================================ */

export function createFishModelInstance(variantIndex = 0): FishModelInstance {
  const m = fishModels[variantIndex % fishModels.length] ?? fishModels[0]
  if (!m) throw new Error('Fish models not loaded yet.')
  return { geometry: m.geometry.clone(), material: m.material.clone(), renderScale: m.renderScale ?? 1, useAppearanceVariants: false }
}

export function createFishModelInstanceByKey(key: string): FishModelInstance | null {
  const m = fishModels.find((x) => x.key === key) ?? fishModels[0]
  if (!m) return null
  return { geometry: m.geometry.clone(), material: m.material.clone(), renderScale: m.renderScale ?? 1, useAppearanceVariants: false }
}

export function disposeFishMaterial(material: THREE.Material | null | undefined): void {
  material?.dispose()
}
