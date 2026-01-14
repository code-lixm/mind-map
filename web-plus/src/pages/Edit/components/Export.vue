<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElNotification } from 'element-plus'
import { isMobile as checkIsMobile } from 'simple-mind-map/src/utils/index'
import { useCaseStore } from '@/store/case'
import { useEditorState } from '../composables/useEditorState'
import { downTypeList as downTypeListConfig } from '../config'

const localeText = inject<(key: string) => string>('localeText')!
const eventBus = inject<{
  on: (event: string, handler: (...args: any[]) => void) => void
  off: (event: string, handler: (...args: any[]) => void) => void
  emit: (event: string, ...args: any[]) => void
}>('eventBus')!
const { isDark, setExtraTextOnExport } = useEditorState()
const caseStore = useCaseStore()
const { detail } = storeToRefs(caseStore)

const dialogVisible = ref(false)
// 注释掉:移除 .smm 格式支持，改为默认导出 json
const exportType = ref('xmind') // 原来是 'smm'
const fileName = ref('')
const exportPreference = useLocalStorage('mind-map-export-options', {
  includeConfig: true,
  hideTaskNodes: false,
  transparent: false,
  fitBg: true,
})
const widthConfig = ref(exportPreference.value.includeConfig ?? true)
const isTransparent = ref(exportPreference.value.transparent ?? false)
const loading = ref(false)
const loadingText = ref('')
const paddingX = ref(10)
const paddingY = ref(10)
const extraText = ref('')
const isMobile = ref(checkIsMobile())
const isFitBg = ref(exportPreference.value.fitBg ?? true)
const imageFormat = ref('png')
const hideTaskNodes = ref(exportPreference.value.hideTaskNodes ?? false)
const hideTaskNodeSupportTypes = []
// 基线保留功能: 是否需要将当前的技战法节点在导出的时候是否支持隐藏
// const hideTaskNodeSupportTypes = ['xmind', 'json', 'md']
const canHideTaskNodes = computed(() => hideTaskNodeSupportTypes.includes(exportType.value))
const defaultExportFileName = computed(() => {
  const caseName = detail.value?.caseInfo?.name?.trim()
  if (caseName)
    return `${caseName}`

  return localeText('export.defaultFileName')
})

interface DownTypeItem {
  name: string
  type: string
  desc: string
}

const downTypeList = computed<DownTypeItem[]>(() => {
  // 直接使用中文配置
  return downTypeListConfig.filter((item: DownTypeItem) => {
    if (item.type === 'mm' || item.type === 'xlsx') {
      return false
    }
    return true
  })
})

const currentTypeData = computed<DownTypeItem | undefined>(() => {
  return downTypeList.value.find((item: DownTypeItem) => item.type === exportType.value)
})

const showFitBgOption = computed(() => {
  return ['png', 'pdf'].includes(exportType.value) && !isTransparent.value
})

const noOptions = computed(() => {
  return ['md', 'xmind', 'txt', 'xlsx', 'mm'].includes(exportType.value)
})

onMounted(() => {
  fileName.value = defaultExportFileName.value
  eventBus.on('showExport', handleShowExport)
})

onBeforeUnmount(() => {
  eventBus.off('showExport', handleShowExport)
})

watch(widthConfig, (val) => {
  exportPreference.value.includeConfig = val
})
watch(hideTaskNodes, (val) => {
  exportPreference.value.hideTaskNodes = val
})
watch(isTransparent, (val) => {
  exportPreference.value.transparent = val
})
watch(isFitBg, (val) => {
  exportPreference.value.fitBg = val
})

function handleShowExport() {
  fileName.value = defaultExportFileName.value
  dialogVisible.value = true
}

function getExportFileName() {
  const trimmed = fileName.value?.trim()
  if (trimmed)
    return trimmed
  return defaultExportFileName.value
}

function emitExport(payload: any) {
  eventBus.emit('export', payload)
}

function onPaddingChange() {
  eventBus.emit('paddingChange', {
    exportPaddingX: Number(paddingX.value),
    exportPaddingY: Number(paddingY.value),
  })
}

function cancel() {
  dialogVisible.value = false
}

