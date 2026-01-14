<script setup lang="ts">
import type { MindMapInstance } from '../types'
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'

// Props
interface Props {
  mindMap?: MindMapInstance
  isDark?: boolean
  isReadonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mindMap: undefined,
  isDark: false,
  isReadonly: false,
})

// 定义文案类型
interface SearchLocaleText {
  search: {
    searchPlaceholder: string
    replacePlaceholder: string
    replace: string
    replaceAll: string
    cancel: string
    noResult: string
    [key: string]: string
  }
  [key: string]: any
}

// 注入文案
const localeText = inject<SearchLocaleText>('localeText', {
  search: {
    searchPlaceholder: '搜索',
    replacePlaceholder: '替换',
    replace: '替换',
    replaceAll: '全部替换',
    cancel: '取消',
    noResult: '无结果',
  },
})

// 定义事件总线类型
interface EventBus {
  on: (event: string, handler: (...args: any[]) => void) => void
  off: (event: string, handler: (...args: any[]) => void) => void
  emit: (event: string, ...args: any[]) => void
}

// 注入事件总线
const eventBus = inject<EventBus>('eventBus')

// 状态
const show = ref(false)
const searchText = ref('')
const replaceText = ref('')
const showReplaceInput = ref(false)
const currentIndex = ref(0)
const total = ref(0)
const showSearchInfo = ref(false)
const searchResultListHeight = ref(0)
const searchResultList = ref<any[]>([])
const showSearchResultList = ref(false)

// Refs
const searchInputRef = ref<any>()
const replaceInputRef = ref<any>()

// 工具函数
function isUndef(val: any): boolean {
  return val === undefined || val === null || val === ''
}

function getTextFromHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  // eslint-disable-next-line unicorn/prefer-dom-node-text-content
  return div.textContent || div.innerText || ''
}

// 监听搜索文本变化
watch(searchText, (val) => {
  if (isUndef(val)) {
    currentIndex.value = 0
    total.value = 0
    showSearchInfo.value = false
  }
})

// 处理搜索信息变化
interface SearchInfoData {
  currentIndex: number
  total: number
}

function handleSearchInfoChange(data: SearchInfoData) {
  currentIndex.value = data.currentIndex + 1
  total.value = data.total
  showSearchInfo.value = true
}

// 显示搜索
function showSearch() {
  if (eventBus) {
    eventBus.emit('closeSideBar')
  }
  show.value = true
  setTimeout(() => {
    searchInputRef.value?.focus()
  }, 100)
}

// 隐藏替换输入框
function hideReplaceInput() {
  showReplaceInput.value = false
  replaceText.value = ''
}

// 输入框聚焦时，禁止思维导图节点响应按键事件自动进入文本编辑
function onFocus() {
  props.mindMap?.updateConfig({
    enableAutoEnterTextEditWhenKeydown: false,
  })
}

// 输入框失焦时恢复
function onBlur() {
  props.mindMap?.updateConfig({
    enableAutoEnterTextEditWhenKeydown: true,
  })
}

// 画布，节点点击时让输入框失焦
function blur() {
  searchInputRef.value?.blur()
  replaceInputRef.value?.blur()
}

// 搜索下一个
function onSearchNext() {
  showSearchResultList.value = true
  props.mindMap?.search.search(searchText.value)
}

// 替换当前
function replace() {
  props.mindMap?.search.replace(replaceText.value, true)
}

// 全部替换
function replaceAll() {
  props.mindMap?.search.replaceAll(replaceText.value)
}

// 关闭搜索
function close() {
  show.value = false
  showSearchResultList.value = false
  showSearchInfo.value = false
  total.value = 0
  currentIndex.value = 0
  searchText.value = ''
  hideReplaceInput()
  props.mindMap?.search.endSearch()
}

// 处理搜索匹配节点列表变化
function onSearchMatchNodeListChange(list: any[]) {
  searchResultList.value = list.map((item) => {
    const data = item.data || item.nodeData.data
    let name = data.text
    const id = data.uid
    if (data.richText) {
      name = getTextFromHtml(name)
    }
    const reg = new RegExp(`${searchText.value.trim()}`, 'g')
    const text = name.replace(reg, (a: string) => {
      return `<span class="match">${a}</span>`
    })
    return {
      data: item,
      id,
      text,
      name,
    }
  })
}

// 设置搜索任务结果高度
function setSearchResultListHeight() {
  searchResultListHeight.value = window.innerHeight - 267 - 24
}

// 点击搜索结果项
function onSearchResultItemClick(index: number) {
  props.mindMap?.search.jump(index)
}

// 生命周期
onMounted(() => {
  setSearchResultListHeight()

  if (eventBus) {
    eventBus.on('show_search', showSearch)
    eventBus.on('setData', close)
  }

  if (props.mindMap) {
    props.mindMap.on('search_info_change', handleSearchInfoChange)
    props.mindMap.on('node_click', blur)
    props.mindMap.on('draw_click', blur)
    props.mindMap.on('expand_btn_click', blur)
    props.mindMap.on('search_match_node_list_change', onSearchMatchNodeListChange)
    props.mindMap.keyCommand.addShortcut('Control+f', showSearch)
  }

  window.addEventListener('resize', setSearchResultListHeight)
})

