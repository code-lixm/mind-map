<script setup lang="ts">
import type { LocaleTextProvider } from '../types'
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElLoading, ElMessage, ElNotification } from 'element-plus'
import { Close, Edit, FolderChecked } from '@element-plus/icons-vue'
import exampleData from 'simple-mind-map/example/exampleData'
import { isMobile as checkIsMobile, throttle } from 'simple-mind-map/src/utils/index'
import Export from './Export.vue'
import Import from './Import.vue'
import ToolbarNodeBtnList from './ToolbarNodeBtnList.vue'
import { useEditorState } from '../composables/useEditorState'

const props = defineProps<{
  mode?: 'readonly' | 'edit'
  isSaving?: boolean
  hasUnsavedChanges?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'save'): void
  (e: 'cancel'): void
}>()

// 工具栏
let fileHandle: any = null
const defaultBtnList = [
  'back',
  'forward',
  'painter',
  'siblingNode',
  'childNode',
  'deleteNode',
  'image',
  'icon',
  'link',
  'note',
  'tag',
  'summary',
  'associativeLine',
  'formula',
  // 'attachment',
  'outerFrame',
  'annotation',
  // 注释掉:AI 按钮
  // 'ai',
]

const localeText = inject<LocaleTextProvider>('localeText')!
const eventBus = inject<any>('eventBus')!
const editorStore = useEditorState()
const { isDark, isHandleLocalFile, openNodeRichText, enableAi } = storeToRefs(editorStore)
const { setIsHandleLocalFile, setActiveSidebar } = editorStore

const isMobile = ref(checkIsMobile())
const horizontalList = ref<string[]>([])
const verticalList = ref<string[]>([])
const showMoreBtn = ref(true)
const popoverShow = ref(false)
const fileTreeProps = {
  label: 'name',
  children: 'children',
  isLeaf: 'leaf',
}
const fileTreeVisible = ref(false)
const rootDirName = ref('')
const fileTreeExpand = ref(true)
const waitingWriteToLocalFile = ref(false)
const toolbarRef = ref<HTMLElement | null>(null)
const ImportRef = ref<any>(null)
let timer: NodeJS.Timeout | null = null
let isFullDataFile = false

const btnLit = computed(() => {
  let res = [...defaultBtnList]
  if (!openNodeRichText.value) {
    res = res.filter(item => item !== 'formula')
  }
  if (!enableAi.value) {
    res = res.filter(item => item !== 'ai')
  }
  return res
})

const isEditMode = computed(() => props.mode === 'edit')

watch(isHandleLocalFile, (val) => {
  if (!val) {
    ElNotification.closeAll()
  }
})

watch(btnLit, () => {
  computeToolbarShow()
}, { deep: true })

onMounted(() => {
  computeToolbarShow()
  const computeToolbarShowThrottle = throttle(computeToolbarShow, 300)
  window.addEventListener('resize', computeToolbarShowThrottle)
  eventBus.on('lang_change', computeToolbarShowThrottle)
  window.addEventListener('beforeunload', onUnload)
  eventBus.on('write_local_file', onWriteLocalFile)
  eventBus.on('node_note_dblclick', onNodeNoteDblclick)
})

onBeforeUnmount(() => {
  const computeToolbarShowThrottle = throttle(computeToolbarShow, 300)
  window.removeEventListener('resize', computeToolbarShowThrottle)
  eventBus.off('lang_change', computeToolbarShowThrottle)
  window.removeEventListener('beforeunload', onUnload)
  eventBus.off('write_local_file', onWriteLocalFile)
  eventBus.off('node_note_dblclick', onNodeNoteDblclick)
})

// 计算工具按钮如何显示
function computeToolbarShow() {
  if (!toolbarRef.value)
    return
  const windowWidth = window.innerWidth - 40
  const all = [...btnLit.value]
  let index = 1
  const done = () => {
    verticalList.value = all.slice(index)
    showMoreBtn.value = verticalList.value.length > 0
  }
  const loopCheck = () => {
    if (index > all.length)
      return done()
    horizontalList.value = all.slice(0, index)
    nextTick(() => {
      const width = toolbarRef.value!.getBoundingClientRect().width
      if (width < windowWidth) {
        index++
        loopCheck()
      }
      else if (index > 0 && width > windowWidth) {
        index--
        horizontalList.value = all.slice(0, index)
        done()
      }
    })
  }
  loopCheck()
}

