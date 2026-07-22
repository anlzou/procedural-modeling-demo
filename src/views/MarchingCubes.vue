<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MarchingCubes } from '../utils/marchingCubes.js'
import InfoPanel from '../components/InfoPanel.vue'
import ControlPanel from '../components/ControlPanel.vue'

const canvasRef = ref(null)
let scene, camera, renderer, controls, mesh, animationId, frameCount = 0, lastFpsTime = 0
const fps = ref(0)
const memory = ref(0)

onMounted(() => {
  init()
  animate()
})

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId)
  controls?.dispose()
  renderer?.dispose()
})

function init() {
  const container = canvasRef.value
  const width = container.clientWidth
  const height = container.clientHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a1a)

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(3, 2, 4)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 1.5

  // Lights
  const ambientLight = new THREE.AmbientLight(0x404060, 0.5)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
  dirLight.position.set(5, 10, 7)
  scene.add(dirLight)

  const dirLight2 = new THREE.DirectionalLight(0x4488ff, 0.5)
  dirLight2.position.set(-5, -2, -3)
  scene.add(dirLight2)

  // Generate metaballs
  const mc = new MarchingCubes(48, [
    { x: 0.0, y: 0.0, z: 0.0, r: 0.5 },
    { x: 0.5, y: 0.3, z: 0.0, r: 0.4 },
    { x: -0.4, y: -0.2, z: 0.3, r: 0.35 },
    { x: 0.2, y: -0.4, z: -0.3, r: 0.3 },
  ])
  const geometry = mc.generate()

  const material = new THREE.MeshPhysicalMaterial({
    color: 0x4fc3f7,
    roughness: 0.2,
    metalness: 0.6,
    clearcoat: 0.3,
    emissive: 0x1144aa,
    emissiveIntensity: 0.1,
  })

  mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  // Grid helper
  const gridHelper = new THREE.GridHelper(4, 10, 0x444466, 0x333355)
  gridHelper.position.y = -1.2
  scene.add(gridHelper)

  window.addEventListener('resize', onResize)
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

  frameCount++
  if (lastFpsTime === 0) lastFpsTime = performance.now()
  const now = performance.now()
  if (now - lastFpsTime >= 1000) {
    fps.value = frameCount; frameCount = 0; lastFpsTime = now
    if (window.performance?.memory) memory.value = window.performance.memory.usedJSHeapSize
  }

  controls.update()
  renderer.render(scene, camera)
}
</script>

<template>
  <div class="page">
    <InfoPanel>
      <h2>🧊 路径 2：Marching Cubes（等值面提取）</h2>
      <p><strong>核心原理：</strong>将空间划分为体素网格，采样标量场值，用 Marching Cubes 算法提取等值面生成真实 Mesh。</p>
      <div class="features">
        <span>✓ N×N×N 体素网格细分</span>
        <span>✓ 256 种配置查表生成三角形</span>
        <span>✓ Metaball 公式：∑(r²/d²) - 1</span>
        <span>✓ 实时 OrbitControls 交互</span>
        <span>✓ 可拖拽旋转查看细节</span>
      </div>
      <p class="hint">🖱 鼠标拖拽旋转 · 滚轮缩放</p>
    </InfoPanel>

    <ControlPanel :fps="fps" :memory="memory" :objectCount="1" />

    <div ref="canvasRef" class="canvas-container"></div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #0a0a1a; }
.canvas-container { width: 100%; height: 100%; }
</style>
