<script setup lang="ts">
import type { MindMap } from '../types'
import { computed, inject, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  alignList,
  borderDasharrayList,
  borderRadiusList,
  borderWidthList,
  fontFamilyList,
  fontSizeList,
  linearGradientDirList,
  shapeList,
  shapeListMap,
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
const eventBus = inject<any>('eventBus')!

// Store
const editorStore = useEditorState()

// Refs
const sidebarRef = ref<InstanceType<typeof Sidebar>>()

// 状态
const activeNodes = ref<any[]>([])
const style = reactive<Record<string, any>>({
  shape: '',
  paddingX: 0,
  paddingY: 0,
  color: '',
  fontFamily: '',
  fontSize: '',
  textDecoration: '',
  fontWeight: '',
  fontStyle: '',
  borderWidth: '',
  borderColor: '',
  fillColor: '',
  borderDasharray: '',
  borderRadius: '',
  lineColor: '',
  lineDasharray: '',
  lineWidth: '',
  lineMarkerDir: '',
  gradientStyle: false,
  startColor: '',
  endColor: '',
  linearGradientDir: '',
  lineFlow: false,
  lineFlowForward: true,
  lineFlowDuration: 1,
  textAlign: '',
  imgPlacement: '',
  tagPlacement: '',
})

// 计算属性（直接使用中文配置）
const fontFamilyListComputed = computed(() => {
  return fontFamilyList
})

const borderDasharrayListComputed = computed(() => {
  return borderDasharrayList
})

const shapeListComputed = computed(() => {
  return [
    ...shapeList,
    ...props.mindMap.extendShapeList
      .filter(item => !['fishHead'].includes(item.name))
      .map(item => ({
        width: '40px',
        name: item.nameShow,
        value: item.name,
      })),
  ]
})

const shapeListMapComputed = computed(() => {
  const map2: Record<string, string> = {}
  props.mindMap.extendShapeList.forEach((item) => {
    map2[item.name] = item.path
  })
  return {
    ...shapeListMap,
    ...map2,
  }
})

const linearGradientDirListComputed = computed(() => {
  return linearGradientDirList
})

const alignListComputed = computed(() => {
  return alignList
})

const hasHyperlink = computed(() => {
  return (
    activeNodes.value.length > 0 && activeNodes.value[0].getData('hyperlink')
  )
})

// 监听器
watch(
  () => props.activeSidebar,
  (val) => {
    if (val === 'nodeStyle') {
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
function onNodeActive(_node: any, nodes: any[]) {
  nextTick(() => {
    activeNodes.value = nodes ? [...nodes] : []
    initNodeStyle()
  })
}

function initNodeStyle() {
  if (activeNodes.value.length <= 0)
    return

  Object.keys(style).forEach((item) => {
    style[item] = activeNodes.value[0].getStyle(item, false)
  })
  initLinearGradientDir()
}

function initLinearGradientDir() {
  const startDir = activeNodes.value[0].getStyle('startDir', false)
  const endDir = activeNodes.value[0].getStyle('endDir', false)
  const target = linearGradientDirListComputed.value.find((item) => {
    return (
      item.start[0] === startDir[0]
      && item.start[1] === startDir[1]
      && item.end[0] === endDir[0]
      && item.end[1] === endDir[1]
    )
  })
  if (target)
    style.linearGradientDir = target.value
}

function update(prop: string) {
  if (prop === 'linearGradientDir') {
    const target = linearGradientDirListComputed.value.find((item) => {
      return item.value === style.linearGradientDir
    })
    if (target) {
      activeNodes.value.forEach((node) => {
        node.setStyles({
          startDir: [...target.start],
          endDir: [...target.end],
        })
      })
    }
  }
  else {
    activeNodes.value.forEach((node) => {
      node.setStyle(prop, style[prop])
    })
  }
}

function toggleFontWeight() {
  if (style.fontWeight === 'bold')
    style.fontWeight = 'normal'
  else
    style.fontWeight = 'bold'

  update('fontWeight')
}

function toggleFontStyle() {
  if (style.fontStyle === 'italic')
    style.fontStyle = 'normal'
  else
    style.fontStyle = 'italic'

  update('fontStyle')
}

function changeFontColor(color: string) {
  style.color = color
  update('color')
}

function changeBorderColor(color: string) {
  style.borderColor = color
  update('borderColor')
}

function changeLineColor(color: string) {
  style.lineColor = color
  update('lineColor')
}

function changeFillColor(color: string) {
  style.fillColor = color
  update('fillColor')
}

function changeStartColor(color: string) {
  style.startColor = color
  update('startColor')
}

function changeEndColor(color: string) {
  style.endColor = color
  update('endColor')
}

// 打开超链接设置对话框
function openHyperlink() {
  eventBus.emit('showNodeLink')
}

// 处理Sidebar关闭事件
function handleUpdateActiveSidebar(value: string | null) {
  editorStore.setActiveSidebar(value)
}

// 生命周期
eventBus.on('node_active', onNodeActive)
onBeforeUnmount(() => {
  eventBus.off('node_active', onNodeActive)
})
</script>

<template>
  <Sidebar
    ref="sidebarRef"
    :title="localeText.style?.title || '样式'"
    @update:active-sidebar="handleUpdateActiveSidebar"
  >
    <div v-if="activeNodes.length > 0" class="styleBox" :class="{ isDark }">
      <div class="sidebarContent customScrollbar">
        <!-- 文字 -->
        <div class="title noTop">
          {{ localeText.style?.text || '文字' }}
        </div>
        <div class="row">
          <div class="rowItem">
            <el-select
              v-model="style.fontFamily"
              size="small"
              style="width: 100px"
              placeholder=""
              @change="update('fontFamily')"
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
          <div class="rowItem">
            <el-select
              v-model="style.fontSize"
              size="small"
              style="width: 60px"
              placeholder=""
              @change="update('fontSize')"
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
          <div class="rowItem">
            <el-select
              v-model="style.textAlign"
              size="small"
              style="width: 80px"
              placeholder=""
              @change="update('textAlign')"
            >
              <el-option
                v-for="item in alignListComputed"
                :key="item.value"
                :label="item.name"
                :value="item.value"
              />
            </el-select>
          </div>
        </div>
        <div class="row">
          <div class="btnGroup">
            <el-tooltip :content="localeText.style?.color || '颜色'" placement="bottom">
              <div class="styleBtn">
                A
                <span
                  class="colorShow"
                  :style="{ backgroundColor: style.color || '#eee' }"
                />
              </div>
            </el-tooltip>
            <el-tooltip :content="localeText.style?.addFontWeight || '加粗'" placement="bottom">
              <div
                class="styleBtn"
                :class="{ actived: style.fontWeight === 'bold' }"
                @click="toggleFontWeight"
              >
                B
              </div>
            </el-tooltip>
            <el-tooltip :content="localeText.style?.italic || '斜体'" placement="bottom">
              <div
                class="styleBtn i"
                :class="{ actived: style.fontStyle === 'italic' }"
                @click="toggleFontStyle"
              >
                I
              </div>
            </el-tooltip>
            <el-tooltip :content="localeText.style?.textDecoration || '下划线'" placement="bottom">
              <div
                class="styleBtn u"
                :style="{ textDecoration: style.textDecoration || 'none' }"
              >
                U
              </div>
            </el-tooltip>
            <el-tooltip :content="localeText.style?.hyperlink || '超链接'" placement="bottom">
              <div
                class="styleBtn link"
                :class="{ actived: hasHyperlink }"
                @click="openHyperlink"
              >
                🔗
              </div>
            </el-tooltip>
          </div>
          <el-popover placement="bottom" trigger="hover">
            <Color :color="style.color" @change="changeFontColor" />
            <template #reference>
              <span />
            </template>
          </el-popover>
          <el-popover placement="bottom" trigger="hover">
            <el-radio-group
              v-model="style.textDecoration"
              size="small"
              @change="update('textDecoration')"
            >
              <el-radio-button label="none" value="none">
                {{ localeText.style?.none || '无' }}
              </el-radio-button>
              <el-radio-button label="underline" value="underline">
                {{ localeText.style?.underline || '下划线' }}
              </el-radio-button>
              <el-radio-button label="line-through" value="line-through">
                {{ localeText.style?.lineThrough || '删除线' }}
              </el-radio-button>
              <el-radio-button label="overline" value="overline">
                {{ localeText.style?.overline || '上划线' }}
              </el-radio-button>
            </el-radio-group>
            <template #reference>
              <span />
            </template>
          </el-popover>
        </div>
        <!-- 边框 -->
        <div class="title">
          {{ localeText.style?.border || '边框' }}
        </div>
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.style?.color || '颜色' }}</span>
            <el-popover placement="bottom" trigger="hover" width="260">
              <Color :color="style.borderColor" @change="changeBorderColor" />
              <template #reference>
                <span
                  class="block"
                  :style="{ width: '80px', backgroundColor: style.borderColor }"
                />
              </template>
            </el-popover>
          </div>
          <div class="rowItem">
            <span class="name">{{ localeText.style?.style || '样式' }}</span>
            <el-select
              v-model="style.borderDasharray"
              size="small"
              style="width: 80px"
              placeholder=""
              @change="update('borderDasharray')"
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
                      style.borderDasharray === item.value
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
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.style?.width || '宽度' }}</span>
            <el-select
              v-model="style.borderWidth"
              size="small"
              style="width: 80px"
              placeholder=""
              @change="update('borderWidth')"
            >
              <el-option
                v-for="item in borderWidthList"
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
          <div v-show="style.shape === 'rectangle'" class="rowItem">
            <span class="name">{{ localeText.style?.borderRadius || '圆角' }}</span>
            <el-select
              v-model="style.borderRadius"
              size="small"
              style="width: 80px"
              placeholder=""
              @change="update('borderRadius')"
            >
              <el-option
                v-for="item in borderRadiusList"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </div>
        </div>
        <!-- 背景 -->
        <div class="title">
          {{ localeText.style?.background || '背景' }}
        </div>
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.style?.color || '颜色' }}</span>
            <el-popover placement="bottom" trigger="hover" width="260">
              <Color :color="style.fillColor" @change="changeFillColor" />
              <template #reference>
                <span
                  class="block"
                  :style="{ backgroundColor: style.fillColor }"
                />
              </template>
            </el-popover>
            <span class="name" style="margin-left: 20px;">
              {{ localeText.style?.gradientStyle || '渐变' }}
            </span>
            <el-checkbox
              v-model="style.gradientStyle"
              @change="update('gradientStyle')"
            />
          </div>
        </div>
        <div v-if="style.gradientStyle" class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.style?.startColor || '起始颜色' }}</span>
            <el-popover placement="bottom" trigger="hover" width="260">
              <Color :color="style.startColor" @change="changeStartColor" />
              <template #reference>
                <span
                  class="block"
                  :style="{ backgroundColor: style.startColor }"
                />
              </template>
            </el-popover>
          </div>
          <div class="rowItem">
            <span class="name">{{ localeText.style?.endColor || '结束颜色' }}</span>
            <el-popover placement="bottom" trigger="hover" width="260">
              <Color :color="style.endColor" @change="changeEndColor" />
              <template #reference>
                <span
                  class="block"
                  :style="{ backgroundColor: style.endColor }"
                />
              </template>
            </el-popover>
          </div>
          <div class="rowItem">
            <span class="name">{{ localeText.style?.direction || '方向' }}</span>
            <el-select
              v-model="style.linearGradientDir"
              size="small"
              style="width: 80px"
              placeholder=""
              @change="update('linearGradientDir')"
            >
              <el-option
                v-for="item in linearGradientDirListComputed"
                :key="item.value"
                :label="item.name"
                :value="item.value"
              />
            </el-select>
          </div>
        </div>
        <!-- 形状 -->
        <div class="title">
          {{ localeText.style?.shape || '形状' }}
        </div>
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.style?.shape || '形状' }}</span>
            <el-select
              v-model="style.shape"
              size="small"
              style="width: 120px"
              placeholder=""
              @change="update('shape')"
            >
              <el-option
                v-for="item in shapeListComputed"
                :key="item.value"
                :label="item.name"
                :value="item.value"
                style="display: flex; justify-content: center; align-items: center;"
              >
                <svg
                  :width="(item as any).width || 60"
                  :height="(item as any).height || 26"
                  style="margin-top: 5px"
                >
                  <path
                    :d="shapeListMapComputed[item.value]"
                    fill="none"
                    :stroke="
                      style.shape === item.value
                        ? 'var(--el-color-primary)'
                        : isDark
                          ? '#fff'
                          : '#000'
                    "
                    stroke-width="2"
                  />
                </svg>
              </el-option>
            </el-select>
          </div>
        </div>
        <!-- 线条 -->
        <div class="title">
          {{ localeText.style?.line || '线条' }}
        </div>
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.style?.color || '颜色' }}</span>
            <el-popover placement="bottom" trigger="hover" width="260">
              <Color :color="style.lineColor" @change="changeLineColor" />
              <template #reference>
                <span
                  class="block"
                  :style="{ width: '80px', backgroundColor: style.lineColor }"
                />
              </template>
            </el-popover>
          </div>
          <div class="rowItem">
            <span class="name">{{ localeText.style?.style || '样式' }}</span>
            <el-select
              v-model="style.lineDasharray"
              size="small"
              style="width: 80px"
              placeholder=""
              @change="update('lineDasharray')"
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
                      style.lineDasharray === item.value
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
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.style?.width || '宽度' }}</span>
            <el-select
              v-model="style.lineWidth"
              size="small"
              style="width: 80px"
              placeholder=""
              @change="update('lineWidth')"
            >
              <el-option
                v-for="item in borderWidthList"
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
          <div class="rowItem">
            <span class="name">{{ localeText.style?.arrowDir || '箭头方向' }}</span>
            <el-select
              v-model="style.lineMarkerDir"
              size="small"
              style="width: 80px"
              placeholder=""
              @change="update('lineMarkerDir')"
            >
              <el-option
                key="start"
                :label="localeText.style?.arrowDirStart || '起点'"
                value="start"
              />
              <el-option
                key="end"
                :label="localeText.style?.arrowDirEnd || '终点'"
                value="end"
              />
            </el-select>
          </div>
        </div>
        <!-- 节点内边距 -->
        <div class="title">
          {{ localeText.style?.nodePadding || '节点内边距' }}
        </div>
        <div class="row noBottom">
          <div class="rowItem">
            <span class="name">{{ localeText.style?.horizontal || '水平' }}</span>
            <el-slider
              v-model="style.paddingX"
              style="width: 200px"
              @change="update('paddingX')"
            />
          </div>
        </div>
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.style?.vertical || '垂直' }}</span>
            <el-slider
              v-model="style.paddingY"
              style="width: 200px"
              @change="update('paddingY')"
            />
          </div>
        </div>
        <!-- 节点图片布局 -->
        <div class="title">
          {{ localeText.style?.img || '图片' }}
        </div>
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.style?.placement || '位置' }}</span>
            <el-radio-group
              v-model="style.imgPlacement"
              size="small"
              @change="update('imgPlacement')"
            >
              <el-radio-button label="top" value="top">
                {{ localeText.style?.top || '上' }}
              </el-radio-button>
              <el-radio-button label="bottom" value="bottom">
                {{ localeText.style?.bottom || '下' }}
              </el-radio-button>
              <el-radio-button label="left" value="left">
                {{ localeText.style?.left || '左' }}
              </el-radio-button>
              <el-radio-button label="right" value="right">
                {{ localeText.style?.right || '右' }}
              </el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <!-- 节点标签布局 -->
        <div class="title">
          {{ localeText.style?.tag || '标签' }}
        </div>
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.style?.placement || '位置' }}</span>
            <el-radio-group
              v-model="style.tagPlacement"
              size="small"
              @change="update('tagPlacement')"
            >
              <el-radio-button label="right" value="right">
                {{ localeText.style?.right || '右' }}
              </el-radio-button>
              <el-radio-button label="bottom" value="bottom">
                {{ localeText.style?.bottom || '下' }}
              </el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="tipBox">
      <div class="tipIcon iconfont icontianjiazijiedian" />
      <div class="tipText">
        {{ localeText.style?.selectNodeTip || '请选择节点' }}
      </div>
    </div>
  </Sidebar>
