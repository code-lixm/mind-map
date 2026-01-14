/**
 * Loading 工具函数
 * 用于显示和隐藏加载提示
 */

import type { LoadingInstance } from 'element-plus/es/components/loading/src/loading'
import { ElLoading } from 'element-plus'

let loadingInstance: LoadingInstance | null = null

/**
 * 显示加载提示
 */
export function showLoading() {
  loadingInstance = ElLoading.service({
    lock: true,
  })
}

/**
 * 隐藏加载提示
 */
export function hideLoading() {
  if (loadingInstance) {
    loadingInstance.close()
    loadingInstance = null
  }
}
