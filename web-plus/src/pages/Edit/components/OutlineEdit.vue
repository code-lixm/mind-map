<script setup lang="ts">
import type { EventBus, MindMapInstance, OutlineTreeNode } from '../types'
import {
  createUid,
  handleInputPasteText,
  htmlEscape,
  nodeRichTextToTextWithWrap,
  simpleDeepClone,
  textToNodeRichTextWithWrap,
} from 'simple-mind-map/src/utils'
import { printOutline } from '@/utils'

// Props
interface Props {
  mindMap: MindMapInstance
  isReadonly?: boolean
  isDark?: boolean
  isOutlineEdit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReadonly: false,
  isDark: false,
  isOutlineEdit: false,
})

// Emits
const emit = defineEmits<{
  setIsOutlineEdit: [value: boolean]
  setData: [data: any]
}>()

// 注入
const eventBus = inject<EventBus>('eventBus')
const localeText = inject<(key: string) => string>('localeText', () => '')

// 状态
const data = ref<OutlineTreeNode[]>([])
const defaultProps = {
  label: 'label',
}
const currentData = ref<OutlineTreeNode | null>(null)

// Refs
const treeRef = ref<any>(null)
const outlineEditContainerRef = ref<HTMLDivElement>()
const outlineEditBoxRef = ref<HTMLDivElement>()

// 监听 isOutlineEdit 变化
watch(() => props.isOutlineEdit, (val) => {
  if (val) {
    refresh()
    nextTick(() => {
      if (outlineEditContainerRef.value) {
        document.body.appendChild(outlineEditContainerRef.value)
      }
    })
  }
})

// 刷新树数据
function refresh() {
  const treeData = props.mindMap.getData() as any
  treeData.root = true // 标记根节点
  const walk = (root: any) => {
    let text = root.data.richText
      ? nodeRichTextToTextWithWrap(root.data.text)
      : root.data.text
    text = htmlEscape(text)
    text = text.replace(/\n/g, '<br>')
    root.textCache = text // 保存一份修改前的数据，用于对比是否修改了
    root.label = text
    root.uid = root.data.uid
    if (root.children && root.children.length > 0) {
      root.children.forEach((item: any) => {
        walk(item)
      })
    }
  }
  walk(treeData)
  data.value = [treeData]
}

// 根节点不允许拖拽
function checkAllowDrag(node: any) {
  return !node.data.root
}

// 拖拽结束事件
function onNodeDrop() {
}

// 当前选中的树节点变化事件
function onCurrentChange(nodeData: OutlineTreeNode) {
  currentData.value = nodeData
}

// 失去焦点更新节点文本
function onBlur(e: FocusEvent, node: any) {
  const target = e.target as HTMLElement
  // 节点数据没有修改
  if (node.data.textCache === target.innerHTML) {
    return
  }
  const richText = node.data.data.richText
  const text = richText ? target.innerHTML : target.textContent
  node.data.data.text = richText ? textToNodeRichTextWithWrap(text) : text
  node.data.textCache = target.innerHTML
}

// 节点输入区域按键事件
function onNodeInputKeydown(e: KeyboardEvent, node: any) {
  const richText = !!node.data.data.richText
  const uid = createUid()
  const text = localeText('outline.nodeDefaultText')
  const newData: OutlineTreeNode = {
    textCache: text,
    uid,
    label: text,
    data: {
      text: richText ? textToNodeRichTextWithWrap(text) : text,
      uid,
      richText,
    },
    children: [],
  }
  if (e.keyCode === 13 && !e.shiftKey) {
    e.preventDefault()
    if (node.data.root) {
      return
    }
    treeRef.value?.insertAfter(newData, node)
  }
  if (e.keyCode === 9) {
    e.preventDefault()
    if (e.shiftKey) {
      // 上移一个层级
      treeRef.value?.insertAfter(node.data, node.parent)
      treeRef.value?.remove(node)
    }
    else {
      treeRef.value?.append(newData, node)
    }
  }
  nextTick(() => {
    treeRef.value?.setCurrentKey(uid)
    const el = document.querySelector(
      `.customNode[data-id="${uid}"] .nodeEdit`,
    )
    if (el) {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(el)
      selection?.removeAllRanges()
      selection?.addRange(range)
      const offsetTop = (el as HTMLElement).offsetTop
      scrollTo(offsetTop)
    }
  })
}

