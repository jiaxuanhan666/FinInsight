<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAssetStore } from '../stores/asset'
import { trackEvent } from '../services/api'
import Card from '../components/ui/Card.vue'
import PieChart from '../components/charts/PieChart.vue'
import BottomSheet from '../components/ui/BottomSheet.vue'
import Toast from '../components/ui/Toast.vue'

const assetStore = useAssetStore()
const activeTab = ref<'assets' | 'liabilities'>('assets')
const toastMsg = ref('')
const showToast = ref(false)

// ---- Category definitions (expanded financial) ----
interface Category { key: string; label: string; icon: string; color: string; subs: string[] }

const altCategories: Category[] = [
  { key: 'toy', label: '潮玩手办', icon: '▣', color: '#f472b6', subs: ['盲盒/扭蛋','手办/雕像','乐高/积木','毛绒/其他'] },
  { key: 'sneaker', label: '球鞋潮流', icon: '◇', color: '#fb7185', subs: ['球鞋','潮服/配饰','滑板/其他'] },
  { key: 'digital', label: '数码产品', icon: '▦', color: '#60a5fa', subs: ['手机/平板','相机/镜头','耳机/音箱','游戏机/PC'] },
  { key: 'luxury', label: '奢侈品', icon: '◆', color: '#fbbf24', subs: ['包袋','腕表','珠宝首饰'] },
  { key: 'collectible', label: '收藏品', icon: '♢', color: '#a78bfa', subs: ['纪念币/邮票','球星卡','艺术品/版画','其他藏品'] },
  { key: 'other_alt', label: '其他另类', icon: '□', color: '#a1a1aa', subs: ['其他'] },
]

const finCategories: Category[] = [
  { key: 'cash', label: '现金存款', icon: '●', color: '#34d399', subs: ['银行卡活期','微信零钱','支付宝余额','其他现金'] },
  { key: 'money_market', label: '活期理财', icon: '◈', color: '#6ee7b7', subs: ['余额宝','零钱通','朝朝宝','其他活期理财'] },
  { key: 'fund', label: '基金理财', icon: '◈', color: '#60a5fa', subs: ['货币基金','指数基金','混合/股票基金'] },
  { key: 'stock', label: '股票', icon: '▤', color: '#818cf8', subs: ['A股','港股/美股','ETF'] },
  { key: 'insurance', label: '保险', icon: '▥', color: '#c084fc', subs: ['年金险','增额寿险'] },
  { key: 'house', label: '房产', icon: '■', color: '#fbbf24', subs: ['投资房产'] },
  { key: 'other_fin', label: '其他金融', icon: '▫', color: '#a1a1aa', subs: ['其他'] },
]

const allCats = [...altCategories, ...finCategories]

// ---- Modal state ----
const showModal = ref(false)
const editingId = ref('')
const assetType = ref<'alternative' | 'financial'>('alternative')
const selectedCatKey = ref('')
const selectedSub = ref('')
const assetName = ref('')
const assetValue = ref('')
const assetCost = ref('')

// ---- Liability modal ----
const showLiabilityModal = ref(false)
const editingLiabilityId = ref('')
const newLiability = ref({ name: '', type: 'credit_card' as const, totalAmount: '', remainingAmount: '', monthlyPayment: '' })

// ---- Computed ----
const netWorth = computed(() => assetStore.totalAssetValue - assetStore.totalDebt)
const altAssets = computed(() => assetStore.assets.filter(a => a.type === 'alternative'))
const finAssets = computed(() => assetStore.assets.filter(a => a.type === 'financial'))

const currentCategories = computed(() => assetType.value === 'alternative' ? altCategories : finCategories)
const selectedCat = computed(() => currentCategories.value.find(c => c.key === selectedCatKey.value))
const placeholderName = computed(() => {
  if (assetType.value === 'alternative') return '如：泡泡玛特 Skullpanda 盲盒'
  if (selectedCatKey.value === 'cash') return '如：招行储蓄卡'
  if (selectedCatKey.value === 'money_market') return '如：余额宝'
  if (selectedCatKey.value === 'fund') return '如：天弘沪深300'
  if (selectedCatKey.value === 'stock') return '如：贵州茅台'
  return '如：资产名称'
})