function confirm() {
  const exportFileName = getExportFileName()
  setExtraTextOnExport(extraText.value)
  const exportParams: any[] = []
  if (exportType.value === 'svg') {
    exportParams.push(
      exportType.value,
      true,
      exportFileName,
      `* {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }`,
    )
  }
  // 注释掉:移除 .smm 格式支持
  else if (['json'].includes(exportType.value)) { // 原来是 ['smm', 'json']
    exportParams.push(
      exportType.value,
      true,
      exportFileName,
      widthConfig.value,
    )
  }
  else if (exportType.value === 'png') {
    exportParams.push(
      imageFormat.value,
      true,
      exportFileName,
      isTransparent.value,
      null,
      isFitBg.value,
    )
  }
  else if (exportType.value === 'pdf') {
    exportParams.push(
      exportType.value,
      true,
      exportFileName,
      isTransparent.value,
      isFitBg.value,
    )
  }
  else {
    exportParams.push(exportType.value, true, exportFileName)
  }

  const shouldHideTaskNodes = canHideTaskNodes.value && hideTaskNodes.value
  emitExport({
    params: exportParams,
    options: {
      hideTaskNodes: shouldHideTaskNodes,
    },
  })
  ElNotification.info({
    title: localeText('export.notifyTitle'),
    message: localeText('export.notifyMessage'),
  })
  cancel()
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    v-loading.fullscreen.lock="loading"
    class="nodeExportDialog"
    :class="{ isMobile, isDark }"
    :element-loading-text="loadingText"
    element-loading-background="rgba(0, 0, 0, 0.8)"
    :width="isMobile ? '90%' : '800px'"
    :top="isMobile ? '20px' : '15vh'"
    :body-style="{ padding: 0 }"
    :show-header="false"
    :show-close="false"
    :close-on-click-modal="true"
    :header="null"
  >
    <div class="exportContainer">
      <!-- 导出类型选择 -->
      <aside class="typeList customScrollbar">
        <div
          v-for="item in downTypeList"
          :key="item.type"
          class="typeItem"
          :class="{ active: exportType === item.type }"
          @click="exportType = item.type"
        >
          <div
            class="typeIcon"
            :class="[item.type]"
          />
          <span class="typeName">{{ item.name }}</span>
          <i
            v-if="exportType === item.type"
            class="i-ep:check"
          />
        </div>
      </aside>

      <!-- 右侧内容 -->
      <main class="mainContent">
        <!-- 头部 -->
        <el-form
          label-width="auto"
          class="header"
        >
          <el-form-item :label="localeText('export.filename')">
            <el-input
              v-model="fileName"
              size="small"
              style="width: 250px"
              @keydown.stop
            />
          </el-form-item>
        </el-form>

        <el-divider style="margin: 0" />

        <!-- 配置区 -->
        <el-scrollbar class="configArea">
          <el-form
            label-width="80px"
            label-position="left"
          >
            <el-form-item :label="localeText('export.format')">
              <el-tag size="small">
                {{ currentTypeData ? `.${currentTypeData.type}` : '' }}
              </el-tag>
            </el-form-item>

            <el-form-item :label="localeText('export.desc')">
              <el-tag size="small">
                {{ currentTypeData ? currentTypeData.desc : '' }}
              </el-tag>
            </el-form-item>

            <el-form-item :label="localeText('export.options')">
              <div v-if="noOptions && !canHideTaskNodes">
                <el-tag size="small">
                  无
                </el-tag>
              </div>
              <el-space
                v-else
                direction="vertical"
                alignment="flex-start"
              >
                <!-- JSON 配置 -->
                <el-checkbox
                  v-show="['json'].includes(exportType)"
                  v-model="widthConfig"
                >
                  {{ localeText('export.include') }}
                </el-checkbox>

                <el-checkbox
                  v-if="canHideTaskNodes"
                  v-model="hideTaskNodes"
                >
                  {{ localeText('export.hideTaskNodes') }}
                </el-checkbox>

                <!-- 图片/PDF 配置 -->
                <template v-if="['svg', 'png', 'pdf'].includes(exportType)">
                  <el-form-item
                    v-if="['png'].includes(exportType)"
                    :label="localeText('export.format')"
                    label-width="100px"
                  >
                    <el-radio-group v-model="imageFormat">
                      <el-radio value="png">
                        PNG
                      </el-radio>
                    </el-radio-group>
                  </el-form-item>

                  <el-form-item
                    :label="localeText('export.paddingX')"
                    label-width="100px"
                  >
                    <el-input
                      v-model="paddingX"
                      size="small"
                      style="width: 200px"
                      @change="onPaddingChange"
                      @keydown.stop
                    />
                  </el-form-item>

                  <el-form-item
                    :label="localeText('export.paddingY')"
                    label-width="100px"
                  >
                    <el-input
                      v-model="paddingY"
                      size="small"
                      style="width: 200px"
                      @change="onPaddingChange"
                      @keydown.stop
                    />
                  </el-form-item>

                  <el-form-item
                    :label="localeText('export.addFooterText')"
                    label-width="100px"
                  >
                    <el-input
                      v-model="extraText"
                      size="small"
                      style="width: 200px"
                      :placeholder="localeText('export.addFooterTextPlaceholder')"
                      @keydown.stop
                    />
                  </el-form-item>

                  <el-checkbox
                    v-show="['png', 'pdf'].includes(exportType)"
                    v-model="isTransparent"
                  >
                    {{ localeText('export.isTransparent') }}
                  </el-checkbox>

                  <el-checkbox
                    v-show="showFitBgOption"
                    v-model="isFitBg"
                  >
                    {{ localeText('export.isFitBg') }}
                  </el-checkbox>
                </template>
              </el-space>
            </el-form-item>
          </el-form>
        </el-scrollbar>

        <el-divider style="margin: 0" />

        <!-- 底部按钮 -->
        <div class="footer">
          <el-button @click="cancel">
            {{ localeText('dialog.cancel') }}
          </el-button>
          <el-button
            type="primary"
            @click="confirm"
          >
            {{ localeText('export.confirm') }}
          </el-button>
        </div>
      </main>
    </div>
  </el-dialog>
</template>

<style lang="scss">
.nodeExportDialog.el-dialog {
  border-radius: 10px;
  overflow: hidden;
  padding: 0 !important;

  .el-dialog__header {
    display: none;
  }

  .el-dialog__body {
    padding: 0;
  }
}

.nodeExportDialog {
  // 暗色主题
  &.isDark {
    .typeList {
      background-color: #363b3f;

      .typeItem {
        &.active {
          background-color: #262a2e;
        }

        .typeName {
          color: hsla(0, 0%, 100%, 0.9);
        }
      }
    }
  }

  // 移动端适配
  &.isMobile {
    .exportContainer {
      flex-direction: column;

      .typeList {
        width: 100%;
        height: 60px;
        flex-direction: row;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 0;

        .typeItem {
          width: 100px;
          flex-shrink: 0;
          padding: 0 8px;

          i {
            display: none !important;
          }
        }
      }

      .mainContent {
        .header {
          :deep(.el-form-item) {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      }
    }
  }

  .exportContainer {
    display: flex;
    height: 552px;

    // 左侧类型列表
    .typeList {
      width: 208px;
      flex-shrink: 0;
      background-color: #f2f4f7;
      padding: 16px 0;

      .typeItem {
        display: flex;
        align-items: center;
        height: 52px;
        padding: 0 24px;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
          background-color: rgba(255, 255, 255, 0.5);
        }

        &.active {
          background-color: #fff;
        }

        .typeIcon {
          width: 23px;
          height: 26px;
          margin-right: 12px;
          flex-shrink: 0;
          background-size: cover;

          &.png {
            background-image: url('../assets/img/foramt/2.png');
          }

          &.pdf {
            background-image: url('../assets/img/foramt/4.png');
          }

          &.md {
            background-image: url('../assets/img/foramt/5.png');
          }

          &.json {
            background-image: url('../assets/img/foramt/10.png');
          }

          &.svg {
            background-image: url('../assets/img/foramt/3.png');
          }

          &.xmind {
            background-image: url('../assets/img/foramt/6.png');
          }

          &.txt {
            background-image: url('../assets/img/foramt/7.png');
          }
        }

        .typeName {
          flex: 1;
          font-size: 15px;
          font-weight: 600;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        i {
          color: var(--el-color-primary);
          font-size: 18px;
          margin-left: 8px;
        }
      }
    }

    // 右侧主内容
    .mainContent {
      flex: 1;
      display: flex;
      flex-direction: column;

      .header {
        padding: 16px 24px;
        padding-bottom: 0;
        :deep(.el-form-item) {
          margin-bottom: 0;
        }
      }

      .configArea {
        flex: 1;
        padding: 16px 24px;

        :deep(.el-form) {
          .el-form-item {
            margin-bottom: 16px;

            &:last-child {
              margin-bottom: 0;
            }
          }

          .el-tag {
            font-size: 13px;
          }
        }
      }

      .footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 24px;
      }
    }
  }
}
</style>
