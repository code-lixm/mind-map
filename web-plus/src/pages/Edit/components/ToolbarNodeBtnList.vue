<script setup lang="ts">
import type { EventBus, MindMapNode } from '../types'

// Props
interface Props {
  dir?: string // h（水平排列）、v（垂直排列）
  list?: string[]
  isDark?: boolean
  mode?: 'readonly' | 'edit'
}

const props = withDefaults(defineProps<Props>(), {
  dir: 'h',
  list: () => [],
  isDark: false,
  mode: 'edit',
})

// Emits
const emit = defineEmits<{
  setActiveSidebar: [value: string]
}>()

// 注入
const eventBus = inject<EventBus>('eventBus')
const localeText = inject<(key: string) => string>('localeText', () => '')

// 状态
const activeNodes = ref<MindMapNode[]>([])
const backEnd = ref(true)
const forwardEnd = ref(true)
const readonly = ref(props.mode === 'readonly')
const isInPainter = ref(false)

// Watch for mode prop changes
watch(() => props.mode, (newMode) => {
  readonly.value = newMode === 'readonly'
})

// 计算属性
const hasRoot = computed(() => {
  return activeNodes.value.findIndex(node => node.isRoot) !== -1
})

const hasGeneralization = computed(() => {
  return activeNodes.value.findIndex(node => node.isGeneralization) !== -1
})

// 检查当前激活节点是否有特定属性
const hasImage = computed(() => {
  if (activeNodes.value.length === 0)
    return false
  const firstNode = activeNodes.value[0]
  return !!(firstNode.getData('image') || firstNode.getData('imageData'))
})

const hasIcon = computed(() => {
  if (activeNodes.value.length === 0)
    return false
  const firstNode = activeNodes.value[0]
  const icons = firstNode.getData('icon') || []
  return icons.length > 0
})

const hasLink = computed(() => {
  if (activeNodes.value.length === 0)
    return false
  const firstNode = activeNodes.value[0]
  return !!firstNode.getData('hyperlink')
})

const hasNote = computed(() => {
  if (activeNodes.value.length === 0)
    return false
  const firstNode = activeNodes.value[0]
  return !!firstNode.getData('note')
})

const hasTag = computed(() => {
  if (activeNodes.value.length === 0)
    return false
  const firstNode = activeNodes.value[0]
  const tags = firstNode.getData('tag') || []
  return tags.length > 0
})

const hasGeneralizationData = computed(() => {
  if (activeNodes.value.length === 0)
    return false
  const firstNode = activeNodes.value[0]
  return !!firstNode.getData('generalization')
})

const hasOuterFrame = computed(() => {
  if (activeNodes.value.length === 0)
    return false
  const firstNode = activeNodes.value[0]
  return !!firstNode.getData('outerFrame')
})

// 事件处理函数
function handleModeChange(mode: string) {
  readonly.value = mode === 'readonly'
}

function handleNodeActive(_node: unknown, nodes: MindMapNode[]) {
  activeNodes.value = nodes ? [...nodes] : []
}

function handleBackForward(index: number, len: number) {
  backEnd.value = index <= 0
  forwardEnd.value = index >= len - 1
}

function handlePainterStart() {
  isInPainter.value = true
}

function handlePainterEnd() {
  isInPainter.value = false
}

function handleShowNodeIcon() {
  eventBus?.emit('close_node_icon_toolbar')
  emit('setActiveSidebar', 'nodeIconSidebar')
}

function handleShowFormula() {
  emit('setActiveSidebar', 'formulaSidebar')
}

function handleSelectAttachmentFile() {
  eventBus?.emit('selectAttachment', activeNodes.value)
}

function handleAiCreate() {
  eventBus?.emit('ai_create_all')
}

// 生命周期
onMounted(() => {
  if (eventBus) {
    eventBus.on('mode_change', handleModeChange)
    eventBus.on('node_active', handleNodeActive)
    eventBus.on('back_forward', handleBackForward)
    eventBus.on('painter_start', handlePainterStart)
    eventBus.on('painter_end', handlePainterEnd)
  }
})

