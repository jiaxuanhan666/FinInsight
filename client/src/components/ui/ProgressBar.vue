<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  percent: number
  color?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}>()

const displayPercent = ref(0)

onMounted(() => {
  const target = Math.min(100, Math.max(0, props.percent))
  const duration = 800
  const start = performance.now()
  function tick(now: number) {
    const elapsed = now - start
    const progress = Math.min(1, elapsed / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    displayPercent.value = Math.round(target * eased)
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})
</script>

<template>
  <div class="progress-wrap" :class="[`progress-${size || 'md'}`]">
    <div class="progress-track">
      <div
        class="progress-fill"
        :style="{
          width: displayPercent + '%',
          background: color || 'linear-gradient(90deg, var(--neon-purple), var(--neon-lilac))',
          boxShadow: `0 0 12px ${color || 'rgba(167,139,250,0.4)'}`,
        }"
      ></div>
    </div>
    <span v-if="showLabel" class="progress-label">{{ displayPercent }}%</span>
  </div>
</template>

<style scoped>
.progress-wrap { display: flex; align-items: center; gap: var(--space-sm); width: 100%; }
.progress-sm .progress-track { height: 6px; }
.progress-md .progress-track { height: 10px; }
.progress-lg .progress-track { height: 14px; }

.progress-track {
  flex: 1;
  background: rgba(255,255,255,0.06);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.1s linear;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: shimmer 2s infinite;
}

.progress-label {
  font-family: var(--font-display);
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  min-width: 36px;
  text-align: right;
  font-weight: 600;
}
</style>
