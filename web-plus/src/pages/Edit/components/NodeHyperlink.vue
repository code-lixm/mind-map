<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { isMobile } from 'simple-mind-map/src/utils/index'

// 注入文案
const localeText = inject<any>('localeText', {
  nodeHyperlink: {
    title: '超链接',
    link: '链接',
    name: '名称',
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
const link = ref('')
const linkTitle = ref('')
const activeNodes = ref<any[]>([])
const protocol = ref<'https' | 'http' | 'none'>('http')
const isMobileDevice = isMobile()

// 移除协议头
function removeProtocol(url: string) {
  return url.replace(/^https?:\/\//, '')
}

// 处理URL
function handleUrl(setProtocolNoneIfNotExist?: boolean) {
  const res = link.value.match(/^(https?):\/\//)
  if (res && res[1]) {
    protocol.value = res[1] as 'https' | 'http'
  }
  else if (!link.value) {
    protocol.value = 'https'
  }
  else if (setProtocolNoneIfNotExist) {
    protocol.value = 'none'
  }
  link.value = removeProtocol(link.value)
}

// 处理节点激活
function handleNodeActive(_node: any, nodes: any[]) {
  activeNodes.value = nodes ? [...nodes] : []
  if (activeNodes.value.length > 0) {
    const firstNode = activeNodes.value[0]
    link.value = firstNode.getData('hyperlink') || ''
    handleUrl(true)
    linkTitle.value = firstNode.getData('hyperlinkTitle') || ''
  }
  else {
    link.value = ''
    linkTitle.value = ''
  }
}

// 显示超链接对话框
function handleShowNodeLink() {
  dialogVisible.value = true
}

// 取消
function cancel() {
  dialogVisible.value = false
}

// 确定
function confirm() {
  activeNodes.value.forEach((node) => {
    node.setHyperlink(
      (protocol.value === 'none' ? '' : `${protocol.value}://`) + link.value,
      linkTitle.value,
    )
  })
  cancel()
}

// 生命周期
onMounted(() => {
  if (eventBus) {
    eventBus.on('node_active', handleNodeActive)
    eventBus.on('showNodeLink', handleShowNodeLink)
  }
})

onBeforeUnmount(() => {
  if (eventBus) {
    eventBus.off('node_active', handleNodeActive)
    eventBus.off('showNodeLink', handleShowNodeLink)
  }
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    class="nodeHyperlinkDialog"
    :title="localeText.nodeHyperlink.title"
    :width="isMobileDevice ? '90%' : '450px'"
    :top="isMobileDevice ? '20px' : '15vh'"
  >
    <div class="item">
      <span class="name">{{ localeText.nodeHyperlink.link }}</span>
      <el-input
        v-model="link"
        size="small"
        placeholder="例如：www.example.com"
        @keyup.stop
        @keydown.stop
        @blur="handleUrl()"
      >
        <template #prepend>
          <el-select v-model="protocol" style="width: 80px;">
            <el-option label="https" value="https" />
            <el-option label="http" value="http" />
            <el-option label="无" value="none" />
          </el-select>
        </template>
      </el-input>
    </div>
    <div class="item">
      <span class="name">{{ localeText.nodeHyperlink.name }}</span>
      <el-input
        v-model="linkTitle"
        placeholder="请输入超链接名称"
        @keyup.stop
        @keydown.stop
      />
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
.nodeHyperlinkDialog {
  .item {
    display: flex;
    align-items: center;
    margin-bottom: 10px;

    .name {
      display: block;
      width: 50px;
    }
  }
}
</style>
