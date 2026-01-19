<script setup lang="ts">
import type { UploadFile, UploadUserFile } from 'element-plus'
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import xmind from 'simple-mind-map/src/parse/xmind.js'
import markdown from 'simple-mind-map/src/parse/markdown.js'
import { useEditorState } from '@/composables/useEditorState'

const localeText = inject<(key: string) => string>('localeText')!
const eventBus = inject<{
  on: (event: string, handler: (...args: any[]) => void) => void
  off: (event: string, handler: (...args: any[]) => void) => void
  emit: (event: string, ...args: any[]) => void
}>('eventBus')!
const { setIsHandleLocalFile, setActiveSidebar } = useEditorState()
const route = useRoute()

const dialogVisible = ref(false)
const fileList = ref<UploadUserFile[]>([])
let selectPromiseResolve: ((value: any) => void) | null = null
const xmindCanvasSelectDialogVisible = ref(false)
const selectCanvas = ref(0)
const canvasList = ref<any[]>([])

// 文件大小限制：100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024

const supportFileStr = computed(() => {
  // 注释掉:移除 .smm 格式支持
  return '.json,.xmind,.md' // 原来是 '.smm,.json,.xmind,.md'
})

watch(dialogVisible, (val, oldVal) => {
  if (!val && oldVal) {
    fileList.value = []
  }
})

onMounted(() => {
  eventBus.on('showImport', handleShowImport)
  eventBus.on('handle_file_url', handleFileURL)
  eventBus.on('importFile', handleImportFile)
})

onBeforeUnmount(() => {
  eventBus.off('showImport', handleShowImport)
  eventBus.off('handle_file_url', handleFileURL)
  eventBus.off('importFile', handleImportFile)
})

function handleShowImport() {
  dialogVisible.value = true
}

function getRegexp() {
  // 注释掉:移除 .smm 格式支持
  return /\.(?:json|xmind|md)$/ // 原来是 /\.(?:smm|json|xmind|md)$/
}

// 检查url中是否操作需要打开的文件
async function handleFileURL() {
  try {
    const fileURL = route.query.fileURL as string
    if (!fileURL)
      return
    const match = getRegexp().exec(fileURL)
    if (!match) {
      return
    }
    const type = match[1]
    const res = await fetch(fileURL)
    const file = await res.blob()
    const data: UploadFile = {
      name: fileURL.split('/').pop() || 'file',
      raw: file as any,
      uid: Date.now(),
      status: 'success',
    }
    // 注释掉:移除 .smm 格式支持
    if (type === 'json') { // 原来是 type === 'smm' || type === 'json'
      handleSmm(data)
    }
    else if (type === 'xmind') {
      handleXmind(data)
    }
    else if (type === 'md') {
      handleMd(data)
    }
  }
  catch (error) {
    console.log(error)
  }
}

