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

// ---- Category System: Dual-track (expense vs income) ----
const EXPENSE_CAT_KEY = 'fininsight_custom_expense_categories'
const INCOME_CAT_KEY = 'fininsight_custom_income_categories'

const defaultExpenseCategories = ['餐饮', '交通', '购物', '潮玩', '数码', '娱乐', '日用', '房租', '医疗', '教育', '服饰', '宠物']
const defaultIncomeCategories  = ['工资薪资', '副业收入', '投资收益', '资产变现', '红包礼金', '退税补贴', '兼职自由职业', '其他收入']
const MAX_CUSTOM = 20

const customExpenseCategories = ref<string[]>([])
const customIncomeCategories  = ref<string[]>([])

function loadCat(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter((c: any) => typeof c === 'string' && c.trim())
    }
  } catch {}
  return []
}
function saveCat(key: string, list: string[]) { localStorage.setItem(key, JSON.stringify(list)) }

function loadCustomCategories() {
  customExpenseCategories.value = loadCat(EXPENSE_CAT_KEY)
  customIncomeCategories.value  = loadCat(INCOME_CAT_KEY)
}

// Current visible categories based on transaction type
const currentDefaultCategories = computed(() =>
  form.value.type === 'expense' ? defaultExpenseCategories : defaultIncomeCategories
)
const currentCustomCategories = computed(() =>
  form.value.type === 'expense' ? customExpenseCategories.value : customIncomeCategories.value
)
const currentAllCategories = computed(() => [...currentDefaultCategories.value, ...currentCustomCategories.value])

const showAddCat = ref(false)
const newCatName = ref('')

function addCustomCategory() {
  const name = newCatName.value.trim()
  if (!name) { toastMsg.value = '请输入品类名称'; showToast.value = true; return }
  if (currentAllCategories.value.includes(name)) { toastMsg.value = '该品类已存在'; showToast.value = true; return }
  const target = form.value.type === 'expense' ? customExpenseCategories : customIncomeCategories
  if (target.value.length >= MAX_CUSTOM) { toastMsg.value = `最多添加 ${MAX_CUSTOM} 个自定义品类`; showToast.value = true; return }
  target.value.push(name)
  saveCat(form.value.type === 'expense' ? EXPENSE_CAT_KEY : INCOME_CAT_KEY, target.value)
  form.value.categoryNote = name
  newCatName.value = ''
  showAddCat.value = false
}

function removeCustomCategory(name: string) {
  const target = form.value.type === 'expense' ? customExpenseCategories : customIncomeCategories
  target.value = target.value.filter(c => c !== name)
  saveCat(form.value.type === 'expense' ? EXPENSE_CAT_KEY : INCOME_CAT_KEY, target.value)
  if (form.value.categoryNote === name) form.value.categoryNote = ''
}

// Confirmation dialog
const showConfirm = ref(false)
const pendingTx = ref<{ id: string; note: string; amount: string; aiReasoning: string; aiConfidence: number }>({ id: '', note: '', amount: '', aiReasoning: '', aiConfidence: 0 })

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
      pendingTx.value = { id: String(result.id), note: catNote, amount: fAmount, aiReasoning: String(result.aiReasoning || ''), aiConfidence: Number(result.aiConfidence || 0) }
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

// ---- Voice Input ----
const voiceSupported = ref(false)
const isListening = ref(false)
const voiceTranscript = ref('')
const voiceParsing = ref(false)
interface VoiceTx { type: string; amount: number; categoryNote: string; paymentMethod: string; confidence: number }
const voiceResult = ref<{ transactions: VoiceTx[]; transcript: string } | null>(null)

