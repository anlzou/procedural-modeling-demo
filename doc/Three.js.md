# Three.js 项目介绍、分析与 3D 技术对比

## 一、Three.js 项目概述

**Three.js** 是由 Ricardo Cabello（Mr.doob）于 2010 年创建的 JavaScript 3D 渲染库，基于 WebGL/WebGPU 在浏览器中直接渲染 3D 图形。截至 2026 年，它已持续活跃开发超过 14 年，npm 周下载量超过 500 万次，是 Web 3D 领域使用最广泛的底层库。

**关键定位**：Three.js **不是游戏引擎**，而是一个**渲染库**。它提供场景图（Scene Graph）、相机、灯光、材质、几何体、加载器和渲染器，但**不提供**编辑器、物理引擎、实体系统或游戏循环架构——这些需要开发者自行搭建或从生态中引入。

**许可证**：MIT 开源协议，完全免费，无商业使用限制。

---

## 二、核心架构与技术特点

### 1. 渲染管线
| 特性 | 说明 |
|------|------|
| **主渲染器** | WebGL2（成熟默认），WebGPU（r171 起生产可用，2025 年 9 月发布） |
| **着色器编写** | GLSL + TSL（Three Shading Language）节点材质系统 |
| **PBR 支持** | 内置 `MeshStandardMaterial`，支持物理基础渲染 |
| **后处理** | 通过官方扩展支持，包含粒子、镜头光晕、实时反射/折射等 |
| **文件格式** | 支持 OBJ、FBX、GLTF/GLB、3DS、Collada、STL、Draco 等绝大多数行业标准格式 |

### 2. 设计理念
- **最小核心**：核心库保持精简（约 500KB~1MB gzipped），减少依赖体积
- **最大灵活**：不强制任何架构模式，开发者拥有对渲染管线的完全控制权
- **生态驱动**：通过官方仓库和社区维护数百个插件、扩展、控制器和特效

### 3. 2026 年关键进展
- **WebGPU 渲染器**已成熟可用，在计算着色器密集型场景中性能可达 WebGL 的 2~10 倍
- **TSL（Three Shading Language）**节点材质系统成为推荐方式，简化跨平台着色器编写
- 所有主要浏览器均已支持 WebGPU，可安全地以 WebGPU 为主、WebGL2 为降级方案

---

## 三、生态系统分析

Three.js 的强大不仅来自核心库，更来自其庞大的周边生态：

| 生态工具 | 作用 | 许可证 |
|---------|------|--------|
| **React Three Fiber (R3F)** | 将 Three.js 封装为声明式 React 组件，支持 Suspense、状态管理 | MIT |
| **@react-three/drei** | 提供数十个现成辅助组件（环境、控制器、加载器等） | MIT |
| **@react-three/rapier** | 集成 Rapier 物理引擎 | MIT |
| **@react-three/postprocessing** | 后处理效果封装 | MIT |
| **@react-three/xr** | WebXR/VR 支持 | MIT |
| **GSAP + Three.js** | 动画时间线控制 | 商业/开源 |

这种"核心极简 + 生态丰富"的模式，使 Three.js 既能保持轻量，又能通过组合满足复杂需求。

---

## 四、与其他 3D 技术的详细对比

### 对比总览表

| 维度 | Three.js | Babylon.js | PlayCanvas | Unity WebGL | Unreal WebGL | 原生 WebGL |
|------|----------|------------|------------|-------------|--------------|------------|
| **本质定位** | 渲染库 | 完整引擎 | 完整引擎 + 托管编辑器 | 桌面引擎的 Web 导出 | 桌面引擎的 Web 导出 | 底层图形 API |
| **架构** | 场景图 | 场景图 + 组件 | ECS | GameObject/组件 | Actor/组件 | 无（手动管理） |
| **脚本语言** | JavaScript/TS | TypeScript/JS | TypeScript/JS | C# → WASM | C++/蓝图 → WASM | JavaScript |
| **包体积** | ~500KB-1MB | ~1.8MB | 中等 | 10-50MB+ | 更大 | 0（手写） |
| **编辑器** | 无 | 免费 Web 编辑器 | 托管商业编辑器 | 桌面商业编辑器 | 桌面商业编辑器 | 无 |
| **物理引擎** | BYO（Rapier/Cannon） | 内置 Havok | Ammo 集成 | 内置 PhysX | 内置 Chaos | BYO |
| **WebGPU** | ✅ 生产可用 | ✅ 先进 | Beta | ❌ 无计划 | ❌ 无计划 | ✅ 直接访问 |
| **WebXR/VR** | 扩展 | 内置 | 扩展 | 插件 | 插件 | 手动实现 |
| **社区规模** | 最大 | 活跃 | 中等 | 极大（非 Web 专精） | 大 | 极小 |
| **商业背书** | 社区驱动 | Microsoft | Snap | Unity | Epic | 无 |
| **许可证** | MIT | MIT | 引擎 MIT，编辑器专有 | 专有（Pro $2,310/年/席） | 专有 | 无 |



