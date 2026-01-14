<script setup lang="ts">
import type { EventBus, MindMapInstance } from '../types'
import { computed, inject, ref } from 'vue'
import Scale from './Scale.vue'
import Fullscreen from './Fullscreen.vue'
import Demonstrate from './Demonstrate.vue'
import MouseAction from './MouseAction.vue'

// Props
interface Props {
  mindMap?: MindMapInstance
  isDark?: boolean
  isReadonly?: boolean
  activeSidebar?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  mindMap: undefined,
  isDark: false,
  isReadonly: false,
  activeSidebar: null,
})

// Emits
const emit = defineEmits<{
  'update:isDark': [value: boolean]
  'update:isReadonly': [value: boolean]
  'update:activeSidebar': [value: string | null]
}>()

// 注入文案
interface LocaleTextType {
  navigatorToolbar: {
    backToRoot: string
    closeMiniMap: string
    openMiniMap: string
    edit: string
    readonly: string
    shortcutKeys: string
    ai: string
    downloadClient: string
    downloadDesc: string
    site: string
    current: string
  }
}

const localeText = inject<LocaleTextType>('localeText', {
  navigatorToolbar: {
    backToRoot: '回到根节点',
    closeMiniMap: '关闭小地图',
    openMiniMap: '打开小地图',
    edit: '编辑',
    readonly: '只读',
    shortcutKeys: '快捷键',
    ai: 'AI',
    downloadClient: '下载客户端',
    downloadDesc: '下载说明',
    site: '官网',
    current: '当前版本：',
  },
})

// 注入事件总线
const eventBus = inject<EventBus>('eventBus')

// 状态
const openMiniMap = ref(false)
const isShortcutActive = computed(() => props.activeSidebar === 'shortcutKey')
// const version = '0.14.0' // simple-mind-map 版本号

// // 切换只读模式
// function readonlyChange() {
//   const newValue = !props.isReadonly
//   emit('update:isReadonly', newValue)
//   props.mindMap?.setMode(newValue ? 'readonly' : 'edit')
// }

// 切换小地图
function toggleMiniMap() {
  openMiniMap.value = !openMiniMap.value
  if (eventBus) {
    eventBus.emit('toggle_mini_map', openMiniMap.value)
  }
}

// 显示搜索
function showSearch() {
  if (eventBus) {
    eventBus.emit('show_search')
  }
}

// // 切换深色模式
// function toggleDark() {
//   emit('update:isDark', !props.isDark)
// }

// 打开/关闭快捷键抽屉
function toggleShortcutSidebar() {
  const nextSidebar = props.activeSidebar === 'shortcutKey' ? null : 'shortcutKey'
  emit('update:activeSidebar', nextSidebar)
}

// 回到根节点
function backToRoot() {
  props.mindMap?.renderer.setRootNodeCenter()
}
</script>

<template>
  <div class="navigatorContainer customScrollbar" :class="{ isDark }">
    <div class="item">
      <el-tooltip
        effect="dark"
        :content="localeText.navigatorToolbar.backToRoot"
        placement="top"
      >
        <div class="btn iconfont icondingwei" @click="backToRoot" />
      </el-tooltip>
    </div>
    <div class="item">
      <div class="btn iconfont iconsousuo" @click="showSearch" />
    </div>
    <div class="item">
      <MouseAction
        :is-dark="isDark"
        :mind-map="mindMap"
      />
    </div>
    <div class="item">
      <el-tooltip
        effect="dark"
        :content="
          openMiniMap
            ? localeText.navigatorToolbar.closeMiniMap
            : localeText.navigatorToolbar.openMiniMap
        "
        placement="top"
      >
        <div class="btn iconfont icondaohang1" @click="toggleMiniMap" />
      </el-tooltip>
    </div>
    <!-- 注释掉:切换编辑/只读模式功能 -->
    <!-- <div class="item">
      <el-tooltip
        effect="dark"
        :content="
          isReadonly
            ? localeText.navigatorToolbar.edit
            : localeText.navigatorToolbar.readonly
        "
        placement="top"
      >
        <div
          class="btn iconfont"
          :class="[isReadonly ? 'iconyanjing' : 'iconbianji1']"
          @click="readonlyChange"
        />
      </el-tooltip>
    </div> -->
    <div class="item">
      <Fullscreen :is-dark="isDark" :mind-map="mindMap" />
    </div>
    <div class="item">
      <Scale :is-dark="isDark" :mind-map="mindMap" />
    </div>
    <!-- 注释掉:切换主题颜色功能，默认使用浅色主题 -->
    <!-- <div class="item">
      <div
        class="btn iconfont"
        :class="[isDark ? 'iconmoon_line' : 'iconlieri']"
        @click="toggleDark"
      />
    </div> -->
    <div class="item">
      <Demonstrate :is-dark="isDark" :mind-map="mindMap" />
    </div>
    <div class="item">
      <el-tooltip
        effect="dark"
        :content="localeText.navigatorToolbar.shortcutKeys"
        placement="top"
      >
        <div
          class="btn iconfont iconjianpan"
          :class="{ active: isShortcutActive }"
          @click="toggleShortcutSidebar"
        />
      </el-tooltip>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.navigatorContainer {
  padding: 0 12px;
  position: absolute;
  right: 20px;
  bottom: 20px;
  background: #ffffff;
  border-radius: 5px;
  opacity: 0.8;
  height: 44px;
  font-size: 12px;
  display: flex;
  align-items: center;

  &:hover {
    opacity: 1;
  }
  &.isDark {
    background: #262a2e;

    .item {
      a {
        color: hsla(0, 0%, 100%, 0.6);
      }

      .btn {
        color: hsla(0, 0%, 100%, 0.6);
      }
    }
  }

  .item {
    margin-right: 20px;

    &:last-of-type {
      margin-right: 0;
    }

    a {
      color: #303133;
      text-decoration: none;
    }

    .btn {
      cursor: pointer;
      font-size: 18px;

      &:hover {
        color: var(--el-color-primary);
      }

      &.active {
        color: var(--el-color-primary);
      }
    }
  }
}

@media screen and (max-width: 700px) {
  .navigatorContainer {
    left: 20px;
    overflow-x: auto;
    overflow-y: hidden;
    height: 60px;
  }
}

// 修复下拉菜单中图标和文字的对齐问题
:deep(.el-dropdown-menu__item) {
  .iconfont {
    vertical-align: middle;
    margin-right: 6px;
  }
}
</style>
