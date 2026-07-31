<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, trackEvent } from '../services/api'
import Card from '../components/ui/Card.vue'
import RingProgress from '../components/ui/RingProgress.vue'
import Toast from '../components/ui/Toast.vue'

interface Report {
  id: string; period: string; personalityTag: string; content: any; stats: any; createdAt: number
}

const router = useRouter()
const reports = ref<Report[]>([])
const generating = ref(false)
const toastMsg = ref('')
const showToast = ref(false)

const periodOptions = [
  { key: 'weekly', label: '周报', icon: '&#9650;' },
  { key: 'monthly', label: '月报', icon: '&#9672;' },
  { key: 'annual', label: '年报', icon: '&#9733;' },
]
const periodLabels: Record<string, string> = { weekly: '周报', monthly: '月报', annual: '年报' }

const recent = ref<Report[]>([])
const totalCount = ref(0)

function healthColor(a: string): string {
  if (a === '健康') return '#34d399'
  if (a === '关注') return '#fbbf24'
  return '#fb7185'
}

async function fetchReports() {
  try {
    const res = await api.get('/report')
    reports.value = (res.reports || []).map((r: any) => ({
      ...r, content: typeof r.content === 'string' ? JSON.parse(r.content) : (r.content || {}),
      stats: typeof r.stats === 'string' ? JSON.parse(r.stats) : (r.stats || {}),
    }))
    recent.value = reports.value.slice(0, 3)
    totalCount.value = reports.value.length
  } catch (err) { console.error(err) }
}

async function generateReport(period: string) {
  generating.value = true
  try {
    const res = await api.post('/report/generate', { period })
    const r: Report = { ...res, content: res.report || {}, stats: res.stats || {} }
    reports.value.unshift(r)
    recent.value = reports.value.slice(0, 3)
    totalCount.value = reports.value.length
    trackEvent('ai_report_generate')
    toastMsg.value = '报告生成完成'; showToast.value = true
  } catch (err) {
    toastMsg.value = 'AI 暂不可用，已生成基础报告'; showToast.value = true
  } finally { generating.value = false }
}

function goClassify(report: Report) {
  router.push(`/reports/classify/${report.id}`)
}
function goHistory() { router.push('/reports/history') }
function goRecords(f: string) { router.push(`/records?filter=${f}`) }
function goAssets() { router.push('/balance') }

