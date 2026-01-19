<script setup lang="ts">
import type { MindMapInstance } from '../types'
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import Color from './Color.vue'

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
const localeText = inject<any>('localeText', {
  nodeTagStyle: {
    placeholder: '请输入标签内容',
    delete: '删除',
  },
})

// Refs
const elRef = ref<HTMLDivElement>()

// 状态
const show = ref(false)
const position = ref({
  left: '0px',
  top: '0px',
})
const node = ref<any>(null)
const index = ref(0)
const text = ref('')
const fill = ref('')

// 标签点击处理
function onNodeTagClick(nodeData: any, tag: string | { text: string, style?: any }, idx: number, el: any) {
  node.value = nodeData
  index.value = idx
  if (typeof tag === 'string') {
    text.value = tag
    fill.value = ''
  }
  else {
    // v0.10.3+版本支持对象类型
    text.value = tag.text
    fill.value = tag.style && tag.style.fill ? tag.style.fill : ''
  }

  // 获取外框的位置大小信息
  const { x, y, width, height } = el.rbox()
  const boxWidth = 260
  const boxHeight = 152
  let left = x + width / 2 - boxWidth / 2
  if (left < 0) {
    left = 0
  }
  if (left + boxWidth > window.innerWidth) {
    left = window.innerWidth - boxWidth
  }
  position.value.left = `${left}px`
  let top = y + height + 5
  if (top + boxHeight > window.innerHeight) {
    top = window.innerHeight - boxHeight
  }
  position.value.top = `${top}px`
  show.value = true
}

// 更新标签文本
function updateTagText() {
  const textValue = text.value.trim()
  if (!textValue)
    return
  updateTagInfo({
    text: textValue,
  })
}

// 更新标签填充色
function updateTagFill(color: string) {
  updateTagInfo({
    style: {
      fill: color,
    },
  })
  fill.value = color
}

// 更新标签信息
function updateTagInfo({ text: textValue, style }: { text?: string, style?: any }) {
  if (!node.value)
    return
  const tagData = [...node.value.getData('tag')]
  let item: any = null
  if (typeof tagData[index.value] === 'string') {
    item = {
      text: tagData[index.value],
      style: {},
    }
  }
  else {
    item = tagData[index.value]
    if (!item.style) {
      item.style = {}
    }
  }
  if (textValue) {
    item.text = textValue
  }
  if (style) {
    Object.keys(style).forEach((key) => {
      item.style[key] = style[key]
    })
  }

  tagData[index.value] = item
  props.mindMap?.execCommand('SET_NODE_TAG', node.value, tagData)
}

// 删除标签
function deleteTag() {
  if (!node.value)
    return
  const tagData = [...node.value.getData('tag')]
  tagData.splice(index.value, 1)
  props.mindMap?.execCommand('SET_NODE_TAG', node.value, tagData)
  hide()
}

// 隐藏编辑器
function hide() {
  show.value = false
  node.value = null
  index.value = 0
  text.value = ''
  fill.value = ''
}

// 生命周期
onMounted(() => {
  if (elRef.value) {
    document.body.appendChild(elRef.value)
  }

  if (props.mindMap) {
    props.mindMap.on('node_tag_click', onNodeTagClick)
    props.mindMap.on('scale', hide)
    props.mindMap.on('translate', hide)
    props.mindMap.on('svg_mousedown', hide)
    props.mindMap.on('expand_btn_click', hide)
  }
})

onBeforeUnmount(() => {
  if (elRef.value && elRef.value.parentNode) {
    elRef.value.parentNode.removeChild(elRef.value)
  }

  if (props.mindMap) {
    props.mindMap.off('node_tag_click', onNodeTagClick)
    props.mindMap.off('scale', hide)
    props.mindMap.off('translate', hide)
    props.mindMap.off('svg_mousedown', hide)
    props.mindMap.off('expand_btn_click', hide)
  }
})
</script>

<template>
  <div
    v-show="show"
    ref="elRef"
    class="nodeTagStyleContainer"
    :style="position"
    :class="{ isDark }"
  >
    <div class="row">
      <el-input
        v-model="text"
        :placeholder="localeText.nodeTagStyle.placeholder"
        size="small"
        @blur="updateTagText"
        @keydown.stop
        @keyup.enter.stop="updateTagText"
      />
      <div class="deleteBtn" @click.stop="deleteTag">
        <span class="iconfont iconshanchu" />
        <span class="text">{{ localeText.nodeTagStyle.delete }}</span>
      </div>
    </div>
    <div class="row">
      <Color :color="fill" @change="updateTagFill" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.nodeTagStyleContainer {
  position: fixed;
  width: 260px;
  padding: 12px;
  background-color: #fff;
  border-radius: 5px;
  box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.06);

  &.isDark {
    background-color: #262a2e;
    border-left-color: hsla(0, 0%, 100%, 0.1);
  }

  .row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;

    &:last-of-type {
      margin-bottom: 0;
    }

    .colorItem {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      cursor: pointer;
    }

    .colorItemBox {
      height: 20px;
      cursor: pointer;

      .colorTriggerBtn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        .colorItem {
          height: 5px;
        }
      }
    }

    .deleteBtn {
      white-space: nowrap;
      display: flex;
      align-items: center;
      margin-left: 5px;
      cursor: pointer;
      color: #9aa5b8;
      font-size: 12px;
      user-select: none;

      &:hover {
        color: #eb5555;
      }

      .iconfont {
        font-size: 12px;
        margin-right: 2px;
      }
    }
  }
}
</style>
