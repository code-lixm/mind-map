<script setup lang="ts">
import type { MindMap } from '../types'
import { computed, inject, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  backgroundPositionList,
  backgroundRepeatList,
  backgroundSizeList,
  borderDasharrayList,
  fontFamilyList,
  fontSizeList,
  lineStyleList,
  lineStyleMap,
  lineWidthList,
  rootLineKeepSameInCurveList,
} from '../config'
import {
  rainbowLinesOptions,
  supportLineRadiusLayouts,
  supportLineStyleLayoutsMap,
  supportNodeUseLineStyleLayouts,
  supportRootLineKeepSameInCurveLayouts,
} from '../config/constant'
import Color from './Color.vue'
import Sidebar from './Sidebar.vue'
import ImgUpload from './ImgUpload.vue'
import { useEditorState } from '../composables/useEditorState'

// Props
interface Props {
  mindMap: MindMap
  activeSidebar: string | null
  isDark: boolean
  bgList: string[]
}

const props = defineProps<Props>()

// 注入
const localeText = inject<any>('localeText', {})
const eventBus = inject<any>('eventBus')!

// Store
const editorStore = useEditorState()

// Refs
const sidebarRef = ref<InstanceType<typeof Sidebar>>()

// 状态
const activeTab = ref('color')
const marginActiveTab = ref('second')
const style = reactive<Record<string, any>>({
  backgroundColor: '',
  lineColor: '',
  lineWidth: '',
  lineStyle: '',
  showLineMarker: '',
  rootLineKeepSameInCurve: '',
  rootLineStartPositionKeepSameInCurve: '',
  lineRadius: 0,
  lineFlow: false,
  lineFlowForward: true,
  lineFlowDuration: 1,
  generalizationLineWidth: '',
  generalizationLineColor: '',
  associativeLineColor: '',
  associativeLineWidth: 0,
  associativeLineActiveWidth: 0,
  associativeLineDasharray: '',
  associativeLineActiveColor: '',
  associativeLineTextFontSize: 0,
  associativeLineTextColor: '',
  associativeLineTextFontFamily: '',
  paddingX: 0,
  paddingY: 0,
  imgMaxWidth: 0,
  imgMaxHeight: 0,
  iconSize: 0,
  backgroundImage: '',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: '',
  backgroundSize: '',
  marginX: 0,
  marginY: 0,
  nodeUseLineStyle: false,
})

const rainbowLinesPopoverVisible = ref(false)
const curRainbowLineColorList = ref<string[] | null>(null)
const currentLayout = ref('')
const outerFramePadding = reactive<Record<string, any>>({
  outerFramePaddingX: 0,
  outerFramePaddingY: 0,
})
const bgListExpand = ref(true)

// 将背景图片字符串转换为 ImgUpload 组件所需的 FileInfo 格式
const backgroundImageForUpload = computed({
  get: () => {
    const url = style.backgroundImage
    if (!url || url === '' || url === 'none') {
      return null
    }
    // 如果是 URL 字符串，转换为 FileInfo 对象
    return {
      fileId: url,
      fileName: 'background',
    }
  },
  set: (value: any) => {
    if (!value || !value.fileId) {
      update('backgroundImage', '')
    }
    else {
      update('backgroundImage', value.fileId)
    }
  },
})

// 计算属性（直接使用中文配置）
const lineStyleListShow = computed(() => {
  const list = lineStyleList
  const res: typeof list = []
  list.forEach((item) => {
    const layoutList = supportLineStyleLayoutsMap[item.value]
    if (layoutList) {
      if (layoutList.includes(currentLayout.value)) {
        res.push(item)
      }
    }
    else {
      res.push(item)
    }
  })
  return res
})

const rootLineKeepSameInCurveListComputed = computed(() => {
  return rootLineKeepSameInCurveList
})

const backgroundRepeatListComputed = computed(() => {
  return backgroundRepeatList
})

const backgroundPositionListComputed = computed(() => {
  return backgroundPositionList
})

const backgroundSizeListComputed = computed(() => {
  return backgroundSizeList
})

const fontFamilyListComputed = computed(() => {
  return fontFamilyList
})

const borderDasharrayListComputed = computed(() => {
  return borderDasharrayList
})