---

### 各技术深度分析

#### 1. Three.js vs Babylon.js

**Babylon.js** 是微软团队支持的完整引擎，与 Three.js 形成最直接的对比：

| 优势（Babylon） | 优势（Three.js） |
|----------------|------------------|
| 开箱即用：内置物理（Havok）、动画状态机、粒子系统 | 包体积小，加载快（Babylon 约 1.8MB vs Three.js 约 700KB） |
| 免费 Web 编辑器 + Babylon Inspector | 社区最大，问题几乎都有现成解决方案 |
| WebXR 支持业界领先 | 完全控制渲染管线，无架构束缚 |
| TypeScript 体验优秀 | 与 React/Vue/Svelte 等前端框架集成更自然 |
| 更适合浏览器原生游戏 | 更适合产品展示、数据可视化、营销站点 |

**选型建议**：
- 做**浏览器游戏**或需要**内置物理/VR** → Babylon.js
- 做**产品配置器**、**营销站点**、**数据可视化**、**React 项目** → Three.js

#### 2. Three.js vs Unity WebGL

**Unity WebGL** 不是 Web 原生引擎，而是将 C# 项目编译为 WebAssembly + WebGL 的导出产物：

| 维度 | Three.js | Unity WebGL |
|------|----------|-------------|
| **包体积** | 2-5MB（含模型） | 15-50MB（空项目 2-4MB WASM） |
| **首屏时间** | 2-6 秒 | 8-30 秒 |
| **交互就绪** | <10 秒 | 15-45 秒 |
| **移动端性能** | CPU 开销低，持续 FPS 更高 |  draw call 成本高 10-30%，内存压力大 |
| **WebGPU** | ✅ 原生支持 | ❌ 仅 WebGL2，无 WebGPU 计划 |
| **SEO/可访问性** | 可与 DOM 混合，文本可爬取 | 黑盒 Canvas，无结构文本 |
| **团队技能** | JS/TS 前端开发者 | Unity/C# 开发者 |
| **许可成本** | $0 | Pro 版 $2,310/年/席 |



**选型建议**：
- 已有 Unity 项目需移植到 Web → Unity WebGL
- Web 优先、需快速加载、SEO 敏感、移动端为主 → Three.js

#### 3. Three.js vs PlayCanvas

**PlayCanvas** 是带托管编辑器的完整引擎，采用 ECS 架构：

| PlayCanvas 优势 | Three.js 优势 |
|----------------|---------------|
| 自带商业级编辑器，团队协作友好 | 不依赖第三方平台，完全自主托管 |
| 对移动端深度优化 | 包体积更小，生态更丰富 |
| 内置版本控制、资源流水线 | 与前端工具链（npm、Vite、Webpack）无缝集成 |
| 适合工作室风格的中型浏览器游戏 | 适合高度定制化、非游戏类 3D 体验 |

#### 4. Three.js vs 原生 WebGL

直接使用 WebGL API 意味着从零管理缓冲区、着色器编译、状态机、矩阵运算：

| 原生 WebGL | Three.js |
|-----------|----------|
| 零依赖，体积极小 | 约 500KB 核心，但省去数千行样板代码 |
| 学习曲线极陡（需理解 GPU 管线细节） | 抽象了场景图、相机、光照、材质等概念 |
| 性能上限最高（无抽象层开销） | 性能足够绝大多数应用，且自动处理视锥剔除等优化 |
| 适合 WebGL 教学或极端定制需求 | 适合所有生产级 Web 3D 项目 |

**结论**：2026 年几乎没有理由在生产力项目中使用原生 WebGL 而非 Three.js，除非有极端的体积限制或教育目的。

---

## 五、选型决策指南

