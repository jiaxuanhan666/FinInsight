<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const pressing = ref(false)
const ready = ref(false)

onMounted(async () => {
  // If already initialized, skip straight to home
  if (userStore.initialized && userStore.uuid) {
    router.replace('/')
    return
  }
  ready.value = true
})

async function enter() {
  if (pressing.value) return
  pressing.value = true
  await userStore.initUser()
  setTimeout(() => {
    router.push('/')
  }, 400)
}
</script>

<template>
  <div class="login-page">
    <!-- Ambient background orbs -->
    <div class="bg-orb orb-1"></div>
    <div class="bg-orb orb-2"></div>
    <div class="bg-orb orb-3"></div>

    <div class="login-content">
      <!-- Brand mark -->
      <div class="brand-mark">
        <div class="brand-diamond">
          <span class="brand-glyph">&#9672;</span>
        </div>
      </div>

      <!-- Brand text -->
      <h1 class="brand-name">FinInsight</h1>
      <p class="brand-tagline">AI</p>

      <!-- Enter button -->
      <button
        class="enter-btn"
        :class="{ 'enter-btn--loading': pressing }"
        :disabled="!ready || pressing"
        @click="enter"
      >
        <span v-if="!pressing" class="enter-text">&#8212;</span>
        <span v-else class="enter-dot"></span>
      </button>

      <!-- Footer info -->
      <p class="login-footer">
        <span class="footer-dot">&#183;</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-deep);
  position: relative;
  overflow: hidden;
}

/* Ambient orbs */
.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
  animation: orbFloat 8s ease-in-out infinite;
}
.orb-1 {
  width: 280px; height: 280px;
  background: var(--neon-purple);
  top: -60px; right: -80px;
  animation-delay: 0s;
}
.orb-2 {
  width: 200px; height: 200px;
  background: var(--neon-blue);
  bottom: 10%; left: -60px;
  animation-delay: -3s;
}
.orb-3 {
  width: 160px; height: 160px;
  background: var(--neon-mint);
  bottom: -40px; right: 30%;
  animation-delay: -6s;
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%      { transform: translate(20px, -30px) scale(1.1); }
  66%      { transform: translate(-15px, 20px) scale(0.9); }
}

.login-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  z-index: 1;
  animation: pageIn 0.6s var(--ease-spring) both;
}

/* Brand mark */
.brand-diamond {
  width: 80px; height: 80px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(167, 139, 250, 0.1);
  border: 1px solid rgba(167, 139, 250, 0.25);
  border-radius: 22px;
  box-shadow: 0 0 40px rgba(167, 139, 250, 0.2);
}

.brand-glyph {
  font-size: 36px;
  color: var(--neon-purple);
  filter: drop-shadow(0 0 12px rgba(167, 139, 250, 0.6));
}

/* Brand text */
.brand-name {
  font-family: var(--font-display);
  font-size: var(--fs-3xl);
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.brand-tagline {
  font-family: var(--font-display);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

/* Enter button */
.enter-btn {
  width: 200px;
  height: 56px;
  margin-top: 16px;
  border: 1px solid rgba(167, 139, 250, 0.3);
  border-radius: var(--radius-full);
  background: rgba(167, 139, 250, 0.08);
  backdrop-filter: blur(12px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s var(--ease-spring);
}

.enter-btn:hover {
  border-color: rgba(167, 139, 250, 0.5);
  background: rgba(167, 139, 250, 0.15);
  box-shadow: 0 0 40px rgba(167, 139, 250, 0.3);
}

.enter-btn:active {
  transform: scale(0.95);
}

.enter-btn--loading {
  border-color: rgba(52, 211, 153, 0.4);
  background: rgba(52, 211, 153, 0.1);
}

.enter-text {
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--neon-purple);
  letter-spacing: 0.1em;
}

.enter-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--neon-mint);
  box-shadow: 0 0 16px var(--neon-mint);
  animation: glowPulse 1s infinite;
}

.login-footer {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.footer-dot {
  font-size: 20px;
  color: var(--text-muted);
  line-height: 1;
}
</style>
