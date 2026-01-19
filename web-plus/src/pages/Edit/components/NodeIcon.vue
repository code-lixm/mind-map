<script setup lang="ts">
import { inject, onBeforeUnmount, ref } from 'vue'
import icon from '@/config/icon'

// 注入
const localeText = inject('localeText', {} as any)
const eventBus = inject('eventBus') as any

// 状态
const nodeIconListData = ref(icon)
const dialogVisible = ref(false)
const iconList = ref<string[]>([])
const activeNodes = ref<any[]>([])

// 方法
function handleNodeActive(_node: any, nodes: any[]) {
  activeNodes.value = nodes ? [...nodes] : []
  if (activeNodes.value.length > 0) {
    const firstNode = activeNodes.value[0]
    iconList.value = firstNode.getData('icon') || []
  }
  else {
    iconList.value = []
  }
}

function handleShowNodeIcon() {
  dialogVisible.value = true
}

function getHtml(iconStr: string) {
  return iconStr.startsWith('<svg') ? iconStr : `<img src="${iconStr}" />`
}

function setIcon(type: string, name: string) {
  const key = `${type}_${name}`
  const index = iconList.value.findIndex(item => item === key)
  // 删除icon
  if (index !== -1) {
    iconList.value.splice(index, 1)
  }
  else {
    const typeIndex = iconList.value.findIndex((item) => {
      return item.split('_')[0] === type
    })
    // 替换icon
    if (typeIndex !== -1) {
      iconList.value.splice(typeIndex, 1, key)
    }
    else {
      // 增加icon
      iconList.value.push(key)
    }
  }
  activeNodes.value.forEach((node) => {
    node.setIcon([...iconList.value])
  })
}

// 生命周期
if (eventBus) {
  eventBus.on('node_active', handleNodeActive)
  eventBus.on('showNodeIcon', handleShowNodeIcon)
}

onBeforeUnmount(() => {
  if (eventBus) {
    eventBus.off('node_active', handleNodeActive)
    eventBus.off('showNodeIcon', handleShowNodeIcon)
  }
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    class="nodeIconDialog"
    :title="localeText.nodeIcon?.title || '节点图标'"
    width="500"
  >
    <div v-for="item in nodeIconListData" :key="item.name" class="item">
      <div class="title">
        {{ item.name }}
      </div>
      <div class="list">
        <div
          v-for="iconItem in item.list"
          :key="iconItem.name"
          class="icon"
          :class="{
            selected: iconList.includes(`${item.type}_${iconItem.name}`),
          }"
          @click="setIcon(item.type, iconItem.name)"
          v-html="getHtml(iconItem.icon)"
        />
      </div>
    </div>
  </el-dialog>
</template>

<style lang="scss" scoped>
.nodeIconDialog {
  :deep(.el-dialog__body) {
    padding: 0 20px;
  }

  .deleteBtn {
    margin-bottom: 20px;
  }

  .item {
    margin-bottom: 20px;
    font-weight: bold;

    .title {
      margin-bottom: 10px;
    }

    .list {
      display: flex;
      flex-wrap: wrap;

      .icon {
        width: 24px;
        height: 24px;
        margin-right: 10px;
        margin-bottom: 10px;
        cursor: pointer;
        position: relative;

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
  }
}
</style>
