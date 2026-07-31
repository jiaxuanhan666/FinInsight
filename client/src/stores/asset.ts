import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../services/api'

export interface Asset {
  id: string
  userUuid: string
  name: string
  type: 'alternative' | 'financial'
  subType: string
  currentValue: number
  costBasis: number
  currency: string
  isAutoTracked: boolean
  relatedTransactionIds: string
  updatedAt: number
}

export interface Liability {
  id: string
  userUuid: string
  name: string
  type: 'credit_card' | 'installment' | 'personal_loan' | 'mortgage' | 'car_loan' | 'other'
  totalAmount: number
  remainingAmount: number
  monthlyPayment: number
  dueDate: number | null
  currency: string
  createdAt: number
}

export const useAssetStore = defineStore('asset', () => {
  const assets = ref<Asset[]>([])
  const liabilities = ref<Liability[]>([])
  const loading = ref(false)

  const totalAssetValue = ref(0)
  const alternativeValue = ref(0)
  const financialValue = ref(0)
  const totalDebt = ref(0)
  const totalLiabilityMonthly = ref(0)

  async function fetchAssets() {
    loading.value = true
    try {
      const res = await api.get('/asset')
      assets.value = res.assets || []
      totalAssetValue.value = res.totalValue || 0
      alternativeValue.value = res.alternativeValue || 0
      financialValue.value = res.financialValue || 0
    } catch (err) {
      console.error('Failed to fetch assets', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchLiabilities() {
    try {
      const res = await api.get('/liability')
      liabilities.value = res.liabilities || []
      totalDebt.value = res.totalDebt || 0
      totalLiabilityMonthly.value = res.monthlyTotal || 0
    } catch (err) {
      console.error('Failed to fetch liabilities', err)
    }
  }

  async function createAsset(data: Partial<Asset>) {
    await api.post('/asset', data)
    await fetchAssets()
  }

  async function updateAsset(id: string, data: Partial<Asset>) {
    await api.put(`/asset/${id}`, data)
    await fetchAssets()
  }

  async function deleteAsset(id: string) {
    await api.del(`/asset/${id}`)
    await fetchAssets()
  }

  async function createLiability(data: Partial<Liability>) {
    await api.post('/liability', data)
    await fetchLiabilities()
  }

  async function updateLiability(id: string, data: Partial<Liability>) {
    await api.put(`/liability/${id}`, data)
    await fetchLiabilities()
  }

  async function deleteLiability(id: string) {
    await api.del(`/liability/${id}`)
    await fetchLiabilities()
  }

  const netWorth = () => totalAssetValue.value - totalDebt.value

  return {
    assets, liabilities, loading,
    totalAssetValue, alternativeValue, financialValue, totalDebt, totalLiabilityMonthly,
    fetchAssets, fetchLiabilities,
    createAsset, updateAsset, deleteAsset,
    createLiability, updateLiability, deleteLiability,
    netWorth,
  }
})
