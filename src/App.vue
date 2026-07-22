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
  padding: 0.6rem 1.2rem;
  display: flex;
  align-items: center;
  pointer-events: none;
}

.back-btn {
  pointer-events: auto;
  padding: 0.35rem 0.9rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.4;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.35);
  color: #fff;
}
</style>
