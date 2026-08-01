<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTransactionStore } from '../stores/transaction'
import { useAssetStore } from '../stores/asset'
import { useSavingsStore } from '../stores/savings'
import { useUserStore } from '../stores/user'
import { trackEvent } from '../services/api'
import Card from '../components/ui/Card.vue'
import BarChart from '../components/charts/BarChart.vue'
import PieChart from '../components/charts/PieChart.vue'

const router = useRouter()
const txStore = useTransactionStore()
const assetStore = useAssetStore()
const savingsStore = useSavingsStore()
const userStore = useUserStore()
const loading = ref(true)
const period = ref<'week' | 'month' | 'year'>('month')

const netWorth = computed(() => assetStore.totalAssetValue - assetStore.totalDebt)

// Savings alert
const totalMonthlyTarget = computed(() => savingsStore.goals.filter(g => g.status === 'active').reduce((s, g) => s + g.monthlyTarget, 0))
const savingsGap = computed(() => {
  if (totalMonthlyTarget.value <= 0) return 0
  return Math.abs((txStore.monthIncome - txStore.monthExpense) - totalMonthlyTarget.value)
})
const savingsAlertLevel = computed(() => {
  if (totalMonthlyTarget.value <= 0) return ''
  const net = txStore.monthIncome - txStore.monthExpense
  if (net >= totalMonthlyTarget.value) return 'safe'
  if (net >= totalMonthlyTarget.value * 0.7) return 'warn'
  return 'danger'
})

// ---- Monthly Repayment Tracker ----
function getRepayKey(liabilityId: string): string {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return `fininsight_repay_${ym}_${liabilityId}`
}

const monthlyLiabilities = computed(() =>
  assetStore.liabilities.filter(l => l.monthlyPayment > 0)
)

const repayStatus = ref<Record<string, boolean>>({})

function loadRepayStatus() {
  const status: Record<string, boolean> = {}
  for (const l of monthlyLiabilities.value) {
    status[l.id] = localStorage.getItem(getRepayKey(l.id)) === '1'
  }
  repayStatus.value = status
}

function toggleRepay(liabilityId: string) {
  const key = getRepayKey(liabilityId)
  const current = repayStatus.value[liabilityId]
  if (current) {
    localStorage.removeItem(key)
    repayStatus.value[liabilityId] = false
  } else {
    localStorage.setItem(key, '1')
    repayStatus.value[liabilityId] = true
  }
}

const repaidCount = computed(() =>
  Object.values(repayStatus.value).filter(Boolean).length
)
const totalMonthlyRepay = computed(() =>
  monthlyLiabilities.value.reduce((s, l) => s + l.monthlyPayment, 0)
)
const repayProgress = computed(() =>
  monthlyLiabilities.value.length > 0
    ? Math.round((repaidCount.value / monthlyLiabilities.value.length) * 100)
    : 0
)

const liabilityTypeLabels: Record<string, string> = {
  credit_card: '信用卡', installment: '消费分期', mortgage: '房贷',
  car_loan: '车贷', personal_loan: '个人借贷', other: '其他负债',
}

// Chart data derived from real transactions
const periodMap: Record<string, number> = { week: 7*86400000, month: 30*86400000, year: 365*86400000 }

const barLabels = computed(() => {
  if (period.value === 'week') return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  if (period.value === 'month') return ['W1','W2','W3','W4']
  return ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
})

const barIncome = computed(() => {
  const now = Date.now(); const since = now - periodMap[period.value]; const slots = period.value === 'week' ? 7 : period.value === 'month' ? 4 : 12; const slotMs = (now - since) / slots
  const txs = txStore.transactions.filter(t => t.type === 'income' && t.timestamp >= since)
  return Array.from({length: slots}, (_, i) => {
    const start = since + i * slotMs; const end = start + slotMs
    return Math.round(txs.filter(t => t.timestamp >= start && t.timestamp < end).reduce((s, t) => s + t.baseAmount, 0))
  })
})

