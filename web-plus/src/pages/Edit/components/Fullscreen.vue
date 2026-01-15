<script setup lang="ts">
import type { MindMapInstance } from '../types'
import { inject, onMounted } from 'vue'
import { fullScreen, fullscrrenEvent } from '@/utils'

// Props
interface Props {
  mindMap?: MindMapInstance
  isDark?: boolean
  isEditMode?: boolean // 是否为编辑模式
}

const props = withDefaults(defineProps<Props>(), {
  mindMap: undefined,
  isDark: false,
  isEditMode: false,
})

// 注入文案
interface LocaleTextType {
  fullscreen: {
    fullscreenShow: string
    fullscreenEdit: string
  }
}

const localeText = inject<LocaleTextType>('localeText', {
  fullscreen: {
    fullscreenShow: '全屏查看',
    fullscreenEdit: '全屏编辑',
  },
})

// 生命周期
onMounted(() => {
  // 监听全屏事件，全屏切换后调整思维导图大小
  if (fullscrrenEvent) {
    (document as any)[fullscrrenEvent] = () => {
      setTimeout(() => {
        props.mindMap?.resize()
      }, 1000)
    }
  }
})

// 全屏查看
function toFullscreenShow() {
  if (props.mindMap?.el) {
    fullScreen(props.mindMap.el)
  }
}

// 全屏编辑（使用脑图容器）
function toFullscreenEdit() {
  if (props.mindMap?.el) {
    fullScreen(props.mindMap.el)
  }
}
</script>

<template>
  <div class="fullscreenContainer" :class="{ isDark }">
    <!-- 预览模式：只显示全屏查看 -->
    <el-tooltip
      v-if="!isEditMode"
      effect="dark"
      :content="localeText.fullscreen.fullscreenShow"
      placement="top"
    >
      <div class="item btn iconfont iconquanping" @click="toFullscreenShow" />
    </el-tooltip>

    <!-- 编辑模式：只显示全屏编辑 -->
    <el-tooltip
      v-if="isEditMode"
      effect="dark"
      :content="localeText.fullscreen.fullscreenEdit"
      placement="top"
    >
      <div class="item btn iconfont iconquanping1" @click="toFullscreenEdit" />
    </el-tooltip>
  </div>
</template>

<style lang="scss" scoped>
.fullscreenContainer {
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
  }
}
</style>
