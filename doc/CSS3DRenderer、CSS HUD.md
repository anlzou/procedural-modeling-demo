# CSS3DRenderer 详解

## 一、技术原理

### 1. 核心定位：用 DOM 做 3D，而非 WebGL

CSS3DRenderer 是 Three.js 提供的一个**替代渲染器**。与 WebGLRenderer 使用 Canvas 绘制三角形不同，CSS3DRenderer 的底层是**浏览器 DOM + CSS 3D Transforms**。

```
┌─────────────────────────────────────────────┐
│           Three.js Scene Graph               │
│  (Object3D → position, rotation, scale)      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         CSS3DRenderer.render()               │
│  遍历场景树，将变换矩阵同步到 DOM 的 style   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│              DOM 元素                        │
│  style="transform: matrix3d(...)"            │
│  + CSS: transform-style: preserve-3d        │
│  + CSS: perspective: 1000px                  │
└─────────────────────────────────────────────┘
```

### 2. 核心机制：矩阵 → CSS Transform

CSS3DRenderer 每帧做的事情非常简单：

```javascript
// 伪代码：CSS3DRenderer 的核心逻辑
function render(scene, camera) {
    // 1. 计算相机投影矩阵的逆，得到视图矩阵
    const viewMatrix = camera.matrixWorldInverse;
    const projectionMatrix = camera.projectionMatrix;
    
    // 2. 遍历所有 CSS3DObject
    scene.traverse(object => {
        if (object.isCSS3DObject) {
            // 3. 计算模型-视图-投影矩阵
            const matrix = object.matrixWorld.clone();
            matrix.premultiply(viewMatrix);
            matrix.premultiply(projectionMatrix); // 可选，正交/透视
            
            // 4. 将 Three.js 矩阵转换为 CSS matrix3d()
            const cssMatrix = matrixToCSS(matrix);
            
            // 5. 应用到 DOM 元素
            object.element.style.transform = cssMatrix;
        }
    });
}
```

**关键转换**：Three.js 的 4×4 矩阵 → CSS `matrix3d()` 的 16 个值：

```javascript
function matrixToCSS(matrix) {
    const e = matrix.elements;
    // Three.js 是列主序，CSS matrix3d 是行主序，需要转置
    return `matrix3d(
        ${e[0]}, ${e[1]}, ${e[2]}, ${e[3]},
        ${e[4]}, ${e[5]}, ${e[6]}, ${e[7]},
        ${e[8]}, ${e[9]}, ${e[10]}, ${e[11]},
        ${e[12]}, ${e[13]}, ${e[14]}, ${e[15]}
    )`;
}
```

### 3. CSS3DObject 与 CSS3DSprite

Three.js 提供了两种 CSS3D 对象：

| 类型 | 行为 | 用途 |
|---|---|---|
| **CSS3DObject** | 完全遵循 3D 变换，会随视角旋转、缩放 | 3D 展板、墙面、立方体 |
| **CSS3DSprite** | 始终面向相机（billboard 效果），只保留位置 | 标签、姓名牌、信息气泡 |

```javascript
// CSS3DObject：一个 DOM 元素完全融入 3D 场景
const div = document.createElement('div');
div.textContent = 'Hello 3D';
const cssObj = new CSS3DObject(div);
cssObj.position.set(10, 5, 0);
scene.add(cssObj);

// CSS3DSprite：始终面向相机
const label = new CSS3DSprite(div);
label.position.set(10, 5, 0);
scene.add(label); // 无论相机在哪，div 都正对屏幕
```

### 4. 渲染器初始化与 DOM 结构

CSS3DRenderer 创建一个特殊的 DOM 树：

```javascript
const renderer = new CSS3DRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

// 生成的 DOM 结构：
// <div style="width: 100%; height: 100%; overflow: hidden;">
//   <div style="width: 100%; height: 100%; 
//               perspective: 1000px;          ← 透视
//               transform-style: preserve-3d;"> ← 3D 空间
//     <!-- CSS3DObject 的 DOM 元素被 append 到这里 -->
//   </div>
// </div>
```

**关键 CSS 属性**：
- `perspective: 1000px` — 定义观察者的 Z 轴距离，产生近大远小
- `transform-style: preserve-3d` — 子元素在 3D 空间中保留深度关系
- `transform: matrix3d(...)` — 每个元素的具体 3D 变换

### 5. 与 WebGLRenderer 的混合架构

这是 CSS3DRenderer 最常见的使用模式：

