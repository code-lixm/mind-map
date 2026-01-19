/**
 * 处理剪贴板文本
 * 包含处理粘贴事件和知犀格式数据的功能
 */

import { imgToDataUrl } from 'simple-mind-map/src/utils/index'

/**
 * 处理粘贴事件中的文本
 * @param e 粘贴事件
 * @returns 清理后的纯文本
 */
function handleClipboardTextFromEvent(e: ClipboardEvent): string {
  const clipboardData = e.clipboardData
  if (!clipboardData) {
    return ''
  }

  // 优先获取纯文本
  const text = clipboardData.getData('text/plain')
  if (text) {
    return text
  }

  // 如果没有纯文本，尝试从 HTML 中提取
  const html = clipboardData.getData('text/html')
  if (html) {
    // 创建临时元素来解析 HTML
    const div = document.createElement('div')
    div.innerHTML = html
    // eslint-disable-next-line unicorn/prefer-dom-node-text-content
    return div.textContent || div.innerText || ''
  }

  return ''
}

/**
 * 处理输入框粘贴事件
 * 阻止默认行为，插入纯文本
 */
export function handleInputPasteText(e: ClipboardEvent) {
  e.preventDefault()
  const text = handleClipboardTextFromEvent(e)

  // 插入文本到当前光标位置
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    range.deleteContents()
    const textNode = document.createTextNode(text)
    range.insertNode(textNode)

    // 将光标移到插入文本的末尾
    range.setStartAfter(textNode)
    range.setEndAfter(textNode)
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

// ============== 知犀格式处理函数（从 handleClipboardText.js 迁移） ==============

/**
 * 处理知犀数据格式
 */
async function handleZHIXI(data: any) {
  try {
    try {
      if (!Array.isArray(data)) {
        data = String(data).replace('￿﻿', '')
        data = JSON.parse(data)
      }
    }
    catch (error) {
      console.log(error)
    }
    if (!Array.isArray(data)) {
      data = []
    }
    const newNodeList: any[] = []
    const waitLoadImageList: Promise<void>[] = []
    const walk = (list: any[], newList: any[]) => {
      list.forEach(async (item) => {
        const newRoot: any = {}
        newList.push(newRoot)
        newRoot.data = {
          text: item.data.text,
          hyperlink: item.data.hyperlink,
          hyperlinkTitle: item.data.hyperlinkTitle,
          note: item.data.note,
        }
        // 图片
        if (item.data.image) {
          let resolve: (() => void) | null = null
          const promise = new Promise<void>((_resolve) => {
            resolve = _resolve
          })
          waitLoadImageList.push(promise)
          try {
            newRoot.data.image = await imgToDataUrl(item.data.image)
            newRoot.data.imageSize = item.data.imageSize
            resolve?.()
          }
          catch {
            resolve?.()
          }
        }
        // 子节点
        newRoot.children = []
        if (item.children && item.children.length > 0) {
          const children: any[] = []
          item.children.forEach((item2: any) => {
            // 概要
            if (item2.data.type === 'generalize') {
              newRoot.data.generalization = [
                {
                  text: item2.data.text,
                },
              ]
            }
            else {
              children.push(item2)
            }
          })
          walk(children, newRoot.children)
        }
      })
    }
    walk(data, newNodeList)
    await Promise.all(waitLoadImageList)
    return {
      simpleMindMap: true,
      data: newNodeList,
    }
  }
  catch {
    return ''
  }
}

/**
 * 处理知犀格式的剪贴板文本
 * @param text 剪贴板文本
 * @returns 处理后的数据或空字符串
 */
export async function handleZHIXIClipboardText(text: string): Promise<any> {
  // 知犀数据格式1
  try {
    const parsedData = JSON.parse(text)
    if (parsedData.__c_zx_v !== undefined) {
      const res = await handleZHIXI(parsedData.children)
      return res
    }
  }
  catch {
    // 解析失败，继续尝试其他格式
  }
  // 知犀数据格式2
  if (text.includes('￿﻿')) {
    const res = await handleZHIXI(text)
    return res
  }
  return ''
}

/**
 * 默认导出：处理粘贴事件中的文本（用于 simple-mind-map 的 customHandleClipboardText）
 */
export default function handleClipboardText(e: ClipboardEvent): string {
  return handleClipboardTextFromEvent(e)
}