// 监听本地文件读写
function onWriteLocalFile(content: any) {
  if (timer)
    clearTimeout(timer)
  if (fileHandle && isHandleLocalFile.value) {
    waitingWriteToLocalFile.value = true
  }
  timer = setTimeout(() => {
    writeLocalFile(content)
  }, 1000)
}

function onUnload(e: any) {
  if (waitingWriteToLocalFile.value) {
    const msg = '存在未保存的数据'
    e.returnValue = msg
    return msg
  }
}

// 加载本地文件树
async function loadFileTreeNode(node: any, resolve: any) {
  try {
    let dirHandle
    if (node.level === 0) {
      dirHandle = await (window as any).showDirectoryPicker()
      rootDirName.value = dirHandle.name
    }
    else {
      dirHandle = node.data.handle
    }
    const dirList: any[] = []
    const fileList: any[] = []
    for await (const [key, value] of dirHandle.entries()) {
      const isFile = value.kind === 'file'
      // 注释掉:移除 .smm 格式支持
      if (isFile && !/\.(?:xmind|md|json)$/.test(value.name)) {
        continue
      }
      // 注释掉:移除 .smm 格式编辑支持
      const enableEdit = false // isFile && /\.smm$/.test(value.name)
      const data = {
        id: key,
        name: value.name,
        type: value.kind,
        handle: value,
        leaf: isFile,
        enableEdit,
      }
      if (isFile) {
        fileList.push(data)
      }
      else {
        dirList.push(data)
      }
    }
    resolve([...dirList, ...fileList])
  }
  catch (error: any) {
    console.log(error)
    fileTreeVisible.value = false
    resolve([])
    if (error?.toString().includes('aborted')) {
      return
    }
    ElMessage.warning(localeText('toolbar.notSupportTip'))
  }
}

// 扫描本地文件夹
function openDirectory() {
  fileTreeVisible.value = false
  fileTreeExpand.value = true
  rootDirName.value = ''
  nextTick(() => {
    fileTreeVisible.value = true
  })
}

// 编辑指定文件
function editLocalFile(data: any) {
  if (data.handle) {
    fileHandle = data.handle
    readFile()
  }
}

// 导入指定文件
async function importLocalFile(data: any) {
  try {
    const file = await data.handle.getFile()
    ImportRef.value.onChange({
      raw: file,
      name: file.name,
    })
    ImportRef.value.confirm()
  }
  catch (error) {
    console.log(error)
  }
}

// 打开本地文件
async function openLocalFile() {
  try {
    // 注释掉:移除 .smm 格式支持
    const [_fileHandle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: '',
          accept: {
            'application/json': ['.json'], // 原来是 '.smm'
          },
        },
      ],
      excludeAcceptAllOption: true,
      multiple: false,
    })
    if (!_fileHandle) {
      return
    }
    fileHandle = _fileHandle
    if (fileHandle.kind === 'directory') {
      ElMessage.warning(localeText('toolbar.selectFileTip'))
      return
    }
    readFile()
  }
  catch (error: any) {
    console.log(error)
    if (error?.toString().includes('aborted')) {
      return
    }
    ElMessage.warning(localeText('toolbar.notSupportTip'))
  }
}

// 读取本地文件
async function readFile() {
  const file = await fileHandle.getFile()
  const fileReader = new FileReader()
  fileReader.onload = async () => {
    setIsHandleLocalFile(true)
    setData(fileReader.result as string)
    ElNotification.closeAll()
    ElNotification({
      title: localeText('toolbar.tip'),
      message: `${localeText('toolbar.editingLocalFileTipFront')}${file.name
      }${localeText('toolbar.editingLocalFileTipEnd')}`,
      duration: 0,
      showClose: true,
    })
  }
  fileReader.readAsText(file)
}

