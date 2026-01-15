<script setup lang="ts">
import type { UploadFile, UploadInstance, UploadRawFile, UploadRequestOptions } from 'element-plus'
import { computed, inject, ref, watch } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, genFileId } from 'element-plus'
import COMMON_API from '@/api/common'

// Props & Emits
interface FileInfo {
  fileId: string
  fileName: string
  fileSize?: string
  fileType?: string
  createTime?: string
  uploadTime?: string
  digestCode?: string
}

interface Props {
  modelValue?: FileInfo | null
  accept?: string
  maxSize?: number // MB
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  accept: '.jpeg,.jpg,.png',
  maxSize: 10,
})

const emit = defineEmits<{
  'update:modelValue': [value: FileInfo | null]
}>()

const localeText = inject<(key: string) => string>('localeText')!

// 根据文件ID生成图片URL的函数
function getImageSrc(fileId: string | undefined) {
  if (!fileId)
    return ''
  const isBase64 = /^data:image/
  const isHttp = /^https?:\/\//i
  const isAbsolute = /^\//
  if (isBase64.test(fileId) || isHttp.test(fileId) || isAbsolute.test(fileId)) {
    return fileId
  }
  else {
    return `${import.meta.env.VITE_API_BASE_URL}/foundationkit/file/download?fileId=${fileId}`
  }
}

// 文件列表
const fileList = ref<any[]>([])

// 计算所有图片的预览URL列表
const previewSrcList = computed(() => {
  return fileList.value.length ? fileList.value.map(file => file.url || '').filter(url => url) : []
})

// 获取图片在预览列表中的初始索引
function getInitialIndex(url: string) {
  return previewSrcList.value.indexOf(url)
}

// 格式化支持的文件类型显示
function formatSupportedTypes(types: string) {
  return types
    .split(',')
    .map(t => t.trim().replace(/^\./, '').toUpperCase())
    .filter(t => t)
    .join('、')
}

// 监听modelValue变化，同步到fileList
watch(
  () => props.modelValue,
  (v) => {
    if (!v || !v.fileId) {
      fileList.value = []
      return
    }

    const newFileList = [{
      name: v.fileName || 'image',
      url: getImageSrc(v.fileId),
      uid: `${v.fileId}-${Date.now()}`,
      status: 'success',
    }]

    // 只有当内容不同时才更新，避免不必要的重渲染
    if (JSON.stringify(newFileList) !== JSON.stringify(fileList.value)) {
      fileList.value = newFileList
    }
  },
  { immediate: true, deep: true },
)

// 移除指定文件
function removeFile(file: UploadFile) {
  const index = fileList.value.findIndex(item => item.uid === file.uid)
  if (index > -1) {
    fileList.value.splice(index, 1)
    emit('update:modelValue', null)
  }
}

const uploadRef = ref<UploadInstance>()

// 超出文件数量限制时的处理
function handleExceed(files: File[]) {
  ElMessageBox.confirm(
    '',
    '最多只能上传1张图片，继续上传会替换已上传的文件，确定继续吗？',
    {
      type: 'warning',
      confirmButtonText: '继续',
      cancelButtonText: '取消',
    },
  ).then(() => {
    uploadRef.value?.clearFiles()
    const file = files[0]
    ;(file as any).uid = genFileId()
    uploadRef.value?.handleStart(file as any)
    uploadRef.value?.submit()
  })
}

// 上传成功
function handleUploadSuccess(res: any) {
  if (!res)
    return

  const { fileName, fileId, fileSize, fileType, createTime, uploadTime, digestCode } = res
  const newFile = {
    name: fileName || `file-${Date.now()}`,
    url: getImageSrc(fileId),
    uid: `${fileId}-${Date.now()}`,
    status: 'success',
  }

  // 替换文件列表
  fileList.value = [newFile]

  // 构造文件信息对象
  const fileInfo: FileInfo = {
    createTime: createTime || new Date().toLocaleString(),
    digestCode: digestCode || '',
    fileId,
    fileName: fileName || '',
    fileSize: fileSize || '',
    fileType: fileType || '',
    uploadTime: uploadTime || new Date().toLocaleString(),
  }

  // 更新modelValue
  emit('update:modelValue', fileInfo)
  ElMessage.success('上传成功')
}

