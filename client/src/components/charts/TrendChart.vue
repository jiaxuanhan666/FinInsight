<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  data: { date: string; income: number; expense: number }[]
  title?: string
}>()

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#F0EDE8',
      textStyle: { color: '#4A4A4A', fontSize: 13 },
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#9A9A9A', fontSize: 12 },
      itemWidth: 16,
      itemHeight: 3,
    },
    grid: {
      left: 8,
      right: 16,
      top: 16,
      bottom: 36,
    },
    xAxis: {
      type: 'category',
      data: props.data.map(d => d.date),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#C0C0C0', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#F5F2ED', type: 'dashed' } },
      axisLabel: { color: '#C0C0C0', fontSize: 11 },
    },
    series: [
      {
        name: '收入',
        type: 'line',
        smooth: true,
        data: props.data.map(d => d.income),
        lineStyle: { color: '#B8E6CF', width: 3 },
        itemStyle: { color: '#5B8C6F' },
        symbol: 'circle',
        symbolSize: 6,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(184,230,207,0.4)' },
            { offset: 1, color: 'rgba(184,230,207,0)' },
          ]),
        },
      },
      {
        name: '支出',
        type: 'line',
        smooth: true,
        data: props.data.map(d => d.expense),
        lineStyle: { color: '#F5C6C6', width: 3 },
        itemStyle: { color: '#B07070' },
        symbol: 'circle',
        symbolSize: 6,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245,198,198,0.4)' },
            { offset: 1, color: 'rgba(245,198,198,0)' },
          ]),
        },
      },
    ],
  })
}

onMounted(initChart)
watch(() => props.data, initChart, { deep: true })
onUnmounted(() => chart?.dispose())
</script>

<template>
  <div class="trend-chart-container">
    <div v-if="title" class="chart-title">{{ title }}</div>
    <div ref="chartRef" class="trend-chart"></div>
  </div>
</template>

<style scoped>
.trend-chart-container {
  width: 100%;
}
.chart-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
  text-align: center;
}
.trend-chart {
  width: 100%;
  height: 240px;
}
</style>
