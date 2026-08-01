<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { api } from '../services/api'

interface UserStat {
  uuid: string; fullUuid: string; nickname: string; createdAt: number; lastActiveAt: number
  todayVisits: number; totalTransactions: number; totalAssets: number; aiReports: number
}

interface DashboardData {
  overview: { totalUsers: number; todayActive: number; totalTransactions: number; totalReports: number }
  featureUsage: { transaction: number; aiReport: number; asset: number; savings: number }
  users: UserStat[]
}

const data = ref<DashboardData | null>(null)
const loading = ref(true)
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
let timer: any = null

async function fetchData() {
  try {
    data.value = await api.get('/analytics/dashboard')
    loading.value = false
    updateChart()
  } catch { loading.value = false }
}

function updateChart() {
  if (!chartRef.value || !data.value?.users?.length) return
  if (!chart) chart = echarts.init(chartRef.value, 'dark')
  const users = data.value.users
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['记账','报告','资产'], bottom: 0, textStyle: { color: '#a1a1aa' } },
    grid: { left: 8, right: 16, top: 16, bottom: 36 },
    xAxis: { type: 'category', data: users.map(u => u.nickname || u.uuid), axisLabel: { color: '#52525b', fontSize: 10, rotate: 30 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } } },
    series: [
      { name: '记账', type: 'bar', data: users.map(u => u.totalTransactions), itemStyle: { color: '#a78bfa', borderRadius: [6,6,0,0] }, barWidth: '40%' },
      { name: '报告', type: 'bar', data: users.map(u => u.aiReports), itemStyle: { color: '#c084fc', borderRadius: [6,6,0,0] }, barWidth: '40%' },
      { name: '资产', type: 'bar', data: users.map(u => u.totalAssets), itemStyle: { color: '#34d399', borderRadius: [6,6,0,0] }, barWidth: '40%' },
    ],
  })
}

function fmtDate(ts: number) { return new Date(ts).toLocaleDateString('zh-CN') }
function timeAgo(ts: number) {
  const diff = Date.now() - ts
  if (diff < 3600000) return Math.floor(diff/60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff/3600000) + '小时前'
  return Math.floor(diff/86400000) + '天前'
}

function exportCSV() {
  if (!data.value) return
  const rows = [['昵称','UUID','首次使用','最近活跃','今日访问','记账','资产','AI报告']]
  data.value.users.forEach(u => rows.push([u.nickname||'-', u.fullUuid, fmtDate(u.createdAt), timeAgo(u.lastActiveAt), String(u.todayVisits), String(u.totalTransactions), String(u.totalAssets), String(u.aiReports)]))
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `fininsight_users_${new Date().toISOString().slice(0,10)}.csv`; a.click()
}

onMounted(() => { fetchData(); timer = setInterval(fetchData, 30000) })
onUnmounted(() => { chart?.dispose(); if (timer) clearInterval(timer) })
</script>

<template>
  <div style="max-width:1200px;margin:0 auto;padding:24px;font-family:var(--font-body);background:var(--bg-deep);min-height:100vh;color:var(--text-primary);">
    <h1 style="font-family:var(--font-display);font-size:22px;font-weight:700;margin-bottom:24px;">&#9672; FinInsight 内测看板</h1>

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

    <div class="glass-card" style="padding:20px;margin-bottom:16px;" v-if="data?.featureUsage">
      <h2 style="font-family:var(--font-display);font-size:16px;font-weight:600;margin-bottom:14px;">核心功能使用率</h2>
      <div v-for="(rate,name) in data.featureUsage" :key="name" style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <span style="min-width:70px;font-size:13px;color:var(--text-secondary);">{{ {transaction:'记账',aiReport:'AI报告',asset:'资产台账',savings:'攒钱计划'}[name] }}</span>
        <div style="flex:1;height:16px;background:rgba(255,255,255,0.04);border-radius:10px;overflow:hidden;">
          <div :style="{width:rate+'%',height:'100%',background:'linear-gradient(90deg,#a78bfa,#c084fc)',borderRadius:'10px',transition:'width 0.6s ease'}"></div>
        </div>
        <span style="min-width:36px;font-size:13px;font-weight:600;text-align:right;">{{rate}}%</span>
      </div>
    </div>

    <div class="glass-card" style="padding:20px;margin-bottom:16px;">
      <h2 style="font-family:var(--font-display);font-size:16px;font-weight:600;margin-bottom:14px;">用户活跃对比</h2>
      <div ref="chartRef" style="height:280px;"></div>
    </div>

    <div class="glass-card" style="padding:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="font-family:var(--font-display);font-size:16px;font-weight:600;">内测用户列表</h2>
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
            <th style="text-align:right;padding:8px 10px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;">资产</th>
            <th style="text-align:right;padding:8px 10px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-weight:500;">报告</th>
          </tr></thead>
          <tbody>
            <tr v-for="user in data?.users" :key="user.fullUuid" style="border-bottom:1px solid var(--border-subtle);">
              <td style="padding:8px 10px;">{{ user.nickname || '-' }}</td>
              <td style="padding:8px 10px;font-family:monospace;font-size:11px;color:var(--text-muted);">{{ user.uuid }}</td>
              <td style="padding:8px 10px;color:var(--text-secondary);">{{ fmtDate(user.createdAt) }}</td>
              <td style="padding:8px 10px;color:var(--text-secondary);">{{ timeAgo(user.lastActiveAt) }}</td>
              <td style="padding:8px 10px;text-align:right;">{{ user.todayVisits }}</td>
              <td style="padding:8px 10px;text-align:right;">{{ user.totalTransactions }}</td>
              <td style="padding:8px 10px;text-align:right;">{{ user.totalAssets }}</td>
              <td style="padding:8px 10px;text-align:right;">{{ user.aiReports }}</td>
            </tr>
            <tr v-if="!data?.users?.length">
              <td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">暂无用户数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
