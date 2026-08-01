<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const hideNav = computed(() => route.name === 'login')
</script>

<template>
  <div class="app-shell">
    <router-view v-slot="{ Component }">
      <transition name="slide" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- Bottom Navigation -->
    <nav v-if="!hideNav" class="bottom-nav">
      <router-link to="/" class="nav-item" exact-active-class="nav-item--active">
        <span class="nav-glyph">&#9672;</span>
        <span class="nav-label">总览</span>
      </router-link>
      <router-link to="/record" class="nav-item" active-class="nav-item--active">
        <span class="nav-glyph">&#10033;</span>
        <span class="nav-label">记账</span>
      </router-link>
      <router-link to="/balance" class="nav-item" active-class="nav-item--active">
        <span class="nav-glyph">&#9634;</span>
        <span class="nav-label">资产</span>
      </router-link>
      <router-link to="/report" class="nav-item" active-class="nav-item--active">
        <span class="nav-glyph">&#9681;</span>
        <span class="nav-label">AI 报告</span>
      </router-link>
      <router-link to="/savings" class="nav-item" active-class="nav-item--active">
        <span class="nav-glyph">&#9733;</span>
        <span class="nav-label">攒钱</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
  background: rgba(18, 18, 31, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-decoration: none;
  padding: 4px 14px;
  border-radius: var(--radius-md);
  transition: all var(--dur-fast) var(--ease-smooth);
  position: relative;
}

.nav-glyph {
  font-size: 20px;
  color: var(--text-muted);
  transition: all var(--dur-fast) var(--ease-smooth);
}

.nav-label {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-muted);
  transition: all var(--dur-fast) var(--ease-smooth);
}

.nav-item--active .nav-glyph {
  color: var(--neon-purple);
  text-shadow: 0 0 12px rgba(167, 139, 250, 0.5);
}

.nav-item--active .nav-label {
  color: var(--neon-purple);
}

.nav-item--active::before {
  content: '';
  position: absolute;
  top: -6px;
  width: 20px;
  height: 3px;
  background: var(--neon-purple);
  border-radius: var(--radius-full);
  box-shadow: 0 0 8px rgba(167, 139, 250, 0.6);
}

/* Route transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.slide-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
