<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { sidebarTriggerList } from '@/config'

// Props
interface Props {
  isDark?: boolean
  activeSidebar?: string | null
  isReadonly?: boolean
  enableAi?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isDark: false,
  activeSidebar: null,
  isReadonly: false,
  enableAi: true,
})

// Emits
const emit = defineEmits<{
  'update:activeSidebar': [value: string | null]
}>()

// 状态
const show = ref(true)
const maxHeight = ref(0)

// 计算触发器列表 (使用中文配置)
const triggerList = computed(() => {
  // 直接使用中文配置
  let list = [...sidebarTriggerList]

  // 只读模式下只显示部分功能
  if (props.isReadonly) {
    list = list.filter(item => ['outline', 'shortcutKey', 'ai'].includes(item.value))
  }

  // AI 功能禁用时过滤
  if (!props.enableAi) {
    list = list.filter(item => item.value !== 'ai')
  }

  return list
})

// 监听只读模式变化
watch(
  () => props.isReadonly,
  (val) => {
    if (val) {
      emit('update:activeSidebar', null)
    }
  },
)

// 触发侧边栏切换
function trigger(item: { value: string, name: string, icon: string }) {
  // 如果当前已经激活该侧边栏，则关闭；否则打开
  const newValue = props.activeSidebar === item.value ? null : item.value
  emit('update:activeSidebar', newValue)
}

// 窗口大小变化处理
function onResize() {
  updateSize()
}

// 更新容器高度
function updateSize() {
  const topMargin = 110
  const bottomMargin = 80
  maxHeight.value = window.innerHeight - topMargin - bottomMargin
}

// 生命周期
onMounted(() => {
  window.addEventListener('resize', onResize)
  updateSize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div
    class="sidebarTriggerContainer"
    :class="{ hasActive: show && activeSidebar, show, isDark }"
    :style="{ maxHeight: `${maxHeight}px` }"
    @click.stop
  >
    <div class="toggleShowBtn" :class="{ hide: !show }" @click="show = !show">
      <span class="iconfont iconjiantouyou" />
    </div>
    <div class="trigger customScrollbar">
      <div
        v-for="item in triggerList"
        :key="item.value"
        class="triggerItem"
        :class="{ active: activeSidebar === item.value }"
        @click="trigger(item)"
      >
        <div class="triggerIcon iconfont" :class="[item.icon]" />
        <div class="triggerName">
          {{ item.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sidebarTriggerContainer {
  position: absolute;
  right: -60px;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  justify-content: center;
  top: 50%;
  transform: translateY(-50%);

  &.isDark {
    .trigger {
      background-color: #262a2e;

      .triggerItem {
        color: hsla(0, 0%, 100%, 0.6);

        &:hover {
          background-color: var(--el-color-primary);
          color: #fff;
        }
      }
    }
  }

  &.show {
    right: 0;
  }

  &.hasActive {
    right: 305px;
  }

  .toggleShowBtn {
    position: absolute;
    left: -6px;
    width: 35px;
    height: 60px;
    background: var(--el-color-primary);
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    transition: left 0.1s linear;
    z-index: 0;
    border-top-left-radius: 10px;
    border-bottom-left-radius: 10px;
    display: flex;
    align-items: center;
    padding-left: 4px;

    &.hide {
      left: -8px;

      span {
        transform: rotateZ(180deg);
      }
    }

    &:hover {
      left: -18px;
    }

    span {
      color: #fff;
      transition: all 0.1s;
    }
  }

  .trigger {
    position: relative;
    width: 60px;
    border-color: #eee;
    background-color: #fff;
    box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
    border-radius: 6px;
    max-height: 100%;
    overflow-y: auto;
    overflow-x: hidden;

    .triggerItem {
      height: 60px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      color: #606266;
      user-select: none;
      white-space: nowrap;

      &:hover {
        background-color: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }

      &.active {
        color: var(--el-color-primary);
      }

      .triggerIcon {
        font-size: 18px;
        margin-bottom: 5px;
      }

      .triggerName {
        font-size: 13px;
      }
    }
  }
}
</style>
