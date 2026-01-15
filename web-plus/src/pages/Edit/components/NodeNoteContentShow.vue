<script setup lang="ts">
import '@toast-ui/editor/dist/toastui-editor-viewer.css'
import type { EventBus, IsDark } from '../types'
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import Viewer from '@toast-ui/editor/dist/toastui-editor-viewer'

interface Props {
  mindMap: any
}

const props = defineProps<Props>()

const eventBus = inject<EventBus>('eventBus')!
const isDark = inject<IsDark>('isDark')

const noteContentViewerRef = ref<HTMLElement | null>(null)
const noteContentWrapRef = ref<HTMLElement | null>(null)
const editor = ref<Viewer | null>(null)
const show = ref(false)
const left = ref(0)
const top = ref(0)
const node = ref<any | null>(null)

function onNodeActive(_node: any, nodes: any[]) {
  const nodeList = nodes ? [...nodes] : []
  if (nodeList.length > 0) {
    if (nodeList[0] !== node.value) {
      hideNoteContent()
    }
  }
  else {
    hideNoteContent()
  }
}

function onShowNoteContent(content: string, leftPos: number, topPos: number, nodeData: any) {
  node.value = nodeData
  if (editor.value) {
    ;(editor.value as any).setMarkdown(content)
  }
  handleALink()
  updateNoteContentPosition(leftPos, topPos)
  show.value = true
}

function handleALink() {
  if (!noteContentViewerRef.value)
    return
  const list = noteContentViewerRef.value.querySelectorAll('a')
  Array.from(list).forEach((a) => {
    a.setAttribute('target', '_blank')
  })
}

function updateNoteContentPosition(leftPos: number, topPos: number) {
  if (!noteContentViewerRef.value)
    return
  const { width, height } = noteContentViewerRef.value.getBoundingClientRect()
  const { right, bottom } = props.mindMap.elRect
  left.value = leftPos + width > right ? right - width : leftPos
  top.value = topPos + height > bottom ? bottom - height : topPos
}

function onScale() {
  if (!node.value || !show.value)
    return
  const pos = node.value.getNoteContentPosition()
  if (!pos)
    return
  const { left: leftPos, top: topPos } = pos
  updateNoteContentPosition(leftPos, topPos)
}

function hideNoteContent() {
  show.value = false
}

function initEditor() {
  if (!editor.value && noteContentWrapRef.value) {
    editor.value = new Viewer({
      el: noteContentWrapRef.value,
    })
  }
}

function handleBodyClick() {
  hideNoteContent()
}

onMounted(() => {
  if (noteContentViewerRef.value) {
    props.mindMap.el.appendChild(noteContentViewerRef.value)
  }
  initEditor()

  eventBus.on('showNoteContent', onShowNoteContent)
  eventBus.on('hideNoteContent', hideNoteContent)
  document.body.addEventListener('click', handleBodyClick)
  eventBus.on('node_active', onNodeActive)
  eventBus.on('scale', onScale)
  eventBus.on('translate', onScale)
  eventBus.on('svg_mousedown', hideNoteContent)
  eventBus.on('expand_btn_click', hideNoteContent)
})

onBeforeUnmount(() => {
  eventBus.off('showNoteContent', onShowNoteContent)
  eventBus.off('hideNoteContent', hideNoteContent)
  document.body.removeEventListener('click', handleBodyClick)
  eventBus.off('node_active', onNodeActive)
  eventBus.off('scale', onScale)
  eventBus.off('translate', onScale)
  eventBus.off('svg_mousedown', hideNoteContent)
  eventBus.off('expand_btn_click', hideNoteContent)
})
</script>

<template>
  <div
    ref="noteContentViewerRef"
    class="noteContentViewer customScrollbar"
    :class="{ dark: isDark }"
    :style="{
      left: `${left}px`,
      top: `${top}px`,
      visibility: show ? 'visible' : 'hidden',
    }"
    @click.stop
    @mousedown.stop
    @mousemove.stop
    @mouseup.stop
    @wheel.stop
  >
    <div ref="noteContentWrapRef" class="noteContentWrap customScrollbar" />
  </div>
</template>

<style lang="scss" scoped>
.noteContentViewer {
  position: fixed;
  background-color: #fff;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.06);
  z-index: 2;

  &.dark {
    background-color: #262a2e;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .noteContentWrap {
    max-width: 250px;
    max-height: 300px;
    overflow-y: auto;
  }
}
</style>
