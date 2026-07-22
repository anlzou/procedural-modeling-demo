<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import vertexShader from '../shaders/raymarching.vert?raw'
import fragmentShader from '../shaders/raymarching.frag?raw'

const canvasRef = ref(null)
let scene, camera, renderer, controls, shaderMat, shaderMesh
let objects = [], animationId

onMounted(() => {
  init()
  animate()
})

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId)
  controls?.dispose()
  renderer?.dispose()
  objects.forEach(o => {
    scene.remove(o.mesh)
    o.mesh.geometry?.dispose()
    o.mesh.material?.dispose()
  })
})

function init() {
  const container = canvasRef.value
  const width = container.clientWidth
  const height = container.clientHeight

  // --- Scene ---
  scene = new THREE.Scene()

  // --- Camera ---
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
  camera.position.set(0, 2, 6)

  // --- Renderer ---
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  container.appendChild(renderer.domElement)

  // --- Controls ---
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.8
  controls.minDistance = 2
  controls.maxDistance = 20
  controls.target.set(0, 0, 0)

  // --- Background: Raymarching Shader on a large sphere (skybox style) ---
  const bgGeometry = new THREE.SphereGeometry(50, 32, 32)
  shaderMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
    },
    side: THREE.BackSide,
  })
  shaderMesh = new THREE.Mesh(bgGeometry, shaderMat)
  scene.add(shaderMesh)

  // --- Lights ---
  const ambientLight = new THREE.AmbientLight(0x404060, 0.6)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 2)
  dirLight.position.set(5, 10, 7)
  scene.add(dirLight)

  const dirLight2 = new THREE.DirectionalLight(0x4488ff, 1)
  dirLight2.position.set(-5, 3, -5)
  scene.add(dirLight2)

  const pointLight = new THREE.PointLight(0xff6644, 1.5, 10)
  pointLight.position.set(0, 3, 0)
  scene.add(pointLight)

  // --- Three.js Generated 3D Objects ---
  create3DObjects()

  // --- Resize ---
  window.addEventListener('resize', onResize)
}

function create3DObjects() {
  const configs = [
    {
      geo: new THREE.TorusKnotGeometry(0.6, 0.25, 100, 16),
      color: 0x7c3aed,
      emissive: 0x4c1d95,
      pos: [-1.8, 0.2, 0],
      rotSpeed: [0.8, 0.5, 0.3],
      orbitSpeed: 0.3,
      orbitRadius: 0,
    },
    {
      geo: new THREE.IcosahedronGeometry(0.5, 0),
      color: 0xf59e0b,
      emissive: 0x92400e,
      pos: [1.8, -0.5, 0],
      rotSpeed: [0.4, 0.7, 0.1],
      orbitSpeed: 0.5,
      orbitRadius: 0,
    },
    {
      geo: new THREE.OctahedronGeometry(0.45),
      color: 0x06b6d4,
      emissive: 0x155e75,
      pos: [0, 0.8, -1.5],
      rotSpeed: [0.6, 0.3, 0.5],
      orbitSpeed: 0.4,
      orbitRadius: 0,
    },
    {
      geo: new THREE.TorusGeometry(0.5, 0.2, 30, 50),
      color: 0xec4899,
      emissive: 0x831843,
      pos: [0, -0.6, 1.8],
      rotSpeed: [0.5, 0.2, 0.7],
      orbitSpeed: 0.35,
      orbitRadius: 0,
    },
    {
      geo: new THREE.DodecahedronGeometry(0.4),
      color: 0x22c55e,
      emissive: 0x166534,
      pos: [-1.2, -0.8, 1.2],
      rotSpeed: [0.3, 0.9, 0.2],
      orbitSpeed: 0.45,
      orbitRadius: 0,
    },
    {
      geo: new THREE.BoxGeometry(0.7, 0.7, 0.7),
      color: 0xef4444,
      emissive: 0x991b1b,
      pos: [1.4, 0.6, -1.2],
      rotSpeed: [0.7, 0.4, 0.6],
      orbitSpeed: 0.55,
      orbitRadius: 0,
    },
    {
      geo: new THREE.ConeGeometry(0.4, 0.8, 8),
      color: 0x8b5cf6,
      emissive: 0x4c1d95,
      pos: [-0.8, -0.3, -1.8],
      rotSpeed: [0.5, 0.6, 0.4],
      orbitSpeed: 0.6,
      orbitRadius: 0,
    },
    {
      geo: new THREE.CylinderGeometry(0.35, 0.35, 0.7, 16),
      color: 0x14b8a6,
      emissive: 0x115e59,
      pos: [0.9, -0.2, 1.6],
      rotSpeed: [0.2, 0.8, 0.3],
      orbitSpeed: 0.5,
      orbitRadius: 0,
    },
  ]

  configs.forEach((cfg, index) => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: cfg.color,
      emissive: cfg.emissive,
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.7,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
      envMapIntensity: 1.0,
    })

    const mesh = new THREE.Mesh(cfg.geo, mat)
    mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2])
    scene.add(mesh)

    objects.push({
      mesh,
      rotSpeed: cfg.rotSpeed,
      orbitSpeed: cfg.orbitSpeed,
      orbitRadius: cfg.orbitRadius,
      initPos: new THREE.Vector3(cfg.pos[0], cfg.pos[1], cfg.pos[2]),
      phase: index * 1.2,
    })
  })
}

