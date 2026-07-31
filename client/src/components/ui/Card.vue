<script setup lang="ts">
defineProps<{
  glow?: 'purple' | 'mint' | 'pink' | 'blue' | 'amber' | ''
  padding?: string
  stagger?: number
  clickable?: boolean
}>()
</script>

<template>
  <div
    class="glass-card"
    :class="[
      glow ? `glow-${glow}` : '',
      stagger ? `card-stagger stagger-${stagger}` : '',
      clickable ? 'card-clickable' : '',
    ]"
    :style="{ padding: padding || 'var(--space-lg)' }"
  >
    <slot />
  </div>
</template>

<style scoped>
.card-clickable {
  cursor: pointer;
}
.card-clickable:active {
  transform: scale(0.98);
}
</style>
