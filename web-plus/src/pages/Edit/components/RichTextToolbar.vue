<script setup lang="ts">
import type { MindMapInstance } from '../types'
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
// 从中文配置导入
import {
  alignList as alignListZh,
  fontFamilyList as fontFamilyListZh,
  fontSizeList,
} from '../config/zh'

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

// 定义文案类型
interface RichTextToolbarLocaleText {
  richTextToolbar: {
    bold: string
    italic: string
    underline: string
    strike: string
    fontFamily: string
    fontSize: string
    color: string
    backgroundColor: string
    textAlign: string
    removeFormat: string
    [key: string]: string
  }
  [key: string]: any
}

// 注入文案
const localeText = inject<RichTextToolbarLocaleText>('localeText', {
  richTextToolbar: {
    bold: '加粗',
    italic: '斜体',
    underline: '下划线',
    strike: '删除线',
    fontFamily: '字体',
    fontSize: '字号',
    color: '颜色',
    backgroundColor: '背景颜色',
    textAlign: '对齐方式',
    removeFormat: '清除样式',
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
const showRichTextToolbar = ref(false)
const style = ref({
  left: '0',
  top: '0',
})
const fontColor = ref('')
const fontBackgroundColor = ref('')
const formatInfo = ref<Record<string, any>>({})
const linkDialogVisible = ref(false)
const linkUrl = ref('')
const linkText = ref('')
const hasLink = ref(false)
const savedRange = ref<any>(null)

// Refs
const richTextToolbarRef = ref<HTMLDivElement>()
const linkTextInputRef = ref<any>()
const linkUrlInputRef = ref<any>()

// 使用中文配置
const fontFamilyList = fontFamilyListZh
const alignList = alignListZh

// 富文本选区变化
function onRichTextSelectionChange(
  hasRange: boolean,
  rect: { left: number, top: number, width: number },
  format: Record<string, any>,
) {
  if (hasRange) {
    style.value.left = `${rect.left + rect.width / 2}px`
    style.value.top = `${rect.top - 60}px`
    formatInfo.value = { ...(format || {}) }
    // 检查是否有链接
    hasLink.value = !!format?.link
    if (hasLink.value) {
      linkUrl.value = format.link
    }
  }
  showRichTextToolbar.value = hasRange
}

// 切换加粗
function toggleBold() {
  formatInfo.value.bold = !formatInfo.value.bold
  props.mindMap?.richText.formatText({
    bold: formatInfo.value.bold,
  })
}

// 切换斜体
function toggleItalic() {
  formatInfo.value.italic = !formatInfo.value.italic
  props.mindMap?.richText.formatText({
    italic: formatInfo.value.italic,
  })
}

// 切换下划线
function toggleUnderline() {
  formatInfo.value.underline = !formatInfo.value.underline
  props.mindMap?.richText.formatText({
    underline: formatInfo.value.underline,
  })
}

// 切换删除线
function toggleStrike() {
  formatInfo.value.strike = !formatInfo.value.strike
  props.mindMap?.richText.formatText({
    strike: formatInfo.value.strike,
  })
}

// 修改字体
function changeFontFamily(font: string) {
  formatInfo.value.font = font
  props.mindMap?.richText.formatText({
    font,
  })
}

// 修改字号
function changeFontSize(size: number) {
  formatInfo.value.size = size
  props.mindMap?.richText.formatText({
    size: `${size}px`,
  })
}

// 修改字体颜色
function changeFontColor(color: string) {
  formatInfo.value.color = color
  props.mindMap?.richText.formatText({
    color,
  })
}

// 修改背景颜色
function changeFontBackgroundColor(background: string) {
  formatInfo.value.background = background
  props.mindMap?.richText.formatText({
    background,
  })
}

// 修改对齐方式
function changeTextAlign(align: string) {
  formatInfo.value.align = align
  props.mindMap?.richText.formatText({
    align,
  })
}

// 清除格式
function removeFormat() {
  props.mindMap?.richText.removeFormat()
}

// 打开超链接对话框
function openLinkDialog() {
  if (props.mindMap && props.mindMap.richText) {
    // 保存当前选区
    savedRange.value
      = props.mindMap.richText.range || props.mindMap.richText.lastRange
    if (!savedRange.value) {
      return
    }
    // 获取当前选中文本
    const selectedText = props.mindMap.richText.getSelectionText()
    // 获取当前选中文本的链接
    const currentLink = props.mindMap.richText.getSelectionLink()
    if (currentLink) {
      hasLink.value = true
      linkUrl.value = currentLink
      linkText.value = selectedText || ''
    }
    else {
      hasLink.value = false
      linkUrl.value = ''
      linkText.value = selectedText || ''
    }
  }
  linkDialogVisible.value = true
}

// 对话框打开时聚焦输入框
function onLinkDialogOpen() {
  nextTick(() => {
    if (linkUrlInputRef.value) {
      linkUrlInputRef.value.focus()
    }
  })
}

// 确认链接
function confirmLink() {
  if (props.mindMap && props.mindMap.richText && savedRange.value) {
    const url = linkUrl.value.trim()
    const text = linkText.value.trim()

    // 恢复选区
    props.mindMap.richText.quill.setSelection(
      savedRange.value.index,
      savedRange.value.length,
    )

    if (text && text !== props.mindMap.richText.getSelectionText()) {
      // 如果锚文本改变了，需要先删除原文本再插入新文本
      props.mindMap.richText.quill.deleteText(
        savedRange.value.index,
        savedRange.value.length,
      )
      if (url) {
        props.mindMap.richText.quill.insertText(
          savedRange.value.index,
          text,
          'link',
          url,
        )
      }
      else {
        props.mindMap.richText.quill.insertText(savedRange.value.index, text)
      }
      // 更新选区
      props.mindMap.richText.quill.setSelection(
        savedRange.value.index,
        text.length,
      )
    }
    else {
      // 只更新链接
      props.mindMap.richText.formatLink(url || false)
    }
    hasLink.value = !!url
  }
  linkDialogVisible.value = false
}

// 删除链接
function removeLink() {
  if (props.mindMap && props.mindMap.richText && savedRange.value) {
    // 恢复选区
    props.mindMap.richText.quill.setSelection(
      savedRange.value.index,
      savedRange.value.length,
    )
    props.mindMap.richText.formatLink(false)
    hasLink.value = false
    linkUrl.value = ''
  }
  linkDialogVisible.value = false
}

// 取消链接编辑
function cancelLink() {
  linkDialogVisible.value = false
}

// 生命周期
onMounted(() => {
  // 将工具栏添加到 body
  if (richTextToolbarRef.value) {
    document.body.appendChild(richTextToolbarRef.value)
  }

  if (eventBus) {
    eventBus.on('rich_text_selection_change', onRichTextSelectionChange)
  }
})

onBeforeUnmount(() => {
  // 从 body 移除工具栏
  if (richTextToolbarRef.value && richTextToolbarRef.value.parentNode) {
    richTextToolbarRef.value.parentNode.removeChild(richTextToolbarRef.value)
  }

  if (eventBus) {
    eventBus.off('rich_text_selection_change', onRichTextSelectionChange)
  }
})
</script>

<template>
  <div
    v-show="showRichTextToolbar"
    ref="richTextToolbarRef"
    class="richTextToolbar"
    :class="{ isDark }"
    :style="style"
    @click.stop.passive
  >
    <el-tooltip :content="localeText.richTextToolbar.bold" placement="top">
      <div class="btn" :class="{ active: formatInfo.bold }" @click="toggleBold">
        <span class="icon iconfont iconzitijiacu" />
      </div>
    </el-tooltip>

    <el-tooltip :content="localeText.richTextToolbar.italic" placement="top">
      <div
        class="btn"
        :class="{ active: formatInfo.italic }"
        @click="toggleItalic"
      >
        <span class="icon iconfont iconzitixieti" />
      </div>
    </el-tooltip>

    <el-tooltip :content="localeText.richTextToolbar.underline" placement="top">
      <div
        class="btn"
        :class="{ active: formatInfo.underline }"
        @click="toggleUnderline"
      >
        <span class="icon iconfont iconzitixiahuaxian" />
      </div>
    </el-tooltip>

    <el-tooltip :content="localeText.richTextToolbar.strike" placement="top">
      <div
        class="btn"
        :class="{ active: formatInfo.strike }"
        @click="toggleStrike"
      >
        <span class="icon iconfont iconshanchuxian" />
      </div>
    </el-tooltip>

    <el-tooltip :content="localeText.richTextToolbar.fontFamily" placement="top">
      <el-popover placement="bottom" trigger="hover">
        <template #default>
          <div class="fontOptionsList" :class="{ isDark }">
            <div
              v-for="item in fontFamilyList"
              :key="item.value"
              class="fontOptionItem"
              :style="{ fontFamily: item.value }"
              :class="{ active: formatInfo.font === item.value }"
              @click="changeFontFamily(item.value)"
            >
              {{ item.name }}
            </div>
          </div>
        </template>
        <template #reference>
          <div class="btn">
            <span class="icon iconfont iconxingzhuang-wenzi" />
          </div>
        </template>
      </el-popover>
    </el-tooltip>

    <el-tooltip :content="localeText.richTextToolbar.fontSize" placement="top">
      <el-popover placement="bottom" trigger="hover">
        <template #default>
          <div class="fontOptionsList" :class="{ isDark }">
            <div
              v-for="item in fontSizeList"
              :key="item"
              class="fontOptionItem"
              :style="{
                fontSize: `${item}px`,
                height: `${item < 30 ? 30 : item + 10}px`,
              }"
              :class="{ active: formatInfo.size === `${item}px` }"
              @click="changeFontSize(item)"
            >
              {{ item }}px
            </div>
          </div>
        </template>
        <template #reference>
          <div class="btn">
            <span class="icon iconfont iconcase fontColor" />
          </div>
        </template>
      </el-popover>
    </el-tooltip>

    <el-tooltip :content="localeText.richTextToolbar.color" placement="top">
      <el-popover placement="bottom" trigger="hover" width="260">
        <template #default>
          <Color :color="fontColor" @change="changeFontColor" />
        </template>
        <template #reference>
          <div class="btn" :style="{ color: formatInfo.color }">
            <span class="icon iconfont iconzitiyanse" />
          </div>
        </template>
      </el-popover>
    </el-tooltip>

    <el-tooltip
      :content="localeText.richTextToolbar.backgroundColor"
      placement="top"
    >
      <el-popover placement="bottom" trigger="hover" width="260">
        <template #default>
          <Color
            :color="fontBackgroundColor"
            @change="changeFontBackgroundColor"
          />
        </template>
        <template #reference>
          <div class="btn">
            <span class="icon iconfont iconbeijingyanse" />
          </div>
        </template>
      </el-popover>
    </el-tooltip>
    <!-- 字体族 -->
    <el-tooltip :content="localeText.richTextToolbar.textAlign" placement="top">
      <el-popover placement="bottom" trigger="hover">
        <template #default>
          <div class="fontOptionsList" :class="{ isDark }">
            <div
              v-for="item in alignList"
              :key="item.value"
              class="fontOptionItem"
              :class="{ active: formatInfo.align === item.value }"
              @click="changeTextAlign(item.value)"
            >
              {{ item.name }}
            </div>
          </div>
        </template>
        <template #reference>
          <div class="btn">
            <span class="icon iconfont iconjuzhongduiqi" />
          </div>
        </template>
      </el-popover>
    </el-tooltip>
    <el-tooltip
      :content="hasLink ? linkUrl : (localeText.richTextToolbar.hyperlink || '超链接')"
      placement="top"
    >
      <div class="btn" :class="{ active: hasLink }" @click="openLinkDialog">
        <span class="icon iconfont iconchaolianjie" />
      </div>
    </el-tooltip>

    <el-tooltip :content="localeText.richTextToolbar.removeFormat" placement="top">
      <div class="btn" @click="removeFormat">
        <span class="icon iconfont iconqingchu" />
      </div>
    </el-tooltip>

    <!-- 链接编辑对话框 -->
    <el-dialog
      v-model="linkDialogVisible"
      :title="localeText.richTextToolbar.hyperlink || '超链接'"
      width="400px"
      :append-to-body="true"
      :close-on-click-modal="false"
      @open="onLinkDialogOpen"
    >
      <div class="linkInputBox" :class="{ isDark }">
        <div class="linkInputItem">
          <span class="linkInputLabel">
            {{ localeText.richTextToolbar.linkText || '链接文字' }}
          </span>
          <el-input
            ref="linkTextInputRef"
            v-model="linkText"
            :placeholder="localeText.richTextToolbar.linkTextPlaceholder || '请输入链接文字'"
          />
        </div>
        <div class="linkInputItem">
          <span class="linkInputLabel">
            {{ localeText.richTextToolbar.linkUrl || '链接地址' }}
          </span>
          <el-input
            ref="linkUrlInputRef"
            v-model="linkUrl"
            :placeholder="localeText.richTextToolbar.linkPlaceholder || '请输入链接地址'"
            @keyup.enter="confirmLink"
          />
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button
            v-if="hasLink"
            type="danger"
            @click="removeLink"
          >
            {{ localeText.richTextToolbar.removeLink || '移除链接' }}
          </el-button>
          <el-button @click="cancelLink">
            {{ localeText.dialog?.cancel || '取消' }}
          </el-button>
          <el-button type="primary" @click="confirmLink">
            {{ localeText.dialog?.confirm || '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.richTextToolbar {
  position: fixed;
  z-index: 2000;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  transform: translateX(-50%);

  &.isDark {
    background: #363b3f;

    .btn {
      color: #fff;

      &:hover {
        background: hsla(0, 0%, 100%, 0.05);
      }

      &.active {
        background: hsla(0, 0%, 100%, 0.1);
        color: var(--el-color-primary);
      }
    }
  }

  .btn {
    width: 30px;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      background-color: var(--el-color-primary-light-9);
    }

    &.active {
      background-color: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }

    .icon {
      font-size: 20px;

      &.fontColor {
        font-size: 26px;
      }
    }
  }
}

.fontOptionsList {
  &.isDark {
    .fontOptionItem {
      color: #fff;

      &:hover {
        background-color: hsla(0, 0%, 100%, 0.05);
      }
    }
  }

  .fontOptionItem {
    min-height: 30px;
    width: 100%;
    display: flex;
    align-items: center;
    padding: 4px 12px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:last-child {
      margin-bottom: 0;
    }

    &:hover {
      background-color: var(--el-color-primary-light-9);
    }

    &.active {
      background-color: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }
  }
}

.linkInputBox {
  width: 100%;
  padding: 10px 0;

  &.isDark {
    .linkInputLabel {
      color: #ccc;
    }
  }

  .linkInputItem {
    margin-bottom: 15px;

    &:last-child {
      margin-bottom: 0;
    }

    .linkInputLabel {
      display: block;
      font-size: 13px;
      color: #666;
      margin-bottom: 6px;
      font-weight: 500;
    }
  }
}
</style>