function onResize() {
  const container = canvasRef.value
  if (!container || !renderer) return
  const width = container.clientWidth
  const height = container.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
  if (shaderMat) {
    shaderMat.uniforms.uResolution.value.set(width, height)
  }
}

function animate(time) {
  animationId = requestAnimationFrame(animate)
  const t = time * 0.001

  // Update shader time
  if (shaderMat) {
    shaderMat.uniforms.uTime.value = t
  }

  // Animate 3D objects
  objects.forEach((obj, i) => {
    // Rotation
    obj.mesh.rotation.x += obj.rotSpeed[0] * 0.012
    obj.mesh.rotation.y += obj.rotSpeed[1] * 0.012
    obj.mesh.rotation.z += obj.rotSpeed[2] * 0.012

    // Floating motion
    const floatY = Math.sin(t * 0.6 + obj.phase) * 0.3
    const floatX = Math.sin(t * 0.4 + obj.phase * 0.7) * 0.15
    obj.mesh.position.y = obj.initPos.y + floatY
    obj.mesh.position.x = obj.initPos.x + floatX

    // Pulsing emissive
    const pulse = 0.3 + 0.2 * Math.sin(t * 0.8 + obj.phase)
    obj.mesh.material.emissiveIntensity = pulse
  })

  controls.update()
  renderer.render(scene, camera)
}
</script>

<template>
  <div class="page">
    <div class="info-panel">
      <h2>🔮 路径 1：SDF + Raymarching</h2>
      <p><strong>核心原理：</strong>不生成网格，直接在 Fragment Shader 中用数学函数定义空间中的形状，通过光线步进（Raymarching）渲染。</p>
      <div class="features">
        <span>✓ SDF 基本体：球体、立方体、圆环、圆柱</span>
        <span>✓ 布尔运算：并集、交集、差集、平滑并集</span>
        <span>✓ 扭曲变形、表面位移</span>
        <span>✓ Mandelbulb 分形</span>
        <span>✓ 摄像机环绕</span>
      </div>
      <p class="hint">🖱 鼠标拖拽旋转 · 滚轮缩放 · SDF 背景 + Three.js 模型叠加</p>
    </div>
    <div ref="canvasRef" class="canvas-container"></div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0a0a0f;
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
  max-width: 400px;
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
  margin-bottom: 0.3rem;
}

.hint {
  font-size: 0.78rem !important;
  opacity: 0.5;
  margin-top: 0.3rem;
}

.canvas-container {
  width: 100%;
  height: 100%;
}
</style>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0a0a0f;
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
  max-width: 380px;
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
}

.canvas-container {
  width: 100%;
  height: 100%;
}
</style>
