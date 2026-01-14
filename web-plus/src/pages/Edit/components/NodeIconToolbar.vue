<script setup lang="ts">
import type { MindMap } from '../types'
import { inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import icon from '../config/icon'

// Props
interface Props {
  mindMap: MindMap
  activeSidebar: string | null
}

const props = defineProps<Props>()

// 注入
const eventBus = inject<any>('eventBus')!

// Refs
const nodeIconToolbarRef = ref<HTMLElement>()

// 常量
const allIconList = [...icon]

// 状态
const showNodeIconToolbar = ref(false)
const style = reactive({
  left: '0',
  top: '0',
})
const node = ref<any>(null)
const iconType = ref('')
const iconName = ref('')
const nodeIconList = ref<string[]>([])
const iconList = ref<any[]>([])

// 方法
function show(nodeObj: any, iconStr: string) {
  node.value = nodeObj
  iconType.value = iconStr.split('_')[0]
  iconName.value = iconStr.split('_')[1]
  nodeIconList.value = nodeObj.getData('icon') || []
  iconList.value = [
    ...allIconList.find(item => item.type === iconType.value)?.list || [],
  ]
  updatePos()
  showNodeIconToolbar.value = true
  if (props.activeSidebar === 'nodeIconSidebar') {
    // 此处需要调用 setActiveSidebar(null) mutation
  }
}

function close() {
  showNodeIconToolbar.value = false
  node.value = null
  iconType.value = ''
  iconName.value = ''
  nodeIconList.value = []
  iconList.value = []
  style.left = '0'
  style.top = '0'
}

function updatePos() {
  if (!node.value)
    return
  const rect = node.value.getRect()
  style.left = `${rect.x}px`
  style.top = `${rect.y + rect.height}px`
}

function onScale() {
  updatePos()
}

function onNodeActive(activeNode: any) {
  if (activeNode === node.value)
    return

  close()
}

function deleteIcon() {
  setIcon(iconName.value)
  close()
}

function getHtml(iconStr: string) {
  return iconStr.startsWith('<svg') ? iconStr : `<img src="${iconStr}" />`
}

function setIcon(name: string) {
  const key = `${iconType.value}_${name}`
  const index = nodeIconList.value.findIndex(item => item === key)
  // 删除icon
  if (index !== -1) {
    nodeIconList.value.splice(index, 1)
  }
  else {
    const typeIndex = nodeIconList.value.findIndex((item) => {
      return item.split('_')[0] === iconType.value
    })
    // 替换icon
    if (typeIndex !== -1) {
      nodeIconList.value.splice(typeIndex, 1, key)
      iconName.value = name
    }
    else {
      // 增加icon
      nodeIconList.value.push(key)
    }
  }
  node.value.setIcon([...nodeIconList.value])
}

// 生命周期
onMounted(() => {
  if (nodeIconToolbarRef.value)
    document.body.append(nodeIconToolbarRef.value)
})

props.mindMap.on('node_icon_click', show)
props.mindMap.on('draw_click', close)
props.mindMap.on('svg_mousedown', close)
props.mindMap.on('node_dblclick', close)
props.mindMap.on('node_active', onNodeActive)
props.mindMap.on('scale', onScale)
eventBus.on('close_node_icon_toolbar', close)

onBeforeUnmount(() => {
  props.mindMap.off('node_icon_click', show)
  props.mindMap.off('draw_click', close)
  props.mindMap.off('svg_mousedown', close)
  props.mindMap.off('node_dblclick', close)
  props.mindMap.off('node_active', onNodeActive)
  props.mindMap.off('scale', onScale)
  eventBus.off('close_node_icon_toolbar', close)
})
</script>

<template>
  <div
    v-show="showNodeIconToolbar"
    ref="nodeIconToolbarRef"
    class="nodeIconToolbar"
    :style="style"
    @click.stop.passive
  >
    <div class="iconListBox">
      <div
        v-for="iconItem in iconList"
        :key="iconItem.name"
        class="icon"
        :class="{
          selected: nodeIconList.includes(`${iconType}_${iconItem.name}`),
        }"
        @click="setIcon(iconItem.name)"
        v-html="getHtml(iconItem.icon)"
      />
    </div>
    <div class="btnBox">
      <span class="btn iconfont iconshanchu" @click="deleteIcon" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.nodeIconToolbar {
  position: fixed;
  z-index: 2000;
  width: 210px;
  max-height: 170px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .iconListBox {
    width: 100%;
    height: 180px;
    overflow-y: auto;
    padding: 10px;

    .icon {
      width: 24px;
      height: 24px;
      margin: 5px;
      cursor: pointer;
      position: relative;
      float: left;

      :deep(img) {
        width: 100%;
        height: 100%;
      }

      :deep(svg) {
        width: 100%;
        height: 100%;
      }

      &.selected {
        &::after {
          content: '';
          position: absolute;
          left: -4px;
          top: -4px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid var(--el-color-primary);
        }
      }
    }
  }

  .btnBox {
    width: 100%;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-top: 1px solid #eee;
    flex-shrink: 0;

    .btn {
      cursor: pointer;
      color: rgba(26, 26, 26, 0.8);
    }
  }
}
</style>
