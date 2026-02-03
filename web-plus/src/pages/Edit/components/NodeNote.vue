<script setup lang="ts">
import '@toast-ui/editor/dist/i18n/zh-cn'
import '@toast-ui/editor/dist/toastui-editor.css'
import '@toast-ui/editor/dist/toastui-editor-viewer.css'
import type { EventBus, LocaleText } from '../types'
import { inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import Editor from '@toast-ui/editor'
import { isMobile } from 'simple-mind-map/src/utils/index'
import Viewer from '@toast-ui/editor/dist/toastui-editor-viewer'

interface Props {
  isReadonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReadonly: false,
})

const localeText = inject<LocaleText>('localeText')!
const eventBus = inject<EventBus>('eventBus')!

const dialogVisible = ref(false)
const note = ref('')
const activeNodes = ref<any[]>([])
const editor = ref<InstanceType<typeof Editor> | InstanceType<typeof Viewer> | null>(null)
const isMobileValue = isMobile()
const appointNode = ref<any | null>(null)
const noteEditorRef = ref<HTMLElement | null>(null)

watch(dialogVisible, (val, oldVal) => {
  if (!val && oldVal) {
    eventBus.emit('endTextEdit')
    // 销毁编辑器实例，防止内容残留
    if (editor.value) {
      editor.value.destroy()
      editor.value = null
    }
    // 清理临时状态
    appointNode.value = null
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
  else {
    appointNode.value = null
    updateNoteInfo()
  }
  dialogVisible.value = true
  nextTick(() => {
    initEditor()
  })
}

function initEditor() {
  if (!editor.value && noteEditorRef.value) {
    if (props.isReadonly) {
      editor.value = new Viewer({
        el: noteEditorRef.value,
        initialValue: note.value,
      })
    }
    else {
      editor.value = new Editor({
        el: noteEditorRef.value,
        height: '500px',
        initialEditType: 'wysiwyg',
        initialValue: note.value,
        hideModeSwitch: true,
        language: 'zh-CN',
        hooks: {
          addImageBlobHook: (blob, callback) => {
            const reader = new FileReader()
            reader.onload = () => {
              const dataUrl = reader.result as string
              callback(dataUrl, (blob as any).name || 'image')
            }
            reader.onerror = () => {
              ElMessage.error('图片读取失败')
            }
            reader.readAsDataURL(blob)
          },
        },
      })
    }
  }
  else if (editor.value) {
    nextTick(() => {
      try {
        editor.value?.setMarkdown(note.value)
      }
      catch (e) {
        console.error('NodeNote setMarkdown:', e)
      }
    })
  }
}

function cancel() {
  dialogVisible.value = false
}

function confirm() {
  if (props.isReadonly) {
    cancel()
    return
  }
  if (editor.value && editor.value instanceof Editor) {
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
        <template v-if="props.isReadonly">
          <el-button @click="cancel">{{ localeText.ai?.close || localeText.sourceCodeEdit?.close || '关闭' }}</el-button>
        </template>
        <template v-else>
          <el-button @click="cancel">{{ localeText.dialog.cancel }}</el-button>
          <el-button type="primary" @click="confirm">
            {{ localeText.dialog.confirm }}
          </el-button>
        </template>
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
