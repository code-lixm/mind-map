<script setup lang="ts">
import type { MindMap } from '../types'
import { computed, inject, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  borderDasharrayList,
  fontFamilyList,
  fontSizeList,
  lineWidthList,
} from '../config'
import Color from './Color.vue'
import Sidebar from './Sidebar.vue'
import { useEditorState } from '../composables/useEditorState'

// Props
interface Props {
  mindMap: MindMap
  activeSidebar: string | null
  isDark: boolean
}

const props = defineProps<Props>()

// 注入
const localeText = inject<any>('localeText', {})

// Store
const editorStore = useEditorState()

// Refs
const sidebarRef = ref<InstanceType<typeof Sidebar>>()

// 默认样式
const defaultStyle = {
  associativeLineColor: '',
  associativeLineWidth: 0,
  associativeLineActiveWidth: 0,
  associativeLineDasharray: '',
  associativeLineActiveColor: '',
  associativeLineTextFontSize: 0,
  associativeLineTextColor: '',
  associativeLineTextFontFamily: '',
}

// 状态
const activeLineNode = ref<any>(null)
const activeLineToNode = ref<any>(null)
const style = reactive<Record<string, any>>({ ...defaultStyle })

// 计算属性（直接使用中文配置）
const fontFamilyListComputed = computed(() => {
  return fontFamilyList
})

const borderDasharrayListComputed = computed(() => {
  return borderDasharrayList
})

// 监听器
watch(
  () => props.activeSidebar,
  (val) => {
    if (val === 'associativeLineStyle') {
      if (sidebarRef.value)
        sidebarRef.value.show = true
    }
    else {
      if (sidebarRef.value)
        sidebarRef.value.show = false
    }
  },
)

// 方法
function onAssociativeLineClick(a: any, b: any, node: any, toNode: any) {
  activeLineNode.value = node
  activeLineToNode.value = toNode
  const styleConfig = props.mindMap.associativeLine.getStyleConfig(node, toNode)
  Object.keys(style).forEach((item) => {
    style[item] = styleConfig[item]
  })
  // 此处需要调用 setActiveSidebar mutation
}

function associativeLineDeactivate() {
  if (props.activeSidebar === 'associativeLineStyle') {
    // 此处需要调用 setActiveSidebar(null) mutation
  }
  activeLineNode.value = null
  activeLineToNode.value = null
  Object.assign(style, { ...defaultStyle })
}

function update(prop: string, value: any) {
  style[prop] = value
  const associativeLineStyle
    = activeLineNode.value.getData('associativeLineStyle') || {}
  const toNodeUid = activeLineToNode.value.getData('uid')
  const lineStyle = associativeLineStyle[toNodeUid] || {}
  activeLineNode.value.setData({
    associativeLineStyle: {
      ...associativeLineStyle,
      [toNodeUid]: {
        ...lineStyle,
        ...style,
      },
    },
  })
  props.mindMap.associativeLine.updateActiveLineStyle()
}

// 处理Sidebar关闭事件
function handleUpdateActiveSidebar(value: string | null) {
  editorStore.setActiveSidebar(value)
}

// 生命周期
props.mindMap.on('associative_line_click', onAssociativeLineClick)
props.mindMap.on('associative_line_deactivate', associativeLineDeactivate)

onBeforeUnmount(() => {
  props.mindMap.off('associative_line_click', onAssociativeLineClick)
  props.mindMap.off('associative_line_deactivate', associativeLineDeactivate)
})
</script>

