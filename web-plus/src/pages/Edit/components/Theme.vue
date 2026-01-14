<script setup lang="ts">
import type { LocaleTextProvider } from '../types'
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessageBox } from 'element-plus'
import themeList from 'simple-mind-map-plugin-themes/themeList'
import themeImgMap from 'simple-mind-map-plugin-themes/themeImgMap'
import Sidebar from './Sidebar.vue'
import { useEditorState } from '../composables/useEditorState'

interface Props {
  mindMap: any
}

const props = defineProps<Props>()

const localeText = inject<LocaleTextProvider>('localeText')!
const eventBus = inject<any>('eventBus')!
const editorStore = useEditorState()
const { isDark, activeSidebar, extendThemeGroupList } = storeToRefs(editorStore)
const { setLocalConfig, setActiveSidebar } = editorStore

const sidebar = ref<InstanceType<typeof Sidebar> | null>(null)
const theme = ref('')
const activeName = ref('')
interface ThemeItem {
  name: string
  value: string
  dark: boolean
  img?: string
}

interface ThemeGroup {
  name: string
  list: ThemeItem[]
}

const defaultGroupList = ref<ThemeGroup[]>([])

const themeListData = [
  {
    name: '默认主题',
    value: 'default',
    dark: false,
  },
  ...themeList,
].reverse()

const groupList = computed(() => {
  return [...defaultGroupList.value, ...extendThemeGroupList.value]
})

const currentList = computed(() => {
  const group = groupList.value.find(item => item.name === activeName.value)
  return group ? group.list : []
})

watch(activeSidebar, (val) => {
  if (val === 'theme') {
    theme.value = props.mindMap.getTheme()
    sidebar.value.show = true
  }
  else {
    sidebar.value.show = false
  }
})

onMounted(() => {
  initGroup()
  theme.value = props.mindMap.getTheme()
  props.mindMap.on('view_theme_change', handleViewThemeChange)
})

onBeforeUnmount(() => {
  props.mindMap.off('view_theme_change', handleViewThemeChange)
})

function handleViewThemeChange() {
  theme.value = props.mindMap.getTheme()
  handleDark()
}

function initGroup() {
  const baiduThemes = [
    'default',
    'skyGreen',
    'classic2',
    'classic3',
    'classicGreen',
    'classicBlue',
    'blueSky',
    'brainImpairedPink',
    'earthYellow',
    'freshGreen',
    'freshRed',
    'romanticPurple',
    'pinkGrape',
    'mint',
  ]
  const baiduList: ThemeItem[] = []
  const classicsList: ThemeItem[] = []
  themeListData.forEach((item) => {
    if (baiduThemes.includes(item.value)) {
      baiduList.push(item)
    }
    else if (!item.dark) {
      classicsList.push(item)
    }
  })
  defaultGroupList.value = [
    {
      name: localeText('theme.classics'),
      list: classicsList,
    },
    {
      name: localeText('theme.dark'),
      list: themeListData.filter(item => item.dark),
    },
    {
      name: localeText('theme.simple'),
      list: baiduList,
    },
  ]
  activeName.value = defaultGroupList.value[0].name
}

function useTheme(themeItem: ThemeItem) {
  if (themeItem.value === theme.value)
    return
  theme.value = themeItem.value
  handleDark()
  const customThemeConfig = props.mindMap.getCustomThemeConfig()
  const hasCustomThemeConfig = Object.keys(customThemeConfig).length > 0
  if (hasCustomThemeConfig) {
    ElMessageBox.confirm(
      localeText('theme.coverTip'),
      localeText('theme.tip'),
      {
        confirmButtonText: localeText('theme.cover'),
        cancelButtonText: localeText('theme.reserve'),
        type: 'warning',
        distinguishCancelAndClose: true,
      },
    )
      .then(() => {
        props.mindMap.setThemeConfig({}, true)
        changeTheme(themeItem, {})
      })
      .catch((action: string) => {
        if (action === 'cancel') {
          changeTheme(themeItem, customThemeConfig)
        }
      })
  }
  else {
    changeTheme(themeItem, customThemeConfig)
  }
}

function changeTheme(themeItem: ThemeItem, _config: Record<string, any>) {
  eventBus.emit('showLoading')
  props.mindMap.setTheme(themeItem.value)
}

function handleDark() {
  const extendThemeList: ThemeItem[] = []
  extendThemeGroupList.value.forEach((group: any) => {
    extendThemeList.push(...group.list)
  })
  const target = [...themeListData, ...extendThemeList].find(
    item => item.value === theme.value,
  )
  if (target) {
    setLocalConfig({ isDark: false })
  }
}
</script>

<template>
  <Sidebar
    ref="sidebar"
    :title="localeText('theme.title')"
    @update:active-sidebar="setActiveSidebar"
  >
    <div class="themeGroupList" :class="{ isDark }">
      <el-tabs v-model="activeName" class="tabBox">
        <el-tab-pane
          v-for="group in groupList"
          :key="group.name"
          :label="group.name"
          :name="group.name"
        />
      </el-tabs>
      <div class="themeListTheme customScrollbar">
        <div
          v-for="item in currentList"
          :key="item.value"
          class="themeItem"
          :class="{ active: item.value === theme }"
          @click="useTheme(item)"
        >
          <div class="imgBox">
            <img :src="item.img || themeImgMap[item.value]" alt="">
          </div>
          <div class="name">
            {{ item.name }}
          </div>
        </div>
      </div>
    </div>
  </Sidebar>
</template>

<style lang="scss" scoped>
.themeGroupList {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;

  &.isDark {
    .name {
      color: #fff;
    }
  }

  .tabBox {
    flex-shrink: 0;

    :deep(.el-tabs__nav-wrap) {
      display: flex;
      justify-content: center;
    }
  }

  .themeListTheme {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 20px;

    .themeItem {
      width: 100%;
      cursor: pointer;
      border-bottom: 1px solid #e9e9e9;
      margin-bottom: 20px;
      padding-bottom: 20px;
      transition: all 0.2s;
      border: 3px solid transparent;
      border-radius: 5px;
      overflow: hidden;
      box-sizing: border-box;
      box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);

      &:last-of-type {
        border: none;
      }

      &:hover {
        box-shadow:
          0 1px 2px -2px rgba(0, 0, 0, 0.16),
          0 3px 6px 0 rgba(0, 0, 0, 0.12),
          0 5px 12px 4px rgba(0, 0, 0, 0.09);
      }

      &.active {
        border: 2px solid var(--el-color-primary);
      }

      .imgBox {
        width: 100%;

        img {
          width: 100%;
        }
      }
      .name {
        text-align: center;
        font-size: 14px;
      }
    }
  }
}
</style>