// 上传前验证
function beforeUpload(file: UploadRawFile) {
  // 检查文件类型
  const acceptType = props.accept
  const fileExtension = file.name.split('.').pop()?.toLowerCase()

  if (fileExtension && !acceptType.includes(fileExtension) && !acceptType.includes(`.${fileExtension}`)) {
    // 格式化支持的文件类型显示
    const supportedTypes = formatSupportedTypes(acceptType)
    ElMessage.error(`仅支持${supportedTypes}格式，请重新上传`)
    return false
  }

  // 检查文件大小
  if (props.maxSize) {
    const maxSizeMB = props.maxSize
    const maxSizeBytes = maxSizeMB * 1024 * 1024 // 转换为字节

    if (file.size > maxSizeBytes) {
      ElMessage.error(`文件大小不能超过${maxSizeMB}MB`)
      return false
    }
  }
  return true
}

// 处理上传
async function handleHttpRequest({ file, onSuccess, onError }: UploadRequestOptions) {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await COMMON_API.upload(formData)
    if (res) {
      onSuccess(res)
    }
  }
  catch (error: any) {
    onError(error)
    ElMessage.error(error.message || '文件上传失败')
  }
}

// 获取图片大小
function getSize(): Promise<{ width: number, height: number }> {
  return new Promise((resolve) => {
    if (!props.modelValue?.fileId) {
      resolve({ width: 0, height: 0 })
      return
    }
    const img = new Image()
    img.src = getImageSrc(props.modelValue.fileId)
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      })
    }
    img.onerror = () => {
      resolve({
        width: 0,
        height: 0,
      })
    }
  })
}

// 暴露方法供父组件调用
defineExpose({
  getSize,
})
</script>

<template>
  <div class="imgUploadContainer">
    <el-upload
      ref="uploadRef"
      drag
      :accept="props.accept"
      :file-list="fileList"
      :limit="1"
      name="file"
      with-credentials
      list-type="picture"
      :show-file-list="true"
      :http-request="handleHttpRequest"
      :before-upload="beforeUpload"
      :on-exceed="handleExceed"
      :on-success="handleUploadSuccess"
    >
      <el-icon class="el-icon--upload">
        <UploadFilled />
      </el-icon>
      <div class="el-upload__text">
        {{ localeText('import.dragOrClick') }}
      </div>
      <template #tip>
        <div class="el-upload__tip">
          支持{{ formatSupportedTypes(props.accept) }}格式，文件大小不超过{{ props.maxSize }}MB
        </div>
      </template>
      <template #file="{ file }">
        <div v-if="previewSrcList.length && file.url" class="image-container">
          <el-image
            class="upload-image"
            :src="file.url"
            :preview-src-list="previewSrcList"
            :preview-teleported="true"
            :initial-index="getInitialIndex(file.url)"
            fit="contain"
          />
        </div>
        <div
          class="corner"
          title="删除"
          @click.stop="removeFile(file)"
        >
          ×
        </div>
      </template>
    </el-upload>
  </div>
</template>

<style lang="scss" scoped>
.imgUploadContainer {
  width: 100%;

  .image-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .upload-image {
    width: 100%;
    height: 100%;

    :deep(img) {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .corner {
    position: absolute;
    top: 0;
    right: 0;
    width: 20px;
    height: 20px;
    border-radius: 0 0 0 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.5);
    color: #fff;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    transition: background-color 0.2s;
    z-index: 10;

    &:hover {
      background-color: #ff4d4f;
    }
  }

  :deep(.el-upload-list__item) {
    width: 100%;
    height: 200px;
    margin: 0;
    padding: 0;
    border: 1px dashed var(--el-border-color);
    border-radius: 6px;
    transition: all 0.2s;

    &:hover {
      border-color: var(--el-color-primary);
    }
  }

  :deep(.el-upload-dragger) {
    padding: 20px;
  }
}
</style>