```
┌─────────────────────────────────────────────┐
│              HTML Body                       │
│  ┌─────────────────────────────────────┐   │
│  │  WebGLRenderer Canvas                │   │  ← 底层：粒子、光照、特效
│  │  (position: absolute; z-index: 0)  │   │
│  │  pointer-events: none;               │   │  ← 事件穿透到上层
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  CSS3DRenderer DOM                 │   │  ← 上层：UI、文字、视频
│  │  (position: absolute; z-index: 1)  │   │
│  │  pointer-events: auto;               │   │  ← 接收点击/悬停
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    ↓
         两者共享同一个 Camera
         因此 DOM 元素与 WebGL 物体完美对齐
```

**为什么能完美对齐？**
因为两个渲染器使用**完全相同的相机矩阵**。WebGL 用 GPU 渲染三角形，CSS3D 用浏览器合成器渲染 DOM，但它们的"眼睛"是同一个。

### 6. 坐标系差异与处理

Three.js 和 CSS 的坐标系存在关键差异：

| 特性 | Three.js | CSS |
|---|---|---|
| Y 轴方向 | 向上（+Y 是上） | 向下（+Y 是下） |
| Z 轴方向 | 朝向屏幕外 | 朝向屏幕内（默认） |
| 旋转方向 | 右手定则（逆时针为正） | 左手定则（顺时针为正） |

CSS3DRenderer 内部做了自动转换：

```javascript
// 核心源码中的坐标系修正
// 1. 翻转 Y 轴（Three.js Y-up → CSS Y-down）
// 2. 翻转旋转方向
// 3. 透视矩阵的特殊处理（CSS 的 perspective 与 Three.js 的 projectionMatrix 不同）
```

### 7. 事件处理机制

CSS3DRenderer 的 DOM 层天然支持所有浏览器事件：

```javascript
// 方案 1：直接在 DOM 元素上绑定
div.addEventListener('click', () => console.log('clicked!'));
div.addEventListener('mouseenter', () => div.style.background = 'red');

// 方案 2：通过 Raycaster 检测（与 WebGL 统一）
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(css3dObjects);
    // 注意：Raycaster 只能检测 CSS3DObject 的 bounding box，不精确
});
```

**重要限制**：Raycaster 对 CSS3DObject 的检测基于其 `Object3D` 的 bounding sphere，而非 DOM 的实际像素。如果需要精确像素级拾取，应直接在 DOM 上绑定事件。

---

## 二、发展历史

### 1. 起源（2012~2013）

- **背景**：Three.js 创始人 **Ricardo Cabello（mrdoob）** 在开发 Three.js 时，意识到 WebGL 在渲染文字、HTML 内容时存在天然缺陷：
  - 文字纹理模糊（尤其小字号）
  - 无法使用 CSS 样式（hover、动画、表单）
  - 视频纹理性能差
- **解决方案**：利用浏览器原生支持的 CSS 3D Transforms（2011 年后主流浏览器陆续支持），将 DOM 元素作为 Three.js 的"材质"。
- **首次发布**：CSS3DRenderer 作为 Three.js 的 **examples** 组件出现，最初用于展示 Google Maps 街景等需要嵌入网页内容的场景。

### 2. 早期应用（2013~2016）

- **2013 年**：mrdoob 发布经典 Demo **"CSS3D Periodic Table"**（元素周期表），展示了 118 个 DOM 元素在 3D 空间中的排列，成为 CSS3DRenderer 的标志性示例。
- **2014~2015 年**：随着 `transform-style: preserve-3d` 和 `perspective` 在主流浏览器中稳定，CSS3DRenderer 被用于：
  - 3D 产品展示（嵌入真实产品网页）
  - 数据可视化（3D 图表、力导向图）
  - 虚拟画廊（DOM 展板 + WebGL 环境）

### 3. 与 WebGL 融合时代（2017~2020）

- **技术成熟**：开发者发现 CSS3DRenderer 与 WebGLRenderer **混合使用**才是最佳实践：
  - WebGL 负责环境、光照、粒子、反射
  - CSS3D 负责文字、UI、视频、交互表单
- **关键改进**：
  - 支持 `pointer-events` 穿透，解决两层之间的点击冲突
  - 与 OrbitControls、PointerLockControls 等控制器兼容
  - 响应式布局适配

### 4. React Three Fiber 时代（2020~至今）

- **@react-three/drei 封装**：R3F 生态提供了 `<Html>` 组件，底层就是 CSS3DRenderer 的 React 封装：

