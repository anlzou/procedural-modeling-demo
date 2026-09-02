<script setup>
import { ref, shallowRef, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const cfg = computed(() => route.meta.loader || {})
const accent = computed(() => cfg.value.accent || '#7c3aed')
const accentRgb = computed(() => hexToRgb(accent.value))

const loading = ref(true)
const progress = ref(4)
const status = ref(cfg.value.status || '正在加载场景…')
const errorMsg = ref('')
const Scene = shallowRef(null)

let fakeTimer = null
let safetyTimer = null
let disposed = false

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '')
  if (h.length !== 6) return '124, 58, 237'
  const n = parseInt(h, 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

function setProgress(value, label) {
  if (value > progress.value) progress.value = Math.min(value, 100)
  if (label) status.value = label
}

function onProgress(payload) {
  if (payload && typeof payload === 'object') {
    const pct = Number(payload.progress)
    if (Number.isFinite(pct)) setProgress(pct * 100, payload.label)
  }
}

function onReady() {
  if (disposed) return
  setProgress(100, '就绪')
  loading.value = false
  if (safetyTimer) {
    clearTimeout(safetyTimer)
    safetyTimer = null
  }
}

function onError(message) {
  if (disposed) return
  errorMsg.value = message || '场景加载失败'
  status.value = errorMsg.value
}

onMounted(async () => {
  fakeTimer = setInterval(() => {
    if (progress.value < 16) progress.value += 0.7
  }, 90)

  safetyTimer = setTimeout(() => {
    if (loading.value && !errorMsg.value) onReady()
  }, 12000)

  try {
    setProgress(8, cfg.value.status || '加载渲染引擎…')
    const importer = cfg.value.scene
    if (typeof importer !== 'function') throw new Error('Missing scene importer')
    const mod = await importer()
    if (disposed) return
    setProgress(18, '初始化场景…')
    Scene.value = mod.default
  } catch (err) {
    console.error('[ModuleLoader] failed to load scene:', err)
    onError('渲染引擎加载失败，请刷新重试')
  } finally {
    if (fakeTimer) {
      clearInterval(fakeTimer)
      fakeTimer = null
    }
  }
})

onBeforeUnmount(() => {
  disposed = true
  if (fakeTimer) clearInterval(fakeTimer)
  if (safetyTimer) clearTimeout(safetyTimer)
})
</script>

<template>
  <div class="module-shell" :style="{ '--accent': accent, '--accent-rgb': accentRgb }">
    <component
      :is="Scene"
      v-if="Scene"
      @ready="onReady"
      @progress="onProgress"
      @error="onError"
    />

    <Transition name="mod-loader">
      <div v-if="loading" class="mod-loader" aria-busy="true" aria-live="polite">
        <div class="mod-loader-glow" aria-hidden="true"></div>
        <div class="mod-loader-grid" aria-hidden="true"></div>

        <div class="mod-loader-copy">
          <div class="mod-loader-eyebrow">{{ cfg.eyebrow || 'Procedural' }}</div>
          <h1 class="mod-loader-title">{{ cfg.title || 'LOADING' }}</h1>
          <p class="mod-loader-sub">{{ cfg.sub || 'Three.js' }}</p>
        </div>

        <div class="mod-loader-mark" aria-hidden="true">
          <span class="ripple r1"></span>
          <span class="ripple r2"></span>
          <span class="ripple r3"></span>
          <span class="core"></span>
        </div>

        <div class="mod-loader-status">
          <div class="mod-loader-track">
            <div class="mod-loader-bar" :style="{ width: Math.max(progress, 6) + '%' }"></div>
          </div>
          <div class="mod-loader-meta">
            <span>{{ errorMsg || status }}</span>
            <span class="mod-loader-pct">{{ Math.round(progress) }}%</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.module-shell {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #07070f;
}

.mod-loader {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  background: #07070f;
  pointer-events: auto;
}

.mod-loader-glow {
  position: absolute;
  width: 52vmin;
  height: 52vmin;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -40%);
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.22) 0%, rgba(var(--accent-rgb), 0.06) 42%, transparent 70%);
  animation: glowPulse 3.2s ease-in-out infinite;
}

.mod-loader-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, #000 20%, transparent 75%);
  opacity: 0.55;
}

.mod-loader-copy {
  position: relative;
  z-index: 1;
  text-align: center;
}

.mod-loader-eyebrow {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: rgba(var(--accent-rgb), 0.78);
}

.mod-loader-title {
  margin: 10px 0 0;
  font-size: clamp(22px, 4.4vw, 38px);
  font-weight: 500;
  letter-spacing: 0.18em;
  color: #f6f7ff;
}

.mod-loader-sub {
  margin-top: 8px;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.38);
}

.mod-loader-mark {
  position: relative;
  width: 120px;
  height: 120px;
  z-index: 1;
}

.ripple {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  border: 1px solid rgba(var(--accent-rgb), 0.55);
  border-radius: 50%;
  opacity: 0;
  animation: rippleOut 2.8s ease-out infinite;
}

.r2 { animation-delay: 0.9s; }
.r3 { animation-delay: 1.8s; }

.core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.9), 0 0 36px rgba(var(--accent-rgb), 0.35);
  animation: corePulse 1.8s ease-in-out infinite;
}

.mod-loader-status {
  position: relative;
  z-index: 1;
  width: min(280px, 72vw);
}

.mod-loader-track {
  height: 2px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.mod-loader-bar {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.55), var(--accent));
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.45);
  transition: width 0.28s ease;
}

.mod-loader-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.42);
}

.mod-loader-pct {
  color: var(--accent);
}

.mod-loader-leave-active {
  transition: opacity 0.55s ease;
  pointer-events: none;
}

.mod-loader-leave-to {
  opacity: 0;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.55; transform: translate(-50%, -40%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -40%) scale(1.08); }
}

@keyframes rippleOut {
  0% { transform: scale(0.4); opacity: 0.7; }
  80% { transform: scale(5.4); opacity: 0; }
  100% { transform: scale(5.4); opacity: 0; }
}

@keyframes corePulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.18); opacity: 1; }
}

@media (max-width: 768px) {
  .mod-loader {
    gap: 22px;
  }

  .mod-loader-title {
    letter-spacing: 0.1em;
  }
}
</style>