// 删除节点
function onKeyDown(e: KeyboardEvent) {
  if (!props.isOutlineEdit)
    return
  if ([46, 8].includes(e.keyCode) && currentData.value) {
    e.stopPropagation()
    treeRef.value?.remove(currentData.value)
    currentData.value = null
  }
}

// 拦截粘贴事件
function onPaste(e: ClipboardEvent, _node?: any) {
  handleInputPasteText(e)
}

// 生成唯一的key
function getKey() {
  return Math.random()
}

// 打印
function handlePrint() {
  if (outlineEditBoxRef.value) {
    printOutline(outlineEditBoxRef.value)
  }
}

// 关闭
function handleClose() {
  console.log('🚀 ~ handleClose ~ getData():', getData())
  emit('setIsOutlineEdit', false)
  emit('setData', getData())
}

// 滚动
function scrollTo(y: number) {
  const container = outlineEditBoxRef.value
  if (!container)
    return
  const height = container.offsetHeight
  const top = container.scrollTop
  y += 50
  if (y > top + height) {
    container.scrollTo(0, y - height / 2)
  }
}

// 获取思维导图数据
function getData() {
  const newNode: any = {}
  const node = data.value[0]
  if (!node) return newNode
  const walk = (root: OutlineTreeNode, newRoot: any) => {
    newRoot.data = root.data
    newRoot.children = []
    ;(root.children || []).forEach((child: OutlineTreeNode) => {
      const newChild: any = {}
      newRoot.children.push(newChild)
      walk(child, newChild)
    })
  }
  walk(node, newNode)
  return simpleDeepClone(newNode)
}

// 生命周期
onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div
    v-if="isOutlineEdit"
    ref="outlineEditContainerRef"
    class="outlineEditContainer"
    :class="{ isDark }"
  >
    <div class="btnList">
      <el-tooltip
        class="item"
        effect="dark"
        :content="localeText('outline.print')"
        placement="top"
      >
        <div class="btn" @click="handlePrint">
          <span class="icon iconfont iconprinting" />
        </div>
      </el-tooltip>
      <div class="btn" @click="handleClose">
        <span class="icon iconfont iconguanbi" />
      </div>
    </div>
    <div
      id="fullScreenOutlineEditBox"
      ref="outlineEditBoxRef"
      class="outlineEditBox"
    >
      <div class="outlineEdit">
        <el-tree
          ref="treeRef"
          class="outlineTree"
          node-key="uid"
          draggable
          default-expand-all
          :class="{ isDark }"
          :data="data"
          :props="defaultProps"
          :highlight-current="true"
          :expand-on-click-node="false"
          :allow-drag="checkAllowDrag"
          @node-drop="onNodeDrop"
          @current-change="onCurrentChange"
        >
          <template #default="{ node, data }">
            <span
              class="customNode"
              :data-id="data.uid"
            >
              <span
                :key="getKey()"
                class="nodeEdit"
                :contenteditable="!isReadonly"
                @blur="onBlur($event, node)"
                @keydown.stop="onNodeInputKeydown($event, node)"
                @keyup.stop
                @paste="onPaste($event, node)"
                v-html="node.label"
              />
            </span>
          </template>
        </el-tree>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.outlineEditContainer {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 1999;
  background-color: #fff;
  overflow: hidden;

  &.isDark {
    background-color: #262a2e;

    .btnList {
      .btn {
        .icon {
          color: #fff;
        }
      }
    }
  }

  .btnList {
    position: absolute;
    right: 40px;
    top: 20px;
    display: flex;
    align-items: center;

    .btn {
      cursor: pointer;
      margin-left: 12px;

      .icon {
        font-size: 28px;
      }
    }
  }

  .outlineEditBox {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 50px 0;

    .outlineEdit {
      width: 1000px;
      height: 100%;
      height: max-content;
      margin: 0 auto;

      :deep(.customNode) {
        .nodeEdit {
          max-width: 800px;
        }
      }
    }
  }
}

.customNode {
  width: 100%;
  color: rgba(0, 0, 0, 0.85);
  font-weight: bold;

  .nodeEdit {
    outline: none;
    white-space: normal;
    padding-right: 20px;
  }
}
</style>

<style lang="scss" scoped>
@import '@/style/outlineTree.scss';
</style>
