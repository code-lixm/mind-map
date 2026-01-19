/**
 * 编辑器状态管理 composable
 * 替代源项目的 Vuex store
 */

import type { AiConfig, LocalConfig, ThemeGroup } from '../types'
import { computed, reactive } from 'vue'
import { defineStore } from 'pinia'

/**
 * 编辑器状态接口
 */
interface EditorState {
  /** 是否操作本地文件 */
  isHandleLocalFile: boolean
  /** 本地配置 */
  localConfig: LocalConfig
  /** 当前显示的侧边栏 */
  activeSidebar: string
  /** 是否大纲编辑模式 */
  isOutlineEdit: boolean
  /** 是否只读 */
  isReadonly: boolean
  /** 是否源码编辑模式 */
  isSourceCodeEdit: boolean
  /** 导出时底部添加的文字 */
  extraTextOnExport: string
  /** 是否正在拖拽大纲树节点 */
  isDragOutlineTreeNode: boolean
  /** AI 配置 */
  aiConfig: AiConfig
  /** 扩展主题列表 */
  extendThemeGroupList: ThemeGroup[]
  /** 背景图片列表 */
  bgList: string[]
}

/**
 * 创建编辑器状态
 */
export const useEditorState = defineStore('mindMapEditor', () => {
  const state = reactive<EditorState>({
    isHandleLocalFile: false,
    localConfig: {
      isZenMode: false,
      openNodeRichText: true,
      useLeftKeySelectionRightKeyDrag: true,
      isShowScrollbar: false,
      isDark: false,
      enableAi: true,
    },
    activeSidebar: '',
    isOutlineEdit: false,
    isReadonly: false,
    isSourceCodeEdit: false,
    extraTextOnExport: '',
    isDragOutlineTreeNode: false,
    aiConfig: {
      api: 'http://ark.cn-beijing.volces.com/api/v3/chat/completions',
      key: '',
      model: '',
      port: 3456,
      method: 'POST',
    },
    extendThemeGroupList: [],
    bgList: [],
  })

  // ============== Getters ==============

  const isZenMode = computed(() => state.localConfig.isZenMode)
  const isDark = computed(() => state.localConfig.isDark)
  const openNodeRichText = computed(() => state.localConfig.openNodeRichText)
  const isShowScrollbar = computed(() => state.localConfig.isShowScrollbar)
  const enableAi = computed(() => state.localConfig.enableAi)
  const isHandleLocalFile = computed(() => state.isHandleLocalFile)
  const activeSidebar = computed(() => state.activeSidebar)
  const isOutlineEdit = computed(() => state.isOutlineEdit)
  const extraTextOnExport = computed(() => state.extraTextOnExport)
  const extendThemeGroupList = computed(() => state.extendThemeGroupList)
  const bgList = computed(() => state.bgList)

  // ============== Actions ==============

  /**
   * 设置操作本地文件标志位
   */
  function setIsHandleLocalFile(value: boolean) {
    state.isHandleLocalFile = value
  }

  /**
   * 设置本地配置
   */
  function setLocalConfig(config: Partial<LocalConfig> & Partial<AiConfig>) {
    const aiConfigKeys = Object.keys(state.aiConfig) as (keyof AiConfig)[]

    Object.entries(config).forEach(([key, value]) => {
      if (aiConfigKeys.includes(key as keyof AiConfig)) {
        state.aiConfig[key as keyof AiConfig] = value as never
      }
      else {
        state.localConfig[key as keyof LocalConfig] = value as never
      }
    })

    // TODO: 持久化到 localStorage
    // storeLocalConfig({ ...state.localConfig, ...state.aiConfig })
  }

  /**
   * 设置当前显示的侧边栏
   */
  function setActiveSidebar(sidebar: string | null) {
    state.activeSidebar = sidebar || ''
  }

  /**
   * 设置大纲编辑模式
   */
  function setIsOutlineEdit(value: boolean) {
    state.isOutlineEdit = value
  }

  /**
   * 设置是否只读
   */
  function setIsReadonly(value: boolean) {
    state.isReadonly = value
  }

  /**
   * 设置源码编辑模式
   */
  function setIsSourceCodeEdit(value: boolean) {
    state.isSourceCodeEdit = value
  }

  /**
   * 设置导出时底部添加的文字
   */
  function setExtraTextOnExport(text: string) {
    state.extraTextOnExport = text
  }

  /**
   * 设置树节点拖拽状态
   */
  function setIsDragOutlineTreeNode(value: boolean) {
    state.isDragOutlineTreeNode = value
  }

  /**
   * 设置扩展主题列表
   */
  function setExtendThemeGroupList(list: ThemeGroup[]) {
    state.extendThemeGroupList = list
  }

  /**
   * 设置背景图片列表
   */
  function setBgList(list: string[]) {
    state.bgList = list
  }

  return {
    state,
    isZenMode,
    isDark,
    openNodeRichText,
    isShowScrollbar,
    enableAi,
    isHandleLocalFile,
    activeSidebar,
    isOutlineEdit,
    extraTextOnExport,
    extendThemeGroupList,
    bgList,
    setIsHandleLocalFile,
    setLocalConfig,
    setActiveSidebar,
    setIsOutlineEdit,
    setIsReadonly,
    setIsSourceCodeEdit,
    setExtraTextOnExport,
    setIsDragOutlineTreeNode,
    setExtendThemeGroupList,
    setBgList,
  }
})