// 渲染读取的数据
function setData(str: string) {
  try {
    let data = JSON.parse(str)
    if (typeof data !== 'object' || data === null) {
      throw new TypeError(localeText('toolbar.fileContentError'))
    }
    if (data.root) {
      isFullDataFile = true
    }
    else {
      isFullDataFile = false
      data = {
        ...exampleData,
        root: data,
      }
    }
    eventBus.emit('setData', data)
  }
  catch (error) {
    console.log(error)
    ElMessage.error(localeText('toolbar.fileOpenFailed'))
  }
}

// 写入本地文件
async function writeLocalFile(content: any) {
  if (!fileHandle || !isHandleLocalFile.value) {
    waitingWriteToLocalFile.value = false
    return
  }
  let dataToWrite = content
  if (!isFullDataFile) {
    dataToWrite = content.root
  }
  const string = JSON.stringify(dataToWrite)
  const writable = await fileHandle.createWritable()
  await writable.write(string)
  await writable.close()
  waitingWriteToLocalFile.value = false
}

// 创建本地文件
async function createNewLocalFile() {
  await createLocalFile(exampleData)
}

// 创建本地文件
async function createLocalFile(content: any) {
  try {
    // 注释掉:移除 .smm 格式支持
    const _fileHandle = await (window as any).showSaveFilePicker({
      types: [
        {
          description: '',
          accept: { 'application/json': ['.json'] }, // 原来是 '.smm'
        },
      ],
      suggestedName: localeText('toolbar.defaultFileName'),
    })
    if (!_fileHandle) {
      return
    }
    const loading = ElLoading.service({
      lock: true,
      text: localeText('toolbar.creatingTip'),
      background: 'rgba(0, 0, 0, 0.7)',
    })
    fileHandle = _fileHandle
    setIsHandleLocalFile(true)
    isFullDataFile = true
    await writeLocalFile(content)
    await readFile()
    loading.close()
  }
  catch (error: any) {
    console.log(error)
    if (error?.toString().includes('aborted')) {
      return
    }
    ElMessage.warning(localeText('toolbar.notSupportTip'))
  }
}

function onNodeNoteDblclick(node: any, e: any) {
  e.stopPropagation()
  eventBus.emit('showNodeNote', node)
}

function handleSetActiveSidebar(value: string) {
  setActiveSidebar(value)
}
</script>

