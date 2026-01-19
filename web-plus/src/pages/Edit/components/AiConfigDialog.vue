<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { AiConfig } from '../types'
import { computed, inject, reactive, ref, watch } from 'vue'

// 定义 Store 接口
interface Store {
  state: {
    aiConfig: AiConfig
    [key: string]: unknown
  }
  commit: (mutation: string, payload: unknown) => void
  [key: string]: unknown
}

// 定义国际化文本接口
interface LocaleText {
  ai?: {
    apiValidateTip?: string
    keyValidateTip?: string
    modelValidateTip?: string
    portValidateTip?: string
    methodValidateTip?: string
    AIConfiguration?: string
    VolcanoArkLargeModelConfiguration?: string
    configTip?: string
    course?: string
    inferenceAccessPoint?: string
    cancel?: string
    confirm?: string
    configSaveSuccessTip?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

// Props
interface Props {
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
})

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// 注入国际化
const localeText = inject<{ value: LocaleText }>('localeText', {
  value: { ai: {} },
})

// 注入 store
const storeInject = inject<Store>('store')
const aiConfig = computed(() => storeInject?.state.aiConfig || {} as AiConfig)

// 状态
const aiConfigDialogVisible = ref(false)
const ruleFormRef = ref<FormInstance>()

interface RuleForm {
  api: string
  key: string
  model: string
  port: string
  method: string
}

const ruleForm = reactive<RuleForm>({
  api: '',
  key: '',
  model: '',
  port: '',
  method: '',
})

const rules = reactive<FormRules>({
  api: [
    {
      required: true,
      message: () => localeText.value.ai?.apiValidateTip || '',
      trigger: 'blur',
    },
  ],
  key: [
    {
      required: true,
      message: () => localeText.value.ai?.keyValidateTip || '',
      trigger: 'blur',
    },
  ],
  model: [
    {
      required: true,
      message: () => localeText.value.ai?.modelValidateTip || '',
      trigger: 'blur',
    },
  ],
  port: [
    {
      required: true,
      message: () => localeText.value.ai?.portValidateTip || '',
      trigger: 'blur',
    },
  ],
  method: [
    {
      required: true,
      message: () => localeText.value.ai?.methodValidateTip || '',
      trigger: 'blur',
    },
  ],
})

// 监听 visible 变化
watch(
  () => props.visible,
  (val) => {
    aiConfigDialogVisible.value = val
  },
)

// 监听 aiConfigDialogVisible 变化
watch(aiConfigDialogVisible, (val, oldVal) => {
  if (!val && oldVal) {
    close()
  }
})

// 初始化表单数据
function initFormData() {
  Object.keys(aiConfig.value).forEach((key) => {
    if (key in ruleForm) {
      const formKey = key as keyof RuleForm
      const configValue = aiConfig.value[key as keyof AiConfig]
      // 确保类型兼容，将 number 转为 string
      ruleForm[formKey] = String(configValue || '')
    }
  })
}

// 关闭弹窗
function close() {
  emit('update:visible', false)
}

// 取消
function cancel() {
  close()
  initFormData()
}

// 确认
function confirm() {
  ruleFormRef.value?.validate((valid) => {
    if (valid) {
      close()
      storeInject?.commit('setLocalConfig', {
        ...ruleForm,
      })
      ElMessage.success(localeText.value.ai?.configSaveSuccessTip || '')
    }
  })
}

// 初始化
initFormData()
</script>

<template>
  <el-dialog
    v-model="aiConfigDialogVisible"
    class="aiConfigDialog"
    :title="localeText.value.ai?.AIConfiguration"
    width="550px"
    append-to-body
  >
    <div class="aiConfigBox">
      <el-form
        ref="ruleFormRef"
        :model="ruleForm"
        :rules="rules"
        label-width="100px"
      >
        <p class="title">
          {{ localeText.value.ai?.VolcanoArkLargeModelConfiguration }}
        </p>
        <p class="desc">
          {{ localeText.value.ai?.configTip
          }}<a href="https://mp.weixin.qq.com/s/JNb7PH4sCjWzIZ9G8wStGQ" target="_blank">{{
            localeText.value.ai?.course
          }}</a>。
        </p>
        <el-form-item label="API Key" prop="key">
          <el-input v-model="ruleForm.key" />
        </el-form-item>
        <el-form-item :label="localeText.value.ai?.inferenceAccessPoint" prop="model">
          <el-input v-model="ruleForm.model" />
        </el-form-item>
        <!-- <el-form-item label="接口" prop="api">
          <el-input v-model="ruleForm.api"></el-input>
        </el-form-item>
        <el-form-item label="请求方式" prop="method">
          <el-select v-model="ruleForm.method" placeholder="请选择">
            <el-option key="POST" label="POST" value="POST"></el-option>
            <el-option key="GET" label="GET" value="GET"></el-option>
          </el-select>
        </el-form-item> -->
        <!-- <p class="title">{{ localeText.value.ai?.mindMappingClientConfiguration }}</p>
        <el-form-item :label="localeText.value.ai?.port" prop="port">
          <el-input v-model="ruleForm.port"></el-input>
        </el-form-item> -->
      </el-form>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="cancel">
          {{ localeText.value.ai?.cancel }}
        </el-button>
        <el-button type="primary" @click="confirm">
          {{ localeText.value.ai?.confirm }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.aiConfigDialog {
  :deep(.el-dialog__body) {
    padding: 12px 20px;
  }

  .aiConfigBox {
    a {
      color: var(--el-color-primary);
    }

    .title {
      margin-bottom: 12px;
      font-weight: bold;
    }

    .desc {
      margin-bottom: 12px;
      padding-left: 12px;
      border-left: 5px solid #ccc;
    }
  }
}
</style>
