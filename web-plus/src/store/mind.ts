import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMindStore = defineStore('mind', () => {
  const mode = ref<'edit' | 'readonly'>('readonly')
  const caseXmindInfoId = ref<string | null>(null)
  const lastCaseXmindActionId = ref<string | undefined>(undefined)
  const analysisState = ref<'idle' | 'preparing' | 'polling' | 'ready'>('idle')
  const isLoadFailed = ref(false)

  function setIsLoadFailed(value: boolean) {
    isLoadFailed.value = value
  }

  function setAnalysisState(state: 'idle' | 'preparing' | 'polling' | 'ready') {
    analysisState.value = state
  }

  function resetMindMeta() {
    mode.value = 'readonly'
    caseXmindInfoId.value = null
    lastCaseXmindActionId.value = undefined
    analysisState.value = 'idle'
    isLoadFailed.value = false
  }

  return {
    mode,
    caseXmindInfoId,
    lastCaseXmindActionId,
    analysisState,
    isLoadFailed,
    setIsLoadFailed,
    setAnalysisState,
    resetMindMeta
  }
})
