<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const pressing = ref(false)
const ready = ref(false)
const activeSlide = ref(0)

const slides = [
  {
    icon: '&#10033;',
    title: 'AI 智能记账',
    desc: '一句话记录收支，AI 自动识别分类，告别繁琐手动录入',
    glow: 'mint',
  },
  {
    icon: '&#9681;',
    title: '资产一目了然',
    desc: '金融资产、另类资产全景展示，净资产趋势实时追踪',
    glow: 'blue',
  },
  {
    icon: '&#9733;',
    title: '攒钱目标追踪',
    desc: '设定储蓄目标，智能监控进度，让每一分钱都有归宿',
    glow: 'amber',
  },
]

const glowClass = computed(() => `glow-${slides[activeSlide.value].glow}`)

onMounted(async () => {
  if (userStore.initialized && userStore.uuid) {
    router.replace('/')
    return
  }
  ready.value = true
})

// Auto-rotate slides
let slideTimer: ReturnType<typeof setInterval>
onMounted(() => {
  slideTimer = setInterval(() => {
    activeSlide.value = (activeSlide.value + 1) % slides.length
  }, 3500)
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
      <p class="brand-tagline">你的 AI 财务管家</p>

      <!-- Feature Slides -->
      <div class="feature-slides">
        <transition name="slide-fade" mode="out-in">
          <div class="feature-card" :key="activeSlide">
            <span
              class="feature-icon"
              :class="glowClass"
              v-html="slides[activeSlide].icon"
            ></span>
            <h3 class="feature-title">{{ slides[activeSlide].title }}</h3>
            <p class="feature-desc">{{ slides[activeSlide].desc }}</p>
          </div>
        </transition>

        <!-- Slide indicators -->
        <div class="slide-dots">
          <button
            v-for="(_, i) in slides"
            :key="i"
            class="slide-dot"
            :class="{ active: i === activeSlide }"
            @click="activeSlide = i"
          ></button>
        </div>
      </div>

      <!-- Enter button -->
      <button
        class="enter-btn"
        :class="{ 'enter-btn--loading': pressing }"
        :disabled="!ready || pressing"
        @click="enter"
      >
        <span v-if="!pressing" class="enter-text">开始使用</span>
        <span v-else class="enter-dot"></span>
      </button>

      <!-- Trust badges -->
      <div class="trust-row">
        <span class="trust-badge">&#9672; 零隐私采集</span>
        <span class="trust-divider">|</span>
        <span class="trust-badge">&#9672; 数据全程加密</span>
      </div>
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
  opacity: 0.12;
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
  gap: 20px;
  z-index: 1;
  padding: 40px 32px;
  animation: pageIn 0.6s var(--ease-spring) both;
}

@keyframes pageIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Brand mark */
.brand-diamond {
  width: 72px; height: 72px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(167, 139, 250, 0.1);
  border: 1px solid rgba(167, 139, 250, 0.25);
  border-radius: 20px;
  box-shadow: 0 0 40px rgba(167, 139, 250, 0.2);
}

.brand-glyph {
  font-size: 32px;
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
  margin: 0;
}

.brand-tagline {
  font-family: var(--font-display);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  letter-spacing: 0.08em;
  margin: 0;
}

/* Feature Slides */
.feature-slides {
  width: 100%;
  max-width: 300px;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.feature-card {
  text-align: center;
  padding: 20px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  width: 100%;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.feature-icon {
  font-size: 32px;
  transition: all 0.3s var(--ease-smooth);
}

.feature-title {
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.feature-desc {
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
  max-width: 240px;
}

/* Slide dots */
.slide-dots {
  display: flex;
  gap: 8px;
}

.slide-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  padding: 0;
  transition: all 0.3s var(--ease-smooth);
}

.slide-dot.active {
  width: 20px;
  border-radius: 3px;
  background: var(--neon-purple);
  box-shadow: 0 0 8px rgba(167, 139, 250, 0.5);
}

/* Slide transition */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.35s var(--ease-smooth);
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Enter button */
.enter-btn {
  width: 200px;
  height: 52px;
  border: 1px solid rgba(167, 139, 250, 0.3);
  border-radius: var(--radius-full);
  background: rgba(167, 139, 250, 0.1);
  backdrop-filter: blur(12px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s var(--ease-spring);
}

.enter-btn:hover {
  border-color: rgba(167, 139, 250, 0.5);
  background: rgba(167, 139, 250, 0.18);
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
  letter-spacing: 0.05em;
}

.enter-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--neon-mint);
  box-shadow: 0 0 16px var(--neon-mint);
  animation: glowPulse 1s infinite;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50%      { opacity: 1; transform: scale(1.2); }
}

/* Trust badges */
.trust-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.trust-badge {
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

.trust-divider {
  color: rgba(255, 255, 255, 0.08);
}
</style>
