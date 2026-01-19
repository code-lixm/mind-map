<script setup lang="ts">
import type { MindMapInstance } from '../types'
import { inject, onBeforeUnmount, ref, watch } from 'vue'

// Props
interface Props {
  mindMap?: MindMapInstance
  isDark?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mindMap: undefined,
  isDark: false,
})

// 注入文案
interface LocaleTextType {
  scale: {
    zoomOut: string
    zoomIn: string
  }
}

const localeText = inject<LocaleTextType>('localeText', {
  scale: {
    zoomOut: '缩小',
    zoomIn: '放大',
  },
})

// 状态
const scaleNum = ref<string | number>(100)
const cacheScaleNum = ref<string | number>(0)
const inputRef = ref<HTMLInputElement>()

// 转换成百分数
function toPer(scale: number): string {
  return (scale * 100).toFixed(0)
}

// 缩小
function narrow() {
  if (props.mindMap) {
    props.mindMap.view.narrow()
  }
}

// 放大
function enlarge() {
  if (props.mindMap) {
    props.mindMap.view.enlarge()
  }
}

// 聚焦时缓存当前缩放倍数
function onScaleNumInputFocus() {
  cacheScaleNum.value = scaleNum.value
}

// 禁止输入非数字
function onScaleNumInput() {
  scaleNum.value = String(scaleNum.value).replace(/\D+/g, '')
}

// 手动输入缩放倍数
function onScaleNumChange() {
  const scaleNumber = Number(scaleNum.value)
  if (Number.isNaN(scaleNumber) || scaleNumber <= 0) {
    scaleNum.value = cacheScaleNum.value
  }
  else if (props.mindMap) {
    const cx = props.mindMap.width / 2
    const cy = props.mindMap.height / 2
    props.mindMap.view.setScale(Number(scaleNum.value) / 100, cx, cy)
  }
}

// 监听缩放事件
function onScale(scale: number) {
  scaleNum.value = toPer(scale)
}

// 点击画布时失焦输入框
function onDrawClick() {
  if (inputRef.value) {
    inputRef.value.blur()
  }
}

// 监听 mindMap 的变化
watch(
  () => props.mindMap,
  (val, oldVal) => {
    if (val && !oldVal) {
      val.on('scale', onScale)
      val.on('draw_click', onDrawClick)
      scaleNum.value = toPer(val.view.scale)
    }
  },
  { immediate: true },
)

// 生命周期
onBeforeUnmount(() => {
  if (props.mindMap) {
    props.mindMap.off('scale', onScale)
    props.mindMap.off('draw_click', onDrawClick)
  }
})
</script>

<template>
  <div class="scaleContainer" :class="{ isDark }">
    <el-tooltip
      class="item"
      effect="dark"
      :content="localeText.scale.zoomOut"
      placement="top"
    >
      <div class="btn i-ep:minus" @click="narrow" />
    </el-tooltip>
    <div class="scaleInfo">
      <input
        ref="inputRef"
        v-model="scaleNum"
        type="text"
        @input="onScaleNumInput"
        @change="onScaleNumChange"
        @focus="onScaleNumInputFocus"
        @keydown.stop
        @keyup.stop
      >%
    </div>
    <el-tooltip
      class="item"
      effect="dark"
      :content="localeText.scale.zoomIn"
      placement="top"
    >
      <div class="btn i-ep:plus" @click="enlarge" />
    </el-tooltip>
  </div>
</template>

<style lang="scss" scoped>
.scaleContainer {
  display: flex;
  align-items: center;

  &.isDark {
    .btn {
      color: hsla(0, 0%, 100%, 0.6);
    }

    .scaleInfo {
      color: hsla(0, 0%, 100%, 0.6);

      input {
        color: hsla(0, 0%, 100%, 0.6);
      }
    }
  }

  .btn {
    cursor: pointer;
  }

  .scaleInfo {
    margin: 0 20px;
    display: flex;
    align-items: center;

    input {
      width: 35px;
      text-align: center;
      background-color: transparent;
      border: none;
      outline: none;
    }
  }
}
</style>
