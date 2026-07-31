<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSavingsStore, type SavingsGoal } from '../stores/savings'
import { useTransactionStore } from '../stores/transaction'
import { trackEvent } from '../services/api'
import Card from '../components/ui/Card.vue'
import RingProgress from '../components/ui/RingProgress.vue'
import BottomSheet from '../components/ui/BottomSheet.vue'
import Toast from '../components/ui/Toast.vue'

const savingsStore = useSavingsStore()
const txStore = useTransactionStore()
const toastMsg = ref('')
const showToast = ref(false)
const menuOpen = ref('')

// ---- Goal form ----
const showGoalModal = ref(false)
const editingGoalId = ref('')
const newGoal = ref({ name: '', targetAmount: '', monthlyTarget: '', targetDate: '' })

// ---- Progress modal ----
const showProgressModal = ref(false)
const progressGoal = ref<SavingsGoal | null>(null)
const progressAmount = ref('')

const activeGoals = computed(() => savingsStore.goals.filter(g => g.status === 'active'))
const completedGoals = computed(() => savingsStore.goals.filter(g => g.status === 'completed'))
const canSave = computed(() => Math.max(0, txStore.monthIncome - txStore.monthExpense))

// ---- Savings threshold alert ----
const totalMonthlyTarget = computed(() => activeGoals.value.reduce((s, g) => s + g.monthlyTarget, 0))
const savingsGap = computed(() => {
  if (totalMonthlyTarget.value <= 0) return 0
  return Math.abs((txStore.monthIncome - txStore.monthExpense) - totalMonthlyTarget.value)
})
const alertLevel = computed<'safe' | 'warn' | 'danger'>(() => {
  if (totalMonthlyTarget.value <= 0) return 'safe'
  const net = txStore.monthIncome - txStore.monthExpense
  if (net >= totalMonthlyTarget.value) return 'safe'
  if (net >= totalMonthlyTarget.value * 0.7) return 'warn'
  return 'danger'
})

// ---- Goal CRUD ----
function openAddGoal() { editingGoalId.value = ''; newGoal.value = { name: '', targetAmount: '', monthlyTarget: '', targetDate: '' }; showGoalModal.value = true }
function openEditGoal(goal: SavingsGoal) { editingGoalId.value = goal.id; newGoal.value = { name: goal.name, targetAmount: String(goal.targetAmount), monthlyTarget: String(goal.monthlyTarget || ''), targetDate: new Date(goal.targetDate).toISOString().slice(0,10) }; showGoalModal.value = true }

async function saveGoal() {
  const amount = parseFloat(newGoal.value.targetAmount)
  if (!amount || amount <= 0 || !newGoal.value.name.trim() || !newGoal.value.targetDate) { toastMsg.value = '请填写完整信息'; showToast.value = true; return }
  const data = { name: newGoal.value.name.trim(), targetAmount: amount, monthlyTarget: parseFloat(newGoal.value.monthlyTarget) || 0, targetDate: new Date(newGoal.value.targetDate).getTime() }
  if (editingGoalId.value) { await savingsStore.updateGoal(editingGoalId.value, data); toastMsg.value = '目标已更新' }
  else { await savingsStore.createGoal(data); toastMsg.value = '目标创建成功' }
  showGoalModal.value = false; showToast.value = true; trackEvent('savings_goal_action')
}
async function deleteGoal(id: string) { await savingsStore.deleteGoal(id); toastMsg.value = '已删除'; showToast.value = true }

// ---- Progress ----
function openProgress(goal: SavingsGoal) { progressGoal.value = goal; progressAmount.value = ''; showProgressModal.value = true }
async function saveProgress() {
  const val = parseFloat(progressAmount.value)
  if (!val || val <= 0 || !progressGoal.value) { toastMsg.value = '请输入有效金额'; showToast.value = true; return }
  await savingsStore.updateGoal(progressGoal.value.id, { currentAmount: progressGoal.value.currentAmount + val })
  if (savingsStore.getProgress({ ...progressGoal.value, currentAmount: progressGoal.value.currentAmount + val }) >= 100) {
    toastMsg.value = '恭喜达成目标！'
  }
  showProgressModal.value = false; showToast.value = true
}

