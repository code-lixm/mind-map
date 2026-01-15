<script setup lang="ts">
import type { AiConfig, EventBus, LocaleText, MindMapInstance } from '../types'
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  checkNodeOuter,
  createUid,
  getStrWithBrFromHtml,
  isUndef,
} from 'simple-mind-map/src/utils'
import { transformMarkdownTo } from 'simple-mind-map/src/parse/markdownTo'
import Ai from '@/utils/ai'
import { defaultLocaleText } from '@/locale'
import AiConfigDialog from './AiConfigDialog.vue'

// 定义 Store 接口
interface Store {
  state: {
    aiConfig: AiConfig
    [key: string]: unknown
  }
  commit: (mutation: string, payload: unknown) => void
  [key: string]: unknown
}

// Props
interface Props {
  mindMap?: MindMapInstance
}

const props = withDefaults(defineProps<Props>(), {
  mindMap: undefined,
})

// 注入国际化
const localeText = inject<LocaleText>('localeText', defaultLocaleText)

// 注入事件总线
const eventBus = inject<EventBus>('eventBus')

// 注入 store
const storeInject = inject<Store>('store')
const aiConfig = computed(() => storeInject?.state.aiConfig || {} as AiConfig)

// 定义 MindMap 节点数据类型（simple-mind-map 库生成的数据结构）
interface MindMapNodeData {
  data: {
    uid?: string
    text?: string
    [key: string]: unknown
  }
  children?: MindMapNodeData[]
  [key: string]: unknown
}

// Refs
const aiCreatingMaskRef = ref<HTMLDivElement>()

// 状态
const aiInstance = ref<InstanceType<typeof Ai> | null>(null)
const isAiCreating = ref(false)
const aiCreatingContent = ref('')

const isLoopRendering = ref(false)
const uidMap = ref<Record<string, string>>({})
const latestUid = ref('')

const clientTipDialogVisible = ref(false)
const createDialogVisible = ref(false)
const aiInput = ref('')
const aiCreatingMaskVisible = ref(false)
const aiConfigDialogVisible = ref(false)

const mindMapDataCache = ref('')
const beingAiCreateNodeUid = ref('')

const createPartDialogVisible = ref(false)
const aiPartInput = ref('')
// 注意：beingCreatePartNode 使用 any 类型是因为来自 simple-mind-map 库，该库没有提供 TypeScript 类型定义
const beingCreatePartNode = ref<any>(null)

// 显示AI配置修改弹窗
function showAiConfigDialog() {
  aiConfigDialogVisible.value = true
}

// 客户端连接检测
async function testConnect() {
  try {
    await fetch(`http://localhost:${aiConfig.value.port}/ai/test`, {
      method: 'GET',
    })
    ElMessage.success(localeText?.ai?.connectSuccessful || '')
    clientTipDialogVisible.value = false
    createDialogVisible.value = true
  }
  catch (error) {
    console.log(error)
    ElMessage.error(localeText?.ai?.connectFailed || '')
  }
}

// 检测ai是否可用
async function aiTest() {
  // 检查配置
  if (
    !(
      aiConfig.value.api
      && aiConfig.value.key
      && aiConfig.value.model
      && aiConfig.value.port
    )
  ) {
    showAiConfigDialog()
    throw new Error(localeText?.ai?.configurationMissing || '')
  }
  // 检查连接
  let isConnect = false
  try {
    await fetch(`http://localhost:${aiConfig.value.port}/ai/test`, {
      method: 'GET',
    })
    isConnect = true
  }
  catch (error) {
    console.log(error)
    clientTipDialogVisible.value = true
  }
  if (!isConnect) {
    throw new Error(localeText?.ai?.connectFailed || '')
  }
}

// AI生成整体
async function aiCrateAll() {
  try {
    await aiTest()
    createDialogVisible.value = true
  }
  catch (error) {
    console.log(error)
  }
}

