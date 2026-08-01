<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTransactionStore } from '../stores/transaction'
import { api } from '../services/api'
import { trackEvent } from '../services/api'
import Card from '../components/ui/Card.vue'
import Toast from '../components/ui/Toast.vue'

const router = useRouter()
const txStore = useTransactionStore()
const form = ref<{ amount: string; type: 'expense' | 'income'; categoryNote: string; note: string; paymentMethod: string }>({ amount: '', type: 'expense', categoryNote: '', note: '', paymentMethod: '' })
const payMethods = ['银行卡', '微信', '支付宝', '现金', '其他']
const submitting = ref(false)
const toastMsg = ref('')
const showToast = ref(false)
const historyFilter = ref<'all' | 'expense' | 'income'>('all')

// ---- Custom Categories ----
const CUSTOM_CAT_KEY = 'fininsight_custom_categories'
const defaultCategories = ['餐饮', '交通', '购物', '潮玩', '数码', '娱乐', '日用', '房租', '副业', '薪资']
const MAX_CUSTOM = 20

const customCategories = ref<string[]>([])

function loadCustomCategories() {
  try {
    const raw = localStorage.getItem(CUSTOM_CAT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) customCategories.value = parsed.filter(c => typeof c === 'string' && c.trim())
    }
  } catch { customCategories.value = [] }
}

function saveCustomCategories() {
  localStorage.setItem(CUSTOM_CAT_KEY, JSON.stringify(customCategories.value))
}

const allCategories = computed(() => [...defaultCategories, ...customCategories.value])

const showAddCat = ref(false)
const newCatName = ref('')

function addCustomCategory() {
  const name = newCatName.value.trim()
  if (!name) { toastMsg.value = '请输入品类名称'; showToast.value = true; return }
  if (allCategories.value.includes(name)) { toastMsg.value = '该品类已存在'; showToast.value = true; return }
  if (customCategories.value.length >= MAX_CUSTOM) { toastMsg.value = `最多添加 ${MAX_CUSTOM} 个自定义品类`; showToast.value = true; return }
  customCategories.value.push(name)
  saveCustomCategories()
  form.value.categoryNote = name
  newCatName.value = ''
  showAddCat.value = false
}

function removeCustomCategory(name: string) {
  customCategories.value = customCategories.value.filter(c => c !== name)
  saveCustomCategories()
  if (form.value.categoryNote === name) form.value.categoryNote = ''
}

// Confirmation dialog
const showConfirm = ref(false)
const pendingTx = ref<{ id: string; note: string; amount: string }>({ id: '', note: '', amount: '' })

const filteredTxs = computed(() => {
  if (historyFilter.value === 'all') return txStore.transactions
  return txStore.transactions.filter(t => t.type === historyFilter.value)
})

// Group by date, limit to 10 most recent
const groupedRecent = computed(() => {
  const txs = filteredTxs.value.slice(0, 10)
  const groups: Record<string, any[]> = {}
  const now = new Date()
  const today = now.toLocaleDateString('zh-CN')
  const yesterday = new Date(now.getTime() - 86400000).toLocaleDateString('zh-CN')
  txs.forEach(tx => {
    const d = new Date(tx.timestamp).toLocaleDateString('zh-CN')
    const key = d === today ? '今天' : d === yesterday ? '昨天' : d
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  })
  return Object.entries(groups)
})

async function submit() {
  const amount = parseFloat(form.value.amount)
  if (!amount || amount <= 0) { toastMsg.value = '请输入有效金额'; showToast.value = true; return }
  if (!form.value.categoryNote.trim()) { toastMsg.value = '请填写品类备注'; showToast.value = true; return }

  submitting.value = true
  try {
    const result = await txStore.createTransaction({
      amount, type: form.value.type,
      categoryNote: form.value.categoryNote.trim(),
      note: form.value.note, currency: 'CNY',
      paymentMethod: form.value.paymentMethod,
    })
    const catNote = form.value.categoryNote
    const fAmount = form.value.amount
    form.value = { amount: '', type: 'expense', categoryNote: '', note: '', paymentMethod: '' }
    if (result.needsConfirmation) {
      pendingTx.value = { id: result.id, note: catNote, amount: fAmount }
      showConfirm.value = true
    } else {
      toastMsg.value = result.aiCategory === 'alternative_asset' ? '已自动归入资产台账' : '记账成功'
      showToast.value = true
    }
    trackEvent('transaction_create')
  } catch (err: any) {
    toastMsg.value = err.message || '记账失败'
    showToast.value = true
  } finally { submitting.value = false }
}

