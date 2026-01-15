<script setup lang="ts">
import '@toast-ui/editor/dist/toastui-editor-viewer.css'
import type { EventBus, LocaleText } from '../types'
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Viewer from '@toast-ui/editor/dist/toastui-editor-viewer'
import Sidebar from './Sidebar.vue'
import { useEditorState } from '@/composables/useEditorState'

interface Props {
  mindMap: any
}

const props = defineProps<Props>()

const localeText = inject<LocaleText>('localeText')!
const eventBus = inject<EventBus>('eventBus')!

const editorStore = useEditorState()

const sidebarRef = ref<InstanceType<typeof Sidebar> | null>(null)
const noteContentWrapRef = ref<HTMLElement | null>(null)
const editor = ref<Viewer | null>(null)
const node = ref<any | null>(null)
const activeSidebar = ref<string | null>(null)

watch(activeSidebar, (val) => {
  if (sidebarRef.value) {
    if (val === 'noteSidebar') {
      sidebarRef.value.show = true
    }
    else {
      sidebarRef.value.show = false
    }
  }
})

function onNodeActive(_node: any, nodes: any[]) {
  if (activeSidebar.value !== 'noteSidebar') {
    return
  }
  const nodeList = nodes ? [...nodes] : []
  if (nodeList.length > 0) {
    if (nodeList[0] !== node.value) {
      setActiveSidebar(null)
    }
  }
  else {
    setActiveSidebar(null)
  }
}

function initEditor() {
  if (!editor.value && noteContentWrapRef.value) {
    editor.value = new Viewer({
      el: noteContentWrapRef.value,
    })
  }
}

function onNodeNoteClick(nodeData: any) {
  node.value = nodeData
  setActiveSidebar('noteSidebar')
  if (editor.value) {
    ;(editor.value as any).setMarkdown(nodeData.getData('note'))
  }
}

function setActiveSidebar(value: string | null) {
  activeSidebar.value = value
  editorStore.setActiveSidebar(value)
}

// 处理Sidebar关闭事件
function handleUpdateActiveSidebar(value: string | null) {
  setActiveSidebar(value)
}

onMounted(() => {
  initEditor()

  eventBus.on('node_active', onNodeActive)
  props.mindMap.on('node_note_click', onNodeNoteClick)
})

onBeforeUnmount(() => {
  eventBus.off('node_active', onNodeActive)
  props.mindMap.off('node_note_click', onNodeNoteClick)
})
</script>

<template>
  <Sidebar
    ref="sidebarRef"
    :title="localeText.note.title"
    @update:active-sidebar="handleUpdateActiveSidebar"
  >
    <div ref="noteContentWrapRef" class="noteContentWrap" />
  </Sidebar>
</template>

<style lang="scss" scoped>
.noteContentWrap {
  padding: 12px 20px;
}
</style>