// 关闭ai内容输入弹窗
function closeAiCreateDialog() {
  createDialogVisible.value = false
  aiInput.value = ''
}

// 确认生成
function doAiCreate() {
  const aiInputText = aiInput.value.trim()
  if (!aiInputText) {
    ElMessage.warning(localeText?.ai?.noInputTip || '')
    return
  }
  closeAiCreateDialog()
  aiCreatingMaskVisible.value = true
  // 发起请求
  isAiCreating.value = true
  aiInstance.value = new Ai({
    port: aiConfig.value.port,
  })
  aiInstance.value.init('huoshan', aiConfig.value)
  props.mindMap?.renderer.setRootNodeCenter()
  props.mindMap?.setData({
    root: {
      data: { text: '' },
      children: [],
    },
  })
  aiInstance.value.request(
    {
      messages: [
        {
          role: 'user',
          content: `${localeText?.ai?.aiCreateMsgPrefix || ''}${aiInputText}${localeText?.ai?.aiCreateMsgPostfix || ''}`,
        },
      ],
    },
    (content: string) => {
      if (content) {
        const arr = content.split(/\n+/)
        aiCreatingContent.value = arr.splice(0, arr.length - 1).join('\n')
      }
      loopRenderOnAiCreating()
    },
    (content: string) => {
      aiCreatingContent.value = content
      resetOnAiCreatingStop()
    },
    () => {
      resetOnAiCreatingStop()
      resetOnRenderEnd()
      ElMessage.error(localeText?.ai?.generationFailed || '')
    },
  )
}

// AI请求完成或出错后需要复位的数据
function resetOnAiCreatingStop() {
  aiCreatingMaskVisible.value = false
  isAiCreating.value = false
  aiInstance.value = null
}

// 渲染结束后需要复位的数据
function resetOnRenderEnd() {
  isLoopRendering.value = false
  uidMap.value = {}
  aiCreatingContent.value = ''
  mindMapDataCache.value = ''
  beingAiCreateNodeUid.value = ''
}

// 停止生成
function stopCreate() {
  aiInstance.value.stop()
  isAiCreating.value = false
  aiCreatingMaskVisible.value = false
  ElMessage.success(localeText?.ai?.stoppedGenerating || '')
}

// 轮询进行渲染
function loopRenderOnAiCreating() {
  if (!aiCreatingContent.value.trim() || isLoopRendering.value)
    return
  isLoopRendering.value = true
  const treeData = transformMarkdownTo(aiCreatingContent.value)
  addUid(treeData)
  let lastTreeData = JSON.stringify(treeData)

  // 在当前渲染完成时再进行下一次渲染
  const onRenderEnd = () => {
    // 处理超出画布的节点
    checkNodeOuterFn()

    // 如果生成结束数据渲染完毕,那么解绑事件
    if (!isAiCreating.value && !aiCreatingContent.value) {
      props.mindMap.off('node_tree_render_end', onRenderEnd)
      latestUid.value = ''
      return
    }

    const treeData = transformMarkdownTo(aiCreatingContent.value)
    addUid(treeData)
    // 正在生成中
    if (isAiCreating.value) {
      // 如果和上次数据一样则不触发重新渲染
      const curTreeData = JSON.stringify(treeData)
      if (curTreeData === lastTreeData) {
        setTimeout(() => {
          onRenderEnd()
        }, 500)
        return
      }
      lastTreeData = curTreeData
      props.mindMap.updateData(treeData)
    }
    else {
      // 已经生成结束
      // 还要触发一遍渲染,否则会丢失数据
      props.mindMap.updateData(treeData)
      resetOnRenderEnd()
      ElMessage.success(localeText?.ai?.aiGenerationSuccess || '')
    }
  }
  props.mindMap.on('node_tree_render_end', onRenderEnd)

  props.mindMap.setData(treeData)
}

