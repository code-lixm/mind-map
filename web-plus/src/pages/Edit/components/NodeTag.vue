<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { generateColorByContent, isMobile } from 'simple-mind-map/src/utils/index'

// 注入文案
const localeText = inject<any>('localeText', {
  nodeTag: {
    title: '标签',
    addTip: '请输入标签内容',
  },
  dialog: {
    cancel: '取消',
    confirm: '确定',
  },
})

// 注入事件总线
const eventBus = inject<any>('eventBus')

// 状态
const dialogVisible = ref(false)
const tagArr = ref<Array<string | { text: string, style?: any }>>([])
const tag = ref('')
const activeNodes = ref<any[]>([])
const max = 5
const isMobileDevice = isMobile()

// 监听对话框关闭
watch(dialogVisible, (val, oldVal) => {
  if (!val && oldVal) {
    if (eventBus) {
      eventBus.emit('endTextEdit')
    }
  }
})

// 处理节点激活
function handleNodeActive(_node: any, nodes: any[]) {
  activeNodes.value = nodes ? [...nodes] : []
  if (activeNodes.value.length > 0) {
    const firstNode = activeNodes.value[0]
    const tags = firstNode.getData('tag')
    tagArr.value = tags ? [...tags] : []
  }
  else {
    tagArr.value = []
    tag.value = ''
  }
}

// 显示标签对话框
function handleShowNodeTag() {
  if (eventBus) {
    eventBus.emit('startTextEdit')
  }
  if (activeNodes.value.length > 0) {
    const firstNode = activeNodes.value[0]
    const tags = firstNode.getData('tag')
    tagArr.value = tags ? [...tags] : []
  }
  else {
    tagArr.value = []
  }
  dialogVisible.value = true
}

// 添加标签
function add() {
  const text = tag.value.trim()
  if (!text)
    return
  tagArr.value.push(text)
  tag.value = ''
}

// 删除标签
function del(index: number) {
  tagArr.value.splice(index, 1)
}

// 取消
function cancel() {
  dialogVisible.value = false
}

// 确定
function confirm() {
  activeNodes.value.forEach((node) => {
    node.setTag(tagArr.value)
  })
  cancel()
}

// 生命周期
onMounted(() => {
  if (eventBus) {
    eventBus.on('node_active', handleNodeActive)
    eventBus.on('showNodeTag', handleShowNodeTag)
  }
})

onBeforeUnmount(() => {
  if (eventBus) {
    eventBus.off('node_active', handleNodeActive)
    eventBus.off('showNodeTag', handleShowNodeTag)
  }
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    class="nodeTagDialog"
    :title="localeText.nodeTag.title"
    :width="isMobileDevice ? '90%' : '500px'"
    :top="isMobileDevice ? '20px' : '15vh'"
  >
    <el-input
      v-model="tag"
      :disabled="tagArr.length >= max"
      :placeholder="localeText.nodeTag.addTip"
      @keyup.enter="add"
      @keyup.stop
      @keydown.stop
    />
    <div class="tagList">
      <div
        v-for="(item, index) in tagArr"
        :key="index"
        class="tagItem"
        :style="{
          backgroundColor: generateColorByContent(item),
        }"
      >
        {{ typeof item === 'string' ? item : item.text }}
        <div class="delBtn" @click="del(index)">
          <span class="iconfont iconshanchu" />
        </div>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="cancel">{{ localeText.dialog.cancel }}</el-button>
        <el-button type="primary" @click="confirm">
          {{ localeText.dialog.confirm }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.nodeTagDialog {
  .tagList {
    display: flex;
    flex-wrap: wrap;
    margin-top: 5px;

    .tagItem {
      position: relative;
      padding: 3px 5px;
      margin-right: 5px;
      margin-bottom: 5px;
      color: #fff;

      .delBtn {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.4);
        color: #fff;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        visibility: hidden;
      }

      &:hover {
        .delBtn {
          visibility: visible;
        }
      }
    }
  }
}
</style>
