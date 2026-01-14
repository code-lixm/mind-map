<script setup lang="ts">
import '@/assets/icon-font/iconfont.css'
import type {
  LocaleText,
  MindMapEditorProps,
  MindMapFullData,
  MindMapInstance,
  MindMapNodeData,
} from '@/types/mind-map'
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, shallowRef, toRaw, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'
import MindMap from 'simple-mind-map'
import RichText from 'simple-mind-map/src/plugins/RichText.js'
import ScrollbarPlugin from 'simple-mind-map/src/plugins/Scrollbar.js'
import icon from '@/config/icon'
import Count from './Count.vue'
import Style from './Style.vue'
import Theme from './Theme.vue'
import { mergeLocaleText } from '@/locale/mind-map'
import Search from './Search.vue'
import NodeTag from './NodeTag.vue'
import Setting from './Setting.vue'
import Toolbar from './Toolbar.vue'
import NodeIcon from './NodeIcon.vue'
import NodeNote from './NodeNote.vue'
import { createEventBus } from '@/utils/eventBus'
import BaseStyle from './BaseStyle.vue'
import Navigator from './Navigator.vue'
import NodeImage from './NodeImage.vue'
import Scrollbar from './Scrollbar.vue'
import Structure from './Structure.vue'
import OutlineEdit from './OutlineEdit.vue'
import ShortcutKey from './ShortcutKey.vue'
import NodeTagStyle from './NodeTagStyle.vue'
import NodeHyperlink from './NodeHyperlink.vue'
import DefaultNodeImage from '@/assets/img/failed-load.png'
import FormulaSidebar from './FormulaSidebar.vue'
import NodeImgPreview from './NodeImgPreview.vue'
import NodeOuterFrame from './NodeOuterFrame.vue'
import OutlineSidebar from './OutlineSidebar.vue'
import SidebarTrigger from './SidebarTrigger.vue'
import { registerAllPlugins } from '@/utils/registerPlugins'
import { useEditorState } from '@/composables/useEditorState'
import handleClipboardText from '@/utils/handleClipboardText'
import NodeIconSidebar from './NodeIconSidebar.vue'
import NodeIconToolbar from './NodeIconToolbar.vue'
import NodeNoteSidebar from './NodeNoteSidebar.vue'
import RichTextToolbar from './RichTextToolbar.vue'
import Contextmenu from './Contextmenu.vue'
import NavigatorToolbar from './NavigatorToolbar.vue'
import NodeNoteContentShow from './NodeNoteContentShow.vue'
import AssociativeLineStyle from './AssociativeLineStyle.vue'
import NodeImgPlacementToolbar from './NodeImgPlacementToolbar.vue'
import { getData, getConfig, storeData } from '@/api'

// ============== Props & Emits ==============

// Extend Props to include mode
export interface MindMapContainerProps extends Omit<MindMapEditorProps, 'readonly'> {
  mode?: 'readonly' | 'edit'
  isSaving?: boolean
  hasUnsavedChanges?: boolean
}

const props = withDefaults(defineProps<MindMapContainerProps>(), {
  modelValue: null,
  defaultData: undefined,
  mode: 'edit',
  enableAi: false,
  useDark: false,
  localeText: undefined,
  isZenMode: false,
  openNodeRichText: true,
  isShowScrollbar: false,
  enableDragImport: false,
  useLeftKeySelectionRightKeyDrag: true,
  isSaving: false,
  hasUnsavedChanges: false,
})

const emit = defineEmits<{
  'update:modelValue': [data: MindMapFullData]
  'ready': [mindMap: MindMapInstance]
  'error': [error: unknown]
  'command': [commandName: string, payload?: unknown]
  'data-change': [data: MindMapFullData]
  'view-change': [data: unknown]
  'edit': []
  'save': []
  'cancel': []
}>()

// 注册所有插件
registerAllPlugins()

// ============== Locale Provide ==============

type LocaleTextProvider = ((path: string) => string | undefined) & LocaleText & {
  value: LocaleText
}

function getLocaleValue(source: LocaleText, path?: string) {
  if (!path)
    return undefined
  return path.split('.').reduce((acc: any, key) => acc?.[key], source)
}

