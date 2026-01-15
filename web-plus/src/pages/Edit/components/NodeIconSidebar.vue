<script setup lang="ts">
import { inject, onBeforeUnmount, ref, watch } from 'vue'
import { mergerIconList } from 'simple-mind-map/src/utils/index'
import icon from '@/config/icon'
import Sidebar from './Sidebar.vue'
import { stickerList } from '@/config/image'
import { useEditorState } from '@/composables/useEditorState'

// Props
interface Props {
  activeSidebar: string | null
  isDark: boolean
}

const props = defineProps<Props>()

// 注入
const localeText = inject('localeText', {} as any)
const eventBus = inject('eventBus') as any

// Store
const editorStore = useEditorState()

// Refs
const sidebarRef = ref<InstanceType<typeof Sidebar>>()

// 状态
const activeName = ref('icon')
const nodeIconListData = ref(mergerIconList([...icon]))
const nodeImageList = ref([...stickerList]) // 使用贴图列表
const iconList = ref<string[]>([])
const nodeImage = ref('')
const activeNodes = ref<any[]>([])

// 监听器
watch(
  () => props.activeSidebar,
  (val) => {
    if (val === 'nodeIconSidebar') {
      if (sidebarRef.value)
        sidebarRef.value.show = true
    }
    else {
      if (sidebarRef.value)
        sidebarRef.value.show = false
    }
  },
)

// 方法
function handleNodeActive(_node: any, nodes: any[]) {
  activeNodes.value = nodes ? [...nodes] : []
  if (activeNodes.value.length > 0) {
    if (activeNodes.value.length === 1) {
      const firstNode = activeNodes.value[0]
      nodeImage.value = firstNode.getData('image') || ''
      iconList.value = firstNode.getData('icon') || [] // 回显图标
    }
    else {
      nodeImage.value = ''
      iconList.value = []
    }
  }
  else {
    iconList.value = []
    nodeImage.value = ''
  }
}

function handleShowNodeIcon() {
  // dialogVisible.value = true
}

function getHtml(iconStr: string) {
  return iconStr.startsWith('<svg') ? iconStr : `<img src="${iconStr}" />`
}

function setIcon(type: string, name: string) {
  activeNodes.value.forEach((node) => {
    const nodeIconList = [...(node.getData('icon') || [])]
    const key = `${type}_${name}`
    const index = nodeIconList.findIndex(item => item === key)
    // 删除icon
    if (index !== -1) {
      nodeIconList.splice(index, 1)
    }
    else {
      const typeIndex = nodeIconList.findIndex((item) => {
        return item.split('_')[0] === type
      })
      // 替换icon
      if (typeIndex !== -1) {
        nodeIconList.splice(typeIndex, 1, key)
      }
      else {
        // 增加icon
        nodeIconList.push(key)
      }
    }
    node.setIcon(nodeIconList)
    if (activeNodes.value.length === 1) {
      iconList.value = nodeIconList
    }
  })
}

// URL 规范化函数：统一转换逻辑，用于设置和比较
function normalizeUrl(url: string) {
  return url.startsWith('http')
    ? url
    : url.replace(import.meta.env.VITE_APP_BASE_URL, '.')
}

function setImage(img: any) {
  // 计算新的 URL，但不修改原对象
  const newUrl = normalizeUrl(img.url)

  activeNodes.value.forEach((node) => {
    nodeImage.value = newUrl
    // 创建新对象，避免修改原数组
    node.setImage({
      ...img,
      url: newUrl,
    })
  })
}

// 处理Sidebar关闭事件
function handleUpdateActiveSidebar(value: string | null) {
  editorStore.setActiveSidebar(value)
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
  <Sidebar
    ref="sidebarRef"
    :title="localeText.nodeIconSidebar?.title || '图标&贴纸'"
    @update:active-sidebar="handleUpdateActiveSidebar"
  >
    <div class="box" :class="{ isDark }">
      <el-tabs v-model="activeName">
        <el-tab-pane
          :label="localeText.nodeIconSidebar?.icon || '图标'"
          name="icon"
        />
        <el-tab-pane
          :label="localeText.nodeIconSidebar?.sticker || '贴纸'"
          name="image"
        />
      </el-tabs>
      <div class="boxContent">
        <!-- 图标 -->
        <div v-if="activeName === 'icon'" class="iconBox">
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
        </div>
        <!-- 贴纸 -->
        <div v-if="activeName === 'image'" class="imageBox">
          <div v-for="item in nodeImageList" :key="item.name" class="item">
            <div class="title">
              {{ item.name }}
            </div>
            <div class="list">
              <div
                v-for="imgItem in item.list"
                :key="imgItem.url"
                class="icon"
                :class="{
                  selected: nodeImage === normalizeUrl(imgItem.url),
                }"
                @click="setImage(imgItem)"
              >
                <img :src="imgItem.url" alt="">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Sidebar>
</template>

<style lang="scss" scoped>
.box {
  padding: 0 20px;

  &.isDark {
    .title {
      color: #fff;
    }
  }

  .title {
    font-size: 16px;
    font-weight: 500;
    color: #333;
  }

  .boxContent {
    .iconBox {
      .item {
        margin-bottom: 20px;
        font-weight: bold;

        .title {
          margin-bottom: 10px;
        }

        .list {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;

          .icon {
            width: 100%;
            aspect-ratio: 1;
            cursor: pointer;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
            box-sizing: border-box;
            border: 2px solid transparent;
            border-radius: 5px;
            overflow: hidden;
            transition: all 0.2s;
            box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);

            :deep(img) {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            :deep(svg) {
              width: 100%;
              height: 100%;
            }

            &:hover {
              box-shadow:
                0 1px 2px -2px rgba(0, 0, 0, 0.16),
                0 3px 6px 0 rgba(0, 0, 0, 0.12),
                0 5px 12px 4px rgba(0, 0, 0, 0.09);
            }

            &.selected {
              border: 2px solid var(--el-color-primary);
            }
          }
        }
      }
    }

    .imageBox {
      .item {
        margin-bottom: 20px;
        font-weight: bold;

        .title {
          margin-bottom: 10px;
        }

        .list {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;

          .icon {
            width: 100%;
            aspect-ratio: 1;
            cursor: pointer;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
            box-sizing: border-box;
            border: 2px solid transparent;
            border-radius: 5px;
            overflow: hidden;
            transition: all 0.2s;
            box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);

            :deep(img) {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            &:hover {
              box-shadow:
                0 1px 2px -2px rgba(0, 0, 0, 0.16),
                0 3px 6px 0 rgba(0, 0, 0, 0.12),
                0 5px 12px 4px rgba(0, 0, 0, 0.09);
            }

            &.selected {
              border: 2px solid var(--el-color-primary);
            }
          }
        }
      }
    }
  }
}
</style>