const showNodeUseLineStyle = computed(() => {
  return supportNodeUseLineStyleLayouts.includes(currentLayout.value)
})

const showLineRadius = computed(() => {
  return (
    style.lineStyle === 'straight'
    && supportLineRadiusLayouts.includes(currentLayout.value)
  )
})

const showRootLineKeepSameInCurveLayouts = computed(() => {
  return supportRootLineKeepSameInCurveLayouts.includes(currentLayout.value)
})

// 监听器
watch(
  () => props.activeSidebar,
  (val) => {
    if (val === 'baseStyle') {
      if (sidebarRef.value)
        sidebarRef.value.show = true
      initStyle()
      initRainbowLines()
      initOuterFramePadding()
      currentLayout.value = props.mindMap.getLayout()
    }
    else {
      if (sidebarRef.value)
        sidebarRef.value.show = false
    }
  },
)

watch(
  lineStyleListShow,
  () => {
    const has = lineStyleListShow.value.find((item) => {
      return item.value === style.lineStyle
    })
    if (!has && lineStyleListShow.value.length > 0) {
      style.lineStyle = lineStyleListShow.value[0].value
    }
  },
  { deep: true },
)

// 方法
function onSetData() {
  if (props.activeSidebar !== 'baseStyle')
    return
  setTimeout(() => {
    initStyle()
  }, 0)
}

function initStyle() {
  Object.keys(style).forEach((key) => {
    style[key] = props.mindMap.getThemeConfig(key)
    if (key === 'backgroundImage' && style[key] === 'none') {
      style[key] = ''
    }
  })
  initMarginStyle()
}

function initRainbowLines() {
  const config = props.mindMap.getConfig('rainbowLinesConfig') || {}
  curRainbowLineColorList.value = config.open
    ? props.mindMap.rainbowLines
      ? props.mindMap.rainbowLines.getColorsList()
      : null
    : null
}

function initOuterFramePadding() {
  outerFramePadding.outerFramePaddingX = props.mindMap.getConfig('outerFramePaddingX')
  outerFramePadding.outerFramePaddingY = props.mindMap.getConfig('outerFramePaddingX')
}

function initMarginStyle() {
  ;['marginX', 'marginY'].forEach((key) => {
    const themeConfig = props.mindMap.getThemeConfig()
    if (themeConfig[marginActiveTab.value]) {
      style[key] = themeConfig[marginActiveTab.value][key]
    }
  })
}

function update(key: string, value: any) {
  if (key === 'backgroundImage' && value === 'none') {
    style[key] = ''
  }
  else {
    style[key] = value
  }
  eventBus.emit('showLoading')
  const config = props.mindMap.getThemeConfig()
  props.mindMap.setThemeConfig({
    ...config,
    [key]: value,
  })
}

function updateRainbowLinesConfig(item: any) {
  rainbowLinesPopoverVisible.value = false
  curRainbowLineColorList.value = item.list || null
  let newConfig = null
  if (item.list) {
    newConfig = {
      open: true,
      colorsList: item.list,
    }
  }
  else {
    newConfig = {
      open: false,
    }
  }
  props.mindMap.rainbowLines.updateRainLinesConfig(newConfig)
}

function updateOuterFramePadding(prop: string, value: any) {
  outerFramePadding[prop] = value
  props.mindMap.updateConfig({
    [prop]: value,
  })
  props.mindMap.render()
}

function updateMargin(type: string, value: any) {
  style[type] = value
  const themeConfig = props.mindMap.getThemeConfig()
  const tabConfig = themeConfig[marginActiveTab.value] || {}

  props.mindMap.setThemeConfig({
    ...themeConfig,
    [marginActiveTab.value]: {
      ...tabConfig,
      [type]: value,
    },
  })
}

function useBg(bg: string) {
  update('backgroundImage', bg)
}

// 处理Sidebar关闭事件
function handleUpdateActiveSidebar(value: string | null) {
  editorStore.setActiveSidebar(value)
}

// 生命周期
eventBus.on('setData', onSetData)
onBeforeUnmount(() => {
  eventBus.off('setData', onSetData)
})
</script>

