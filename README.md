# 🎨 procedural-modeling-demo（程序化 3D 生成演示）

> 基于 **Vue 3 + Vite + Three.js** 的 3D 程序化生成演示项目，展示多种 3D 建模技术。

---

## 📖 简介

使用 **Vue 3 + Vite + Three.js** 实现 5 种 3D 渲染/建模路径，每个路径都配有可交互的 Demo 页面。

**路径一览：**

| 路径 | 核心思想 | 特点 |
|------|---------|------|
| 🔮 **SDF + Raymarching** | 符号距离函数 + 光线步进 | 无限细节，纯 Shader 渲染 |
| 🧊 **Marching Cubes** | 等值面提取算法 | 真实 Mesh，5 种场函数 |
| 🌀 **Parametric Geometry** | 参数化曲面 f(u,v)→(x,y,z) | 精确数学控制，适合艺术曲面 |
| 🌿 **L-System / 分形** | 字符串重写规则生成递归结构 | 12 种预设，生长动画 |
| 🧪 **CSS3D 渲染** | CSS3DRenderer 将 HTML 渲染到 3D 空间 | 4 种布局，TWEEN 动画 |

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

- **CSS3DRenderer** — Three.js 的 CSS3D 渲染器，将 HTML 元素渲染到 3D 空间
- **CSS3DObject** — 将 DOM 元素包裹为 3D 物体，支持位置/旋转/缩放
- **TrackballControls** — 自由轨道控制相机
- **四种布局动画**：
  - 📋 **TABLE** — 二维元素周期表布局
  - 🌐 **SPHERE** — 斐波那契球面分布
  - 🌀 **HELIX** — 螺旋线分布
  - 📦 **GRID** — 三维网格分布
- **TWEEN 平滑过渡** — Exponential.InOut 缓动，每次布局切换随机时长 2~4s
- **自动旋转动画** — 支持播放/暂停 + 速度控制
- **模型列表** — 可扩展架构，当前模型：
  - 🧪 **元素周期表** — 118 种化学元素卡片，含原子序数、符号、名称、质量
- **可横向扩展** — 后续 CSS3D 模型只需在 `css3dModels` 对象中追加

### 🖥️ 通用控制面板

所有 3D 页面共享的控制面板（右下角）提供：

| 功能 | 说明 |
|------|------|
| 📊 **性能监控** | FPS、内存占用、对象数实时显示（固定区域） |
| 💡 **光源控制** | 各光源独立开关 + 全局强度滑块 (0~2x) |
| 🔄 **动画控制** | 播放/暂停 + 速度滑块 (0~3x) |
| 🌱 **生长控制** | LSystem 页面：生长播放/暂停 + 速度滑块 + 进度条 |
| 🎯 **布局切换** | CSS3D 页面：TABLE / SPHERE / HELIX / GRID 四布局（插槽） |
| 🔍 **面板透明度** | 背景透明度滑条 |
| 📌 **置顶** | 点击置顶按钮后面板不自动收起 |

控制面板采用**固定头部 + 滚动底部**布局，性能监控区固定，其余区域可弹性滚动。

### 📋 信息面板

