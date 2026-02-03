<script setup lang="ts">
import type {
  EventBus,
  LocaleTextProvider,
  MindMapInstance,
  MindMapNode,
} from '../types'
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { transformToTxt } from 'simple-mind-map/src/parse/toTxt'
import { getTextFromHtml, imgToDataUrl } from 'simple-mind-map/src/utils'
import { transformToMarkdown } from 'simple-mind-map/src/parse/toMarkdown'
import { useEditorState } from '@/composables/useEditorState'
import {
  setDataToClipboard,
  setImgToClipboard,
  isClipboardWriteAvailable,
} from '@/utils'

interface Props {
  mindMap?: MindMapInstance
}

const props = defineProps<Props>()

// Inject dependencies
const eventBus = inject<EventBus>('eventBus')!
const localeText = inject<LocaleTextProvider>('localeText')!

// Use editor state
const editorStore = useEditorState()
const { isZenMode, isDark, enableAi } = storeToRefs(editorStore)
const { setLocalConfig } = editorStore

// Refs
const contextmenuRef = ref<HTMLElement | null>(null)
const isShow = ref(false)
const left = ref(0)
const top = ref(0)
const node = ref<MindMapNode | null>(null)
const type = ref('')
const isMousedown = ref(false)
const mousedownX = ref(0)
const mousedownY = ref(0)
const numberType = ref('')
const numberLevel = ref('')
const subItemsShowLeft = ref(false)
const isNodeMousedown = ref(false)

// Computed
const expandList = computed(() => [
  localeText?.contextmenu?.level1 || '一级',
  localeText?.contextmenu?.level2 || '二级',
  localeText?.contextmenu?.level3 || '三级',
  localeText?.contextmenu?.level4 || '四级',
  localeText?.contextmenu?.level5 || '五级',
  localeText?.contextmenu?.level6 || '六级',
])

const copyList = computed(() => {
  const list = [
    // 注释掉:移除复制为 .smm 功能
    // {
    //   name: localeText?.contextmenu?.copyToSmm || '复制为.smm',
    //   value: 'smm',
    // },
    {
      name: localeText?.contextmenu?.copyToJson || '复制为JSON',
      value: 'json',
    },
    {
      name: localeText?.contextmenu?.copyToMarkdown || '复制为Markdown',
      value: 'md',
    },
    {
      name: localeText?.contextmenu?.copyToTxt || '复制为纯文本',
      value: 'txt',
    },
  ]
  // 仅安全上下文（HTTPS/localhost）且支持 clipboard.write 时显示「复制为PNG」
  if (isClipboardWriteAvailable()) {
    list.push({
      name: localeText?.contextmenu?.copyToPng || '复制为PNG',
      value: 'png',
    })
  }
  return list
})

const insertNodeBtnDisabled = computed(() => {
  return !node.value || node.value.isRoot || node.value.isGeneralization
})

const upNodeBtnDisabled = computed(() => {
  if (!node.value || node.value.isRoot || node.value.isGeneralization) {
    return true
  }
  const isFirst =
    node.value.parent.children.findIndex((item: MindMapNode) => {
      return item === node.value
    }) === 0
  return isFirst
})

const downNodeBtnDisabled = computed(() => {
  if (!node.value || node.value.isRoot || node.value.isGeneralization) {
    return true
  }
  const children = node.value.parent.children
  const isLast =
    children.findIndex((item: MindMapNode) => {
      return item === node.value
    }) ===
    children.length - 1
  return isLast
})

const isGeneralization = computed(() => {
  return node.value?.isGeneralization
})

const hasHyperlink = computed(() => {
  return !!node.value?.getData('hyperlink')
})

const hasNote = computed(() => {
  return !!node.value?.getData('note')
})

const hasCheckbox = computed(() => {
  return !!node.value?.getData('checkbox')
})

const hasNodeLink = computed(() => {
  return !!node.value?.getData('nodeLink')
})

