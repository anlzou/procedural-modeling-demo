<script setup>
import { ref, defineAsyncComponent, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import InfoPanel from '../../components/InfoPanel.vue'
const ControlPanel = defineAsyncComponent(() => import('../../components/ControlPanel.vue'))
import { useSceneReady } from '../../composables/useSceneReady.js'

const emit = defineEmits(['switchModel', 'ready', 'progress', 'error'])
const { emitProgress, markReady, markError } = useSceneReady(emit)
const containerRef = ref(null)

let scene, camera, webglRenderer, css3dRenderer, composer, controls, animationId
let particles, pointLight, pointLight2, css3dObject, cardElement, glassObject
let frameCount = 0, lastFpsTime = 0
const glitchState = { bursting: false, burstStart: 0, burstDuration: 0, flickerSpeed: 0, nextTrigger: 3 }
const fps = ref(0)
const memory = ref(0)
const objectCount = ref(1)
const playing = ref(true)
const speed = ref(1)
const cardVisible = ref(true)
const glassVisible = ref(true)
const cardBrightness = ref(1)
const glassBrightness = ref(1)
const cardLightColor = ref('#64dcff')
const glassLightColor = ref('#64dcff')
const clock = new THREE.Clock()

// 存储玻璃盒内部元素引用以便动态更新颜色
let glassRingLight, glassInnerGlow, glassCubeFaces = [], glassBottom, glassBottomText, glassOrbitRing

function toggleCard() {
  cardVisible.value = !cardVisible.value
  if (css3dObject) css3dObject.visible = cardVisible.value
  updateObjectCount()
}
function toggleGlass() {
  glassVisible.value = !glassVisible.value
  if (glassObject) glassObject.visible = glassVisible.value
  updateObjectCount()
}
function updateObjectCount() {
  let count = 0
  if (cardVisible.value) count++
  if (glassVisible.value) count++
  objectCount.value = count
}

function updateCardLight(brightness, color) {
  if (brightness !== undefined) cardBrightness.value = brightness
  if (color !== undefined) cardLightColor.value = color
  const b = cardBrightness.value
  const c = color || cardLightColor.value
  if (cardElement) {
    if (cardElement.backLight) {
      const bc = new THREE.Color(c)
      cardElement.backLight.style.opacity = 0.75 * b
      cardElement.backLight.style.background = `linear-gradient(135deg, rgba(${bc.r*255|0},${bc.g*255|0},${bc.b*255|0},${0.35*b}), rgba(${bc.r*255|0},${bc.g*255|0},${bc.b*255|0},${0.2*b}))`
      cardElement.backLight.style.boxShadow = `0 0 120px rgba(${bc.r*255|0},${bc.g*255|0},${bc.b*255|0},${0.5*b}), inset 0 0 100px rgba(${bc.r*255|0},${bc.g*255|0},${bc.b*255|0},${0.35*b})`
    }
    if (cardElement.frontGlow) {
      const fc = new THREE.Color(c)
      cardElement.frontGlow.style.opacity = 0.35 * b
      cardElement.frontGlow.style.background = `linear-gradient(135deg, rgba(${fc.r*255|0},${fc.g*255|0},${fc.b*255|0},${0.15*b}), rgba(${fc.r*255|0},${fc.g*255|0},${fc.b*255|0},${0.08*b}))`
      cardElement.frontGlow.style.boxShadow = `inset 0 0 80px rgba(${fc.r*255|0},${fc.g*255|0},${fc.b*255|0},${0.2*b})`
    }
  }
}
function updateGlassLight(brightness, color) {
  if (brightness !== undefined) glassBrightness.value = brightness
  if (color !== undefined) glassLightColor.value = color
  const b = glassBrightness.value
  const c = color || glassLightColor.value
  const col = new THREE.Color(c)
  const r = col.r * 255 | 0, g = col.g * 255 | 0, bb = col.b * 255 | 0
  const rc = `rgba(${r},${g},${bb}`

  // 更新 CSS 变量（影响 breatheLight / ringPulse / cubeGlow 动画）
  document.documentElement.style.setProperty('--gr', r)
  document.documentElement.style.setProperty('--gg', g)
  document.documentElement.style.setProperty('--gb', bb)

  // 圆环灯带（最强光源）
  if (glassRingLight) {
    glassRingLight.style.borderColor = `${rc},${0.9*b})`
    glassRingLight.style.boxShadow = `0 0 ${20*b}px ${rc},${0.8*b}), 0 0 ${60*b}px ${rc},${0.5*b}), 0 0 ${100*b}px ${rc},${0.3*b}), inset 0 0 ${15*b}px ${rc},${0.5*b}), inset 0 0 ${50*b}px ${rc},${0.2*b})`
  }
  // 内圈光晕（最强光源）
  if (glassInnerGlow) {
    glassInnerGlow.style.background = `radial-gradient(circle, ${rc},${0.35*b}) 0%, ${rc},${0.1*b}) 40%, transparent 70%)`
  }
  // 内部立方体各面（背景+边框+发光）
  glassCubeFaces.forEach((face, i) => {
    const alphas = [0.15, 0.1, 0.08, 0.08, 0.12, 0.12]
    face.style.background = `${rc},${alphas[i] || 0.1})`
    face.style.borderColor = `${rc},${0.3*b})`
    face.style.boxShadow = `inset 0 0 20px ${rc},${0.1*b})`
  })
  // 底面呼吸灯底座
  if (glassBottom) {
    glassBottom.style.borderColor = `${rc},${0.15*b})`
    glassBottom.style.boxShadow = `0 0 ${30*b}px ${rc},${0.3*b}), inset 0 0 ${20*b}px ${rc},${0.1*b})`
  }
  // 底面文字
  if (glassBottomText) {
    glassBottomText.style.color = `${rc},${0.4*b})`
  }
  // 外圈轨道环
  if (glassOrbitRing) {
    glassOrbitRing.style.borderColor = `${rc},${0.15*b})`
  }
}
function resetLights() {
  updateCardLight(1, '#64dcff')
  updateGlassLight(1, '#64dcff')
}

function onTogglePlay(val) { playing.value = val; if (controls) controls.autoRotate = val }
function onUpdateSpeed(val) { speed.value = val; if (controls) controls.autoRotateSpeed = val * 1.5 }

function onGlobalKeydown(e) {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    playing.value = !playing.value
    if (controls) controls.autoRotate = playing.value
  }
}

