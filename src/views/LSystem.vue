<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LSystem, L_SYSTEM_PRESETS } from '../utils/lsystem.js'

const canvasRef = ref(null)
let scene, camera, renderer, controls, group, animationId
let currentPreset = ref('plant')
const presets = L_SYSTEM_PRESETS

onMounted(() => {
  init()
  buildLSystem('plant')
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
  camera.position.set(3, 2, 5)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 1.0

  const ambientLight = new THREE.AmbientLight(0x404060, 0.6)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(5, 10, 7)
  scene.add(dirLight)

  const dirLight2 = new THREE.DirectionalLight(0xff8844, 0.4)
  dirLight2.position.set(-3, 2, -4)
  scene.add(dirLight2)

  group = new THREE.Group()
  scene.add(group)

  window.addEventListener('resize', onResize)
}

function buildLSystem(key) {
  // Clear group
  while (group.children.length > 0) {
    const child = group.children[0]
    group.remove(child)
    if (child.geometry) child.geometry.dispose()
    if (child.material) child.material.dispose()
  }

  const preset = presets[key]
  if (!preset) return

  const ls = new LSystem(preset.axiom, preset.rules, preset.angle, preset.length, preset.iterations)

  // Try tube geometry first, fall back to line
  let geometry
  try {
    geometry = ls.toGeometry()
    // Check if geometry has valid attributes
    if (!geometry.attributes.position || geometry.attributes.position.count < 3) {
      geometry = ls.toLineGeometry()
      const material = new THREE.LineBasicMaterial({
        color: preset.color,
        linewidth: 1,
      })
      const line = new THREE.Line(geometry, material)
      group.add(line)
      return
    }
  } catch (e) {
    geometry = ls.toLineGeometry()
    const material = new THREE.LineBasicMaterial({
      color: preset.color,
      linewidth: 1,
    })
    const line = new THREE.Line(geometry, material)
    group.add(line)
    return
  }

  // Clone geometry for wireframe
  const wireGeometry = geometry.clone()

  const material = new THREE.MeshPhysicalMaterial({
    color: preset.color,
    roughness: 0.4,
    metalness: 0.1,
    emissive: preset.color,
    emissiveIntensity: 0.05,
  })

  const mesh = new THREE.Mesh(geometry, material)
  group.add(mesh)

  // Thin wireframe overlay
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.1,
  })
  const wireMesh = new THREE.Mesh(wireGeometry, wireMat)
  group.add(wireMesh)
}

function switchPreset(key) {
  currentPreset.value = key
  buildLSystem(key)
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
  controls.update()
  renderer.render(scene, camera)
}
</script>

<template>
  <div class="page">
    <div class="info-panel">
      <h2>🌿 路径 4：L-System / 分形植物</h2>
      <p><strong>核心原理：</strong>用字符串重写规则生成递归结构，模拟植物、龙曲线等自然形态。</p>
      <div class="features">
        <span>✓ 公理 (Axiom) + 产生式规则</span>
        <span>✓ 递归迭代生成复杂结构</span>
        <span>✓ 状态栈 [ ] 实现分支</span>
        <span>✓ TubeGeometry 管状渲染</span>
      </div>
      <div class="controls-row">
        <button
          v-for="(p, key) in presets"
          :key="key"
          class="btn"
          :class="{ active: currentPreset === key }"
          @click="switchPreset(key)"
        >
          {{ p.name }}
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
  max-width: 440px;
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
