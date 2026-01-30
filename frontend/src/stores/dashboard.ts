import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsApi } from '@/api/settings'

export const useDashboardStore = defineStore('dashboard', () => {
  const status = ref<'running' | 'stopped'>('stopped')
  const port = ref(7788)
  const version = ref('')

  async function fetchStatus() {
    try {
      const { data } = await settingsApi.getStatus()
      status.value = data.status
      port.value = data.port
      version.value = data.version
    } catch {
      status.value = 'stopped'
    }
  }

  return { status, port, version, fetchStatus }
})
