<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/api'

const route = useRoute()
const router = useRouter()
const report = ref<any>(null)
const txs = ref<any[]>([])
const loading = ref(true)

async function fetchData() {
  const reportId = route.params.reportId as string
  try {
    const [reportRes, txRes] = await Promise.all([
      api.get(`/report/${reportId}`),
      api.get('/transaction', { limit: '200' }),
    ])
    report.value = reportRes
    const allTxs = txRes.transactions || []
    txs.value = allTxs.filter((t: any) =>
      t.aiCategory &&
      t.timestamp >= (reportRes.periodStart || 0) &&
      t.timestamp <= (reportRes.periodEnd || Date.now())
    ).sort((a: any, b: any) => b.timestamp - a.timestamp)
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

const catLabel: Record<string, string> = {
  pure_consumption: '消费', alternative_asset: '资产', dual_attribute: '待确认',
}

onMounted(fetchData)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">&#9776; 分类详情</h1>
      <span style="font-size:var(--fs-xs);color:var(--text-muted);">{{ txs.length }} 条</span>
    </div>

    <div v-if="loading" style="text-align:center;padding:48px;color:var(--text-muted);">加载中...</div>

    <div v-else-if="txs.length === 0" style="text-align:center;padding:48px;color:var(--text-muted);">该周期暂无分类数据</div>

    <div v-else>
      <div v-for="tx in txs" :key="tx.id" class="glass-card" style="padding:12px 16px;margin-bottom:6px;border-radius:var(--radius-md);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:var(--fs-md);font-weight:500;">{{ tx.categoryNote }}</div>
            <div style="font-size:var(--fs-xs);color:var(--text-muted);">
              {{ new Date(tx.timestamp).toLocaleDateString('zh-CN') }}
              <span v-if="tx.aiConfidence !== null"> · 置信度 {{ (tx.aiConfidence * 100).toFixed(0) }}%</span>
              <span v-if="tx.aiReasoning"> · {{ tx.aiReasoning }}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <div :style="{fontFamily:'var(--font-display)',fontWeight:700,color:tx.type==='income'?'var(--neon-mint)':'var(--neon-pink)'}">
              {{ tx.type === 'income' ? '+' : '-' }}{{ tx.amount.toFixed(2) }}
            </div>
            <div style="font-size:10px;padding:1px 6px;border-radius:var(--radius-full);"
              :class="{
                'tag-consumption': tx.aiCategory === 'pure_consumption',
                'tag-asset': tx.aiCategory === 'alternative_asset',
                'tag-pending': tx.aiCategory === 'dual_attribute',
              }"
            >{{ catLabel[tx.aiCategory] || tx.aiCategory }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tag-consumption { background: rgba(255,255,255,0.04); color: var(--text-muted); display: inline-block; }
.tag-asset { background: rgba(96,165,250,0.15); color: var(--neon-blue); display: inline-block; }
.tag-pending { background: rgba(251,191,36,0.15); color: var(--neon-amber); display: inline-block; }
</style>