onMounted(() => {
  try {
    emitProgress(0.28, '初始化双渲染器…')
    init()
    emitProgress(0.78, '编译后期效果…')
    animate()
    window.addEventListener('keydown', onGlobalKeydown)
  } catch (err) {
    console.error(err)
    markError('场景初始化失败，请刷新重试')
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  if (animationId) cancelAnimationFrame(animationId)
  if (animationId) cancelAnimationFrame(animationId)
  controls?.dispose()
  webglRenderer?.dispose()
  if (css3dRenderer?.domElement?.parentNode) css3dRenderer.domElement.parentNode.removeChild(css3dRenderer.domElement)
  if (webglRenderer?.domElement?.parentNode) webglRenderer.domElement.parentNode.removeChild(webglRenderer.domElement)
})

function init() {
  const container = containerRef.value
  const w = container.clientWidth
  const h = container.clientHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a0a)
  camera = new THREE.PerspectiveCamera(50, w / h, 1, 5000)
  camera.position.set(0, 0, 800)

  // WebGL renderer (background)
  webglRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  webglRenderer.setSize(w, h)
  webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  webglRenderer.domElement.style.position = 'absolute'
  webglRenderer.domElement.style.top = '0'
  webglRenderer.domElement.style.pointerEvents = 'none'
  container.appendChild(webglRenderer.domElement)

  // CSS3D renderer (foreground)
  css3dRenderer = new CSS3DRenderer()
  css3dRenderer.setSize(w, h)
  css3dRenderer.domElement.style.position = 'absolute'
  css3dRenderer.domElement.style.top = '0'
  container.appendChild(css3dRenderer.domElement)

  controls = new OrbitControls(camera, css3dRenderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.autoRotate = true
  controls.autoRotateSpeed = 1.5

  // CSS3D product card
  cardElement = createProductCard()
  css3dObject = new CSS3DObject(cardElement)
  css3dObject.position.set(-250, 0, 0)
  scene.add(css3dObject)

  // CSS3D glass case
  const glassElement = createGlassCase()
  glassObject = new CSS3DObject(glassElement)
  glassObject.position.set(280, 0, 0)
  scene.add(glassObject)

  // Click flip + adjust rotation center
  const ndc = new THREE.Vector2()
  const clickTargets = [
    { obj: css3dObject, pos: new THREE.Vector3(-250, 0, 0) },
    { obj: glassObject, pos: new THREE.Vector3(280, 0, 0) },
  ]
  css3dRenderer.domElement.addEventListener('click', (e) => {
    const rect = css3dRenderer.domElement.getBoundingClientRect()
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    const worldPos = new THREE.Vector3()

    let hit = null
    let closestDist = Infinity
    for (const t of clickTargets) {
      if (!t.obj.visible) continue
      t.obj.getWorldPosition(worldPos)
      const projected = worldPos.clone().project(camera)
      if (projected.z > 1 || projected.z < -1) continue
      const dx = projected.x - ndc.x
      const dy = projected.y - ndc.y
      const dist = dx * dx + dy * dy
      if (dist < closestDist) { closestDist = dist; hit = t }
    }

    if (hit && closestDist < 0.02) {
      const currentRot = hit.obj.rotation.y
      let progress = 0
      function flip() {
        progress += 0.05
        if (progress <= 1) {
          hit.obj.rotation.y = currentRot + Math.PI * easeOutCubic(progress)
          requestAnimationFrame(flip)
        }
      }
      flip()

      // Adjust rotation center
      const onlyCard = cardVisible.value && !glassVisible.value
      const onlyGlass = !cardVisible.value && glassVisible.value
      if (onlyCard) controls.target.set(-250, 0, 0)
      else if (onlyGlass) controls.target.set(280, 0, 0)
      else controls.target.set(0, 0, 0)
    }
  })

  // WebGL particles
  const pc = 200
  const positions = new Float32Array(pc * 3)
  for (let i = 0; i < pc * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 2000
    positions[i + 1] = (Math.random() - 0.5) * 2000
    positions[i + 2] = (Math.random() - 0.5) * 1000
  }
  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const particleMat = new THREE.PointsMaterial({
    color: 0x64c8ff, size: 3, transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending
  })
  particles = new THREE.Points(particleGeo, particleMat)
  scene.add(particles)

  // Lights
  scene.add(new THREE.AmbientLight(0x404040, 2))
  pointLight = new THREE.PointLight(0x64c8ff, 2, 1000)
  pointLight.position.set(200, 200, 200)
  scene.add(pointLight)
  pointLight2 = new THREE.PointLight(0xff64c8, 2, 1000)
  pointLight2.position.set(-200, -200, 200)
  scene.add(pointLight2)

  // Bloom
  composer = new EffectComposer(webglRenderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 0.85))

  // Mouse follow
  document.addEventListener('mousemove', onMouseMove)
}

