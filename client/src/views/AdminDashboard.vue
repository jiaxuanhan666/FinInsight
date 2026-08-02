<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { api } from '../services/api'

interface UserStat {
  uuid: string; fullUuid: string; nickname: string; createdAt: number; lastActiveAt: number; activeDays: number
  todayVisits: number; txCount: number; lastTxTime: number; reportCount: number; lastReportTime: number
  voiceCount: number; lastVoiceTime: number; assetEdits: number; lastAssetTime: number; goalCount: number; lastGoalTime: number
}

interface DashboardData {
  overview: { totalUsers: number; todayActive: number; totalTransactions: number; totalReports: number }
  featureUsage: { transaction: number; aiReport: number; asset: number; savings: number }
  dauTrend: { date: string; count: number }[]
  funnel: { stage: string; count: number; pct: number }[]
  users: UserStat[]
}

const data = ref<DashboardData | null>(null)
const loading = ref(true)
const dauChartRef = ref<HTMLElement>()
let dauChart: echarts.ECharts | null = null
let timer: any = null
const updatedAt = ref('')

async function fetchData() {
  try {
    data.value = await api.get('/analytics/dashboard')
    loading.value = false
    updatedAt.value = new Date().toLocaleTimeString('zh-CN')
    updateDauChart()
  } catch { loading.value = false }
}

function updateDauChart() {
  if (!dauChartRef.value || !data.value) return
  if (!dauChart) dauChart = echarts.init(dauChartRef.value, 'dark')
  dauChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'category', data: data.value.dauTrend.map(d => d.date), axisLabel: { color: '#a1a1aa', fontSize: 10 } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } } },
    series: [{ type: 'line', data: data.value.dauTrend.map(d => d.count), smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { color: '#a78bfa', width: 2 }, itemStyle: { color: '#a78bfa' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(167,139,250,0.25)' }, { offset: 1, color: 'rgba(167,139,250,0.01)' }]) } }],
  })
}