// Client-side regex parse (fallback when server AI unavailable)
function clientSideParse(transcript: string): VoiceTx[] {
  const parts = transcript.split(/[，,;；\s]+and\s+/i).filter(p => p.trim())
  const results: VoiceTx[] = []
  for (const part of parts) {
    const tx: VoiceTx = { type: 'expense', amount: 0, categoryNote: '', paymentMethod: '', confidence: 0.35 }
    // Type detection
    if (/到账|工资|收入|赚了|分红|红包|退税|补贴|发了/.test(part)) tx.type = 'income'
    // Amount extraction
    const numMatch = part.match(/(\d+(?:\.\d+)?)/)
    if (numMatch) tx.amount = parseFloat(numMatch[1])
    // Category
    const catMap: [RegExp, string][] = [
      [/餐|饭|吃|面|咖啡|奶茶|外卖|火锅|食堂|餐厅|小吃|早点|夜宵/, '餐饮'],
      [/打车|地铁|公交|出行|高铁|机票|火车|通勤|加油|停车/, '交通'],
      [/买.*衣|买.*鞋|购|超市|商场|淘宝|京东|拼多多/, '购物'],
      [/盲盒|手办|潮玩|乐高|模型|高达|积木/, '潮玩'],
      [/手机|电脑|耳机|平板|相机|数码|switch|ps5|游戏机/, '数码'],
      [/电影|KTV|游戏|剧本杀|密室|演出|门票|唱歌/, '娱乐'],
      [/日用|纸巾|洗发|沐浴|牙膏|洗衣/, '日用'],
      [/房租|水电|物业|燃气|暖气/, '房租'],
      [/医院|药|挂号|体检|牙科|看病/, '医疗'],
      [/课程|培训|书本|考试|学费/, '教育'],
      [/衣服|裤子|鞋|包|帽子/, '购物'],
      [/工资|薪水|月薪|年终奖/, '工资薪资'],
      [/副业|兼职|接单|外包|freelance/, '副业收入'],
      [/股票|分红|利息|基金|理财/, '投资收益'],
      [/卖|变现|转卖|闲鱼|回血/, '资产变现'],
      [/红包|礼金|随份子|压岁钱/, '红包礼金'],
      [/退税|补贴|报销/, '退税补贴'],
    ]
    for (const [re, cat] of catMap) {
      if (re.test(part)) { tx.categoryNote = cat; tx.confidence = 0.6; break }
    }
    // Payment
    if (/微信/.test(part)) tx.paymentMethod = '微信'
    else if (/支付宝/.test(part)) tx.paymentMethod = '支付宝'
    else if (/刷卡|信用卡|银行卡/.test(part)) tx.paymentMethod = '银行卡'
    else if (/现金/.test(part)) tx.paymentMethod = '现金'
    results.push(tx)
  }
  return results.length > 0 ? results : [{ type: 'expense', amount: 0, categoryNote: '', paymentMethod: '', confidence: 0.2 }]
}

function startVoice() {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) return
  const recognition = new SR()
  recognition.lang = 'zh-CN'
  recognition.interimResults = true
  recognition.maxAlternatives = 3
  voiceTranscript.value = ''

  recognition.onresult = (event: any) => {
    voiceTranscript.value = Array.from(event.results)
      .map((r: any) => r[0].transcript).join('')
  }

  recognition.onend = async () => {
    isListening.value = false
    if (voiceTranscript.value.trim()) {
      voiceParsing.value = true
      try {
        const res = await api.post('/ai/parse-voice', { transcript: voiceTranscript.value.trim() })
        if (res.fallback) {
          // Server AI unavailable → client-side local parse
          voiceResult.value = { transactions: clientSideParse(res.transcript || voiceTranscript.value), transcript: res.transcript || voiceTranscript.value }
        } else if (res.transactions && res.transactions.length > 0) {
          voiceResult.value = { transactions: res.transactions, transcript: res.transcript || voiceTranscript.value }
        } else {
          voiceResult.value = { transactions: clientSideParse(voiceTranscript.value), transcript: voiceTranscript.value }
        }
      } catch {
        voiceResult.value = { transactions: clientSideParse(voiceTranscript.value), transcript: voiceTranscript.value }
      } finally { voiceParsing.value = false }
    }
  }

  recognition.onerror = () => {
    isListening.value = false
    toastMsg.value = '语音识别失败，请手动输入'; showToast.value = true
  }

  recognition.start()
  isListening.value = true
}