function createLocaleTextProvider(locale: any): LocaleTextProvider {
  const handler = ((path: string) => getLocaleValue(locale.value, path)) as LocaleTextProvider
  return new Proxy(handler, {
    apply(_target, _thisArg, argArray) {
      return getLocaleValue(locale.value, argArray[0] as string)
    },
    get(_target, prop) {
      if (prop === 'value')
        return locale.value
      if (typeof prop === 'string')
        return (locale.value as any)[prop]
      return undefined
    },
  }) as LocaleTextProvider
}

// ============== 响应式数据 ==============

/** 思维导图容器引用 */
const mindMapContainerRef = ref<HTMLDivElement | null>(null)

/** 思维导图实例 */
const mindMapInstance = shallowRef<MindMapInstance | null>(null)

/** 是否显示拖拽遮罩 */
const showDragMask = ref(false)

/** 合并后的文案 */
const localeText = computed(() => mergeLocaleText(props.localeText))

const localeTextProvider = createLocaleTextProvider(localeText)
provide('localeText', localeTextProvider)

/** 事件总线（替代 Vue2 的 $bus） */
const eventBus = createEventBus()
provide('eventBus', eventBus)

// ============== 编辑器状态 ==============

const editorStore = useEditorState()
const {
  isDark,
  isZenMode,
  openNodeRichText,
  isShowScrollbar,
  enableAi,
  activeSidebar,
  bgList,
  isOutlineEdit,
  extraTextOnExport,
} = storeToRefs(editorStore)
const { state, setIsReadonly, setLocalConfig, setActiveSidebar } = editorStore

provide('isDark', isDark)

// Initialize state
const isReadonly = computed(() => props.mode === 'readonly')
setIsReadonly(isReadonly.value)

// Update state when mode changes
watch(() => props.mode, (newMode) => {
  const readonly = newMode === 'readonly'
  setIsReadonly(readonly)
  if (mindMapInstance.value) {
    mindMapInstance.value.setMode(readonly ? 'readonly' : 'edit')
  }
  // Clear sidebar when switching to readonly
  if (readonly) {
    setActiveSidebar(null)
  }
})

// Sync props to store
watch(() => props.isZenMode, val => setLocalConfig({ isZenMode: val }), { immediate: true })
watch(() => props.useDark, val => setLocalConfig({ isDark: val }), { immediate: true })

/** Loading 实例 */
let loadingInstance: ReturnType<typeof ElLoading.service> | null = null

/** 是否启用显示 loading */
const enableShowLoading = ref(true)

// ============== 生命周期 ==============

onMounted(() => {
  initMindMap()
})

onBeforeUnmount(() => {
  destroyMindMap()
})

// ============== 监听 ==============

watch(openNodeRichText, (val) => {
  toggleRichTextPlugin(val)
})

watch(isShowScrollbar, (val) => {
  toggleScrollbarPlugin(val)
})

// ============== 方法 ==============

/**
 * 初始化思维导图
 */