<template>
  <Sidebar
    ref="sidebarRef"
    :title="localeText.baseStyle?.associativeLineStyle || '关联线样式'"
    @update:active-sidebar="handleUpdateActiveSidebar"
  >
    <div class="sidebarContent" :class="{ isDark }">
      <div class="title noTop">
        {{ localeText.baseStyle?.associativeLine || '关联线' }}
      </div>
      <div class="row">
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.associativeLineColor || '关联线颜色' }}</span>
          <el-popover placement="bottom" trigger="click">
            <Color
              :color="style.associativeLineColor"
              @change="(color) => update('associativeLineColor', color)"
            />
            <template #reference>
              <span
                class="block"
                :style="{ backgroundColor: style.associativeLineColor }"
              />
            </template>
          </el-popover>
        </div>
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.associativeLineWidth || '关联线宽度' }}</span>
          <el-select
            v-model="style.associativeLineWidth"
            size="small"
            style="width: 80px"
            placeholder=""
            @change="(value) => update('associativeLineWidth', value)"
          >
            <el-option
              v-for="item in lineWidthList"
              :key="item"
              :label="item"
              :value="item"
            >
              <span
                v-if="item > 0"
                class="borderLine"
                :class="{ isDark }"
                :style="{ height: `${item}px` }"
              />
            </el-option>
          </el-select>
        </div>
      </div>
      <div class="row">
        <div class="rowItem">
          <span class="name">
            {{ localeText.baseStyle?.associativeLineActiveColor || '激活颜色' }}
          </span>
          <el-popover placement="bottom" trigger="click">
            <Color
              :color="style.associativeLineActiveColor"
              @change="(color) => update('associativeLineActiveColor', color)"
            />
            <template #reference>
              <span
                class="block"
                :style="{ backgroundColor: style.associativeLineActiveColor }"
              />
            </template>
          </el-popover>
        </div>
        <div class="rowItem">
          <span class="name">
            {{ localeText.baseStyle?.associativeLineActiveWidth || '激活宽度' }}
          </span>
          <el-select
            v-model="style.associativeLineActiveWidth"
            size="small"
            style="width: 80px"
            placeholder=""
            @change="(value) => update('associativeLineActiveWidth', value)"
          >
            <el-option
              v-for="item in lineWidthList"
              :key="item"
              :label="item"
              :value="item"
            >
              <span
                v-if="item > 0"
                class="borderLine"
                :class="{ isDark }"
                :style="{ height: `${item}px` }"
              />
            </el-option>
          </el-select>
        </div>
      </div>
      <div class="row">
        <div class="rowItem">
          <span class="name">{{ localeText.style?.style || '样式' }}</span>
          <el-select
            v-model="style.associativeLineDasharray"
            size="small"
            style="width: 80px"
            placeholder=""
            @change="(value) => update('associativeLineDasharray', value)"
          >
            <el-option
              v-for="item in borderDasharrayListComputed"
              :key="item.value"
              :label="item.name"
              :value="item.value"
            >
              <svg width="120" height="34">
                <line
                  x1="10"
                  y1="17"
                  x2="110"
                  y2="17"
                  stroke-width="2"
                  :stroke="
                    style.associativeLineDasharray === item.value
                      ? 'var(--el-color-primary)'
                      : isDark
                        ? '#fff'
                        : '#000'
                  "
                  :stroke-dasharray="item.value"
                />
              </svg>
            </el-option>
          </el-select>
        </div>
      </div>
      <!-- 关联线文字 -->
      <div class="title noTop">
        {{ localeText.baseStyle?.associativeLineText || '关联线文字' }}
      </div>
      <div class="row">
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.fontFamily || '字体' }}</span>
          <el-select
            v-model="style.associativeLineTextFontFamily"
            size="small"
            placeholder=""
            @change="update('associativeLineTextFontFamily', $event)"
          >
            <el-option
              v-for="item in fontFamilyListComputed"
              :key="item.value"
              :label="item.name"
              :value="item.value"
              :style="{ fontFamily: item.value }"
            />
          </el-select>
        </div>
      </div>
      <div class="row">
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.color || '颜色' }}</span>
          <el-popover placement="bottom" trigger="click">
            <Color
              :color="style.associativeLineTextColor"
              @change="(color) => update('associativeLineTextColor', color)"
            />
            <template #reference>
              <span
                class="block"
                :style="{ backgroundColor: style.associativeLineTextColor }"
              />
            </template>
          </el-popover>
        </div>
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.fontSize || '字号' }}</span>
          <el-select
            v-model="style.associativeLineTextFontSize"
            size="small"
            style="width: 80px"
            placeholder=""
            @change="update('associativeLineTextFontSize', $event)"
          >
            <el-option
              v-for="item in fontSizeList"
              :key="item"
              :label="item"
              :value="item"
              :style="{ fontSize: `${item}px` }"
            />
          </el-select>
        </div>
      </div>
    </div>
  </Sidebar>
</template>

<style lang="scss" scoped>
.sidebarContent {
  padding: 20px;
  padding-top: 10px;

  &.isDark {
    .title {
      color: #fff;
    }

    .row {
      .rowItem {
        .name {
          color: hsla(0, 0%, 100%, 0.6);
        }
      }
    }
  }

  .title {
    font-size: 16px;
    font-family:
      PingFangSC-Medium,
      PingFang SC;
    font-weight: 500;
    color: rgba(26, 26, 26, 0.9);
    margin-bottom: 10px;
    margin-top: 20px;

    &.noTop {
      margin-top: 0;
    }
  }

  .row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;

    .rowItem {
      display: flex;
      align-items: center;
      margin-bottom: 5px;

      .name {
        font-size: 12px;
        margin-right: 10px;
        white-space: nowrap;
      }

      .block {
        display: inline-block;
        width: 30px;
        height: 30px;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        cursor: pointer;
      }
    }
  }
}

.borderLine {
  display: inline-block;
  width: 100%;
  background-color: #000;

  &.isDark {
    background-color: #fff;
  }
}
</style>

<style lang="scss">
.el-select-dropdown__item.selected {
  .borderLine {
    background-color: var(--el-color-primary);
  }
}
</style>
