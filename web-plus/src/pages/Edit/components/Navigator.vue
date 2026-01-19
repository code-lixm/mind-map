<script setup lang="ts">
import { inject, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useEditorState } from '@/composables/useEditorState'

interface Props {
  mindMap: any
}

const props = defineProps<Props>()

const eventBus = inject<any>('eventBus')!
const { isDark } = useEditorState()

const showMiniMap = ref(false)
const navigatorBox = ref<HTMLElement | null>(null)
const svgBox = ref<HTMLElement | null>(null)
let timer: NodeJS.Timeout | null = null
const boxWidth = ref(0)
const boxHeight = ref(0)
const svgBoxScale = ref(1)
const svgBoxLeft = ref(0)
const svgBoxTop = ref(0)
const viewBoxStyle = ref({
  left: 0,
  top: 0,
  bottom: 0,
  right: 0,
})
const mindMapImg = ref('')
const width = ref(0)
let setSizeTimer: NodeJS.Timeout | null = null
const withTransition = ref(true)

onMounted(() => {
  setSize()
  window.addEventListener('resize', setSize)
  eventBus.on('toggle_mini_map', toggle_mini_map)
  eventBus.on('data_change', data_change)
  eventBus.on('view_data_change', data_change)
  eventBus.on('node_tree_render_end', data_change)
  window.addEventListener('mouseup', onMouseup)
  props.mindMap.on(
    'mini_map_view_box_position_change',
    onViewBoxPositionChange,
  )
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', setSize)
  eventBus.off('toggle_mini_map', toggle_mini_map)
  eventBus.off('data_change', data_change)
  eventBus.off('view_data_change', data_change)
  eventBus.off('node_tree_render_end', data_change)
  window.removeEventListener('mouseup', onMouseup)
  props.mindMap.off(
    'mini_map_view_box_position_change',
    onViewBoxPositionChange,
  )
})

// 切换显示小地图
function toggle_mini_map(show: boolean) {
  showMiniMap.value = show
  nextTick(() => {
    if (navigatorBox.value) {
      init()
    }
    if (svgBox.value) {
      drawMiniMap()
    }
  })
}

// 思维导图数据改变,更新小地图
function data_change() {
  if (!showMiniMap.value) {
    return
  }
  if (timer)
    clearTimeout(timer)
  timer = setTimeout(() => {
    drawMiniMap()
  }, 500)
}

// 计算容器宽度
function setSize() {
  if (setSizeTimer)
    clearTimeout(setSizeTimer)
  setSizeTimer = setTimeout(() => {
    width.value = Math.min(window.innerWidth - 100, 250)
    nextTick(() => {
      if (showMiniMap.value) {
        init()
        drawMiniMap()
      }
    })
  }, 300)
}

// 获取宽高
function init() {
  if (!navigatorBox.value)
    return
  const { width: w, height: h } = navigatorBox.value.getBoundingClientRect()
  boxWidth.value = w
  boxHeight.value = h
}

// 渲染小地图
function drawMiniMap() {
  // 减去header高度(28px)后的实际可用高度
  const availableHeight = boxHeight.value - 28
  const {
    getImgUrl,
    viewBoxStyle: vbs,
    miniMapBoxScale,
    miniMapBoxLeft,
    miniMapBoxTop,
  } = props.mindMap.miniMap.calculationMiniMap(boxWidth.value, availableHeight)
  // 渲染到小地图
  getImgUrl((img: string) => {
    mindMapImg.value = img
  })
  viewBoxStyle.value = vbs
  svgBoxScale.value = miniMapBoxScale
  svgBoxLeft.value = miniMapBoxLeft
  svgBoxTop.value = miniMapBoxTop + 28 // 加上header高度
}

// 小地图鼠标按下事件
function onMousedown(e: MouseEvent) {
  props.mindMap.miniMap.onMousedown(e)
}

// 小地图鼠标移动事件
function onMousemove(e: MouseEvent) {
  props.mindMap.miniMap.onMousemove(e)
}

// 鼠标松开事件,最好绑定要window
function onMouseup(e: MouseEvent) {
  if (!withTransition.value) {
    withTransition.value = true
  }
  if (props.mindMap.miniMap)
    props.mindMap.miniMap.onMouseup(e)
}

// 视口框的鼠标按下事件
function onViewBoxMousedown(e: MouseEvent) {
  props.mindMap.miniMap.onViewBoxMousedown(e)
}

// 视口框的鼠标移动事件
function onViewBoxMousemove(e: MouseEvent) {
  props.mindMap.miniMap.onViewBoxMousemove(e)
}

// 视口框的位置大小改变了,需要更新
function onViewBoxPositionChange({ left, right, top, bottom }: any) {
  withTransition.value = false
  viewBoxStyle.value.left = left
  viewBoxStyle.value.right = right
  viewBoxStyle.value.top = top
  viewBoxStyle.value.bottom = bottom
}
</script>

<template>
  <div
    v-if="showMiniMap"
    ref="navigatorBox"
    class="navigatorBox"
    :class="{ isDark }"
    :style="{ width: `${width}px` }"
    @mousedown="onMousedown"
    @mousemove="onMousemove"
  >
    <div
      ref="svgBox"
      class="svgBox"
      :style="{
        transform: `scale(${svgBoxScale})`,
        left: `${svgBoxLeft}px`,
        top: `${svgBoxTop}px`,
      }"
    >
      <img :src="mindMapImg" @mousedown.prevent>
    </div>
    <div
      class="windowBox"
      :style="viewBoxStyle"
      :class="{ withTransition }"
      @mousedown.stop="onViewBoxMousedown"
      @mousemove="onViewBoxMousemove"
    />
  </div>
</template>

<style lang="scss" scoped>
.navigatorBox {
  position: absolute;
  height: 140px;
  background-color: #fff;
  bottom: 70px;
  right: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  &.isDark {
    background-color: #262a2e;
    border-color: rgba(255, 255, 255, 0.1);

    .miniMapHeader {
      background-color: rgba(255, 255, 255, 0.05);
      border-bottom-color: rgba(255, 255, 255, 0.1);

      .miniMapTitle {
        color: rgba(255, 255, 255, 0.85);
      }

      .closeBtn {
        color: rgba(255, 255, 255, 0.65);

        &:hover {
          color: rgba(255, 255, 255, 0.95);
          background-color: rgba(255, 255, 255, 0.1);
        }
      }
    }
  }

  .miniMapHeader {
    position: relative;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    background-color: rgba(0, 0, 0, 0.02);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    z-index: 10;

    .miniMapTitle {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.65);
      font-weight: 500;
    }

    .closeBtn {
      cursor: pointer;
      font-size: 14px;
      color: rgba(0, 0, 0, 0.45);
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        color: rgba(0, 0, 0, 0.85);
        background-color: rgba(0, 0, 0, 0.06);
      }
    }
  }

  .svgBox {
    position: absolute;
    left: 0;
    top: 28px;
    transform-origin: left top;
  }

  .windowBox {
    position: absolute;
    border: 1.5px solid var(--el-color-primary);
    background-color: rgba(64, 158, 255, 0.15);
    border-radius: 2px;

    &.withTransition {
      transition: all 0.3s;
    }
  }
}
</style>
