<script setup lang="ts">
import type { EventBus, LocaleText } from '../types'
import { inject, onBeforeUnmount, ref, watch } from 'vue'
import { getImageSize, isMobile } from 'simple-mind-map/src/utils/index'
import ImgUpload from './ImgUpload.vue'

// FileInfo 接口定义
interface FileInfo {
  fileId: string
  fileName: string
  fileSize?: string
  fileType?: string
  createTime?: string
  uploadTime?: string
  digestCode?: string
}

const localeText = inject<LocaleText>('localeText')!
const eventBus = inject<EventBus>('eventBus')!

const dialogVisible = ref(false)
const img = ref<FileInfo | null>(null)
const imgUrl = ref('')
const imgTitle = ref('')
const activeNodes = ref<any[]>([])
const imgUploadRef = ref<InstanceType<typeof ImgUpload> | null>(null)
const isMobileValue = isMobile()
const imageLoadError = ref(false)

// 根据 fileId 生成图片 URL
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

// 监听 imgUrl 变化，重置错误状态
watch(imgUrl, () => {
  imageLoadError.value = false
})

function handleNodeActive(_node: any, nodes: any[]) {
  activeNodes.value = nodes ? [...nodes] : []
}

function handleShowNodeImage() {
  console.log('[NodeImage] showNodeImage event triggered')
  reset()
  if (activeNodes.value.length > 0) {
    const firstNode = activeNodes.value[0]
    // 获取图片数据对象
    const imageData = firstNode.getData('image') || firstNode.getData('imageData')
    if (imageData) {
      const nodeImg = imageData.url || ''
      // 过滤掉 'none' 值
      if (nodeImg && nodeImg !== 'none') {
        if (/^https?:\/\//.test(nodeImg)) {
          // 如果是 http(s) URL，放到方式二的 imgUrl 中
          imgUrl.value = nodeImg
        }
        else {
          // 否则作为 fileId，构造 FileInfo 对象
          img.value = {
            fileId: nodeImg,
            fileName: imageData.title || 'image',
          }
        }
      }
      // 获取图片标题
      imgTitle.value = imageData.title || ''
    }
  }
  dialogVisible.value = true
  console.log('[NodeImage] dialogVisible set to true')
}

function cancel() {
  dialogVisible.value = false
  reset()
}

function reset() {
  img.value = null
  imgTitle.value = ''
  imgUrl.value = ''
  imageLoadError.value = false
}

function handleImageError() {
  imageLoadError.value = true
}

async function confirm() {
  try {
    // 删除图片
    if (!img.value && !imgUrl.value) {
      cancel()
      activeNodes.value.forEach((node) => {
        node.setImage(null)
      })
      return
    }
    let res: { width?: number, height?: number } | null = null
    let imageUrl = ''

    if (img.value?.fileId) {
      // 从 FileInfo 对象获取 fileId 并构建完整的图片 URL
      imageUrl = getImageSrc(img.value.fileId)
      res = await imgUploadRef.value?.getSize() || null
    }
    else if (imgUrl.value) {
      imageUrl = imgUrl.value
      res = await getImageSize(imageUrl)
    }

    activeNodes.value.forEach((node) => {
      node.setImage({
        // 使用 getImageSrc 处理后的完整图片地址
        url: imageUrl || 'none',
        title: imgTitle.value,
        width: res?.width || 100,
        height: res?.height || 100,
      })
    })
    cancel()
  }
  catch (error) {
    console.log(error)
  }
}

eventBus.on('node_active', handleNodeActive)
eventBus.on('showNodeImage', handleShowNodeImage)

onBeforeUnmount(() => {
  eventBus.off('node_active', handleNodeActive)
  eventBus.off('showNodeImage', handleShowNodeImage)
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    class="nodeImageDialog"
    :title="localeText.nodeImage.title"
    :width="isMobileValue ? '90%' : '600px'"
    :top="isMobileValue ? '20px' : '15vh'"
    append-to-body
  >
    <div class="title">
      方式一
    </div>
    <ImgUpload
      ref="imgUploadRef"
      v-model="img"
      style="margin-bottom: 12px;"
    />
    <div class="title">
      方式二
    </div>
    <div class="inputBox">
      <span class="label">请输入图片地址</span>
      <el-popover
        placement="top"
        :width="200"
        trigger="focus"
      >
        <template #reference>
          <el-input
            v-model="imgUrl"
            size="small"
            placeholder="请输入图片地址"
            @keydown.stop
          />
        </template>
        <div v-if="imgUrl" style="text-align: center;">
          <img :src="imgUrl" style="max-width: 100%; max-height: 150px;" @error="handleImageError">
          <div v-if="imageLoadError" style="color: #f56c6c; margin-top: 8px; font-size: 12px;">
            图片加载失败
          </div>
        </div>
        <div v-else style="text-align: center; color: #909399; font-size: 12px;">
          输入图片地址后预览
        </div>
      </el-popover>
    </div>
    <div class="title">
      可选
    </div>
    <div class="inputBox">
      <span class="label">{{ localeText.nodeImage.imgTitle }}</span>
      <el-input
        v-model="imgTitle"
        size="small"
        @keydown.stop
      />
    </div>
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
.nodeImageDialog {
  .title {
    font-size: 18px;
    margin-bottom: 12px;
  }

  .inputBox {
    display: flex;
    align-items: center;
    margin-bottom: 10px;

    .label {
      width: 150px;
    }
  }
}
</style>