### 选择 Three.js，如果你：
- ✅ 需要**完全控制**渲染管线和应用架构
- ✅ 项目基于 **React/Vue/Svelte** 等现代前端框架
- ✅ 追求**最小包体积**和**最快加载时间**
- ✅ 做**产品配置器**、**营销站点**、**数据可视化**、**艺术装置**
- ✅ 团队是 **JavaScript/TypeScript** 开发者
- ✅ 需要与 DOM、CSS、Web API 深度集成
- ✅ 看重**长期社区可持续性**（14 年历史，无商业依赖风险）

### 避开 Three.js，如果你：
- ❌ 需要**开箱即用的游戏系统**（物理、AI、寻路、动画状态机）→ 选 Babylon.js
- ❌ 团队已有 **Unity/C#** 资产和技能 → 选 Unity WebGL
- ❌ 需要**可视化编辑器**且不想写代码 → 选 PlayCanvas 或 Babylon.js
- ❌ 项目以**复杂物理模拟**或**企业级 VR/AR** 为核心 → 选 Babylon.js

---

## 六、总结

Three.js 在 2026 年依然是 **Web 3D 的"基础设施"**。它不是最强大的游戏引擎，也不是最轻量的底层 API，但它占据了**灵活性、生态规模、Web 原生性**的最佳平衡点。随着 WebGPU 的全面落地，Three.js 在计算密集型场景（粒子、后处理、AI 驱动的 3D）中的性能优势将进一步扩大。

对于绝大多数 Web 优先的 3D 项目——无论是品牌官网的沉浸式体验、电商产品展示、还是数据可视化大屏——Three.js 及其生态（特别是 React Three Fiber）仍是 2026 年的首选技术栈。

# Three.js 项目结构分析
基于对 Three.js GitHub 仓库实际代码结构的分析，我来详细介绍其项目架构和基于 examples 的不同使用方案。

---

## 一、Three.js 项目结构分析

### 1. 顶层目录结构

```
three.js/
├── build/              # 预构建产物（UMD、ES Module、WebGPU专用构建）
├── src/                # 核心库源码（~500KB 核心）
│   ├── cameras/        # 相机系统（PerspectiveCamera、OrthographicCamera等）
│   ├── core/           # 核心抽象（Object3D、BufferGeometry、Raycaster等）
│   ├── geometries/     # 内置几何体（BoxGeometry、SphereGeometry等）
│   ├── materials/      # 内置材质（MeshStandardMaterial、ShaderMaterial等）
│   ├── renderers/      # 渲染器（WebGLRenderer、WebGPURenderer）
│   ├── scenes/         # 场景与雾效
│   ├── lights/         # 灯光系统
│   ├── loaders/        # 基础加载器
│   ├── math/           # 数学库（Vector3、Matrix4、Quaternion等）
│   ├── animation/      # 动画系统（AnimationMixer、KeyframeTrack）
│   ├── audio/          # 3D音频
│   └── ...
├── examples/
│   ├── jsm/            # 官方扩展模块（ES Module格式）
│   │   ├── controls/   # 相机控制器
│   │   ├── loaders/    # 扩展加载器（GLTFLoader、FBXLoader等）
│   │   ├── postprocessing/  # 后处理系统
│   │   ├── physics/    # 物理引擎封装
│   │   ├── shaders/    # 现成Shader
│   │   └── ...
│   └── *.html          # 300+ 官方示例
├── docs/               # API文档
├── manual/             # 教程手册
└── editor/             # 基于Three.js的在线编辑器
```

### 2. 核心与扩展的分离设计

Three.js 采用**"最小核心 + 最大扩展"**的架构哲学：

| 层级 | 内容 | 引入方式 | 体积 |
|------|------|---------|------|
| **核心 (Core)** | Scene、Camera、Renderer、基础几何体/材质 | `import * as THREE from 'three'` | ~500KB |
| **官方扩展 (Addons)** | 控制器、加载器、后处理、物理、特效 | `import { X } from 'three/addons'` | 按需引入 |
| **社区生态** | React Three Fiber、Drei、Rapier等 | 独立npm包 | 按需安装 |

从 `package.json` 可以看到关键导出配置：
```json
{
  "exports": {
    ".": "./build/three.module.js",           // WebGL核心
    "./addons": "./examples/jsm/Addons.js",   // 官方扩展集合
    "./webgpu": "./build/three.webgpu.js",    // WebGPU渲染器
    "./tsl": "./build/three.tsl.js"           // Three Shading Language
  }
}
```

