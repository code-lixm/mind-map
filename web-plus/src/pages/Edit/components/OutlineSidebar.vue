<script setup lang="ts">
import type { MindMapInstance } from '../types'
import Outline from './Outline.vue'
import Sidebar from './Sidebar.vue'
import { printOutline } from '@/utils'

// Props
interface Props {
  mindMap: MindMapInstance
  activeSidebar?: string | null
  isDark?: boolean
  isReadonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  activeSidebar: null,
  isDark: false,
  isReadonly: false,
})

// Emits
const emit = defineEmits<{
  setActiveSidebar: [value: string | null]
  setIsOutlineEdit: [value: boolean]
  setIsDragOutlineTreeNode: [value: boolean]
}>()

// 注入
const localeText = inject<(key: string) => string>('localeText', () => '')

// Refs
const sidebarRef = ref<InstanceType<typeof Sidebar> | null>(null)
const outlineRef = ref<InstanceType<typeof Outline> | null>(null)

// 监听 activeSidebar 变化
watch(() => props.activeSidebar, (val) => {
  if (val === 'outline') {
    if (sidebarRef.value) {
      sidebarRef.value.show = true
    }
  }
  else {
    if (sidebarRef.value) {
      sidebarRef.value.show = false
    }
  }
})

// 事件处理函数
function handleChangeToOutlineEdit() {
  emit('setActiveSidebar', null)
  emit('setIsOutlineEdit', true)
}

function handleScrollTo(y: number) {
  const container = sidebarRef.value?.getEl()
  if (!container)
    return
  const height = container.offsetHeight
  const top = container.scrollTop
  if (y > top + height) {
    container.scrollTo(0, y - height / 2)
  }
}

function handlePrint() {
  if (outlineRef.value?.$el) {
    printOutline(outlineRef.value.$el)
  }
}

function handleSetIsDragOutlineTreeNode(value: boolean) {
  emit('setIsDragOutlineTreeNode', value)
}

function handleUpdateActiveSidebar(value: string | null) {
  emit('setActiveSidebar', value)
}
</script>

<template>
  <Sidebar
    ref="sidebarRef"
    :title="localeText('outline.title')"
    @update:active-sidebar="handleUpdateActiveSidebar"
  >
    <div class="btnList">
      <el-tooltip
        class="item"
        effect="dark"
        :content="localeText('outline.print')"
        placement="top"
      >
        <div class="btn" @click="handlePrint">
          <span class="icon iconfont iconprinting" />
        </div>
      </el-tooltip>
      <el-tooltip
        class="item"
        effect="dark"
        :content="localeText('outline.fullscreen')"
        placement="top"
      >
        <div
          class="btn"
          :class="{ isDark }"
          @click="handleChangeToOutlineEdit"
        >
          <span class="icon iconfont iconquanping1" />
        </div>
      </el-tooltip>
    </div>
    <Outline
      v-if="activeSidebar === 'outline'"
      ref="outlineRef"
      :mind-map="mindMap"
      :is-readonly="isReadonly"
      :is-dark="isDark"
      @scroll-to="handleScrollTo"
      @set-is-drag-outline-tree-node="handleSetIsDragOutlineTreeNode"
    />
  </Sidebar>
</template>

<style lang="scss" scoped>
.btnList {
  position: absolute;
  right: 50px;
  top: 12px;
  display: flex;
  align-items: center;

  .btn {
    cursor: pointer;
    margin-left: 12px;
    color: #9ca3af;
    font-size: 16px;
    transition: color 0.2s;

    &:hover {
      color: #6b7280;
    }

    &.isDark {
      color: rgba(255, 255, 255, 0.5);

      &:hover {
        color: rgba(255, 255, 255, 0.7);
      }
    }
  }
}
</style>
