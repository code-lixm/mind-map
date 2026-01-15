<script setup lang="ts">
import { inject, ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import type { EventBus, MindMapInstance, OutlineTreeNode } from '../types'
import {
  createUid,
  handleInputPasteText,
  htmlEscape,
  nodeRichTextToTextWithWrap,
  textToNodeRichTextWithWrap,
} from 'simple-mind-map/src/utils'

// Props
interface Props {
  mindMap: MindMapInstance
  isReadonly?: boolean
  isDark?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReadonly: false,
  isDark: false,
})

// Emits
const emit = defineEmits<{
  scrollTo: [offsetTop: number]
  setIsDragOutlineTreeNode: [value: boolean]
}>()

// 注入
const eventBus = inject<EventBus>('eventBus')

// 状态
const data = ref<OutlineTreeNode[]>([])
const defaultProps = {
  label: 'label',
}
const currentData = ref<OutlineTreeNode | null>(null)
const notHandleDataChange = ref(false)
const isHandleNodeTreeRenderEnd = ref(false)
const beInsertNodeUid = ref('')
const insertType = ref<'' | 'insertNode' | 'insertChildNode' | 'moveUp'>('')
const isInTreeArea = ref(false)
const isAfterCreateNewNode = ref(false)

// Refs
const treeRef = ref<any>(null)

// 事件处理函数
function handleHideTextEdit() {
  if (notHandleDataChange.value) {
    notHandleDataChange.value = false
    refresh()
  }
}

function handleDataChange() {
  // 在大纲里操作节点时不要响应该事件，否则会重新刷新树
  if (notHandleDataChange.value) {
    notHandleDataChange.value = false
    isAfterCreateNewNode.value = false
    return
  }
  if (isAfterCreateNewNode.value) {
    isAfterCreateNewNode.value = false
    return
  }
  refresh()
}

function handleNodeTreeRenderEnd() {
  // 当前存在未完成的节点插入操作
  if (insertType.value) {
    const type = insertType.value
    if (type === 'insertNode') {
      insertNode()
    }
    else if (type === 'insertChildNode') {
      insertChildNode()
    }
    else if (type === 'moveUp') {
      moveUp()
    }
    insertType.value = ''
    return
  }
  // 插入了新节点后需要做一些操作
  if (isHandleNodeTreeRenderEnd.value) {
    isHandleNodeTreeRenderEnd.value = false
    refresh()
    nextTick(() => {
      afterCreateNewNode()
    })
  }
}

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

// 插入了新节点之后
function afterCreateNewNode() {
  // 如果是新插入节点,那么需要手动高亮该节点、定位该节点及聚焦
  const id = beInsertNodeUid.value
  if (id && treeRef.value) {
    try {
      isAfterCreateNewNode.value = true
      // 高亮树节点
      treeRef.value.setCurrentKey(id)
      const node = treeRef.value.getNode(id)
      onCurrentChange(node.data)
      // 定位该节点
      onClick(node.data)
      // 聚焦该树节点的编辑框
      const el = document.querySelector(
        `.customNode[data-id="${id}"] .nodeEdit`,
      )
      if (el) {
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(el)
        selection?.removeAllRanges()
        selection?.addRange(range)
        const offsetTop = (el as HTMLElement).offsetTop
        emit('scrollTo', offsetTop)
      }
    }
    catch (error) {
      console.log(error)
    }
  }
  beInsertNodeUid.value = ''
}

// 根节点不允许拖拽
function checkAllowDrag(node: any) {
  return !node.data.root
}

