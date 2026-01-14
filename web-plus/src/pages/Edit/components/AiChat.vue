<script setup lang="ts">
import type { EventBus } from '../types'
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import { createUid } from 'simple-mind-map/src/utils'
import Sidebar from './Sidebar.vue'

// 定义 Chat 项类型
interface ChatItem {
  id: string
  type: 'user' | 'ai'
  content: string
}

// 定义 Store 接口
interface Store {
  state: {
    localConfig?: {
      isDark?: boolean
      [key: string]: unknown
    }
    activeSidebar?: string | null
    [key: string]: unknown
  }
  [key: string]: unknown
}

// 定义国际化文本接口
interface LocaleText {
  ai?: {
    chatTitle?: string
    clearRecords?: string
    modifyAIConfiguration?: string
    chatInputPlaceholder?: string
    send?: string
    stopGenerating?: string
    generationFailed?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

// 注入国际化
const localeText = inject<{ value: LocaleText }>('localeText', {
  value: { ai: {} },
})

// 注入事件总线
const eventBus = inject<EventBus>('eventBus')

// 注入 store
const storeInject = inject<Store>('store')
const isDark = computed(() => storeInject?.state.localConfig?.isDark || false)
const activeSidebar = computed(() => storeInject?.state.activeSidebar || null)

// Refs
const sidebar = ref<InstanceType<typeof Sidebar>>()
const chatResBoxRef = ref<HTMLDivElement>()

// 状态
const text = ref('')
const chatList = ref<ChatItem[]>([])
const isCreating = ref(false)

// Markdown 解析器
let md: MarkdownIt | null = null

// 监听 activeSidebar 变化
watch(activeSidebar, (val) => {
  if (sidebar.value) {
    sidebar.value.show = val === 'ai'
  }
})

// 键盘事件
function onKeydown(e: KeyboardEvent) {
  if (e.keyCode === 13) {
    if (!e.shiftKey) {
      e.preventDefault()
      send()
    }
  }
}

// 发送消息
function send() {
  if (isCreating.value)
    return
  const textValue = text.value.trim()
  if (!textValue) {
    return
  }
  text.value = ''
  const historyUserMsgList = chatList.value
    .filter((item) => {
      return item.type === 'user'
    })
    .map((item) => {
      return item.content
    })
  chatList.value.push({
    id: createUid(),
    type: 'user',
    content: textValue,
  })
  chatList.value.push({
    id: createUid(),
    type: 'ai',
    content: '',
  })
  isCreating.value = true
  const textList = [...historyUserMsgList, textValue]
  eventBus?.emit(
    'ai_chat',
    textList,
    (res: string) => {
      if (!md) {
        md = new MarkdownIt()
      }
      chatList.value[chatList.value.length - 1].content = md.render(res)
      nextTick(() => {
        if (chatResBoxRef.value) {
          chatResBoxRef.value.scrollTop = chatResBoxRef.value.scrollHeight
        }
      })
    },
    () => {
      isCreating.value = false
    },
    () => {
      isCreating.value = false
      ElMessage.error(localeText.value.ai?.generationFailed || '')
    },
  )
}

// 停止生成
function stop() {
  eventBus?.emit('ai_chat_stop')
  isCreating.value = false
}

// 清空记录
function clear() {
  chatList.value = []
}

// 修改AI配置
function modifyAiConfig() {
  eventBus?.emit('showAiConfigDialog')
}

// 生命周期
onBeforeUnmount(() => {
  // 清理事件监听
})
</script>

<template>
  <Sidebar ref="sidebar" :title="localeText.value.ai?.chatTitle">
    <div class="aiChatBox" :class="{ isDark }">
      <div class="chatHeader">
        <el-button size="small" @click="clear">
          <span class="i-ep:delete" />
          {{ localeText.value.ai?.clearRecords }}
        </el-button>
        <el-button size="small" @click="modifyAiConfig">
          <span class="i-ep:edit" />
          {{ localeText.value.ai?.modifyAIConfiguration }}
        </el-button>
      </div>
      <div ref="chatResBoxRef" class="chatResBox customScrollbar">
        <div
          v-for="item in chatList"
          :key="item.id"
          class="chatItem"
          :class="[item.type]"
        >
          <div v-if="item.type === 'user'" class="chatItemInner">
            <div class="avatar">
              <span class="icon i-ep:user" />
            </div>
            <div class="content">
              {{ item.content }}
            </div>
          </div>
          <div v-else-if="item.type === 'ai'" class="chatItemInner">
            <div class="avatar">
              <span class="icon iconfont iconAIshengcheng" />
            </div>
            <div class="content" v-html="item.content" />
          </div>
        </div>
      </div>
      <div class="chatInputBox">
        <textarea
          v-model="text"
          class="customScrollbar"
          :placeholder="localeText.value.ai?.chatInputPlaceholder"
          @keydown="onKeydown"
        />
        <el-button class="btn" size="small" :loading="isCreating" @click="send">
          {{ localeText.value.ai?.send }}
          <span class="i-ep:position" />
        </el-button>
        <el-button
          v-show="isCreating"
          class="stop"
          size="small"
          type="warning"
          @click="stop"
        >
          {{ localeText.value.ai?.stopGenerating }}
        </el-button>
      </div>
    </div>
  </Sidebar>
</template>

<style lang="scss" scoped>
.aiChatBox {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &.isDark {
  }

  .chatHeader {
    height: 50px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    align-items: center;
    padding: 0 12px;
  }

  .chatResBox {
    width: 100%;
    height: 100%;
    padding: 0 12px;
    margin: 12px 0;
    overflow-y: auto;
    overflow-x: hidden;

    .chatItem {
      margin-bottom: 20px;
      border: 1px solid;
      position: relative;
      border-radius: 10px;

      &:last-of-type {
        margin-bottom: 0;
      }

      &.ai {
        border-color: var(--el-color-primary);

        .chatItemInner {
          .avatar {
            border-color: var(--el-color-primary);
            left: -12px;
            top: -12px;

            .icon {
              color: var(--el-color-primary);
            }
          }
        }
      }

      &.user {
        border-color: #f56c6c;

        .chatItemInner {
          .avatar {
            border-color: #f56c6c;
            right: -12px;
            top: -12px;

            .icon {
              color: #f56c6c;
            }
          }
        }
      }

      .chatItemInner {
        width: 100%;
        padding: 12px;

        .avatar {
          width: 30px;
          height: 30px;
          border: 1px solid;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: absolute;
          background-color: #fff;

          .icon {
            font-size: 18px;
            font-weight: bold;
          }
        }

        :deep(.content) {
          width: 100%;
          overflow: hidden;
          color: #3f4a54;
          font-size: 14px;
          line-height: 1.5;

          p {
            margin-bottom: 12px;

            &:last-of-type {
              margin-bottom: 0;
            }
          }

          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            margin-top: 24px;
            margin-bottom: 16px;
          }

          code {
            padding: 0.2em 0.4em;
            margin: 0;
            font-size: 85%;
            white-space: break-spaces;
            background-color: rgba(175, 184, 193, 0.2);
            border-radius: 6px;
            font-family:
              ui-monospace,
              SFMono-Regular,
              SF Mono,
              Menlo,
              Consolas,
              Liberation Mono,
              monospace;
          }

          pre {
            padding: 12px;
            background-color: rgba(175, 184, 193, 0.2);

            code {
              background-color: transparent;
              padding: 0;
              overflow: hidden;
            }
          }
        }
      }
    }
  }

  .chatInputBox {
    flex-shrink: 0;
    width: 100%;
    height: 150px;
    border-top: 1px solid #e8e8e8;
    position: relative;

    textarea {
      width: 100%;
      height: 100%;
      outline: none;
      padding: 12px;
      border: none;
    }

    .btn {
      position: absolute;
      right: 12px;
      bottom: 12px;
    }

    .stop {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      top: -30px;
    }
  }
}
</style>
