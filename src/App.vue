<script setup>
import { ref, provide, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

/* ---------------------------------------------------------------------------
   Wallpaper mode (universal across all pages)
   --------------------------------------------------------------------------- */
const wallpaperMode = ref(false)
const panelsRevealed = ref(true)
const wallpaperHint = ref('')
let wallpaperTimer = null
let hintTimer = null

function clearWallpaperTimer() {
  if (wallpaperTimer) { clearTimeout(wallpaperTimer); wallpaperTimer = null }
}

function revealPanelsTemporarily() {
  if (!wallpaperMode.value) return
  panelsRevealed.value = true
  wallpaperHint.value = ''
  clearWallpaperTimer()
  wallpaperTimer = setTimeout(() => { panelsRevealed.value = false }, 5000)
}

function toggleWallpaper() {
  wallpaperMode.value = !wallpaperMode.value
  if (!wallpaperMode.value) {
    panelsRevealed.value = true
    wallpaperHint.value = ''
    clearWallpaperTimer()
  } else {
    panelsRevealed.value = false
  }
}

function exitWallpaper() {
  wallpaperMode.value = false
  panelsRevealed.value = true
  wallpaperHint.value = ''
  clearWallpaperTimer()
}

function showWallpaperHint() {
  if (!wallpaperMode.value || panelsRevealed.value) return
  wallpaperHint.value = '双击唤醒面板, Esc/Q 退出壁纸模式'
  if (hintTimer) clearTimeout(hintTimer)
  hintTimer = setTimeout(() => { wallpaperHint.value = '' }, 3000)
}

provide('wallpaperMode', wallpaperMode)
provide('panelsRevealed', panelsRevealed)
provide('toggleWallpaper', toggleWallpaper)
provide('revealPanelsTemporarily', revealPanelsTemporarily)

// Global keydown: Esc/Q exits wallpaper mode
function onGlobalKey(e) {
  if (wallpaperMode.value && (e.code === 'Escape' || e.code === 'KeyQ')) {
    exitWallpaper()
  }
}

// Global dblclick: reveal panels temporarily in wallpaper mode
function onGlobalDblClick() {
  revealPanelsTemporarily()
}

// Global click: show hint in wallpaper mode
function onGlobalClick() {
  showWallpaperHint()
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKey)
  document.addEventListener('dblclick', onGlobalDblClick)
  document.addEventListener('click', onGlobalClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKey)
  document.removeEventListener('dblclick', onGlobalDblClick)
  document.removeEventListener('click', onGlobalClick)
  clearWallpaperTimer()
  if (hintTimer) clearTimeout(hintTimer)
})
</script>

<template>
  <div class="app-layout" :data-wallpaper="wallpaperMode ? 'true' : undefined"
    :data-panels-revealed="panelsRevealed ? 'true' : undefined">
    <!-- 左侧工具栏 -->
    <div class="left-toolbar" v-if="route.path !== '/'">
      <button class="icon-btn" @click="router.push('/')" title="返回首页">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
    </div>

    <router-view :key="route.path" />

    <!-- Wallpaper mode hint -->
    <Transition name="hint-fade">
      <div v-if="wallpaperHint" class="wallpaper-hint">{{ wallpaperHint }}</div>
    </Transition>
  </div>
</template>

<style>
/* 全局样式 */
button:focus-visible {
  outline: none !important;
}
button {
  -webkit-tap-highlight-color: transparent;
}

/* Wallpaper mode global styles */
[data-wallpaper] .info-panel-wrapper,
[data-wallpaper] .control-panel-wrapper {
  transition: opacity 0.3s ease;
}
[data-wallpaper]:not([data-panels-revealed]) .info-panel-wrapper,
[data-wallpaper]:not([data-panels-revealed]) .control-panel-wrapper {
  opacity: 0 !important;
  pointer-events: none !important;
}
[data-wallpaper] .left-toolbar {
  display: none !important;
}

/* Reuse pop-btn transition from ControlPanel */
.pop-btn-leave-active,
.pop-btn-enter-active {
  transition: all 0.25s ease;
}
.pop-btn-leave-to,
.pop-btn-enter-from {
  opacity: 0;
  transform: scale(0.5);
}

/* Wallpaper mode hint */
.wallpaper-hint {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 12px;
  letter-spacing: 0.24em;
  color: rgba(255, 255, 255, 0.82);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  white-space: nowrap;
}

.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity 0.5s ease;
}
.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
}
</style>

<style scoped>
.app-layout {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.left-toolbar {
  position: fixed;
  top: 0.8rem;
  left: 0.5rem;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.left-toolbar .icon-btn {
  pointer-events: auto;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.left-toolbar .icon-btn:hover {
  background: rgba(80, 80, 160, 0.5);
  color: #fff;
  transform: scale(1.08);
}
</style>
