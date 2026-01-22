<script setup lang="ts">
import type { MindMapInstance } from '../types'
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import OuterFrame from 'simple-mind-map/src/plugins/OuterFrame'
import {
  borderDasharrayList as borderDasharrayListZh,
  fontFamilyList as fontFamilyListZh,
} from '@/config/zh'
import {
  borderRadiusList,
  fontSizeList,
  lineHeightList,
  lineWidthList,
} from '@/config/constant'
import Color from './Color.vue'
import Sidebar from './Sidebar.vue'

// Props
interface Props {
  mindMap?: MindMapInstance
  isDark?: boolean
  activeSidebar?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  mindMap: undefined,
  isDark: false,
  activeSidebar: null,
})

// Emits
const emit = defineEmits<{
  'update:activeSidebar': [value: string | null]
}>()

// 注入文案
const localeText = inject<any>('localeText', {
  nodeOuterFrame: {
    nodeOuterFrameStyle: '外框样式',
    outerFrameSetting: '外框设置',
    deleteOuterFrame: '删除外框',
    boxStyle: '边框样式',
    boxColor: '边框颜色',
    radius: '圆角',
    fillColor: '填充颜色',
    outerFrameText: '外框文字',
    deleteOuterFrameText: '删除外框文字',
    fontFamily: '字体',
    color: '颜色',
    fontBold: '加粗',
    italic: '斜体',
    lineHeight: '行高',
    fontSize: '字号',
    textFill: '文字填充',
    textFillRadius: '文字填充圆角',
    textAlign: '对齐',
    left: '左对齐',
    center: '居中',
    right: '右对齐',
    paddingX: '水平内边距',
    paddingY: '垂直内边距',
  },
})

// Refs
const sidebarRef = ref<InstanceType<typeof Sidebar>>()

// 使用中文配置
const fontFamilyList = fontFamilyListZh
const borderDasharrayList = borderDasharrayListZh

// 状态
const styleConfig = ref<any>({
  ...OuterFrame.defaultStyle,
})

const paddingStyle = ref({
  paddingX: 0,
  paddingY: 0,
})

// 监听 activeSidebar 变化
watch(
  () => props.activeSidebar,
  (val) => {
    if (sidebarRef.value) {
      if (val === 'nodeOuterFrameStyle') {
        sidebarRef.value.show = true
      }
      else {
        sidebarRef.value.show = false
      }
    }
  },
)

// 外框激活处理
function onOuterFrameActive(el: any, parentNode: any, range: number[]) {
  // 取范围内第一个节点的外框样式
  const firstNode = parentNode.children[range[0]]
  const firstNodeOuterFrame = firstNode.getData('outerFrame')
  Object.keys(styleConfig.value).forEach((key) => {
    if (typeof firstNodeOuterFrame[key] !== 'undefined') {
      styleConfig.value[key] = firstNodeOuterFrame[key]
    }
    else {
      styleConfig.value[key] = OuterFrame.defaultStyle[key]
    }
  })
  const [pl, pt] = styleConfig.value.textFillPadding
  paddingStyle.value.paddingX = pl
  paddingStyle.value.paddingY = pt
  emit('update:activeSidebar', 'nodeOuterFrameStyle')
}

// 更新外框样式
function updateOuterFrame(key: string, val: any) {
  styleConfig.value[key] = val
  props.mindMap?.outerFrame.updateActiveOuterFrame({
    [key]: val,
  })
}

// 切换加粗样式
function toggleFontWeight() {
  const newValue = styleConfig.value.fontWeight === 'bold' ? 'normal' : 'bold'
  updateOuterFrame('fontWeight', newValue)
}

// 切换字体样式
function toggleFontStyle() {
  const newValue = styleConfig.value.fontStyle === 'italic' ? 'normal' : 'italic'
  updateOuterFrame('fontStyle', newValue)
}

// 更新内边距
function updatePadding(dir: 'x' | 'y', value: number) {
  const [pl, pt] = styleConfig.value.textFillPadding
  if (dir === 'x') {
    updateOuterFrame('textFillPadding', [value, pt, value, pt])
  }
  else if (dir === 'y') {
    updateOuterFrame('textFillPadding', [pl, value, pl, value])
  }
}

// 删除外框
function deleteOuterFrame() {
  props.mindMap?.outerFrame.removeActiveOuterFrame()
}

// 删除外框文字
function deleteOuterFrameText() {
  props.mindMap?.outerFrame.removeActiveOuterFrameText()
}

// 隐藏
function hide() {
  if (props.activeSidebar !== 'nodeOuterFrameStyle') {
    return
  }
  emit('update:activeSidebar', null)
}

