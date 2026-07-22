<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
</script>

<template>
  <div class="app-layout">
    <nav class="top-nav" v-if="route.path !== '/'">
      <button class="back-btn" @click="router.push('/')">
        ← 返回首页
      </button>
    </nav>
    <router-view />
  </div>
</template>

<style scoped>
.app-layout {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  pointer-events: none;
}

.back-btn {
  pointer-events: auto;
  padding: 0.4rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}
</style>
