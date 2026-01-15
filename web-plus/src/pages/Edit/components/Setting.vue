<script setup lang="ts">
import type { MindMapInstance } from '../types'
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import Sidebar from './Sidebar.vue'
import WatermarkSettings from './WatermarkSettings.vue'
import { useEditorState } from '../composables/useEditorState'

// Props
interface Props {
  mindMap?: MindMapInstance
  isDark?: boolean
  activeSidebar?: string | null
  localConfig?: Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  mindMap: undefined,
  isDark: false,
  activeSidebar: null,
  localConfig: () => ({}),
})

// Emits
const emit = defineEmits<{
  'update:localConfig': [config: Record<string, any>]
}>()

// 注入文案
const localeText = inject<any>('localeText', {
  setting: {
    title: '设置',
    showWatermark: '显示水印',
    onlyExport: '仅在导出时显示',
    belowNode: '在节点下方',
    watermarkText: '水印文字',
    watermarkTextColor: '水印文字颜色',
    watermarkTextOpacity: '水印文字透明度',
    watermarkTextFontSize: '水印文字字号',
    watermarkAngle: '旋转角度',
    watermarkLineSpacing: '水印行间距',
    watermarkTextSpacing: '水印文字间距',
    watermarkDefaultText: '思维导图',
    openPerformance: '开启性能模式',
    enableFreeDrag: '开启自由拖拽',
    isEnableNodeRichText: '启用节点富文本编辑',
    openRealtimeRenderOnNodeTextEdit: '文本编辑时实时更新节点大小',
    isShowScrollbar: '显示滚动条',
    alwaysShowExpandBtn: '一直显示展开收起按钮',
    enableAutoEnterTextEditWhenKeydown: '键盘输入时自动进入节点文本编辑',
    enableDragImport: '开启文件拖入导入',
    enableInheritAncestorLineStyle: '节点连线样式继承祖先的连线样式',
    enableAi: '开启AI功能',
    mousewheelAction: '鼠标滚轮行为',
    zoomView: '缩放视图',
    moveViewUpDown: '上下移动视图',
    mousewheelZoomActionReverse: '鼠标缩放行为',
    mousewheelZoomActionReverse1: '向上滚动放大',
    mousewheelZoomActionReverse2: '向下滚动放大',
    createNewNodeBehavior: '创建新节点行为',
    default: '默认',
    notActive: '仅创建',
    activeOnly: '仅激活',
    imgTextMargin: '图片和文本间距',
    textContentMargin: '文本内容间距',
    changeRichTextTip: '切换是否开启节点富文本编辑后,需要刷新页面,确定吗?',
    changeRichTextTip2: '开启',
    changeRichTextTip3: '关闭',
    confirm: '确定',
    cancel: '取消',
  },
})

// 注入事件总线
const eventBus = inject<any>('eventBus')

// 状态
const config = ref<Record<string, any>>({
  openPerformance: false,
  enableFreeDrag: false,
  mousewheelAction: 'zoom',
  mousewheelZoomActionReverse: false,
  createNewNodeBehavior: 'default',
  openRealtimeRenderOnNodeTextEdit: true,
  alwaysShowExpandBtn: false,
  enableAutoEnterTextEditWhenKeydown: true,
  imgTextMargin: 0,
  textContentMargin: 0,
  enableInheritAncestorLineStyle: true,
})

const watermarkConfig = ref({
  show: false,
  onlyExport: false,
  belowNode: false,
  text: '',
  lineSpacing: 100,
  textSpacing: 100,
  angle: 30,
  textStyle: {
    color: '#000000',
    opacity: 0.1,
    fontSize: 14,
  },
})

const enableNodeRichText = ref(true)
const localConfigs = ref<Record<string, any>>({
  isShowScrollbar: false,
  enableDragImport: false,
  enableAi: false,
})

let updateWatermarkTimer: ReturnType<typeof setTimeout> | null = null

// 水印设置弹窗状态
const showWatermarkDialog = ref(false)

// Store
const editorStore = useEditorState()

// Refs
const sidebarRef = ref<InstanceType<typeof Sidebar>>()