async function initMindMap() {
  if (!mindMapContainerRef.value) {
    console.error('[MindMapContainer] 容器元素未找到')
    emit('error', new Error('容器元素未找到'))
    return
  }

  try {
    showLoading()

    await nextTick()

    // 获取初始数据
    const initialData = props.modelValue || props.defaultData || getDefaultData()
    
    // 绑定数据保存事件
    bindSaveEvent()

    if (!mindMapContainerRef.value) {
      console.error('[MindMapContainer] 容器元素在 nextTick 后丢失')
      throw new Error('容器元素在 nextTick 后丢失')
    }

    // 创建 MindMap 实例
    const mindMap = new MindMap({
      el: mindMapContainerRef.value,
      data: toRaw((initialData as any).root || initialData),
      layout: (initialData as any).layout || 'logicalStructure',
      theme: (initialData as any).theme?.template || 'default',
      themeConfig: (initialData as any).theme?.config || {},
      viewData: (initialData as any).view || null,
      readonly: isReadonly.value,
      fit: false,
      nodeTextEditZIndex: 1000,
      nodeNoteTooltipZIndex: 1000,
      customNoteContentShow: {
        show: (content: string, left: number, top: number, node: any) => {
          eventBus.emit('showNoteContent', content, left, top, node)
        },
        hide: () => {
          // eventBus.emit('hideNoteContent')
        },
      },
      imgBaseUrl: import.meta.env.VITE_APP_BASE_URL,
      katexFontPath: '',
      outerFramePaddingX: 2,
      outerFramePaddingY: 2,
      openRealtimeRenderOnNodeTextEdit: true,
      enableAutoEnterTextEditWhenKeydown: true,
      demonstrateConfig: {
        openBlankMode: false,
      },
      useLeftKeySelectionRightKeyDrag: state.localConfig.useLeftKeySelectionRightKeyDrag,
      iconList: [...icon],
      customInnerElsAppendTo: null,
      customHandleClipboardText: handleClipboardText,
      defaultNodeImage: DefaultNodeImage,
      initRootNodePosition: ['center', 'center'],
      handleIsSplitByWrapOnPasteCreateNewNode: () => {
        return ElMessageBox.confirm(
          localeTextProvider('edit.splitByWrap') || '是否按换行符拆分创建新节点？',
          localeTextProvider('edit.tip') || '提示',
          {
            confirmButtonText: localeTextProvider('edit.yes') || '是',
            cancelButtonText: localeTextProvider('edit.no') || '否',
            type: 'warning',
          },
        )
      },
      errorHandler: (code: string, err: any) => {
        console.error(err)
        switch (code) {
          case 'export_error':
            ElMessage.error(localeTextProvider('edit.exportError') || '导出失败')
            break
          default:
            break
        }
      },
      addContentToFooter: () => {
        const text = extraTextOnExport.value?.trim()
        if (!text)
          return null
        const el = document.createElement('div')
        el.className = 'footer'
        el.innerHTML = text
        const cssText = `
          .footer {
            width: 100%;
            height: 30px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 12px;
            color: #979797;
          }
        `
        return {
          el,
          cssText,
          height: 30,
        }
      },
      expandBtnNumHandler: (num: number) => {
        return num >= 100 ? '…' : num
      },
      beforeDeleteNodeImg: () => {
        return new Promise((resolve) => {
          ElMessageBox.confirm(
            localeTextProvider('edit.deleteNodeImgTip') || '确定删除节点图片吗？',
            localeTextProvider('edit.tip') || '提示',
            {
              confirmButtonText: localeTextProvider('edit.yes') || '是',
              cancelButtonText: localeTextProvider('edit.no') || '否',
              type: 'warning',
            },
          )
            .then(() => {
              resolve(false)
            })
            .catch(() => {
              resolve(true)
            })
        })
      },
    })

    mindMapInstance.value = mindMap as unknown as MindMapInstance

    // 监听事件
    setupEventListeners(mindMap as unknown as MindMapInstance)

    // 获取初始数据并确保格式正确
    const rawData = mindMap.getData(true) as any
    if (rawData) {
      // simple-mind-map 的 getData() 可能返回不同格式
      // 如果已经有 root 字段，直接使用；否则包装一下
      const initialData: MindMapFullData = rawData.root
        ? rawData
        : { root: rawData }
      eventBus.emit('data_change', initialData)
    }

    // 发送就绪事件
    emit('ready', mindMap as unknown as MindMapInstance)

    // 根据配置同步可选插件
    toggleRichTextPlugin(openNodeRichText.value)
    toggleScrollbarPlugin(isShowScrollbar.value)

    // 延迟隐藏 loading，等待首次渲染完成
    setTimeout(() => {
      hideLoading()
    }, 300)
  }
  catch (error) {
    console.error('[MindMapContainer] 初始化失败', error)
    hideLoading()
    emit('error', error)
    ElMessage.error('思维导图初始化失败')
  }
}

/**
 * 销毁思维导图
 */
function destroyMindMap() {
  if (mindMapInstance.value) {
    // 移除事件监听
    removeEventListeners(mindMapInstance.value)

    // 销毁实例
    mindMapInstance.value.destroy()
    mindMapInstance.value = null
  }

  // 清理 loading
  hideLoading()
}

/**
 * 设置事件监听
 */
