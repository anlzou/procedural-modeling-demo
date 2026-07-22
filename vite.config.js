import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // GitHub Pages 部署时替换为仓库名，如 '/procedural-modeling-demo/'
  // 如果使用自定义域名或用户站点 (username.github.io)，设为 '/'
  base: process.env.GITHUB_ACTIONS ? '/procedural-modeling-demo/' : '/',
})