// 处理Sidebar关闭事件
function handleUpdateActiveSidebar(value: string | null) {
  emit('update:activeSidebar', value)
}

// 生命周期
onMounted(() => {
  if (props.mindMap) {
    props.mindMap.on('outer_frame_active', onOuterFrameActive)
    props.mindMap.on('outer_frame_delete', hide)
    props.mindMap.on('outer_frame_deactivate', hide)
  }
})

onBeforeUnmount(() => {
  if (props.mindMap) {
    props.mindMap.off('outer_frame_active', onOuterFrameActive)
    props.mindMap.off('outer_frame_delete', hide)
    props.mindMap.off('outer_frame_deactivate', hide)
  }
})
</script>

<template>
  <Sidebar
    ref="sidebarRef"
    :title="localeText.nodeOuterFrame.nodeOuterFrameStyle"
    :is-dark="isDark"
    @update:active-sidebar="handleUpdateActiveSidebar"
  >
    <div class="sidebarContent" :class="{ isDark }">
      <div class="panelHeader">
        <span class="name">{{ localeText.nodeOuterFrame.outerFrameSetting }}</span>
        <span class="deleteBtn" @click="deleteOuterFrame">
          {{ localeText.nodeOuterFrame.deleteOuterFrame }}
          <span class="iconfont iconshanchu" />
        </span>
      </div>
      <div class="panelBody">
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.nodeOuterFrame.boxStyle }}</span>
            <!-- 宽度 -->
            <el-select
              v-model="styleConfig.strokeWidth"
              size="small"
              style="width: 80px"
              placeholder=""
              @change="
                (value: any) => {
                  updateOuterFrame('strokeWidth', value)
                }
              "
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
            <!-- 实现虚线 -->
            <el-select
              v-model="styleConfig.strokeDasharray"
              size="small"
              style="width: 80px; margin-left: 4px"
              placeholder=""
              @change="
                (value: any) => {
                  updateOuterFrame('strokeDasharray', value)
                }
              "
            >
              <el-option
                v-for="item in borderDasharrayList"
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
                      styleConfig.strokeDasharray === item.value
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
            <span class="name">{{ localeText.nodeOuterFrame.boxColor }}</span>
            <el-popover placement="bottom" trigger="click">
              <template #reference>
                <span
                  class="block"
                  :style="{ backgroundColor: styleConfig.strokeColor }"
                />
              </template>
              <Color
                :color="styleConfig.strokeColor"
                @change="
                  (color: string) => {
                    updateOuterFrame('strokeColor', color)
                  }
                "
              />
            </el-popover>
          </div>
          <div class="rowItem">
            <span class="name">{{ localeText.nodeOuterFrame.radius }}</span>
            <el-select
              v-model="styleConfig.radius"
              size="small"
              style="width: 80px"
              placeholder=""
              @change="
                (value: any) => {
                  updateOuterFrame('radius', value)
                }
              "
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
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.nodeOuterFrame.fillColor }}</span>
            <el-popover placement="bottom" trigger="click">
              <template #reference>
                <span
                  class="block"
                  :style="{ backgroundColor: styleConfig.fill }"
                />
              </template>
              <Color
                :color="styleConfig.fill"
                @change="
                  (color: string) => {
                    updateOuterFrame('fill', color)
                  }
                "
              />
            </el-popover>
          </div>
        </div>
      </div>
      <div class="panelHeader" style="margin-top: 12px">
        <span class="name">{{ localeText.nodeOuterFrame.outerFrameText }}</span>
        <span class="deleteBtn" @click="deleteOuterFrameText">
          {{ localeText.nodeOuterFrame.deleteOuterFrameText }}
          <span class="iconfont iconshanchu" />
        </span>
      </div>
      <div class="panelBody">
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.nodeOuterFrame.fontFamily }}</span>
            <el-select
              v-model="styleConfig.fontFamily"
              size="small"
              placeholder=""
              @change="
                (value: any) => {
                  updateOuterFrame('fontFamily', value)
                }
              "
            >
              <el-option
                v-for="item in fontFamilyList"
                :key="item.value"
                :label="item.name"
                :value="item.value"
                :style="{ fontFamily: item.value }"
              />
            </el-select>
          </div>
        </div>
        <div class="row">
          <div class="btnGroup">
            <el-popover placement="bottom" trigger="hover">
              <template #reference>
                <div class="styleBtn" :title="localeText.nodeOuterFrame.color">
                  A
                  <span
                    class="colorShow"
                    :style="{ backgroundColor: styleConfig.color }"
                  />
                </div>
              </template>
              <Color
                :color="styleConfig.color"
                @change="
                  (color: string) => {
                    updateOuterFrame('color', color)
                  }
                "
              />
            </el-popover>
            <el-tooltip
              :content="localeText.nodeOuterFrame.fontBold"
              placement="bottom"
            >
              <div
                class="styleBtn"
                :class="{
                  actived: styleConfig.fontWeight === 'bold',
                }"
                @click="toggleFontWeight"
              >
                B
              </div>
            </el-tooltip>
            <el-tooltip
              :content="localeText.nodeOuterFrame.italic"
              placement="bottom"
            >
              <div
                class="styleBtn i"
                :class="{
                  actived: styleConfig.fontStyle === 'italic',
                }"
                @click="toggleFontStyle"
              >
                I
              </div>
            </el-tooltip>
          </div>
        </div>
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.nodeOuterFrame.lineHeight }}</span>
            <el-select
              v-model="styleConfig.lineHeight"
              size="small"
              style="width: 80px"
              placeholder=""
              @change="
                (value: any) => {
                  updateOuterFrame('lineHeight', value)
                }
              "
            >
              <el-option
                v-for="item in lineHeightList"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </div>
          <div class="rowItem">
            <span class="name">{{ localeText.nodeOuterFrame.fontSize }}</span>
            <el-select
              v-model="styleConfig.fontSize"
              size="small"
              style="width: 80px"
              placeholder=""
              @change="
                (value: any) => {
                  updateOuterFrame('fontSize', value)
                }
              "
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
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.nodeOuterFrame.textFill }}</span>
            <el-popover placement="bottom" trigger="click">
              <template #reference>
                <span
                  class="block"
                  :style="{ backgroundColor: styleConfig.textFill }"
                />
              </template>
              <Color
                :color="styleConfig.textFill"
                @change="
                  (color: string) => {
                    updateOuterFrame('textFill', color)
                  }
                "
              />
            </el-popover>
          </div>
          <div class="rowItem">
            <span class="name">{{ localeText.nodeOuterFrame.textFillRadius }}</span>
            <el-select
              v-model="styleConfig.textFillRadius"
              size="small"
              style="width: 80px"
              placeholder=""
              @change="
                (value: any) => {
                  updateOuterFrame('textFillRadius', value)
                }
              "
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
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.nodeOuterFrame.textAlign }}</span>
            <el-radio-group
              v-model="styleConfig.textAlign"
              size="small"
              @change="
                (value: any) => {
                  updateOuterFrame('textAlign', value)
                }
              "
            >
              <el-radio-button label="left" value="left">
                {{ localeText.nodeOuterFrame.left }}
              </el-radio-button>
              <el-radio-button label="center" value="center">
                {{ localeText.nodeOuterFrame.center }}
              </el-radio-button>
              <el-radio-button label="right" value="right">
                {{ localeText.nodeOuterFrame.right }}
              </el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.nodeOuterFrame.paddingX }}</span>
            <el-slider
              v-model="paddingStyle.paddingX"
              style="width: 180px"
              @change="
                (value: any) => {
                  updatePadding('x', value)
                }
              "
            />
          </div>
        </div>
        <div class="row">
          <div class="rowItem">
            <span class="name">{{ localeText.nodeOuterFrame.paddingY }}</span>
            <el-slider
              v-model="paddingStyle.paddingY"
              style="width: 180px"
              @change="
                (value: any) => {
                  updatePadding('y', value)
                }
              "
            />
          </div>
        </div>
      </div>
    </div>
  </Sidebar>
</template>

<style lang="scss">
.el-select-dropdown__item.selected {
  .borderLine {
    background-color: var(--el-color-primary);
  }
}
</style>

<style lang="scss" scoped>
.sidebarContent {
  padding: 20px;

  &.isDark {
    .panelHeader {
      .name {
        color: #fff;
      }
    }

    .panelBody {
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

  .btn {
    width: 24px;
    height: 24px;
    background-color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.06);
  }

  .panelHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .name {
      font-size: 16px;
      font-family:
        PingFangSC-Medium,
        PingFang SC;
      font-weight: 500;
      color: rgba(26, 26, 26, 0.9);
    }

    .deleteBtn {
      display: flex;
      align-items: center;
      color: #909090;
      font-size: 14px;
      cursor: pointer;
      user-select: none;

      .iconfont {
        margin-left: 2px;
        font-size: 14px;
      }
    }
  }

  .panelBody {
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;

      &:last-of-type {
        margin-bottom: 0px;
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
          white-space: nowrap;
        }

        .block {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 1px solid #dcdfe6;
          border-radius: 4px;
          cursor: pointer;
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
