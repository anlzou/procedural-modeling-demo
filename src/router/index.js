import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import SDFRaymarching from '../views/SDFRaymarching.vue'
import MarchingCubes from '../views/MarchingCubes.vue'
import ParametricGeometry from '../views/ParametricGeometry.vue'
import LSystem from '../views/LSystem.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/sdf-raymarching', name: 'SDFRaymarching', component: SDFRaymarching },
  { path: '/marching-cubes', name: 'MarchingCubes', component: MarchingCubes },
  { path: '/parametric', name: 'ParametricGeometry', component: ParametricGeometry },
  { path: '/lsystem', name: 'LSystem', component: LSystem },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