const barExpense = computed(() => {
  const now = Date.now(); const since = now - periodMap[period.value]; const slots = period.value === 'week' ? 7 : period.value === 'month' ? 4 : 12; const slotMs = (now - since) / slots
  const txs = txStore.transactions.filter(t => t.type === 'expense' && t.timestamp >= since)
  return Array.from({length: slots}, (_, i) => {
    const start = since + i * slotMs; const end = start + slotMs
    return Math.round(txs.filter(t => t.timestamp >= start && t.timestamp < end).reduce((s, t) => s + t.baseAmount, 0))
  })
})

const incomeRanking = computed(() => {
  const now = Date.now(); const since = now - periodMap[period.value]
  const txs = txStore.transactions.filter(t => t.type === 'income' && t.timestamp >= since)
  const map: Record<string, number> = {}; txs.forEach(t => { map[t.categoryNote] = (map[t.categoryNote] || 0) + t.baseAmount })
  return Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0,5).map(([name, amount]) => ({ name, amount }))
})

const expenseRanking = computed(() => {
  const now = Date.now(); const since = now - periodMap[period.value]
  const txs = txStore.transactions.filter(t => t.type === 'expense' && t.timestamp >= since)
  const map: Record<string, number> = {}; txs.forEach(t => { map[t.categoryNote] = (map[t.categoryNote] || 0) + t.baseAmount })
  return Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0,8).map(([name, amount]) => ({ name, amount }))
})

const assetPieData = computed(() => {
  const data: { name: string; value: number; color: string }[] = []
  if (assetStore.alternativeValue > 0) data.push({ name: '另类资产', value: assetStore.alternativeValue, color: '#c084fc' })
  if (assetStore.financialValue > 0) data.push({ name: '金融资产', value: assetStore.financialValue, color: '#60a5fa' })
  if (data.length === 0) data.push({ name: '暂未录入', value: 1, color: 'rgba(255,255,255,0.08)' })
  return data
})

const activeGoals = computed(() => savingsStore.goals.filter(g => g.status === 'active'))

onMounted(async () => {
  await Promise.all([
    txStore.fetchSummary(),
    txStore.fetchTransactions('month'),
    assetStore.fetchAssets(),
    assetStore.fetchLiabilities(),
    savingsStore.fetchGoals(),
  ])
  loadRepayStatus()
  loading.value = false
  trackEvent('page_view')
})
</script>

