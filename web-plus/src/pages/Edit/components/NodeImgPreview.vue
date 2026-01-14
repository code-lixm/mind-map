<script setup lang="ts">
import 'viewerjs/dist/viewer.css'
import type { EventBus } from '../types'
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { component as Viewer, api as viewerApi } from 'v-viewer'
import { useEditorState } from '../composables/useEditorState'

interface Props {
  mindMap: any
}

defineOptions({
  components: {
    Viewer,
  },
})

const props = defineProps<Props>()

const eventBus = inject<EventBus>('eventBus')!
const editorStore = useEditorState()
const images = ref<string[]>([])

function onNodeImgDblclick(node: any, e: MouseEvent) {
  e.stopPropagation()
  e.preventDefault()

  // 在编辑模式下（非只读），触发图片编辑对话框
  if (!editorStore.state.isReadonly) {
    eventBus.emit('showNodeImage')
    return
  }

  // 在预览模式下（只读），显示图片预览
  images.value = [node.getImageUrl()]
  viewerApi({
    images: images.value,
  })
}

onMounted(() => {
  props.mindMap.on('node_img_dblclick', onNodeImgDblclick)
})

onBeforeUnmount(() => {
  props.mindMap.off('node_img_dblclick', onNodeImgDblclick)
})
</script>

<template>
  <Viewer :images="images">
    <img v-for="src in images" :key="src" :src="src">
  </Viewer>
</template>

<style scoped></style>