// 处理超出画布的节点
function checkNodeOuterFn() {
  if (latestUid.value) {
    const latestNode = props.mindMap.renderer.findNodeByUid(latestUid.value)
    if (latestNode) {
      const { isOuter, offsetLeft, offsetTop } = checkNodeOuter(
        props.mindMap,
        latestNode,
        100,
        100,
      )
      if (isOuter) {
        props.mindMap.view.translateXY(offsetLeft, offsetTop)
      }
    }
  }
}

// 给AI生成的数据添加uid
function addUid(data: MindMapNodeData) {
  const checkRepeatUidMap: Record<string, boolean> = {}
  const walk = (node: MindMapNodeData, pUid = '') => {
    if (!node.data) {
      node.data = {}
    }
    if (isUndef(node.data.uid)) {
      // 根据pUid+文本内容来复用上一次生成数据的uid
      const key = `${pUid}-${node.data.text}`
      node.data.uid = uidMap.value[key] || createUid()
      // 当前uid和之前的重复,那么重新生成一个。这种情况很少,但是以防万一
      if (checkRepeatUidMap[node.data.uid]) {
        node.data.uid = createUid()
      }
      latestUid.value = uidMap.value[key] = node.data.uid
      checkRepeatUidMap[node.data.uid] = true
    }
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: MindMapNodeData) => {
        walk(child, node.data.uid as string)
      })
    }
  }
  walk(data)
}

// 显示AI续写弹窗
// 注意：node 参数使用 any 类型是因为来自 simple-mind-map 库,该库没有提供 TypeScript 类型定义
function showAiCreatePartDialog(node: any) {
  beingCreatePartNode.value = node
  const currentMindMapData = props.mindMap?.getData()
  // 填充默认内容
  aiPartInput.value = `${localeText.value.ai?.aiCreatePartMsgPrefix || ''}${getStrWithBrFromHtml(currentMindMapData?.root?.data?.text || '')}${localeText.value.ai?.aiCreatePartMsgCenter || ''}${getStrWithBrFromHtml(node.getData('text'))}${localeText.value.ai?.aiCreatePartMsgPostfix || ''}`
  createPartDialogVisible.value = true
}

// 关闭AI续写弹窗
function closeAiCreatePartDialog() {
  createPartDialogVisible.value = false
}

// 复位AI续写弹窗数据
function resetAiCreatePartDialog() {
  beingCreatePartNode.value = null
  aiPartInput.value = ''
}

// 确认AI续写
function confirmAiCreatePart() {
  if (!aiPartInput.value.trim())
    return
  closeAiCreatePartDialog()
  aiCreatePart()
}

// AI生成部分
async function aiCreatePart() {
  try {
    if (!beingCreatePartNode.value) {
      return
    }
    await aiTest()
    beingAiCreateNodeUid.value = beingCreatePartNode.value.getData('uid')
    const currentMindMapData = props.mindMap.getData()
    mindMapDataCache.value = JSON.stringify(currentMindMapData)
    aiCreatingMaskVisible.value = true
    // 发起请求
    isAiCreating.value = true
    aiInstance.value = new Ai({
      port: aiConfig.value.port,
    })
    aiInstance.value.init('huoshan', aiConfig.value)
    aiInstance.value.request(
      {
        messages: [
          {
            role: 'user',
            content:
              aiPartInput.value.trim()
              + (localeText?.ai?.aiCreatePartMsgHelp || ''),
          },
        ],
      },
      (content: string) => {
        if (content) {
          const arr = content.split(/\n+/)
          aiCreatingContent.value = arr.splice(0, arr.length - 1).join('\n')
        }

        loopRenderOnAiCreatingPart()
      },
      (content: string) => {
        aiCreatingContent.value = content
        resetOnAiCreatingStop()
        resetAiCreatePartDialog()
      },
      () => {
        resetOnAiCreatingStop()
        resetAiCreatePartDialog()
        resetOnRenderEnd()
        ElMessage.error(localeText?.ai?.generationFailed || '')
      },
    )
  }
  catch (error) {
    console.log(error)
  }
}