// Methods
function getShowPosition(x: number, y: number) {
  if (!contextmenuRef.value) return { x, y }
  const rect = contextmenuRef.value.getBoundingClientRect()
  if (x + rect.width > window.innerWidth) {
    x = x - rect.width - 20
  }
  subItemsShowLeft.value = x + rect.width + 150 > window.innerWidth
  if (y + rect.height > window.innerHeight) {
    y = window.innerHeight - rect.height - 10
  }
  return { x, y }
}

function show(e: MouseEvent, n: MindMapNode) {
  type.value = 'node'
  isShow.value = true
  node.value = n
  const number = node.value.getData('number') as any
  if (number) {
    numberType.value = number.type || 1
    numberLevel.value = number.level === '' ? 1 : number.level
  }
  nextTick(() => {
    const { x, y } = getShowPosition(e.clientX + 10, e.clientY + 10)
    left.value = x
    top.value = y
  })
}

function onNodeMousedownHandler() {
  isNodeMousedown.value = true
}

function onMousedown(e: MouseEvent) {
  if (e.which !== 3) {
    return
  }
  mousedownX.value = e.clientX
  mousedownY.value = e.clientY
  isMousedown.value = true
}

function onMouseup(e: MouseEvent) {
  if (!isMousedown.value) {
    return
  }
  if (isNodeMousedown.value) {
    isNodeMousedown.value = false
    return
  }
  isMousedown.value = false
  if (
    Math.abs(mousedownX.value - e.clientX) > 3 ||
    Math.abs(mousedownY.value - e.clientY) > 3
  ) {
    hide()
    return
  }
  show2(e)
}

function show2(e: MouseEvent) {
  type.value = 'svg'
  isShow.value = true
  nextTick(() => {
    const { x, y } = getShowPosition(e.clientX + 10, e.clientY + 10)
    left.value = x
    top.value = y
  })
}

function hide() {
  isShow.value = false
  left.value = -9999
  top.value = -9999
  type.value = ''
  node.value = null
  numberType.value = ''
  numberLevel.value = ''
}

function exec(key: string, disabled?: boolean, ...args: any[]) {
  if (disabled) {
    return
  }
  switch (key) {
    case 'COPY_NODE':
      props.mindMap?.renderer.copy()
      break
    case 'CUT_NODE':
      props.mindMap?.renderer.cut()
      break
    case 'PASTE_NODE':
      props.mindMap?.renderer.paste()
      break
    case 'RETURN_CENTER':
      props.mindMap?.renderer.setRootNodeCenter()
      break
    case 'TOGGLE_ZEN_MODE':
      setLocalConfig({
        isZenMode: !isZenMode.value,
      })
      break
    case 'FIT_CANVAS':
      props.mindMap?.view.fit()
      break
    case 'REMOVE_HYPERLINK':
      node.value?.setHyperlink('', '')
      break
    case 'REMOVE_NOTE':
      node.value?.setNote('')
      break
    case 'EXPORT_CUR_NODE_TO_PNG':
      ;(props.mindMap as any)?.export(
        'png',
        true,
        getTextFromHtml(node.value?.getData('text') as string),
        false,
        node.value
      )
      break
    case 'UN_EXPAND_ALL':
      {
        const uid = node.value ? node.value.uid : ''
        eventBus.emit('execCommand', key, !uid, uid)
      }
      break
    case 'EXPAND_ALL':
      eventBus.emit('execCommand', key, node.value ? node.value.uid : '')
      break
    default:
      eventBus.emit('execCommand', key, ...args)
      break
  }
  hide()
}