</template>

<style lang="scss" scoped>
.styleBox {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  &.isDark {
    .sidebarContent {
      .title {
        color: #fff;
      }

      .row {
        .rowItem {
          .name {
            color: hsla(0, 0%, 100%, 0.6);
          }
        }

        .styleBtn {
          background-color: #363b3f;
          color: hsla(0, 0%, 100%, 0.6);
          border-color: hsla(0, 0%, 100%, 0.1);
        }
      }
    }
  }

  .tab {
    flex-grow: 0;
    flex-shrink: 0;
    padding: 0 20px;
  }
}

.tipBox {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #666;

  .tipIcon {
    font-size: 100px;
  }
}

.sidebarContent {
  padding: 20px;
  padding-top: 10px;

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

    .btnGroup {
      width: 100%;
      display: flex;
      justify-content: space-between;
    }

    .rowItem {
      display: flex;
      align-items: center;

      .name {
        font-size: 12px;
        margin-right: 10px;
      }

      .block {
        display: inline-block;
        width: 30px;
        height: 30px;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        cursor: pointer;

        &.disabled {
          background-color: #f5f7fa !important;
          border-color: #e4e7ed !important;
          color: #c0c4cc !important;
          cursor: not-allowed !important;
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

      &.disabled {
        background-color: #f5f7fa !important;
        border-color: #e4e7ed !important;
        color: #c0c4cc !important;
        cursor: not-allowed !important;
      }

      &.i {
        font-style: italic;
      }

      .colorShow {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 2px;
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
