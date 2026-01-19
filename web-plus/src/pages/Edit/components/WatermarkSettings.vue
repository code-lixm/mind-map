<script setup lang="ts">
import { inject, ref, watch } from 'vue'
import Color from './Color.vue'

interface WatermarkConfig {
  text: string
  lineSpacing: number
  textSpacing: number
  angle: number
  onlyExport: boolean
  belowNode: boolean
  textStyle: {
    color: string
    opacity: number
    fontSize: number
  }
}

interface Props {
  visible: boolean
  watermarkConfig: WatermarkConfig
  isDark?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isDark: false,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:watermarkConfig': [config: WatermarkConfig]
  'confirm': []
}>()

// 注入文案
const localeText = inject<any>('localeText', {
  setting: {
    watermarkSettings: '水印设置',
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
    confirm: '确定',
    cancel: '取消',
  },
})

// 本地配置副本
const localConfig = ref<WatermarkConfig>({
  text: '',
  lineSpacing: 100,
  textSpacing: 100,
  angle: 30,
  onlyExport: false,
  belowNode: false,
  textStyle: {
    color: '#000000',
    opacity: 0.1,
    fontSize: 14,
  },
})

// 监听 props 变化，同步到本地配置
watch(
  () => props.watermarkConfig,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = JSON.parse(JSON.stringify(newConfig))
    }
  },
  { immediate: true, deep: true },
)

function handleClose() {
  emit('update:visible', false)
}

function handleConfirm() {
  emit('update:watermarkConfig', localConfig.value)
  emit('confirm')
  handleClose()
}

function handleCancel() {
  // 恢复原始值
  localConfig.value = JSON.parse(JSON.stringify(props.watermarkConfig))
  handleClose()
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="localeText.setting.watermarkSettings"
    width="500px"
    :before-close="handleCancel"
    append-to-body
  >
    <div class="watermark-settings" :class="{ isDark }">
      <!-- 仅在导出时显示 -->
      <div class="setting-item">
        <el-checkbox v-model="localConfig.onlyExport">
          {{ localeText.setting.onlyExport }}
        </el-checkbox>
      </div>

      <!-- 在节点下方 -->
      <div class="setting-item">
        <el-checkbox v-model="localConfig.belowNode">
          {{ localeText.setting.belowNode }}
        </el-checkbox>
      </div>

      <!-- 水印文字 -->
      <div class="setting-item fullWidth">
        <span class="label">{{ localeText.setting.watermarkText }}</span>
        <el-input
          v-model="localConfig.text"
          size="small"
          :placeholder="localeText.setting.watermarkDefaultText"
          @keydown.stop
        />
      </div>

      <!-- 水印文字颜色 -->
      <div class="setting-item">
        <span class="label">{{ localeText.setting.watermarkTextColor }}</span>
        <el-popover placement="bottom" trigger="click">
          <template #reference>
            <span
              class="colorBlock"
              :style="{ backgroundColor: localConfig.textStyle.color }"
            />
          </template>
          <template #default>
            <Color
              :color="localConfig.textStyle.color"
              @change="(value) => { localConfig.textStyle.color = value }"
            />
          </template>
        </el-popover>
      </div>

      <!-- 水印文字透明度 -->
      <div class="setting-item fullWidth">
        <span class="label">{{ localeText.setting.watermarkTextOpacity }}</span>
        <el-slider
          v-model="localConfig.textStyle.opacity"
          :min="0"
          :max="1"
          :step="0.1"
        />
      </div>

      <!-- 水印文字字号 -->
      <div class="setting-item">
        <span class="label">{{ localeText.setting.watermarkTextFontSize }}</span>
        <el-input-number
          v-model="localConfig.textStyle.fontSize"
          size="small"
          :min="0"
          :max="50"
          :step="1"
          @keydown.stop
        />
      </div>

      <!-- 旋转角度 -->
      <div class="setting-item">
        <span class="label">{{ localeText.setting.watermarkAngle }}</span>
        <el-input-number
          v-model="localConfig.angle"
          size="small"
          :min="0"
          :max="90"
          :step="10"
          @keydown.stop
        />
      </div>

      <!-- 水印行间距 -->
      <div class="setting-item">
        <span class="label">{{ localeText.setting.watermarkLineSpacing }}</span>
        <el-input-number
          v-model="localConfig.lineSpacing"
          size="small"
          :step="10"
          @keydown.stop
        />
      </div>

      <!-- 水印文字间距 -->
      <div class="setting-item">
        <span class="label">{{ localeText.setting.watermarkTextSpacing }}</span>
        <el-input-number
          v-model="localConfig.textSpacing"
          size="small"
          :step="10"
          @keydown.stop
        />
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">{{ localeText.setting.cancel }}</el-button>
        <el-button type="primary" @click="handleConfirm">
          {{ localeText.setting.confirm }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.watermark-settings {
  .setting-item {
    display: flex;
    align-items: center;
    margin-bottom: 16px;

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
    }

    .label {
      font-size: 14px;
      color: #333;
      margin-right: 12px;
      min-width: 100px;
      white-space: nowrap;
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

  &.isDark {
    .setting-item {
      .label {
        color: rgba(255, 255, 255, 0.9);
      }

      :deep(.el-checkbox__label) {
        color: rgba(255, 255, 255, 0.9);
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
