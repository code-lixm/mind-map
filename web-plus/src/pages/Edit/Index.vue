<template>
  <div
    class="container"
    :class="{ isDark: isDark, activeSidebar: activeSidebar }"
  >
    <template v-if="show">
      <Toolbar v-if="!isZenMode"></Toolbar>
      <MindMapContainer
        :model-value="mindMapData"
        :mode="isReadonly ? 'readonly' : 'edit'"
        :enable-ai="localConfig.enableAi"
        :use-dark="localConfig.isDark"
        :is-zen-mode="localConfig.isZenMode"
        :open-node-rich-text="localConfig.openNodeRichText"
        :is-show-scrollbar="localConfig.isShowScrollbar"
        :use-left-key-selection-right-key-drag="localConfig.useLeftKeySelectionRightKeyDrag"
        @update:model-value="handleDataChange"
        @ready="handleMindMapReady"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElLoading } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useMainStore } from '@/store'
import { getLocalConfig, getData } from '@/api'
import Toolbar from './components/Toolbar.vue'
import MindMapContainer from './components/MindMapContainer.vue'
import type { MindMapFullData, MindMapInstance } from '@/types/mind-map'

const { t } = useI18n()
const store = useMainStore()
const { localConfig, activeSidebar } = storeToRefs(store)

const show = ref(false)
const mindMapData = ref<MindMapFullData | null>(null)
const mindMapInstance = ref<MindMapInstance | null>(null)

const isZenMode = computed(() => localConfig.value.isZenMode)
const isDark = computed(() => localConfig.value.isDark)
const isReadonly = computed(() => store.isReadonly)

// 初始化本地配置
function initLocalConfig() {
  const config = getLocalConfig()
  if (config) {
    store.setLocalConfig({
      ...localConfig.value,
      ...config
    })
  }
}

// 设置 body 暗色模式
function setBodyDark() {
  if (isDark.value) {
    document.body.classList.add('isDark')
  } else {
    document.body.classList.remove('isDark')
  }
}

// 处理数据变化
function handleDataChange(data: MindMapFullData) {
  mindMapData.value = data
}

// 处理思维导图就绪
function handleMindMapReady(instance: MindMapInstance) {
  mindMapInstance.value = instance
}

// 监听暗色模式变化
watch(isDark, () => {
  setBodyDark()
})

onMounted(async () => {
  initLocalConfig()
  const loading = ElLoading.service({
    lock: true,
    text: t('other.loading')
  })
  
  // 初始化思维导图数据
  mindMapData.value = getData()
  
  show.value = true
  loading.close()
  setBodyDark()
})
</script>

<style lang="less">
.container {
}

body {
  &.isDark {
    /* el-button */
    .el-button {
      background-color: #363b3f;
      color: hsla(0, 0%, 100%, 0.9);
      border-color: hsla(0, 0%, 100%, 0.1);
    }

    /* el-input */
    .el-input__inner {
      background-color: #363b3f;
      border-color: hsla(0, 0%, 100%, 0.1);
      color: hsla(0, 0%, 100%, 0.9);
    }

    .el-input.is-disabled .el-input__inner {
      background-color: #363b3f;
      border-color: hsla(0, 0%, 100%, 0.1);
      color: hsla(0, 0%, 100%, 0.3);
    }

    .el-input-group__append,
    .el-input-group__prepend {
      background-color: #363b3f;
      border-color: hsla(0, 0%, 100%, 0.1);
    }

    .el-input-group__append button.el-button {
      color: hsla(0, 0%, 100%, 0.9);
    }

    /* el-select */
    .el-select-dropdown {
      background-color: #36393d;
      border-color: hsla(0, 0%, 100%, 0.1);

      .el-select-dropdown__item {
        color: hsla(0, 0%, 100%, 0.6);
      }

      .el-select-dropdown__item.selected {
        color: #409eff;
      }

      .el-select-dropdown__item.hover,
      .el-select-dropdown__item:hover {
        background-color: hsla(0, 0%, 100%, 0.05);
      }
    }

    .el-select .el-input.is-disabled .el-input__inner:hover {
      border-color: hsla(0, 0%, 100%, 0.1);
    }

    /* el-popper*/
    .el-popper {
      background-color: #36393d;
      border-color: hsla(0, 0%, 100%, 0.1);
    }

    .el-popper[x-placement^='bottom'] .popper__arrow {
      background-color: #36393d;
    }

    .el-popper[x-placement^='bottom'] .popper__arrow::after {
      border-bottom-color: #36393d;
    }

    .el-popper[x-placement^='top'] .popper__arrow {
      background-color: #36393d;
    }

    .el-popper[x-placement^='top'] .popper__arrow::after {
      border-top-color: #36393d;
    }

    /* el-tabs */
    .el-tabs__item {
      color: hsla(0, 0%, 100%, 0.6);

      &:hover,
      &.is-active {
        color: #409eff;
      }
    }

    .el-tabs__nav-wrap::after {
      background-color: hsla(0, 0%, 100%, 0.6);
    }

    /* el-slider */
    .el-slider__runway {
      background-color: hsla(0, 0%, 100%, 0.6);
    }

    /* el-radio-group */
    .el-radio-group {
      .el-radio-button__inner {
        background-color: #36393d;
        color: hsla(0, 0%, 100%, 0.6);
      }

      .el-radio-button__orig-radio:checked + .el-radio-button__inner {
        color: #fff;
        background-color: #409eff;
      }
    }

    /* el-dialog */
    .el-dialog {
      background-color: #262a2e;

      .el-dialog__header {
        border-bottom: 1px solid hsla(0, 0%, 100%, 0.1);
      }

      .el-dialog__title {
        color: hsla(0, 0%, 100%, 0.9);
      }

      .el-dialog__body {
        background-color: #262a2e;
      }

      .el-dialog__footer {
        border-top: 1px solid hsla(0, 0%, 100%, 0.1);
      }
    }

    /* el-upload */
    .el-upload__tip {
      color: #999;
    }

    /* 富文本编辑器 */
    .toastui-editor-main-container {
      background-color: #fff;
    }
  }
}
</style>
