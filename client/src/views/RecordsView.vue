<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTransactionStore } from '../stores/transaction'
import { api } from '../services/api'
import BottomSheet from '../components/ui/BottomSheet.vue'
import Toast from '../components/ui/Toast.vue'

const route = useRoute()
const txStore = useTransactionStore()
const searchQuery = ref('')
const activeFilter = ref<'all' | 'expense' | 'asset' | 'pending'>((route.query.filter as any) || 'all')
const toastMsg = ref('')
const showToast = ref(false)

// Category panel (bottom sheet)
const panelTx = ref<any>(null)
const panelCategory = ref('')

const payLabels: Record<string, string> = { card: '银行卡', wechat: '微信', alipay: '支付宝', cash: '现金', other: '其他' }

function openPanel(tx: any) { panelTx.value = tx; panelCategory.value = tx.aiCategory || 'pure_consumption' }
function closePanel() { panelTx.value = null }
const panelTitle = computed(() => panelTx.value ? `修改 "${panelTx.value.categoryNote}" 的分类` : '')
async function applyPanel() {
  if (!panelTx.value || panelCategory.value === panelTx.value.aiCategory) { closePanel(); return }
  await updateCategoryRaw(panelTx.value, panelCategory.value)
  closePanel()
}

const filtered = computed(() => {
  let txs = txStore.transactions
  if (activeFilter.value === 'expense') txs = txs.filter(t => t.aiCategory === 'pure_consumption')
  else if (activeFilter.value === 'asset') txs = txs.filter(t => t.aiCategory === 'alternative_asset')
  else if (activeFilter.value === 'pending') txs = txs.filter(t => t.aiCategory === 'dual_attribute')
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    txs = txs.filter(t => t.categoryNote.toLowerCase().includes(q))
  }
  return txs
})

// Group by date for vertical timeline
const groupedTxs = computed(() => {
  const groups: Record<string, any[]> = {}
  const now = new Date()
  const today = now.toLocaleDateString('zh-CN')
  const yesterday = new Date(now.getTime() - 86400000).toLocaleDateString('zh-CN')
  filtered.value.forEach(tx => {
    const d = new Date(tx.timestamp).toLocaleDateString('zh-CN')
    const key = d === today ? '今天' : d === yesterday ? '昨天' : d
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  })
  return Object.entries(groups)
})

const catOptions = [
  { value: 'pure_consumption', label: '消费', color: '#a1a1aa' },
  { value: 'alternative_asset', label: '资产', color: '#60a5fa' },
  { value: 'dual_attribute', label: '待确认', color: '#fbbf24' },
]

async function updateCategoryRaw(tx: any, newCategory: string) {
  try {
    await api.put(`/transaction/${tx.id}`, { userOverride: true, aiCategory: newCategory })
    await txStore.fetchTransactions('year')
    toastMsg.value = newCategory === 'alternative_asset' ? '已更新为资产' : newCategory === 'dual_attribute' ? '已标记为待确认' : '已更新为消费'
    showToast.value = true
  } catch { toastMsg.value = '更新失败'; showToast.value = true }
}

function catColor(tx: any): string {
  if (tx.aiCategory === 'alternative_asset') return '#60a5fa'
  if (tx.aiCategory === 'dual_attribute') return '#fbbf24'
  return '#52525b'
}
function catLabel(tx: any): string {
  if (tx.aiCategory === 'alternative_asset') return '资产'
  if (tx.aiCategory === 'dual_attribute') return '待确认'
  return '消费'
}