// 失去焦点更新节点文本
function onBlur(e: FocusEvent, node: any) {
  const target = e.target as HTMLElement
  // 节点数据没有修改
  if (node.data.textCache === target.innerHTML) {
    // 如果存在未执行的插入新节点操作，那么直接执行
    if (insertType.value) {
      const type = insertType.value
      if (type === 'insertNode') {
        insertNode()
      }
      else if (type === 'insertChildNode') {
        insertChildNode()
      }
      else if (type === 'moveUp') {
        moveUp()
      }
      insertType.value = ''
    }
    return
  }
  // 否则插入新节点操作需要等待当前修改事件渲染完成后再执行
  const richText = node.data.data.richText
  const text = richText ? target.innerHTML : target.textContent
  const targetNode = props.mindMap.renderer.findNodeByUid(node.data.uid)
  if (!targetNode)
    return
  notHandleDataChange.value = true
  if (richText) {
    targetNode.setText(textToNodeRichTextWithWrap(text), true)
  }
  else {
    targetNode.setText(text)
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

// 节点输入区域按键事件
function onNodeInputKeydown(e: KeyboardEvent, _node?: any) {
  if (e.keyCode === 13 && !e.shiftKey) {
    // 插入兄弟节点
    e.preventDefault()
    insertType.value = 'insertNode'
    ;(e.target as HTMLElement).blur()
  }
  if (e.keyCode === 9) {
    e.preventDefault()
    if (e.shiftKey) {
      // 节点上升一级
      insertType.value = 'moveUp'
      ;(e.target as HTMLElement).blur()
    }
    else {
      // 插入子节点
      insertType.value = 'insertChildNode'
      ;(e.target as HTMLElement).blur()
    }
  }
}

// 节点上移一个层级
function moveUp() {
  props.mindMap.execCommand('MOVE_UP_ONE_LEVEL')
}

// 插入兄弟节点
function insertNode() {
  notHandleDataChange.value = true
  isHandleNodeTreeRenderEnd.value = true
  beInsertNodeUid.value = createUid()
  props.mindMap.execCommand('INSERT_NODE', false, [], {
    uid: beInsertNodeUid.value,
  })
}

// 插入下级节点
function insertChildNode() {
  notHandleDataChange.value = true
  isHandleNodeTreeRenderEnd.value = true
  beInsertNodeUid.value = createUid()
  props.mindMap.execCommand('INSERT_CHILD_NODE', false, [], {
    uid: beInsertNodeUid.value,
  })
}

const visitedNode = ref<any>(null)
// 激活当前节点且移动当前节点到画布中间
function onClick(nodeData: OutlineTreeNode) {
  notHandleDataChange.value = true
  const readonly = props.isReadonly
  const targetNode = props.mindMap.renderer.findNodeByUid(nodeData.uid)
  if (targetNode && targetNode.nodeData.data.isActive)
    return
  props.mindMap.execCommand('GO_TARGET_NODE', nodeData.uid, (node) => {
    notHandleDataChange.value = false
    if (readonly) {
      visitedNode.value?.closeHighlight()
      node.highlight()
      visitedNode.value = node
    }
  })
}

function onNodeDragStart() {
  emit('setIsDragOutlineTreeNode', true)
}

function onNodeDragEnd() {
  emit('setIsDragOutlineTreeNode', false)
}

// 拖拽结束事件
function onNodeDrop(dragData: any, target: any, position: string) {
  notHandleDataChange.value = true
  const node = props.mindMap.renderer.findNodeByUid(dragData.data.uid)
  const targetNode = props.mindMap.renderer.findNodeByUid(target.data.uid)
  if (!node || !targetNode) {
    return
  }
  switch (position) {
    case 'before':
      props.mindMap.execCommand('INSERT_BEFORE', node, targetNode)
      break
    case 'after':
      props.mindMap.execCommand('INSERT_AFTER', node, targetNode)
      break
    case 'inner':
      props.mindMap.execCommand('MOVE_NODE_TO', node, targetNode)
      break
    default:
      break
  }
}

// 当前选中的树节点变化事件
function onCurrentChange(nodeData: OutlineTreeNode) {
  currentData.value = nodeData
}

// 删除节点
function onKeyDown(e: KeyboardEvent) {
  if (!isInTreeArea.value)
    return
  if ([46, 8].includes(e.keyCode) && currentData.value) {
    e.stopPropagation()
    props.mindMap.renderer.textEdit.hideEditTextBox()
    const node = props.mindMap.renderer.findNodeByUid(currentData.value.uid)
    if (node && !node.isRoot) {
      notHandleDataChange.value = true
      treeRef.value?.remove(currentData.value)
      props.mindMap.execCommand('REMOVE_NODE', [node])
    }
  }
}

// 生命周期
onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  if (eventBus) {
    eventBus.on('data_change', handleDataChange)
    eventBus.on('node_tree_render_end', handleNodeTreeRenderEnd)
    eventBus.on('hide_text_edit', handleHideTextEdit)
  }
  refresh()
})

onBeforeUnmount(() => {
  visitedNode.value?.closeHighlight()
  window.removeEventListener('keydown', onKeyDown)
  if (eventBus) {
    eventBus.off('data_change', handleDataChange)
    eventBus.off('node_tree_render_end', handleNodeTreeRenderEnd)
    eventBus.off('hide_text_edit', handleHideTextEdit)
  }
})
</script>

<template>
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
    @node-drag-start="onNodeDragStart"
    @node-drag-end="onNodeDragEnd"
    @current-change="onCurrentChange"
    @mouseenter="isInTreeArea = true"
    @mouseleave="isInTreeArea = false"
  >
    <template #default="{ node, data }">
      <span
        class="customNode"
        :data-id="data.uid"
        @click="onClick(data)"
      >
        <span
          :key="getKey()"
          class="nodeEdit"
          :contenteditable="!isReadonly"
          @keydown.stop="onNodeInputKeydown($event, node)"
          @keyup.stop
          @blur="onBlur($event, node)"
          @paste="onPaste($event, node)"
          v-html="node.label"
        />
      </span>
    </template>
  </el-tree>
</template>

<style lang="scss" scoped>
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
@import url('../styles/outlineTree.scss');
</style>
