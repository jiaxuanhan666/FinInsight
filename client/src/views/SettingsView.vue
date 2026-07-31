<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '../stores/user'
import { api } from '../services/api'
import Card from '../components/ui/Card.vue'
import Toast from '../components/ui/Toast.vue'

const userStore = useUserStore()
const toastMsg = ref('')
const showToast = ref(false)
const showMerge = ref(false)
const oldUuid = ref('')

async function mergeAccount() {
  if (!oldUuid.value.trim()) { toastMsg.value = '请输入旧设备 UUID'; showToast.value = true; return }
  try {
    await api.post('/user/merge', { oldUuid: oldUuid.value.trim() })
    toastMsg.value = '账本成功合并，数据完整留存'; showToast.value = true
    showMerge.value = false
  } catch (err: any) { toastMsg.value = err.message || '合并失败'; showToast.value = true }
}
</script>

<template>
  <div class="page">
    <div class="page-header"><h1 class="page-title">&#9634; 设置</h1></div>

    <Card style="margin-bottom:var(--space-md);text-align:center;">
      <span class="geo-icon lg glow-purple" style="margin-bottom:12px;">&#9672;</span>
      <div style="font-family:var(--font-display);font-size:var(--fs-lg);font-weight:600;">FinInsight 用户</div>
      <div style="font-size:var(--fs-xs);color:var(--text-muted);font-family:monospace;margin-top:4px;">UUID: {{ userStore.shortUuid }}...</div>
      <div v-if="userStore.createdAt" style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px;">加入于 {{ new Date(userStore.createdAt).toLocaleDateString('zh-CN') }}</div>
    </Card>

    <Card style="margin-bottom:var(--space-md);">
      <div class="menu-item" @click="showMerge = !showMerge">
        <span class="geo-icon sm glow-blue">&#8594;</span>
        <span class="menu-label">找回我的账本</span>
        <span class="menu-arrow">&#8250;</span>
      </div>
      <div v-if="showMerge" class="merge-area">
        <div class="merge-desc">换设备了？输入旧设备 UUID 找回账本</div>
        <input v-model="oldUuid" class="glass-input" placeholder="输入旧设备 UUID" style="margin-bottom:8px;" />
        <button class="btn-glass primary" style="width:100%;padding:10px;font-size:var(--fs-sm);" @click="mergeAccount">确认合并</button>
      </div>
    </Card>

    <Card>
      <div class="about-info">
        <div>FinInsight v2.0</div>
        <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:4px;">AI · Glassmorphism · Neon</div>
        <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:8px;">零隐私采集 · 数据全程加密</div>
      </div>
    </Card>

    <Toast :message="toastMsg" :show="showToast" @close="showToast = false" />
  </div>
</template>

<style scoped>
.menu-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; cursor: pointer; border-bottom: 1px solid var(--border-subtle); }
.menu-item:last-child { border-bottom: none; }
.menu-label { flex: 1; font-size: var(--fs-md); }
.menu-arrow { font-size: 18px; color: var(--text-muted); }
.merge-area { padding: 12px; background: rgba(255,255,255,0.02); border-radius: var(--radius-md); margin-top: 8px; }
.merge-desc { font-size: var(--fs-xs); color: var(--text-secondary); margin-bottom: 8px; }
.about-info { text-align: center; font-size: var(--fs-sm); color: var(--text-secondary); }
</style>
