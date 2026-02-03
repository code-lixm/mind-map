<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// Props
interface Props {
  title?: string
  isDark?: boolean
}

withDefaults(defineProps<Props>(), {
  title: '',
  isDark: false,
})

// Emits
const emit = defineEmits<{
  'update:activeSidebar': [value: string | null]
}>()

// 全局 zIndex 计数器
let globalZIndex = 1000

// 注入事件总线
const eventBus = inject<any>('eventBus')

// 状态
const show = ref(false)
const zIndex = ref(0)

// Refs
const sidebarContentRef = ref<HTMLDivElement>()

// 监听 show 变化,更新 zIndex
watch(show, (val, oldVal) => {
  if (val && !oldVal) {
    zIndex.value = globalZIndex++
  }
})

// 关闭侧边栏
function handleCloseSidebar() {
  close()
}

// 关闭
function close() {
  show.value = false
  emit('update:activeSidebar', null)
}

// 获取内容元素
function getEl() {
  return sidebarContentRef.value
}

// 暴露方法给父组件
defineExpose({
  show,
  close,
  getEl,
})

// 生命周期
onMounted(() => {
  if (eventBus) {
    eventBus.on('closeSideBar', handleCloseSidebar)
  }
})

onBeforeUnmount(() => {
  if (eventBus) {
    eventBus.off('closeSideBar', handleCloseSidebar)
  }
})
</script>

<template>
  <div
    class="sidebarContainer"
    :class="{ show, isDark }"
    :style="{ zIndex }"
    @click.stop>
    <span class="closeBtn i-ep:close" @click="close" />
    <div v-if="title" class="sidebarHeader flex-start">
      {{ title }}
    </div>
    <div ref="sidebarContentRef" class="sidebarContent customScrollbar">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sidebarContainer {
  position: absolute;
  right: -300px;
  top: 100px;
  bottom: 75px;
  width: 300px;
  background-color: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;

  &.isDark {
    background-color: #262a2e;
    border-left-color: hsla(0, 0%, 100%, 0.1);

    .sidebarHeader {
      border-bottom-color: hsla(0, 0%, 100%, 0.1);
      color: rgba(255, 255, 255, 0.9);
    }

    .closeBtn {
      color: rgba(255, 255, 255, 0.5);

      &:hover {
        color: rgba(255, 255, 255, 0.7);
      }
    }
  }

  &.show {
    right: 0;
  }

  .closeBtn {
    position: absolute;
    right: 16px;
    top: 12px;
    font-size: 16px;
    color: #9ca3af;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: #6b7280;
    }
  }

  .sidebarHeader {
    width: 100%;
    height: 44px;
    padding: 0 20px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-grow: 0;
    flex-shrink: 0;
    font-size: 15px;
    font-weight: 600;
    color: #000;
  }

  .sidebarContent {
    width: 100%;
    height: 100%;
    overflow: auto;
  }
}
</style>