let isSyncingFromInstance = false
function setupEventListeners(mindMap: MindMapInstance) {
  // 转发所有思维导图事件到事件总线
  const events = [
    'node_active',
    'data_change',
    'view_data_change',
    'back_forward',
    'node_contextmenu',
    'node_click',
    'draw_click',
    'expand_btn_click',
    'svg_mousedown',
    'mouseup',
    'mode_change',
    'node_tree_render_end',
    'rich_text_selection_change',
    'transforming-dom-to-images',
    'generalization_node_contextmenu',
    'painter_start',
    'painter_end',
    'scrollbar_change',
    'scale',
    'translate',
    'node_attachmentClick',
    'node_attachmentContextmenu',
    'demonstrate_jump',
    'exit_demonstrate',
    'node_note_dblclick',
    'node_mousedown',
  ]

  events.forEach((event) => {
    mindMap.on(event, (...args: any[]) => {
      eventBus.emit(event, ...args)
    })
  })

  // 监听数据变化
  mindMap.on('data_change', (data) => {
    isSyncingFromInstance = true
    // 确保数据格式正确（包含 root 字段）
    const formattedData: MindMapFullData = (data as any).root ? data as MindMapFullData : { root: data as any }
    emit('data-change', formattedData)
    nextTick(() => {
      isSyncingFromInstance = false
    })
  })

  // 监听视图变化
  mindMap.on('view_data_change', (data) => {
    emit('view-change', data)
  })

  // 监听节点渲染完成
  mindMap.on('node_tree_render_end', () => {
    if (enableShowLoading.value) {
      hideLoading()
      enableShowLoading.value = false
    }
  })

  // 监听命令执行
  mindMap.on('before_command', (command) => {
    // @ts-expect-error - emit 类型定义问题
    emit('command', command)
  })

  // 窗口 resize 事件
  window.addEventListener('resize', handleResize)

  // 事件总线监听（用于子组件通信）
  eventBus.on('execCommand', handleExecCommand)
  eventBus.on('setData', handleSetData)
  eventBus.on('showLoading', handleShowLoading)
  eventBus.on('export', handleExport)
  eventBus.on('paddingChange', handlePaddingChange)
  eventBus.on('startTextEdit', handleStartTextEdit)
  eventBus.on('endTextEdit', handleEndTextEdit)
  eventBus.on('createAssociativeLine', handleCreateAssociativeLine)
  eventBus.on('startPainter', handleStartPainter)
}

/**
 * 移除事件监听
 */
function removeEventListeners(mindMap: MindMapInstance) {
  // 移除 MindMap 事件（如果 off 方法需要handler参数，我们先移除所有监听）
  try {
    // @ts-expect-error - simple-mind-map 的 off 方法可能不需要 handler
    mindMap.off('data_change')
    // @ts-expect-error - simple-mind-map 的 off 方法可能不需要 handler
    mindMap.off('view_data_change')
    // @ts-expect-error - simple-mind-map 的 off 方法可能不需要 handler
    mindMap.off('node_tree_render_end')
    // @ts-expect-error - simple-mind-map 的 off 方法可能不需要 handler
    mindMap.off('before_command')
  }
  catch (error) {
    console.warn('[MindMapContainer] 移除事件监听失败', error)
  }

  // 移除窗口事件
  window.removeEventListener('resize', handleResize)

  // 移除事件总线监听
  eventBus.off('execCommand', handleExecCommand as any)
  eventBus.off('setData', handleSetData as any)
  eventBus.off('showLoading', handleShowLoading as any)
  eventBus.off('export', handleExport as any)
  eventBus.off('paddingChange', handlePaddingChange as any)
  eventBus.off('startTextEdit', handleStartTextEdit as any)
  eventBus.off('endTextEdit', handleEndTextEdit as any)
  eventBus.off('createAssociativeLine', handleCreateAssociativeLine as any)
  eventBus.off('startPainter', handleStartPainter as any)
}

/**
 * 处理窗口 resize
 */
function handleResize() {
  mindMapInstance.value?.resize()
}

/**
 * 处理命令执行（来自事件总线）
 */
function handleExecCommand(payload: any, ...extraArgs: any[]) {
  if (!mindMapInstance.value || payload === undefined || payload === null)
    return

  // 兼容字符串命令、对象参数以及透传形式
  if (typeof payload === 'string') {
    mindMapInstance.value.execCommand(payload, ...extraArgs)
    return
  }

  if (typeof payload === 'object' && 'command' in payload) {
    const { command, args, ...rest } = payload as { command: string, args?: any[] }
    if (!command)
      return

    if (Array.isArray(args)) {
      mindMapInstance.value.execCommand(command, ...args)
    }
    else {
      mindMapInstance.value.execCommand(command, ...Object.values(rest))
    }
    return
  }

  // 兜底：直接透传参数
  ; (mindMapInstance.value.execCommand as any)?.(payload, ...extraArgs)
}

/**
 * 处理设置数据（来自事件总线）
 */
