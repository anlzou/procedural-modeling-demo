<script setup>
import { ref } from 'vue'

const collapsed = ref(false)
</script>

<template>
  <div class="info-panel-wrapper" :class="{ collapsed }">
    <!-- 折叠状态：纯 ? 图标按钮 -->
    <button v-if="collapsed" class="circle-btn" @click="collapsed = false" title="展开信息">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <path d="M12 17h.01"/>
      </svg>
    </button>

    <!-- 展开状态 -->
    <template v-else>
      <div class="info-panel">
        <button class="circle-btn close" @click="collapsed = true" title="折叠信息">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <div class="info-panel-body">
          <slot />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.info-panel-wrapper {
  position: absolute;
  top: 4.2rem;
  left: 1rem;
  z-index: 10;
  max-width: 400px;
}

.circle-btn {
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

.circle-btn:hover {
  background: rgba(80, 80, 160, 0.5);
  color: #fff;
  transform: scale(1.08);
}

.circle-btn.close {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  z-index: 11;
  width: 32px;
  height: 32px;
}

.circle-btn.close:hover {
  background: rgba(180, 60, 60, 0.5);
  color: #fff;
}

.info-panel {
  position: relative;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
  color: #e0e0e0;
  animation: panelIn 0.3s ease;
}

@keyframes panelIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 768px) {
  .info-panel-wrapper {
    left: 0.5rem;
    right: 0.5rem;
    max-width: none;
  }
  .circle-btn.close { right: 0.5rem; }
}
</style>

<style>
.info-panel-body h2 {
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.4;
}
.info-panel-body p {
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 0 0 0.75rem;
  color: #d0d0e0;
}
.info-panel-body .features {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  opacity: 0.85;
  margin-bottom: 0.5rem;
  color: #c0c0d0;
}
.info-panel-body .hint {
  font-size: 0.78rem;
  opacity: 0.55;
  margin-top: 0.5rem;
  color: #b0b0c0;
}
.info-panel-body .controls-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.5rem 0 0;
}
.info-panel-body .btn {
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #ccc;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.info-panel-body .btn:hover,
.info-panel-body .btn.active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.5);
}
</style>