// 监听 activeSidebar 变化
watch(
  () => props.activeSidebar,
  (val) => {
    if (sidebarRef.value) {
      if (val === 'setting') {
        sidebarRef.value.show = true
        initConfig()
        initWatermark()
        initLocalConfig()
      }
      else {
        sidebarRef.value.show = false
      }
    }
  },
)

// 监听 localConfig 变化
watch(
  () => props.localConfig,
  () => {
    initLocalConfig()
  },
  { deep: true },
)

// 初始化其他配置
function initConfig() {
  if (!props.mindMap)
    return

  Object.keys(config.value).forEach((key) => {
    if (typeof config.value[key] === 'object') {
      config.value[key] = {
        ...(props.mindMap!.getConfig(key) || {}),
      }
    }
    else {
      config.value[key] = props.mindMap!.getConfig(key)
    }
  })
}

// 初始化本地配置
function initLocalConfig() {
  enableNodeRichText.value = props.localConfig?.openNodeRichText ?? true

  Object.keys(localConfigs.value).forEach((key) => {
    if (props.localConfig && key in props.localConfig) {
      localConfigs.value[key] = props.localConfig[key]
    }
  })
}

// 初始化水印配置
function initWatermark() {
  if (!props.mindMap)
    return

  const watermarkCfg = props.mindMap.getConfig('watermarkConfig');
  ['text', 'lineSpacing', 'textSpacing', 'angle', 'onlyExport', 'belowNode'].forEach(
    (key) => {
      if (key in watermarkCfg) {
        (watermarkConfig.value as any)[key] = watermarkCfg[key]
      }
    },
  )
  watermarkConfig.value.show = !!watermarkCfg.text
  watermarkConfig.value.textStyle = { ...watermarkCfg.textStyle }
}

// 更新其他配置
function updateOtherConfig(key: string, value: any) {
  if (!props.mindMap)
    return

  props.mindMap.updateConfig({
    [key]: value,
  })

  if (
    [
      'alwaysShowExpandBtn',
      'imgTextMargin',
      'textContentMargin',
      'enableInheritAncestorLineStyle',
    ].includes(key)
  ) {
    props.mindMap.reRender()
  }
}

// 更新水印配置
function updateWatermarkConfig() {
  if (updateWatermarkTimer) {
    clearTimeout(updateWatermarkTimer)
  }

  updateWatermarkTimer = setTimeout(() => {
    if (!props.mindMap || !props.mindMap.watermark)
      return

    const { show, ...config } = watermarkConfig.value
    props.mindMap.watermark.updateWatermark({
      ...config,
    })
  }, 300)
}

// 切换显示水印与否
function watermarkShowChange(value: boolean) {
  if (value) {
    const text
      = watermarkConfig.value.text || localeText.setting.watermarkDefaultText
    watermarkConfig.value.text = text
  }
  else {
    watermarkConfig.value.text = ''
  }
  updateWatermarkConfig()
}

// 打开水印设置弹窗
function openWatermarkSettings() {
  showWatermarkDialog.value = true
}

// 水印设置确认
function handleWatermarkConfirm() {
  updateWatermarkConfig()
}

// 切换是否开启节点富文本编辑
function enableNodeRichTextChange(e: boolean) {
  ElMessageBox.confirm(
    localeText.setting.changeRichTextTip,
    e ? localeText.setting.changeRichTextTip2 : localeText.setting.changeRichTextTip3,
    {
      confirmButtonText: localeText.setting.confirm,
      cancelButtonText: localeText.setting.cancel,
      type: 'warning',
    },
  )
    .then(() => {
      props.mindMap?.renderer.textEdit.hideEditTextBox()
      updateLocalConfig('openNodeRichText', e)
    })
    .catch(() => {
      enableNodeRichText.value = !enableNodeRichText.value
    })
}

// 处理切换富文本事件
function onToggleOpenNodeRichText(val: boolean) {
  updateLocalConfig('openNodeRichText', val)
  enableNodeRichText.value = val
}

// 更新本地配置
function updateLocalConfig(key: string, value: any) {
  const newLocalConfig = {
    ...props.localConfig,
    [key]: value,
  }
  emit('update:localConfig', newLocalConfig)
}