onBeforeUnmount(() => {
  if (eventBus) {
    eventBus.off('mode_change', handleModeChange)
    eventBus.off('node_active', handleNodeActive)
    eventBus.off('back_forward', handleBackForward)
    eventBus.off('painter_start', handlePainterStart)
    eventBus.off('painter_end', handlePainterEnd)
  }
})
</script>

<template>
  <div class="toolbarNodeBtnList" :class="[dir, { isDark }]">
    <template v-for="item in list" :key="item">
      <div
        v-if="item === 'back'"
        class="toolbarBtn"
        :class="{
          disabled: readonly || backEnd,
        }"
        @click="eventBus?.emit('execCommand', 'BACK')"
      >
        <span class="icon iconfont iconhoutui-shi" />
        <span class="text">{{ localeText('toolbar.undo') }}</span>
      </div>
      <div
        v-if="item === 'forward'"
        class="toolbarBtn"
        :class="{
          disabled: readonly || forwardEnd,
        }"
        @click="eventBus?.emit('execCommand', 'FORWARD')"
      >
        <span class="icon iconfont iconqianjin1" />
        <span class="text">{{ localeText('toolbar.redo') }}</span>
      </div>
      <div
        v-if="item === 'painter'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization,
          active: isInPainter,
        }"
        @click="eventBus?.emit('startPainter')"
      >
        <span class="icon iconfont iconjiedian" />
        <span class="text">{{ localeText('toolbar.painter') }}</span>
      </div>
      <div
        v-if="item === 'siblingNode'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasRoot || hasGeneralization,
        }"
        @click="eventBus?.emit('execCommand', 'INSERT_NODE')"
      >
        <span class="icon iconfont iconjiedian" />
        <span class="text">{{ localeText('toolbar.insertSiblingNode') }}</span>
      </div>
      <div
        v-if="item === 'childNode'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization,
        }"
        @click="eventBus?.emit('execCommand', 'INSERT_CHILD_NODE')"
      >
        <span class="icon iconfont icontianjiazijiedian" />
        <span class="text">{{ localeText('toolbar.insertChildNode') }}</span>
      </div>
      <div
        v-if="item === 'deleteNode'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0,
        }"
        @click="eventBus?.emit('execCommand', 'REMOVE_NODE')"
      >
        <span class="icon iconfont iconshanchu" />
        <span class="text">{{ localeText('toolbar.deleteNode') }}</span>
      </div>
      <div
        v-if="item === 'image'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0,
          active: hasImage,
        }"
        @click="eventBus?.emit('showNodeImage')"
      >
        <span class="icon iconfont iconimage" />
        <span class="text">{{ localeText('toolbar.image') }}</span>
      </div>
      <div
        v-if="item === 'icon'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0,
          active: hasIcon,
        }"
        @click="handleShowNodeIcon"
      >
        <span class="icon iconfont iconxiaolian" />
        <span class="text">{{ localeText('toolbar.icon') }}</span>
      </div>
      <div
        v-if="item === 'link'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0,
          active: hasLink,
        }"
        @click="eventBus?.emit('showNodeLink')"
      >
        <span class="icon iconfont iconchaolianjie" />
        <span class="text">{{ localeText('toolbar.link') }}</span>
      </div>
      <div
        v-if="item === 'note'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0,
          active: hasNote,
        }"
        @click="eventBus?.emit('showNodeNote')"
      >
        <span class="icon iconfont iconflow-Mark" />
        <span class="text">{{ localeText('toolbar.note') }}</span>
      </div>
      <div
        v-if="item === 'tag'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0,
          active: hasTag,
        }"
        @click="eventBus?.emit('showNodeTag')"
      >
        <span class="icon iconfont iconbiaoqian" />
        <span class="text">{{ localeText('toolbar.tag') }}</span>
      </div>
      <div
        v-if="item === 'summary'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasRoot || hasGeneralization,
          active: hasGeneralizationData,
        }"
        @click="eventBus?.emit('execCommand', 'ADD_GENERALIZATION')"
      >
        <span class="icon iconfont icongaikuozonglan" />
        <span class="text">{{ localeText('toolbar.summary') }}</span>
      </div>
      <div
        v-if="item === 'associativeLine'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization,
        }"
        @click="eventBus?.emit('createAssociativeLine')"
      >
        <span class="icon iconfont iconlianjiexian" />
        <span class="text">{{ localeText('toolbar.associativeLine') }}</span>
      </div>
      <!-- <div
        v-if="item === 'formula'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization,
        }"
        @click="handleShowFormula"
      >
        <span class="icon iconfont icongongshi" />
        <span class="text">{{ localeText('toolbar.formula') }}</span>
      </div> -->
      <div
        v-if="item === 'attachment'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization,
        }"
        @click="handleSelectAttachmentFile"
      >
        <span class="icon iconfont iconfujian" />
        <span class="text">{{ localeText('toolbar.attachment') }}</span>
      </div>
      <div
        v-if="item === 'outerFrame'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization,
          active: hasOuterFrame,
        }"
        @click="eventBus?.emit('execCommand', 'ADD_OUTER_FRAME')"
      >
        <span class="icon iconfont iconwaikuang" />
        <span class="text">{{ localeText('toolbar.outerFrame') }}</span>
      </div>
      <!-- <div
        v-if="item === 'annotation'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization,
        }"
        @click="eventBus?.emit('execCommand', 'ADD_ANNOTATION')"
      >
        <span class="icon iconfont iconbiaozhu" />
        <span class="text">{{ localeText('toolbar.annotation') }}</span>
      </div> -->
      <!-- <div
        v-if="item === 'ai'"
        class="toolbarBtn"
        :class="{
          disabled: hasGeneralization,
        }"
        @click="handleAiCreate"
      >
        <span class="icon iconfont iconAIshengcheng" />
        <span class="text">{{ localeText('toolbar.ai') }}</span>
      </div> -->
    </template>
  </div>
