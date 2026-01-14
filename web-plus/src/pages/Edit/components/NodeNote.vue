<script setup lang="ts">
import '@toast-ui/editor/dist/toastui-editor.css'
import type { EventBus, LocaleText } from '../types'
import { inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import Editor from '@toast-ui/editor'
import { isMobile } from 'simple-mind-map/src/utils/index'
import COMMON_API from '@/api/common'

const localeText = inject<LocaleText>('localeText')!
const eventBus = inject<EventBus>('eventBus')!

const dialogVisible = ref(false)
const note = ref('')
const activeNodes = ref<any[]>([])
const editor = ref<Editor | null>(null)
const isMobileValue = isMobile()
const appointNode = ref<any | null>(null)
const noteEditorRef = ref<HTMLElement | null>(null)

watch(dialogVisible, (val, oldVal) => {
  if (!val && oldVal) {
    eventBus.emit('endTextEdit')
  }
})

function handleNodeActive(_node: any, nodes: any[]) {
  activeNodes.value = nodes ? [...nodes] : []
  updateNoteInfo()
}

function updateNoteInfo() {
  if (activeNodes.value.length > 0) {
    const firstNode = activeNodes.value[0]
    note.value = firstNode.getData('note') || ''
  }
  else {
    note.value = ''
  }
}

function handleShowNodeNote(node?: any) {
  eventBus.emit('startTextEdit')
  if (node) {
    appointNode.value = node
    note.value = node.getData('note') || ''
  }
  dialogVisible.value = true
  nextTick(() => {
    initEditor()
  })
}

function initEditor() {
  if (!editor.value && noteEditorRef.value) {
    editor.value = new Editor({
      el: noteEditorRef.value,
      height: '500px',
      initialEditType: 'markdown',
      previewStyle: 'vertical',
      hooks: {
        addImageBlobHook: async (blob, callback) => {
          try {
            const formData = new FormData()
            formData.append('file', blob)
            const res = await COMMON_API.upload(formData)
            if (res && res.fileId) {
              const url = `${import.meta.env.VITE_API_BASE_URL}/foundationkit/file/download?fileId=${res.fileId}`
              callback(url, (blob as any).name || 'image')
            }
            else {
              ElMessage.error('图片上传失败: 未获取到文件ID')
            }
          }
          catch (error: any) {
            console.error(error)
            ElMessage.error(error.message || '图片上传失败')
          }
        },
      },
    })
  }
  if (editor.value) {
    editor.value.setMarkdown(note.value)
  }
}

function cancel() {
  dialogVisible.value = false
  if (appointNode.value) {
    appointNode.value = null
    updateNoteInfo()
  }
}

function confirm() {
  if (editor.value) {
    note.value = editor.value.getMarkdown()
  }
  if (appointNode.value) {
    appointNode.value.setNote(note.value)
  }
  else {
    activeNodes.value.forEach((node) => {
      node.setNote(note.value)
    })
  }

  cancel()
}

eventBus.on('node_active', handleNodeActive)
eventBus.on('showNodeNote', handleShowNodeNote)

onBeforeUnmount(() => {
  eventBus.off('node_active', handleNodeActive)
  eventBus.off('showNodeNote', handleShowNodeNote)
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    class="nodeNoteDialog"
    :title="localeText.nodeNote.title"
    :width="isMobileValue ? '90%' : '50%'"
    :top="isMobileValue ? '20px' : '15vh'"
  >
    <div ref="noteEditorRef" class="noteEditor" @keyup.stop @keydown.stop />
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="cancel">{{ localeText.dialog.cancel }}</el-button>
        <el-button type="primary" @click="confirm">
          {{ localeText.dialog.confirm }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.nodeNoteDialog {
  .tip {
    margin-top: 5px;
    color: #dcdfe6;
  }
}
</style>
