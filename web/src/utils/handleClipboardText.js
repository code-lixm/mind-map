import { imgToDataUrl } from 'simple-mind-map/src/utils/index'

// 处理知犀
const handleZHIXI = async data => {
  try {
    try {
      if (!Array.isArray(data)) {
        data = String(data).replace('￿﻿', '')
        data = JSON.parse(data)
      }
    } catch (error) {
      console.log(error)
    }
    if (!Array.isArray(data)) {
      data = []
    }
    const newNodeList = []
    const waitLoadImageList = []
    const walk = (list, newList) => {
      list.forEach(async item => {
        let newRoot = {}
        newList.push(newRoot)
        newRoot.data = {
          text: item.data.text,
          hyperlink: item.data.hyperlink,
          hyperlinkTitle: item.data.hyperlinkTitle,
          note: item.data.note
        }
        // 图片
        if (item.data.image) {
          let resolve = null
          let promise = new Promise(_resolve => {
            resolve = _resolve
          })
          waitLoadImageList.push(promise)
          try {
            newRoot.data.image = await imgToDataUrl(item.data.image)
            newRoot.data.imageSize = item.data.imageSize
            resolve()
          } catch (error) {
            resolve()
          }
        }
        // 子节点
        newRoot.children = []
        if (item.children && item.children.length > 0) {
          const children = []
          item.children.forEach(item2 => {
            // 概要
            if (item2.data.type === 'generalize') {
              newRoot.data.generalization = [
                {
                  text: item2.data.text
                }
              ]
            } else {
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
      data: newNodeList
    }
  } catch (error) {
    return ''
  }
}

// 处理 xmind 格式（使用制表符或空格表示层级）
const handleXMind = async text => {
  try {
    // 按行分割
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (lines.length === 0) return ''

    // 检查是否包含制表符或连续空格缩进，如果有则可能是 xmind 格式
    const hasTab = lines.some(line => line.startsWith('\t'))
    const hasIndent = lines.some(line => /^ {2,}/.test(line))
    if (!hasTab && !hasIndent) return ''

    // 检测缩进方式：优先使用制表符，如果没有则使用空格
    const useTab = hasTab
    // 如果使用空格，检测缩进单位（通常是 2 或 4 个空格）
    let indentUnit = 2
    if (!useTab) {
      const indentMatch = lines.find(line => /^ +/.test(line))
      if (indentMatch) {
        const indentLength = indentMatch.match(/^( +)/)[1].length
        // 尝试找到最小的缩进单位
        lines.forEach(line => {
          const match = line.match(/^( +)/)
          if (match) {
            const len = match[1].length
            if (len > 0 && len < indentLength) {
              indentUnit = len
            }
          }
        })
      }
    }

    const newNodeList = []
    const childrenQueue = [newNodeList] // 用于维护当前层级的子节点列表
    const depthQueue = [-1] // 用于维护当前层级深度
    let currentChildren = newNodeList
    let currentDepth = -1

    lines.forEach(line => {
      let depth = 0
      let nodeText = ''

      if (useTab) {
        // 使用制表符
        const match = line.match(/^(\t*)/)
        depth = match ? match[1].length : 0
        nodeText = line.replace(/^\t+/, '').trim()
      } else {
        // 使用空格
        const match = line.match(/^( +)/)
        const indentLength = match ? match[1].length : 0
        depth = Math.floor(indentLength / indentUnit)
        nodeText = line.replace(/^ +/, '').trim()
      }

      if (!nodeText) return // 跳过空行

      // 创建新节点
      const node = {
        data: {
          text: nodeText
        },
        children: []
      }

      // 根据层级深度调整节点位置
      if (depth > currentDepth) {
        // 当前层级更深，是上一个节点的子节点
        currentChildren.push(node)
        childrenQueue.push(node.children)
        currentChildren = node.children
        depthQueue.push(depth)
        currentDepth = depth
      } else if (depth === currentDepth) {
        // 当前层级相同，是同级节点
        currentChildren.push(node)
        // 更新当前子节点列表
        childrenQueue[childrenQueue.length - 1] = node.children
        currentChildren = node.children
      } else {
        // 当前层级更浅，需要向上回溯
        while (depthQueue.length > 0) {
          childrenQueue.pop()
          depthQueue.pop()
          currentDepth = depthQueue[depthQueue.length - 1] || -1
          if (currentDepth < depth) {
            currentChildren = childrenQueue[childrenQueue.length - 1] || newNodeList
            currentChildren.push(node)
            childrenQueue.push(node.children)
            currentChildren = node.children
            depthQueue.push(depth)
            currentDepth = depth
            break
          }
          currentChildren = childrenQueue[childrenQueue.length - 1] || newNodeList
        }
      }
    })

    if (newNodeList.length > 0) {
      return {
        simpleMindMap: true,
        data: newNodeList
      }
    }
  } catch (error) {
    console.error('处理 xmind 格式失败:', error)
  }
  return ''
}

const handleClipboardText = async text => {
  // 知犀数据格式1
  try {
    let parsedData = JSON.parse(text)
    if (parsedData.__c_zx_v !== undefined) {
      const res = await handleZHIXI(parsedData.children)
      return res
    }
  } catch (error) { }
  // 知犀数据格式2
  if (text.includes('￿﻿')) {
    const res = await handleZHIXI(text)
    return res
  }
  // xmind 格式（使用制表符表示层级）
  const xmindRes = await handleXMind(text)
  if (xmindRes) {
    return xmindRes
  }
  return ''
}

export default handleClipboardText