function createProductCard() {
  const card = document.createElement('div')
  card.className = 'product-card'
  card.style.cssText = 'width:300px;height:400px;position:relative;transform-style:preserve-3d;'

  const faces = [
    { name: 'front', css: 'translateZ(20px)', html: `
      <div style="padding:30px;display:flex;flex-direction:column;justify-content:space-between;height:100%;">
        <div><div style="font-size:28px;font-weight:800;color:#fff;">Pro X1</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:8px;">下一代智能设备，融合前沿科技与极简美学</div></div>
        <div><div style="font-size:36px;font-weight:900;color:#64c8ff;text-shadow:0 0 20px rgba(100,200,255,0.5);">¥2,999</div>
          <button style="margin-top:12px;padding:12px 24px;background:linear-gradient(135deg,#64c8ff,#ff64c8);border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(100,200,255,0.4);transition:all 0.3s;" onmouseover="this.style.boxShadow='0 8px 30px rgba(100,200,255,0.7)';this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 4px 20px rgba(100,200,255,0.4)';this.style.transform='none'">立即购买</button></div>
      </div>` },
    { name: 'back', css: 'rotateY(180deg) translateZ(20px)', html: '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.3);font-size:18px;">PRO X1</div>' },
    { name: 'right', css: 'rotateY(90deg) translateZ(280px)', size: '40px,400px' },
    { name: 'left', css: 'rotateY(-90deg) translateZ(20px)', size: '40px,400px' },
    { name: 'top', css: 'rotateX(90deg) translateZ(20px)', size: '300px,40px' },
    { name: 'bottom', css: 'rotateX(-90deg) translateZ(380px)', size: '300px,40px' },
  ]

  faces.forEach(f => {
    const div = document.createElement('div')
    if (f.name === 'front' || f.name === 'back') div.setAttribute('data-face', f.name)
    div.style.cssText = `position:absolute;width:${f.size ? f.size.split(',')[0] : '300px'};height:${f.size ? f.size.split(',')[1] : '400px'};backface-visibility:visible;border:${f.name === 'front' || f.name === 'back' ? '1px solid rgba(255,255,255,0.1)' : 'none'};transform:${f.css};border-radius:${f.name === 'front' || f.name === 'back' ? '16px' : '0'};`
    if (f.name === 'front') {
      div.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))'
      div.style.backdropFilter = 'blur(10px)'
      div.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.2), 0 20px 40px rgba(0,0,0,0.4)'
      div.innerHTML = f.html
    } else if (f.name === 'back') {
      div.style.background = 'linear-gradient(135deg, #1a1a2e, #16213e)'
      div.innerHTML = f.html
      // 背部故障灯光覆盖层 - 整面发光，向正面发散
      const backLight = document.createElement('div')
      backLight.style.cssText = `position:absolute;inset:0;border-radius:16px;pointer-events:none;opacity:0.75;transition:none;
        background:linear-gradient(135deg, rgba(100,220,255,0.35), rgba(80,180,255,0.2));
        box-shadow:0 0 120px rgba(100,220,255,0.5), inset 0 0 100px rgba(100,220,255,0.35);`
      div.appendChild(backLight)
      card.backLight = backLight

      // 正面透光覆盖层 - 整面透光
      const frontGlow = document.createElement('div')
      frontGlow.style.cssText = `position:absolute;inset:0;border-radius:16px;pointer-events:none;opacity:0.35;transition:none;
        background:linear-gradient(135deg, rgba(100,220,255,0.15), rgba(80,180,255,0.08));
        box-shadow:inset 0 0 80px rgba(100,220,255,0.2);`
      card.frontGlow = frontGlow
      // 插入到 front 面
      setTimeout(() => {
        const frontDiv = card.querySelector('[data-face="front"]')
        if (frontDiv) frontDiv.appendChild(frontGlow)
      }, 0)
    } else if (f.name === 'bottom') {
      div.style.boxShadow = '0 20px 60px rgba(0,0,0,0.8)'
      div.style.background = 'rgba(255,255,255,0.05)'
    } else {
      div.style.background = 'linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.02))'
    }
    card.appendChild(div)
  })

  // Orbit ring
  const ring = document.createElement('div')
  ring.style.cssText = 'position:absolute;width:500px;height:500px;border:2px solid rgba(100,200,255,0.2);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%) rotateX(70deg);animation:orbit 10s linear infinite;'
  card.appendChild(ring)

  return card
}