// 处理Sidebar关闭事件
function handleUpdateActiveSidebar(value: string | null) {
  editorStore.setActiveSidebar(value)
}

// 生命周期
onMounted(() => {
  initLocalConfig()

  if (eventBus) {
    eventBus.on('toggleOpenNodeRichText', onToggleOpenNodeRichText)
  }
})

onBeforeUnmount(() => {
  if (eventBus) {
    eventBus.off('toggleOpenNodeRichText', onToggleOpenNodeRichText)
  }

  if (updateWatermarkTimer) {
    clearTimeout(updateWatermarkTimer)
  }
})
</script>

<template>
  <Sidebar
    ref="sidebarRef"
    :title="localeText.setting.title"
    :is-dark="isDark"
    @update:active-sidebar="handleUpdateActiveSidebar"
  >
    <div
      v-if="mindMap"
      class="settingContainer customScrollbar"
      :class="{ isDark }"
    >
      <!-- 基础设置 -->
      <div class="settingSection">
        <div class="sectionTitle">
          基础设置
        </div>
        <div class="sectionContent">
          <!-- 是否显示水印 -->
          <div class="settingItem fullWidth">
            <el-checkbox
              v-model="watermarkConfig.show"
              @change="(val: any) => watermarkShowChange(val as boolean)"
            >
              {{ localeText.setting.showWatermark }}
            </el-checkbox>
            <el-button
              text
              link
              type="primary"
              @click="openWatermarkSettings"
            >
              水印设置
            </el-button>
          </div>

          <!-- 是否显示滚动条 -->
          <div class="settingItem">
            <el-checkbox
              v-model="localConfigs.isShowScrollbar"
              @change="updateLocalConfig('isShowScrollbar', $event)"
            >
              {{ localeText.setting.isShowScrollbar }}
            </el-checkbox>
          </div>

          <!-- 是否开启节点自由拖拽 -->
          <div class="settingItem">
            <el-checkbox
              v-model="config.enableFreeDrag"
              @change="(value) => updateOtherConfig('enableFreeDrag', value)"
            >
              {{ localeText.setting.enableFreeDrag }}
            </el-checkbox>
          </div>

          <!-- 是否开启节点富文本编辑 -->
          <div class="settingItem">
            <el-checkbox
              v-model="enableNodeRichText"
              @change="(val: any) => enableNodeRichTextChange(val as boolean)"
            >
              {{ localeText.setting.isEnableNodeRichText }}
            </el-checkbox>
          </div>
        </div>
      </div>

      <!-- 分割线 -->
      <el-divider />

      <!-- 高级功能 -->
      <div class="settingSection">
        <div class="sectionTitle">
          高级功能
        </div>
        <div class="sectionContent">
          <!-- 开启性能模式 -->
          <div class="settingItem fullWidth">
            <el-checkbox
              v-model="config.openPerformance"
              @change="(value) => updateOtherConfig('openPerformance', value)"
            >
              {{ localeText.setting.openPerformance }}
            </el-checkbox>
            <el-tag type="primary" plain rounded>
              Beta
            </el-tag>
          </div>
          <!-- 开启文本编辑实时渲染效果 -->
          <div class="settingItem">
            <el-checkbox
              v-model="config.openRealtimeRenderOnNodeTextEdit"
              @change="updateOtherConfig('openRealtimeRenderOnNodeTextEdit', $event)"
            >
              {{ localeText.setting.openRealtimeRenderOnNodeTextEdit }}
            </el-checkbox>
          </div>

          <!-- 是否开启AI功能 -->
          <!-- <div class="settingItem">
            <el-checkbox
              v-model="localConfigs.enableAi"
              @change="updateLocalConfig('enableAi', $event)"
            >
              {{ localeText.setting.enableAi }}
            </el-checkbox>
          </div> -->

          <!-- 节点连线样式继承祖先的连线样式 -->
          <div class="settingItem">
            <el-checkbox
              v-model="config.enableInheritAncestorLineStyle"
              @change="updateOtherConfig('enableInheritAncestorLineStyle', $event)"
            >
              {{ localeText.setting.enableInheritAncestorLineStyle }}
            </el-checkbox>
          </div>

          <!-- 是否一直显示展开收起按钮 -->
          <div class="settingItem">
            <el-checkbox
              v-model="config.alwaysShowExpandBtn"
              @change="updateOtherConfig('alwaysShowExpandBtn', $event)"
            >
              {{ localeText.setting.alwaysShowExpandBtn }}
            </el-checkbox>
          </div>

          <!-- 是否在键盘输入时自动进入节点文本编辑模式 -->
          <div class="settingItem">
            <el-checkbox
              v-model="config.enableAutoEnterTextEditWhenKeydown"
              @change="updateOtherConfig('enableAutoEnterTextEditWhenKeydown', $event)"
            >
              {{ localeText.setting.enableAutoEnterTextEditWhenKeydown }}
            </el-checkbox>
          </div>

          <!-- 是否开启文件拖入页面导入的方式 -->
          <div class="settingItem">
            <el-checkbox
              v-model="localConfigs.enableDragImport"
              @change="updateLocalConfig('enableDragImport', $event)"
            >
              {{ localeText.setting.enableDragImport }}
            </el-checkbox>
          </div>
        </div>
      </div>

      <!-- 分割线 -->
      <el-divider />

      <!-- 交互设置 -->
      <div class="settingSection">
        <div class="sectionTitle">
          交互设置
        </div>
        <div class="sectionContent">
          <!-- 鼠标滚轮行为 -->
          <div class="settingItem vertical">
            <span class="label">{{ localeText.setting.mousewheelAction }}</span>
            <el-select
              v-model="config.mousewheelAction"
              class="fullWidthSelect"
              @change="(value) => updateOtherConfig('mousewheelAction', value)"
            >
              <el-option
                :label="localeText.setting.zoomView"
                value="zoom"
              />
              <el-option
                :label="localeText.setting.moveViewUpDown"
                value="move"
              />
            </el-select>
          </div>

          <!-- 配置鼠标缩放行为 -->
          <div v-if="config.mousewheelAction === 'zoom'" class="settingItem vertical">
            <span class="label">{{ localeText.setting.mousewheelZoomActionReverse }}</span>
            <el-select
              v-model="config.mousewheelZoomActionReverse"
              class="fullWidthSelect"
              @change="(value) => updateOtherConfig('mousewheelZoomActionReverse', value)"
            >
              <el-option
                :label="localeText.setting.mousewheelZoomActionReverse1"
                :value="false"
              />
              <el-option
                :label="localeText.setting.mousewheelZoomActionReverse2"
                :value="true"
              />
            </el-select>
          </div>

          <!-- 创建新节点的行为 -->
          <div class="settingItem vertical">
            <span class="label">{{ localeText.setting.createNewNodeBehavior }}</span>
            <el-select
              v-model="config.createNewNodeBehavior"
              class="fullWidthSelect"
              @change="(value) => updateOtherConfig('createNewNodeBehavior', value)"
            >
              <el-option
                :label="localeText.setting.default"
                value="default"
              />
              <el-option
                :label="localeText.setting.notActive"
                value="notActive"
              />
              <el-option
                :label="localeText.setting.activeOnly"
                value="activeOnly"
              />
            </el-select>
          </div>

          <!-- 节点图片和文本间隔 -->
          <div class="settingItem vertical">
            <div class="sliderHeader">
              <span class="label">{{ localeText.setting.imgTextMargin }}</span>
              <span class="value">{{ config.imgTextMargin }}</span>
            </div>
            <el-slider
              v-model="config.imgTextMargin"
              :min="0"
              :max="100"
              @change="(value) => updateOtherConfig('imgTextMargin', value)"
            />
          </div>

          <!-- 节点各种内容间隔 -->
          <div class="settingItem vertical">
            <div class="sliderHeader">
              <span class="label">{{ localeText.setting.textContentMargin }}</span>
              <span class="value">{{ config.textContentMargin }}</span>
            </div>
            <el-slider
              v-model="config.textContentMargin"
              :min="0"
              :max="100"
              @change="(value) => updateOtherConfig('textContentMargin', value)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 水印设置弹窗 -->
    <WatermarkSettings
      v-model:visible="showWatermarkDialog"
      v-model:watermark-config="watermarkConfig"
      :is-dark="isDark"
      @confirm="handleWatermarkConfirm"
    />
  </Sidebar>
