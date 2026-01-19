<script setup lang="ts">
import type { IsDark } from '../types'
import { inject, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { imgToDataUrl } from 'simple-mind-map/src/utils'
import { setImgToClipboard } from '@/utils'

interface Props {
  mindMap: any
}

const props = defineProps<Props>()

const isDark = inject<IsDark>('isDark', ref(false))
const localeText = inject<any>('localeText', {})

const nodeImgPlacementToolbarRef = ref<HTMLElement | null>(null)
const showImgPlacementToolbar = ref(false)
const style = reactive({
  left: '0px',
  top: '0px',
})
const imgPlacementList = ['top', 'bottom', 'left', 'right']
const node = ref<any>(null)
const imgNode = ref<any>(null)
const imgPlacement = ref('')

function show(nodeData: any, imgNodeData: any) {
  node.value = nodeData
  imgPlacement.value = nodeData.getStyle('imgPlacement')
  imgNode.value = imgNodeData
  showImgPlacementToolbar.value = true
  nextTick(() => {
    updatePos()
  })
}

function close() {
  showImgPlacementToolbar.value = false
  node.value = null
  imgPlacement.value = ''
  imgNode.value = null
  style.left = '0px'
  style.top = '0px'
}

function updatePos() {
  if (!imgNode.value || !nodeImgPlacementToolbarRef.value)
    return
  const {
    width,
    height,
  } = nodeImgPlacementToolbarRef.value.getBoundingClientRect()
  const { width: imgWidth, x, y } = imgNode.value.rbox()
  style.left = `${x + imgWidth / 2 - width / 2}px`
  style.top = `${y - height - 5}px`
}

function onScale() {
  updatePos()
}

function onNodeActive(activeNode: any) {
  if (activeNode === node.value) {
    return
  }
  close()
}

function updateImgPlacement(item: string) {
  imgPlacement.value = item
  node.value.setStyle('imgPlacement', item)
  close()
}

async function copyImage() {
  if (!node.value)
    return

  const imageData = node.value.getData()
  if (!imageData)
    return
  const { image } = imageData

  if (image) {
    try {
      let imageUrl = image

      // 如果图片是 smm_img_key_ 格式，从 imgMap 中获取实际的 base64 数据
      if (image.startsWith('smm_img_key_')) {
        const renderTree = props.mindMap.renderer.renderTree
        if (
          renderTree
          && renderTree.data.imgMap
          && renderTree.data.imgMap[image]
        ) {
          imageUrl = renderTree.data.imgMap[image]
        }
        else {
          ElMessage.error(
            localeText.value.contextmenu?.copyFail || '复制失败：未找到图片数据',
          )
          return
        }
      }

      // 将图片URL转换为blob并写入剪贴板
      const blob = await imgToDataUrl(imageUrl, true)
      setImgToClipboard(blob)

      // 显示成功消息
      ElMessage.success(
        localeText.value.contextmenu?.copySuccess || '复制成功',
      )
    }
    catch (error) {
      console.error('Copy image failed:', error)
      ElMessage.error(localeText.value.contextmenu?.copyFail || '复制失败')
    }
  }
}

onMounted(() => {
  if (nodeImgPlacementToolbarRef.value) {
    document.body.append(nodeImgPlacementToolbarRef.value)
  }

  props.mindMap.on('node_img_click', show)
  props.mindMap.on('draw_click', close)
  props.mindMap.on('svg_mousedown', close)
  props.mindMap.on('node_dblclick', close)
  props.mindMap.on('node_active', onNodeActive)
  props.mindMap.on('scale', onScale)
  props.mindMap.on('node_img_adjust_btn_mousedown', close)
  props.mindMap.on('delete_node_img_from_delete_btn', close)
  props.mindMap.on('translate', close)
})

onBeforeUnmount(() => {
  props.mindMap.off('node_img_click', show)
  props.mindMap.off('draw_click', close)
  props.mindMap.off('svg_mousedown', close)
  props.mindMap.off('node_dblclick', close)
  props.mindMap.off('node_active', onNodeActive)
  props.mindMap.off('scale', onScale)
  props.mindMap.off('node_img_adjust_btn_mousedown', close)
  props.mindMap.off('delete_node_img_from_delete_btn', close)
  props.mindMap.off('translate', close)
})
</script>

<template>
  <div
    v-show="showImgPlacementToolbar"
    ref="nodeImgPlacementToolbarRef"
    class="nodeImgPlacementToolbar"
    :style="style"
    :class="{ dark: isDark }"
    @click.stop.passive
  >
    <div
      v-for="item in imgPlacementList"
      :key="item"
      class="imgPlacementItem iconfont iconcontentleft"
      :class="[
        {
          selected: imgPlacement === item,
        },
        `icon_${item}`,
      ]"
      @click="updateImgPlacement(item)"
    />
    <div class="separator" />
    <div
      class="imgPlacementItem iconfont iconfuzhi"
      :title="localeText.contextmenu?.copy || '复制图片'"
      @click="copyImage"
    />
  </div>
</template>

<style lang="scss" scoped>
.nodeImgPlacementToolbar {
  position: fixed;
  z-index: 2000;
  height: 40px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  padding: 0 10px;

  &.dark {
    background: #262a2e;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .separator {
    width: 1px;
    height: 20px;
    background-color: rgba(0, 0, 0, 0.1);
    margin: 0 5px;
  }

  .imgPlacementItem {
    width: 30px;
    height: 30px;
    margin: 5px;
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;

    &:hover {
      background-color: rgb(237, 237, 237);
    }

    &.icon_top {
      transform: rotateZ(90deg);
    }

    &.icon_bottom {
      transform: rotateZ(-90deg);
    }

    &.icon_right {
      transform: rotateZ(180deg);
    }

    &.selected {
      background-color: rgb(237, 237, 237);
    }
  }

  &.dark .imgPlacementItem {
    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    &.selected {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
}
</style>
