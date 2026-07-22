<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const canvasRef = ref(null)
let scene, camera, renderer, controls, meshes = [], animationId
let currentMode = ref('mobius')

// Parametric surface functions
function mobiusStrip(u, v, target) {
  u = u * 2 * Math.PI
  v = (v - 0.5) * 0.3
  const x = (1 + v * Math.cos(u / 2)) * Math.cos(u)
  const y = (1 + v * Math.cos(u / 2)) * Math.sin(u)
  const z = v * Math.sin(u / 2)
  target.set(x, y, z)
}

function kleinBottle(u, v, target) {
  u *= Math.PI
  v *= 2 * Math.PI
  const a = 2
  const x = (a + Math.cos(v / 2) * Math.sin(u) - Math.sin(v / 2) * Math.sin(2 * u)) * Math.cos(v)
  const y = (a + Math.cos(v / 2) * Math.sin(u) - Math.sin(v / 2) * Math.sin(2 * u)) * Math.sin(v)
  const z = Math.sin(v / 2) * Math.sin(u) + Math.cos(v / 2) * Math.sin(2 * u)
  target.set(x, y, z)
}

function superformula3D(u, v, target) {
  const m1 = 6, n11 = 1, n12 = 0.8, n13 = 0.8
  const m2 = 6, n21 = 1, n22 = 0.8, n23 = 1.2

  const phi = u * Math.PI
  const theta = v * 2 * Math.PI

  const r1 = Math.pow(
    Math.pow(Math.abs(Math.cos(m1 * phi / 4)), n12) +
    Math.pow(Math.abs(Math.sin(m1 * phi / 4)), n13),
    -1 / n11
  )

  const r2 = Math.pow(
    Math.pow(Math.abs(Math.cos(m2 * theta / 4)), n22) +
    Math.pow(Math.abs(Math.sin(m2 * theta / 4)), n23),
    -1 / n21
  )

  target.x = r1 * Math.sin(phi) * r2 * Math.cos(theta)
  target.y = r1 * Math.cos(phi) * r2
  target.z = r1 * Math.sin(phi) * r2 * Math.sin(theta)
}

function waveSurface(u, v, target) {
  const x = (u - 0.5) * 10
  const z = (v - 0.5) * 10
  const y = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 2
  target.set(x, y, z)
}

function helicoid(u, v, target) {
  u = u * 4 * Math.PI
  v = (v - 0.5) * 1.5
  target.set(
    v * Math.cos(u),
    u * 0.3,
    v * Math.sin(u)
  )
}

const surfaces = {
  mobius: { func: mobiusStrip, name: '莫比乌斯环', color: 0x7c3aed, slices: 64, stacks: 16 },
  klein: { func: kleinBottle, name: '克莱因瓶', color: 0xff6b6b, slices: 80, stacks: 40 },
  superformula: { func: superformula3D, name: '超级公式', color: 0xf59e0b, slices: 60, stacks: 60 },
  wave: { func: waveSurface, name: '波浪曲面', color: 0x06b6d4, slices: 64, stacks: 64 },
  helicoid: { func: helicoid, name: '螺旋面', color: 0x10b981, slices: 64, stacks: 16 },
}

onMounted(() => {
  init()
  buildScene('mobius')
  animate()
})

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId)
  controls?.dispose()
  renderer?.dispose()
})

let clock

function init() {
  const container = canvasRef.value
  const width = container.clientWidth
  const height = container.clientHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a1a)

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(4, 3, 5)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 1.5

  const ambientLight = new THREE.AmbientLight(0x404060, 0.5)
  scene.add(ambientLight)
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
  dirLight.position.set(5, 10, 7)
  scene.add(dirLight)
  const dirLight2 = new THREE.DirectionalLight(0x4488ff, 0.5)
  dirLight2.position.set(-5, -2, -3)
  scene.add(dirLight2)

  clock = new THREE.Clock()

  window.addEventListener('resize', onResize)
}

