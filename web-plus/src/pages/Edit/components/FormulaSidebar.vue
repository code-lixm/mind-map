<script setup lang="ts">
import type { EventBus, MindMapInstance, MindMapNode } from '../types'
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import Sidebar from './Sidebar.vue'
import { formulaList } from '@/config/constant'

// Props
interface Props {
  mindMap?: MindMapInstance
  isDark?: boolean
  activeSidebar?: string | null
  localConfig?: {
    openNodeRichText?: boolean
  }
}

const props = withDefaults(defineProps<Props>(), {
  mindMap: undefined,
  isDark: false,
  activeSidebar: null,
  localConfig: () => ({}),
})

// Emits
const emit = defineEmits<{
  'update:activeSidebar': [value: string | null]
}>()

// 注入文案
interface LocaleTextType {
  formulaSidebar: {
    title: string
    placeholder: string
    confirm: string
    common: string
    tip: string
  }
}

const localeText = inject<LocaleTextType>('localeText', {
  formulaSidebar: {
    title: '公式',
    placeholder: '请输入 KaTex 公式',
    confirm: '插入',
    common: '常用公式',
    tip: '请先开启节点富文本编辑',
  },
})

// 注入事件总线
const eventBus = inject<EventBus>('eventBus')

// 状态
const formulaText = ref('')
const list = ref<Array<{ overview: string, text: string }>>([])
const activeNodes = ref<MindMapNode[]>([])

// Refs
const sidebarRef = ref<InstanceType<typeof Sidebar>>()

// 监听 activeSidebar 变化
watch(
  () => props.activeSidebar,
  (val) => {
    if (sidebarRef.value) {
      if (val === 'formulaSidebar') {
        sidebarRef.value.show = true
      }
      else {
        sidebarRef.value.show = false
      }
    }
  },
)

// 初始化公式列表
function init() {
  if (!(window as any).katex)
    return

  list.value = formulaList.map((item) => {
    return {
      text: item,
      overview: (window as any).katex.renderToString(
        item,
        {
          throwOnError: false,
        },
      ),
    }
  })
}

// 处理节点激活
function handleNodeActive(_node: unknown, nodes: MindMapNode[]) {
  activeNodes.value = nodes ? [...nodes] : []
  if (
    activeNodes.value.length <= 0
    && props.activeSidebar === 'formulaSidebar'
  ) {
    emit('update:activeSidebar', null)
  }
}

// 插入公式
function confirm() {
  if (!props.localConfig.openNodeRichText) {
    return ElMessage.warning(localeText.formulaSidebar.tip)
  }
  const str = formulaText.value.trim()
  if (!str)
    return
  props.mindMap?.execCommand('INSERT_FORMULA', str)
}

// 处理Sidebar关闭事件
function handleUpdateActiveSidebar(value: string | null) {
  emit('update:activeSidebar', value)
}

// 生命周期
onMounted(() => {
  init()

  if (eventBus) {
    eventBus.on('node_active', handleNodeActive)
  }
})

onBeforeUnmount(() => {
  if (eventBus) {
    eventBus.off('node_active', handleNodeActive)
  }
})
</script>

<template>
  <Sidebar
    ref="sidebarRef"
    :title="localeText.formulaSidebar.title"
    :is-dark="isDark"
    @update:active-sidebar="handleUpdateActiveSidebar"
  >
    <div class="box" :class="{ isDark }">
      <div class="formulaInputBox">
        <el-input
          v-model="formulaText"
          :rows="4"
          resize="none"
          type="textarea"
          :placeholder="localeText.formulaSidebar.placeholder"
          @keydown.stop
        />
        <el-button
          size="small"
          style="width: 100%; margin-top: 20px"
          @click="confirm"
        >
          {{ localeText.formulaSidebar.confirm }}
        </el-button>
      </div>
      <div class="title">
        {{ localeText.formulaSidebar.common }}
      </div>
      <div class="formulaList customScrollbar">
        <div
          v-for="(item, index) in list"
          :key="index"
          class="formulaItem"
        >
          <div class="overview" v-html="item.overview" />
          <div class="text" @click="formulaText = item.text">
            {{ item.text }}
          </div>
        </div>
      </div>
    </div>
  </Sidebar>
</template>

<style lang="scss" scoped>
.box {
  padding: 10px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &.isDark {
    .title {
      color: #fff;
    }

    .formulaList {
      .formulaItem {
        .overview,
        .text {
          color: #fff;
        }

        .text {
          background-color: #363b3f;
        }
      }
    }

    :deep(.el-textarea__inner) {
      background-color: transparent;
      color: #fff;
    }
  }

  .title {
    font-size: 16px;
    font-weight: 500;
    color: #333;
    margin: 10px 0;
    flex-shrink: 0;
  }

  .formulaInputBox {
    flex-shrink: 0;
  }

  .formulaList {
    height: 100%;
    overflow-y: auto;

    .formulaItem {
      position: relative;
      display: flex;
      overflow: hidden;
      align-items: center;
      border: 1px solid #dcdfe6;
      border-bottom: none;

      &:last-of-type {
        border-bottom: 1px solid #dcdfe6;
      }

      .overview,
      .text {
        width: 50%;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-shrink: 0;
      }

      .overview {
        padding: 10px 0;
        border-right: none;
      }

      .text {
        cursor: pointer;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        height: 100%;
        position: absolute;
        right: 0;
        top: 0;
        border-left: 1px solid #dcdfe6;
        background-color: #fafafa;
      }
    }
  }
}
</style>
