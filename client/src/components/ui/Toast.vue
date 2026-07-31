<script setup lang="ts">
import { watch } from 'vue'

const props = defineProps<{ message: string; show: boolean; duration?: number }>()
const emit = defineEmits(['close'])

watch(() => props.show, (val) => {
  if (val && props.duration !== 0) {
    setTimeout(() => emit('close'), props.duration || 2200)
  }
})
</script>

<template>
  <Transition name="toast">
    <div v-if="show" class="toast" @click="emit('close')">
      <span class="toast-dot"></span>
      <span>{{ message }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(167, 139, 250, 0.25);
  border-radius: var(--radius-full);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  font-size: var(--fs-sm);
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
}

.toast-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--neon-purple);
  box-shadow: 0 0 8px var(--neon-purple);
}

.toast-enter-active { transition: all 0.35s var(--ease-spring); }
.toast-leave-active { transition: all 0.2s var(--ease-smooth); }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-16px); }
.toast-leave-to   { opacity: 0; transform: translateX(-50%) translateY(-8px); }
</style>