<template>
  <div class="page">
    <!-- Header: "我的" button left, FinInsight + date right -->
    <div class="page-header">
      <button class="my-btn" @click="router.push('/settings')" aria-label="个人中心">
        <span class="my-avatar">&#9679;</span>
        <span class="my-label">我的</span>
      </button>
      <div class="header-right">
        <div class="header-label">FinInsight</div>
        <div class="header-date">{{ new Date().toLocaleDateString('zh-CN', { month:'long', day:'numeric' }) }}</div>
      </div>
    </div>

    <!-- Hero Card: Net Worth -->
    <Card glow="purple" :stagger="1" style="margin-bottom: var(--space-md); padding: 24px 20px;">
      <div class="hero-label">&#9672; 净资产</div>
      <div class="hero-amount">
        <span class="count-num">{{ netWorth.toLocaleString() }}</span>
      </div>
      <div class="hero-trend">
        <span class="trend-up">&#9650; 12.5%</span>
        <span class="trend-vs">较上月</span>
        <span v-if="savingsAlertLevel" class="savings-pill" :class="`sp-${savingsAlertLevel}`" style="margin-left:auto;">
          <span v-if="savingsAlertLevel === 'safe'">&#9672; 储蓄达标</span>
          <span v-else-if="savingsAlertLevel === 'warn'">&#9650; 还差 {{ savingsGap.toLocaleString() }}</span>
          <span v-else>&#9660; 超 {{ savingsGap.toLocaleString() }}</span>
        </span>
      </div>
    </Card>

    <!-- Bento Grid: 4 Stats -->
    <div class="bento-4">
      <Card v-for="(stat, i) in [
        { label: '收入', value: txStore.monthIncome, change: '+5%', icon: '&#9650;', glow: 'mint' },
        { label: '支出', value: txStore.monthExpense, change: '-3%', icon: '&#9660;', glow: 'pink' },
        { label: '资产', value: assetStore.totalAssetValue, change: '+8%', icon: '&#9672;', glow: 'blue' },
        { label: '负债', value: assetStore.totalDebt, change: '--', icon: '&#9661;', glow: 'amber' },
      ]" :key="stat.label" :glow="stat.glow as any" :stagger="i+2" style="padding: 16px;">
        <div class="stat-mini">
          <span class="geo-icon sm" :class="`glow-${stat.glow}`" v-html="stat.icon"></span>
          <div class="stat-mini-info">
            <span class="stat-mini-label">{{ stat.label }}</span>
            <span class="stat-mini-value">{{ stat.value.toLocaleString() }}</span>
          </div>
          <span class="stat-mini-change" :class="stat.change.startsWith('+') ? 'text-mint' : stat.change === '--' ? 'text-muted' : 'text-pink'">{{ stat.change }}</span>
        </div>
      </Card>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button class="quick-btn" @click="router.push('/record')">
        <span class="geo-icon glow-mint">&#10033;</span>
        <span class="quick-label">记一笔</span>
      </button>
      <button class="quick-btn" @click="router.push('/balance')">
        <span class="geo-icon glow-blue">&#9672;</span>
        <span class="quick-label">加资产</span>
      </button>
      <button class="quick-btn" @click="router.push('/savings')">
        <span class="geo-icon glow-amber">&#9733;</span>
        <span class="quick-label">定目标</span>
      </button>
    </div>

    <!-- Monthly Repayment Tracker -->
    <Card v-if="monthlyLiabilities.length > 0" glow="coral" style="margin-bottom: var(--space-md); padding: 16px;">
      <div class="repay-header">
        <span class="repay-title">&#9661; 月度还款</span>
        <span class="repay-month">本月</span>
      </div>
      <div class="repay-list">
        <button
          v-for="liab in monthlyLiabilities"
          :key="liab.id"
          class="repay-item"
          :class="{ 'repay-done': repayStatus[liab.id] }"
          @click="toggleRepay(liab.id)"
        >
          <span class="repay-check" :class="{ checked: repayStatus[liab.id] }">
            <span v-if="repayStatus[liab.id]">&#10003;</span>
          </span>
          <div class="repay-info">
            <span class="repay-name">{{ liab.name }}</span>
            <span class="repay-type">{{ liabilityTypeLabels[liab.type] || liab.type }}</span>
          </div>
          <span class="repay-amount" :class="{ done: repayStatus[liab.id] }">{{ liab.monthlyPayment.toLocaleString() }}</span>
        </button>
      </div>
      <div class="repay-footer">
        <div class="repay-track">
          <div class="repay-track-fill" :style="{ width: repayProgress + '%' }"></div>
        </div>
        <span class="repay-summary">已还 {{ repaidCount }}/{{ monthlyLiabilities.length }} 项 · 合计 {{ totalMonthlyRepay.toLocaleString() }}/月</span>
      </div>
    </Card>

    <!-- AI Insights (interactive) -->
    <Card v-if="txStore.transactions.length > 0" glow="purple" style="margin-bottom: var(--space-md); padding: 16px;" :stagger="3">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-family:var(--font-display);font-size:var(--fs-sm);font-weight:600;color:var(--neon-purple);">&#9672; AI 分类</span>
        <span style="font-size:10px;color:var(--text-muted);">本月</span>
      </div>
      <div style="display:flex;gap:8px;font-size:var(--fs-xs);">
        <div class="ai-stat-cell" @click="router.push('/records')" style="flex:1;">
          <div class="ai-stat-num" style="color:var(--neon-purple);">{{ txStore.transactions.filter(t => t.aiConfidence && t.aiConfidence > 0.8).length }}</div>
          <div class="ai-stat-label">高置信分类 <span class="ai-arrow">&#8250;</span></div>
        </div>
        <div class="ai-stat-cell" @click="router.push('/balance')" style="flex:1;">
          <div class="ai-stat-num" style="color:var(--neon-blue);">{{ txStore.transactions.filter(t => t.aiCategory === 'alternative_asset').length }}</div>
          <div class="ai-stat-label">识别资产 <span class="ai-arrow">&#8250;</span></div>
        </div>
        <div class="ai-stat-cell" @click="router.push('/records?filter=pending')" style="flex:1;">
          <div class="ai-stat-num" style="color:var(--neon-amber);">{{ txStore.transactions.filter(t => t.aiCategory === 'dual_attribute').length }}</div>
          <div class="ai-stat-label">待确认 <span class="ai-arrow">&#8250;</span></div>
        </div>
      </div>
    </Card>

    <!-- Time-Period Stats -->
    <Card style="margin-bottom: var(--space-md); padding: 20px;" :stagger="3">
      <div class="section-head">
        <span class="section-title">&#9776; 收支统计</span>
        <div class="period-tabs">
          <button v-for="p in (['week','month','year'] as const)" :key="p"
            class="period-tab" :class="{ active: period === p }"
            @click="period = p"
          >{{ {week:'周',month:'月',year:'年'}[p] }}</button>
        </div>
      </div>
      <BarChart :labels="barLabels" :income-data="barIncome" :expense-data="barExpense" />
    </Card>

    <!-- Income & Expense Rankings -->
    <div class="rank-row">
      <Card glow="mint" style="flex:1; padding: 16px;" :stagger="4">
        <div class="rank-title">&#9650; 收入排名</div>
        <div class="rank-list">
          <div v-for="(item, i) in incomeRanking.slice(0,5)" :key="i" class="rank-item">
            <span class="rank-idx">{{ i+1 }}</span>
            <span class="rank-name">{{ item.name }}</span>
            <span class="rank-val text-mint">{{ item.amount.toLocaleString() }}</span>
          </div>
        </div>
      </Card>
      <Card glow="pink" style="flex:1; padding: 16px;" :stagger="5">
        <div class="rank-title">&#9660; 支出排名</div>
        <div class="rank-list">
          <div v-for="(item, i) in expenseRanking.slice(0,5)" :key="i" class="rank-item">
            <span class="rank-idx">{{ i+1 }}</span>
            <span class="rank-name">{{ item.name }}</span>
            <span class="rank-val text-pink">{{ item.amount.toLocaleString() }}</span>
          </div>
        </div>
      </Card>
    </div>

    <!-- Asset & Savings: Bottom Row -->
    <div class="bento-2">
      <Card glow="blue" :stagger="6" clickable @click="router.push('/balance')" style="padding: 16px;">
        <div class="rank-title">&#9672; 资产结构</div>
        <PieChart v-if="assetPieData.length > 0 && assetStore.totalAssetValue > 0" :data="assetPieData" />
        <div v-else class="empty-mini">暂无资产数据</div>
      </Card>
      <Card glow="amber" :stagger="6" clickable @click="router.push('/savings')" style="padding: 16px;">
        <div class="rank-title">&#9733; 攒钱进度</div>
        <div v-if="activeGoals.length > 0">
          <div v-for="goal in activeGoals.slice(0,2)" :key="goal.id" class="goal-mini">
            <div class="goal-mini-head">
              <span>{{ goal.name }}</span>
              <span class="text-amber">{{ savingsStore.getProgress(goal) }}%</span>
            </div>
            <div class="goal-mini-track">
              <div class="goal-mini-fill" :style="{ width: savingsStore.getProgress(goal) + '%' }"></div>
            </div>
          </div>
        </div>
        <div v-else class="empty-mini">还没有攒钱目标</div>
      </Card>
    </div>
  </div>
