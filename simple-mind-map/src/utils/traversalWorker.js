// traversalWorker.js
// Web Worker 脚本，处理纯数据逻辑

// 简单的 HTML 标签去除 (Worker 中无法使用 DOM API)
const stripHtml = (html) => {
  if (!html) return ''
  // 简单处理：将 <br> 替换为换行符
  let res = String(html).replace(/<br>/gim, '\n')
  // 去除其他标签
  res = res.replace(/<[^>]*>?/gm, '')
  return res
}

// 获取节点文本 (Worker 版)
const getNodeText = (data) => {
  // 如果是富文本，尝试去除 HTML 标签
  if (data.richText) {
    return stripHtml(data.text) || ''
  }
  return data.text || ''
}

// Markdown 相关辅助函数
const getTitleMark = level => {
  return new Array(level).fill('#').join('')
}

const getMarkdownIndentMark = level => {
  return new Array(level - 6).fill('   ').join('') + '*'
}

// Txt 相关辅助函数
const getTxtIndent = level => {
  return new Array(level).fill('   ').join('')
}

// 格式化概要数据
const formatGetNodeGeneralization = (data) => {
  const generalization = data.generalization
  if (generalization) {
    return Array.isArray(generalization) ? generalization : [generalization]
  } else {
    return []
  }
}

// 广度优先遍历（纯数据版，与主线程 bfsWalk 保持一致）
// 支持 layerIndex (层级)，用于搜索功能
const walkData = (root, callback) => {
  if (!root) return
  // stack item: { node, layerIndex }
  const stack = [{ node: root, layerIndex: 0 }]
  let isStop = false

  // 先处理根节点（与 bfsWalk 的行为一致）
  // 注意：根节点在这里处理一次，后续 shift() 会取出根节点但只处理其子节点，不会重复调用 callback
  if (callback(root, 0) === 'stop') {
    isStop = true
  }

  while (stack.length > 0) {
    if (isStop) {
      break
    }
    const { node, layerIndex } = stack.shift() // 使用 shift() 实现广度优先，与 bfsWalk 一致
    // 注意：这里 shift() 会取出根节点，但只遍历其子节点，不再对根节点本身调用 callback

    // 遍历子节点（防御性检查：确保 node 和 children 存在）
    if (node && node.children && Array.isArray(node.children) && node.children.length > 0) {
      node.children.forEach(child => {
        if (isStop) return
        const nextLayerIndex = layerIndex + 1
        stack.push({
          node: child,
          layerIndex: nextLayerIndex
        })
        if (callback(child, nextLayerIndex) === 'stop') {
          isStop = true
        }
      })
    }
  }
}

// 深度优先遍历（纯数据版，与主线程 walk 保持一致）
// 支持 layerIndex (层级)，用于导出功能以保持层级结构
const walkDataDFS = (root, callback) => {
  if (!root) return
  // stack item: { node, layerIndex }
  const stack = [{ node: root, layerIndex: 0 }]
  let isStop = false

  while (stack.length > 0) {
    if (isStop) {
      break
    }
    const { node, layerIndex } = stack.pop() // 使用 pop() 实现深度优先，与 walk 一致

    // 先处理当前节点
    if (callback(node, layerIndex) === 'stop') {
      isStop = true
      break
    }

    // 将子节点压入栈中（倒序压栈以保证从左到右遍历）
    // 防御性检查：确保 node 和 children 存在
    if (node && node.children && Array.isArray(node.children) && node.children.length > 0) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push({
          node: node.children[i],
          layerIndex: layerIndex + 1
        })
      }
    }
  }
}

self.onmessage = (e) => {
  const { id, type, data, param } = e.data
  let result = null
  let error = null

  try {
    if (type === 'COUNT_NODES') {
      let count = 0
      walkData(data, () => {
        count++
      })
      result = count
    } else if (type === 'FILTER_NODES') {
      // ... existing FILTER_NODES logic ...
      const { searchText, searchType } = param || {}
      const lowerSearchText = searchText ? String(searchText).toLowerCase() : ''
      const list = []

      walkData(data, (node) => {
        // 1. 检查节点本身
        const nodeData = node.data || {}
        let isMatch = false

        if (searchType === 'tag') {
          const tag = nodeData.tag
          if (tag && Array.isArray(tag)) {
            isMatch = tag.some(t => {
              if (typeof t === 'string') {
                return t.toLowerCase().includes(lowerSearchText)
              } else if (t && t.text) {
                return String(t.text).toLowerCase().includes(lowerSearchText)
              }
              return false
            })
          }
        } else {
          // 默认为 text 搜索
          let text = nodeData.text || ''
          if (nodeData.richText) {
            text = stripHtml(text)
          }
          if (String(text).toLowerCase().includes(lowerSearchText)) {
            isMatch = true
          }
        }

        if (isMatch) {
          list.push({ uid: nodeData.uid, isGeneralization: false })
        }

        // 2. 检查概要节点
        const generalizationList = formatGetNodeGeneralization(nodeData)
        generalizationList.forEach(gNode => {
          let gMatch = false
          if (searchType === 'tag') {
            const tag = gNode.tag
            if (tag && Array.isArray(tag)) {
              gMatch = tag.some(t => {
                if (typeof t === 'string') {
                  return t.toLowerCase().includes(lowerSearchText)
                } else if (t && t.text) {
                  return String(t.text).toLowerCase().includes(lowerSearchText)
                }
                return false
              })
            }
          } else {
            let text = gNode.text || ''
            if (gNode.richText) {
              text = stripHtml(text)
            }
            if (String(text).toLowerCase().includes(lowerSearchText)) {
              gMatch = true
            }
          }

          if (gMatch) {
            list.push({ uid: gNode.uid, isGeneralization: true })
          }
        })
      })
      result = list
    } else if (type === 'TRANSFORM_TO_MARKDOWN') {
      let content = ''
      // 使用深度优先遍历，与主线程 walk 保持一致，确保层级结构正确
      walkDataDFS(data, (node, layerIndex) => {
        const level = layerIndex + 1
        if (level <= 6) {
          content += getTitleMark(level)
        } else {
          content += getMarkdownIndentMark(level)
        }
        content += ' ' + getNodeText(node.data)

        // 概要
        const generalization = node.data.generalization
        if (Array.isArray(generalization)) {
          content += generalization.map(item => {
            return ` [${getNodeText(item)}]`
          }).join('')
        } else if (generalization && generalization.text) {
          const generalizationText = getNodeText(generalization)
          content += ` [${generalizationText}]`
        }
        content += '\n\n'

        // 备注
        if (node.data.note) {
          content += node.data.note + '\n\n'
        }
      })
      result = content
    } else if (type === 'TRANSFORM_TO_TXT') {
      let content = ''
      // 使用深度优先遍历，与主线程 walk 保持一致，确保层级结构正确
      walkDataDFS(data, (node, layerIndex) => {
        content += getTxtIndent(layerIndex)
        content += ' ' + getNodeText(node.data)

        // 概要
        const generalization = node.data.generalization
        if (Array.isArray(generalization)) {
          content += generalization.map(item => {
            return ` [${getNodeText(item)}]`
          }).join('')
        } else if (generalization && generalization.text) {
          content += ` [${getNodeText(generalization)}]`
        }
        content += '\n\n'
      })
      result = content
    } else {
      error = `Unknown task type: ${type}`
    }
  } catch (err) {
    error = err.message
  }

  self.postMessage({
    id,
    type,
    result,
    error
  })
}