async function copyToClipboard(copyType: string) {
  try {
    hide()
    let data: any
    let str: string | undefined
    let blob: Blob | undefined
    switch (copyType) {
      case 'json':
        data = props.mindMap?.getData(true)
        str = JSON.stringify(data)
        break
      case 'md':
        data = props.mindMap?.getData()
        str = transformToMarkdown(data)
        break
      case 'txt':
        data = props.mindMap?.getData()
        str = transformToTxt(data)
        break
      case 'png':
        {
          const png = await (props.mindMap as any)?.export('png', false)
          blob = await imgToDataUrl(png, true)
        }
        break
      default:
        break
    }
    let ok = false
    if (str) {
      ok = await setDataToClipboard(str)
    } else if (blob) {
      ok = await setImgToClipboard(blob)
    }
    if (ok) {
      ElMessage.success(localeText?.contextmenu?.copySuccess || '复制成功')
    } else {
      ElMessage.error(localeText?.contextmenu?.copyFail || '复制失败')
    }
  } catch (error) {
    console.warn('copyToClipboard error:', error)
    ElMessage.error(localeText?.contextmenu?.copyFail || '复制失败')
  }
}

function aiCreate() {
  eventBus.emit('ai_create_part', node.value)
  hide()
}

function handleTacticsAction(action: string) {
  console.log('技战法动作:', action, '节点:', node.value)
  // TODO: 实现具体的技战法动作处理逻辑
  ElMessage.info(`执行技战法: ${action}`)
  hide()
}

// Lifecycle
onMounted(() => {
  eventBus.on('node_contextmenu', show)
  eventBus.on('node_click', hide)
  eventBus.on('draw_click', hide)
  eventBus.on('expand_btn_click', hide)
  eventBus.on('svg_mousedown', onMousedown)
  eventBus.on('mouseup', onMouseup)
  eventBus.on('translate', hide)
  eventBus.on('node_mousedown', onNodeMousedownHandler)
})

onBeforeUnmount(() => {
  eventBus.off('node_contextmenu', show)
  eventBus.off('node_click', hide)
  eventBus.off('draw_click', hide)
  eventBus.off('expand_btn_click', hide)
  eventBus.off('svg_mousedown', onMousedown)
  eventBus.off('mouseup', onMouseup)
  eventBus.off('translate', hide)
  eventBus.off('node_mousedown', onNodeMousedownHandler)
})
</script>