// Category overview
const categoryOverview = computed(() => {
  return allCats.map(cat => {
    const items = assetStore.assets.filter(a => a.subType?.startsWith(cat.label))
    const total = items.reduce((s, a) => s + a.currentValue, 0)
    const pct = assetStore.totalAssetValue > 0 ? Math.round((total / assetStore.totalAssetValue) * 100) : 0
    return { ...cat, items, total, count: items.length, pct }
  }).filter(c => c.count > 0).sort((a, b) => b.total - a.total)
})

const liabilityTypeLabels: Record<string, string> = {
  credit_card: '信用卡', installment: '消费分期', mortgage: '房贷', car_loan: '车贷', personal_loan: '个人借贷', other: '其他负债',
}

// ---- Asset CRUD ----
function openAddModal() {
  editingId.value = ''
  assetType.value = 'alternative'
  selectedCatKey.value = ''
  selectedSub.value = ''
  assetName.value = ''
  assetValue.value = ''
  assetCost.value = ''
  showModal.value = true
}

function openEditModal(asset: any) {
  editingId.value = asset.id
  assetType.value = asset.type
  // Parse existing subType to pre-select category
  const cats = asset.type === 'alternative' ? altCategories : finCategories
  const matchedCat = cats.find(c => asset.subType?.startsWith(c.label))
  if (matchedCat) {
    selectedCatKey.value = matchedCat.key
    const matchedSub = matchedCat.subs.find(s => asset.subType?.includes(s))
    selectedSub.value = matchedSub || matchedCat.subs[0]
  } else {
    selectedCatKey.value = ''
    selectedSub.value = ''
  }
  assetName.value = asset.name
  assetValue.value = String(asset.currentValue)
  assetCost.value = String(asset.costBasis || '')
  showModal.value = true
}

async function saveAsset() {
  const val = parseFloat(assetValue.value)
  if (!val || val <= 0 || !assetName.value.trim()) { toastMsg.value = '请填写完整信息'; showToast.value = true; return }

  const subType = selectedCat.value ? `${selectedCat.value.label} > ${selectedSub.value || selectedCat.value.subs[0]}` : ''

  try {
    if (editingId.value) {
      await assetStore.updateAsset(editingId.value, {
        name: assetName.value.trim(), subType,
        currentValue: val, costBasis: parseFloat(assetCost.value) || val,
      })
      toastMsg.value = '资产已更新'
    } else {
      if (!selectedCat.value) { toastMsg.value = '请选择资产分类'; showToast.value = true; return }
      await assetStore.createAsset({
        name: assetName.value.trim(), type: assetType.value, subType,
        currentValue: val, costBasis: parseFloat(assetCost.value) || val,
      })
      toastMsg.value = '资产添加成功'
    }
    showModal.value = false; showToast.value = true; trackEvent('asset_edit')
  } catch (err: any) { toastMsg.value = err.message || '保存失败'; showToast.value = true }
}

async function deleteAsset(id: string) {
  await assetStore.deleteAsset(id)
  toastMsg.value = '已删除'; showToast.value = true
}

// ---- Liability CRUD ----
function openAddLiability() {
  editingLiabilityId.value = ''
  newLiability.value = { name: '', type: 'credit_card', totalAmount: '', remainingAmount: '', monthlyPayment: '' }
  showLiabilityModal.value = true
}

function openEditLiability(liab: any) {
  editingLiabilityId.value = liab.id
  newLiability.value = {
    name: liab.name, type: liab.type,
    totalAmount: String(liab.totalAmount),
    remainingAmount: String(liab.remainingAmount),
    monthlyPayment: String(liab.monthlyPayment || ''),
  }
  showLiabilityModal.value = true
}