```jsx
import { Html } from '@react-three/drei';

<mesh>
    <boxGeometry />
    <meshStandardMaterial />
    <Html distanceFactor={10}>  {/* 底层使用 CSS3DRenderer */}
        <div className="ui-panel">
            <h1>产品标题</h1>
            <button>购买</button>
        </div>
    </Html>
</mesh>
```

- **优势**：声明式 API，自动处理坐标同步，支持 `occlude`（遮挡检测）等高级特性。

### 5. 当前状态（2026）

- **定位明确**：CSS3DRenderer 不是 WebGLRenderer 的替代品，而是**互补层**。
- **浏览器支持**：所有现代浏览器完全支持 CSS 3D Transforms，包括移动端。
- **性能边界**：单个场景建议不超过 **500~1000 个 CSS3DObject**（DOM 节点过多会导致合成层爆炸）。

---

## 三、技术边界与注意事项

| 问题 | 原因 | 解决方案 |
|---|---|---|
| **DOM 元素过多卡顿** | 每个 CSS3DObject 是一个合成层，GPU 内存有限 | 视锥剔除、虚拟化（只渲染可见元素） |
| **文字反走样** | CSS 文字在 3D 旋转后可能出现锯齿 | 使用 `transform: translateZ(0)` 强制 GPU 渲染 |
| **z-fighting** | DOM 元素的层叠顺序与 3D 深度不一致 | 调整 DOM 插入顺序，或使用 `z-index` |
| **视频/iframe 穿透** | 某些浏览器中视频始终在最上层 | 使用 `visibility: hidden` 或 WebGL 视频纹理替代 |
| **截图困难** | `html2canvas` 无法捕获 CSS3D 内容 | 使用 WebGLRenderer 的 `preserveDrawingBuffer` 单独截图 |

---

## 四、一句话总结

> **CSS3DRenderer = 用浏览器原生 DOM 渲染能力实现 3D 场景，让 HTML/CSS 的所有特性（文字、视频、表单、动画、响应式）无缝融入 Three.js 的三维世界。** 它不是魔法，只是将 Three.js 的变换矩阵翻译成 CSS 的 `matrix3d()`，让浏览器合成器替你"渲染"3D 物体。

# CSS HUD
 **CSS HUD** 指的是用 **纯 CSS/HTML** 构建的"抬头显示"界面层，叠加在 Three.js 的 3D 场景之上，用于显示状态信息、导航、交互按钮等 UI 元素。

---

## 一、HUD 是什么

**HUD** = Heads-Up Display（抬头显示），源自战斗机座舱设计。在 3D 应用/游戏中，它指**固定在屏幕上的信息层**，不随 3D 场景相机移动而变化。

典型 HUD 元素：
- 血条/能量条
- 小地图
- 准星/十字线
- 任务提示文本
- 物品栏/快捷栏
- FPS 帧率显示
- 对话字幕

---

## 二、为什么用 CSS 做 HUD（而不是 WebGL）

| 方案 | 优点 | 缺点 |
|---|---|---|
| **CSS HUD** | 文本清晰、响应式布局简单、支持表单输入、SEO 友好、开发效率高 | 无法被 WebGL 后期处理（如 Bloom）影响 |
| **WebGL HUD**（Three.js Sprite/Plane） | 可与 3D 场景一起变形、受光照/雾效影响 | 文本渲染模糊、布局困难、无原生事件响应 |

**核心原则**：能用 CSS 做的 UI，绝不用 WebGL 画。

---

## 三、两种实现方式

### 方式 1：普通 DOM Overlay（最常用）

在 Three.js Canvas 之上叠加一个绝对定位的 DOM 层，**不参与 3D 变换**，只是平面覆盖。

```html
<div id="game-container">
    <!-- WebGL 层 -->
    <canvas id="three-canvas"></canvas>
    
    <!-- CSS HUD 层 -->
    <div id="hud-layer">
        <div class="hud-top-left">
            <div class="health-bar">
                <div class="health-fill" style="width: 75%"></div>
            </div>
            <span class="health-text">HP: 75/100</span>
        </div>
        
        <div class="hud-center">+</div> <!-- 准星 -->
        
        <div class="hud-bottom-right">
            <div class="minimap">小地图</div>
        </div>
    </div>
</div>
```

