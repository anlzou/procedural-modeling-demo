<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import vertexShader from '../shaders/raymarching.vert?raw'
import fragmentShader from '../shaders/raymarching.frag?raw'
import InfoPanel from '../components/InfoPanel.vue'
import ControlPanel from '../components/ControlPanel.vue'

const canvasRef = ref(null)
let scene, camera, renderer, controls, shaderMat, shaderMesh
let objects = [], animationId, frameCount = 0, lastFpsTime = 0
const fps = ref(0)
const memory = ref(0)
const objectCount = ref(8)

onMounted(() => { init(); animate() })
onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId)
  controls?.dispose(); renderer?.dispose()
  objects.forEach(o => { scene.remove(o.mesh); o.mesh.geometry?.dispose(); o.mesh.material?.dispose() })
})

function init() {
  const container = canvasRef.value
  const width = container.clientWidth, height = container.clientHeight

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
  camera.position.set(0, 2, 6)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.autoRotate = true
  controls.autoRotateSpeed = 0.8; controls.minDistance = 2
  controls.maxDistance = 20; controls.target.set(0, 0, 0)

  // Skybox: Raymarching shader on a large sphere
  const bgGeo = new THREE.SphereGeometry(50, 32, 32)
  shaderMat = new THREE.ShaderMaterial({
    vertexShader, fragmentShader,
    uniforms: { uTime: { value: 0 }, uResolution: { value: new THREE.Vector2(width, height) } },
    side: THREE.BackSide,
  })
  shaderMesh = new THREE.Mesh(bgGeo, shaderMat)
  scene.add(shaderMesh)

  // Lights
  scene.add(new THREE.AmbientLight(0x404060, 0.6))
  const dl1 = new THREE.DirectionalLight(0xffffff, 2); dl1.position.set(5, 10, 7); scene.add(dl1)
  const dl2 = new THREE.DirectionalLight(0x4488ff, 1); dl2.position.set(-5, 3, -5); scene.add(dl2)
  const pl = new THREE.PointLight(0xff6644, 1.5, 10); pl.position.set(0, 3, 0); scene.add(pl)

  create3DObjects()
  window.addEventListener('resize', onResize)
}

function create3DObjects() {
  const items = [
    [THREE.TorusKnotGeometry, [0.6, 0.25, 100, 16], 0x7c3aed, [-1.8, 0.2, 0], [0.8, 0.5, 0.3]],
    [THREE.IcosahedronGeometry, [0.5, 0], 0xf59e0b, [1.8, -0.5, 0], [0.4, 0.7, 0.1]],
    [THREE.OctahedronGeometry, [0.45], 0x06b6d4, [0, 0.8, -1.5], [0.6, 0.3, 0.5]],
    [THREE.TorusGeometry, [0.5, 0.2, 30, 50], 0xec4899, [0, -0.6, 1.8], [0.5, 0.2, 0.7]],
    [THREE.DodecahedronGeometry, [0.4], 0x22c55e, [-1.2, -0.8, 1.2], [0.3, 0.9, 0.2]],
    [THREE.BoxGeometry, [0.7, 0.7, 0.7], 0xef4444, [1.4, 0.6, -1.2], [0.7, 0.4, 0.6]],
    [THREE.ConeGeometry, [0.4, 0.8, 8], 0x8b5cf6, [-0.8, -0.3, -1.8], [0.5, 0.6, 0.4]],
    [THREE.CylinderGeometry, [0.35, 0.35, 0.7, 16], 0x14b8a6, [0.9, -0.2, 1.6], [0.2, 0.8, 0.3]],
  ]
  items.forEach(([Geo, args, color, pos, rot], i) => {
    const mat = new THREE.MeshPhysicalMaterial({
      color, emissive: color, emissiveIntensity: 0.3,
      roughness: 0.2, metalness: 0.7, clearcoat: 0.4,
    })
    const mesh = new THREE.Mesh(new Geo(...args), mat)
    mesh.position.set(pos[0], pos[1], pos[2])
    scene.add(mesh)
    objects.push({ mesh, rotSpeed: rot, initPos: new THREE.Vector3(pos[0], pos[1], pos[2]), phase: i * 1.2 })
  })
}

function onResize() {
  const c = canvasRef.value; if (!c || !renderer) return
  const w = c.clientWidth, h = c.clientHeight
  camera.aspect = w / h; camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  if (shaderMat) shaderMat.uniforms.uResolution.value.set(w, h)
}

function animate(time) {
  animationId = requestAnimationFrame(animate)
  const t = time * 0.001

  frameCount++
  if (time - lastFpsTime >= 1000) {
    fps.value = frameCount; frameCount = 0; lastFpsTime = time
    if (window.performance?.memory) memory.value = window.performance.memory.usedJSHeapSize
  }

  if (shaderMat) shaderMat.uniforms.uTime.value = t

  objects.forEach((o, i) => {
    o.mesh.rotation.x += o.rotSpeed[0] * 0.012
    o.mesh.rotation.y += o.rotSpeed[1] * 0.012
    o.mesh.rotation.z += o.rotSpeed[2] * 0.012
    o.mesh.position.y = o.initPos.y + Math.sin(t * 0.6 + o.phase) * 0.3
    o.mesh.position.x = o.initPos.x + Math.sin(t * 0.4 + o.phase * 0.7) * 0.15
    o.mesh.material.emissiveIntensity = 0.3 + 0.2 * Math.sin(t * 0.8 + o.phase)
  })

  controls.update()
  renderer.render(scene, camera)
}
</script>

<template>
  <div class="page">
    <InfoPanel>
      <h2>🔮 路径 1：SDF + Raymarching</h2>
      <p><strong>核心原理：</strong>不生成网格，直接在 Fragment Shader 中用数学函数定义空间中的形状，通过光线步进（Raymarching）渲染。</p>
      <div class="features">
        <span>✓ SDF 基本体：球体、立方体、圆环、圆柱</span>
        <span>✓ 布尔运算：并集、交集、差集、平滑并集</span>
        <span>✓ 扭曲变形、表面位移</span>
        <span>✓ Mandelbulb 分形</span>
        <span>✓ 摄像机环绕 + Three.js 模型叠加</span>
      </div>
      <p class="hint">🖱 拖拽旋转 · 滚轮缩放</p>
    </InfoPanel>

    <ControlPanel :fps="fps" :memory="memory" :objectCount="objectCount" />

    <div ref="canvasRef" class="canvas-container"></div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #0a0a0f; }
.canvas-container { width: 100%; height: 100%; }
</style>
