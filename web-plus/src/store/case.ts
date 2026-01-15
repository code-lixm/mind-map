import { defineStore } from 'pinia'

export const useCaseStore = defineStore('case', () => {
  const detail = ref<any>({})
  return { detail }
})
import { ref } from 'vue'