<template>
  <div
    v-if="isShow"
    ref="contextmenuRef"
    class="contextmenuContainer"
    :style="{ left: `${left}px`, top: `${top}px` }"
    :class="{ isDark }">
    <template v-if="type === 'node'">
      <!-- 左右两栏布局 -->
      <div class="panelWrapper" :class="{ isDark }">
        <!-- 左侧：技战法推荐 -->
        <div class="panelSection leftPanel">
          <div class="panelTitle">技战法推荐</div>

          <!-- 通讯号码研判 -->
          <div class="item" @click="handleTacticsAction('phone')">
            <span class="i-custom:phone tactics-icon" style="color: #3b82f6" />
            <span class="name">通讯号码研判</span>
          </div>

          <!-- APP研判 -->
          <div class="tactics-group">
            <div class="tactics-group-title">
              <span class="i-custom:apps tactics-icon" style="color: #22c55e" />
              <span class="name">APP研判</span>
            </div>
            <div
              class="tactics-sub-item"
              @click="handleTacticsAction('app-device')">
              APP包名获取设备/Wi-Fi
            </div>
            <div
              class="tactics-sub-item"
              @click="handleTacticsAction('app-mds')">
              文件MDS提取终端画像(FR)
            </div>
          </div>

          <div class="splitLine" />

          <!-- Wi-Fi研判 -->
          <div class="item" @click="handleTacticsAction('wifi')">
            <span class="i-custom:wifi tactics-icon" style="color: #a855f7" />
            <span class="name">Wi-Fi研判</span>
          </div>

          <!-- 出口路由研判 -->
          <div class="tactics-group">
            <div class="tactics-group-title">
              <span
                class="i-custom:router tactics-icon"
                style="color: #f97316" />
              <span class="name">出口路由研判</span>
            </div>
            <div
              class="tactics-sub-item"
              @click="handleTacticsAction('router-list')">
              出口路由列表
            </div>
            <div
              class="tactics-sub-item"
              @click="handleTacticsAction('router-fr')">
              出口路由提取终端画像(FR)
            </div>
          </div>

          <div class="splitLine" />

          <!-- IP研判 -->
          <div class="tactics-group">
            <div class="tactics-group-title">
              <span class="i-custom:ip tactics-icon" style="color: #3b82f6" />
              <span class="name">IP研判</span>
            </div>
            <div class="tactics-sub-item" @click="handleTacticsAction('ip-fr')">
              IP提取终端画像(FR)
            </div>
            <div
              class="tactics-sub-item"
              @click="handleTacticsAction('ip-device')">
              IP获取设备/Wi-Fi
            </div>
            <div
              class="tactics-sub-item"
              @click="handleTacticsAction('ip-trace')">
              IP溯源
            </div>
          </div>

          <div class="splitLine" />

          <!-- 网站研判 -->
          <div class="tactics-group">
            <div class="tactics-group-title">
              <span
                class="i-custom:website tactics-icon"
                style="color: #14b8a6" />
              <span class="name">网站研判</span>
            </div>
            <div
              class="tactics-sub-item"
              @click="handleTacticsAction('website-info')">
              网站基础信息识别
            </div>
            <div
              class="tactics-sub-item"
              @click="handleTacticsAction('website-fr')">
              网址域名获取终端画像(FR)
            </div>
          </div>

          <div class="splitLine" />

          <!-- 虚拟身份获取终端画像 -->
          <div class="item" @click="handleTacticsAction('virtual-identity')">
            <span
              class="i-custom:virtual tactics-icon"
              style="color: #a855f7" />
            <span class="name">虚拟身份获取终端画像(FR)</span>
          </div>

          <!-- 邮箱获取终端画像 -->
          <div class="item" @click="handleTacticsAction('email')">
            <span class="i-custom:mail tactics-icon" style="color: #f59e0b" />
            <span class="name">邮箱获取终端画像</span>
          </div>

          <div class="splitLine" />

          <!-- 批量上传数据 -->
          <div class="item" @click="handleTacticsAction('batch-upload')">
            <span class="i-custom:upload tactics-icon" style="color: #6b7280" />
            <span class="name">批量上传数据</span>
          </div>
        </div>

        <!-- 中间分隔线 -->
        <div class="verticalDivider" />

        <!-- 右侧：脑图菜单 -->
        <div class="panelSection rightPanel">
          <div class="panelTitle">脑图菜单</div>
          <div
            class="item"
            :class="{ disabled: insertNodeBtnDisabled }"
            @click="exec('INSERT_NODE', insertNodeBtnDisabled)">
            <span class="name">
              {{ localeText?.contextmenu?.insertSiblingNode || '插入同级节点' }}
            </span>
            <span class="desc">Enter</span>
          </div>
          <div
            class="item"
            :class="{ disabled: isGeneralization }"
            @click="exec('INSERT_CHILD_NODE')">
            <span class="name">
              {{ localeText?.contextmenu?.insertChildNode || '插入子节点' }}
            </span>
            <span class="desc">Tab</span>
          </div>
          <div
            class="item"
            :class="{ disabled: insertNodeBtnDisabled }"
            @click="exec('INSERT_PARENT_NODE')">
            <span class="name">
              {{ localeText?.contextmenu?.insertParentNode || '插入父节点' }}
            </span>
            <span class="desc">Shift + Tab</span>
          </div>
          <div
            class="item"
            :class="{ disabled: insertNodeBtnDisabled }"
            @click="exec('ADD_GENERALIZATION')">
            <span class="name">
              {{ localeText?.contextmenu?.insertSummary || '插入概要' }}
            </span>
            <span class="desc">Ctrl + G</span>
          </div>
          <div class="splitLine" />
          <div
            class="item"
            :class="{ disabled: upNodeBtnDisabled }"
            @click="exec('UP_NODE')">
            <span class="name">
              {{ localeText?.contextmenu?.moveUpNode || '上移节点' }}
            </span>
            <span class="desc">Ctrl + ↑</span>
          </div>
          <div
            class="item"
            :class="{ disabled: downNodeBtnDisabled }"
            @click="exec('DOWN_NODE')">
            <span class="name">
              {{ localeText?.contextmenu?.moveDownNode || '下移节点' }}
            </span>
            <span class="desc">Ctrl + ↓</span>
          </div>
          <div class="item" @click="exec('UN_EXPAND_ALL')">
            <span class="name">
              {{ localeText?.contextmenu?.unExpandNodeChild || '收起子节点' }}
            </span>
          </div>
          <div class="item" @click="exec('EXPAND_ALL')">
            <span class="name">
              {{ localeText?.contextmenu?.expandNodeChild || '展开子节点' }}
            </span>
          </div>
          <div class="splitLine" />
          <div class="item danger" @click="exec('REMOVE_NODE')">
            <span class="name">
              {{ localeText?.contextmenu?.deleteNode || '删除节点' }}
            </span>
            <span class="desc">Delete</span>
          </div>
          <div class="item danger" @click="exec('REMOVE_CURRENT_NODE')">
            <span class="name">
              {{
                localeText?.contextmenu?.deleteCurrentNode || '仅删除当前节点'
              }}
            </span>
            <span class="desc">Shift + Backspace</span>
          </div>
          <div class="splitLine" />
          <div
            class="item"
            :class="{ disabled: isGeneralization }"
            @click="exec('COPY_NODE')">
            <span class="name">
              {{ localeText?.contextmenu?.copyNode || '复制节点' }}
            </span>
            <span class="desc">Ctrl + C</span>
          </div>
          <div
            class="item"
            :class="{ disabled: isGeneralization }"
            @click="exec('CUT_NODE')">
            <span class="name">
              {{ localeText?.contextmenu?.cutNode || '剪切节点' }}
            </span>
            <span class="desc">Ctrl + X</span>
          </div>
          <div class="item" @click="exec('PASTE_NODE')">
            <span class="name">
              {{ localeText?.contextmenu?.pasteNode || '粘贴节点' }}
            </span>
            <span class="desc">Ctrl + V</span>
          </div>
          <div class="splitLine" />
          <div
            v-if="hasHyperlink"
            class="item"
            @click="exec('REMOVE_HYPERLINK')">
            <span class="name">
              {{ localeText?.contextmenu?.removeHyperlink || '删除超链接' }}
            </span>
          </div>
          <div v-if="hasNote" class="item" @click="exec('REMOVE_NOTE')">
            <span class="name">
              {{ localeText?.contextmenu?.removeNote || '删除备注' }}
            </span>
          </div>
          <div class="item" @click="exec('REMOVE_CUSTOM_STYLES')">
            <span class="name">
              {{
                localeText?.contextmenu?.removeCustomStyles || '清除自定义样式'
              }}
            </span>
          </div>
          <div class="item" @click="exec('EXPORT_CUR_NODE_TO_PNG')">
            <span class="name">
              {{ localeText?.contextmenu?.exportNodeToPng || '导出为PNG' }}
            </span>
          </div>
          <!-- <div v-if="enableAi" class="splitLine" />
          <div v-if="enableAi" class="item" @click="aiCreate">
            <span class="name">{{ localeText?.contextmenu?.aiCreate || 'AI续写' }}</span>
          </div> -->
        </div>
      </div>
    </template>
    <template v-if="type === 'svg'">
      <div class="listBox svgContextMenu" :class="{ isDark }">
        <div class="item" @click="exec('RETURN_CENTER')">
          <span class="name">
            {{ localeText?.contextmenu?.backCenter || '回到中心' }}
          </span>
          <span class="desc">Ctrl + Enter</span>
        </div>
        <div class="splitLine" />
        <div class="item" @click="exec('EXPAND_ALL')">
          <span class="name">
            {{ localeText?.contextmenu?.expandAll || '展开所有' }}
          </span>
        </div>
        <div class="item" @click="exec('UN_EXPAND_ALL')">
          <span class="name">
            {{ localeText?.contextmenu?.unExpandAll || '收起所有' }}
          </span>
        </div>
        <div class="item">
          <span class="name">
            {{ localeText?.contextmenu?.expandTo || '展开到' }}
          </span>
          <span class="i-ep:arrow-right" />
          <div
            class="subItems listBox"
            :class="{ isDark, showLeft: subItemsShowLeft }"
            style="top: -10px">
            <div
              v-for="(item, index) in expandList"
              :key="item"
              class="item"
              @click="exec('UN_EXPAND_TO_LEVEL', false, index + 1)">
              {{ item }}
            </div>
          </div>
        </div>
        <div class="splitLine" />
        <div class="item" @click="exec('RESET_LAYOUT')">
          <span class="name">
            {{ localeText?.contextmenu?.arrangeLayout || '整理布局' }}
          </span>
          <span class="desc">Ctrl + L</span>
        </div>
        <div class="item" @click="exec('FIT_CANVAS')">
          <span class="name">
            {{ localeText?.contextmenu?.fitCanvas || '适应画布' }}
          </span>
          <span class="desc">Ctrl + i</span>
        </div>
        <div class="item" @click="exec('TOGGLE_ZEN_MODE')">
          <span class="name">
            {{ localeText?.contextmenu?.zenMode || '禅模式' }}
          </span>
          {{ isZenMode ? '√' : '' }}
        </div>
        <div class="splitLine" />
        <div class="item" @click="exec('REMOVE_ALL_NODE_CUSTOM_STYLES')">
          <span class="name">
            {{
              localeText?.contextmenu?.removeAllNodeCustomStyles ||
              '清除所有节点自定义样式'
            }}
          </span>
        </div>
        <div class="item">
          <span class="name">
            {{ localeText?.contextmenu?.copyToClipboard || '复制到剪贴板' }}
          </span>
          <span class="i-ep:arrow-right" />
          <div
            class="subItems listBox"
            :class="{ isDark, showLeft: subItemsShowLeft }"
            style="top: -130px">
            <div
              v-for="item in copyList"
              :key="item.value"
              class="item"
              @click="copyToClipboard(item.value)">
              {{ item.name }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.listBox {
  background: #fff;

  &.isDark {
    background: #363b3f;
  }
}

.contextmenuContainer {
  position: fixed;
  font-size: 14px;
  font-family:
    PingFangSC-Regular,
    PingFang SC;
  font-weight: 400;
  color: #1a1a1a;
  max-width: 600px;
  z-index: 10002;

  &.isDark {
    color: #fff;
  }

  // 左右两栏布局容器
  .panelWrapper {
    display: flex;
    gap: 0;
    background: #fff;
    box-shadow: 0 4px 12px 0 hsla(0, 0%, 69%, 0.5);
    border-radius: 8px;
    overflow: hidden;

    &.isDark {
      background: #363b3f;
    }
  }

  // 中间分隔线
  .verticalDivider {
    width: 1px;
    background: #e9edf2;
    margin: 8px 0;

    .isDark & {
      background: #4a4e52;
    }
  }

  // 面板通用样式
  .panelSection {
    display: flex;
    flex-direction: column;
    padding: 8px;
    width: 299px;

    // 面板标题
    .panelTitle {
      font-size: 15px;
      font-weight: 600;
      padding: 8px 12px 0 12px;
      margin: -8px -8px 8px -8px;
      color: #222;
    }
  }

  .panelWrapper.isDark {
    .panelTitle {
      color: #fff;
      background: #2a2e32;
      border-bottom-color: #4a4e52;
    }
  }

  // 左侧面板
  .leftPanel {
    .tactics-icon {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-right: 8px;
      font-size: 16px;
      vertical-align: middle;
      pointer-events: none;
    }

    // 技战法组（直接展开）
    .tactics-group {
      margin-bottom: 2px;

      .tactics-group-title {
        display: flex;
        align-items: center;
        padding: 2px 8px;
        font-size: 14px;
        color: #333;
        font-weight: 500;
        border-radius: 4px;
        cursor: default;

        .name {
          pointer-events: none;
        }
      }

      .tactics-sub-item {
        padding: 2px 8px 2px 32px;
        font-size: 13px;
        color: #555;
        cursor: pointer;
        border-radius: 4px;
        margin-top: 1px;

        &:hover {
          background: #f5f5f5;
        }
      }
    }

    &.isDark {
      .tactics-group {
        .tactics-group-title {
          color: #fff;
        }

        .tactics-sub-item {
          color: #ccc;

          &:hover {
            background: hsla(0, 0%, 100%, 0.05);
          }
        }
      }
    }

    .has-submenu {
      position: relative;

      .submenu {
        position: absolute;
        left: 100%;
        top: -4px;
        margin-left: 4px;
        min-width: 200px;
        padding: 4px 0;
        z-index: 10003;

        .submenu-item {
          padding: 2px 12px;
          font-size: 13px;
          color: #555;
          cursor: pointer;
          white-space: nowrap;

          &:hover {
            background: #f5f5f5;
          }
        }

        &.isDark {
          .submenu-item {
            color: #ccc;

            &:hover {
              background: hsla(0, 0%, 100%, 0.05);
            }
          }
        }
      }
    }
  }

  // 右侧面板
  .rightPanel {
    width: 299px;
  }

  // SVG 右键菜单样式
  .svgContextMenu {
    width: 250px;
    padding: 8px 8px;
    border-radius: 4px;
    box-shadow: 0 4px 12px 0 hsla(0, 0%, 69%, 0.5);
  }

  .splitLine {
    height: 1px;
    background-color: #f3f4f6;
    margin: 4px 0;
  }

  .isDark .splitLine {
    background-color: #4a4e52;
  }

  .item {
    position: relative;
    min-height: 28px;
    padding: 2px 8px;
    margin-bottom: 2px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 4px;
    font-size: 14px;

    &.danger {
      .name {
        color: #e53e3e;
      }
    }

    &:hover {
      background: #f5f5f5;

      .subItems {
        visibility: visible;
      }
    }

    &.disabled {
      color: grey;
      cursor: not-allowed;
      pointer-events: none;

      &:hover {
        background: transparent;
      }
    }

    .name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #333;
      cursor: inherit;
      pointer-events: none;
    }

    .desc {
      margin-left: 8px;
      font-size: 12px;
      color: #888;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: inherit;
      pointer-events: none;
    }

    // 箭头图标不阻止点击
    [class*='i-'],
    [class*='icon'] {
      pointer-events: none;
    }

    .subItems {
      position: absolute;
      left: 100%;
      margin-left: -4px; /* 消除父子菜单间隙，保持hover状态 */
      visibility: hidden;
      width: 150px;
      padding: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px 0 hsla(0, 0%, 69%, 0.5);
      border-radius: 8px;

      &.showLeft {
        left: auto;
        right: 100%;
        margin-left: 0;
        margin-right: -4px; /* 左侧显示时也消除间隙 */
      }
    }
  }

  .isDark .item {
    &:hover {
      background: hsla(0, 0%, 100%, 0.05);
    }

    .name {
      color: #fff;
    }

    .desc {
      color: #999;
    }

    .subItems {
      box-shadow: 0 4px 12px 0 hsla(0, 0%, 0%, 0.5);
    }
  }
}
</style>
