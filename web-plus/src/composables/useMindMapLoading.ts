/**
 * 思维导图 Loading 管理 Composable
 */

import type { LocaleText } from '../types'
import { ref } from 'vue'
import { ElLoading } from 'element-plus'

/**
 * Loading 配置
 */
export interface UseMindMapLoadingOptions {
  /** 文案 */
  localeText: LocaleText
  /** 是否默认启用 Loading */
  enableShowLoading?: boolean
}

/**
 * 思维导图 Loading 管理 Hook
 */
export function useMindMapLoading(options: UseMindMapLoadingOptions) {
  const { localeText, enableShowLoading = true } = options

  /** Loading 实例 */
  let loadingInstance: ReturnType<typeof ElLoading.service> | null = null

  /** 是否启用显示 loading */
  const enableLoading = ref(enableShowLoading)

  /**
   * 显示 loading
   */
  function showLoading() {
    if (!loadingInstance) {
      loadingInstance = ElLoading.service({
        lock: true,
        text: localeText.other.loading,
        background: 'rgba(0, 0, 0, 0.7)',
      })
    }
  }

  /**
   * 隐藏 loading
   */
  function hideLoading() {
    if (loadingInstance) {
      loadingInstance.close()
      loadingInstance = null
    }
  }

  /**
   * 启用 Loading
   */
  function enableShowLoadingFlag() {
    enableLoading.value = true
  }

  /**
   * 禁用 Loading
   */
  function disableShowLoadingFlag() {
    enableLoading.value = false
  }

  return {
    enableLoading,
    showLoading,
    hideLoading,
    enableShowLoadingFlag,
    disableShowLoadingFlag,
  }
}