<template>
  <Sidebar
    ref="sidebarRef"
    :title="localeText.baseStyle?.title || '基础样式'"
    @update:active-sidebar="handleUpdateActiveSidebar"
  >
    <div
      v-if="mindMap"
      class="sidebarContent customScrollbar"
      :class="{ isDark }"
    >
      <!-- 背景 -->
      <div class="title noTop">
        {{ localeText.baseStyle?.background || '背景' }}
      </div>
      <div class="row">
        <el-tabs v-model="activeTab" class="tab">
          <el-tab-pane :label="localeText.baseStyle?.color || '颜色'" name="color">
            <Color
              :color="style.backgroundColor"
              @change="(color) => update('backgroundColor', color)"
            />
          </el-tab-pane>
          <el-tab-pane :label="localeText.baseStyle?.image || '图片'" name="image">
            <ImgUpload
              v-model="backgroundImageForUpload"
              class="imgUpload"
            />
            <!-- 图片重复方式 -->
            <div class="rowItem">
              <span class="name">{{ localeText.baseStyle?.imageRepeat || '图片重复' }}</span>
              <el-select
                v-model="style.backgroundRepeat"
                size="small"
                style="width: 120px"
                placeholder=""
                @change="(value) => update('backgroundRepeat', value)"
              >
                <el-option
                  v-for="item in backgroundRepeatListComputed"
                  :key="item.value"
                  :label="item.name"
                  :value="item.value"
                />
              </el-select>
            </div>
            <!-- 图片位置 -->
            <div class="rowItem">
              <span class="name">{{ localeText.baseStyle?.imagePosition || '图片位置' }}</span>
              <el-select
                v-model="style.backgroundPosition"
                size="small"
                style="width: 120px"
                placeholder=""
                @change="(value) => update('backgroundPosition', value)"
              >
                <el-option
                  v-for="item in backgroundPositionListComputed"
                  :key="item.value"
                  :label="item.name"
                  :value="item.value"
                />
              </el-select>
            </div>
            <!-- 图片大小 -->
            <div class="rowItem">
              <span class="name">{{ localeText.baseStyle?.imageSize || '图片大小' }}</span>
              <el-select
                v-model="style.backgroundSize"
                size="small"
                style="width: 120px"
                placeholder=""
                @change="(value) => update('backgroundSize', value)"
              >
                <el-option
                  v-for="item in backgroundSizeListComputed"
                  :key="item.value"
                  :label="item.name"
                  :value="item.value"
                />
              </el-select>
            </div>
            <!-- 内置背景图片 -->
            <div
              v-if="bgList.length > 0"
              class="rowItem spaceBetween"
              style="margin-top: 8px; margin-bottom: 8px;"
            >
              <div class="name">
                {{ localeText.baseStyle?.builtInBackgroundImage || '内置背景图片' }}
              </div>
              <div
                class="iconBtn i-ep:arrow-down"
                :class="{ top: !bgListExpand }"
                @click="bgListExpand = !bgListExpand"
              />
            </div>
            <div class="bgList" :class="{ expand: bgListExpand }">
              <div
                v-for="(item, index) in bgList"
                :key="index"
                class="bgItem"
                :class="{ active: style.backgroundImage === item }"
                @click="useBg(item)"
              >
                <img :src="item" alt="">
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <!-- 连线 -->
      <div class="title">
        {{ localeText.baseStyle?.line || '连线' }}
      </div>
      <div class="row">
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.color || '颜色' }}</span>
          <el-popover placement="bottom" trigger="click" width="260">
            <template #reference>
              <span
                class="block"
                :style="{ backgroundColor: style.lineColor }"
              />
            </template>
            <Color
              :color="style.lineColor"
              @change="(color) => update('lineColor', color)"
            />
          </el-popover>
        </div>
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.width || '宽度' }}</span>
          <el-select
            v-model="style.lineWidth"
            size="small"
            style="width: 80px"
            placeholder=""
            @change="(value) => update('lineWidth', value)"
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
        <!-- 线宽 -->
        <div v-if="lineStyleListShow.length > 1" class="rowItem">
          <span class="name">{{ localeText.baseStyle?.style || '样式' }}</span>
          <el-select
            v-model="style.lineStyle"
            size="small"
            style="width: 80px"
            placeholder=""
            @change="(value) => update('lineStyle', value)"
          >
            <el-option
              v-for="item in lineStyleListShow"
              :key="item.value"
              :label="item.name"
              :value="item.value"
              class="lineStyleOption"
              :class="{
                isDark,
                isSelected: style.lineStyle === item.value,
              }"
            >
              <span v-html="lineStyleMap[item.value]" />
            </el-option>
          </el-select>
        </div>
        <!-- 根节点连线样式 -->
        <div
          v-if="style.lineStyle === 'curve' && showRootLineKeepSameInCurveLayouts"
          class="rowItem"
        >
          <span class="name">{{ localeText.baseStyle?.rootStyle || '根节点样式' }}</span>
          <el-select
            v-model="style.rootLineKeepSameInCurve"
            size="small"
            style="width: 80px"
            placeholder=""
            @change="(value) => update('rootLineKeepSameInCurve', value)"
          >
            <el-option
              v-for="item in rootLineKeepSameInCurveListComputed"
              :key="String(item.value)"
              :label="item.name"
              :value="item.value"
            />
          </el-select>
        </div>
        <div v-if="showLineRadius" class="rowItem">
          <!-- 连线圆角大小 -->
          <span class="name">{{ localeText.baseStyle?.lineRadius || '连线圆角' }}</span>
          <el-select
            v-model="style.lineRadius"
            size="small"
            style="width: 80px"
            placeholder=""
            @change="(value) => update('lineRadius', value)"
          >
            <el-option
              v-for="item in [0, 2, 5, 7, 10, 12, 15]"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </div>
      </div>
      <div class="row">
        <!-- 根节点连线起始位置 -->
        <div
          v-if="style.lineStyle === 'curve' && showRootLineKeepSameInCurveLayouts"
          class="rowItem"
        >
          <span class="name">{{ localeText.baseStyle?.rootLineStartPos || '根节点连线起始位置' }}</span>
          <el-select
            v-model="style.rootLineStartPositionKeepSameInCurve"
            size="small"
            style="width: 80px"
            placeholder=""
            @change="(value) => update('rootLineStartPositionKeepSameInCurve', value)"
          >
            <el-option
              key="center"
              :label="localeText.baseStyle?.center || '居中'"
              :value="false"
            />
            <el-option
              key="right"
              :label="localeText.baseStyle?.edge || '边缘'"
              :value="true"
            />
          </el-select>
        </div>
      </div>
      <div class="row">
        <div class="rowItem">
          <el-checkbox
            v-model="style.showLineMarker"
            @change="(value) => update('showLineMarker', value)"
          >
            {{ localeText.baseStyle?.showArrow || '显示箭头' }}
          </el-checkbox>
        </div>
      </div>
      <!-- 彩虹线条 -->
      <div class="title">
        {{ localeText.baseStyle?.rainbowLines || '彩虹线条' }}
      </div>
      <div class="row">
        <div class="rowItem">
          <el-popover
            v-model:visible="rainbowLinesPopoverVisible"
            placement="right"
            trigger="click"
            width="320"
          >
            <div class="rainbowLinesOptionsBox" :class="{ isDark }">
              <div
                v-for="item in rainbowLinesOptions"
                :key="item.value"
                class="optionItem"
              >
                <div
                  v-if="item.list"
                  class="colorsBar"
                  @click="updateRainbowLinesConfig(item)"
                >
                  <span
                    v-for="color in item.list"
                    :key="color"
                    class="colorItem"
                    :style="{ backgroundColor: color }"
                  />
                </div>
                <span v-else @click="updateRainbowLinesConfig(item)">
                  {{ localeText.baseStyle?.notUseRainbowLines || '不使用彩虹线条' }}
                </span>
              </div>
            </div>
            <template #reference>
              <div class="curRainbowLine">
                <div v-if="curRainbowLineColorList" class="colorsBar">
                  <span
                    v-for="color in curRainbowLineColorList"
                    :key="color"
                    class="colorItem"
                    :style="{ backgroundColor: color }"
                  />
                </div>
                <span v-else>{{ localeText.baseStyle?.notUseRainbowLines || '不使用彩虹线条' }}</span>
              </div>
            </template>
          </el-popover>
        </div>
      </div>
      <!-- 概要连线 -->
      <div class="title">
        {{ localeText.baseStyle?.lineOfOutline || '概要连线' }}
      </div>
      <div class="row">
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.color || '颜色' }}</span>
          <el-popover placement="bottom" trigger="click" width="260">
            <template #reference>
              <span
                class="block"
                :style="{ backgroundColor: style.generalizationLineColor }"
              />
            </template>
            <Color
              :color="style.generalizationLineColor"
              @change="(color) => update('generalizationLineColor', color)"
            />
          </el-popover>
        </div>
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.width || '宽度' }}</span>
          <el-select
            v-model="style.generalizationLineWidth"
            size="small"
            style="width: 80px"
            placeholder=""
            @change="(value) => update('generalizationLineWidth', value)"
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
      <!-- 关联线 -->
      <div class="title">
        {{ localeText.baseStyle?.associativeLine || '关联线' }}
      </div>
      <div class="row">
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.associativeLineColor || '关联线颜色' }}</span>
          <el-popover placement="bottom" trigger="click" width="260">
            <template #reference>
              <span
                class="block"
                :style="{ backgroundColor: style.associativeLineColor }"
              />
            </template>
            <Color
              :color="style.associativeLineColor"
              @change="(color) => update('associativeLineColor', color)"
            />
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
          <el-popover placement="bottom" trigger="click" width="260">
            <template #reference>
              <span
                class="block"
                :style="{ backgroundColor: style.associativeLineActiveColor }"
              />
            </template>
            <Color
              :color="style.associativeLineActiveColor"
              @change="(color) => update('associativeLineActiveColor', color)"
            />
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
      <div class="title">
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
          <el-popover placement="bottom" trigger="click" width="260">
            <template #reference>
              <span
                class="block"
                :style="{ backgroundColor: style.associativeLineTextColor }"
              />
            </template>
            <Color
              :color="style.associativeLineTextColor"
              @change="(color) => update('associativeLineTextColor', color)"
            />
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
      <!-- 节点边框风格 -->
      <template v-if="showNodeUseLineStyle">
        <div class="title">
          {{ localeText.baseStyle?.nodeBorderType || '节点边框风格' }}
        </div>
        <div class="row">
          <div class="rowItem">
            <el-checkbox
              v-model="style.nodeUseLineStyle"
              @change="(value) => update('nodeUseLineStyle', value)"
            >
              {{ localeText.baseStyle?.nodeUseLineStyle || '节点使用连线样式' }}
            </el-checkbox>
          </div>
        </div>
      </template>
      <!-- 内边距 -->
      <div class="title">
        {{ localeText.baseStyle?.nodePadding || '节点内边距' }}
      </div>
      <div class="row noBottom">
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.horizontal || '水平' }}</span>
          <el-slider
            v-model="style.paddingX"
            style="width: 200px"
            @change="(value) => update('paddingX', value)"
          />
        </div>
      </div>
      <div class="row">
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.vertical || '垂直' }}</span>
          <el-slider
            v-model="style.paddingY"
            style="width: 200px"
            @change="(value) => update('paddingY', value)"
          />
        </div>
      </div>
      <!-- 图片 -->
      <div class="title">
        {{ localeText.baseStyle?.image || '图片' }}
      </div>
      <div class="row noBottom">
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.maximumWidth || '最大宽度' }}</span>
          <el-slider
            v-model="style.imgMaxWidth"
            style="width: 140px"
            :min="10"
            :max="500"
            @change="(value) => update('imgMaxWidth', value)"
          />
        </div>
      </div>
      <div class="row">
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.maximumHeight || '最大高度' }}</span>
          <el-slider
            v-model="style.imgMaxHeight"
            style="width: 140px"
            :min="10"
            :max="500"
            @change="(value) => update('imgMaxHeight', value)"
          />
        </div>
      </div>
      <!-- 图标 -->
      <div class="title">
        {{ localeText.baseStyle?.icon || '图标' }}
      </div>
      <div class="row">
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.size || '大小' }}</span>
          <el-slider
            v-model="style.iconSize"
            style="width: 200px"
            :min="12"
            :max="50"
            @change="(value) => update('iconSize', value)"
          />
        </div>
      </div>
      <!-- 二级节点外边距 -->
      <div class="title">
        {{ localeText.baseStyle?.nodeMargin || '节点外边距' }}
      </div>
      <div class="row column noBottom">
        <el-tabs
          v-model="marginActiveTab"
          class="tab"
          @tab-click="initMarginStyle"
        >
          <el-tab-pane
            :label="localeText.baseStyle?.level2Node || '二级节点'"
            name="second"
          />
          <el-tab-pane
            :label="localeText.baseStyle?.belowLevel2Node || '二级以下节点'"
            name="node"
          />
        </el-tabs>
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.horizontal || '水平' }}</span>
          <el-slider
            v-model="style.marginX"
            :max="200"
            style="width: 200px"
            @change="(value) => updateMargin('marginX', value)"
          />
        </div>
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.vertical || '垂直' }}</span>
          <el-slider
            v-model="style.marginY"
            :max="200"
            style="width: 200px"
            @change="(value) => updateMargin('marginY', value)"
          />
        </div>
      </div>
      <!-- 外框内边距 -->
      <div class="title">
        {{ localeText.baseStyle?.outerFramePadding || '外框内边距' }}
      </div>
      <div class="row noBottom">
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.horizontal || '水平' }}</span>
          <el-slider
            v-model="outerFramePadding.outerFramePaddingX"
            style="width: 200px"
            @change="(value) => updateOuterFramePadding('outerFramePaddingX', value)"
          />
        </div>
      </div>
      <div class="row">
        <div class="rowItem">
          <span class="name">{{ localeText.baseStyle?.vertical || '垂直' }}</span>
          <el-slider
            v-model="outerFramePadding.outerFramePaddingY"
            style="width: 200px"
            @change="(value) => updateOuterFramePadding('outerFramePaddingY', value)"
          />
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
        .name,
        .curRainbowLine {
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
    margin-top: 35px;

    &.noTop {
      margin-top: 0;
    }
  }

  .row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;

    &.noBottom {
      margin-bottom: 0;
    }

    &.column {
      flex-direction: column;
    }

    .tab {
      width: 100%;
    }

    .imgUpload {
      margin-bottom: 5px;
    }

    .btnGroup {
      width: 100%;
      display: flex;
      justify-content: space-between;
    }

    .rowItem {
      display: flex;
      align-items: center;
      margin-bottom: 5px;

      &.spaceBetween {
        justify-content: space-between;
      }

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

      .curRainbowLine {
        height: 24px;
        border: 1px solid #dcdfe6;
        font-size: 12px;
        width: 240px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .iconBtn {
        cursor: pointer;
        transition: all 0.3s;

        &.top {
          transform: rotateZ(-180deg);
        }
      }
    }

    .styleBtn {
      position: relative;
      width: 50px;
      height: 30px;
      background: #fff;
      border: 1px solid #eee;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: bold;
      cursor: pointer;
      border-radius: 4px;

      &.actived {
        background-color: #eee;
      }

      .colorShow {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 2px;
      }
    }

    .bgList {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      height: 75px;

      &.expand {
        height: max-content;
      }

      .bgItem {
        width: 120px;
        height: 73px;
        border: 1px solid #e9e9e9;
        border-radius: 5px;
        overflow: hidden;
        padding: 5px;
        margin-bottom: 8px;
        cursor: pointer;

        &.active {
          border-color: var(--el-color-primary);
        }

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
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

.lineStyleOption {
  &.isDark {
    svg {
      path {
        stroke: #fff;
      }
    }
  }

  &.isSelected {
    svg {
      path {
        stroke: var(--el-color-primary);
      }
    }
  }

  svg {
    margin-top: 4px;

    path {
      stroke: #000;
    }
  }
}

.rainbowLinesOptionsBox {
  min-width: 280px;
  padding: 4px 0;

  &.isDark {
    .optionItem {
      color: hsla(0, 0%, 100%, 0.6);

      &:hover {
        background-color: hsla(0, 0%, 100%, 0.05);
      }
    }
  }

  .optionItem {
    width: 100%;
    height: 34px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;

    &:hover {
      background-color: #f5f7fa;
    }
  }
}

.colorsBar {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;

  .colorItem {
    flex: 1;
    height: 15px;
  }
}
</style>