function createGlassCase() {
  const box = document.createElement('div')
  box.className = 'glass-case'
  box.style.cssText = 'width:200px;height:400px;position:relative;transform-style:preserve-3d;'

  const w = 200, h = 400, d = 200
  const hw = 100, hh = 200, hd = 100
  const glass = 'linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))'
  const border = '1px solid rgba(255,255,255,0.12)'

  const glassGrad = 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.15))'

  // 正面 - 玻璃渐变
  const front = document.createElement('div')
  front.style.cssText = `position:absolute;width:${w}px;height:${h}px;transform:translateZ(${hd}px);background:${glassGrad};border:${border};border-radius:4px;`
  box.appendChild(front)

  // 背面 - 玻璃渐变
  const back = document.createElement('div')
  back.style.cssText = `position:absolute;width:${w}px;height:${h}px;transform:rotateY(180deg) translateZ(${hd}px);background:${glassGrad};border:${border};border-radius:4px;`
  box.appendChild(back)

  // 左面 - 玻璃渐变
  const left = document.createElement('div')
  left.style.cssText = `position:absolute;width:${d}px;height:${h}px;transform:rotateY(-90deg) translateZ(${hw}px);background:${glassGrad};border:${border};`
  box.appendChild(left)

  // 右面 - 玻璃渐变
  const right = document.createElement('div')
  right.style.cssText = `position:absolute;width:${d}px;height:${h}px;transform:rotateY(90deg) translateZ(${hw}px);background:${glassGrad};border:${border};`
  box.appendChild(right)

  // 顶面 - 玻璃渐变
  const top = document.createElement('div')
  top.style.cssText = `position:absolute;width:${w}px;height:${d}px;transform:rotateX(90deg) translateZ(${hh - 100}px);background:${glassGrad};border:${border};border-radius:4px;`
  box.appendChild(top)

  // 顶面圆环灯带
  const ringLight = document.createElement('div')
  const rSize = 160
  ringLight.style.cssText = `
    position:absolute; width:${rSize}px; height:${rSize}px;
    left:${(w - rSize) / 2}px; top:${(d - rSize) / 2}px;
    transform:rotateX(90deg) translateZ(-${hh - 10}px);
    border-radius:50%;
    border:4px solid rgba(100,220,255,0.9);
    box-shadow:
      0 0 20px rgba(100,220,255,0.8),
      0 0 60px rgba(100,220,255,0.5),
      0 0 100px rgba(100,220,255,0.3),
      inset 0 0 15px rgba(100,220,255,0.5),
      inset 0 0 50px rgba(100,220,255,0.2);
    background:transparent;
    pointer-events:none;
    animation: ringPulse 2s ease-in-out infinite;
  `
  // 内圈光晕
  const innerGlow = document.createElement('div')
  innerGlow.style.cssText = `
    position:absolute; width:${rSize - 30}px; height:${rSize - 30}px;
    left:${(w - rSize + 30) / 2}px; top:${(d - rSize + 30) / 2}px;
    transform:rotateX(90deg) translateZ(-${hh}px);
    border-radius:50%;
    background:radial-gradient(circle, rgba(100,220,255,0.35) 0%, rgba(100,220,255,0.1) 40%, transparent 70%);
    pointer-events:none;
    animation: ringPulse 2s ease-in-out infinite 0.5s;
  `
  box.appendChild(innerGlow)
  box.appendChild(ringLight)
  glassRingLight = ringLight
  glassInnerGlow = innerGlow

  // 内部展示正方体（受呼吸灯光效影响）
  const cubeSize = 80
  const cube = document.createElement('div')
  cube.className = 'inner-cube'
  cube.style.cssText = `position:absolute;width:${cubeSize}px;height:${cubeSize}px;top:${(h - cubeSize) / 2}px;left:${(w - cubeSize) / 2}px;transform-style:preserve-3d;animation:cubeFloat 3s ease-in-out infinite;`

  const cs = cubeSize / 2
  const cubeFaces = [
    { css: `translateZ(${cs}px)`, bg: 'rgba(100,200,255,0.15)' },
    { css: `rotateY(180deg) translateZ(${cs}px)`, bg: 'rgba(100,200,255,0.1)' },
    { css: `rotateY(90deg) translateZ(${cs}px)`, bg: 'rgba(100,200,255,0.08)' },
    { css: `rotateY(-90deg) translateZ(${cs}px)`, bg: 'rgba(100,200,255,0.08)' },
    { css: `rotateX(90deg) translateZ(${cs}px)`, bg: 'rgba(100,200,255,0.12)' },
    { css: `rotateX(-90deg) translateZ(${cs}px)`, bg: 'rgba(100,200,255,0.12)' },
  ]
  const cubeFacesArr = []
  cubeFaces.forEach(f => {
    const face = document.createElement('div')
    face.style.cssText = `position:absolute;width:${cubeSize}px;height:${cubeSize}px;backface-visibility:visible;border:1px solid rgba(100,220,255,0.3);transform:${f.css};background:${f.bg};box-shadow:inset 0 0 20px rgba(100,220,255,0.1);animation:cubeGlow 2s ease-in-out infinite;`
    cube.appendChild(face)
    cubeFacesArr.push(face)
  })
  box.appendChild(cube)
  glassCubeFaces = cubeFacesArr

  // 底面 - 磨砂底座 + 呼吸灯
  const bottom = document.createElement('div')
  bottom.style.cssText = `position:absolute;width:${w}px;height:${d}px;transform:rotateX(-90deg) translateZ(${hh+100}px);background:linear-gradient(135deg,#1a1a2e,#2a1a3e);border:1px solid rgba(100,200,255,0.15);border-radius:4px;box-shadow:0 0 30px rgba(100,200,255,0.3),inset 0 0 20px rgba(100,200,255,0.1);animation:breatheLight 2s ease-in-out infinite;display:flex;align-items:center;justify-content:center;`
  const bottomText = document.createElement('span')
  bottomText.style.cssText = 'font-size:10px;color:rgba(100,200,255,0.4);text-align:center;line-height:1.4;pointer-events:none;'
  bottom.appendChild(bottomText)
  box.appendChild(bottom)
  glassBottom = bottom
  glassBottomText = bottomText

  // 光圈（轨道环）
  const ring = document.createElement('div')
  const ringSize = 500
  ring.style.cssText = `position:absolute;width:${ringSize}px;height:${ringSize}px;border:2px solid rgba(100,200,255,0.15);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%) rotateX(75deg);animation:orbit 12s linear infinite;pointer-events:none;`
  box.appendChild(ring)
  glassOrbitRing = ring

  return box
}

