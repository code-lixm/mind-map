<template>
  <Transition name="slide-up">
    <div
      v-if="showButton"
      class="back-to-view-container"
      :class="{ isDark: isDark }"
    >
      <el-tooltip
        effect="dark"
        :content="localeText?.backToView?.buttonText || '回到视图'"
        placement="top"
      >
        <div class="btn" @click="handleBackToView">
          <span class="text">{{ localeText?.backToView?.buttonText || '回到视图' }}</span>
        </div>
      </el-tooltip>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, inject, watch } from 'vue'
import type { MindMapInstance, ViewportVisibility } from '@/types/mind-map'

// Props
const props = defineProps<{
  mindMap: MindMapInstance | null
  isDark?: boolean
}>()

// Inject locale text
const localeText = inject<any>('localeText', null)

// 是否显示按钮
const showButton = ref(false)

// 当前可见性状态
const visibility = ref<ViewportVisibility | null>(null)

// 处理视口变化事件
function handleViewportChange(visibilityInfo: ViewportVisibility) {
  visibility.value = visibilityInfo
  // 当根节点不可见时显示按钮
  showButton.value = !visibilityInfo.rootVisible
}

// 点击回到视图 - 使用 setRootNodeCenter 方法
function handleBackToView() {
  if (props.mindMap?.renderer?.setRootNodeCenter) {
    props.mindMap.renderer.setRootNodeCenter()
  } else if (props.mindMap?.view?.reset) {
    props.mindMap.view.reset()
  }
}

// 启用视口检测器并绑定事件
function enableViewportDetector() {
  if (!props.mindMap) return

  // 启用视口检测插件
  if (props.mindMap.viewportDetector) {
    props.mindMap.viewportDetector.enable()
  }

  // 监听视口变化事件
  props.mindMap.on('viewport_change', handleViewportChange)
}

// 禁用视口检测器并解绑事件
function disableViewportDetector() {
  if (!props.mindMap) return

  // 解绑事件
  props.mindMap.off('viewport_change', handleViewportChange)

  // 禁用视口检测插件
  if (props.mindMap.viewportDetector) {
    props.mindMap.viewportDetector.disable()
  }
}

// 监听 mindMap 变化
watch(
  () => props.mindMap,
  (newVal, oldVal) => {
    if (oldVal) {
      disableViewportDetector()
    }
    if (newVal) {
      enableViewportDetector()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  disableViewportDetector()
})

// 暴露方法供外部调用
defineExpose({
  enable: enableViewportDetector,
  disable: disableViewportDetector,
  isVisible: () => showButton.value,
  getVisibility: () => visibility.value
})
</script>

<style lang="scss" scoped>
.back-to-view-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999;
  background: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 6px 8px;

  &.isDark {
    background: #262a2e;
    border-color: transparent;

    .btn {
      color: hsla(0, 0%, 100%, 0.9);

      &:hover {
        color: var(--el-color-primary);
      }
    }
  }

  .btn {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    color: rgba(26, 26, 26, 0.8);
    font-size: 14px;
    white-space: nowrap;

    &:hover {
      color: var(--el-color-primary);
    }

    .icon {
      font-size: 18px;
    }

    .text {
      font-size: 13px;
    }
  }
}

// 过渡动画
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