</template>

<style scoped>
/* Header */
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.header-right { text-align: right; }
.header-label { font-size: var(--fs-xs); color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; }
.header-date { font-family: var(--font-display); font-size: var(--fs-xl); font-weight: 600; margin-top: 2px; }

/* "我的" button — left side of header */
.my-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 14px 6px 6px;
  background: rgba(167, 139, 250, 0.08);
  border: 1px solid rgba(167, 139, 250, 0.18);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--dur-normal) var(--ease-spring);
  flex-shrink: 0;
}
.my-btn:hover {
  background: rgba(167, 139, 250, 0.15);
  border-color: rgba(167, 139, 250, 0.35);
  box-shadow: 0 0 16px rgba(167, 139, 250, 0.2);
  transform: scale(1.03);
}
.my-btn:active { transform: scale(0.95); }
.my-avatar {
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(167, 139, 250, 0.15);
  border-radius: 50%;
  font-size: 18px;
  color: var(--neon-purple);
  filter: drop-shadow(0 0 6px rgba(167, 139, 250, 0.4));
}
.my-label {
  font-family: var(--font-display);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--neon-purple);
  letter-spacing: 0.04em;
}

.hero-label { font-size: var(--fs-xs); color: var(--text-secondary); letter-spacing: 0.08em; margin-bottom: 4px; }
.hero-amount { margin: 4px 0; }
.count-num { font-family: var(--font-display); font-size: var(--fs-3xl); font-weight: 800; color: var(--text-primary); letter-spacing: -0.03em; }
.hero-trend { display: flex; gap: 8px; font-size: var(--fs-sm); }
.trend-up { color: var(--neon-mint); font-weight: 600; }
.trend-vs { color: var(--text-muted); }