onMounted(async () => { await Promise.all([savingsStore.fetchGoals(), txStore.fetchSummary()]) })
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">&#9733; 攒钱计划</h1>
      <button class="btn-glass primary" style="padding:8px 16px;font-size:var(--fs-sm);" @click="openAddGoal">+ 新目标</button>
    </div>

    <!-- Savings alert -->
    <div v-if="totalMonthlyTarget > 0" class="alert-bar" :class="`alert-${alertLevel}`">
      <span v-if="alertLevel === 'safe'" class="alert-icon">&#9672;</span>
      <span v-else-if="alertLevel === 'warn'" class="alert-icon">&#9650;</span>
      <span v-else class="alert-icon">&#9660;</span>
      <span v-if="alertLevel === 'safe'">储蓄计划运行良好，结余比目标多 {{ savingsGap.toLocaleString() }}</span>
      <span v-else-if="alertLevel === 'warn'">距离储蓄目标还差 {{ savingsGap.toLocaleString() }}</span>
      <span v-else>本月已超出储蓄线 {{ savingsGap.toLocaleString() }}，注意控制消费</span>
    </div>

    <Card glow="mint" style="margin-bottom:var(--space-lg);text-align:center;">
      <div style="font-size:var(--fs-xs);color:var(--text-muted);letter-spacing:0.08em;">&#9650; 本月可存</div>
      <div style="font-family:var(--font-display);font-size:var(--fs-2xl);font-weight:800;color:var(--neon-mint);">{{ canSave.toLocaleString() }}</div>
      <div v-if="totalMonthlyTarget > 0" style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:4px;">月度储蓄目标 {{ totalMonthlyTarget.toLocaleString() }}</div>
    </Card>

    <div class="section-title mb-md">&#9733; 进行中</div>

    <div v-if="activeGoals.length === 0 && completedGoals.length === 0" class="empty-state">
      <div style="font-size:40px;margin-bottom:8px;color:var(--text-muted);">&#9733;</div>
      <div style="color:var(--text-muted);">还没有攒钱目标</div>
    </div>

    <Card v-for="goal in activeGoals" :key="goal.id" glow="amber" style="margin-bottom:var(--space-md);padding:20px;position:relative;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-family:var(--font-display);font-size:var(--fs-md);font-weight:600;">{{ goal.name }}</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="tag-active">进行中</span>
          <div style="position:relative;">
            <button class="menu-dot" @click.stop="menuOpen = menuOpen === goal.id ? '' : goal.id">&#8943;</button>
            <div v-if="menuOpen === goal.id" class="menu-drop glass-card" style="position:absolute;right:0;top:28px;z-index:10;padding:4px;min-width:80px;">
              <button class="menu-item" @click.stop="openEditGoal(goal); menuOpen=''">编辑</button>
              <button class="menu-item danger" @click.stop="deleteGoal(goal.id); menuOpen=''">删除</button>
            </div>
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:16px;">
        <RingProgress :percent="savingsStore.getProgress(goal)" :color="'#fbbf24'" :size="80" :stroke-width="8">
          <span style="font-family:var(--font-display);font-size:var(--fs-md);font-weight:700;color:var(--neon-amber);">{{ savingsStore.getProgress(goal) }}%</span>
        </RingProgress>
        <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;justify-content:space-between;font-size:var(--fs-xs);"><span>已存</span><span class="text-amber">{{ goal.currentAmount.toLocaleString() }}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:var(--fs-xs);"><span>目标</span><span>{{ goal.targetAmount.toLocaleString() }}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:var(--fs-xs);"><span>每月攒</span><span>{{ (goal.monthlyTarget || 0).toLocaleString() }}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:var(--fs-xs);"><span>剩余天数</span><span>{{ savingsStore.getRemainingDays(goal) }} 天</span></div>
        </div>
      </div>
      <button class="btn-glass mt-md" style="width:100%;padding:10px;font-size:var(--fs-sm);" @click="openProgress(goal)">&#9650; 我攒了一笔</button>
    </Card>

    <!-- Completed -->
    <div v-if="completedGoals.length > 0">
      <div class="section-title mb-md mt-lg">&#9733; 已达成</div>
      <Card v-for="goal in completedGoals" :key="goal.id" glow="mint" style="margin-bottom:6px;padding:14px 16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span>{{ goal.name }}</span>
          <span class="tag-done">完成</span>
        </div>
        <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:4px;">最终 {{ goal.currentAmount.toLocaleString() }}</div>
      </Card>
    </div>

    <!-- Goal Modal -->
    <BottomSheet :show="showGoalModal" :title="editingGoalId ? '编辑攒钱目标' : '创建攒钱目标'" @close="showGoalModal = false">
      <div class="form-group"><label class="form-label">目标名称</label><input v-model="newGoal.name" class="glass-input" placeholder="如：旅行基金" /></div>
      <div class="form-group"><label class="form-label">目标金额</label><input v-model="newGoal.targetAmount" type="number" class="glass-input" placeholder="0" /></div>
      <div class="form-group"><label class="form-label">每月攒多少</label><input v-model="newGoal.monthlyTarget" type="number" class="glass-input" placeholder="0" /></div>
      <div class="form-group"><label class="form-label">计划完成日期</label><input v-model="newGoal.targetDate" type="date" class="glass-input" /></div>
      <template #footer>
        <button class="btn-glass" @click="showGoalModal = false">取消</button>
        <button class="btn-glass primary" @click="saveGoal">{{ editingGoalId ? '保存' : '创建' }}</button>
      </template>
    </BottomSheet>

    <!-- Progress Modal -->
    <BottomSheet :show="showProgressModal" title="攒了一笔" @close="showProgressModal = false">
      <div style="text-align:center;">
        <div style="font-size:14px;color:var(--text-secondary);margin-bottom:16px;">{{ progressGoal?.name }}</div>
        <div class="amount-area"><span class="curr-sym">CNY</span><input v-model="progressAmount" type="number" step="0.01" min="0" placeholder="0.00" class="amount-input" style="font-size:32px;" /></div>
      </div>
      <template #footer>
        <button class="btn-glass" @click="showProgressModal = false">取消</button>
        <button class="btn-glass primary" @click="saveProgress">确认攒入</button>
      </template>
    </BottomSheet>

    <Toast :message="toastMsg" :show="showToast" @close="showToast = false" />
  </div>
