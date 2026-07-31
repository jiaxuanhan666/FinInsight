import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'

export interface SavingsGoal {
  id: string
  userUuid: string
  name: string
  targetAmount: number
  currentAmount: number
  monthlyTarget: number
  startDate: number
  targetDate: number
  status: 'active' | 'completed' | 'paused'
  createdAt: number
}

export const useSavingsStore = defineStore('savings', () => {
  const goals = ref<SavingsGoal[]>([])
  const loading = ref(false)

  const totalSaved = computed(() =>
    goals.value.filter(g => g.status === 'active' || g.status === 'completed')
      .reduce((s, g) => s + g.currentAmount, 0)
  )

  const totalTarget = computed(() =>
    goals.value.filter(g => g.status === 'active')
      .reduce((s, g) => s + g.targetAmount, 0)
  )

  async function fetchGoals() {
    loading.value = true
    try {
      const res = await api.get('/savings')
      goals.value = res.goals || []
    } catch (err) {
      console.error('Failed to fetch savings goals', err)
    } finally {
      loading.value = false
    }
  }

  async function createGoal(data: {
    name: string
    targetAmount: number
    monthlyTarget?: number
    targetDate: number
  }) {
    await api.post('/savings', data)
    await fetchGoals()
  }

  async function updateGoal(id: string, data: Partial<SavingsGoal>) {
    await api.put(`/savings/${id}`, data)
    await fetchGoals()
  }

  async function deleteGoal(id: string) {
    await api.del(`/savings/${id}`)
    await fetchGoals()
  }

  function getProgress(goal: SavingsGoal): number {
    if (goal.targetAmount <= 0) return 0
    return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
  }

  function getRemainingDays(goal: SavingsGoal): number {
    const now = Date.now()
    const remaining = Math.ceil((goal.targetDate - now) / (24 * 60 * 60 * 1000))
    return Math.max(0, remaining)
  }

  return {
    goals, loading, totalSaved, totalTarget,
    fetchGoals, createGoal, updateGoal, deleteGoal,
    getProgress, getRemainingDays,
  }
})
