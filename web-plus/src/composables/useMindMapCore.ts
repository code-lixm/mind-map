import type { MindMapFullData, MindMapInstance, MindMapNodeData } from '../types'
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toRaw } from 'vue'
import { ElMessage } from 'element-plus'
import MindMap from 'simple-mind-map'
import RichText from 'simple-mind-map/src/plugins/RichText.js'
// Remove import of getConfig
import { registerAllPlugins } from '../utils/registerPlugins'

/**
 * 初始化配置
 */
export interface UseMindMapCoreOptions {
  /** 初始数据 */
  initialData: MindMapFullData
  /** 是否只读模式 */
  readonly?: boolean
  /** 是否自动初始化（默认 true） */
  autoInit?: boolean
  /** 初始化前回调 */
  onBeforeInit?: () => void
  /** 初始化后回调 */
  onAfterInit?: (mindMap: MindMapInstance) => void
  /** 初始化错误回调 */
  onError?: (error: unknown) => void
  /** 是否启用节点富文本（默认开启，便于编辑/预览一致） */
  enableNodeRichText?: boolean
  /** 节点后置内容生成函数 */
  createNodePostfixContent?: (node: any) => HTMLElement | { el: HTMLElement, width: number, height: number }
}

/**
 * 思维导图核心逻辑 Hook
 */
export function useMindMapCore(options: UseMindMapCoreOptions) {
  const {
    initialData,
    readonly = false,
    autoInit = true,
    onBeforeInit,
    onAfterInit,
    onError,
    enableNodeRichText = true,
    createNodePostfixContent,
  } = options

  // 注册所有插件（全局只需注册一次）
  registerAllPlugins()

  // ============== 响应式数据 ==============

  /** 思维导图容器引用 */
  const mindMapContainerRef = ref<HTMLDivElement | null>(null)

  /** 思维导图实例 */
  const mindMapInstance = shallowRef<MindMapInstance | null>(null)

  /** 是否正在初始化 */
  const isInitializing = ref(false)

  /** 是否已就绪 */
  const isReady = ref(false)

  // ============== 生命周期 ==============

  onMounted(() => {
    if (autoInit) {
      initMindMap()
    }
  })

  onBeforeUnmount(() => {
    destroyMindMap()
  })

  // ============== 方法 ==============

  /**
   * 初始化思维导图
   */
  async function initMindMap() {
    if (!mindMapContainerRef.value) {
      const error = new Error('容器元素未找到')
      console.error('[useMindMapCore] 容器元素未找到')
      onError?.(error)
      return
    }

    if (isInitializing.value) {
      console.warn('[useMindMapCore] 正在初始化中，跳过重复初始化')
      return
    }

    try {
      isInitializing.value = true
      onBeforeInit?.()

      await nextTick()

      // 创建 MindMap 实例
      const mindMap = new MindMap({
        el: mindMapContainerRef.value,
        data: toRaw(initialData.root),
        layout: initialData.layout || 'logicalStructure',
        theme: initialData.theme?.template || 'default',
        themeConfig: initialData.theme?.config || {},
        readonly,
        createNodePostfixContent,
      })

      const instance = mindMap as unknown as MindMapInstance

      if (enableNodeRichText && !(instance as any).richText) {
        (instance as any).addPlugin?.(RichText)
      }
      mindMapInstance.value = instance
      isReady.value = true

      onAfterInit?.(instance)
    }
    catch (error) {
      console.error('[useMindMapCore] 初始化失败', error)
      isReady.value = false
      onError?.(error)
      ElMessage.error('思维导图初始化失败')
    }
    finally {
      isInitializing.value = false
    }
  }

  /**
   * 销毁思维导图
   */
  function destroyMindMap() {
    if (mindMapInstance.value) {
      try {
        mindMapInstance.value.destroy()
      }
      catch (error) {
        console.warn('[useMindMapCore] 销毁实例失败', error)
      }
      mindMapInstance.value = null
      isReady.value = false
    }
  }

  /**
   * 处理窗口 resize
   */
  function handleResize() {
    mindMapInstance.value?.resize()
  }

  /**
   * 获取数据
   */
  function getData(withConfig = true): MindMapFullData | null {
    return mindMapInstance.value?.getData(withConfig) || null
  }

  /**
   * 设置数据
   */
  function setData(data: MindMapFullData | MindMapNodeData | null | undefined) {
    if (!mindMapInstance.value || !data)
      return

    const mindMap = mindMapInstance.value
    if (isFullMindMapData(data)) {
      if (typeof mindMap.setFullData === 'function') {
        mindMap.setFullData(toRaw(data))
      }
      else {
        mindMap.setData(toRaw(data.root))
        if (data.layout)
          mindMap.setLayout(data.layout)
        if (data.theme?.template)
          mindMap.setTheme(data.theme.template)
        if (data.theme?.config)
          mindMap.setThemeConfig(data.theme.config)
        if (data.view && typeof mindMap.view?.setTransformData === 'function')
          mindMap.view.setTransformData(data.view)
      }
      return
    }

    mindMap.setData(toRaw(data))
  }

  /**
   * 执行命令
   */
  function execCommand(command: string, ...args: unknown[]) {
    if (mindMapInstance.value) {
      mindMapInstance.value.execCommand(command, ...args)
    }
  }

  // ============== 返回 ==============

  return {
    // 响应式数据
    mindMapContainerRef,
    mindMapInstance,
    isInitializing,
    isReady,

    // 方法
    initMindMap,
    destroyMindMap,
    handleResize,
    getData,
    setData,
    execCommand,
  }
}

function isFullMindMapData(data: MindMapFullData | MindMapNodeData): data is MindMapFullData {
  return typeof (data as MindMapFullData)?.root !== 'undefined'
}
