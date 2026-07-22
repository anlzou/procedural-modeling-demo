<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const expanded = ref(false)
const panelRef = ref(null)
const alpha = ref(0.6)
const playing = ref(true)
const speed = ref(1)

const emit = defineEmits(['togglePlay', 'updateSpeed'])

function setAlpha(val) {
  alpha.value = val
  document.documentElement.style.setProperty('--panel-alpha', val)
}

function togglePlay() {
  playing.value = !playing.value
  emit('togglePlay', playing.value)
}

function changeSpeed(val) {
  speed.value = val
  emit('updateSpeed', val)
}

function onClickOutside(e) {
  if (expanded.value && panelRef.value && !panelRef.value.contains(e.target)) {
    expanded.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  document.documentElement.style.setProperty('--panel-alpha', alpha.value)
})
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))

defineProps({
  fps: { type: Number, default: 0 },
  memory: { type: Number, default: 0 },
  objectCount: { type: Number, default: 0 },
})
</script>

<template>
  <div class="control-panel-wrapper" :class="{ expanded }">
    <!-- 展开按钮（面板关闭时显示） -->
    <button v-show="!expanded" class="ctrl-toggle" @click="expanded = true" title="展开控制">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    </button>

    <!-- 面板（无关闭按钮，点击外部关闭） -->
    <Transition name="slide">
      <div v-show="expanded" ref="panelRef" class="control-panel">
        <div class="panel-header">
          <h3>⚙ 控制面板</h3>
        </div>

        <!-- 性能监控 -->
        <div class="section">
          <div class="section-title">📊 性能监控</div>
          <div class="monitor-grid">
            <div class="monitor-item">
              <span class="label">FPS</span>
              <span class="value fps">{{ fps.toFixed(0) }}</span>
            </div>
            <div class="monitor-item">
              <span class="label">内存</span>
              <span class="value memory">{{ (memory / 1024 / 1024).toFixed(1) }} MB</span>
            </div>
            <div class="monitor-item">
              <span class="label">对象数</span>
              <span class="value count">{{ objectCount }}</span>
            </div>
          </div>
        </div>

        <!-- 模型控制（占位） -->
        <div class="section">
          <div class="section-title">🎯 模型控制</div>
          <div class="placeholder-msg">动态生成 / 显示控制（待实现）</div>
        </div>

        <!-- 动画控制 -->
        <div class="section">
          <div class="section-title">🔄 动画控制</div>
          <div class="anim-row">
            <button class="play-btn" @click="togglePlay" :title="playing ? '暂停' : '播放'">
              <svg v-if="playing" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            </button>
            <div class="speed-row">
              <span class="slider-label">速度</span>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                :value="speed"
                @input="changeSpeed(parseFloat($event.target.value))"
                class="alpha-slider"
              />
              <span class="slider-value">{{ speed.toFixed(1) }}x</span>
            </div>
          </div>
        </div>

        <!-- 面板透明度 -->
        <div class="section">
          <div class="section-title">🔍 面板透明度</div>
          <div class="slider-row">
            <span class="slider-label">半透明</span>
            <input
              type="range"
              min="0.15"
              max="0.95"
              step="0.05"
              :value="alpha"
              @input="setAlpha(parseFloat($event.target.value))"
              class="alpha-slider"
            />
            <span class="slider-label">实心</span>
            <span class="slider-value">{{ Math.round(alpha * 100) }}%</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.control-panel-wrapper {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  pointer-events: none;
}

.ctrl-toggle {
  pointer-events: auto;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  /* 按钮始终固定在右下角 */
  position: absolute;
  bottom: 0;
  right: 0;
}

.ctrl-toggle:hover {
  background: rgba(80, 80, 160, 0.5);
  color: #fff;
  transform: scale(1.08);
}

.control-panel {
  pointer-events: auto;
  width: 280px;
  max-height: 70vh;
  overflow-y: auto;
  background: rgba(10, 10, 20, var(--panel-alpha, 0.6));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 0;
  color: #d0d0e0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  margin-bottom: 48px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.9rem 1.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-header h3 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #f0f0ff;
}

.section {
  padding: 0.8rem 1.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.monitor-grid {
  display: flex;
  gap: 0.6rem;
}

.monitor-item {
  flex: 1;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 0.5rem;
  text-align: center;
}

.monitor-item .label {
  display: block;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 2px;
}

.monitor-item .value {
  font-size: 1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.value.fps {
  color: #22d3ee;
}

.value.memory {
  color: #a78bfa;
}

.value.count {
  color: #34d399;
}

.placeholder-msg {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.25);
  font-style: italic;
  padding: 0.3rem 0;
}

/* Slider */
.slider-row,
.anim-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.anim-row {
  gap: 0.6rem;
}

.play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.play-btn:hover {
  background: rgba(80, 80, 160, 0.4);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
}

.speed-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
}

.slider-label {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.35);
  white-space: nowrap;
}

.slider-value {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  min-width: 2.5em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.alpha-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.15);
  outline: none;
  cursor: pointer;
}

.alpha-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(130, 130, 200, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.2s;
}

.alpha-slider::-webkit-slider-thumb:hover {
  background: rgba(130, 130, 200, 0.9);
  transform: scale(1.15);
}

.alpha-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(130, 130, 200, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
}

/* Transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.96);
}

/* 响应式 */
@media (max-width: 768px) {
  .control-panel-wrapper {
    bottom: 0.5rem;
    right: 0.5rem;
  }

  .control-panel {
    width: calc(100vw - 2rem);
    max-width: 320px;
  }
}
</style>
