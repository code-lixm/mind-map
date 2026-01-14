<script setup lang="ts">
import { inject, ref, watch } from 'vue'
import Sidebar from './Sidebar.vue'
import { shortcutKeyList as shortcutKeyListZh } from '../config/zh'

// Props
interface Props {
  isDark?: boolean
  activeSidebar?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  isDark: false,
  activeSidebar: null,
})

// Emits
const emit = defineEmits<{
  'update:activeSidebar': [value: string | null]
}>()

// 注入文案
const localeText = inject<any>('localeText', {
  shortcutKey: {
    title: '快捷键',
  },
})

// Refs
const sidebarRef = ref<InstanceType<typeof Sidebar>>()

// 使用中文配置
const shortcutKeyList = shortcutKeyListZh

// 监听 activeSidebar 变化
watch(
  () => props.activeSidebar,
  (val) => {
    if (sidebarRef.value) {
      if (val === 'shortcutKey') {
        sidebarRef.value.show = true
      }
      else {
        sidebarRef.value.show = false
      }
    }
  },
)

// 事件处理函数
function handleUpdateActiveSidebar(value: string | null) {
  emit('update:activeSidebar', value)
}
</script>

<template>
  <Sidebar
    ref="sidebarRef"
    :title="localeText.shortcutKey.title"
    :is-dark="isDark"
    @update:active-sidebar="handleUpdateActiveSidebar"
  >
    <div class="box" :class="{ isDark }">
      <div v-for="item in shortcutKeyList" :key="item.type">
        <div class="title">
          {{ item.type }}
        </div>
        <div v-for="item2 in item.list" :key="item2.value" class="list">
          <div class="item">
            <span
              v-if="item2.icon"
              class="icon iconfont"
              :class="[item2.icon]"
            />
            <span class="name" :title="item2.name">{{ item2.name }}</span>
            <div class="value" :title="item2.value">
              {{ item2.value }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </Sidebar>
</template>

<style lang="scss" scoped>
.box {
  padding: 0 20px;

  &.isDark {
    .title {
      color: #fff;
    }

    .list {
      .item {
        .icon {
          color: hsla(0, 0%, 100%, 0.6);
        }

        .name {
          color: hsla(0, 0%, 100%, 0.6);
        }

        .value {
          color: hsla(0, 0%, 100%, 0.3);
        }
      }
    }
  }

  .title {
    font-size: 16px;
    font-weight: 500;
    color: #333;
    margin: 26px 0 20px;
  }

  .list {
    font-size: 14px;

    .item {
      display: flex;
      align-items: center;
      margin-bottom: 15px;

      .icon {
        font-size: 16px;
        margin-right: 16px;
      }

      .name {
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .value {
        color: #909090;
        margin-left: auto;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
}
</style>
