# 🎨 procedural-modeling-demo（程序化 3D 生成演示）

> 基于 **Vue 3 + Vite + Three.js** 的 3D 程序化生成演示项目，展示多种 3D 建模技术。

---

## 📖 简介

使用 **Vue 3 + Vite + Three.js** 实现 6 种 3D 渲染/建模路径，每个路径都配有可交互的 Demo 页面。

**路径一览：**

| 路径 | 核心思想 | 特点 |
|------|---------|------|
| 🔮 **SDF + Raymarching** | 符号距离函数 + 光线步进 | 无限细节，纯 Shader 渲染 |
| 🧊 **Marching Cubes** | 等值面提取算法 | 真实 Mesh，5 种场函数 |
| 🌀 **Parametric Geometry** | 参数化曲面 f(u,v)→(x,y,z) | 精确数学控制，适合艺术曲面 |
| 🌿 **L-System / 分形** | 字符串重写规则生成递归结构 | 12 种预设，生长动画 |
| 🧪 **CSS3D 渲染** | CSS3DRenderer 将 HTML 渲染到 3D 空间 | 元素周期表 + 产品展示，Bloom 后处理，玻璃展柜 |
| 🌊 **WebGPU Ocean** | WebGPU + Three.js TSL 节点着色器 | 实时程序化海洋，Gerstner 波，自适应画质 |

---

## ✨ 功能特性

### 🔮 路径 1：SDF + Raymarching

- **SDF 基本体**：球体 (`sdSphere`)、立方体 (`sdBox`)、圆环 (`sdTorus`)、圆柱 (`sdCylinder`)
- **布尔运算**：并集、交集、差集、平滑并集（有机过渡）
- **域操作**：扭曲变形 (`opTwist`)、表面位移 (`opDisplace`)
- **分形**：Mandelbulb 分形
- **光照**：漫反射 + 高光 + 雾效，摄像机自动环绕
- **5 种复杂 Three.js 模型**（默认隐藏，通过面板切换显示）：
  - 🌀 **螺旋弹簧** — CatmullRomCurve3 + TubeGeometry 螺旋路径
  - 🧬 **DNA 双螺旋** — 双螺旋管 + CylinderGeometry 横档连接
  - 🌟 **超公式曲面** — 自定义 BufferGeometry 参数化球面
  - 🔺 **谢尔宾斯基四面体** — 递归 3 层分形，64 个小四面体
  - ✦ **星芒多面体** — 二十面体核心 + 面延伸锥体尖刺
- **基本体组合显隐** — 8 个 Three.js 模型一键统一切换

### 🧊 路径 2：Marching Cubes（等值面提取）

- **完整算法实现**：含 edgeTable (256) + triTable (256×16) 查找表
- **5 种标量场函数**，一键切换：
  - 🧬 **Metaball 集群** — ∑(r²/d²) − 1 多个球体有机融合
  - 🔮 **多球聚集** — 12 个随机 Metaball 聚集
  - 🧊 **Schwarz P 曲面** — cos(x)+cos(y)+cos(z)=0 三重周期极小曲面
  - 🌀 **Gyroid 曲面** — sin(x)cos(y)+sin(y)cos(z)+sin(z)cos(x)=0 螺旋通道
  - 💎 **Diamond 晶格** — 三重周期金刚石曲面
- **可配置采样范围** — 防止模型被体积边界切割
- **软窗口衰减** — 余弦平滑边界，表面自然消隐
- **顶点法线平滑** — 位置哈希合并 + 平均法线，消除面片感
- **绕序自动修正** — 检测朝内三角面并翻转，0% 错误法线
- **非索引几何体** — 避免薄壁法线对消
- **交互**：OrbitControls 拖拽旋转/缩放/自动旋转

### 🌀 路径 3：Parametric Geometry（参数化曲面）

- **莫比乌斯环** (Möbius Strip)
- **克莱因瓶** (Klein Bottle)
- **超级公式** (Superformula)：可调参数生成各种有机形状
- **波浪曲面**：顶点实时动态动画
- **螺旋面** (Helicoid)
- **一键切换**不同曲面类型

### 🌿 路径 4：L-System / 分形植物

- **12 种预设**，按分类展示：
  - 🌿 **植物类**（5 种）：植物、分形树、蕨类植物、复杂分形树、分形灌木
  - 🔺 **分形类**（4 种）：龙曲线、谢尔宾斯基、科赫雪花、莱维C形曲线
  - 📐 **曲线类**（3 种）：希尔伯特曲线、高斯帕曲线、六角环