function onMouseMove(e) {
  const x = (e.clientX / window.innerWidth) * 2 - 1
  const y = -(e.clientY / window.innerHeight) * 2 + 1
  if (cardElement) cardElement.style.transform = `rotateX(${-y * 15}deg) rotateY(${x * 15}deg)`
  if (pointLight) { pointLight.position.x = x * 500; pointLight.position.y = y * 500 }
}

function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3) }

function animate() {
  animationId = requestAnimationFrame(animate)
  const time = clock.getElapsedTime()

  frameCount++
  if (lastFpsTime === 0) lastFpsTime = performance.now()
  const now = performance.now()
  if (now - lastFpsTime >= 1000) {
    fps.value = frameCount; frameCount = 0; lastFpsTime = now
    if (window.performance?.memory) memory.value = window.performance.memory.usedJSHeapSize
  }

  controls.update()
  if (particles) { particles.rotation.y = time * 0.05; particles.rotation.x = time * 0.02 }
  if (css3dObject) css3dObject.position.y = Math.sin(time) * 20
  if (glassObject) glassObject.position.y = Math.sin(time) * 20
  if (pointLight) pointLight.intensity = 2 + Math.sin(time * 2) * 0.5
  if (pointLight2) pointLight2.intensity = 2 + Math.cos(time * 2.3) * 0.5

  // 故障灯光 - 常亮 + 随机熄灭（模拟灯光故障）
  if (cardElement && cardElement.backLight) {
    if (!glitchState.bursting && time > glitchState.nextTrigger) {
      glitchState.bursting = true
      glitchState.burstStart = time
      glitchState.burstDuration = 0.2 + Math.random() * 3.0   // 随机持续时间
      glitchState.flickerSpeed = 20 + Math.random() * 50      // 随机闪烁速度
      glitchState.nextTrigger = time + 6 + Math.random() * 6  // 随机下次触发时间
    }

    if (glitchState.bursting) {
      const elapsed = time - glitchState.burstStart
      if (elapsed < glitchState.burstDuration) {
        // 熄灭闪烁：信号在 0~1 间跳跃，0=灭 1=亮
        const sig = Math.sin(elapsed * glitchState.flickerSpeed) * 0.4 +
                    Math.sin(elapsed * (glitchState.flickerSpeed * 0.53)) * 0.3 +
                    Math.sin(elapsed * (glitchState.flickerSpeed * 0.17)) * 0.2 +
                    Math.random() * 0.25
        const on = sig > 0.3  // 阈值，制造熄灭/复亮的切换感
        cardElement.backLight.style.opacity = on ? (0.75 * cardBrightness.value) : (0.05 + Math.random() * 0.1)
        if (cardElement.frontGlow) cardElement.frontGlow.style.opacity = on ? (0.35 * cardBrightness.value) : (0.02 + Math.random() * 0.04)
      } else {
        glitchState.bursting = false
      }
    } else {
      // 正常常亮
      cardElement.backLight.style.opacity = 0.75 * cardBrightness.value
      if (cardElement.frontGlow) cardElement.frontGlow.style.opacity = 0.35 * cardBrightness.value
    }
  }

  if (composer) composer.render()
  if (css3dRenderer) css3dRenderer.render(scene, camera)
  markReady()
}
</script>