async function saveLiability() {
  const total = parseFloat(newLiability.value.totalAmount)
  if (!total || total <= 0 || !newLiability.value.name.trim()) { toastMsg.value = '请填写完整信息'; showToast.value = true; return }

  const data = {
    name: newLiability.value.name.trim(), type: newLiability.value.type,
    totalAmount: total, remainingAmount: parseFloat(newLiability.value.remainingAmount) || total,
    monthlyPayment: parseFloat(newLiability.value.monthlyPayment) || 0,
  }

  try {
    if (editingLiabilityId.value) {
      await assetStore.updateLiability(editingLiabilityId.value, data)
      toastMsg.value = '负债已更新'
    } else {
      await assetStore.createLiability(data)
      toastMsg.value = '负债添加成功'
    }
    showLiabilityModal.value = false; showToast.value = true; trackEvent('asset_edit')
  } catch (err: any) { toastMsg.value = err.message || '保存失败'; showToast.value = true }
}

async function deleteLiability(id: string) {
  await assetStore.deleteLiability(id)
  toastMsg.value = '已删除'; showToast.value = true
}

// ---- Display helpers ----
function getCatIcon(asset: any): string {
  const matched = allCats.find(c => asset.subType?.startsWith(c.label))
  return matched?.icon || (asset.type === 'alternative' ? '▣' : '●')
}
function getCatGlow(asset: any): string {
  const matched = allCats.find(c => asset.subType?.startsWith(c.label))
  return matched?.color || (asset.type === 'alternative' ? '#f472b6' : '#34d399')
}

// ---- Menu toggle ----
const menuOpen = ref('')