</template>

<style lang="scss" scoped>
.toolbarNodeBtnList {
  display: flex;

  &.isDark {
    .toolbarBtn {
      color: hsla(0, 0%, 100%, 0.9);

      .icon {
        background: transparent;
        border-color: transparent;
      }

      &:hover {
        &:not(.disabled) {
          .icon {
            background-color: var(--el-color-primary-light-9);
            color: var(--el-color-primary);
            border-color: var(--el-color-primary-light-5);
          }
        }
      }

      &.active {
        color: var(--el-color-primary);

        .icon {
          background-color: var(--el-color-primary-light-9);
          color: var(--el-color-primary);
          border-color: var(--el-color-primary);
        }
      }

      &.disabled {
        color: #54595f;
      }
    }
  }

  .toolbarBtn {
    display: flex;
    justify-content: center;
    flex-direction: column;
    cursor: pointer;
    margin-right: 20px;

    &:last-of-type {
      margin-right: 0;
    }

    &:hover {
      &:not(.disabled) {
        .icon {
          background-color: var(--el-color-primary-light-9);
          color: var(--el-color-primary);
          border-color: var(--el-color-primary-light-5);
        }
      }
    }

    &.active {
      color: var(--el-color-primary);

      .icon {
        background: var(--el-color-primary-light-9);
        border-color: var(--el-color-primary-light-5);
      }
    }

    &.disabled {
      color: #bcbcbc;
      cursor: not-allowed;
      pointer-events: none;
    }

    .icon {
      display: flex;
      height: 26px;
      background: #fff;
      border-radius: 4px;
      border: 1px solid #e9e9e9;
      justify-content: center;
      flex-direction: column;
      text-align: center;
      padding: 0 5px;
    }

    .text {
      margin-top: 3px;
      text-align: center;
    }
  }

  &.v {
    display: block;
    width: 120px;
    flex-wrap: wrap;

    .toolbarBtn {
      flex-direction: row;
      justify-content: flex-start;
      margin-bottom: 10px;
      width: 100%;
      margin-right: 0;

      &:last-of-type {
        margin-bottom: 0;
      }

      .icon {
        margin-right: 10px;
      }

      .text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
}
</style>