async function confirmCategory(asAsset: boolean) {
  try {
    await api.put(`/transaction/${pendingTx.value.id}`, {
      userOverride: true,
      aiCategory: asAsset ? 'alternative_asset' : 'pure_consumption',
    })
    await txStore.fetchTransactions('month')
    toastMsg.value = asAsset ? '已归入资产台账' : '已记为日常消费'
    showToast.value = true
  } catch { toastMsg.value = '操作失败'; showToast.value = true }
  showConfirm.value = false
}

onMounted(async () => {
  await txStore.fetchTransactions('month')
  loadCustomCategories()
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">&#10033; 记一笔</h1>
      <button class="btn-glass" style="padding:6px 14px;font-size:var(--fs-xs);" @click="router.push('/records')">&#9776; 管理</button>
    </div>

    <Card style="margin-bottom: var(--space-lg);">
      <div class="type-row">
        <button :class="['type-btn', { active: form.type === 'expense' }]" @click="form.type = 'expense'">
          <span class="geo-icon sm" :class="form.type === 'expense' ? 'glow-pink' : ''">&#9660;</span>
          <span>支出</span>
        </button>
        <button :class="['type-btn', { active: form.type === 'income' }]" @click="form.type = 'income'">
          <span class="geo-icon sm" :class="form.type === 'income' ? 'glow-mint' : ''">&#9650;</span>
          <span>收入</span>
        </button>
      </div>

      <div class="amount-area">
        <span class="curr-sym">CNY</span>
        <input v-model="form.amount" type="number" step="0.01" min="0" placeholder="0.00" class="amount-input" />
      </div>

      <div class="mt-md"><input v-model="form.categoryNote" type="text" class="glass-input" placeholder="品类备注" maxlength="100" /></div>
      <div class="mt-sm"><input v-model="form.note" type="text" class="glass-input" placeholder="添加备注（选填）" maxlength="200" /></div>

      <!-- Category Chips -->
      <div class="chip-row mt-md">
        <button
          v-for="cat in allCategories"
          :key="cat"
          :class="['chip', { active: form.categoryNote === cat, custom: customCategories.includes(cat) }]"
          @click="form.categoryNote = cat"
        >
          <span>{{ cat }}</span>
          <span
            v-if="customCategories.includes(cat)"
            class="chip-del"
            @click.stop="removeCustomCategory(cat)"
            title="删除此品类"
          >&#10005;</span>
        </button>
        <!-- Add custom button -->
        <button v-if="!showAddCat" class="chip chip-add" @click="showAddCat = true">+ 自定义</button>
      </div>

      <!-- Add custom category input -->
      <div v-if="showAddCat" class="add-cat-row mt-sm">
        <input
          v-model="newCatName"
          class="glass-input"
          placeholder="输入新品类名称"
          maxlength="20"
          @keyup.enter="addCustomCategory"
        />
        <button class="chip chip-confirm" @click="addCustomCategory">添加</button>
        <button class="chip chip-cancel" @click="showAddCat = false; newCatName = ''">取消</button>
      </div>

      <!-- Payment method -->
      <div class="pay-row mt-sm">
        <span class="pay-label">支付</span>
        <button v-for="pm in payMethods" :key="pm" :class="['chip',{active:form.paymentMethod===pm}]" @click="form.paymentMethod = form.paymentMethod===pm ? '' : pm">{{ pm }}</button>
      </div>

      <button class="btn-glass primary submit-btn mt-lg" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中...' : '记录' }}
      </button>
    </Card>

    <!-- History -->
    <div class="section-head mb-md">
      <span class="section-title">最近记录</span>
    </div>

    <div v-if="filteredTxs.length === 0" class="empty-state">还没有记录</div>

    <div v-for="[dateLabel, items] in groupedRecent" :key="dateLabel">
      <div class="date-divider">{{ dateLabel }}</div>
      <div v-for="tx in items" :key="tx.id" class="tx-row glass-card" style="padding:14px 16px; margin-bottom:6px; border-radius:var(--radius-md);">
        <div class="tx-left">
          <span class="geo-icon sm" :class="tx.type === 'income' ? 'glow-mint' : 'glow-pink'" v-html="tx.type === 'income' ? '&#9650;' : '&#9660;'"></span>
          <div>
            <div class="tx-cat">{{ tx.categoryNote }}</div>
            <div class="tx-meta">
              <span v-if="tx.aiCategory === 'alternative_asset'" class="tag-asset" @click.stop="router.push('/balance')">AI 识别</span>
              <span v-else-if="tx.aiCategory === 'dual_attribute'" class="tag-pending clickable" @click.stop="router.push('/records?filter=pending')">待确认 &#8250;</span>
              <span v-else-if="tx.aiReasoning" class="tag-reason">{{ tx.aiReasoning }}</span>
            </div>
          </div>
        </div>
        <div class="tx-amount" :class="tx.type === 'income' ? 'text-mint' : 'text-pink'">
          {{ tx.type === 'income' ? '+' : '-' }}{{ tx.amount.toFixed(2) }}
        </div>
      </div>
    </div>

    <div v-if="txStore.transactions.length > 10" style="text-align:center;padding:12px;">
      <button class="btn-glass" @click="router.push('/records')">查看全部 {{ txStore.transactions.length }} 条记录 &#8250;</button>
    </div>

    <!-- Confirmation Dialog -->
    <div v-if="showConfirm" class="confirm-overlay" @click.self="confirmCategory(false)">
      <div class="confirm-card glass-card">
        <div class="confirm-icon">&#9672;</div>
        <div class="confirm-title">"{{ pendingTx.note }}"</div>
        <div class="confirm-desc">属于可变现品类，未来有可能通过二手市场变现</div>
        <div class="confirm-amount">{{ pendingTx.amount }}</div>
        <div class="confirm-btns">
          <button class="btn-glass" style="flex:1;" @click="confirmCategory(false)">仅自用 &#9660;</button>
          <button class="btn-glass primary" style="flex:1;" @click="confirmCategory(true)">可能卖出 &#9650;</button>
        </div>
        <div class="confirm-hint">选择后该品类将永久记忆，不再询问</div>
      </div>
    </div>

    <Toast :message="toastMsg" :show="showToast" @close="showToast = false" />
  </div>
</template>

<style scoped>
.section-head { display: flex; justify-content: space-between; align-items: center; }
.section-title { font-family: var(--font-display); font-size: var(--fs-md); font-weight: 600; }

.type-row { display: flex; gap: var(--space-sm); margin-bottom: var(--space-lg); }
.type-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-full); background: transparent; color: var(--text-secondary); font-family: var(--font-display); font-size: var(--fs-md); font-weight: 600; cursor: pointer; transition: all var(--dur-fast) var(--ease-smooth); }
.type-btn.active { border-color: rgba(167,139,250,0.3); background: rgba(167,139,250,0.08); color: var(--text-primary); }