<template>
  <div class="product-page">
    <InfoPanel>
      <template #header>
        <h2>📦 CSS3D 产品展示</h2>
        <p><strong>核心展示：</strong>6 面 CSS3D 产品卡片 + WebGL 粒子光效，双渲染器（CSS3D + WebGL）叠加。</p>
      </template>
      <div class="info-grid">
        <div class="info-section">
          <div class="info-section-title">🎮 鼠标操作</div>
          <div class="info-item"><kbd>拖拽</kbd> 旋转视角</div>
          <div class="info-item"><kbd>滚轮</kbd> 缩放画面</div>
          <div class="info-item"><kbd>移动鼠标</kbd> 卡片倾斜</div>
        </div>
        <div class="info-section">
          <div class="info-section-title">✨ 效果</div>
          <div class="info-item">Bloom 辉光后期</div>
          <div class="info-item">双点光源脉冲</div>
          <div class="info-item">200 粒子系统</div>
        </div>
      </div>
      <div class="model-vis-row">
        <span class="model-vis-label">🎯 模型显示：</span>
        <button class="model-toggle" :class="{ active: cardVisible }" @click="toggleCard">📦 产品卡片</button>
        <button class="model-toggle" :class="{ active: glassVisible }" @click="toggleGlass">🗄️ 玻璃展柜</button>
      </div>
    </InfoPanel>

    <ControlPanel :fps="fps" :memory="memory" :objectCount="objectCount" :showModelLights="true"
      :cardBrightness="cardBrightness" :glassBrightness="glassBrightness"
      :cardColor="cardLightColor" :glassColor="glassLightColor"
      @togglePlay="onTogglePlay" @updateSpeed="onUpdateSpeed"
      @updateCardBrightness="updateCardLight($event, undefined)"
      @updateGlassBrightness="updateGlassLight($event, undefined)"
      @updateCardColor="updateCardLight(undefined, $event)"
      @updateGlassColor="updateGlassLight(undefined, $event)"
      @resetLights="resetLights" />

    <div ref="containerRef" class="canvas-container"></div>
  </div>