onMounted(async () => { await Promise.all([assetStore.fetchAssets(), assetStore.fetchLiabilities()]) })
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">&#9672; 资产负债</h1>
    </div>

    <!-- Net Worth -->
    <Card glow="purple" style="margin-bottom: var(--space-md); text-align: center;">
      <div style="font-size:var(--fs-xs);color:var(--text-muted);letter-spacing:0.08em;">&#9672; 净资产</div>
      <div style="font-family:var(--font-display);font-size:var(--fs-2xl);font-weight:800;margin:4px 0;">{{ netWorth.toLocaleString() }}</div>
      <div style="display:flex;justify-content:center;gap:24px;font-size:var(--fs-sm);">
        <span>资产 <span class="text-blue">{{ assetStore.totalAssetValue.toLocaleString() }}</span></span>
        <span>负债 <span class="text-coral">{{ assetStore.totalDebt.toLocaleString() }}</span></span>
      </div>
    </Card>

    <!-- Pie -->
    <Card v-if="assetStore.totalAssetValue > 0" style="margin-bottom: var(--space-md); padding: 16px;">
      <div class="section-title mb-md">&#9672; 资产分布</div>
      <PieChart :data="[
        ...(assetStore.alternativeValue > 0 ? [{ name: '另类资产', value: assetStore.alternativeValue, color: '#c084fc' }] : []),
        ...(assetStore.financialValue > 0 ? [{ name: '金融资产', value: assetStore.financialValue, color: '#60a5fa' }] : []),
      ]" />
    </Card>

    <!-- Tab + Action Buttons (always visible) -->
    <div class="action-bar mb-md">
      <div class="tab-row" style="flex:1;">
        <button :class="['tab-btn', { active: activeTab === 'assets' }]" @click="activeTab = 'assets'">&#9672; 资产 ({{ assetStore.assets.length }})</button>
        <button :class="['tab-btn', { active: activeTab === 'liabilities' }]" @click="activeTab = 'liabilities'">&#9661; 负债 ({{ assetStore.liabilities.length }})</button>
      </div>
      <button v-if="activeTab === 'assets'" class="btn-glass primary" style="padding:8px 14px;font-size:var(--fs-xs);margin-left:8px;flex-shrink:0;" @click="openAddModal">+ 添加</button>
      <button v-else class="btn-glass" style="padding:8px 14px;font-size:var(--fs-xs);margin-left:8px;flex-shrink:0;" @click="openAddLiability">+ 添加</button>
    </div>

    <!-- Category Overview -->
    <Card v-if="categoryOverview.length > 0 && activeTab === 'assets'" style="margin-bottom: var(--space-md); padding: 16px;">
      <div class="section-title mb-md">&#9672; 分类概览</div>
      <div v-for="cat in categoryOverview" :key="cat.key" class="cat-overview-row">
        <span class="geo-icon sm" :style="{color:cat.color}">{{ cat.icon }}</span>
        <span class="cov-label">{{ cat.label }}</span>
        <span class="cov-count">{{ cat.count }}项</span>
        <span class="cov-bar-bg"><span class="cov-bar-fill" :style="{width:Math.max(cat.pct,2)+'%',background:cat.color}"></span></span>
        <span class="cov-val">{{ cat.total.toLocaleString() }}</span>
        <span class="cov-pct">{{ cat.pct }}%</span>
      </div>
    </Card>

    <!-- Assets List -->
    <template v-if="activeTab === 'assets'">
      <div v-if="assetStore.assets.length === 0" class="empty-state">暂无资产，点击上方按钮添加</div>

      <template v-for="cat in allCats" :key="cat.key">
        <div v-if="assetStore.assets.filter(a => a.subType?.startsWith(cat.label)).length > 0" class="mb-lg">
          <div class="cat-label">{{ cat.icon }} {{ cat.label }}</div>
          <Card v-for="asset in assetStore.assets.filter(a => a.subType?.startsWith(cat.label))" :key="asset.id" :glow="asset.type==='alternative'?'purple':'blue'" style="margin-bottom:6px;padding:14px 16px;position:relative;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="geo-icon sm" :style="{color:getCatGlow(asset)}">{{ getCatIcon(asset) }}</span>
              <div style="flex:1;">
                <div style="font-size:var(--fs-md);font-weight:500;">{{ asset.name }}</div>
                <div style="font-size:var(--fs-xs);color:var(--text-muted);">{{ asset.subType || '未分类' }} <span v-if="asset.isAutoTracked" class="ai-tag">AI 归集</span></div>
              </div>
              <div style="text-align:right;font-family:var(--font-display);font-weight:700;">{{ asset.currentValue.toLocaleString() }}</div>
              <!-- Menu -->
              <div style="position:relative;">
                <button class="menu-dot" @click.stop="menuOpen = menuOpen === asset.id ? '' : asset.id">&#8943;</button>
                <div v-if="menuOpen === asset.id" class="menu-drop glass-card" style="position:absolute;right:0;top:32px;z-index:10;padding:4px;min-width:80px;">
                  <button class="menu-item" @click.stop="openEditModal(asset); menuOpen=''">编辑</button>
                  <button class="menu-item danger" @click.stop="deleteAsset(asset.id); menuOpen=''">删除</button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </template>
    </template>

    <!-- Liabilities List -->
    <template v-if="activeTab === 'liabilities'">
      <div v-if="assetStore.liabilities.length === 0" class="empty-state">
        <div style="margin-bottom:12px;">暂无负债记录</div>
      </div>
      <Card v-for="liab in assetStore.liabilities" :key="liab.id" glow="pink" style="margin-bottom:6px;padding:14px 16px;position:relative;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="geo-icon sm glow-coral">&#9661;</span>
          <div style="flex:1;">
            <div style="font-size:var(--fs-md);font-weight:500;">{{ liab.name }}</div>
            <div style="font-size:var(--fs-xs);color:var(--text-muted);">{{ liabilityTypeLabels[liab.type] || liab.type }} <span v-if="liab.monthlyPayment > 0"> | 月供 {{ liab.monthlyPayment.toLocaleString() }}</span></div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-display);font-weight:700;color:var(--neon-coral);">-{{ liab.remainingAmount.toLocaleString() }}</div>
            <div style="font-size:var(--fs-xs);color:var(--text-muted);">总额 {{ liab.totalAmount.toLocaleString() }}</div>
          </div>
          <div style="position:relative;">
            <button class="menu-dot" @click.stop="menuOpen = menuOpen === liab.id ? '' : liab.id">&#8943;</button>
            <div v-if="menuOpen === liab.id" class="menu-drop glass-card" style="position:absolute;right:0;top:32px;z-index:10;padding:4px;min-width:80px;">
              <button class="menu-item" @click.stop="openEditLiability(liab); menuOpen=''">编辑</button>
              <button class="menu-item danger" @click.stop="deleteLiability(liab.id); menuOpen=''">删除</button>
            </div>
          </div>
        </div>
      </Card>
    </template>

    <!-- Asset Modal -->
    <BottomSheet :show="showModal" :title="editingId ? '编辑资产' : '添加资产'" @close="showModal = false">
      <div class="form-group"><label class="form-label">资产大类</label>
        <div class="type-row">
          <button :class="['type-btn',{active:assetType==='alternative'}]" @click="assetType='alternative';selectedCatKey='';selectedSub=''">&#9634; 另类资产</button>
          <button :class="['type-btn',{active:assetType==='financial'}]" @click="assetType='financial';selectedCatKey='';selectedSub=''">&#9679; 金融资产</button>
        </div>
      </div>
      <div class="form-group"><label class="form-label">具体分类</label>
        <div class="cat-grid">
          <button v-for="cat in currentCategories" :key="cat.key" :class="['cat-chip',{active:selectedCatKey===cat.key}]"
            :style="selectedCatKey===cat.key?{borderColor:cat.color,background:cat.color+'15',color:cat.color}:{}"
            @click="selectedCatKey=cat.key;selectedSub=cat.subs[0]">{{ cat.icon }} {{ cat.label }}</button>
        </div>
      </div>
      <div v-if="selectedCat" class="form-group"><label class="form-label">{{ selectedCat.label }} &rsaquo; 子类</label>
        <div class="sub-row">
          <button v-for="sub in selectedCat.subs" :key="sub" :class="['sub-chip',{active:selectedSub===sub}]"
            :style="selectedSub===sub?{borderColor:selectedCat.color,background:selectedCat.color+'12',color:selectedCat.color}:{}"
            @click="selectedSub=sub">{{ sub }}</button>
        </div>
      </div>
      <div class="form-group"><label class="form-label">资产名称</label><input v-model="assetName" class="glass-input" :placeholder="placeholderName" /></div>
      <div class="form-group"><label class="form-label">当前价值</label><input v-model="assetValue" type="number" class="glass-input" placeholder="0.00" /></div>
      <div class="form-group"><label class="form-label">成本 / 买入价（选填）</label><input v-model="assetCost" type="number" class="glass-input" placeholder="0.00" /></div>
      <template #footer>
        <button class="btn-glass" @click="showModal = false">取消</button>
        <button class="btn-glass primary" @click="saveAsset">{{ editingId ? '保存' : '确认添加' }}</button>
      </template>
    </BottomSheet>

    <!-- Liability Modal -->
    <BottomSheet :show="showLiabilityModal" :title="editingLiabilityId ? '编辑负债' : '添加负债'" @close="showLiabilityModal = false">
      <div class="form-group"><label class="form-label">负债名称</label><input v-model="newLiability.name" class="glass-input" placeholder="如：招商银行信用卡" /></div>
      <div class="form-group"><label class="form-label">类型</label>
        <select v-model="newLiability.type" class="glass-input">
          <option value="credit_card">信用卡</option><option value="installment">消费分期(花呗/白条)</option>
          <option value="mortgage">房贷</option><option value="car_loan">车贷</option>
          <option value="personal_loan">个人借贷</option><option value="other">其他负债</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">总金额</label><input v-model="newLiability.totalAmount" type="number" class="glass-input" placeholder="0.00" /></div>
      <div class="form-group"><label class="form-label">剩余金额</label><input v-model="newLiability.remainingAmount" type="number" class="glass-input" placeholder="0.00" /></div>
      <div class="form-group"><label class="form-label">月还款额</label><input v-model="newLiability.monthlyPayment" type="number" class="glass-input" placeholder="0.00" /></div>
      <template #footer>
        <button class="btn-glass" @click="showLiabilityModal = false">取消</button>
        <button class="btn-glass primary" @click="saveLiability">{{ editingLiabilityId ? '保存' : '确认添加' }}</button>
      </template>
    </BottomSheet>

    <Toast :message="toastMsg" :show="showToast" @close="showToast = false" />
  </div>