- **🌳 3D 复杂大树** — 多部件模型：树干（棕色 F）+ 树叶（绿色 G），X 规则递归，3 轴立体分支
- **动态生长动画**：点击 ▶ 从根部逐渐生长到完整形态
- **随机分支数量**（植物类）：每次生长随机选择 50%~100% 迭代次数
- **生长速度控制** + **进度条**显示
- **状态栈** `[ ]` 实现分支递归
- **圆柱体分段渲染** — 每段独立构建 CylinderGeometry，合并为完整 BufferGeometry
- **3D 分支** — 使用 `&`（X 轴俯仰）、`^`、`+`（Z 轴偏航）、`-`、`<`（Y 轴滚转）、`>` 实现三维空间分支
- **双符号绘制**：`F` 绘制树干/枝条，`G` 绘制树叶（不同长度、不同颜色）
- **视图自动居中** — 根据模型包围盒调整相机位置

### 🧪 路径 5：CSS3D 渲染

提供两种展示模型，通过路由 `/css3d` 进入后可切换：

#### 📋 元素周期表（PeriodicTable）

- **CSS3DRenderer** — Three.js 的 CSS3D 渲染器，将 HTML 元素渲染到 3D 空间
- **CSS3DObject** — 将 DOM 元素包裹为 3D 物体，支持位置/旋转/缩放
- **TrackballControls** — 自由轨道控制相机
- **118 种化学元素**，完整数据（符号、中英文名、原子量、分类、电子排布、熔点、沸点、发现年份、描述）
- **四种布局动画**：
  - 📋 **TABLE** — 二维元素周期表布局
  - 🌐 **SPHERE** — 斐波那契球面分布
  - 🌀 **HELIX** — 螺旋线分布
  - 📦 **GRID** — 三维网格分布
- **TWEEN 平滑过渡** — Exponential.InOut 缓动，每次布局切换随机时长 2~4s
- **自动旋转动画** — 支持播放/暂停 + 速度控制（Space 快捷键）
- **元素搜索系统**：
  - 支持符号（Fe）、中文名（铁）、英文名（Iron）模糊搜索
  - 搜索结果实时预览，↑↓ 键盘选择，Enter 定位
  - ESC 清除搜索并重置视角
- **3D 坐标投影点击检测** — 通过 `Vector3.project(camera)` 投影到 NDC 空间，绕过 CSS3DRenderer 的 pointer-events 限制
- **元素详情弹窗**（`ElementDetail`）：
  - Teleport 到 body 层级，避免 CSS3D 渲染遮挡
  - 玻璃透明风格（`backdrop-filter: blur(20px)`）
  - 完整信息展示，淡入淡出 + 缩放过渡
- **呼吸灯效果** — 选中元素卡片脉冲发光动画

#### 📦 产品展示（ProductShowcase）

- **双渲染器叠加** — WebGL（粒子 + Bloom 后处理）作为背景层，CSS3D（产品卡片 + 玻璃展柜）作为前景层
- **6 面 CSS3D 产品卡片**：
  - 3D 盒子结构（front/back/left/right/top/bottom），`transform-style: preserve-3d`
  - **毛玻璃正面** — `backdrop-filter: blur(10px)` + 半透明渐变，模拟玻璃质感
  - **侧面玻璃切面** — 极淡白色渐变，呈现玻璃厚度
  - **故障灯光效果** — 背部整面发光，常亮 + 随机熄灭闪烁，模拟真实灯光故障
  - 点击卡片 180° 翻转动画（`easeOutCubic` 缓动）
  - 鼠标跟随倾斜（`rotateX/Y` 基于鼠标位置）
- **玻璃展柜**（`createGlassCase`）：
  - 6 面透明玻璃盒，半透明渐变边框
  - **顶面圆环灯带** — 脉冲呼吸动画，多层 `box-shadow` 辉光
  - **内圈光晕** — 径向渐变，与灯带同步脉冲
  - **内部发光立方体** — 6 面独立，`cubeGlow` 动画，悬浮浮动
  - **磨砂底座** — 呼吸灯效果（`breatheLight` 动画）
  - 外圈轨道环匀速旋转
  - 整体上下浮动（`Math.sin(time)`）
- **WebGL 粒子系统** — 200 个随机散布粒子，缓慢旋转
- **双点光源** — 蓝紫（`0x64c8ff`）+ 品红（`0xff64c8`）脉冲
- **UnrealBloomPass** — Bloom 辉光后期处理
- **点击检测** — 3D 投影 NDC 坐标计算，支持点击卡片或展柜
- **旋转中心自适应** — 点击后根据可见模型调整 OrbitControls.target
- **模型独立显隐** — 信息面板中按钮分别控制卡片/展柜可见性

