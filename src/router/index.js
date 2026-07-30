import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/sdf-raymarching', name: 'SDFRaymarching', component: () => import('../views/SDFRaymarching.vue') },
  { path: '/marching-cubes', name: 'MarchingCubes', component: () => import('../views/MarchingCubes.vue') },
  { path: '/parametric', name: 'ParametricGeometry', component: () => import('../views/ParametricGeometry.vue') },
  { path: '/lsystem', name: 'LSystem', component: () => import('../views/LSystem.vue') },
  { path: '/periodic-table', name: 'PeriodicTable', component: () => import('../views/CSS3DRenderer/PeriodicTable.vue') },
  { path: '/product-showcase', name: 'ProductShowcase', component: () => import('../views/CSS3DRenderer/ProductShowcase.vue') },
  { path: '/open-sea', name: 'OpenSea', component: () => import('../views/OpenSea/OpenSea.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