onBeforeUnmount(() => {
  if (eventBus) {
    eventBus.off('show_search', showSearch)
    eventBus.off('setData', close)
  }

  if (props.mindMap) {
    props.mindMap.off('search_info_change', handleSearchInfoChange)
    props.mindMap.off('node_click', blur)
    props.mindMap.off('draw_click', blur)
    props.mindMap.off('expand_btn_click', blur)
    props.mindMap.off('search_match_node_list_change', onSearchMatchNodeListChange)
    props.mindMap.keyCommand.removeShortcut('Control+f', showSearch)
  }

  window.removeEventListener('resize', setSearchResultListHeight)
})
</script>

<template>
  <div v-if="show" class="searchContainer" :class="{ isDark, show }">
    <div class="closeBtnBox">
      <span class="closeBtn i-ep:close" @click="close" />
    </div>
    <div class="searchInputBox">
      <el-input
        ref="searchInputRef"
        v-model="searchText"
        :placeholder="localeText.search.searchPlaceholder"
        size="small"
        :prefix-icon="Search"
        @keyup.enter.stop="onSearchNext"
        @keydown.stop
        @focus="onFocus"
        @blur="onBlur"
      >
        <template v-if="!isUndef(searchText)" #append>
          <el-button size="small" @click="showReplaceInput = true">
            {{ localeText.search.replace }}
          </el-button>
        </template>
      </el-input>
      <div v-if="showSearchInfo && !isUndef(searchText)" class="searchInfo">
        {{ currentIndex }} / {{ total }}
      </div>
    </div>
    <el-input
      v-if="showReplaceInput"
      ref="replaceInputRef"
      v-model="replaceText"
      :placeholder="localeText.search.replacePlaceholder"
      size="small"
      style="margin: 12px 0"
      @keydown.stop
      @focus="onFocus"
      @blur="onBlur"
    >
      <template #prefix>
        <i class="el-input__icon i-ep:edit" />
      </template>
      <template #append>
        <el-button size="small" @click="hideReplaceInput">
          {{ localeText.search.cancel }}
        </el-button>
      </template>
    </el-input>
    <div v-if="showReplaceInput" class="btnList">
      <el-button size="small" :disabled="isReadonly" @click="replace">
        {{ localeText.search.replace }}
      </el-button>
      <el-button size="small" :disabled="isReadonly" @click="replaceAll">
        {{ localeText.search.replaceAll }}
      </el-button>
    </div>
    <div
      v-if="showSearchResultList"
      class="searchResultList"
      :style="{ height: `${searchResultListHeight}px` }"
    >
      <div
        v-for="(item, index) in searchResultList"
        :key="item.id"
        class="searchResultItem"
        :title="item.name"
        @click.stop="onSearchResultItemClick(index)"
        v-html="item.text"
      />
      <div v-if="searchResultList.length <= 0" class="empty">
        <span class="iconfont iconwushuju" />
        <span class="text">{{ localeText.search.noResult }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.searchContainer {
  position: relative;
  background-color: #fff;
  padding: 16px;
  width: 296px;
  border-radius: 12px;
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 110px;
  right: -296px;
  transition: all 0.3s;

  &.isDark {
    background-color: #363b3f;

    .closeBtnBox {
      color: #fff;
      background-color: #363b3f;
    }
  }

  &.show {
    right: 20px;
  }

  .btnList {
    display: flex;
    justify-content: flex-end;
  }

  .closeBtnBox {
    position: absolute;
    right: -5px;
    top: -5px;
    width: 20px;
    height: 20px;
    background-color: #fff;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1);

    .closeBtn {
      font-size: 16px;
    }
  }

  .searchInputBox {
    position: relative;

    .searchInfo {
      position: absolute;
      right: 70px;
      top: 50%;
      transform: translateY(-50%);
      color: #909090;
      font-size: 14px;
    }
  }

  .searchResultList {
    position: absolute;
    left: 0;
    top: 100%;
    width: 100%;
    background-color: #fff;
    box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    margin-top: 5px;
    overflow-y: auto;
    padding: 12px 0;

    .searchResultItem {
      height: 30px;
      line-height: 30px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 12px;
      font-size: 14px;
      cursor: pointer;
      position: relative;
      padding-left: 22px;

      &::before {
        content: '';
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 5px;
        height: 5px;
        background-color: #606266;
        border-radius: 50%;
      }

      &:hover {
        background-color: #f2f4f7;
      }

      :deep(.match) {
        color: var(--el-color-primary);
        font-weight: bold;
      }
    }

    .empty {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      .iconfont {
        font-size: 50px;
        margin-bottom: 20px;
      }

      .text {
        font-size: 14px;
        color: rgba(26, 26, 26, 0.8);
      }
    }
  }
}
</style>