</template>

<style>
/* 玻璃灯光颜色变量（由 JS 动态更新） */
:root {
  --gr: 100; --gg: 220; --gb: 255;
}

@keyframes orbit {
  from { transform: translate(-50%,-50%) rotateX(70deg) rotateZ(0deg); }
  to   { transform: translate(-50%,-50%) rotateX(70deg) rotateZ(360deg); }
}
@keyframes breatheLight {
  0%, 100% { box-shadow: 0 0 30px rgba(var(--gr), var(--gg), var(--gb), 0.4), inset 0 0 20px rgba(var(--gr), var(--gg), var(--gb), 0.1); }
  50%      { box-shadow: 0 0 60px rgba(var(--gr), var(--gg), var(--gb), 0.8), inset 0 0 40px rgba(var(--gr), var(--gg), var(--gb), 0.25); }
}
@keyframes ringPulse {
  0%, 100% { opacity: 0.7; transform: rotateX(90deg) translateZ(-202px) scale(1); }
  50%      { opacity: 1;   transform: rotateX(90deg) translateZ(-202px) scale(1.06); box-shadow: 0 0 30px rgba(var(--gr), var(--gg), var(--gb), 1), 0 0 80px rgba(var(--gr), var(--gg), var(--gb), 0.7), 0 0 140px rgba(var(--gr), var(--gg), var(--gb), 0.4), inset 0 0 20px rgba(var(--gr), var(--gg), var(--gb), 0.6), inset 0 0 60px rgba(var(--gr), var(--gg), var(--gb), 0.3); }
}
@keyframes cubeFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-15px); }
}
@keyframes cubeGlow {
  0%, 100% { border-color: rgba(var(--gr), var(--gg), var(--gb), 0.2); box-shadow: inset 0 0 10px rgba(var(--gr), var(--gg), var(--gb), 0.05); }
  50%      { border-color: rgba(var(--gr), var(--gg), var(--gb), 0.6); box-shadow: inset 0 0 30px rgba(var(--gr), var(--gg), var(--gb), 0.25), 0 0 20px rgba(var(--gr), var(--gg), var(--gb), 0.15); }
}
</style>