function fmtDate(ts: number) { return ts ? new Date(ts).toLocaleDateString('zh-CN') : '-' }
function fmtTime(ts: number) { return ts ? new Date(ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-' }
function timeAgo(ts: number) {
  if (!ts) return '-'
  const diff = Date.now() - ts
  if (diff < 3600000) return Math.floor(diff / 60000) + '分前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '时前'
  return Math.floor(diff / 86400000) + '天前'
}

function exportUsersCSV() {
  if (!data.value) return
  const rows = [['昵称', 'UUID', '注册时间', '最近活跃', '使用天数', '今日访问',
    '记账次数', '最近记账', '语音记账次数', '最近语音',
    'AI报告次数', '最近AI报告', '攒钱目标数', '最近攒钱']]
  data.value.users.forEach(u => rows.push([
    u.nickname || '-', u.fullUuid, fmtTime(u.createdAt), fmtTime(u.lastActiveAt),
    String(u.activeDays), String(u.todayVisits),
    String(u.txCount), fmtTime(u.lastTxTime),
    String(u.voiceCount), fmtTime(u.lastVoiceTime),
    String(u.reportCount), fmtTime(u.lastReportTime),
    String(u.goalCount), fmtTime(u.lastGoalTime),
  ]))
  const csv = '﻿' + rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `fininsight_users_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
}

function exportFunnelCSV() {
  if (!data.value) return
  const rows = [['阶段', '人数', '占比']]
  data.value.funnel.forEach(f => rows.push([f.stage, String(f.count), f.pct + '%']))
  const csv = '﻿' + rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `fininsight_funnel_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
}

onMounted(() => { fetchData(); timer = setInterval(fetchData, 30000) })
onUnmounted(() => { dauChart?.dispose(); if (timer) clearInterval(timer) })
</script>

<template>
  <div style="max-width:1400px;margin:0 auto;padding:24px;font-family:var(--font-body);background:var(--bg-deep);min-height:100vh;color:var(--text-primary);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
      <h1 style="font-family:var(--font-display);font-size:22px;font-weight:700;margin:0;">&#9672; FinInsight 内测看板</h1>
      <span v-if="updatedAt" style="font-size:11px;color:var(--text-muted);">更新于 {{ updatedAt }} · 30s 自动刷新</span>
    </div>

    <!-- Summary -->
    <div v-if="data" class="glass-card" style="padding:14px 20px;margin-bottom:16px;display:flex;gap:24px;font-size:13px;color:var(--text-secondary);flex-wrap:wrap;">
      <span>共 <b style="color:var(--neon-purple);">{{ data.overview.totalUsers }}</b> 位用户</span>
      <span>&#183; 今日 <b style="color:var(--neon-mint);">{{ data.overview.todayActive }}</b> 人活跃</span>
      <span>&#183; 累计 <b style="color:var(--neon-blue);">{{ data.overview.totalTransactions }}</b> 笔记账</span>
      <span>&#183; <b style="color:var(--neon-amber);">{{ data.overview.totalReports }}</b> 份 AI 报告</span>
    </div>

    <!-- KPI Cards -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
      <div v-for="item in [
        {label:'总用户',val:data?.overview.totalUsers,icon:'&#9672;',color:'#a78bfa'},
        {label:'今日活跃',val:data?.overview.todayActive,icon:'&#9650;',color:'#34d399'},
        {label:'累计记账',val:data?.overview.totalTransactions,icon:'&#10033;',color:'#60a5fa'},
        {label:'AI报告',val:data?.overview.totalReports,icon:'&#9681;',color:'#fbbf24'}]" :key="item.label"
        class="glass-card" style="padding:18px;text-align:center;border-top:2px solid transparent;" :style="{borderTopColor:item.color}">
        <div style="font-size:24px;margin-bottom:6px;color:var(--text-muted);" v-html="item.icon"></div>
        <div style="font-family:var(--font-display);font-size:26px;font-weight:800;">{{ item.val ?? '-' }}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">{{ item.label }}</div>
      </div>
    </div>

    <!-- Charts Row -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <div class="glass-card" style="padding:16px;">
        <h2 style="font-family:var(--font-display);font-size:15px;font-weight:600;margin:0 0 12px;">&#9650; 7 日活跃趋势</h2>
        <div ref="dauChartRef" style="height:200px;"></div>
      </div>
      <div class="glass-card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h2 style="font-family:var(--font-display);font-size:15px;font-weight:600;margin:0;">&#9672; 用户价值阶梯</h2>
          <button @click="exportFunnelCSV" class="btn-glass" style="padding:4px 12px;font-size:11px;">导出CSV</button>
        </div>
        <div v-if="data?.funnel" style="display:flex;flex-direction:column;gap:6px;">
          <div v-for="(f, i) in data.funnel" :key="f.stage" style="display:flex;align-items:center;gap:10px;">
            <span style="min-width:80px;font-size:13px;color:var(--text-secondary);">{{ f.stage }}</span>
            <div style="flex:1;height:28px;background:rgba(255,255,255,0.04);border-radius:6px;overflow:hidden;position:relative;">
              <div :style="{width:f.pct+'%',height:'100%',background:['#a78bfa','#60a5fa','#34d399','#fbbf24'][i],borderRadius:'6px',transition:'width 0.6s ease'}"></div>
            </div>
            <span style="min-width:60px;font-size:13px;font-weight:600;text-align:right;">{{ f.count }} 人</span>
            <span style="min-width:36px;font-size:12px;color:var(--text-muted);text-align:right;">{{ f.pct }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Feature Usage -->
    <div class="glass-card" style="padding:20px;margin-bottom:16px;" v-if="data?.featureUsage">
      <h2 style="font-family:var(--font-display);font-size:15px;font-weight:600;margin:0 0 14px;">核心功能使用率</h2>
      <div v-for="(rate, name) in data.featureUsage" :key="name" style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <span style="min-width:70px;font-size:13px;color:var(--text-secondary);">{{ {transaction:'记账',aiReport:'AI报告',asset:'资产台账',savings:'攒钱计划'}[name] }}</span>
        <div style="flex:1;height:16px;background:rgba(255,255,255,0.04);border-radius:10px;overflow:hidden;">
          <div :style="{width:rate+'%',height:'100%',background:'linear-gradient(90deg,#a78bfa,#c084fc)',borderRadius:'10px',transition:'width 0.6s ease'}"></div>
        </div>
        <span style="min-width:36px;font-size:13px;font-weight:600;text-align:right;">{{rate}}%</span>
      </div>
    </div>

    <!-- User Table -->
    <div class="glass-card" style="padding:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="font-family:var(--font-display);font-size:15px;font-weight:600;">用户列表</h2>
        <button @click="exportUsersCSV" class="btn-glass" style="padding:6px 14px;font-size:12px;">导出用户 CSV</button>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead><tr>
            <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;white-space:nowrap;">编号</th>
            <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;white-space:nowrap;">注册时间</th>
            <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;white-space:nowrap;">最近活跃</th>
            <th style="text-align:right;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;white-space:nowrap;">使用天数</th>
            <th style="text-align:right;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;white-space:nowrap;">今日</th>
            <th style="text-align:right;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;white-space:nowrap;">记账</th>
            <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;white-space:nowrap;">最近记账</th>
            <th style="text-align:right;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;white-space:nowrap;">语音记账</th>
            <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;white-space:nowrap;">最近语音</th>
            <th style="text-align:right;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;white-space:nowrap;">AI报告</th>
            <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;white-space:nowrap;">最近AI报告</th>
            <th style="text-align:right;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;white-space:nowrap;">攒钱</th>
            <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;white-space:nowrap;">最近攒钱</th>
          </tr></thead>
          <tbody>
            <tr v-for="user in data?.users" :key="user.fullUuid" style="border-bottom:1px solid var(--border-subtle);">
              <td style="padding:6px 8px;font-family:monospace;color:var(--text-muted);">{{ user.uuid }}</td>
              <td style="padding:6px 8px;color:var(--text-secondary);white-space:nowrap;">{{ fmtTime(user.createdAt) }}</td>
              <td style="padding:6px 8px;color:var(--text-secondary);white-space:nowrap;">{{ timeAgo(user.lastActiveAt) }}</td>
              <td style="padding:6px 8px;text-align:right;">{{ user.activeDays }}</td>
              <td style="padding:6px 8px;text-align:right;">{{ user.todayVisits }}</td>
              <td style="padding:6px 8px;text-align:right;">{{ user.txCount }}</td>
              <td style="padding:6px 8px;color:var(--text-muted);white-space:nowrap;font-size:10px;">{{ fmtTime(user.lastTxTime) }}</td>
              <td style="padding:6px 8px;text-align:right;">{{ user.voiceCount }}</td>
              <td style="padding:6px 8px;color:var(--text-muted);white-space:nowrap;font-size:10px;">{{ fmtTime(user.lastVoiceTime) }}</td>
              <td style="padding:6px 8px;text-align:right;">{{ user.reportCount }}</td>
              <td style="padding:6px 8px;color:var(--text-muted);white-space:nowrap;font-size:10px;">{{ fmtTime(user.lastReportTime) }}</td>
              <td style="padding:6px 8px;text-align:right;">{{ user.goalCount }}</td>
              <td style="padding:6px 8px;color:var(--text-muted);white-space:nowrap;font-size:10px;">{{ fmtTime(user.lastGoalTime) }}</td>
            </tr>
            <tr v-if="!data?.users?.length">
              <td colspan="13" style="text-align:center;padding:32px;color:var(--text-muted);">暂无用户数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
