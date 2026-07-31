<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{ data: { name: string; value: number; color?: string }[]; title?: string }>()
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const defaultColors = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#fb7185', '#818cf8', '#c084fc']

function initChart() {
  if (!chartRef.value || props.data.length === 0) return
  if (!chart) chart = echarts.init(chartRef.value, 'dark')

  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'rgba(18,18,31,0.95)',
      borderColor: 'rgba(167,139,250,0.3)',
      textStyle: { color: '#f1f1f6', fontSize: 13 },
    },
    series: [{
      type: 'pie',
      radius: ['58%', '82%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderColor: '#12121f',
        borderWidth: 2,
        borderRadius: 6,
      },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 16, fontWeight: 'bold', color: '#f1f1f6' },
        scaleSize: 10,
      },
      data: props.data.map((d, i) => ({
        ...d,
        itemStyle: { color: d.color || defaultColors[i % defaultColors.length] },
      })),
    }],
  })
}

onMounted(initChart)
watch(() => props.data, initChart, { deep: true })
onUnmounted(() => chart?.dispose())
</script>

<template>
  <div class="pie-wrap">
    <div ref="chartRef" class="pie-chart"></div>
  </div>
</template>

<style scoped>
.pie-wrap { width: 100%; }
.pie-chart { width: 100%; height: 240px; }
</style>
