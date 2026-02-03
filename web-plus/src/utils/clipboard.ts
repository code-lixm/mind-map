/**
 * 剪贴板工具：区分 HTTP/HTTPS 安全上下文，防御性使用 Clipboard API
 * - 仅在安全上下文（HTTPS 或 localhost）下 Clipboard API 可用
 * - 非安全上下文或 API 不可用时自动降级为 execCommand，并支持菜单项自动隐藏
 */

/** 是否处于安全上下文（HTTPS 或 localhost），Clipboard API 仅在此环境下可用 */
export function isClipboardSecureContext(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.isSecureContext)
}

/** 是否可用 Clipboard API 写入文本（安全上下文 + writeText） */
export function isClipboardWriteTextAvailable(): boolean {
  if (!isClipboardSecureContext()) return false
  try {
    return Boolean(
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function',
    )
  } catch {
    return false
  }
}

/** 是否可用 Clipboard API 写入任意内容（如图片，用于「复制为 PNG」等） */
export function isClipboardWriteAvailable(): boolean {
  if (!isClipboardSecureContext()) return false
  try {
    return Boolean(
      navigator.clipboard &&
      typeof navigator.clipboard.write === 'function',
    )
  } catch {
    return false
  }
}

/** 是否可用 Clipboard API 读取（粘贴时读取剪贴板） */
export function isClipboardReadAvailable(): boolean {
  if (!isClipboardSecureContext()) return false
  try {
    return Boolean(
      navigator.clipboard &&
      typeof navigator.clipboard.read === 'function',
    )
  } catch {
    return false
  }
}

/**
 * 复制文本到剪贴板（防御性：优先 Clipboard API，失败则 execCommand）
 * @returns 是否复制成功
 */
export function copyTextToClipboard(text: string): Promise<boolean> {
  const doExecCommand = (): boolean => {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;'
      textarea.setAttribute('readonly', '')
      document.body.appendChild(textarea)
      if (navigator.userAgent.match(/ipad|iphone/i)) {
        const range = document.createRange()
        range.selectNodeContents(textarea)
        const sel = window.getSelection()
        if (sel) {
          sel.removeAllRanges()
          sel.addRange(range)
        }
        textarea.setSelectionRange(0, text.length)
      } else {
        textarea.select()
      }
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      return ok
    } catch (err) {
      console.warn('clipboard execCommand copy failed:', err)
      return false
    }
  }

  if (isClipboardWriteTextAvailable()) {
    return navigator.clipboard!
      .writeText(text)
      .then(() => true)
      .catch(err => {
        console.warn('Clipboard API writeText failed, fallback to execCommand:', err)
        return doExecCommand()
      })
  }
  return Promise.resolve(doExecCommand())
}

/**
 * 复制图片到剪贴板（仅安全上下文且支持 clipboard.write 时可用）
 * @returns 是否复制成功
 */
export function setImageToClipboard(blob: Blob): Promise<boolean> {
  if (!isClipboardWriteAvailable()) {
    return Promise.resolve(false)
  }
  try {
    const item = new ClipboardItem({ 'image/png': blob })
    return navigator.clipboard!.write([item]).then(() => true).catch(err => {
      console.warn('Clipboard API write image failed:', err)
      return false
    })
  } catch (err) {
    console.warn('setImageToClipboard error:', err)
    return Promise.resolve(false)
  }
}