---

## 二、基于 Examples 的六大使用方案

根据 `examples/files.json` 中 300+ 示例的分类，可以归纳出以下六种典型使用方案：

---

### 方案一：基础 3D 展示（WebGL 标准渲染）

**适用场景**：产品展示、建筑可视化、数据可视化、营销页面

**核心示例**：
- `webgl_loader_gltf.html` — GLTF/GLB 模型加载（行业标准）
- `webgl_animation_keyframes.html` — 关键帧动画
- `webgl_materials_physical_transmission.html` — 物理材质（玻璃、水晶）
- `webgl_lights_physical.html` — 物理灯光系统

**典型代码模式**：
```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 标准三件套：Scene + Camera + Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;

// 加载外部模型
const loader = new GLTFLoader();
loader.load('model.glb', (gltf) => scene.add(gltf.scene));

// 轨道控制器
const controls = new OrbitControls(camera, renderer.domElement);
```

**技术要点**：PBR材质、环境贴图、后期色调映射、异步编译 (`renderer.compileAsync`)

---

### 方案二：高性能实例化与自定义几何

**适用场景**：大规模粒子系统、地形、点云、科学可视化

**核心示例**：
- `webgl_instancing_performance.html` — GPU实例化渲染
- `webgl_buffergeometry.html` — 自定义BufferGeometry
- `webgl_buffergeometry_instancing.html` — 实例化BufferGeometry
- `webgl_points_dynamic.html` — 动态点云
- `webgl_geometry_terrain.html` — 程序化地形

**关键技术**：
```javascript
// 实例化渲染：一次绘制调用渲染数千个相同几何体
const mesh = new THREE.InstancedMesh(geometry, material, count);
mesh.setMatrixAt(i, matrix);  // 设置每个实例的变换矩阵

// 自定义BufferGeometry：直接操作GPU缓冲区
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
```

**性能特征**：通过 `InstancedMesh` 和自定义 `BufferGeometry` 实现百万级对象渲染。

---

### 方案三：后处理与视觉效果

**适用场景**：影视级渲染、游戏特效、艺术装置

**核心示例**：
- `webgl_postprocessing_unreal_bloom.html` — 辉光效果
- `webgl_postprocessing_ssao.html` — 屏幕空间环境光遮蔽
- `webgl_postprocessing_dof.html` — 景深
- `webgl_postprocessing_gtao.html` — 全局光照近似
- `webgl_shadowmap_progressive.html` — 渐进式阴影

**架构模式**：
```javascript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(resolution, strength, radius, threshold));

// 动画循环中使用 composer 替代 renderer
function animate() {
    composer.render();
}
```

**效果栈**：可组合多个Pass实现复杂后期管线（Bloom + SSAO + DOF + ToneMapping）。

---

### 方案四：WebGPU 计算与下一代渲染

**适用场景**：需要 GPU 通用计算（GPGPU）、流体模拟、现代高性能应用

**核心示例**：
- `webgpu_compute_particles.html` — 计算着色器粒子
- `webgpu_compute_particles_fluid.html` — 流体模拟
- `webgpu_compute_cloth.html` — 布料模拟
- `webgpu_compute_water.html` — 水体计算
- `webgpu_tsl_*.html` — TSL节点材质系统

**关键迁移特征**：
```javascript
// WebGPU 渲染器替代 WebGLRenderer
import { WebGPURenderer } from 'three/webgpu';
import * as TSL from 'three/tsl';  // Three Shading Language

const renderer = new WebGPURenderer({ antialias: true });

// TSL 节点材质：声明式、跨平台（WebGL/WebGPU）
const material = new THREE.MeshStandardNodeMaterial({
    colorNode: TSL.texture(texture),
    roughness: 0.5
});
```

**性能优势**：WebGPU 在计算密集型场景中可达 WebGL 2~10 倍性能。

---

### 方案五：WebXR/VR/AR 沉浸式体验

**适用场景**：VR看房、AR试戴、沉浸式培训

**核心示例**：
- `webxr_vr_handinput.html` — 手部追踪
- `webxr_ar_hittest.html` — AR平面检测
- `webxr_ar_plane_detection.html` — AR平面识别
- `webxr_xr_dragging.html` — 空间交互
- `webgpu_xr_rollercoaster.html` — WebGPU + XR