// 将生成的数据添加到指定节点上
function addToTargetNode(newChildren: MindMapNodeData[] = []) {
  const initData: MindMapNodeData = JSON.parse(mindMapDataCache.value)
  const walk = (node: MindMapNodeData) => {
    if (node.data.uid === beingAiCreateNodeUid.value) {
      if (!node.children) {
        node.children = []
      }
      node.children.push(...newChildren)
      return
    }
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: MindMapNodeData) => {
        walk(child)
      })
    }
  }
  walk(initData)
  return initData
}

// 轮询进行部分渲染
function loopRenderOnAiCreatingPart() {
  if (!aiCreatingContent.value.trim() || isLoopRendering.value)
    return
  isLoopRendering.value = true
  const partData = transformMarkdownTo(aiCreatingContent.value)
  addUid(partData)
  let lastPartData = JSON.stringify(partData)
  const treeData = addToTargetNode(partData.children || [])

  // 在当前渲染完成时再进行下一次渲染
  const onRenderEnd = () => {
    // 处理超出画布的节点
    checkNodeOuterFn()

    // 如果生成结束数据渲染完毕,那么解绑事件
    if (!isAiCreating.value && !aiCreatingContent.value) {
      props.mindMap.off('node_tree_render_end', onRenderEnd)
      latestUid.value = ''
      return
    }

    const partData = transformMarkdownTo(aiCreatingContent.value)
    addUid(partData)
    const treeData = addToTargetNode(partData.children || [])

    if (isAiCreating.value) {
      // 如果和上次数据一样则不触发重新渲染
      const curPartData = JSON.stringify(partData)
      if (curPartData === lastPartData) {
        setTimeout(() => {
          onRenderEnd()
        }, 500)
        return
      }
      lastPartData = curPartData
      props.mindMap.updateData(treeData)
    }
    else {
      props.mindMap.updateData(treeData)
      resetOnRenderEnd()
      ElMessage.success(localeText?.ai?.aiGenerationSuccess || '')
    }
  }
  props.mindMap.on('node_tree_render_end', onRenderEnd)
  // 因为是续写,所以首次也直接使用updateData方法渲染
  props.mindMap.updateData(treeData)
}

// AI对话
async function aiChat(
  messageList: string[] = [],
  progress: (content: string) => void = () => {},
  end: (content: string) => void = () => {},
  err: (error: any) => void = () => {},
) {
  try {
    await aiTest()
    // 发起请求
    isAiCreating.value = true
    aiInstance.value = new Ai({
      port: aiConfig.value.port,
    })
    aiInstance.value.init('huoshan', aiConfig.value)
    aiInstance.value.request(
      {
        messages: messageList.map((msg) => {
          return {
            role: 'user',
            content: msg,
          }
        }),
      },
      (content: string) => {
        progress(content)
      },
      (content: string) => {
        end(content)
      },
      (error: any) => {
        err(error)
      },
    )
  }
  catch (error) {
    console.log(error)
  }
}

// AI对话停止
function aiChatStop() {
  if (aiInstance.value) {
    aiInstance.value.stop()
    isAiCreating.value = false
    aiInstance.value = null
  }
}

// 生命周期
onMounted(() => {
  if (aiCreatingMaskRef.value) {
    document.body.appendChild(aiCreatingMaskRef.value)
  }
  if (eventBus) {
    eventBus.on('ai_create_all', aiCrateAll)
    eventBus.on('ai_create_part', showAiCreatePartDialog)
    eventBus.on('ai_chat', aiChat)
    eventBus.on('ai_chat_stop', aiChatStop)
    eventBus.on('showAiConfigDialog', showAiConfigDialog)
  }
})

onBeforeUnmount(() => {
  if (eventBus) {
    eventBus.off('ai_create_all', aiCrateAll)
    eventBus.off('ai_create_part', showAiCreatePartDialog)
    eventBus.off('ai_chat', aiChat)
    eventBus.off('ai_chat_stop', aiChatStop)
    eventBus.off('showAiConfigDialog', showAiConfigDialog)
  }
})
</script>