</template>

<style scoped>
.section-title { font-family: var(--font-display); font-size: var(--fs-md); font-weight: 600; }
.cat-label { font-size: var(--fs-xs); color: var(--text-muted); letter-spacing: 0.06em; margin-bottom: 8px; padding-left: 4px; }
.ai-tag { font-size: 10px; padding: 1px 6px; border-radius: var(--radius-full); background: rgba(167,139,250,0.12); color: var(--neon-purple); margin-left: 6px; }

.action-bar { display: flex; align-items: center; }
.tab-row { display: flex; gap: var(--space-sm); }
.tab-btn { flex: 1; padding: 10px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: transparent; color: var(--text-secondary); font-family: var(--font-display); font-size: var(--fs-sm); font-weight: 600; cursor: pointer; transition: all var(--dur-fast) var(--ease-smooth); }
.tab-btn.active { border-color: var(--border-active); background: rgba(167,139,250,0.08); color: var(--neon-purple); }

/* Menu */
.menu-dot { width: 28px; height: 28px; border: none; border-radius: 50%; background: transparent; color: var(--text-muted); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all var(--dur-fast) var(--ease-smooth); }
.menu-dot:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
.menu-item { display: block; width: 100%; padding: 6px 12px; border: none; border-radius: 6px; background: transparent; color: var(--text-secondary); font-size: var(--fs-xs); cursor: pointer; text-align: left; }
.menu-item:hover { background: rgba(255,255,255,0.04); }
.menu-item.danger { color: var(--neon-coral); }

