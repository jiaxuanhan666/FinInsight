<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useTransactionStore } from '../stores/transaction'
import { useAssetStore } from '../stores/asset'
import { useSavingsStore } from '../stores/savings'
import { api } from '../services/api'
import Card from '../components/ui/Card.vue'
import Toast from '../components/ui/Toast.vue'

const router = useRouter()
const userStore = useUserStore()
const txStore = useTransactionStore()
const assetStore = useAssetStore()
const savingsStore = useSavingsStore()

const toastMsg = ref('')
const showToast = ref(false)
const showMerge = ref(false)
const oldUuid = ref('')
const loading = ref(true)

const totalTransactions = computed(() => txStore.transactions.length)
const activeGoalCount = computed(() => savingsStore.goals.filter(g => g.status === 'active').length)
const netWorth = computed(() => assetStore.totalAssetValue - assetStore.totalDebt)

const menuItems = [
  { icon: '&#9733;', label: '攒钱目标', desc: '管理储蓄计划与进度', glow: 'amber', route: '/savings' },
  { icon: '&#9681;', label: 'AI 报告历史', desc: '查看历史分析报告', glow: 'blue', route: '/reports/history' },
  { icon: '&#8594;', label: '找回我的账本', desc: '换设备？合并旧账本数据', glow: 'blue', action: 'merge' },
]

onMounted(async () => {
  await Promise.all([
    txStore.fetchSummary(),
    txStore.fetchTransactions('month'),
    assetStore.fetchAssets(),
    assetStore.fetchLiabilities(),
    savingsStore.fetchGoals(),
  ])
  loading.value = false
})

async function mergeAccount() {
  if (!oldUuid.value.trim()) { toastMsg.value = '请输入旧设备 UUID'; showToast.value = true; return }
  try {
    await api.post('/user/merge', { oldUuid: oldUuid.value.trim() })
    toastMsg.value = '账本成功合并，数据完整留存'; showToast.value = true
    showMerge.value = false
  } catch (err: any) { toastMsg.value = err.message || '合并失败'; showToast.value = true }
}
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">我的</h1>
    </div>

    <!-- Profile Card -->
    <Card glow="purple" style="margin-bottom: var(--space-md); padding: 24px 20px; text-align: center;">
      <div class="avatar-ring">
        <span class="avatar-inner">&#9679;</span>
      </div>
      <div class="profile-name">FinInsight 用户</div>
      <div class="profile-meta">
        <span class="meta-tag">ID: {{ userStore.shortUuid }}...</span>
        <span v-if="userStore.createdAt" class="meta-tag">加入于 {{ new Date(userStore.createdAt).toLocaleDateString('zh-CN') }}</span>
      </div>

      <!-- Mini Stats -->
      <div class="profile-stats">
        <div class="pstat-item">
          <span class="pstat-num text-purple">{{ netWorth.toLocaleString() }}</span>
          <span class="pstat-label">净资产</span>
        </div>
        <div class="pstat-divider"></div>
        <div class="pstat-item">
          <span class="pstat-num text-mint">{{ totalTransactions }}</span>
          <span class="pstat-label">笔记录</span>
        </div>
        <div class="pstat-divider"></div>
        <div class="pstat-item">
          <span class="pstat-num text-amber">{{ activeGoalCount }}</span>
          <span class="pstat-label">攒钱中</span>
        </div>
      </div>
    </Card>

    <!-- Menu Items -->
    <Card style="margin-bottom: var(--space-md);">
      <div
        v-for="(item, i) in menuItems"
        :key="i"
        class="menu-item"
        :class="{ 'menu-item--last': i === menuItems.length - 1 }"
        @click="item.action === 'merge' ? (showMerge = !showMerge) : router.push(item.route!)"
      >
        <span class="menu-icon" :class="`glow-${item.glow}`" v-html="item.icon"></span>
        <div class="menu-info">
          <span class="menu-label">{{ item.label }}</span>
          <span class="menu-desc">{{ item.desc }}</span>
        </div>
        <span class="menu-arrow">&#8250;</span>
      </div>

      <!-- Merge area (expandable) -->
      <div v-if="showMerge" class="merge-area">
        <div class="merge-desc">换设备了？输入旧设备 UUID 找回账本</div>
        <input v-model="oldUuid" class="glass-input" placeholder="输入旧设备 UUID" style="margin-bottom:8px;" />
        <button class="btn-glass primary" style="width:100%;padding:10px;font-size:var(--fs-sm);" @click="mergeAccount">确认合并</button>
      </div>
    </Card>

    <!-- About -->
    <Card>
      <div class="about-info">
        <div class="about-name">FinInsight v2.0</div>
        <div class="about-desc">AI 驱动 · 玻璃拟态 · 霓虹光影</div>
        <div class="about-privacy">
          <span>&#9672; 零隐私采集</span>
          <span>&#9672; 数据全程加密</span>
        </div>
      </div>
    </Card>

    <Toast :message="toastMsg" :show="showToast" @close="showToast = false" />
  </div>
</template>

<style scoped>
.page-title { font-family: var(--font-display); font-size: var(--fs-xl); font-weight: 700; margin: 0; }

/* Profile */
.avatar-ring {
  width: 64px; height: 64px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: rgba(167, 139, 250, 0.1);
  border: 2px solid rgba(167, 139, 250, 0.3);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 24px rgba(167, 139, 250, 0.15);
}
.avatar-inner { font-size: 28px; color: var(--neon-purple); filter: drop-shadow(0 0 8px rgba(167,139,250,0.5)); }

.profile-name { font-family: var(--font-display); font-size: var(--fs-md); font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
.profile-meta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
.meta-tag { font-size: 10px; color: var(--text-muted); background: rgba(255,255,255,0.04); padding: 2px 10px; border-radius: var(--radius-full); font-family: monospace; }

/* Profile stats row */
.profile-stats { display: flex; align-items: center; justify-content: center; gap: 0; padding-top: 16px; border-top: 1px solid var(--border-subtle); }
.pstat-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.pstat-num { font-family: var(--font-display); font-size: var(--fs-lg); font-weight: 700; }
.pstat-label { font-size: 10px; color: var(--text-muted); }
.pstat-divider { width: 1px; height: 28px; background: var(--border-subtle); }

/* Menu */
.menu-item {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 4px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-subtle);
  transition: all var(--dur-fast) var(--ease-smooth);
}
.menu-item:hover { background: rgba(255,255,255,0.02); }
.menu-item--last { border-bottom: none; }

.menu-icon { font-size: 22px; width: 36px; text-align: center; flex-shrink: 0; }
.menu-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.menu-label { font-size: var(--fs-sm); font-weight: 600; color: var(--text-primary); }
.menu-desc { font-size: var(--fs-xs); color: var(--text-muted); }
.menu-arrow { font-size: 20px; color: var(--text-muted); }

/* Merge */
.merge-area { padding: 14px; background: rgba(255,255,255,0.02); border-radius: var(--radius-md); margin: 8px 4px; }
.merge-desc { font-size: var(--fs-xs); color: var(--text-secondary); margin-bottom: 8px; }

/* About */
.about-info { text-align: center; }
.about-name { font-family: var(--font-display); font-size: var(--fs-sm); font-weight: 600; color: var(--text-secondary); }
.about-desc { font-size: var(--fs-xs); color: var(--text-muted); margin-top: 4px; }
.about-privacy { display: flex; gap: 16px; justify-content: center; margin-top: 10px; font-size: 10px; color: var(--text-muted); }
</style>