<template>
  <div
    class="toolbarContainer"
    :class="{ isDark }"
  >
    <div
      ref="toolbarRef"
      class="toolbar"
    >
      <!-- 节点操作 -->
      <div class="toolbarBlock">
        <ToolbarNodeBtnList
          :list="horizontalList"
          :is-dark="isDark"
          :mode="props.mode"
          @set-active-sidebar="handleSetActiveSidebar"
        />
        <!-- 更多 -->
        <el-popover
          v-if="showMoreBtn"
          v-model:visible="popoverShow"
          placement="bottom-end"
          width="120"
          trigger="hover"
          :style="{ marginLeft: horizontalList.length > 0 ? '20px' : 0 }"
        >
          <template #reference>
            <div class="toolbarBtn">
              <span class="icon iconfont icongongshi" />
              <span class="text">{{ localeText('toolbar.more') }}</span>
            </div>
          </template>
          <ToolbarNodeBtnList
            dir="v"
            :list="verticalList"
            :is-dark="isDark"
            :mode="props.mode"
            @set-active-sidebar="handleSetActiveSidebar"
            @click="popoverShow = false"
          />
        </el-popover>
      </div>
      <!-- 导出 / 编辑操作 -->
      <div class="toolbarBlock">
        <!-- 注释掉:目录功能 -->
        <!-- <div v-if="!isMobile" class="toolbarBtn" @click="openDirectory">
          <span class="icon iconfont icondakai" />
          <span class="text">{{ localeText('toolbar.directory') }}</span>
        </div> -->
        <!-- 注释掉:新建文件功能 -->
        <!-- <el-tooltip
          v-if="!isMobile"
          effect="dark"
          :content="localeText('toolbar.newFileTip')"
          placement="bottom"
        >
          <div class="toolbarBtn" @click="createNewLocalFile">
            <span class="icon iconfont iconxinjian" />
            <span class="text">{{ localeText('toolbar.newFile') }}</span>
          </div>
        </el-tooltip> -->
        <!-- 注释掉:打开文件功能 -->
        <!-- <el-tooltip
          v-if="!isMobile"
          effect="dark"
          :content="localeText('toolbar.openFileTip')"
          placement="bottom"
        >
          <div class="toolbarBtn" @click="openLocalFile">
            <span class="icon iconfont iconwenjian1" />
            <span class="text">{{ localeText('toolbar.openFile') }}</span>
          </div>
        </el-tooltip> -->
        <!-- 注释掉:另存为功能 -->
        <!-- <div v-if="!isMobile" class="toolbarBtn" @click="saveLocalFile">
          <span class="icon iconfont iconlingcunwei" />
          <span class="text">{{ localeText('toolbar.saveAs') }}</span>
        </div> -->
        <div
          v-if="isEditMode"
          class="toolbarBtn"
          @click="eventBus.emit('showImport')"
        >
          <span class="icon iconfont icondaoru" />
          <span class="text">{{ localeText('toolbar.import') }}</span>
        </div>
        <div
          class="toolbarBtn"
          @click="eventBus.emit('showExport')"
        >
          <span class="icon iconfont iconexport" />
          <span class="text">{{ localeText('toolbar.export') }}</span>
        </div>

        <!-- 编辑模式按钮 -->
        <template v-if="isEditMode">
          <div
            class="toolbarBtn"
            @click="$emit('cancel')"
          >
            <span class="icon">
              <el-icon>
                <Close />
              </el-icon>
            </span>
            <span class="text">退出</span>
          </div>
          <div
            class="toolbarBtn"
            @click="$emit('save')"
          >
            <span
              class="icon"
              :class="{ 'is-saving': isSaving }"
            >
              <el-icon v-if="!isSaving">
                <FolderChecked />
              </el-icon>
              <el-icon v-else>
                <FolderChecked />
              </el-icon>
            </span>
            <span class="text">
              {{ isSaving ? '保存中' : '保存' }}
              <span
                v-if="hasUnsavedChanges"
                class="unsaved-dot"
              />
            </span>
          </div>
        </template>

        <!-- 预览模式按钮 -->
        <template v-else>
          <div
            class="toolbarBtn"
            @click="$emit('edit')"
          >
            <span class="icon">
              <el-icon>
                <Edit />
              </el-icon>
            </span>
            <span class="text">编辑</span>
          </div>
        </template>

        <!-- 本地文件树 -->
        <div
          v-if="fileTreeVisible"
          class="fileTreeBox"
          :class="{ expand: fileTreeExpand }"
        >
          <div class="fileTreeToolbar">
            <div class="fileTreeName">
              {{ rootDirName ? `/${rootDirName}` : '' }}
            </div>
            <div class="fileTreeActionList">
              <div
                class="btn"
                :class="[
                  fileTreeExpand ? 'i-ep:arrow-up' : 'i-ep:arrow-down',
                ]"
                @click="fileTreeExpand = !fileTreeExpand"
              />
              <div
                class="btn i-ep:close"
                @click="fileTreeVisible = false"
              />
            </div>
          </div>
          <div class="fileTreeWrap">
            <el-tree
              :props="fileTreeProps"
              :load="loadFileTreeNode"
              :expand-on-click-node="false"
              node-key="id"
              lazy
            >
              <template #default="{ node, data }">
                <span class="customTreeNode">
                  <div class="treeNodeInfo">
                    <span
                      class="treeNodeIcon iconfont"
                      :class="[
                        data.type === 'file' ? 'iconwenjian' : 'icondakai',
                      ]"
                    />
                    <span class="treeNodeName">{{ node.label }}</span>
                  </div>
                  <div
                    v-if="data.type === 'file'"
                    class="treeNodeBtnList"
                  >
                    <el-button
                      v-if="data.enableEdit"
                      type="text"
                      size="small"
                      @click="editLocalFile(data)"
                    >编辑</el-button>
                    <el-button
                      v-else
                      type="text"
                      size="small"
                      @click="importLocalFile(data)"
                    >导入</el-button>
                  </div>
                </span>
              </template>
            </el-tree>
          </div>
        </div>
      </div>
    </div>
    <Export />
    <Import ref="ImportRef" />
  </div>