function buildScene(key) {
  // Remove old meshes
  meshes.forEach(m => scene.remove(m))
  meshes = []

  const surface = surfaces[key]
  if (!surface) return

  // Three.js r150+ uses built-in ParametricGeometry
  // For older versions, we'll create it manually
  const geometry = createParametricGeometry(surface.func, surface.slices, surface.stacks)

  const material = new THREE.MeshPhysicalMaterial({
    color: surface.color,
    roughness: 0.3,
    metalness: 0.5,
    side: THREE.DoubleSide,
    emissive: surface.color,
    emissiveIntensity: 0.08,
    wireframe: false,
  })

  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)
  meshes.push(mesh)

  // Wireframe overlay
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.08,
  })
  const wireMesh = new THREE.Mesh(geometry.clone(), wireMat)
  scene.add(wireMesh)
  meshes.push(wireMesh)
}

function createParametricGeometry(func, slices, stacks) {
  const positions = []
  const normals = []
  const uvs = []
  const indices = []
  const tempVec = new THREE.Vector3()

  for (let i = 0; i <= slices; i++) {
    const u = i / slices
    for (let j = 0; j <= stacks; j++) {
      const v = j / stacks
      func(u, v, tempVec)
      positions.push(tempVec.x, tempVec.y, tempVec.z)
      uvs.push(u, v)
    }
  }

  for (let i = 0; i < slices; i++) {
    for (let j = 0; j < stacks; j++) {
      const a = i * (stacks + 1) + j
      const b = i * (stacks + 1) + j + 1
      const c = (i + 1) * (stacks + 1) + j
      const d = (i + 1) * (stacks + 1) + j + 1
      indices.push(a, b, c)
      indices.push(b, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function switchSurface(key) {
  currentMode.value = key
  buildScene(key)
}

function onResize() {
  const container = canvasRef.value
  if (!container || !renderer) return
  const width = container.clientWidth
  const height = container.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function animate() {
  animationId = requestAnimationFrame(animate)

  // Animate wave surface vertices
  if (currentMode.value === 'wave' && meshes.length > 0) {
    const mesh = meshes[0]
    const positions = mesh.geometry.attributes.position
    const time = clock.getElapsedTime()
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)
      const y = Math.sin(x * 0.5 + time) * Math.cos(z * 0.5 + time) * 2
      positions.setY(i, y)
    }
    positions.needsUpdate = true
    mesh.geometry.computeVertexNormals()
  }

  controls.update()
  renderer.render(scene, camera)
}
</script>

<template>
  <div class="page">
    <div class="info-panel">
      <h2>🌀 路径 3：Parametric Geometry（参数化曲面）</h2>
      <p><strong>核心原理：</strong>用数学函数 f(u,v) → (x,y,z) 定义曲面，程序化生成 BufferGeometry。</p>
      <div class="features">
        <span>✓ 莫比乌斯环、克莱因瓶</span>
        <span>✓ 超级公式（Superformula）</span>
        <span>✓ 波浪曲面（动态动画）</span>
        <span>✓ 螺旋面</span>
      </div>
      <div class="controls-row">
        <button
          v-for="(s, key) in surfaces"
          :key="key"
          class="btn"
          :class="{ active: currentMode === key }"
          @click="switchSurface(key)"
        >
          {{ s.name }}
        </button>
      </div>
      <p class="hint">🖱 鼠标拖拽旋转 · 滚轮缩放</p>
    </div>
    <div ref="canvasRef" class="canvas-container"></div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0a0a1a;
}

.info-panel {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 10;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  max-width: 420px;
  color: #e0e0e0;
}

.info-panel h2 {
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
  color: #fff;
}

.info-panel p {
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 0 0 0.75rem;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  opacity: 0.8;
  margin-bottom: 0.75rem;
}

.controls-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.btn {
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #ccc;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover, .btn.active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.5);
}

.hint {
  font-size: 0.78rem !important;
  opacity: 0.6;
}

.canvas-container {
  width: 100%;
  height: 100%;
}
</style>
