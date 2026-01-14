<script setup lang="ts">
import type { MindMapInstance } from '../types'
import { computed, inject } from 'vue'
import { useEditorState } from '../composables/useEditorState'

// Props
interface Props {
  mindMap?: MindMapInstance
  isDark?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mindMap: undefined,
  isDark: false,
})

// 注入文案
interface LocaleTextType {
  mouseAction: {
    tip1: string
    tip2: string
  }
}

const localeText = inject<LocaleTextType>('localeText', {
  mouseAction: {
    tip1: '左键拖动，右键框选',
    tip2: '左键框选，右键拖动',
  },
})

// Store
const editorStore = useEditorState()
const { state, setLocalConfig } = editorStore
const useLeftKeySelectionRightKeyDrag = computed({
  get: () => state.localConfig.useLeftKeySelectionRightKeyDrag,
  set: (value: boolean) => setLocalConfig({ useLeftKeySelectionRightKeyDrag: value }),
})

// 切换鼠标操作模式
function toggleAction() {
  const val = !useLeftKeySelectionRightKeyDrag.value
  props.mindMap?.updateConfig({
    useLeftKeySelectionRightKeyDrag: val,
  })
  useLeftKeySelectionRightKeyDrag.value = val
}
</script>

<template>
  <div class="mouseActionContainer" :class="{ isDark }">
    <el-tooltip
      class="item"
      effect="dark"
      :content="
        useLeftKeySelectionRightKeyDrag
          ? localeText.mouseAction.tip2
          : localeText.mouseAction.tip1
      "
      raw-content
      placement="top"
    >
      <div
        class="btn iconfont"
        :class="[useLeftKeySelectionRightKeyDrag ? 'iconmouseR' : 'iconmouseL']"
        @click="toggleAction"
      />
    </el-tooltip>
  </div>
</template>

<style lang="scss" scoped>
.mouseActionContainer {
  display: flex;
  align-items: center;

  &.isDark {
    .btn {
      color: hsla(0, 0%, 100%, 0.6);
    }
  }

  .item {
    margin-right: 12px;

    &:last-of-type {
      margin-right: 0;
    }
  }

  .btn {
    cursor: pointer;
    font-size: 18px;
  }
}
</style>
