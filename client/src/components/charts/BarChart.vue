<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  labels: string[]
  incomeData: number[]
  expenseData: number[]
}>()

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

function initChart() {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value, 'dark')

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(18,18,31,0.95)',
      borderColor: 'rgba(167,139,250,0.3)',
      textStyle: { color: '#f1f1f6', fontSize: 12 },
    },
    legend: {
      data: ['收入', '支出'],
      bottom: 0,
      textStyle: { color: '#a1a1aa', fontSize: 11 },
      itemWidth: 12, itemHeight: 3,
    },
    grid: { left: 8, right: 16, top: 8, bottom: 32 },
    xAxis: {
      type: 'category',
      data: props.labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#52525b', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      axisLabel: { color: '#52525b', fontSize: 10 },
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: props.incomeData,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#34d399' }, { offset: 1, color: '#059669' },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
        barWidth: '40%',
      },
      {
        name: '支出',
        type: 'bar',
        data: props.expenseData,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#f472b6' }, { offset: 1, color: '#db2777' },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
        barWidth: '40%',
      },
    ],
  })
}

onMounted(initChart)
watch(() => [props.labels, props.incomeData, props.expenseData], initChart, { deep: true })
onUnmounted(() => chart?.dispose())
</script>

<template>
  <div ref="chartRef" class="bar-chart"></div>
</template>

<style scoped>
.bar-chart { width: 100%; height: 220px; }
</style>
