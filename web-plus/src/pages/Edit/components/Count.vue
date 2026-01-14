<script setup lang="ts">
import type { EventBus, MindMapFullData, MindMapInstance, MindMapNodeData } from '../types'
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'

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
  count: {
    words: string
    nodes: string
  }
}

const localeText = inject<LocaleTextType>('localeText', {
  count: {
    words: '字数',
    nodes: '节点',
  },
})

// 注入事件总线
const eventBus = inject<EventBus>('eventBus')

// 状态
const textStr = ref('')
const words = ref(0)
const num = ref(0)

// 用于计算文本长度的临时元素（去除 HTML 标签）
let countEl: HTMLDivElement | null = null

type MindMapDataPayload = MindMapFullData | MindMapNodeData

function isFullData(data: MindMapDataPayload): data is MindMapFullData {
  return Boolean((data as MindMapFullData)?.root && (data as MindMapFullData).root?.data)
}

function getRootNode(data: MindMapDataPayload): MindMapNodeData | null {
  if (!data)
    return null
  if (isFullData(data))
    return data.root
  return data as MindMapNodeData
}

// 监听数据变化
function onDataChange(data: MindMapDataPayload) {
  textStr.value = ''
  words.value = 0
  num.value = 0
  const rootNode = getRootNode(data)
  if (rootNode)
    walk(rootNode)

  if (countEl) {
    countEl.innerHTML = textStr.value
    words.value = countEl.textContent?.length || 0
  }
}

// 遍历节点树
function walk(data: MindMapNodeData) {
  if (!data)
    return

  num.value++
  textStr.value += String(data.data?.text) || ''

  if (data.children && data.children.length > 0) {
    data.children.forEach((item) => {
      walk(item)
    })
  }
}

// 生命周期
onMounted(() => {
  // 创建临时元素
  countEl = document.createElement('div')

  // 监听事件总线
  if (eventBus) {
    eventBus.on('data_change', onDataChange)
  }

  // 初始化数据
  if (props.mindMap) {
    const rawData = props.mindMap.getData() as any
    if (rawData) {
      const data: MindMapFullData = rawData.root ? rawData : { root: rawData }
      onDataChange(data)
    }
  }
})

onBeforeUnmount(() => {
  if (eventBus) {
    eventBus.off('data_change', onDataChange)
  }
  countEl = null
})
</script>

<template>
  <div class="countContainer" :class="{ isDark }">
    <div class="item">
      <span class="name">{{ localeText.count.words }}</span>
      <span class="value">{{ words }}</span>
    </div>
    <div class="item">
      <span class="name">{{ localeText.count.nodes }}</span>
      <span class="value">{{ num }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.countContainer {
  padding: 0 12px;
  position: fixed;
  left: 20px;
  bottom: 20px;
  background: hsla(0, 0%, 100%, 0.8);
  border-radius: 2px;
  opacity: 0.8;
  height: 22px;
  line-height: 22px;
  font-size: 12px;
  display: flex;

  &.isDark {
    background: #262a2e;

    .item {
      color: hsla(0, 0%, 100%, 0.6);
    }
  }

  .item {
    color: #555;
    margin-right: 15px;

    &:last-of-type {
      margin-right: 0;
    }

    .name {
      margin-right: 5px;
    }
  }
}

@media screen and (max-width: 900px) {
  .countContainer {
    display: none;
  }
}
</style>
