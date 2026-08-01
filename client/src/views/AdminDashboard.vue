<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { api } from '../services/api'

interface UserStat {
  uuid: string; fullUuid: string; nickname: string; createdAt: number; lastActiveAt: number
  todayVisits: number; txCount: number; reportCount: number; goalCount: number; voiceCount: number
}

interface DashboardData {
  overview: { totalUsers: number; todayActive: number; totalTransactions: number; totalReports: number }
  featureUsage: { transaction: number; aiReport: number; asset: number; savings: number }
  dauTrend: { date: string; count: number }[]
  recentEvents: { userUuid: string; eventType: string; timestamp: number }[]
  users: UserStat[]
}

const data = ref<DashboardData | null>(null)
const loading = ref(true)
const dauChartRef = ref<HTMLElement>()
const funnelChartRef = ref<HTMLElement>()
let dauChart: echarts.ECharts | null = null
let funnelChart: echarts.ECharts | null = null
let timer: any = null
const updatedAt = ref('')

const eventLabels: Record<string, string> = {
  page_view: '打开页面', transaction_create: '记账', ai_report_generate: 'AI报告',
  report_generate: 'AI报告', asset_edit: '编辑资产', savings_goal_action: '攒钱目标',
  savings_progress: '存了一笔', voice_used: '语音记账', category_custom_add: '自定义品类',
}

async function fetchData() {
  try {
    data.value = await api.get('/analytics/dashboard')
    loading.value = false
    updatedAt.value = new Date().toLocaleTimeString('zh-CN')
    updateCharts()
  } catch { loading.value = false }
}

function updateCharts() {
  if (!data.value) return

  // DAU trend chart
  if (dauChartRef.value) {
    if (!dauChart) dauChart = echarts.init(dauChartRef.value, 'dark')
    dauChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 16, top: 16, bottom: 24 },
      xAxis: {
        type: 'category', data: data.value.dauTrend.map(d => d.date),
        axisLabel: { color: '#a1a1aa', fontSize: 10 },
      },
      yAxis: {
        type: 'value', minInterval: 1,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      },
      series: [{
        type: 'line', data: data.value.dauTrend.map(d => d.count),
        smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { color: '#a78bfa', width: 2 },
        itemStyle: { color: '#a78bfa' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(167,139,250,0.25)' },
          { offset: 1, color: 'rgba(167,139,250,0.01)' },
        ]) },
      }],
    })
  }

  // Funnel chart
  if (funnelChartRef.value && data.value.users.length > 0) {
    if (!funnelChart) funnelChart = echarts.init(funnelChartRef.value, 'dark')
    const fu = data.value.featureUsage
    funnelChart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'funnel', left: '10%', right: '10%', top: 10, bottom: 10,
        minSize: '20%', gap: 4,
        label: { show: true, position: 'inside', formatter: '{b} {c}%', fontSize: 12, color: '#f1f1f6' },
        data: [
          { value: fu.transaction, name: '记账' },
          { value: fu.asset, name: '资产台账' },
          { value: fu.savings, name: '攒钱计划' },
          { value: fu.aiReport, name: 'AI报告' },
        ].filter(d => d.value > 0),
      }],
    })
  }
}

function fmtDate(ts: number) { return ts ? new Date(ts).toLocaleDateString('zh-CN') : '-' }
function timeAgo(ts: number) {
  if (!ts) return '-'
  const diff = Date.now() - ts
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return Math.floor(diff / 86400000) + '天前'
}
function timeAgoShort(ts: number) { return timeAgo(ts) }

