<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount } from 'vue'

const loading = ref(true)
const progress = ref(4)
const status = ref('正在驶入公海…')
const errorMsg = ref('')
const Scene = shallowRef(null)

let fakeTimer = null
let disposed = false

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

  try {
    setProgress(8, '加载渲染引擎…')
    const mod = await import('./OpenSea.vue')
    if (disposed) return
    setProgress(18, '初始化场景…')
    Scene.value = mod.default
  } catch (err) {
    console.error('[OpenSea] failed to load scene module:', err)
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
})
</script>

<template>
  <div class="opensea-shell">
    <component
      :is="Scene"
      v-if="Scene"
      @ready="onReady"
      @progress="onProgress"
      @error="onError"
    />

    <Transition name="sea-loader">
      <div v-if="loading" class="sea-loader" aria-busy="true" aria-live="polite">
        <div class="sea-loader-glow" aria-hidden="true"></div>

        <div class="sea-loader-copy">
          <div class="sea-loader-eyebrow">Realtime Ocean</div>
          <h1 class="sea-loader-title">OPEN SEA</h1>
          <p class="sea-loader-sub">WebGPU · TSL · Gerstner</p>
        </div>

        <div class="sea-loader-mark" aria-hidden="true">
          <span class="ripple r1"></span>
          <span class="ripple r2"></span>
          <span class="ripple r3"></span>
          <span class="horizon"></span>
        </div>

        <div class="sea-loader-status">
          <div class="sea-loader-track">
            <div class="sea-loader-bar" :style="{ width: Math.max(progress, 6) + '%' }"></div>
          </div>
          <div class="sea-loader-meta">
            <span class="sea-loader-label">{{ errorMsg || status }}</span>
            <span class="sea-loader-pct">{{ Math.round(progress) }}%</span>
          </div>
        </div>

        <div class="sea-waves" aria-hidden="true">
          <div class="wave wave-a"></div>
          <div class="wave wave-b"></div>
          <div class="wave wave-c"></div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.opensea-shell {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #05070a;
}

.sea-loader {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  background: #05070a;
  pointer-events: auto;
}

.sea-loader-glow {
  position: absolute;
  width: 52vmin;
  height: 52vmin;
  top: 28%;
  left: 50%;
  transform: translate(-50%, -40%);
  background: radial-gradient(circle, rgba(143, 233, 228, 0.18) 0%, rgba(14, 48, 62, 0.12) 42%, transparent 70%);
  animation: glowPulse 3.2s ease-in-out infinite;
}

.sea-loader-copy {
  position: relative;
  text-align: center;
  z-index: 1;
}

.sea-loader-eyebrow {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: rgba(143, 233, 228, 0.62);
}

.sea-loader-title {
  margin: 10px 0 0;
  font-size: clamp(28px, 5vw, 42px);
  font-weight: 500;
  letter-spacing: 0.28em;
  color: #f4fffd;
  text-indent: 0.28em;
}

.sea-loader-sub {
  margin-top: 8px;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.22em;
  color: rgba(255, 255, 255, 0.38);
}

.sea-loader-mark {
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
  border: 1px solid rgba(143, 233, 228, 0.55);
  border-radius: 50%;
  opacity: 0;
  animation: rippleOut 2.8s ease-out infinite;
}

.r2 { animation-delay: 0.9s; }
.r3 { animation-delay: 1.8s; }

.horizon {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 50%;
  background: #8fe9e4;
  box-shadow: 0 0 16px rgba(143, 233, 228, 0.9), 0 0 36px rgba(143, 233, 228, 0.35);
  animation: horizonPulse 1.8s ease-in-out infinite;
}

.sea-loader-status {
  position: relative;
  z-index: 1;
  width: min(280px, 72vw);
}

.sea-loader-track {
  height: 2px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.sea-loader-bar {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #5bc0be, #8fe9e4);
  box-shadow: 0 0 12px rgba(143, 233, 228, 0.45);
  transition: width 0.28s ease;
}

.sea-loader-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.42);
}

.sea-loader-pct {
  color: #8fe9e4;
}

.sea-waves {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 28vh;
  overflow: hidden;
  pointer-events: none;
}

.wave {
  position: absolute;
  left: -20%;
  width: 140%;
  height: 180px;
  border-radius: 46%;
  opacity: 0.45;
  animation: waveDrift 9s linear infinite;
}

.wave-a {
  bottom: -90px;
  background: radial-gradient(ellipse at center, rgba(20, 90, 110, 0.55) 0%, rgba(5, 7, 10, 0) 70%);
  animation-duration: 11s;
}

.wave-b {
  bottom: -110px;
  background: radial-gradient(ellipse at center, rgba(143, 233, 228, 0.16) 0%, rgba(5, 7, 10, 0) 68%);
  animation-duration: 8s;
  animation-direction: reverse;
}

.wave-c {
  bottom: -130px;
  background: radial-gradient(ellipse at center, rgba(8, 40, 58, 0.7) 0%, rgba(5, 7, 10, 0) 70%);
  animation-duration: 13s;
}

.sea-loader-leave-active {
  transition: opacity 0.7s ease;
  pointer-events: none;
}

.sea-loader-leave-to {
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

@keyframes horizonPulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.18); opacity: 1; }
}

@keyframes waveDrift {
  0% { transform: translateX(0); }
  100% { transform: translateX(-8%); }
}

@media (max-width: 768px) {
  .sea-loader {
    gap: 22px;
  }

  .sea-loader-title {
    letter-spacing: 0.18em;
    text-indent: 0.18em;
  }
}
</style>