```css
#game-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}

#three-canvas {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
}

#hud-layer {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none; /* 让鼠标事件穿透到 Canvas */
    z-index: 10;
}

#hud-layer > * {
    pointer-events: auto; /* HUD 内部元素可交互 */
}

.health-bar {
    width: 200px; height: 20px;
    background: rgba(0,0,0,0.6);
    border: 2px solid #fff;
    border-radius: 10px;
    overflow: hidden;
}

.health-fill {
    height: 100%;
    background: linear-gradient(90deg, #ef4444, #f97316);
    transition: width 0.3s ease;
}

.hud-center {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-size: 32px;
    color: rgba(255,255,255,0.8);
    text-shadow: 0 0 10px rgba(255,255,255,0.5);
    pointer-events: none;
}
```

### 方式 2：CSS3DRenderer HUD（融入 3D 空间）

用 `CSS3DRenderer` 将 HUD 元素放入 Three.js 的 Scene Graph 中，**HUD 可以随相机移动而相对定位**，甚至可以做 3D 翻转效果。

```javascript
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// 创建一个始终面向相机的 HUD 面板
function createFloatingLabel(text, position) {
    const div = document.createElement('div');
    div.className = 'floating-label';
    div.textContent = text;
    div.style.cssText = `
        padding: 8px 16px;
        background: rgba(0,0,0,0.7);
        color: #fff;
        border-radius: 8px;
        font-size: 14px;
        border: 1px solid rgba(100,200,255,0.5);
        backdrop-filter: blur(10px);
        white-space: nowrap;
    `;
    
    const cssObj = new CSS3DObject(div);
    cssObj.position.copy(position);
    cssObj.scale.set(0.01, 0.01, 0.01); // 缩放适配
    return cssObj;
}

// 添加到场景
const enemyLabel = createFloatingLabel('敌人 Lv.5', new THREE.Vector3(10, 2, -5));
scene.add(enemyLabel);

// 在动画循环中让标签始终面向相机
function animate() {
    enemyLabel.lookAt(camera.position);
}
```

---

## 四、Bruno Simon 案例中的 CSS HUD

Bruno Simon 的个人作品集是一个 Three.js 驱动的 3D 赛车游戏，他的 HUD 完全用 CSS 实现：

| HUD 元素 | CSS 技术 |
|---|---|
| **速度表** | CSS `conic-gradient` + `transform: rotate()` 模拟指针 |
| **任务提示** | CSS 打字机动画 (`@keyframes` + `steps()`) |
| **开始界面** | CSS 3D 翻转卡片 (`transform-style: preserve-3d`) |
| **加载进度** | CSS 进度条 + WebGL 渲染进度同步 |
| **控制说明** | CSS Grid 布局 + 键盘图标字体 |

核心技巧：**CSS 层只负责"看"，JavaScript 只负责"数据同步"**。

```javascript
// 速度数据从 Three.js 物理引擎同步到 CSS HUD
function updateSpeedometer(velocity) {
    const speed = velocity.length() * 3.6; // m/s → km/h
    const needle = document.querySelector('.speed-needle');
    const display = document.querySelector('.speed-value');
    
    // 指针旋转：0-240km/h 映射到 0-270度
    const angle = Math.min(speed / 240 * 270, 270);
    needle.style.transform = `rotate(${angle}deg)`;
    display.textContent = Math.floor(speed);
}
```

---

## 五、虚拟展厅中的 CSS HUD 设计

结合之前讨论的展厅方案，典型的 CSS HUD 包括：

```
┌─────────────────────────────────────┐
│  [展厅地图]  [当前位置: A区]   [时间] │  ← top-bar
├─────────────────────────────────────┤
│                                     │
│         + (准星/聚焦点)              │  ← center
│                                     │
├─────────────────────────────────────┤
│  [←] [→] 导航  |  [展品列表] [帮助]  │  ← bottom-bar
└─────────────────────────────────────┘
```

```css
.exhibition-hud {
    position: fixed;
    inset: 0;
    pointer-events: none;
    display: grid;
    grid-template-rows: auto 1fr auto;
    padding: 24px;
    z-index: 100;
}

.hud-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.hud-center {
    display: flex;
    align-items: center;
    justify-content: center;
}

.crosshair {
    width: 20px; height: 20px;
    border: 2px solid rgba(255,255,255,0.6);
    border-radius: 50%;
    position: relative;
}

.crosshair::after {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    width: 4px; height: 4px;
    background: #fff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
}

/* 悬停展品时准星变化 */
.crosshair.active {
    border-color: #64c8ff;
    box-shadow: 0 0 15px rgba(100,200,255,0.5);
}
```

---

## 六、一句话总结

> **CSS HUD = 用 HTML/CSS 做 3D 游戏的 UI 层，Three.js 专心渲染 3D 世界，CSS 专心做界面。** 两者通过 JavaScript 数据桥接，各司其职。