/* Form */
.form-group { margin-bottom: var(--space-md); }
.form-label { display: block; font-size: var(--fs-xs); color: var(--text-secondary); margin-bottom: 6px; }
.type-row { display: flex; gap: var(--space-sm); }
.type-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: transparent; color: var(--text-secondary); font-size: var(--fs-sm); cursor: pointer; transition: all var(--dur-fast) var(--ease-smooth); }
.type-btn.active { border-color: var(--border-active); background: rgba(167,139,250,0.08); }
.cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.cat-chip { display: flex; align-items: center; gap: 4px; padding: 8px 10px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); background: rgba(255,255,255,0.02); color: var(--text-secondary); font-size: var(--fs-xs); cursor: pointer; transition: all var(--dur-fast) var(--ease-smooth); }
.cat-chip:hover { border-color: var(--border-default); }
.sub-row { display: flex; flex-wrap: wrap; gap: 6px; }
.sub-chip { padding: 6px 12px; border: 1px solid var(--border-subtle); border-radius: var(--radius-full); background: rgba(255,255,255,0.02); color: var(--text-secondary); font-size: var(--fs-xs); cursor: pointer; transition: all var(--dur-fast) var(--ease-smooth); }
.sub-chip:hover { border-color: var(--border-default); }

/* Category overview */
.cat-overview-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: var(--fs-xs); }
.cov-label { color: var(--text-secondary); min-width: 60px; }
.cov-count { color: var(--text-muted); min-width: 28px; }
.cov-bar-bg { flex: 1; height: 8px; background: rgba(255,255,255,0.04); border-radius: 4px; overflow: hidden; }
.cov-bar-fill { height: 100%; border-radius: 4px; display: block; }
.cov-val { font-family: var(--font-display); font-weight: 600; min-width: 55px; text-align: right; }
.cov-pct { color: var(--text-muted); min-width: 28px; text-align: right; }
.empty-state { text-align: center; padding: 48px 0; color: var(--text-muted); font-size: var(--fs-sm); }
</style>