**关键API**：
```javascript
import { XRButton } from 'three/addons/webxr/XRButton.js';

renderer.xr.enabled = true;
document.body.appendChild(XRButton.createButton(renderer));

// XR渲染循环
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
});
```

---

### 方案六：物理引擎集成与交互应用

**适用场景**：浏览器游戏、物理仿真、交互式配置器

**核心示例**：
- `physics_rapier_basic.html` — Rapier物理（Rust/WASM）
- `physics_ammo_break.html` — Ammo.js物理（Bullet）
- `physics_jolt_instancing.html` — JoltPhysics
- `games_fps.html` — 完整FPS游戏示例
- `webgl_interactive_voxelpainter.html` — 体素交互

**物理集成模式**：
```javascript
import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';

const physics = await RapierPhysics();
const mesh = new THREE.Mesh(geometry, material);
mesh.position.set(0, 5, 0);
physics.addMesh(mesh, /* mass */ 1);  // 自动同步物理与视觉
```

---

## 三、不同方案的选型决策树

```
开始
│
├─ 需要 VR/AR？ ──→ WebXR 方案（方案五）
│
├─ 需要物理模拟/游戏？ ──→ 物理引擎方案（方案六）
│
├─ 需要 GPU 计算/流体/现代API？ ──→ WebGPU 方案（方案四）
│
├─ 需要影视级后期效果？ ──→ 后处理方案（方案三）
│
├─ 需要渲染 >10,000 个对象？ ──→ 实例化方案（方案二）
│
└─ 一般 3D 展示/产品配置/数据可视化？ ──→ 标准 WebGL 方案（方案一）
```

---

## 四、现代推荐技术栈（2026）

基于仓库最新版本（r185）的演进方向：

| 传统方式 | 现代推荐方式 | 理由 |
|---------|------------|------|
| `WebGLRenderer` | `WebGPURenderer` | 性能更强，API更现代 |
| GLSL 手写 Shader | TSL 节点材质 | 跨平台、可组合、易维护 |
| `examples/jsm/controls/OrbitControls` | `@react-three/drei` (React生态) | 声明式、状态驱动 |
| 手动物理集成 | `@react-three/rapier` | 即插即用 |
| 独立 Three.js 项目 | React Three Fiber (R3F) | 与前端生态无缝集成 |

Three.js 的核心设计始终保持**最小核心 + 最大灵活**，通过 examples 展示了从最简单的旋转立方体到完整的 WebGPU 计算管线的全谱系能力，开发者可以根据项目需求选择合适的使用层级。

# 案例和相关的资源
 
 
以下是 Three.js 在真实世界中的案例、学习资源以及其技术上限与应用方向的全面分析。

---

## 一、Three.js 真实世界案例全景

Three.js 目前被 **3,483 家活跃公司** 使用，覆盖从创意工作室到财富 500 强企业，npm 周下载量达 **270 万次**，是 Babylon.js 的 270 倍。 2026 年 Q1，Awwwards 61% 的获奖网站使用了 Three.js。

### 1. 品牌与电商展示（最成熟方向）

| 案例 | 技术栈 | 亮点 | 奖项 |
|------|--------|------|------|
| **Cartier Watches & Wonders 2026** | Three.js + GLSL + GSAP + Lenis | 六个独立 3D 展厅，每款腕表一个空间，滚动在房间间穿梭 | Awwwards SOTD |
| **Shopify Editions Spring 2026** | Three.js + 粒子系统 + ScrollTrigger | 文字粒子消散重组，滚动驱动的产品故事 | — |
| **Oryzo (Lusion)** | Three.js + 惯性物理 + Z 轴滚动 | 单个产品的电影级渲染，鼠标惯性交互 | Awwwards SOTM + Developer Award |
| **Lacoste Ace Breaker** | Three.js/WebGL + 游戏机制 | 品牌网球主题打砖块游戏，真实奖品激励 | Awwwards Nominee |
| **IKEA Wall Decor Planner** | Three.js + Vue.js | 墙面装饰 3D 配置器 | FWA Of The Day |



### 2. 房地产与建筑可视化

