<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/api'

interface Report {
  id: string; period: string; personalityTag: string; content: any; stats: any; createdAt: number
}

const router = useRouter()
const reports = ref<Report[]>([])
const search = ref('')
const expandedId = ref('')
const periodLabels: Record<string, string> = { weekly: '周报', monthly: '月报', annual: '年报' }

const filtered = computed(() => {
  if (!search.value.trim()) return reports.value
  const q = search.value.trim().toLowerCase()
  return reports.value.filter(r =>
    (periodLabels[r.period] || '').includes(q) ||
    (r.content?.personalityTag || '').toLowerCase().includes(q)
  )
})

// Group by month
const grouped = computed(() => {
  const groups: Record<string, Report[]> = {}
  filtered.value.forEach(r => {
    const key = new Date(r.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  })
  return Object.entries(groups)
})

async function fetchReports() {
  try {
    const res = await api.get('/report')
    reports.value = (res.reports || []).map((r: any) => ({
      ...r, content: typeof r.content === 'string' ? JSON.parse(r.content) : (r.content || {}),
      stats: typeof r.stats === 'string' ? JSON.parse(r.stats) : (r.stats || {}),
    }))
  } catch (err) { console.error(err) }
}

function toggleExpand(id: string) { expandedId.value = expandedId.value === id ? '' : id }
function goClassify(report: Report) { router.push(`/reports/classify/${report.id}`) }

onMounted(fetchReports)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">&#9776; 历史报告</h1>
      <span style="font-size:var(--fs-xs);color:var(--text-muted);">{{ reports.length }} 份</span>
    </div>

    <div style="margin-bottom:var(--space-md);"><input v-model="search" class="glass-input" placeholder="搜索报告周期或标签..." /></div>

    <div v-if="filtered.length === 0" style="text-align:center;padding:48px;color:var(--text-muted);">没有匹配的报告</div>

    <!-- Vertical Timeline -->
    <div v-for="[month, items] in grouped" :key="month">
      <div class="timeline-month">{{ month }}</div>
      <div class="timeline-list">
        <div v-for="report in items" :key="report.id" class="tl-item">
          <div class="tl-dot" :class="{ active: expandedId === report.id }"></div>
          <div class="tl-card glass-card" :class="{ expanded: expandedId === report.id }" @click="toggleExpand(report.id)" style="padding:14px 16px;cursor:pointer;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <span style="font-family:var(--font-display);font-size:var(--fs-md);font-weight:600;">{{ periodLabels[report.period] || report.period }}</span>
                <span v-if="report.content?.personalityTag" class="persona-badge" style="margin-left:8px;">{{ report.content.personalityTag }}</span>
              </div>
              <span style="font-size:var(--fs-xs);color:var(--text-muted);">{{ new Date(report.createdAt).toLocaleDateString('zh-CN') }}</span>
            </div>

            <!-- Expanded content -->
            <div v-if="expandedId === report.id" class="expanded-content">
              <div v-if="report.content?.overview" class="overview-text mt-sm">{{ report.content.overview }}</div>

              <div v-if="report.content?.agentSummary" class="stats-grid-4 mt-sm">
                <div class="mini-stat clickable" @click.stop="goClassify(report)"><div class="ms-num">{{ report.content.agentSummary.totalClassified }}</div><div class="ms-label">分类 &#8250;</div></div>
                <div class="mini-stat"><div class="ms-num text-purple">{{ report.content.agentSummary.assetDetected }}</div><div class="ms-label">资产</div></div>
                <div class="mini-stat"><div class="ms-num text-amber">{{ report.content.agentSummary.pendingConfirm }}</div><div class="ms-label">待确认</div></div>
                <div class="mini-stat"><div class="ms-num text-mint">{{ report.content.agentSummary.accuracy }}%</div><div class="ms-label">准确率</div></div>
              </div>

              <div v-if="report.content?.healthMetrics" class="health-row" style="display:flex;justify-content:space-around;padding:12px 0;">
                <div style="text-align:center;"><span :style="{fontWeight:700,color:report.content.healthMetrics.savingsAssessment==='健康'?'#34d399':report.content.healthMetrics.savingsAssessment==='关注'?'#fbbf24':'#fb7185'}">{{ report.content.healthMetrics.savingsRate }}%</span><div style="font-size:10px;color:var(--text-muted);">储蓄率</div></div>
                <div style="text-align:center;"><span :style="{fontWeight:700,color:report.content.healthMetrics.debtAssessment==='健康'?'#34d399':report.content.healthMetrics.debtAssessment==='关注'?'#fbbf24':'#fb7185'}">{{ report.content.healthMetrics.debtRatio }}%</span><div style="font-size:10px;color:var(--text-muted);">负债率</div></div>
                <div style="text-align:center;"><span :style="{fontWeight:700,color:report.content.healthMetrics.liquidityAssessment==='健康'?'#34d399':report.content.healthMetrics.liquidityAssessment==='关注'?'#fbbf24':'#fb7185'}">{{ report.content.healthMetrics.liquidityRatio }}%</span><div style="font-size:10px;color:var(--text-muted);">流动性</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-month { font-family: var(--font-display); font-size: var(--fs-sm); font-weight: 600; color: var(--neon-purple); padding: 8px 0; margin-top: 8px; border-bottom: 1px solid var(--border-subtle); }
.timeline-list { position: relative; padding-left: 24px; }
.tl-item { position: relative; margin-bottom: 8px; }
.tl-dot { position: absolute; left: -19px; top: 18px; width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 2px solid var(--border-default); z-index: 1; transition: all var(--dur-fast) var(--ease-smooth); }
.tl-dot.active { background: var(--neon-purple); border-color: var(--neon-purple); box-shadow: 0 0 8px rgba(167,139,250,0.4); }
.tl-item::before { content: ''; position: absolute; left: -15px; top: 28px; bottom: -8px; width: 1px; background: var(--border-subtle); }
.tl-item:last-child::before { display: none; }
.tl-card { transition: all var(--dur-fast) var(--ease-smooth); }
.tl-card.expanded { border-color: rgba(167,139,250,0.2); }
.expanded-content { padding-top: 12px; border-top: 1px solid var(--border-subtle); margin-top: 8px; }
.persona-badge { font-size: 10px; padding: 1px 8px; border-radius: var(--radius-full); border: 1px solid rgba(167,139,250,0.2); color: var(--neon-purple); background: rgba(167,139,250,0.06); }
.overview-text { font-size: var(--fs-sm); color: var(--text-secondary); line-height: 1.6; }
.stats-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; padding: 8px; background: rgba(167,139,250,0.04); border-radius: var(--radius-md); }
.mini-stat { padding: 4px; border-radius: 6px; }
.mini-stat.clickable { cursor: pointer; }
.mini-stat.clickable:hover { background: rgba(167,139,250,0.08); }
.ms-num { font-family: var(--font-display); font-size: var(--fs-md); font-weight: 700; }
.ms-label { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
</style>
