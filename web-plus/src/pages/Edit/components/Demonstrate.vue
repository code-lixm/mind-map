<script setup lang="ts">
import type { EventBus, MindMapInstance } from '../types'
import { inject, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

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
  demonstrate: {
    demonstrate: string
  }
}

const localeText = inject<LocaleTextType>('localeText', {
  demonstrate: {
    demonstrate: '演示',
  },
})

// 注入事件总线
const eventBus = inject<EventBus>('eventBus')

// 状态
const isEnterDemonstrate = ref(false)
const curStepIndex = ref(0)
const totalStep = ref(0)
const inputStep = ref('')

// Refs
const exitDemonstrateBtnRef = ref<HTMLDivElement>()
const stepBoxRef = ref<HTMLDivElement>()

// 进入演示模式
function enterDemoMode() {
  isEnterDemonstrate.value = true
  nextTick(() => {
    const el = document.querySelector('#mindMapContainer')
    if (el && exitDemonstrateBtnRef.value && stepBoxRef.value) {
      el.appendChild(exitDemonstrateBtnRef.value)
      el.appendChild(stepBoxRef.value)
    }
  })
  props.mindMap?.demonstrate.enter()
}

// 退出演示模式
function exit() {
  props.mindMap?.demonstrate.exit()
}

// 处理退出事件
function onExit() {
  isEnterDemonstrate.value = false
  curStepIndex.value = 0
  totalStep.value = 0
}

// 处理跳转事件
function onJump(index: number, total: number) {
  curStepIndex.value = index
  totalStep.value = total
}

// 上一步
function prev() {
  props.mindMap?.demonstrate.prev()
}

// 下一步
function next() {
  props.mindMap?.demonstrate.next()
}

// 回车跳转
function onEnter() {
  const num = Number(inputStep.value)
  if (Number.isNaN(num)) {
    inputStep.value = ''
  }
  else if (num >= 1 && num <= totalStep.value) {
    props.mindMap?.demonstrate.jump(num - 1)
  }
}

// 生命周期
onMounted(() => {
  if (eventBus) {
    eventBus.on('demonstrate_jump', onJump)
    eventBus.on('exit_demonstrate', onExit)
  }
})

onBeforeUnmount(() => {
  if (eventBus) {
    eventBus.off('demonstrate_jump', onJump)
    eventBus.off('exit_demonstrate', onExit)
  }
})
</script>

<template>
  <div class="demonstrateContainer" :class="{ isDark }">
    <el-tooltip
      class="item"
      effect="dark"
      :content="localeText.demonstrate.demonstrate"
      placement="top"
    >
      <div class="btn iconfont iconyanshibofang" @click="enterDemoMode" />
    </el-tooltip>
    <div
      v-if="isEnterDemonstrate"
      ref="exitDemonstrateBtnRef"
      class="exitDemonstrateBtn"
      @click="exit"
      @mousedown.stop
      @mousemove.stop
      @mouseup.stop
    >
      <span class="icon iconfont iconguanbi" />
    </div>
    <div
      v-if="isEnterDemonstrate"
      ref="stepBoxRef"
      class="stepBox"
      @mousedown.stop
      @mousemove.stop
      @mouseup.stop
    >
      <div class="jump" :class="{ disabled: curStepIndex <= 0 }" @click="prev">
        <span class="icon i-ep-arrow-left" />
      </div>
      <div class="step">
        {{ curStepIndex + 1 }} / {{ totalStep }}
      </div>
      <div
        class="jump"
        :class="{ disabled: curStepIndex >= totalStep - 1 }"
        @click="next"
      >
        <span class="icon i-ep-arrow-right" />
      </div>
      <div class="input">
        <input
          v-model="inputStep"
          type="text"
          @keyup.enter.stop="onEnter"
          @keydown.stop
        >
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.demonstrateContainer {
  display: flex;
  align-items: center;

  &.isDark {
    .btn {
      color: hsla(0, 0%, 100%, 0.6);
    }
  }

  .item {
    margin-right: 12px;

    &:last-of-type {
      margin-right: 0;
    }
  }

  .btn {
    cursor: pointer;
    font-size: 24px;
  }
}
</style>

<style lang="scss">
/* 全局样式：因为这些元素会通过 appendChild 动态添加到 #mindMapContainer */
.exitDemonstrateBtn {
  position: absolute;
  right: 40px;
  top: 20px;
  cursor: pointer;
  z-index: 10001;
  pointer-events: all;

  .icon {
    font-size: 28px;
    color: #fff;
  }
}

.stepBox {
  position: absolute;
  right: 40px;
  bottom: 20px;
  pointer-events: all;

  z-index: 10001;
  display: flex;
  align-items: center;

  .step {
    color: #fff;
    margin: 0 12px;
  }

  .jump {
    color: #fff;
    cursor: pointer;

    &.disabled {
      cursor: not-allowed;
      color: #999;
    }

    .icon {
      font-size: 18px;
      display: inline-block;
      vertical-align: middle;
    }
  }

  .input {
    margin-left: 12px;
    display: flex;
    align-items: center;

    input {
      width: 50px;
      height: 30px;
      text-align: center;
      background-color: transparent;
      border: 1px solid #999;
      outline: none;
      color: #fff;
    }
  }
}
</style>