onMounted(fetchReports)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">&#9681; AI 报告</h1>
      <button v-if="totalCount > 3" class="btn-glass" style="padding:6px 14px;font-size:var(--fs-xs);" @click="goHistory">&#9776; 历史</button>
    </div>

    <!-- Generate -->
    <Card style="margin-bottom: var(--space-md); text-align: center;">
      <div style="font-size:var(--fs-sm);color:var(--text-secondary);margin-bottom:var(--space-md);">AI 分析财务数据，生成结构化报告</div>
      <div class="period-btns">
        <button v-for="p in periodOptions" :key="p.key" class="btn-glass primary" :disabled="generating" @click="generateReport(p.key)" style="flex:1;">
          <span v-html="p.icon"></span> {{ p.label }}
        </button>
      </div>
    </Card>

    <!-- Recent 3 reports -->
    <div v-if="recent.length > 0">
      <div style="font-family:var(--font-display);font-size:var(--fs-md);font-weight:600;margin-bottom:var(--space-md);">&#9672; 最近报告</div>

      <Card v-for="report in recent" :key="report.id" glow="purple" style="margin-bottom:var(--space-md);padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <span style="font-family:var(--font-display);font-size:var(--fs-lg);font-weight:700;">{{ periodLabels[report.period] || report.period }}</span>
          <span style="font-size:var(--fs-xs);color:var(--text-muted);">{{ new Date(report.createdAt).toLocaleDateString('zh-CN') }}</span>
        </div>
        <div v-if="report.content?.personalityTag" class="persona-badge" style="margin-bottom:10px;">&#9672; {{ report.content.personalityTag }}</div>

        <!-- AI Stats -->
        <div v-if="report.content?.agentSummary" class="stats-grid-4">
          <div class="clickable-stat" @click="goClassify(report)"><div class="cs-num">{{ report.content.agentSummary.totalClassified || 0 }}</div><div class="cs-label">分类次数 &#8250;</div></div>
          <div class="clickable-stat" @click="goAssets()"><div class="cs-num text-purple">{{ report.content.agentSummary.assetDetected || 0 }}</div><div class="cs-label">识别资产 &#8250;</div></div>
          <div class="clickable-stat" @click="goRecords('pending')"><div class="cs-num text-amber">{{ report.content.agentSummary.pendingConfirm || 0 }}</div><div class="cs-label">待确认 &#8250;</div></div>
          <div class="clickable-stat" @click="goClassify(report)"><div class="cs-num text-mint">{{ report.content.agentSummary.accuracy || 0 }}%</div><div class="cs-label">准确率 &#8250;</div></div>
        </div>

        <div v-if="report.content?.overview" class="overview-text mt-sm">{{ report.content.overview }}</div>

        <!-- Health -->
        <div v-if="report.content?.healthMetrics" class="health-row mt-sm">
          <div class="health-item" v-for="m in [
            {k:'savingsRate',l:'储蓄率',v:report.content.healthMetrics.savingsRate,a:report.content.healthMetrics.savingsAssessment},
            {k:'debtRatio',l:'负债率',v:report.content.healthMetrics.debtRatio,a:report.content.healthMetrics.debtAssessment},
            {k:'liquidityRatio',l:'流动性',v:report.content.healthMetrics.liquidityRatio,a:report.content.healthMetrics.liquidityAssessment}]" :key="m.k">
            <RingProgress :percent="m.v||0" :color="healthColor(m.a)" :size="64" :stroke-width="5">
              <span :style="{fontSize:'12px',fontWeight:700,color:healthColor(m.a)}">{{ m.v||0 }}%</span>
            </RingProgress>
            <div class="health-label">{{ m.l }}</div>
            <div class="health-verdict" :style="{color:healthColor(m.a)}">{{ m.a }}</div>
          </div>
        </div>

        <!-- AI Suggestions -->
        <div v-if="report.content?.agentSuggestions?.length" class="suggestions mt-sm">
          <div class="section-label">&#9672; 建议</div>
          <div v-for="(s,i) in report.content.agentSuggestions" :key="i" class="sugg-item">&#9650; {{ s }}</div>
        </div>
      </Card>

      <div v-if="totalCount > 3" style="text-align:center;padding:12px;">
        <button class="btn-glass" @click="goHistory">查看全部 {{ totalCount }} 份报告 &#8250;</button>
      </div>
    </div>

    <div v-if="recent.length === 0" style="text-align:center;padding:64px 0;">
      <div style="font-size:56px;margin-bottom:12px;color:var(--text-muted);">&#9681;</div>
      <div style="color:var(--text-muted);">还没有 AI 报告</div>
    </div>

    <Toast :message="toastMsg" :show="showToast" @close="showToast = false" />
  </div>
</template>

<style scoped>
.period-btns { display: flex; gap: var(--space-sm); }
.persona-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 12px; border: 1px solid rgba(167,139,250,0.2); border-radius: var(--radius-full); font-size: var(--fs-xs); font-weight: 600; color: var(--neon-purple); background: rgba(167,139,250,0.06); }
.stats-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; padding: 10px; background: rgba(167,139,250,0.04); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 8px; }
.clickable-stat { cursor: pointer; padding: 4px; border-radius: 8px; transition: all var(--dur-fast) var(--ease-smooth); }
.clickable-stat:hover { background: rgba(167,139,250,0.1); transform: translateY(-1px); }
.cs-num { font-family: var(--font-display); font-size: var(--fs-lg); font-weight: 700; }
.cs-label { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
.overview-text { font-size: var(--fs-md); color: var(--text-primary); line-height: 1.8; }
.health-row { display: flex; justify-content: space-around; padding: 8px 0; }
.health-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.health-label { font-size: var(--fs-xs); color: var(--text-secondary); margin-top: 4px; }
.health-verdict { font-size: 10px; padding: 1px 8px; border-radius: var(--radius-full); background: rgba(255,255,255,0.04); font-weight: 600; }
.section-label { font-family: var(--font-display); font-size: var(--fs-sm); font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
.suggestions { background: rgba(255,255,255,0.02); border-radius: var(--radius-md); padding: 10px; }
.sugg-item { display: flex; align-items: flex-start; gap: 6px; font-size: var(--fs-sm); color: var(--text-secondary); margin-bottom: 3px; }
</style>
