/**
 * 工具函数集合
 * 合并了原 index.js 和新增的 TypeScript 工具函数
 */

// ============== 原有工具函数（从 index.js 迁移） ==============
/**
 * 全屏事件检测
 */
function getOnfullscreEvent() {
  if ((document.documentElement as any).requestFullScreen) {
    return 'onfullscreenchange'
  }
  else if ((document.documentElement as any).webkitRequestFullScreen) {
    return 'onwebkitfullscreenchange'
  }
  else if ((document.documentElement as any).mozRequestFullScreen) {
    return 'onmozfullscreenchange'
  }
  else if ((document.documentElement as any).msRequestFullscreen) {
    return 'onmsfullscreenchange'
  }
  return ''
}

export const fullscrrenEvent = getOnfullscreEvent()

/**
 * 全屏显示元素
 */
export function fullScreen(element: any) {
  if (element.requestFullScreen) {
    element.requestFullScreen()
  }
  else if (element.webkitRequestFullScreen) {
    element.webkitRequestFullScreen()
  }
  else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen()
  }
  else if (element.msRequestFullscreen) {
    element.msRequestFullscreen()
  }
}

/**
 * 文件转 buffer
 */
export function fileToBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer)
    }
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 复制文本到剪贴板（使用 textarea）
 */
export function copy(text: string) {
  const input = document.createElement('textarea')
  input.innerHTML = text
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
}

/**
 * 复制文本到剪贴板（使用 Clipboard API）
 */
export function setDataToClipboard(data: string) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(data)
  }
}

/**
 * 复制图片到剪贴板
 */
export function setImgToClipboard(img: Blob) {
  if (navigator.clipboard && navigator.clipboard.write) {
    const data = [new ClipboardItem({ 'image/png': img })]
    navigator.clipboard.write(data)
  }
}

/**
 * 打印大纲
 */
export function printOutline(el: HTMLElement) {
  const printContent = el.outerHTML
  const iframe = document.createElement('iframe')
  iframe.setAttribute('style', 'position: absolute; width: 0; height: 0;')
  document.body.appendChild(iframe)
  const iframeDoc = iframe.contentWindow!.document

  // 将当前页面的所有样式添加到iframe中
  const styleList = document.querySelectorAll('style')
  Array.from(styleList).forEach((el) => {
    iframeDoc.write(el.outerHTML)
  })

  // 设置打印展示方式 - 纵向展示
  iframeDoc.write('<style media="print">@page {size: portrait;}</style>')

  // 写入内容
  iframeDoc.write(`<div>${printContent}</div>`)

  setTimeout(() => {
    iframe.contentWindow?.print()
    document.body.removeChild(iframe)
  }, 500)
}

/**
 * 获取包含指定 class 的父元素
 */
export function getParentWithClass(
  el: HTMLElement | null,
  className: string,
): HTMLElement | null {
  if (!el)
    return null

  if (el.classList.contains(className)) {
    return el
  }

  if (el.parentNode && el.parentNode !== document.body) {
    return getParentWithClass(el.parentNode as HTMLElement, className)
  }

  return null
}

// ============== 新增工具函数 ==============

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 * @param func 要节流的函数
 * @param delay 间隔时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let lastTime = 0

  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now()

    if (now - lastTime >= delay) {
      lastTime = now
      func.apply(this, args)
    }
  }
}

/**
 * 深拷贝
 * @param obj 要拷贝的对象
 * @returns 拷贝后的新对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T
  }

  if (obj instanceof Object) {
    const clonedObj = {} as T
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }

  return obj
}

/**
 * 下载文件
 * @param url 文件 URL（可以是 blob URL）
 * @param filename 文件名
 */
export function downloadFile(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // 如果是 blob URL，释放它
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

/**
 * 创建 Blob URL
 * @param data 数据
 * @param type MIME 类型
 * @returns Blob URL
 */
export function createBlobURL(data: BlobPart, type: string): string {
  const blob = new Blob([data], { type })
  return URL.createObjectURL(blob)
}

// ============== 创建 EventBus ==============
export { createEventBus } from './eventBus'