#### 🎨 模型灯光控制（控制面板）

| 控制 | 说明 |
|------|------|
| 📦 卡片亮度 | 滑块 0~2x，调节卡片背光/正面透光强度 |
| 🗄️ 展柜亮度 | 滑块 0~2x，调节展柜所有发光元素亮度 |
| 📦 卡片颜色 | 颜色选择器，修改卡片灯光颜色 |
| 🗄️ 展柜颜色 | 颜色选择器，同步修改圆环灯带、内圈光晕、立方体、底座、轨道环颜色 |
| 🔄 重置灯光 | 恢复默认亮度 1x、颜色 `#64dcff` |

展柜灯光颜色通过 **CSS 自定义属性**（`--gr`/`--gg`/`--gb`）实现，所有 `@keyframes` 动画（`breatheLight`、`ringPulse`、`cubeGlow`）实时跟随颜色变化。

### 🌊 路径 6：WebGPU Ocean（WebGPU 实时海洋）

> 实时程序化海洋渲染 — WebGPU · Three.js TSL · Gerstner 波 · FBM 微表面 · 光谱天空

- **🌊 程序化波浪** — 五方向 Gerstner 涌浪叠加（波长 5→60），含解析法线/切线计算
- **🌅 动态天空** — 基于太阳位置的光谱散射天空（天顶 ↔ 地平线插值）+ 程序化云层
- **☀️ 时段切换** — 午夜 → 晨曦 → 正午 → 黄昏 → 午夜，颜色平滑插值
- **✨ 光照特效** — Fresnel 天空反射、Bloom 泛光、噪声调制的太阳闪烁、波峰泡沫
- **🖥️ 自适应画质** — 5 级质量档位，GPU 基准测试 + 实时 FPS 监控自动升降档
- **🌐 中英文切换** — 一键切换界面语言
- **🐟 Boids 鱼群模拟** — 集成自 [RippleAquarium](https://github.com/SeanWong17/RippleAquarium) 的完整 Boids 鱼群系统（沙丁鱼 + 锦鲤），含空间哈希网格、InstancedMesh 渲染、鱼体曲线变形着色器、鱼眼相机
- **🎛️ 鱼群控制** — 沙丁鱼/锦鲤独立参数（数量、速度、感知范围、分离强度、避障强度、转向速度、顶部回避）
- **📐 可调鱼缸** — 虚拟鱼缸大小 20×20 ~ 100×100，边框显隐切换
- **控制面板** — 左上角 InfoPanel 集成海况/时段/画质/鱼缸/鱼群控制 + 右下角性能监控与面板透明度

---

### 🖥️ 通用控制面板

所有 3D 页面共享的控制面板（右下角）提供：

| 功能 | 说明 | 适用页面 |
|------|------|---------|
| 📊 **性能监控** | FPS、内存占用、对象数实时显示（固定区域） | 所有 |
| 💡 **光源控制** | 各光源独立开关 + 全局强度滑块 (0~2x) | 带光源的页面 |
| 🎨 **模型灯光** | 卡片/展柜独立亮度 (0~2x) + 颜色选择 + 重置 | 仅产品展示 |
| 🔄 **动画控制** | 播放/暂停 + 速度滑块 (0~3x) | SDF / Cubes / Parametric / LSystem / CSS3D |
| 🌱 **生长控制** | LSystem 页面：生长播放/暂停 + 速度滑块 + 进度条 | 仅 LSystem |
| 🎯 **布局切换** | CSS3D 页面：TABLE / SPHERE / HELIX / GRID 四布局（插槽） | 仅周期表 |
| 🔍 **面板透明度** | 背景透明度滑条（控制面板 + 信息面板同步） | 所有 |
| 📌 **置顶** | 点击置顶按钮后面板不自动收起 | 所有 |

控制面板采用**固定头部 + 滚动底部**布局，性能监控区固定，其余区域可弹性滚动。各功能模块按需显示（通过 prop 控制），不同页面展示不同组合。

### 📋 信息面板

左上角 `?` 图标展开，采用 **固定标题 + 滚动内容** 布局，支持弹性滚动效果。

- **L-System 页面**：预设按钮按分类（植物/分形/曲线）分组展示
- **CSS3D 页面**：2×2 网格布局展示快捷键、鼠标操作、搜索提示、布局说明 + 模型选择按钮
- **OpenSea 页面**：海况/时段滑条、画质指示、漫游/语言切换、FPS 显示

---

## 📁 项目结构

```
procedural-modeling-demo/
├── index.html                      # 入口 HTML
├── package.json                    # 依赖配置
├── vite.config.js                  # Vite 配置
├── README.md                       # 本文件
│
├── src/
│   ├── main.js                     # Vue 应用入口，挂载 Router
│   ├── App.vue                     # 根组件（含导航栏）
│   ├── style.css                   # 全局样式
│   │
│   ├── router/
│   │   └── index.js                # Vue Router 路由配置（5 条路由）
│   │
│   ├── shaders/
│   │   ├── raymarching.vert        # SDF 顶点着色器
│   │   └── raymarching.frag        # SDF 片段着色器（SDF 函数 + Raymarching 循环）
│   │
│   ├── utils/
│   │   ├── marchingCubes.js        # Marching Cubes 算法 + 5 种场函数 + MC_PRESETS
│   │   ├── lsystem.js              # L-System 生成器 + 12 种预设 + 多部件支持
│   │   └── elementData.js          # 118 种化学元素完整数据 + 搜索函数
│   │
│   ├── views/
│   │   ├── Home.vue                # 首页 - 六张导航卡片
│   │   ├── SDFRaymarching.vue      # 🔮 路径 1
│   │   ├── MarchingCubes.vue       # 🧊 路径 2（预设切换、居中视图）
│   │   ├── ParametricGeometry.vue  # 🌀 路径 3
│   │   ├── LSystem.vue             # 🌿 路径 4（生长动画、分类分组、多色渲染）
│   │   ├── CSS3DRenderer/
│   │   │    ├── CSS3DRenderer.vue    # 🧪 路径 5 入口，模型切换
│   │   │    ├── PeriodicTable.vue    # 📋 元素周期表
│   │   │    └── ProductShowcase.vue  # 📦 产品展示（玻璃展柜、粒子、Bloom）
│   │   └── OpenSea/
│   │       ├── OpenSea.vue         # 🌊 路径 6（WebGPU 海洋，TSL 节点着色器）
│   │       └── fish/               # 鱼群系统
│   │           └── models          # 鱼模型
│   │
│   └── components/
│       ├── ControlPanel.vue        # 右下角控制面板（性能+灯光+动画+生长+透明度）
│       ├── InfoPanel.vue           # 左上角信息面板（固定标题+滚动内容，#header 插槽）
│       ├── FeaturePanel.vue        # 底部功能面板（展开/折叠、插槽支持）
│       └── ElementDetail.vue       # 元素详情弹窗（Teleport、玻璃透明、完整信息）
│
└── public/
    └── favicon.svg                 # 网站图标
```

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Vue 3](https://vuejs.org/) | ^3.5+ | 前端框架 |
| [Vite](https://vitejs.dev/) | ^8.1+ | 构建工具 |
| [Three.js](https://threejs.org/) | ^0.185+ | 3D 渲染引擎（WebGL / WebGPU） |
| [Three.js TSL](https://threejs.org/docs/#manual/en/introduction/Node-system) | — | 节点式着色器系统（OpenSea 使用） |
| [Vue Router](https://router.vuejs.org/) | ^4.6+ | 前端路由 |
| [@tweenjs/tween.js](https://github.com/tweenjs/tween.js) | ^25+ | CSS3D 布局过渡动画 |

---

## ⚡ 性能优化

### 按需加载策略

项目采用**路由级动态导入 + 组件级懒加载**，确保首页轻量快速：

| 机制 | 说明 | 效果 |
|------|------|------|
| **路由动态导入** | 所有子页面使用 `() => import(...)` | 首页仅加载 ~106 KB |
| **组件懒加载** | `ControlPanel` 使用 `defineAsyncComponent` | 进入 3D 页面时才下载 ~8.5 KB |
| **Three.js 独立 chunk** | `manualChunks` 提取 `three` / `three/webgpu` | 全局共享一份，gzip ~337 KB |

### 构建产物

| 文件 | 大小 | 说明 |
|------|------|------|
| `index-xxx.js` | **~106 KB** | 首页：仅 Vue + Router + Home 组件 |
| `three-xxx.js` | **~1,283 KB (gzip 337 KB)** | Three.js 核心库，全局共享一份 |
| `ControlPanel-xxx.js` | **~8.5 KB** | 控制面板（进入 3D 页面后按需加载） |
| 各视图 chunk | **~5-45 KB** | 每个页面仅含自身代码，共享 three chunk |
| `OpenSea-xxx.js` | **~14 KB** | OpenSea 视图代码（不含 three/webgpu） |

> 三个体积较大的 Three.js 后端（`three` / `three/webgpu` / `three/addons`）被提取为独立 chunk，不会重复打包到每个页面中。浏览器缓存一次后，所有页面共享。

---

## 🚀 运行方式

```bash
# 1. 进入项目目录
cd procedural-modeling-demo

# 2. 安装依赖（如果尚未安装）
pnpm install

# 3. 启动开发服务器
pnpm dev

# 4. 构建生产版本
pnpm build

# 5. 预览生产构建
pnpm preview
```

启动后浏览器访问 http://localhost:5173/（如果端口被占用会自动递增）。

---

## 📚 参考

- [Kimi 分享 - 骨骼绑定与 Three.js 纯函数建模路径](https://www.kimi.com/share/19f8a275-5cf2-807a-8000-00002143699d)
- [Three.js 官方文档](https://threejs.org/docs/)
- [Three.js CSS3D Periodic Table 示例](https://threejs.org/examples/#css3d_periodictable) — 元素周期表布局与 TWEEN 动画来源
- [Vue 3 官方文档](https://vuejs.org/guide/introduction.html)
- [Vite 官方文档](https://vitejs.dev/guide/)
- [@tweenjs/tween.js](https://github.com/tweenjs/tween.js) — JavaScript 平滑动画效果库

## 深入学习

### 📚 技术文档

`doc/` 文件夹中收录了本项目相关的核心技术文档，点击标题即可打开：

| 文档 | 简介 |
|------|------|
| [Three.js.md](doc/Three.js.md) | Three.js 项目概述、核心架构、渲染管线及主流 3D 技术对比分析 |
| [CSS3DRenderer、CSS HUD.md](doc/CSS3DRenderer%E3%80%81CSS%20HUD.md) | CSS3DRenderer 原理、CSS 3D Transforms、CSS HUD 覆盖层技术详解 |
| [OpenCV、MediaPipe、WebAssembly.md](doc/OpenCV%E3%80%81MediaPipe%E3%80%81WebAssembly.md) | OpenCV 计算机视觉、MediaPipe AI 感知与 WebAssembly 跨平台运行时详解 |
| [PolygonFileFormat.md](doc/PolygonFileFormat.md) | PLY（Polygon File Format）多边形文件格式结构、编码与解析 |
| [3DGaussianSplatting.md](doc/3DGaussianSplatting.md) | 3D Gaussian Splatting（高斯泼溅）技术原理、数学推导与实现细节 |
| [OpenSea.md](doc/OpenSea.md) | Open Sea 实时程序化海洋渲染 — WebGPU · Three.js TSL 技术详解 |

---

## 🙏 致谢与开源声明

本项目参考、改编并集成了以下开源项目和资源：

| 项目 | 说明 |
|------|------|
| [RippleAquarium](https://github.com/SeanWong17/RippleAquarium) (AGPL-3.0) | Boids 鱼群模拟（沙丁鱼 + 锦鲤）、InstancedMesh 鱼群渲染、鱼体曲线变形着色器、鱼眼相机系统、鱼模型 (`cartoon.glb`) 均改编自该项目 |
| [vibe-motion/threejs-boids](https://github.com/vibe-motion/threejs-boids) | RippleAquarium 上游：Boids 算法基础与实例化鱼群渲染起点 |

### 模型资源

| 文件 | 来源 | 许可 |
|------|------|------|
| `src/views/OpenSea/fish/cartoon.glb` | RippleAquarium 项目（上游来自 Jaydeep-P/aquarium） | AGPL-3.0 |

### 许可声明

本项目部分代码（鱼群模拟模块：`src/views/OpenSea/fish/`）改编自 [RippleAquarium](https://github.com/SeanWong17/RippleAquarium)，其原始代码采用 **GNU Affero General Public License v3.0 (AGPL-3.0)**。根据 AGPL-3.0 的要求：

1. 如果你部署或分发本项目的完整副本，必须同时提供完整的源代码。
2. 如果你通过网络（如网站）向用户提供本项目的功能，必须允许用户下载完整的对应源代码。
3. 上述鱼群模拟模块的修改版本同样受 AGPL-3.0 约束。

除鱼群模拟模块外，本项目其余部分采用 **MIT License**（详见 `LICENSE` 文件，如存在）。

> 以上声明仅适用于从 RippleAquarium 改编的代码。如果你对 AGPL 条款有疑问，或需要以不同条款使用该模块，请联系原作者。