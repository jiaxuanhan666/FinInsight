import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export const useUserStore = defineStore('user', () => {
  const uuid = ref('')
  const nickname = ref('')
  const createdAt = ref(0)
  const isNewUser = ref(false)
  const initialized = ref(false)

  const shortUuid = computed(() => uuid.value.slice(0, 8))

  async function initUser() {
    // 从 localStorage 读取或生成 UUID
    let stored = localStorage.getItem('fininsight_uuid')
    if (!stored) {
      stored = generateUUID()
      localStorage.setItem('fininsight_uuid', stored)
    }
    uuid.value = stored

    try {
      const res = await api.post('/user/register', { uuid: stored })
      nickname.value = res.nickname || ''
      createdAt.value = res.createdAt
      isNewUser.value = res.isNew
      initialized.value = true
    } catch (err) {
      console.warn('User registration failed, using local mode', err)
      isNewUser.value = true
      initialized.value = true
    }
  }

  function updateNickname(name: string) {
    nickname.value = name
  }

  return { uuid, nickname, createdAt, isNewUser, initialized, shortUuid, initUser, updateNickname }
})