async function confirmVoiceResult() {
  if (!voiceResult.value) return
  const txs = voiceResult.value.transactions
  let submitted = 0
  for (const tx of txs) {
    if (tx.amount <= 0 || !tx.categoryNote) continue
    try {
      await txStore.createTransaction({
        amount: tx.amount,
        type: (tx.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
        categoryNote: tx.categoryNote,
        paymentMethod: tx.paymentMethod || '',
      })
      submitted++
    } catch (err: any) {
      toastMsg.value = err.message || '部分记账失败'; showToast.value = true
    }
  }
  voiceResult.value = null
  voiceTranscript.value = ''
  await Promise.all([txStore.fetchTransactions('month'), txStore.fetchSummary()])
  trackEvent('transaction_create')
  toastMsg.value = submitted > 1 ? `已记录 ${submitted} 笔` : '记账成功'
  showToast.value = true
}

function dismissVoiceResult() {
  form.value.note = voiceResult.value?.transcript || voiceTranscript.value
  voiceResult.value = null
  voiceTranscript.value = ''
}

onMounted(async () => {
  await txStore.fetchTransactions('month')
  loadCustomCategories()
  voiceSupported.value = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
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
        <button :class="['type-btn', { active: form.type === 'expense' }]" @click="form.type = 'expense'; form.categoryNote = ''">
          <span class="geo-icon sm" :class="form.type === 'expense' ? 'glow-pink' : ''">&#9660;</span>
          <span>支出</span>
        </button>
        <button :class="['type-btn', { active: form.type === 'income' }]" @click="form.type = 'income'; form.categoryNote = ''">
          <span class="geo-icon sm" :class="form.type === 'income' ? 'glow-mint' : ''">&#9650;</span>
          <span>收入</span>
        </button>
      </div>

      <div class="amount-area">
        <span class="curr-sym">CNY</span>
        <input v-model="form.amount" type="number" step="0.01" min="0" placeholder="0.00" class="amount-input" />
      </div>

      <!-- Voice Input Button -->
      <div v-if="voiceSupported && !voiceResult" class="voice-bar">
        <button v-if="!isListening && !voiceParsing" class="voice-btn" @click="startVoice">
          <span class="voice-icon">&#9679;</span>
          <span>语音记账</span>
        </button>
        <div v-else-if="isListening" class="voice-listening">
          <span class="voice-pulse"></span>
          <span class="voice-text">{{ voiceTranscript || '正在聆听...' }}</span>
          <button class="voice-stop" @click="isListening = false">停止</button>
        </div>
        <div v-else-if="voiceParsing" class="voice-parsing">
          <span class="voice-spinner"></span>
          <span>AI 正在理解...</span>
        </div>
      </div>

      <div class="mt-md"><input v-model="form.categoryNote" type="text" class="glass-input" placeholder="品类备注" maxlength="100" :disabled="!!voiceResult" /></div>
      <div class="mt-sm"><input v-model="form.note" type="text" class="glass-input" placeholder="添加备注（选填）" maxlength="200" /></div>

      <!-- Category Chips -->
      <div class="chip-row mt-md">
        <button
          v-for="cat in currentAllCategories"
          :key="cat"
          :class="['chip', { active: form.categoryNote === cat, custom: currentCustomCategories.includes(cat) }]"
          @click="form.categoryNote = cat"
        >
          <span>{{ cat }}</span>
          <span
            v-if="currentCustomCategories.includes(cat)"
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

      <!-- Voice Confirmation Card (batch) -->
      <div v-if="voiceResult" class="voice-confirm">
        <div class="vc-transcript"><span class="geo-icon sm glow-purple" style="display:inline-flex;vertical-align:middle;margin-right:6px;">&#9679;</span>"{{ voiceResult.transcript }}"</div>
        <div v-if="voiceResult.transactions.length > 1" class="vc-count">&#9672; 识别到 {{ voiceResult.transactions.length }} 笔交易</div>

        <div v-for="(tx, i) in voiceResult.transactions" :key="i" class="vc-row">
          <span class="vc-idx">{{ i + 1 }}</span>
          <select v-model="tx.type" class="vc-inline vc-type">
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </select>
          <span class="vc-curr">CNY</span>
          <input v-model.number="tx.amount" type="number" step="0.01" class="vc-inline vc-amt" placeholder="0" />
          <input v-model="tx.categoryNote" type="text" class="vc-inline vc-cat" placeholder="品类" />
          <input v-model="tx.paymentMethod" type="text" class="vc-inline vc-pay" placeholder="支付" />
          <span v-if="tx.confidence < 0.6" class="vc-low" title="AI 置信度低">&#9650;</span>
        </div>

        <div class="vc-actions">
          <button class="btn-glass" @click="dismissVoiceResult">&#8592; 手动输入</button>
          <button class="btn-glass" style="color:var(--text-muted);" @click="voiceResult = null; voiceTranscript = ''; startVoice()">&#8635; 重新说</button>
          <button class="btn-glass primary" @click="confirmVoiceResult">
            &#10003; {{ voiceResult.transactions.length > 1 ? `全部确认 (${voiceResult.transactions.length}笔)` : '确认记账' }}
          </button>
        </div>
      </div>
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

/* Voice Input */
.voice-bar { display: flex; justify-content: center; margin-bottom: var(--space-md); }
.voice-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 28px;
  border: 1px dashed rgba(167, 139, 250, 0.35);
  border-radius: var(--radius-full);
  background: rgba(167, 139, 250, 0.06);
  color: var(--neon-purple);
  font-family: var(--font-display);
  font-size: var(--fs-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--dur-normal) var(--ease-spring);
}
.voice-btn:hover { background: rgba(167, 139, 250, 0.12); border-color: rgba(167, 139, 250, 0.5); transform: scale(1.02); }
.voice-icon { font-size: 20px; }

.voice-listening {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px;
  background: rgba(251, 113, 133, 0.08);
  border: 1px solid rgba(251, 113, 133, 0.25);
  border-radius: var(--radius-full);
  width: 100%;
}
.voice-pulse { width: 12px; height: 12px; border-radius: 50%; background: var(--neon-coral); animation: glowPulse 1s infinite; flex-shrink: 0; }
.voice-text { flex: 1; font-size: var(--fs-sm); color: var(--text-secondary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.voice-stop { padding: 4px 12px; border: 1px solid var(--border-subtle); border-radius: var(--radius-full); background: transparent; color: var(--text-muted); font-size: var(--fs-xs); cursor: pointer; flex-shrink: 0; }

.voice-parsing {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 12px 20px;
  color: var(--text-muted);
  font-size: var(--fs-sm);
}
.voice-spinner { width: 16px; height: 16px; border: 2px solid var(--border-subtle); border-top-color: var(--neon-purple); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Voice confirmation card */
.voice-confirm {
  margin-top: var(--space-md);
  padding: 16px;
  background: rgba(167, 139, 250, 0.04);
  border: 1px solid rgba(167, 139, 250, 0.2);
  border-radius: var(--radius-lg);
  animation: pageIn 0.3s var(--ease-spring) both;
}
.vc-transcript { font-size: var(--fs-sm); color: var(--text-secondary); margin-bottom: 4px; }
.vc-warning { font-size: var(--fs-xs); color: var(--neon-amber); background: rgba(251,191,36,0.08); padding: 4px 10px; border-radius: var(--radius-full); display: inline-block; margin-top: 4px; }
.vc-count { font-size: var(--fs-xs); color: var(--neon-purple); margin-top: 4px; }
.vc-row { display: flex; align-items: center; gap: 6px; padding: 8px 0; border-bottom: 1px solid var(--border-subtle); }
.vc-row:last-child { border-bottom: none; }
.vc-idx { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--text-muted); background: rgba(255,255,255,0.04); border-radius: 4px; flex-shrink: 0; }
.vc-inline { padding: 6px 8px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: var(--text-primary); font-size: var(--fs-xs); outline: none; min-width: 0; }
.vc-inline:focus { border-color: var(--border-active); }
.vc-type { width: 56px; flex-shrink: 0; appearance: none; }
.vc-curr { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
.vc-amt { width: 72px; text-align: right; font-family: var(--font-display); font-weight: 600; }
.vc-cat { flex: 1; min-width: 64px; }
.vc-pay { width: 56px; }
.vc-low { color: var(--neon-amber); font-size: 12px; flex-shrink: 0; cursor: help; }
.vc-actions { display: flex; gap: 8px; margin-top: 14px; justify-content: flex-end; flex-wrap: wrap; }
.vc-actions .btn-glass { padding: 8px 16px; font-size: var(--fs-xs); }
</style>
