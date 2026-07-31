<script setup lang="ts">
defineProps<{ show: boolean; title: string }>()
defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="sheet-overlay" @click.self="$emit('close')">
      <div class="sheet-panel">
        <div class="sheet-header">
          <h2 class="sheet-title">{{ title }}</h2>
          <button class="sheet-close" @click="$emit('close')">&times;</button>
        </div>
        <div class="sheet-body">
          <slot />
        </div>
        <div class="sheet-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(9, 9, 15, 0.7);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet-panel {
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: #18182b;
  border-radius: 24px 24px 0 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: none;
  box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.4);
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.sheet-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: #f1f1f6;
  margin: 0;
}

.sheet-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #a1a1aa;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex-shrink: 0;
}

.sheet-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f1f1f6;
}

.sheet-body {
  padding: 24px;
  overflow-y: auto;
  max-height: 55vh;
  flex-shrink: 1;
}

.sheet-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-shrink: 0;
  background: #18182b;
}
</style>