.amount-area { display: flex; align-items: center; justify-content: center; padding: 24px 0; }
.curr-sym { font-family: var(--font-display); font-size: var(--fs-lg); font-weight: 700; color: var(--text-muted); margin-right: 8px; }
.amount-input { font-family: var(--font-display); font-size: var(--fs-3xl); font-weight: 800; text-align: center; border: none; background: transparent; color: var(--text-primary); width: 200px; padding: 0; outline: none; letter-spacing: -0.02em; }
.amount-input::placeholder { color: rgba(255,255,255,0.1); }

/* Category chips */
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 14px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  background: rgba(255,255,255,0.02);
  color: var(--text-secondary);
  font-size: var(--fs-xs);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-smooth);
}
.chip:hover { border-color: var(--border-active); color: var(--neon-purple); }
.chip.active { border-color: var(--neon-purple); background: rgba(167,139,250,0.1); color: var(--neon-purple); }

/* Custom category chip — distinct style */
.chip.custom {
  border-color: rgba(167, 139, 250, 0.25);
  background: rgba(167, 139, 250, 0.06);
  color: var(--neon-purple);
}
.chip.custom:hover { background: rgba(167, 139, 250, 0.14); }
.chip.custom.active { background: rgba(167, 139, 250, 0.2); border-color: var(--neon-purple); }

