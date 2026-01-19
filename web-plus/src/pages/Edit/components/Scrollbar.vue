<script setup lang="ts">
import type { EventBus, MindMapInstance } from '../types'
import { inject, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

// Props
interface Props {
  mindMap?: MindMapInstance
  isDark?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mindMap: undefined,
  isDark: false,
})

// 注入事件总线
const eventBus = inject<EventBus>('eventBus')

// 状态
interface ScrollbarStyle {
  top?: string
  left?: string
  width?: string
  height?: string
}

const verticalScrollbarStyle = ref<ScrollbarStyle>({})
const horizontalScrollbarStyle = ref<ScrollbarStyle>({})

// Refs
const verticalScrollbarRef = ref<HTMLDivElement>()
const horizontalScrollbarRef = ref<HTMLDivElement>()

// 定时器
let resizeTimer: ReturnType<typeof setTimeout> | null = null

// 向插件传递滚动条宽高数据
function setScrollBarWrapSize() {
  if (!props.mindMap?.scrollbar)
    return
  if (!horizontalScrollbarRef.value || !verticalScrollbarRef.value)
    return

  const { width } = horizontalScrollbarRef.value.getBoundingClientRect()
  const { height } = verticalScrollbarRef.value.getBoundingClientRect()
  props.mindMap.scrollbar.setScrollBarWrapSize(width, height)
  props.mindMap.scrollbar.updateScrollbar?.()
}

// 窗口尺寸变化
function onResize() {
  if (resizeTimer)
    clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    setScrollBarWrapSize()
  }, 300)
}

// 调用插件方法更新滚动条位置和大小
interface ScrollbarChangeData {
  vertical: {
    top: number
    height: number
  }
  horizontal: {
    left: number
    width: number
  }
}

function updateScrollbar(data: ScrollbarChangeData) {
  const { vertical, horizontal } = data
  verticalScrollbarStyle.value = {
    top: `${vertical.top}%`,
    height: `${vertical.height}%`,
  }
  horizontalScrollbarStyle.value = {
    left: `${horizontal.left}%`,
    width: `${horizontal.width}%`,
  }
}

// 垂直滚动条按下事件调用插件方法
function onVerticalScrollbarMousedown(e: MouseEvent) {
  props.mindMap?.scrollbar.onMousedown(e, 'vertical')
}

// 垂直滚动条点击事件调用插件方法
function onVerticalScrollbarClick(e: MouseEvent) {
  props.mindMap?.scrollbar.onClick(e, 'vertical')
}

// 水平滚动条按下事件调用插件方法
function onHorizontalScrollbarMousedown(e: MouseEvent) {
  props.mindMap?.scrollbar.onMousedown(e, 'horizontal')
}

// 水平滚动条点击事件调用插件方法
function onHorizontalScrollbarClick(e: MouseEvent) {
  props.mindMap?.scrollbar.onClick(e, 'horizontal')
}

// 生命周期
onMounted(async () => {
  if (eventBus) {
    eventBus.on('scrollbar_change', updateScrollbar)
  }
  await nextTick()
  setScrollBarWrapSize()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  if (eventBus) {
    eventBus.off('scrollbar_change', updateScrollbar)
  }
  window.removeEventListener('resize', onResize)
  if (resizeTimer) {
    clearTimeout(resizeTimer)
  }
})
</script>

<template>
  <div class="scrollbarContainer" :class="{ isDark }">
    <!-- 竖向 -->
    <div
      ref="verticalScrollbarRef"
      class="scrollbar verticalScrollbar"
      @click="onVerticalScrollbarClick"
    >
      <div
        class="scrollbarInner"
        :style="verticalScrollbarStyle"
        @click.stop
        @mousedown="onVerticalScrollbarMousedown"
      />
    </div>
    <!-- 横向 -->
    <div
      ref="horizontalScrollbarRef"
      class="scrollbar horizontalScrollbar"
      @click="onHorizontalScrollbarClick"
    >
      <div
        class="scrollbarInner"
        :style="horizontalScrollbarStyle"
        @click.stop
        @mousedown="onHorizontalScrollbarMousedown"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.scrollbarContainer {
  &.isDark {
    .scrollbar {
      background-color: #363b3f;

      .scrollbarInner {
        background-color: rgba(0, 0, 0, 0.3);
      }
    }
  }

  .scrollbar {
    position: absolute;
    background-color: #f5f5f5;
    border-radius: 10px;
    overflow: hidden;

    &.verticalScrollbar {
      width: 10px;
      top: 100px;
      bottom: 100px;
      left: 20px;

      .scrollbarInner {
        width: 10px;
        left: 0;
      }
    }

    &.horizontalScrollbar {
      height: 10px;
      left: 100px;
      right: 100px;
      bottom: 70px;

      .scrollbarInner {
        height: 10px;
        top: 0;
      }
    }

    .scrollbarInner {
      position: absolute;
      background-color: #ccc;
      border-radius: 10px;
    }
  }
}
</style>