.bento-4 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); margin-bottom: var(--space-md); }
.stat-mini { display: flex; align-items: center; gap: 10px; }
.stat-mini-info { flex: 1; display: flex; flex-direction: column; }
.stat-mini-label { font-size: var(--fs-xs); color: var(--text-muted); }
.stat-mini-value { font-family: var(--font-display); font-size: var(--fs-md); font-weight: 700; }
.stat-mini-change { font-size: var(--fs-xs); font-weight: 600; }

.quick-actions { display: flex; gap: var(--space-sm); margin-bottom: var(--space-md); }
.quick-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 14px 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--dur-normal) var(--ease-spring);
}
.quick-btn:hover { border-color: var(--border-active); background: rgba(255,255,255,0.05); transform: translateY(-1px); }
.quick-btn:active { transform: scale(0.96); }
.quick-label { font-family: var(--font-display); font-size: var(--fs-sm); font-weight: 600; color: var(--text-secondary); }

/* Monthly Repayment Card */
.repay-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.repay-title { font-family: var(--font-display); font-size: var(--fs-sm); font-weight: 600; color: var(--neon-coral); }
.repay-month { font-size: 10px; color: var(--text-muted); background: rgba(255,255,255,0.04); padding: 2px 10px; border-radius: var(--radius-full); }
.repay-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.repay-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-smooth);
  text-align: left;
  width: 100%;
}
.repay-item:hover { background: rgba(255,255,255,0.03); }
.repay-item.repay-done { opacity: 0.5; }
.repay-check {
  width: 22px; height: 22px;
  border: 2px solid rgba(251, 113, 133, 0.3);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: var(--neon-mint);
  flex-shrink: 0;
  transition: all var(--dur-fast) var(--ease-smooth);
}
.repay-check.checked {
  border-color: var(--neon-mint);
  background: rgba(52, 211, 153, 0.15);
}
.repay-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.repay-name { font-size: var(--fs-sm); font-weight: 500; color: var(--text-primary); }
.repay-type { font-size: 10px; color: var(--text-muted); }
.repay-amount { font-family: var(--font-display); font-size: var(--fs-sm); font-weight: 700; color: var(--neon-coral); }
.repay-amount.done { color: var(--neon-mint); text-decoration: line-through; }
.repay-footer { display: flex; flex-direction: column; gap: 6px; }
.repay-track { height: 4px; background: rgba(255,255,255,0.06); border-radius: var(--radius-full); overflow: hidden; }
.repay-track-fill { height: 100%; background: var(--neon-mint); border-radius: var(--radius-full); transition: width 0.4s var(--ease-spring); box-shadow: 0 0 6px rgba(52,211,153,0.3); }
.repay-summary { font-size: 10px; color: var(--text-muted); text-align: center; }

