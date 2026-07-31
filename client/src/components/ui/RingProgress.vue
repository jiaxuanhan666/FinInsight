<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = defineProps<{ percent: number; color?: string; size?: number; strokeWidth?: number }>()
const displayPercent = ref(0)

onMounted(() => { animateTo(props.percent) })
watch(() => props.percent, (v) => animateTo(v))

function animateTo(target: number) {
  const t = Math.min(100, Math.max(0, target))
  const start = performance.now()
  const from = displayPercent.value
  const duration = 1000
  function tick(now: number) {
    const p = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - p, 4)
    displayPercent.value = Math.round(from + (t - from) * eased)
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

const size = () => props.size || 100
const sw = () => props.strokeWidth || 8
const r = () => (size() - sw()) / 2
const circ = () => 2 * Math.PI * r()
const offset = () => circ() * (1 - displayPercent.value / 100)
</script>

<template>
  <div class="ring-wrap" :style="{ width: size() + 'px', height: size() + 'px' }">
    <svg :width="size()" :height="size()" viewBox="0 0 100 100">
      <circle
        cx="50" cy="50"
        :r="r()" :stroke-width="sw()"
        fill="none"
        stroke="rgba(255,255,255,0.06)"
      />
      <circle
        cx="50" cy="50"
        :r="r()" :stroke-width="sw()"
        fill="none"
        stroke-linecap="round"
        :stroke="color || 'var(--neon-purple)'"
        :stroke-dasharray="circ()"
        :stroke-dashoffset="offset()"
        :style="{
          filter: `drop-shadow(0 0 6px ${color || 'rgba(167,139,250,0.5)'})`,
          transition: 'stroke-dashoffset 0.1s linear',
        }"
        transform="rotate(-90 50 50)"
      />
    </svg>
    <div class="ring-center">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ring-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; }
.ring-center { position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; }
</style>