</template>

<style lang="scss" scoped>
.settingContainer {
  padding: 16px 16px;
  padding-bottom: 60px;

  &.isDark {
    .sectionTitle {
      color: rgba(255, 255, 255, 0.9);
    }

    .settingItem {
      .label {
        color: rgba(255, 255, 255, 0.9);
      }

      .value {
        color: rgba(255, 255, 255, 0.6);
      }
    }

    :deep(.el-divider) {
      border-color: #4b5563;
    }
  }

  :deep(.el-divider) {
    margin: 16px 0;
    border-color: #e5e7eb;
  }

  .settingSection {
    .sectionTitle {
      font-size: 15px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
      line-height: 1.4;
    }

    .sectionContent {
      .settingItem {
        display: flex;
        align-items: center;
        margin-bottom: 8px;

        &:last-child {
          margin-bottom: 0;
        }

        &.fullWidth {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;

          .label {
            flex-shrink: 0;
            white-space: nowrap;
          }

          :deep(.el-input),
          :deep(.el-slider) {
            flex: 1;
          }

          :deep(.el-checkbox) {
            flex: 1;
          }
        }

        &.vertical {
          flex-direction: column;
          align-items: stretch;
          gap: 8px;

          .label {
            font-size: 14px;
            color: #333;
            line-height: 20px;
          }

          .fullWidthSelect {
            width: 100%;
          }

          .sliderHeader {
            display: flex;
            justify-content: space-between;
            align-items: center;

            .label {
              font-size: 14px;
              color: #333;
              line-height: 20px;
            }

            .value {
              font-size: 14px;
              color: #666;
              line-height: 20px;
            }
          }
        }

        .label {
          font-size: 14px;
          color: #333;
          margin-right: 12px;
          white-space: nowrap;
          line-height: 20px;
        }

        .colorBlock {
          display: inline-block;
          width: 30px;
          height: 30px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
          transition: border-color 0.2s;

          &:hover {
            border-color: #3b82f6;
          }
        }

        :deep(.el-checkbox) {
          font-size: 14px;
          color: #333;

          .el-checkbox__label {
            font-size: 14px;
            color: #333;
          }

          .el-checkbox__input.is-checked .el-checkbox__inner {
            background-color: #3b82f6;
            border-color: #3b82f6;
          }

          .el-checkbox__inner {
            border-radius: 4px;
          }
        }

        :deep(.el-select) {
          .el-input__wrapper {
            border-radius: 8px;
            box-shadow: 0 0 0 1px #d1d5db inset;

            &:hover {
              box-shadow: 0 0 0 1px #9ca3af inset;
            }

            &.is-focus {
              box-shadow: 0 0 0 1px #3b82f6 inset;
            }
          }
        }

        :deep(.el-slider) {
          .el-slider__runway {
            height: 8px;
            background-color: #f3f4f6;
            border-radius: 9999px;
          }

          .el-slider__bar {
            height: 8px;
            background-color: #3b82f6;
            border-radius: 9999px;
          }

          .el-slider__button-wrapper {
            width: 20px;
            height: 20px;
            top: -6px;

            .el-slider__button {
              width: 20px;
              height: 20px;
              background-color: #fff;
              border: 2px solid #3b82f6;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
          }
        }

        :deep(.el-input-number) {
          .el-input__wrapper {
            border-radius: 8px;
            box-shadow: 0 0 0 1px #d1d5db inset;

            &:hover {
              box-shadow: 0 0 0 1px #9ca3af inset;
            }

            &.is-focus {
              box-shadow: 0 0 0 1px #3b82f6 inset;
            }
          }
        }

        :deep(.el-input) {
          .el-input__wrapper {
            border-radius: 8px;
            box-shadow: 0 0 0 1px #d1d5db inset;

            &:hover {
              box-shadow: 0 0 0 1px #9ca3af inset;
            }

            &.is-focus {
              box-shadow: 0 0 0 1px #3b82f6 inset;
            }
          }
        }
      }
    }
  }
}
</style>