| 案例 | 技术栈 | 亮点 | 奖项 |
|------|--------|------|------|
| **Hubtown** | Three.js + GSAP + 鼠标揭示 | 发光 3D 巨石悬浮水面，B2B 品牌旗舰体验 | Awwwards SOTD + Developer Award (2026.6) |
| **Explore Primland** | Three.js + 地形渲染 + 大气雾效 | 蓝岭山脉航拍飞越，地点探索体验 | Awwwards SOTD (2026.2) |



### 3. 创意叙事与内容

| 案例 | 技术栈 | 亮点 | 奖项 |
|------|--------|------|------|
| **Sleep Well Creative** | Three.js + 手绘风格 + 滚动叙事 | 睡眠科学指南，手绘插画与 3D 场景融合 | Awwwards SOTD (2026.1) |
| **IVRESS (Utsubo)** | WebGPU + TSL + WebGL Fallback | TSL 双后端着色器，同一份代码跑 WebGPU/WebGL | FWA SOTM (2026.5) |



### 4. 企业级与数据可视化

| 公司 | 应用场景 | 说明 |
|------|---------|------|
| **Ford** | 交互式车辆可视化 | 部署在 ford.com 主站 |
| **Bombardier** | 飞机内饰与配置展示 | 70 亿美元级航空企业 |
| **Morningstar** | 信用评级数据 3D 可视化 | DBRS 平台 |
| **NASA Glenn Research Center** | 卫星通信可视化、月球地形测绘 | 政府机构生产部署 |
| **C3.ai** | 企业 AI 数据可视化仪表板 | 企业级 SaaS |
| **Google** | Google Maps WebGL 3D 叠加层 | 官方维护 Three.js 集成库 |



### 5. 医疗与科学计算

| 案例 | 技术栈 | 成果 |
|------|--------|------|
| **MD Anderson Cancer Center** | Three.js | 癌症研究医疗可视化 |
| **OneFit Medical (膝关节置换)** | Three.js + WebGL | 将单骨 3D 建模从 **4 小时缩短到 1 小时** |
| **Segments.ai (LiDAR 标注)** | Three.js + WebGPU | 自动驾驶点云标注，WebGPU 带来 **100 倍性能提升** |



### 6. 游戏与互动娱乐

| 案例 | 技术栈 | 亮点 |
|------|--------|------|
| **Expo 2025 Osaka** | Three.js | 100 万粒子交互装置 |
| **Lacoste Ace Breaker** | Three.js/WebGL | 品牌微游戏，可玩性 + 真实奖品 |

---

## 二、Three.js 技术上限深度分析

### 当前上限（2026）

| 维度 | 上限表现 | 关键突破 |
|------|---------|---------|
| **渲染对象数** | 百万级粒子 / 数十万实例化网格 | `InstancedMesh` + WebGPU Compute Shaders |
| **纹理与材质** | KTX2/Basis Universal 压缩，内存降低 75% | `KTX2Loader` GPU 端解压 |
| **后处理管线** | Bloom + SSAO + DOF + SSR + TAA 全栈 | `EffectComposer` + 自定义 Pass |
| **物理模拟** | 百万单位粒子系统 | WebGPU Compute Shaders |
| **AI 集成** | 浏览器端 ML 推理可视化 | WebGPU Compute + Transformers.js |
| **3D 扫描** | Gaussian Splatting 实时渲染 | NeRF 照片级场景 60fps 浏览器运行 |



### 什么 Three.js 做不到（边界）

| 场景 | 限制 | 替代方案 |
|------|------|---------|
| 大型开放世界游戏 | 无内置 ECS、寻路、AI 状态机 | Babylon.js / Unity WebGL |
| 复杂多人在线 | 无内置网络同步 | 自建 + Socket.io / Colyseus |
| 超大规模 BIM (>500MB) | 内存与加载瓶颈 | 原生 WebGPU / 分块加载 |
| 影视级离线渲染 | 无光线追踪（仅路径追踪实验） | Unreal Engine / Blender |
| 原生移动端 App | 浏览器沙盒限制 | React Native + Unity / Flutter |



---

## 三、应用方向决策矩阵

```
                    高冲击力
                       ↑
    品牌体验站 ●       │       ● 产品配置器
    建筑可视化 ●       │       ● AI推理可视化
                       │
    VR/AR体验  ●       │       ● 数据可视化
    浏览器游戏 ●       │       ● 医疗影像
                       │
    科学模拟   ●───────┼───────● 
             低复杂度              高复杂度
                       ↓
                    低冲击力
```