onMounted(async () => { await txStore.fetchTransactions('year') })
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">&#9776; 记录管理</h1>
      <span style="font-size:var(--fs-xs);color:var(--text-muted);">{{ filtered.length }} 条</span>
    </div>

    <!-- Search + Filter -->
    <div style="margin-bottom:var(--space-md);"><input v-model="searchQuery" class="glass-input" placeholder="搜索品类..." /></div>
    <div class="filter-tabs mb-md">
      <button :class="{active:activeFilter==='all'}" @click="activeFilter='all'">全部</button>
      <button :class="{active:activeFilter==='expense'}" @click="activeFilter='expense'">消费</button>
      <button :class="{active:activeFilter==='asset'}" @click="activeFilter='asset'">资产</button>
      <button :class="{active:activeFilter==='pending'}" @click="activeFilter='pending'">待确认</button>
    </div>

    <!-- Empty -->
    <div v-if="filtered.length === 0" style="text-align:center;padding:48px;color:var(--text-muted);">
      {{ activeFilter === 'pending' ? '没有待确认的记录' : '没有匹配记录' }}
    </div>

    <!-- Vertical Timeline -->
    <div v-for="[dateLabel, items] in groupedTxs" :key="dateLabel">
      <div class="tl-month">{{ dateLabel }}</div>
      <div class="tl-list">
        <div v-for="tx in items" :key="tx.id" class="tl-item">
          <div class="tl-dot" :style="{borderColor: catColor(tx)}"></div>
          <div class="tl-card glass-card" style="padding:12px 14px;border-radius:var(--radius-md);">
            <div style="display:flex;align-items:center;gap:10px;">
              <!-- Category button (opens bottom panel) -->
              <button class="cat-toggle" :style="{borderColor:catColor(tx),color:catColor(tx)}"
                @click.stop="openPanel(tx)">{{ catLabel(tx) }}</button>
              <!-- Transaction info -->
              <div style="flex:1;min-width:0;">
                <div style="font-size:var(--fs-md);font-weight:500;">{{ tx.categoryNote }}</div>
                <div style="font-size:var(--fs-xs);color:var(--text-muted);display:flex;align-items:center;gap:6px;">
                  <span v-if="tx.paymentMethod" style="padding:1px 6px;border-radius:var(--radius-full);background:rgba(255,255,255,0.04);">{{ tx.paymentMethod }}</span>
                  <span v-if="tx.aiReasoning">{{ tx.aiReasoning }}</span>
                </div>
              </div>
              <div style="flex-shrink:0;text-align:right;" :style="{fontFamily:'var(--font-display)',fontWeight:700,color:tx.type==='income'?'var(--neon-mint)':'var(--neon-pink)'}">
                {{ tx.type === 'income' ? '+' : '-' }}{{ tx.amount.toFixed(2) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Edit Panel (bottom sheet) -->
    <BottomSheet :show="!!panelTx" :title="panelTitle" @close="closePanel">
      <div class="panel-opts">
        <button v-for="opt in catOptions" :key="opt.value"
          class="panel-opt" :class="{active:panelCategory===opt.value}"
          :style="panelCategory===opt.value?{borderColor:opt.color,color:opt.color,background:opt.color+'12'}:{}"
          @click="panelCategory = opt.value">
          <span class="panel-dot" :style="{background:opt.color}"></span> {{ opt.label }}
        </button>
      </div>
      <template #footer>
        <button class="btn-glass" @click="closePanel">取消</button>
        <button class="btn-glass primary" @click="applyPanel">确认</button>
      </template>
    </BottomSheet>

    <Toast :message="toastMsg" :show="showToast" @close="showToast = false" />
  </div>
</template>

<style scoped>
.filter-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-tabs button { padding: 6px 14px; border: 1px solid var(--border-subtle); border-radius: var(--radius-full); background: transparent; color: var(--text-muted); font-size: var(--fs-xs); cursor: pointer; transition: all var(--dur-fast) var(--ease-smooth); }
.filter-tabs button.active { border-color: var(--border-active); background: rgba(167,139,250,0.08); color: var(--neon-purple); }

/* Timeline */
.tl-month { font-family: var(--font-display); font-size: var(--fs-sm); font-weight: 600; color: var(--neon-purple); padding: 10px 0 4px; border-bottom: 1px solid var(--border-subtle); margin-top: 4px; }
.tl-list { position: relative; padding-left: 20px; }
.tl-item { position: relative; margin-bottom: 4px; }
.tl-dot { position: absolute; left: -14px; top: 16px; width: 10px; height: 10px; border-radius: 50%; background: var(--bg-deep); border: 2px solid var(--border-default); z-index: 1; transition: all var(--dur-fast) var(--ease-smooth); }
.tl-item::before { content: ''; position: absolute; left: -10px; top: 26px; bottom: -4px; width: 1px; background: var(--border-subtle); }
.tl-item:last-child::before { display: none; }
.tl-card { transition: all var(--dur-fast) var(--ease-smooth); }
.tl-card:hover { border-color: rgba(167,139,250,0.15); }

/* Category toggle */
.cat-toggle { padding: 6px 14px; border: 2px solid; border-radius: var(--radius-full); background: transparent; font-size: 13px; font-weight: 600; cursor: pointer; transition: all var(--dur-fast) var(--ease-smooth); white-space: nowrap; min-width: 52px; text-align: center; flex-shrink: 0; }
.cat-toggle:hover { opacity: 0.65; }

/* Bottom panel options (rendered inside BottomSheet) */
.panel-opts { display: flex; flex-direction: column; gap: 8px; }
.panel-opt { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: transparent; color: var(--text-secondary); font-size: var(--fs-md); cursor: pointer; transition: all var(--dur-fast) var(--ease-smooth); text-align: left; width: 100%; }
.panel-opt:hover { border-color: var(--border-default); }
.panel-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
</style>
