<script setup lang="ts">
import { inject, ref, watch } from 'vue'
import { colorList } from '@/config'

// Props
interface Props {
  color?: string
  isDark?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: '',
  isDark: false,
})

// Emits
const emit = defineEmits<{
  change: [color: string]
}>()

// 注入文案
interface LocaleTextType {
  color: {
    moreColor: string
  }
}

const localeText = inject<LocaleTextType>('localeText', {
  color: {
    moreColor: '更多颜色',
  },
})

// 状态
const selectColor = ref<string>(props.color)

// 监听 props.color 变化
watch(
  () => props.color,
  (newVal) => {
    selectColor.value = newVal
  },
)

// 点击预设颜色
function clickColorItem(color: string) {
  emit('change', color)
}

// 修改颜色(颜色选择器)
function changeColor() {
  emit('change', selectColor.value)
}
</script>

<template>
  <div class="colorContainer" :class="{ isDark }">
    <div class="colorList">
      <span
        v-for="item in colorList"
        :key="item"
        class="colorItem iconfont"
        :style="{ backgroundColor: item }"
        :class="{ icontouming: item === 'transparent' }"
        @click="clickColorItem(item)"
      />
    </div>
    <div class="moreColor">
      <span>{{ localeText.color.moreColor }}</span>
      <el-color-picker
        v-model="selectColor"
        size="small"
        show-alpha
        @change="changeColor"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.colorContainer {
  &.isDark {
    .moreColor {
      color: hsla(0, 0%, 100%, 0.6);
    }
  }
}

.colorList {
  width: 240px;
  display: flex;
  flex-wrap: wrap;

  .colorItem {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 15px;
    height: 15px;
    margin-right: 5px;
    margin-bottom: 5px;
    cursor: pointer;
  }
}

.moreColor {
  display: flex;
  align-items: center;

  span {
    margin-right: 5px;
  }
}
</style>