**成熟度标签**：
- 🔴 **高**：产品配置器、品牌体验站、建筑可视化 — 生产就绪，大量成功案例
- 🟡 **中**：数据可视化、浏览器游戏、医疗影像 — 技术可行，需定制开发
- 🔵 **低**：科学模拟 — 需要深度 GPU 编程
- 🟣 **新兴**：AI 推理可视化、Gaussian Splatting — 2026 年新方向

---

## 四、完整学习资源与生态图谱

### 官方资源
| 资源 | 内容 | 链接 |
|------|------|------|
| **threejs.org** | 300+ 官方示例、完整 API 文档、手册教程 | https://threejs.org |
| **GitHub 仓库** | 核心源码、examples/jsm 扩展、issue 讨论 | https://github.com/mrdoob/three.js |

### 系统课程（付费）
| 课程 | 时长 | 特色 | 链接 |
|------|------|------|------|
| **Three.js Journey (Bruno Simon)** | 93 小时 | 45K+ 学员，4.8/5，含 Blender 建模 | https://threejs-journey.com |
| **Three.js Bootcamp (ZTM)** | 20 小时 | 物理引擎、角色控制、作品集项目 | https://zerotomastery.io |
| **SimonDev Course** | — | Shader 编程深度，预售价 $150 | https://simondev.io |

### 免费教程
| 资源 | 类型 | 特色 | 链接 |
|------|------|------|------|
| **Wael Yasmina** | YouTube | 766K+ 观看，WebGL/Three.js 系统讲解 | youtube.com/@WawaSensei |
| **Chris Courses** | YouTube | Vite + Three.js，交互地球自定义 Shader | youtube.com/@ChrisCourses |
| **Andrew Woan** | YouTube | 9 小时 Blender + Three.js 房间作品集 | youtube.com/@andrewwoan |
| **The Book of Shaders** | 互动书籍 | GLSL 最佳入门，浏览器直接编辑 | https://thebookofshaders.com |
| **Three.js Roadmap** | 学习路径 | 结构化路线，混合免费与付费 | https://threejsroadmap.com |

### React 生态（现代推荐）
| 工具 | 作用 | 链接 |
|------|------|------|
| **React Three Fiber (R3F)** | React 声明式 Three.js 渲染器 | https://docs.pmnd.rs/react-three-fiber |
| **Drei** | R3F 辅助组件库（环境、控制器、加载器） | https://github.com/pmndrs/drei |
| **Rapier Physics** | Rust/WASM 物理引擎集成 | https://github.com/pmndrs/react-three-rapier |

### 社区与灵感
| 平台 | 用途 | 链接 |
|------|------|------|
| **Awwwards** | 灵感来源，61% 获奖站用 Three.js | https://awwwards.com |
| **r/threejs** | Reddit 社区，问题解答 | https://reddit.com/r/threejs |
| **Three.js Discord** | 官方实时社区 | https://discord.gg/threejs |
| **Codrops** | 深度技术案例拆解 | https://tympanus.net/codrops |

### 必备工具
| 工具 | 用途 | 链接 |
|------|------|------|
| **Blender** | 3D 建模，导出 GLTF/GLB | https://blender.org |
| **GSAP** | 动画时间线控制（ScrollTrigger） | https://greensock.com/gsap |
| **glTF Pipeline** | Draco 压缩、KTX2 纹理优化 | https://github.com/KhronosGroup/glTF-Pipeline |

---

## 五、总结：Three.js 的上限在哪里？

Three.js 的上限不是一个固定的数字，而是一个**不断扩展的边界**：

1. **当前上限**：百万级粒子、影视级后处理、照片级 PBR 渲染、浏览器端 AI 推理可视化
2. **2026 新边界**：WebGPU 通用计算、Gaussian Splatting 实时 NeRF、TSL 跨平台着色器
3. **不可替代的优势**：包体积极小（~500KB）、与前端生态无缝集成、MIT 免费商用、社区规模碾压级
4. **不适合的场景**：需要内置游戏系统（ECS/寻路/AI）、超大规模 BIM（>500MB）、影视级离线光线追踪

**一句话**：Three.js 的上限，取决于你愿意在 JavaScript 和 GPU 之间走多深。对于 Web 优先的 3D 体验，它已经是事实上的行业标准，且这个地位在 WebGPU 时代只会更加巩固。