</template>

<style scoped>
.section-title { font-family: var(--font-display); font-size: var(--fs-md); font-weight: 600; }
.form-group { margin-bottom: var(--space-md); }
.form-label { display: block; font-size: var(--fs-xs); color: var(--text-secondary); margin-bottom: 6px; }
.tag-active { font-size: 10px; padding: 2px 10px; border-radius: var(--radius-full); background: rgba(251,191,36,0.1); color: var(--neon-amber); border: 1px solid rgba(251,191,36,0.2); }
.tag-done { font-size: 10px; padding: 2px 10px; border-radius: var(--radius-full); background: rgba(52,211,153,0.1); color: var(--neon-mint); border: 1px solid rgba(52,211,153,0.2); }
.empty-state { text-align: center; padding: 48px 0; color: var(--text-muted); }
.menu-dot { width: 28px; height: 28px; border: none; border-radius: 50%; background: transparent; color: var(--text-muted); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.menu-dot:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
.menu-drop { padding: 4px; min-width: 80px; background: rgba(18,18,31,0.98); }
.menu-item { display: block; width: 100%; padding: 6px 12px; border: none; border-radius: 6px; background: transparent; color: var(--text-secondary); font-size: var(--fs-xs); cursor: pointer; text-align: left; }
.menu-item:hover { background: rgba(255,255,255,0.04); }
.menu-item.danger { color: var(--neon-coral); }
.amount-area { display: flex; align-items: center; justify-content: center; padding: 12px 0; }
.curr-sym { font-family: var(--font-display); font-size: var(--fs-lg); font-weight: 700; color: var(--text-muted); margin-right: 8px; }
.amount-input { font-family: var(--font-display); font-weight: 800; text-align: center; border: none; background: transparent; color: var(--text-primary); width: 200px; padding: 0; outline: none; letter-spacing: -0.02em; }
.amount-input::placeholder { color: rgba(255,255,255,0.1); }

/* Alert bar */
.alert-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: var(--radius-md); font-size: var(--fs-xs); margin-bottom: var(--space-md); }
.alert-safe { background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); color: var(--neon-mint); }
.alert-warn { background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.2); color: var(--neon-amber); }
.alert-danger { background: rgba(251,113,133,0.08); border: 1px solid rgba(251,113,133,0.2); color: var(--neon-coral); }
.alert-icon { font-size: 14px; }
</style>