<style scoped>
.product-page { width: 100%; height: 100vh; position: relative; background: #0a0a0a; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; position: relative; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.info-section { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 0.5rem 0.7rem; }
.info-section-title { font-size:0.72rem; font-weight:600; color:rgba(255,255,255,0.5); margin-bottom:0.35rem; }
.info-item { font-size:0.72rem; color:rgba(255,255,255,0.55); line-height:1.65; }
.info-item kbd { display:inline-block; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:4px; padding:0 5px; font-size:0.68rem; font-family:inherit; color:rgba(255,255,255,0.7); min-width:1.4em; text-align:center; }
.model-vis-row { display:flex; align-items:center; gap:0.4rem; margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid rgba(255,255,255,0.06); flex-wrap:wrap; }
.model-vis-label { font-size:0.7rem; color:rgba(255,255,255,0.4); white-space:nowrap; }
.model-toggle { padding:0.25rem 0.55rem; border-radius:6px; border:1px solid rgba(255,255,255,0.12); background:transparent; color:rgba(255,255,255,0.4); font-size:0.7rem; cursor:pointer; transition:all 0.2s; white-space:nowrap; }
.model-toggle:hover { color:rgba(255,255,255,0.7); border-color:rgba(255,255,255,0.25); }
.model-toggle.active { color:#22d3ee; border-color:rgba(34,211,238,0.4); background:rgba(34,211,238,0.08); }
</style>
