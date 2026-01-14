/**
 * 思维导图事件管理 Composable
 */

import type { MindMapFullData, MindMapInstance } from '../types'

/**
 * 事件监听器配置
 */
export interface UseMindMapEventsOptions {
  /** 思维导图实例 */
  mindMapInstance: MindMapInstance
  /** 数据变化回调 */
  onDataChange?: (data: MindMapFullData) => void
  /** 视图变化回调 */
  onViewChange?: (data: unknown) => void
  /** 命令执行回调 */
  onCommand?: (command: string) => void
  /** 节点渲染完成回调 */
  onNodeTreeRenderEnd?: () => void
}

/**
 * 思维导图事件管理 Hook
 */
export function useMindMapEvents(options: UseMindMapEventsOptions) {
  const {
    mindMapInstance,
    onDataChange,
    onViewChange,
    onCommand,
    onNodeTreeRenderEnd,
  } = options

  // 保存事件处理器引用，用于移除监听
  const eventHandlers = new Map<string, (...args: any[]) => void>()

  /**
   * 设置事件监听
   */
  function setupEventListeners() {
    // 监听数据变化
    if (onDataChange) {
      const dataChangeHandler = (data: MindMapFullData) => {
        onDataChange(data)
      }
      eventHandlers.set('data_change', dataChangeHandler)
      mindMapInstance.on('data_change', dataChangeHandler)
    }

    // 监听视图变化
    if (onViewChange) {
      const viewChangeHandler = (data: unknown) => {
        onViewChange(data)
      }
      eventHandlers.set('view_data_change', viewChangeHandler)
      mindMapInstance.on('view_data_change', viewChangeHandler)
    }

    // 监听命令执行
    if (onCommand) {
      const commandHandler = (command: string) => {
        onCommand(command)
      }
      eventHandlers.set('before_command', commandHandler)
      mindMapInstance.on('before_command', commandHandler)
    }

    // 监听节点渲染完成
    if (onNodeTreeRenderEnd) {
      const renderEndHandler = () => {
        onNodeTreeRenderEnd()
      }
      eventHandlers.set('node_tree_render_end', renderEndHandler)
      mindMapInstance.on('node_tree_render_end', renderEndHandler)
    }

    // 窗口 resize 事件（由外部处理）
  }

  /**
   * 移除事件监听
   */
  function removeEventListeners() {
    try {
      // 移除所有 MindMap 事件监听
      eventHandlers.forEach((handler, eventName) => {
        mindMapInstance.off(eventName, handler)
      })
      eventHandlers.clear()
    }
    catch (error) {
      console.warn('[useMindMapEvents] 移除事件监听失败', error)
    }
  }

  return {
    setupEventListeners,
    removeEventListeners,
  }
}