</template>

<style lang="scss" scoped>
.unsaved-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background-color: #f56c6c;
  border-radius: 50%;
  margin-left: 2px;
  vertical-align: middle;
}

.toolbarContainer {
  &.isDark {
    .toolbar {
      color: hsla(0, 0%, 100%, 0.9);

      .toolbarBlock {
        background-color: #262a2e;

        .fileTreeBox {
          background-color: #262a2e;

          :deep(.el-tree) {
            background-color: #262a2e;

            &.el-tree--highlight-current {
              .el-tree-node.is-current > .el-tree-node__content {
                background-color: hsla(0, 0%, 100%, 0.05) !important;
              }
            }

            .el-tree-node:focus > .el-tree-node__content {
              background-color: hsla(0, 0%, 100%, 0.05) !important;
            }

            .el-tree-node__content:hover,
            .el-upload-list__item:hover {
              background-color: hsla(0, 0%, 100%, 0.02) !important;
            }
          }

          .fileTreeWrap {
            .customTreeNode {
              .treeNodeInfo {
                color: #fff;
              }

              .treeNodeBtnList {
                .el-button {
                  padding: 7px 5px;
                }
              }
            }
          }
        }
      }

      .toolbarBtn {
        .icon {
          background: transparent;
          border-color: transparent;
        }

        &:hover {
          &:not(.disabled) {
            .icon {
              background: hsla(0, 0%, 100%, 0.05);
            }
          }
        }

        &.disabled {
          color: #54595f;
        }
      }
    }
  }

  .toolbar {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 20px;
    width: max-content;
    display: flex;
    font-size: 12px;
    font-family:
      PingFangSC-Regular,
      PingFang SC;
    font-weight: 400;
    color: rgba(26, 26, 26, 0.8);
    z-index: 2;

    .toolbarBlock {
      display: flex;
      background-color: #fff;
      padding: 10px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(0, 0, 0, 0.06);
      margin-right: 20px;
      flex-shrink: 0;
      position: relative;

      &:last-of-type {
        margin-right: 0;
      }

      .fileTreeBox {
        position: absolute;
        left: 0;
        top: 68px;
        width: 100%;
        height: 30px;
        background-color: #fff;
        padding: 12px 5px;
        padding-top: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 5px;
        min-width: 200px;
        box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);

        &.expand {
          height: 300px;

          .fileTreeWrap {
            visibility: visible;
          }
        }

        .fileTreeToolbar {
          width: 100%;
          height: 30px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e9e9e9;
          margin-bottom: 12px;
          padding-left: 12px;

          .fileTreeName {
          }

          .fileTreeActionList {
            .btn {
              font-size: 18px;
              margin-left: 12px;
              cursor: pointer;
            }
          }
        }

        .fileTreeWrap {
          width: 100%;
          height: 100%;
          overflow: auto;
          visibility: hidden;

          .customTreeNode {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 13px;
            padding-right: 5px;

            .treeNodeInfo {
              display: flex;
              align-items: center;

              .treeNodeIcon {
                margin-right: 5px;
                opacity: 0.7;
              }

              .treeNodeName {
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }

            .treeNodeBtnList {
              display: flex;
              align-items: center;
            }
          }
        }
      }
    }

    .toolbarBtn {
      display: flex;
      justify-content: center;
      flex-direction: column;
      cursor: pointer;
      margin-right: 20px;

      &:last-of-type {
        margin-right: 0;
      }

      &:hover {
        &:not(.disabled) {
          .icon {
            background: #f5f5f5;
          }
        }
      }

      &.active {
        .icon {
          background: #f5f5f5;
        }
      }

      &.disabled {
        color: #bcbcbc;
        cursor: not-allowed;
        pointer-events: none;
      }

      .icon {
        display: flex;
        height: 26px;
        background: #fff;
        border-radius: 4px;
        border: 1px solid #e9e9e9;
        justify-content: center;
        flex-direction: column;
        text-align: center;
        padding: 0 5px;
        /* Ensure Element Plus icons center correctly */
        align-items: center;
        font-size: 16px;
      }

      .text {
        margin-top: 3px;
        text-align: center;
      }
    }
  }
}
</style>