.chip-del {
  display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: rgba(251, 113, 133, 0.2);
  color: var(--neon-coral);
  font-size: 8px;
  line-height: 1;
  transition: all var(--dur-fast) var(--ease-smooth);
}
.chip-del:hover { background: rgba(251, 113, 133, 0.4); }

.chip-add {
  border-style: dashed;
  border-color: rgba(167, 139, 250, 0.2);
  color: var(--neon-purple);
  background: transparent;
}
.chip-add:hover { border-color: rgba(167, 139, 250, 0.4); background: rgba(167, 139, 250, 0.05); }

.chip-confirm {
  border-color: rgba(52, 211, 153, 0.3);
  background: rgba(52, 211, 153, 0.1);
  color: var(--neon-mint);
}
.chip-confirm:hover { background: rgba(52, 211, 153, 0.18); }

.chip-cancel {
  border-color: var(--border-subtle);
  color: var(--text-muted);
}

/* Add custom row */
.add-cat-row { display: flex; gap: 6px; align-items: center; }
.add-cat-row .glass-input { flex: 1; margin: 0; }

.pay-row { display: flex; align-items: center; gap: 6px; }
.pay-label { font-size: var(--fs-xs); color: var(--text-muted); margin-right: 2px; }

.submit-btn { width: 100%; padding: 14px; font-size: var(--fs-md); }

.tx-row { display: flex; justify-content: space-between; align-items: center; }
.tx-left { display: flex; align-items: center; gap: 10px; }
.tx-cat { font-size: var(--fs-md); font-weight: 500; }
.tx-meta { font-size: var(--fs-xs); color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.tx-amount { font-family: var(--font-display); font-size: var(--fs-md); font-weight: 700; }
.tag-asset { font-size: 10px; padding: 1px 6px; border-radius: var(--radius-full); background: rgba(96,165,250,0.15); color: var(--neon-blue); cursor: pointer; transition: all var(--dur-fast) var(--ease-smooth); }
.tag-asset:hover { background: rgba(96,165,250,0.25); }
.tag-pending { font-size: 10px; padding: 1px 6px; border-radius: var(--radius-full); background: rgba(251,191,36,0.15); color: var(--neon-amber); transition: all var(--dur-fast) var(--ease-smooth); }
.tag-pending.clickable { cursor: pointer; }
.tag-pending.clickable:hover { background: rgba(251,191,36,0.25); }
.tag-reason { font-size: 10px; color: var(--text-muted); }
.date-divider { font-size: var(--fs-xs); color: var(--text-muted); padding: 8px 0 4px; font-weight: 600; letter-spacing: 0.04em; }

.empty-state { text-align: center; padding: 48px 0; color: var(--text-muted); font-size: var(--fs-sm); }

/* Confirmation dialog */
.confirm-overlay { position: fixed; inset: 0; background: rgba(9,9,15,0.75); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 300; padding: var(--space-lg); }
.confirm-card { width: 100%; max-width: 360px; padding: 32px 24px; text-align: center; animation: pageIn 0.4s var(--ease-spring) both; background: rgba(18,18,31,0.98); }
.confirm-icon { font-size: 48px; margin-bottom: 8px; color: var(--neon-purple); }
.confirm-title { font-family: var(--font-display); font-size: var(--fs-lg); font-weight: 700; margin-bottom: 6px; }
.confirm-desc { font-size: var(--fs-sm); color: var(--text-secondary); margin-bottom: 12px; line-height: 1.6; }
.confirm-amount { font-family: var(--font-display); font-size: var(--fs-2xl); font-weight: 800; margin-bottom: 20px; }
.confirm-btns { display: flex; gap: var(--space-sm); }
.confirm-hint { font-size: 10px; color: var(--text-muted); margin-top: 12px; }
</style>