<template>
  <div>
    <!-- 客户端连接失败提示弹窗 -->
    <el-dialog
      v-model="clientTipDialogVisible"
      class="clientTipDialog"
      :title="localeText?.ai?.connectFailedTitle"
      width="400px"
      append-to-body
    >
      <div class="tipBox">
        <p>{{ localeText?.ai?.connectFailedTip }}</p>
        <p>
          {{ localeText?.ai?.connectFailedCheckTip1
          }}<a
            href="https://pan.baidu.com/s/1huasEbKsGNH2Af68dvWiOg?pwd=3bp3"
          >{{ localeText?.ai?.baiduNetdisk }}</a>、<a href="https://github.com/wanglin2/mind-map/releases">Github</a>
        </p>
        <p>{{ localeText?.ai?.connectFailedCheckTip2 }}</p>
        <p>{{ localeText?.ai?.connectFailedCheckTip3 }}</p>
        <p>
          {{ localeText?.ai?.connectFailedCheckTip4
          }}<el-button size="small" @click="testConnect">
            {{
              localeText?.ai?.connectionDetection
            }}
          </el-button>
        </p>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="clientTipDialogVisible = false">
            {{ localeText?.ai?.close }}
          </el-button>
        </div>
      </template>
    </el-dialog>
    <!-- ai内容输入弹窗 -->
    <el-dialog
      v-model="createDialogVisible"
      class="createDialog"
      :title="localeText?.ai?.createMindMapTitle"
      width="450px"
      append-to-body
    >
      <div class="inputBox">
        <el-input
          v-model="aiInput"
          type="textarea"
          :rows="5"
          :placeholder="localeText?.ai?.createTip"
        />
        <div class="tip warning">
          {{ localeText?.ai?.importantTip }}
        </div>
        <div class="tip">
          {{ localeText?.ai?.wantModifyAiConfigTip
          }}<el-button size="small" @click="showAiConfigDialog">
            {{
              localeText?.ai?.modifyAIConfiguration
            }}
          </el-button>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeAiCreateDialog">
            {{ localeText?.ai?.cancel }}
          </el-button>
          <el-button type="primary" @click="doAiCreate">
            {{ localeText?.ai?.confirm }}
          </el-button>
        </div>
      </template>
    </el-dialog>
    <!-- ai生成中添加一个透明层,防止期间用户进行操作 -->
    <div
      v-show="aiCreatingMaskVisible"
      ref="aiCreatingMaskRef"
      class="aiCreatingMask"
    >
      <el-button type="warning" class="btn" @click="stopCreate">
        {{ localeText?.ai?.stopGenerating }}
      </el-button>
    </div>
    <AiConfigDialog v-model:visible="aiConfigDialogVisible" />
    <!-- AI续写 -->
    <el-dialog
      v-model="createPartDialogVisible"
      class="createDialog"
      :title="localeText?.ai?.aiCreatePart"
      width="450px"
      append-to-body
    >
      <div class="inputBox">
        <el-input v-model="aiPartInput" type="textarea" :rows="5" />
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeAiCreatePartDialog">
            {{ localeText?.ai?.cancel }}
          </el-button>
          <el-button type="primary" @click="confirmAiCreatePart">
            {{ localeText?.ai?.confirm }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.clientTipDialog,
.createDialog {
  :deep(.el-dialog__body) {
    padding: 12px 20px;
  }
}

.tipBox {
  p {
    margin-bottom: 12px;

    a {
      color: var(--el-color-primary);
    }
  }
}

.inputBox {
  .tip {
    margin-top: 12px;

    &.warning {
      color: #f56c6c;
    }
  }
}

.aiCreatingMask {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 99999;
  background-color: transparent;

  .btn {
    position: absolute;
    left: 50%;
    top: 100px;
    transform: translateX(-50%);
  }
}
</style>