左上角 `?` 图标展开，采用 **固定标题 + 滚动内容** 布局，支持弹性滚动效果。L-System 页面预设按钮按分类（植物/分形/曲线）分组展示。

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
│   │   └── lsystem.js              # L-System 生成器 + 12 种预设 + 多部件支持
│   │
│   ├── views/
│   │   ├── Home.vue                # 首页 - 四张导航卡片
│   │   ├── SDFRaymarching.vue      # 🔮 路径 1
│   │   ├── MarchingCubes.vue       # 🧊 路径 2（预设切换、居中视图）
│   │   ├── ParametricGeometry.vue  # 🌀 路径 3
│   │   └── LSystem.vue             # 🌿 路径 4（生长动画、分类分组、多色渲染）
│   │
│   └── components/
│       ├── ControlPanel.vue        # 右下角控制面板（固定性能+滚动控制+生长控制）
│       └── InfoPanel.vue           # 左上角信息面板（固定标题+滚动内容，#header 插槽）
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
| [Three.js](https://threejs.org/) | ^0.185+ | 3D 渲染引擎 |
| [Vue Router](https://router.vuejs.org/) | ^4.6+ | 前端路由 |
| [@tweenjs/tween.js](https://github.com/tweenjs/tween.js) | ^25+ | CSS3D 布局过渡动画 |

---

## 🚀 运行方式

```bash
# 1. 进入项目目录
cd procedural-modeling-demo

# 2. 安装依赖（如果尚未安装）
npm install

# 3. 启动开发服务器
npm run dev

# 4. 构建生产版本
npm run build

# 5. 预览生产构建
npm run preview
```

启动后浏览器访问 http://localhost:5173/（如果端口被占用会自动递增）。

---

## 🏗️ 项目生成步骤

```bash
# 1. 创建 Vue + Vite 项目
npm create vite@latest procedural-modeling-demo -- --template vue

# 2. 进入项目
cd procedural-modeling-demo

# 3. 安装 Three.js 和 Vue Router
npm install three vue-router@4

# 4. 创建目录结构
mkdir -p src/router src/views src/components src/utils src/shaders
```

---

## 🧭 路由说明

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `Home.vue` | 首页，导航卡片 |
| `/sdf-raymarching` | `SDFRaymarching.vue` | SDF + Raymarching |
| `/marching-cubes` | `MarchingCubes.vue` | Marching Cubes |
| `/parametric` | `ParametricGeometry.vue` | 参数化曲面 |
| `/lsystem` | `LSystem.vue` | L-System 分形 |
| `/css3d` | `CSS3DRenderer.vue` | CSS3D 渲染 |

---

## 📊 L-System 预设一览

### 🌿 植物类
| 预设 | 公理 | 规则 | 角度 | 迭代 |
|------|------|------|------|------|
| 植物 | `X` | X→F[&+X][^-X][&X][^+X], F→FF | 28° | 5 |
| 分形树 | `F` | F→F[&+F][^-F][&F][^+F]F | 22° | 5 |
| 蕨类植物 | `X` | X→F[&+X][^-X][&X][^+X], F→FF | 22° | 6 |
| 🌳 3D 复杂大树 | `X` | X→FFF[&+GGG][\<\&+GGG][\>\&+GGG][&+X][\<\&+X][\>\&-X], F→FF | 30° | 5 |
| 分形灌木 | `F` | F→F[+F]F[-F][F] | 22° | 4 |

### 🔺 分形类
| 预设 | 公理 | 规则 | 角度 | 迭代 |
|------|------|------|------|------|
| 龙曲线 | `FX` | X→X+YF+, Y→-FX-Y | 90° | 8 |
| 谢尔宾斯基 | `F-G-G` | F→F-G+F+G-F, G→GG | 120° | 4 |
| 科赫雪花 | `F++F++F` | F→F-F++F-F | 60° | 4 |
| 莱维C形曲线 | `F` | F→+F--F+ | 45° | 8 |

### 📐 曲线类
| 预设 | 公理 | 规则 | 角度 | 迭代 |
|------|------|------|------|------|
| 希尔伯特曲线 | `A` | A→-BF+AFA+FB-, B→+AF-BFB-FA+ | 90° | 4 |
| 高斯帕曲线 | `F` | F→F+F-F--F-F+F+FF | 60° | 3 |
| 六角环 | `F+F+F+F+F+F` | F→F+F-F-F+F | 60° | 3 |

---

## 🧊 Marching Cubes 场函数

| 预设 | 数学公式 | 分辨率 |
|------|---------|--------|
| 🧬 Metaball 集群 | ∑(r²/d²) − 1 = 0 | 48³ |
| 🔮 多球聚集 | ∑(r²/d²) − 1 = 0（12 球） | 48³ |
| 🧊 Schwarz P | cos(x)+cos(y)+cos(z) = 0 | 64³ |
| 🌀 Gyroid | sin(x)cos(y)+sin(y)cos(z)+sin(z)cos(x) = 0 | 64³ |
| 💎 Diamond | 三重周期金刚石曲面 | 64³ |

---

## Git 克隆

```bash
git clone <repository-url> procedural-modeling-demo
cd procedural-modeling-demo

# 安装依赖
npm install

# 启动开发
npm run dev
```

---

## 📚 参考

- [Kimi 分享 - 骨骼绑定与 Three.js 纯函数建模路径](https://www.kimi.com/share/19f8a275-5cf2-807a-8000-00002143699d)
- [Three.js 官方文档](https://threejs.org/docs/)
- [Three.js CSS3D Periodic Table 示例](https://threejs.org/examples/#css3d_periodictable) — 元素周期表布局与 TWEEN 动画来源
- [Vue 3 官方文档](https://vuejs.org/guide/introduction.html)
- [Vite 官方文档](https://vitejs.dev/guide/)
- [@tweenjs/tween.js](https://github.com/tweenjs/tween.js) — JavaScript 平滑动画效果库