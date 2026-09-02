import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'

const ModuleLoader = () => import('../components/ModuleLoader.vue')

const routes = [
  { path: '/', name: 'Home', component: Home },
  {
    path: '/sdf-raymarching',
    name: 'SDFRaymarching',
    component: ModuleLoader,
    meta: {
      loader: {
        eyebrow: 'Procedural',
        title: 'SDF RAYMARCHING',
        sub: 'Signed Distance · Fragment Shader',
        accent: '#7c3aed',
        status: '加载着色器…',
        scene: () => import('../views/SDFRaymarching.vue'),
      },
    },
  },
  {
    path: '/marching-cubes',
    name: 'MarchingCubes',
    component: ModuleLoader,
    meta: {
      loader: {
        eyebrow: 'Isosurface',
        title: 'MARCHING CUBES',
        sub: 'Voxel Field · Mesh Extraction',
        accent: '#0891b2',
        status: '提取等值面…',
        scene: () => import('../views/MarchingCubes.vue'),
      },
    },
  },
  {
    path: '/parametric',
    name: 'ParametricGeometry',
    component: ModuleLoader,
    meta: {
      loader: {
        eyebrow: 'Surfaces',
        title: 'PARAMETRIC',
        sub: 'f(u, v) → (x, y, z)',
        accent: '#d97706',
        status: '生成参数曲面…',
        scene: () => import('../views/ParametricGeometry.vue'),
      },
    },
  },
  {
    path: '/lsystem',
    name: 'LSystem',
    component: ModuleLoader,
    meta: {
      loader: {
        eyebrow: 'Rewriting',
        title: 'L-SYSTEM',
        sub: 'Axiom · Production Rules · Fractal',
        accent: '#16a34a',
        status: '生长分形结构…',
        scene: () => import('../views/LSystem.vue'),
      },
    },
  },
  {
    path: '/periodic-table',
    name: 'PeriodicTable',
    component: ModuleLoader,
    meta: {
      loader: {
        eyebrow: 'CSS3D',
        title: 'PERIODIC TABLE',
        sub: 'HTML Elements · 3D Space',
        accent: '#06b6d4',
        status: '排列元素卡片…',
        scene: () => import('../views/CSS3DRenderer/PeriodicTable.vue'),
      },
    },
  },
  {
    path: '/product-showcase',
    name: 'ProductShowcase',
    component: ModuleLoader,
    meta: {
      loader: {
        eyebrow: 'CSS3D',
        title: 'PRODUCT SHOWCASE',
        sub: 'Dual Renderer · Bloom',
        accent: '#8b5cf6',
        status: '组装展示场景…',
        scene: () => import('../views/CSS3DRenderer/ProductShowcase.vue'),
      },
    },
  },
  { path: '/open-sea', name: 'OpenSea', component: () => import('../views/OpenSea/OpenSeaLoader.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