// 上传前的验证
function beforeUpload(file: File) {
  // 验证文件类型
  const fileName = file.name
  if (!fileName || !getRegexp().test(fileName)) {
    ElMessage.error(
      localeText('import.pleaseSelect')
      + supportFileStr.value
      + localeText('import.file'),
    )
    return false
  }

  // 验证文件大小
  if (file.size > MAX_FILE_SIZE) {
    ElMessage.error(`文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    return false
  }

  return true
}

// 文件选择
function onChange(file: UploadFile) {
  // 验证文件类型
  if (!file.name || !getRegexp().test(file.name)) {
    ElMessage.error(
      localeText('import.pleaseSelect')
      + supportFileStr.value
      + localeText('import.file'),
    )
    fileList.value = []
    return
  }

  // 验证文件大小
  if (file.size && file.size > MAX_FILE_SIZE) {
    ElMessage.error(`文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    fileList.value = []
    return
  }

  fileList.value.push(file)
}

// 移除文件
function onRemove(file: UploadFile, _fileList: UploadFile[]) {
  fileList.value = _fileList
}

// 数量超出限制
function onExceed() {
  ElMessage.error(localeText('import.maxFileNum'))
}

// 取消
function cancel() {
  dialogVisible.value = false
}

// 确定
function confirm() {
  if (fileList.value.length <= 0) {
    return ElMessage.error(localeText('import.notSelectTip'))
  }
  setIsHandleLocalFile(false)
  const file = fileList.value[0] as UploadFile
  if (!file.name)
    return
  // 注释掉:移除 .smm 格式支持
  if (/\.json$/.test(file.name)) { // 原来是 /\.(?:smm|json)$/
    handleSmm(file)
  }
  else if (/\.xmind$/.test(file.name)) {
    handleXmind(file)
  }
  else if (/\.md$/.test(file.name)) {
    handleMd(file)
  }
  cancel()
  setActiveSidebar('')
}

// 注释掉:原来处理 .smm 文件，现在只处理 JSON 文件
function handleSmm(file: UploadFile) {
  if (!file.raw)
    return
  const fileReader = new FileReader()
  fileReader.readAsText(file.raw)
  fileReader.onload = (evt: ProgressEvent<FileReader>) => {
    try {
      const result = evt.target?.result
      if (typeof result !== 'string') {
        throw new TypeError(localeText('import.fileContentError'))
      }
      const data = JSON.parse(result)
      if (typeof data !== 'object' || data === null) {
        throw new TypeError(localeText('import.fileContentError'))
      }
      eventBus.emit('setData', data)
      ElMessage.success(localeText('import.importSuccess'))
    }
    catch (error) {
      console.log(error)
      ElMessage.error(localeText('import.fileParsingFailed'))
    }
  }
}

// 处理.xmind文件
async function handleXmind(file: UploadFile) {
  if (!file.raw)
    return
  try {
    const data = await xmind.parseXmindFile(file.raw, (content: any) => {
      showSelectXmindCanvasDialog(content)
      return new Promise((resolve) => {
        selectPromiseResolve = resolve
      })
    })
    eventBus.emit('setData', data, 'xmind')
    ElMessage.success(localeText('import.importSuccess'))
  }
  catch (error) {
    console.log(error)
    ElMessage.error(localeText('import.fileParsingFailed'))
  }
}

// 显示xmind文件的多个画布选择弹窗
function showSelectXmindCanvasDialog(content: any) {
  canvasList.value = content
  selectCanvas.value = 0
  xmindCanvasSelectDialogVisible.value = true
}

// 确认导入指定的画布
function confirmSelect() {
  if (selectPromiseResolve) {
    selectPromiseResolve(canvasList.value[selectCanvas.value])
  }
  xmindCanvasSelectDialogVisible.value = false
  canvasList.value = []
  selectCanvas.value = 0
}

// 处理markdown文件
async function handleMd(file: UploadFile) {
  if (!file.raw)
    return
  const fileReader = new FileReader()
  fileReader.readAsText(file.raw)
  fileReader.onload = async (evt: ProgressEvent<FileReader>) => {
    try {
      const result = evt.target?.result
      if (typeof result !== 'string') {
        throw new TypeError(localeText('import.fileContentError'))
      }
      const data = markdown.transformMarkdownTo(result)
      eventBus.emit('setData', data)
      ElMessage.success(localeText('import.importSuccess'))
    }
    catch (error) {
      console.log(error)
      ElMessage.error(localeText('import.fileParsingFailed'))
    }
  }
}

// 导入指定文件
function handleImportFile(file: File) {
  onChange({
    name: file.name,
    raw: file as any,
    uid: Date.now(),
    status: 'success',
  })
  if (fileList.value.length <= 0)
    return
  confirm()
}

// 暴露方法给父组件调用
defineExpose({
  onChange,
  confirm,
})
</script>

<template>
  <div>
    <el-dialog
      v-model="dialogVisible"
      class="nodeImportDialog"
      :title="localeText('import.title')"
    >
      <el-upload
        drag
        :accept="supportFileStr"
        :file-list="fileList"
        :auto-upload="false"
        :multiple="false"
        :before-upload="beforeUpload"
        :on-change="onChange"
        :on-remove="onRemove"
        :limit="1"
        :on-exceed="onExceed"
      >
        <el-icon class="el-icon--upload">
          <UploadFilled />
        </el-icon>
        <div class="el-upload__text">
          {{ localeText('import.dragOrClick') }}
        </div>
        <template #tip>
          <div class="el-upload__tip">
            {{ localeText('import.support') }}{{ supportFileStr }}{{ localeText('import.file') }}，文件大小不超过 {{ MAX_FILE_SIZE / 1024 / 1024 }}MB
          </div>
        </template>
      </el-upload>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancel">{{ localeText('dialog.cancel') }}</el-button>
          <el-button type="primary" @click="confirm">{{
            localeText('dialog.confirm')
          }}</el-button>
        </span>
      </template>
    </el-dialog>
    <el-dialog
      v-model="xmindCanvasSelectDialogVisible"
      class="xmindCanvasSelectDialog"
      :title="localeText('import.xmindCanvasSelectDialogTitle')"
      width="300px"
      :show-close="false"
    >
      <el-radio-group v-model="selectCanvas" class="canvasList">
        <el-radio
          v-for="(item, index) in canvasList"
          :key="index"
          :value="index"
        >
          {{ item.title }}
        </el-radio>
      </el-radio-group>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="confirmSelect">{{
            localeText('dialog.confirm')
          }}</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.xmindCanvasSelectDialog {
  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 400px;
    overflow-y: auto;
  }
}

.canvasList {
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: flex-start;

  :deep(.el-radio) {
    margin-bottom: 12px;
    margin-right: 0;
    height: auto;
    white-space: normal;
    align-items: flex-start;

    &:last-of-type {
      margin-bottom: 0;
    }

    .el-radio__label {
      white-space: normal;
      word-break: break-all;
      line-height: 1.5;
    }

    .el-radio__input {
      margin-top: 2px;
    }
  }
}
</style>
