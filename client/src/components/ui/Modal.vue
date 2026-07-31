<script setup lang="ts">
defineProps<{ show: boolean; title?: string }>()
const emit = defineEmits(['close'])
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-content glass-card" style="border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;">
        <div v-if="title" class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button class="modal-close" @click="emit('close')">
            <span style="font-size:14px;color:var(--text-muted);">x</span>
          </button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(9, 9, 15, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
}

.modal-content {
  width: 100%; max-width: 480px; max-height: 80vh;
  overflow-y: auto;
  background: rgba(18, 18, 31, 0.98);
}

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border-subtle);
}

.modal-title {
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.modal-close {
  width: 32px; height: 32px;
  border-radius: 50%; border: 1px solid var(--border-default);
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.modal-body { padding: var(--space-lg); }
.modal-footer {
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--border-subtle);
  display: flex; gap: var(--space-sm); justify-content: flex-end;
}

.modal-enter-active { transition: all 0.35s var(--ease-spring); }
.modal-leave-active { transition: all 0.2s var(--ease-smooth); }
.modal-enter-from .modal-content,
.modal-leave-to .modal-content { transform: translateY(100%); }
.modal-enter-from { opacity: 0; }
.modal-leave-to   { opacity: 0; }
</style>