function exportCSV() {
  if (!data.value) return
  const rows = [['昵称', 'UUID', '首次使用', '最近活跃', '今日访问', '记账次数', 'AI报告', '语音使用', '攒钱目标']]
  data.value.users.forEach(u => rows.push([
    u.nickname || '-', u.fullUuid, fmtDate(u.createdAt), timeAgo(u.lastActiveAt),
    String(u.todayVisits), String(u.txCount), String(u.reportCount), String(u.voiceCount), String(u.goalCount),
  ]))
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `fininsight_users_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
}

onMounted(() => { fetchData(); timer = setInterval(fetchData, 30000) })
onUnmounted(() => { dauChart?.dispose(); funnelChart?.dispose(); if (timer) clearInterval(timer) })
</script>

<template>
  <div style="max-width:1200px;margin:0 auto;padding:24px;font-family:var(--font-body);background:var(--bg-deep);min-height:100vh;color:var(--text-primary);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
      <h1 style="font-family:var(--font-display);font-size:22px;font-weight:700;margin:0;">&#9672; FinInsight 内测看板</h1>
      <span v-if="updatedAt" style="font-size:11px;color:var(--text-muted);">更新于 {{ updatedAt }}</span>
    </div>

    <!-- Summary Bar -->
    <div v-if="data" class="glass-card" style="padding:14px 20px;margin-bottom:16px;display:flex;gap:24px;font-size:13px;color:var(--text-secondary);flex-wrap:wrap;">
      <span>共 <b style="color:var(--neon-purple);">{{ data.overview.totalUsers }}</b> 位内测用户</span>
      <span>&#183; 今日 <b style="color:var(--neon-mint);">{{ data.overview.todayActive }}</b> 人活跃</span>
      <span>&#183; 累计 <b style="color:var(--neon-blue);">{{ data.overview.totalTransactions }}</b> 笔记账</span>
      <span>&#183; <b style="color:var(--neon-amber);">{{ data.overview.totalReports }}</b> 份 AI 报告</span>
    </div>

    <!-- 4 KPI Cards -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
      <div v-for="item in [
        {label:'内测用户',val:data?.overview.totalUsers,icon:'&#9672;',color:'#a78bfa'},
        {label:'今日活跃',val:data?.overview.todayActive,icon:'&#9650;',color:'#34d399'},
        {label:'累计记账',val:data?.overview.totalTransactions,icon:'&#10033;',color:'#60a5fa'},
        {label:'AI报告',val:data?.overview.totalReports,icon:'&#9681;',color:'#fbbf24'}]" :key="item.label"
        class="glass-card" style="padding:18px;text-align:center;border-top:2px solid transparent;"
        :style="{borderTopColor:item.color}">
        <div style="font-size:24px;margin-bottom:6px;color:var(--text-muted);" v-html="item.icon"></div>
        <div style="font-family:var(--font-display);font-size:26px;font-weight:800;">{{ item.val ?? '-' }}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">{{ item.label }}</div>
      </div>
    </div>

    <!-- Charts Row -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <!-- DAU Trend -->
      <div class="glass-card" style="padding:16px;">
        <h2 style="font-family:var(--font-display);font-size:15px;font-weight:600;margin-bottom:12px;">&#9650; 7 日活跃趋势</h2>
        <div ref="dauChartRef" style="height:200px;"></div>
      </div>
      <!-- Feature Funnel -->
      <div class="glass-card" style="padding:16px;">
        <h2 style="font-family:var(--font-display);font-size:15px;font-weight:600;margin-bottom:12px;">&#9672; 功能使用漏斗</h2>
        <div ref="funnelChartRef" style="height:200px;"></div>
      </div>
    </div>

    <!-- Feature Usage -->
    <div class="glass-card" style="padding:20px;margin-bottom:16px;" v-if="data?.featureUsage">
      <h2 style="font-family:var(--font-display);font-size:15px;font-weight:600;margin-bottom:14px;">核心功能使用率</h2>
      <div v-for="(rate,name) in data.featureUsage" :key="name" style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <span style="min-width:70px;font-size:13px;color:var(--text-secondary);">{{ {transaction:'记账',aiReport:'AI报告',asset:'资产台账',savings:'攒钱计划'}[name] }}</span>
        <div style="flex:1;height:16px;background:rgba(255,255,255,0.04);border-radius:10px;overflow:hidden;">
          <div :style="{width:rate+'%',height:'100%',background:'linear-gradient(90deg,#a78bfa,#c084fc)',borderRadius:'10px',transition:'width 0.6s ease'}"></div>
        </div>
        <span style="min-width:36px;font-size:13px;font-weight:600;text-align:right;">{{rate}}%</span>
      </div>
    </div>

    <!-- Recent Events -->
    <div class="glass-card" style="padding:16px;margin-bottom:16px;" v-if="data?.recentEvents?.length">
      <h2 style="font-family:var(--font-display);font-size:15px;font-weight:600;margin-bottom:12px;">&#8986; 最近事件</h2>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        <span v-for="(evt,i) in data.recentEvents.slice(0,20)" :key="i"
          style="font-size:11px;padding:4px 10px;background:rgba(255,255,255,0.03);border:1px solid var(--border-subtle);border-radius:var(--radius-full);color:var(--text-secondary);">
          {{ evt.userUuid }} &#8250; {{ eventLabels[evt.eventType] || evt.eventType }} &#183; {{ timeAgoShort(evt.timestamp) }}
        </span>
      </div>
    </div>

    <!-- User Table -->
    <div class="glass-card" style="padding:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="font-family:var(--font-display);font-size:15px;font-weight:600;">内测用户列表</h2>
        <button @click="exportCSV" class="btn-glass" style="padding:6px 14px;font-size:12px;">导出 CSV</button>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr>
            <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;">昵称</th>
            <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;">UUID</th>
            <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;">首次使用</th>
            <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;">最近活跃</th>
            <th style="text-align:right;padding:8px 10px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;">今日</th>
            <th style="text-align:right;padding:8px 10px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;">记账</th>
            <th style="text-align:right;padding:8px 10px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;">AI报告</th>
            <th style="text-align:right;padding:8px 10px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;">语音</th>
            <th style="text-align:right;padding:8px 10px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;">攒钱</th>
          </tr></thead>
          <tbody>
            <tr v-for="user in data?.users" :key="user.fullUuid" style="border-bottom:1px solid var(--border-subtle);">
              <td style="padding:8px 10px;">{{ user.nickname || '-' }}</td>
              <td style="padding:8px 10px;font-family:monospace;font-size:11px;color:var(--text-muted);">{{ user.uuid }}</td>
              <td style="padding:8px 10px;color:var(--text-secondary);">{{ fmtDate(user.createdAt) }}</td>
              <td style="padding:8px 10px;color:var(--text-secondary);">{{ timeAgo(user.lastActiveAt) }}</td>
              <td style="padding:8px 10px;text-align:right;">{{ user.todayVisits }}</td>
              <td style="padding:8px 10px;text-align:right;">{{ user.txCount }}</td>
              <td style="padding:8px 10px;text-align:right;">{{ user.reportCount }}</td>
              <td style="padding:8px 10px;text-align:right;">{{ user.voiceCount }}</td>
              <td style="padding:8px 10px;text-align:right;">{{ user.goalCount }}</td>
            </tr>
            <tr v-if="!data?.users?.length">
              <td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted);">暂无用户数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
