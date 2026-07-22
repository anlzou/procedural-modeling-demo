<script setup>
import { ref } from 'vue'

const collapsed = ref(false)
const emit = defineEmits(['toggle'])
</script>

<template>
  <div class="info-panel-wrapper" :class="{ collapsed }">
    <!-- 折叠切换按钮 -->
    <button class="toggle-btn" @click="collapsed = !collapsed" :title="collapsed ? '展开信息' : '折叠信息'">
      <span v-if="collapsed">?</span>
      <span v-else>✕</span>
    </button>

    <!-- 折叠状态只显示标题 -->
    <div v-if="collapsed" class="collapsed-hint">
      <span class="collapsed-icon">?</span>
      <span>点击 ? 展开信息</span>
    </div>

    <!-- 主体内容 -->
    <div v-show="!collapsed" class="info-panel">
      <div class="info-panel-body">
        <slot />
      </div>
    </div>
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

.toggle-btn {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  z-index: 11;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(30, 30, 50, 0.85);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.toggle-btn:hover {
  background: rgba(100, 100, 180, 0.6);
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.1);
}

.collapsed-hint {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0.5rem 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.25s ease;
}

.collapsed-hint:hover {
  background: rgba(0, 0, 0, 0.7);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
}

.collapsed-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(100, 100, 180, 0.4);
  font-size: 0.75rem;
  font-weight: 700;
  color: #a5b4fc;
}

.info-panel {
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

/* 响应式 */
@media (max-width: 768px) {
  .info-panel-wrapper {
    left: 0.5rem;
    right: 0.5rem;
    max-width: none;
  }

  .toggle-btn {
    right: 0.5rem;
  }
}
</style>

<!-- 全局样式：作用于 slot 内容，确保跨组件一致性 -->
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
