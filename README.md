# 🎨 procedural-modeling-demo（程序化建模）

> 基于 **Vue 3 + Vite + Three.js** 的 3D 程序化生成演示项目，展示了四种纯函数建模的核心技术。

---

## 📖 简介

本项目来源于 Kimi 分享的一篇关于"纯函数绘制 3D 模型"的技术文章，使用 **Vue 3 + Vite + Three.js** 完整实现了文章中介绍的四种纯函数建模路径，每个路径都配有可交互的 Demo 页面。

**四种建模路径：**

| 路径 | 核心思想 | 特点 |
|------|---------|------|
| 🔮 **SDF + Raymarching** | 符号距离函数 + 光线步进 | 无限细节，纯 Shader 渲染 |
| 🧊 **Marching Cubes** | 等值面提取算法 | 生成真实 Mesh，可导出 |
| 🌀 **Parametric Geometry** | 参数化曲面 f(u,v)→(x,y,z) | 精确数学控制，适合艺术曲面 |
| 🌿 **L-System / 分形** | 字符串重写规则生成递归结构 | 模拟植物、分形等自然形态 |

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
- **Metaball 公式**：∑(r²/d²) - 1 融合多个球体
- **真实 Mesh 生成**：生成 `THREE.BufferGeometry`，支持法线计算
- **交互**：OrbitControls 拖拽旋转/缩放/自动旋转

### 🌀 路径 3：Parametric Geometry（参数化曲面）

- **莫比乌斯环** (Möbius Strip)
- **克莱因瓶** (Klein Bottle)
- **超级公式** (Superformula)：可调参数生成各种有机形状
- **波浪曲面**：顶点实时动态动画
- **螺旋面** (Helicoid)
- **一键切换**不同曲面类型

### 🌿 路径 4：L-System / 分形植物

- **6 种预设**：
  - 🌿 植物 (Plant) — 3D 空间多方向分支 `F[&+X][^-X][&X][^+X]`
  - 🐉 龙曲线 (Dragon Curve) — `FX` + `X+YF+` / `-FX-Y`
  - 🔺 谢尔宾斯基 (Sierpinski) — `F-G-G`
  - 🌳 分形树 (Fractal Tree) — 3D 分支 `F[&+F][^-F][&F][^+F]F`
  - ❄️ 科赫雪花 (Koch Snowflake) — `F++F++F`
  - 🌿 蕨类植物 (Barnsley Fern) — 3D 分支
- **状态栈** 实现分支递归
- **圆柱体分段渲染** — 每段独立构建 CylinderGeometry，合并为完整 BufferGeometry
- **3D 分支** — 植物/树/蕨类预设使用 `&`（俯仰）、`^`、`+`、`-` 实现三维空间分支

### 🖥️ 通用控制面板

所有 3D 页面共享的控制面板（右下角）提供：

| 功能 | 说明 |
|------|------|
| 📊 **性能监控** | FPS、内存占用、对象数实时显示 |
| 💡 **光源控制** | 各光源独立开关 + 全局强度滑块 (0~2x) |
| 🔄 **动画控制** | 播放/暂停 + 速度滑块 (0~3x) |
| 🔍 **面板透明度** | 背景透明度滑条 |
| 📌 **置顶** | 点击置顶按钮后面板不自动收起 |

资料来源面板（左上角 `?` 图标）也支持置顶功能。

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
│   │   ├── marchingCubes.js        # Marching Cubes 算法（含完整查找表）
│   │   └── lsystem.js              # L-System 生成器 + 6 种预设定义（3D 分支）
│   │
│   ├── views/
│   │   ├── Home.vue                # 首页 - 四张导航卡片
│   │   ├── SDFRaymarching.vue      # 🔮 路径 1
│   │   ├── MarchingCubes.vue       # 🧊 路径 2
│   │   ├── ParametricGeometry.vue  # 🌀 路径 3
│   │   └── LSystem.vue             # 🌿 路径 4
│   │
│   └── components/
│       ├── ControlPanel.vue        # 右下角控制面板（性能/光源/动画/透明度）
│       └── InfoPanel.vue           # 左上角信息面板（说明/切换按钮）
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
| [Three.js](https://threejs.org/) | ^0.174+ | 3D 渲染引擎 |
| [Vue Router](https://router.vuejs.org/) | ^4.5+ | 前端路由 |

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

启动后浏览器访问 **http://localhost:5173/**（如果端口被占用会自动递增）。

---

## 🏗️ 项目生成步骤

以下是使用 `create-vite` 从零搭建此项目的步骤：

```bash
# 1. 创建 Vue + Vite 项目
npm create vite@latest procedural-modeling-demo -- --template vue

# 2. 进入项目
cd procedural-modeling-demo

# 3. 安装 Three.js 和 Vue Router
npm install three vue-router@4

# 4. 创建目录结构
mkdir -p src/router src/views src/components src/utils src/shaders

# 5. 开发（参考本仓库各文件内容进行实现）
npm run dev
```

---

## 🧭 路由说明

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `Home.vue` | 首页，四张导航卡片 |
| `/sdf-raymarching` | `SDFRaymarching.vue` | SDF + Raymarching |
| `/marching-cubes` | `MarchingCubes.vue` | Marching Cubes |
| `/parametric` | `ParametricGeometry.vue` | 参数化曲面 |
| `/lsystem` | `LSystem.vue` | L-System 分形 |

---

## Git 克隆 & 提交

```bash
# 克隆仓库
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
- [Vue 3 官方文档](https://vuejs.org/guide/introduction.html)
- [Vite 官方文档](https://vitejs.dev/guide/)

---

## 📄 许可证

MIT License