function handleSetData(data: MindMapFullData) {
  if (mindMapInstance.value && data) {
    mindMapInstance.value.setData(data)
  }
}

/**
 * 处理显示 loading（来自事件总线）
 */
function handleShowLoading() {
  enableShowLoading.value = true
  showLoading()
}

/**
 * 显示 loading
 */
function showLoading() {
  if (!loadingInstance) {
    loadingInstance = ElLoading.service({
      lock: true,
      text: localeText.value.other.loading,
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
 * 根据配置切换富文本插件
 */
function toggleRichTextPlugin(enable: boolean) {
  const mindMap = mindMapInstance.value as any
  if (!mindMap)
    return
  const hasPlugin = Boolean(mindMap.richText)
  if (enable && !hasPlugin) {
    mindMap.addPlugin(RichText)
  }
  else if (!enable && hasPlugin) {
    mindMap.removePlugin(RichText)
  }
}

/**
 * 根据配置切换滚动条插件
 */
function toggleScrollbarPlugin(enable: boolean) {
  const mindMap = mindMapInstance.value as any
  if (!mindMap)
    return
  const hasPlugin = Boolean(mindMap.scrollbar)
  if (enable && !hasPlugin) {
    mindMap.addPlugin(ScrollbarPlugin)
  }
  else if (!enable && hasPlugin) {
    mindMap.removePlugin(ScrollbarPlugin)
  }
  // 触发 resize 确保插件内部状态（如容器尺寸）同步
  nextTick(() => {
    mindMap.resize()
  })
}


/**
 * 处理导出（来自 Export 组件）
 */
async function handleExport(...args: any[]) {
  if (!mindMapInstance.value)
    return

  let exportParams: any[] = []

  if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0]) && 'params' in args[0]) {
    const payload = args[0] as { params?: any[] }
    exportParams = Array.isArray(payload.params) ? payload.params : []
  }
  else {
    exportParams = Array.isArray(args[0]) && args.length === 1 ? args[0] : args
  }

  if (!exportParams.length)
    return

  try {
    showLoading()
    await (mindMapInstance.value as any)?.export?.(...exportParams)
  }
  catch (error) {
    console.error('[MindMapContainer] export failed', error)
    emit('error', error)
  }
  finally {
    hideLoading()
  }
}


/**
 * 处理导出前的 padding 调整
 */
function handlePaddingChange(config: Record<string, any>) {
  mindMapInstance.value?.updateConfig(config)
}

/**
 * 处理文本编辑开启
 */
function handleStartTextEdit() {
  mindMapInstance.value?.renderer?.startTextEdit?.()
}

/**
 * 处理文本编辑结束
 */
function handleEndTextEdit() {
  mindMapInstance.value?.renderer?.endTextEdit?.()
}

/**
 * 处理关联线创建
 */
function handleCreateAssociativeLine() {
  mindMapInstance.value?.associativeLine?.createLineFromActiveNode?.()
}

/**
 * 处理格式刷
 */
function handleStartPainter() {
  mindMapInstance.value?.painter?.startPainter?.()
}

/**
 * 处理拖拽进入
 */
function handleDragEnter() {
  if (props.enableDragImport && !isReadonly.value) {
    showDragMask.value = true
  }
}

/**
 * 处理拖拽离开
 */
function handleDragLeave() {
  showDragMask.value = false
}

/**
 * 处理文件拖放
 */
function handleDrop(event: DragEvent) {
  showDragMask.value = false

  if (!props.enableDragImport || isReadonly.value) {
    return
  }

  const files = event.dataTransfer?.files
  if (!files || files.length === 0) {
    return
  }

  // TODO: 处理文件导入逻辑
  console.log('[MindMapContainer] 拖放文件', files)
}

/**
 * 处理大纲编辑结果
 */
function handleOutlineEditSetData(rootData: any) {
  if (!mindMapInstance.value || !rootData)
    return
  const mindMap = mindMapInstance.value
  const currentData = mindMap.getData(true) as MindMapFullData | null
  const formattedData: MindMapFullData = {
    ...(currentData || {}),
    root: rootData,
  }
  void setMindMapFullData(mindMap, formattedData)
}

async function setMindMapFullData(mindMap: MindMapInstance, data: MindMapFullData) {
  if (typeof mindMap.setFullData === 'function') {
    mindMap.setFullData(data)
  }
  else {
    mindMap.setData(data.root)
    if (data.layout)
      mindMap.setLayout(data.layout)
    if (data.theme?.template)
      mindMap.setTheme(data.theme.template)
    if (data.theme?.config)
      mindMap.setThemeConfig(data.theme.config)
    if (data.config)
      mindMap.updateConfig?.(data.config)
    if (data.view && typeof mindMap.view?.setTransformData === 'function')
      mindMap.view.setTransformData(data.view)
  }
  await nextTick()
}



/**
 * 获取默认数据
 */
function getDefaultData(): MindMapFullData {
  // 从 API 获取数据
  const data = getData()
  const config = getConfig() || {}
  return {
    ...data,
    ...config
  } as MindMapFullData
}

/**
 * 绑定数据保存事件
 */
function bindSaveEvent() {
  eventBus.on('data_change', (data: any) => {
    storeData({ root: data })
  })
  eventBus.on('view_data_change', (data: any) => {
    let storeConfigTimer: ReturnType<typeof setTimeout> | null = null
    if (storeConfigTimer) {
      clearTimeout(storeConfigTimer)
    }
    storeConfigTimer = setTimeout(() => {
      storeData({
        view: data
      })
    }, 300)
  })
}

// ============== 暴露方法 ==============

defineExpose({
  /** 获取思维导图实例 */
  getInstance: () => mindMapInstance.value,
  /** 获取数据 */
  getData: (withConfig = false) => mindMapInstance.value?.getData(withConfig),
  /** 设置数据 */
  setData: (data: MindMapFullData) => mindMapInstance.value?.setData(data),
  /** 执行命令 */
  execCommand: (command: string, ...args: unknown[]) =>
    mindMapInstance.value?.execCommand(command, ...args),
  /** 事件总线（供子组件使用） */
  eventBus,
  /** 显示 loading */
  showLoading,
  /** 隐藏 loading */
  hideLoading,
})
</script>

<template>
  <div
    class="mind-map-root"
    :class="{ 'is-dark': isDark, 'is-zen-mode': isZenMode }"
  >
    <div class="mind-map-editor">
      <!-- 思维导图容器 -->
      <div
        id="mindMapEditorContainer"
        ref="mindMapContainerRef"
        class="mind-map-container"
        @dragenter.stop.prevent="handleDragEnter"
        @dragleave.stop.prevent
        @dragover.stop.prevent
        @drop.stop.prevent="handleDrop"
      />

      <!-- 顶部工具栏 (只在编辑模式下显示) -->
      <Toolbar
        v-if="mindMapInstance && !isZenMode"
        :mode="props.mode"
        :is-saving="props.isSaving"
        :has-unsaved-changes="props.hasUnsavedChanges"
        @edit="$emit('edit')"
        @save="$emit('save')"
        @cancel="$emit('cancel')"
      />

      <!-- 导航工具栏 -->
      <NavigatorToolbar
        v-if="mindMapInstance && !isZenMode"
        :mind-map="mindMapInstance"
        :is-dark="isDark"
        :is-readonly="isReadonly"
        :active-sidebar="activeSidebar"
        @update:active-sidebar="(value) => editorStore.setActiveSidebar(value)"
      />

      <!-- 编辑组件 (部分只在编辑模式显示) -->
      <Count
        v-if="mindMapInstance && !isZenMode"
        :mind-map="mindMapInstance"
        :is-dark="isDark"
      />
      <Navigator
        v-if="mindMapInstance"
        :mind-map="mindMapInstance"
      />

      <!-- 侧边栏 -->
      <OutlineSidebar
        v-if="mindMapInstance"
        :mind-map="mindMapInstance"
        :active-sidebar="activeSidebar"
        :is-dark="isDark"
        :is-readonly="isReadonly"
        @set-active-sidebar="(value) => editorStore.setActiveSidebar(value)"
        @set-is-outline-edit="(value) => editorStore.setIsOutlineEdit(value)"
        @set-is-drag-outline-tree-node="(value) => editorStore.setIsDragOutlineTreeNode(value)"
      />

      <!-- 只在编辑模式下显示的组件 -->
      <template v-if="!isReadonly">
        <Style
          v-if="mindMapInstance && !isZenMode"
          :mind-map="mindMapInstance"
          :active-sidebar="activeSidebar"
          :is-dark="isDark"
        />
        <BaseStyle
          v-if="mindMapInstance"
          :mind-map="mindMapInstance"
          :active-sidebar="activeSidebar"
          :is-dark="isDark"
          :bg-list="bgList"
        />
        <AssociativeLineStyle
          v-if="mindMapInstance"
          :mind-map="mindMapInstance"
          :active-sidebar="activeSidebar"
          :is-dark="isDark"
        />
        <Theme
          v-if="mindMapInstance"
          :mind-map="mindMapInstance"
        />
        <Structure
          v-if="mindMapInstance"
          :mind-map="mindMapInstance"
        />
        <NodeIconSidebar
          v-if="mindMapInstance"
          :active-sidebar="activeSidebar"
          :is-dark="isDark"
        />
        <NodeIconToolbar
          v-if="mindMapInstance"
          :mind-map="mindMapInstance"
          :active-sidebar="activeSidebar"
        />
        <Scrollbar
          v-if="isShowScrollbar && mindMapInstance"
          :mind-map="mindMapInstance"
        />
        <FormulaSidebar
          v-if="mindMapInstance"
          :mind-map="mindMapInstance"
          :active-sidebar="activeSidebar"
          :is-dark="isDark"
          @update:active-sidebar="(value) => editorStore.setActiveSidebar(value)"
        />
        <NodeOuterFrame
          v-if="mindMapInstance"
          :mind-map="mindMapInstance"
        />
        <NodeTagStyle
          v-if="mindMapInstance"
          :mind-map="mindMapInstance"
        />
        <Setting
          v-if="mindMapInstance"
          :mind-map="mindMapInstance"
          :active-sidebar="activeSidebar"
          :is-dark="isDark"
          :local-config="state.localConfig"
          @update:local-config="editorStore.setLocalConfig"
        />
        <NodeImgPlacementToolbar
          v-if="mindMapInstance"
          :mind-map="mindMapInstance"
        />
        <NodeNoteSidebar
          v-if="mindMapInstance"
          :mind-map="mindMapInstance"
        />
      </template>

      <!-- 通用组件 -->
      <Contextmenu
        v-if="mindMapInstance"
        :mind-map="mindMapInstance"
      />
      <RichTextToolbar
        v-if="mindMapInstance"
        :mind-map="mindMapInstance"
      />
      <NodeNoteContentShow
        v-if="mindMapInstance"
        :mind-map="mindMapInstance"
      />
      <NodeImgPreview
        v-if="mindMapInstance"
        :mind-map="mindMapInstance"
      />
      <SidebarTrigger
        v-if="!isZenMode"
        :is-dark="isDark"
        :active-sidebar="activeSidebar"
        :is-readonly="isReadonly"
        :enable-ai="enableAi"
        @update:active-sidebar="(value) => editorStore.setActiveSidebar(value)"
      />
      <ShortcutKey
        v-if="!isZenMode"
        :is-dark="isDark"
        :active-sidebar="activeSidebar"
        @update:active-sidebar="(value) => editorStore.setActiveSidebar(value)"
      />
      <Search
        v-if="mindMapInstance"
        :mind-map="mindMapInstance"
        :is-dark="isDark"
      />
      <OutlineEdit
        v-if="mindMapInstance"
        :mind-map="mindMapInstance"
        :is-dark="isDark"
        :is-outline-edit="isOutlineEdit"
        @set-is-outline-edit="(value) => editorStore.setIsOutlineEdit(value)"
        @set-data="handleOutlineEditSetData"
      />

      <!-- 对话框组件 -->
      <NodeImage />
      <NodeHyperlink />
      <NodeIcon />
      <NodeNote />
      <NodeTag />

      <!-- 拖拽遮罩 -->
      <div
        v-if="showDragMask"
        class="drag-mask"
        @dragleave.stop.prevent="handleDragLeave"
        @dragover.stop.prevent
        @drop.stop.prevent="handleDrop"
      >
        <div class="drag-tip">
          {{ localeTextProvider?.edit?.dragTip || '拖拽文件到此处导入' }}
        </div>
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>

<style scoped lang="scss">
.mind-map-root {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #f5f5f5;

  &.is-dark {
    background-color: #1a1a1a;
  }
}

.mind-map-editor {
  width: 100%;
  height: 100%;
  position: relative;
}

.mind-map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.drag-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.drag-tip {
  color: #fff;
  font-size: 24px;
  font-weight: bold;
}
</style>