.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.section-title { font-family: var(--font-display); font-size: var(--fs-md); font-weight: 600; }
.period-tabs { display: flex; gap: 4px; background: rgba(255,255,255,0.04); border-radius: var(--radius-full); padding: 2px; }
.period-tab {
  padding: 4px 14px; border: none; border-radius: var(--radius-full);
  background: transparent; color: var(--text-muted); font-size: var(--fs-xs); font-weight: 500; cursor: pointer;
  transition: all var(--dur-fast) var(--ease-smooth);
}
.period-tab.active { background: rgba(167,139,250,0.2); color: var(--neon-purple); }

.rank-row { display: flex; gap: var(--space-sm); margin-bottom: var(--space-md); }
.rank-title { font-family: var(--font-display); font-size: var(--fs-sm); font-weight: 600; color: var(--text-secondary); margin-bottom: 10px; }
.rank-list { display: flex; flex-direction: column; gap: 6px; }
.rank-item { display: flex; align-items: center; gap: 6px; font-size: var(--fs-xs); }
.rank-idx { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--text-muted); border-radius: 4px; background: rgba(255,255,255,0.04); }
.rank-name { flex: 1; color: var(--text-secondary); }
.rank-val { font-family: var(--font-display); font-weight: 600; }

.bento-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); }

.goal-mini { margin-bottom: 8px; }
.goal-mini:last-child { margin-bottom: 0; }
.goal-mini-head { display: flex; justify-content: space-between; font-size: var(--fs-xs); margin-bottom: 4px; color: var(--text-secondary); }
.goal-mini-track { height: 6px; background: rgba(255,255,255,0.06); border-radius: var(--radius-full); overflow: hidden; }
.goal-mini-fill { height: 100%; background: var(--neon-amber); border-radius: var(--radius-full); box-shadow: 0 0 8px rgba(251,191,36,0.3); transition: width 0.6s var(--ease-spring); }

.empty-mini { text-align: center; padding: 32px 0; font-size: var(--fs-xs); color: var(--text-muted); }

.ai-stat-cell { text-align: center; padding: 10px 6px; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px solid transparent; cursor: pointer; transition: all var(--dur-fast) var(--ease-smooth); }
.ai-stat-cell:hover { border-color: var(--border-active); background: rgba(167,139,250,0.06); transform: translateY(-2px); }
.ai-stat-num { font-family: var(--font-display); font-size: var(--fs-lg); font-weight: 700; }
.ai-stat-label { color: var(--text-muted); margin-top: 2px; display: flex; align-items: center; justify-content: center; gap: 2px; }
.ai-arrow { opacity: 0; transition: opacity var(--dur-fast) var(--ease-smooth); }
.ai-stat-cell:hover .ai-arrow { opacity: 1; }

.savings-pill { font-size: 10px; padding: 2px 10px; border-radius: var(--radius-full); font-weight: 600; white-space: nowrap; }
.sp-safe { background: rgba(52,211,153,0.1); color: var(--neon-mint); border: 1px solid rgba(52,211,153,0.2); }
.sp-warn { background: rgba(251,191,36,0.1); color: var(--neon-amber); border: 1px solid rgba(251,191,36,0.2); }
.sp-danger { background: rgba(251,113,133,0.1); color: var(--neon-coral); border: 1px solid rgba(251,113,133,0.2); }
</style>
