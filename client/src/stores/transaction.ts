import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'
import { useUserStore } from './user'

export interface Transaction {
  id: string
  userUuid: string
  amount: number
  currency: string
  baseAmount: number
  type: 'income' | 'expense'
  categoryNote: string
  note: string
  timestamp: number
  aiCategory: string | null
  aiConfidence: number | null
  aiReasoning: string | null
  userOverride: boolean
  persistentTagId: string | null
  paymentMethod: string
}

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)
  const total = ref(0)

  const summary = ref({
    monthIncome: 0,
    monthExpense: 0,
    monthBalance: 0,
    pureConsumption: 0,
    alternativeAsset: 0,
    transactionCount: 0,
  })

  async function fetchTransactions(period?: string) {
    loading.value = true
    try {
      const params: any = { limit: 100 }
      if (period) params.period = period
      const res = await api.get('/transaction', params)
      transactions.value = res.transactions || []
      total.value = res.total || 0
    } catch (err) {
      console.error('Failed to fetch transactions', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    try {
      const res = await api.get('/transaction/summary')
      summary.value = res
    } catch (err) {
      console.error('Failed to fetch summary', err)
    }
  }

  async function createTransaction(data: {
    amount: number
    type: 'income' | 'expense'
    categoryNote: string
    currency?: string
    note?: string
    timestamp?: number
    paymentMethod?: string
  }) {
    const res = await api.post('/transaction', {
      ...data,
      currency: data.currency || 'CNY',
      baseAmount: data.amount,
    })
    // 刷新列表
    await Promise.all([fetchTransactions(), fetchSummary()])
    return res
  }

  async function updateTransaction(id: string, data: any) {
    await api.put(`/transaction/${id}`, data)
    await fetchTransactions()
  }

  async function deleteTransaction(id: string) {
    await api.del(`/transaction/${id}`)
    await fetchTransactions()
  }

  const monthIncome = computed(() => summary.value.monthIncome)
  const monthExpense = computed(() => summary.value.monthExpense)
  const monthBalance = computed(() => summary.value.monthBalance)

  return {
    transactions, loading, total, summary,
    monthIncome, monthExpense, monthBalance,
    fetchTransactions, fetchSummary, createTransaction, updateTransaction, deleteTransaction,
  }
})
