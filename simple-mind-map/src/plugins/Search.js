import {
  bfsWalk,
  getTextFromHtml,
  isUndef,
  replaceHtmlText,
  formatGetNodeGeneralization
} from '../utils/index'
import MindMapNode from '../core/render/node/MindMapNode'
import { CONSTANTS } from '../constants/constant'
import WorkerManager from '../utils/WorkerManager'

// 搜索插件
class Search {
  //  构造函数
  constructor({ mindMap }) {
    this.mindMap = mindMap
    // 是否正在搜索
    this.isSearching = false
    // 搜索文本
    this.searchText = ''
    // 搜索类型：text 或 tag
    this.searchType = 'text'
    // 匹配的节点列表
    this.matchNodeList = []
    // 当前所在的节点列表索引
    this.currentIndex = -1
    // 不要复位搜索文本
    this.notResetSearchText = false
    // 是否自动跳转下一个匹配节点
    this.isJumpNext = false
    // 是否正在处理数据变化（防止并发执行导致的竞态条件）
    this.isProcessingDataChange = false
    // 是否有新的数据变化等待处理
    this.hasPendingDataChange = false
    // 搜索版本号，用于防止过期的搜索结果覆盖最新的结果
    this.searchVersion = 0

    this.bindEvent()
  }

  bindEvent() {
    this.onDataChange = this.onDataChange.bind(this)
    this.onModeChange = this.onModeChange.bind(this)
    this.mindMap.on('data_change', this.onDataChange)
    this.mindMap.on('mode_change', this.onModeChange)
  }

  unBindEvent() {
    this.mindMap.off('data_change', this.onDataChange)
    this.mindMap.off('mode_change', this.onModeChange)
  }

  // 节点数据改变了，需要重新搜索
  async onDataChange() {
    // 防止并发执行导致的竞态条件
    // 如果正在处理，忽略新的请求（事件发射器不会等待异步回调）
    if (this.isProcessingDataChange) {
      this.hasPendingDataChange = true
      return
    }

    this.isProcessingDataChange = true
    try {
      if (this.isJumpNext) {
        this.isJumpNext = false
        await this.search(this.searchText)
        return
      }
      if (this.notResetSearchText) {
        this.notResetSearchText = false
        return
      }
      this.searchText = ''
    } finally {
      this.isProcessingDataChange = false
      if (this.hasPendingDataChange) {
        this.hasPendingDataChange = false
        this.onDataChange()
      }
    }
  }

  // 监听只读模式切换
  onModeChange(mode) {
    const isReadonly = mode === CONSTANTS.MODE.READONLY
    // 如果是由只读模式切换为非只读模式，需要清除只读模式下的节点高亮
    if (
      !isReadonly &&
      this.isSearching &&
      this.matchNodeList[this.currentIndex]
    ) {
      const currentNode = this.matchNodeList[this.currentIndex]
      // 只有节点实例才有 closeHighlight 方法
      if (this.isNodeInstance(currentNode)) {
        currentNode.closeHighlight()
      }
    }
  }

  // 搜索
  async search(text, options = {}, callback = () => {}) {
    if (isUndef(text)) return this.endSearch()
    text = String(text)
    const newSearchType = options.type || 'text'
    this.isSearching = true

    // 检查搜索文本和类型是否都相同
    const isSameSearch =
      this.searchText === text && this.searchType === newSearchType

    // 更新搜索类型
    this.searchType = newSearchType

    if (isSameSearch) {
      // 和上一次搜索文本和类型都一样，那么搜索下一个
      this.searchNext(callback)
    } else {
      // 只要文本或类型有一个不一样，就重新开始搜索
      // 递增搜索版本号，使之前的搜索请求失效
      this.searchVersion++
      this.searchText = text
      await this.doSearch()
      this.searchNext(callback)
    }
    this.emitEvent()
  }

  // 更新匹配节点列表
  updateMatchNodeList(list) {
    this.matchNodeList = list
    this.mindMap.emit('search_match_node_list_change', list)
  }

  // 结束搜索
  endSearch() {
    if (!this.isSearching) return
    if (this.mindMap.opt.readonly && this.matchNodeList[this.currentIndex]) {
      const currentNode = this.matchNodeList[this.currentIndex]
      // 只有节点实例才有 closeHighlight 方法
      if (this.isNodeInstance(currentNode)) {
        currentNode.closeHighlight()
      }
    }
    this.searchText = ''
    this.updateMatchNodeList([])
    this.currentIndex = -1
    this.notResetSearchText = false
    this.isSearching = false
    this.emitEvent()
  }

  // 主线程搜索（降级方案）
  doSearchMainThread(tree, isOnlySearchCurrentRenderNodes) {
    const matchList = []
    // 转换为小写以进行不区分大小写的搜索（与 Worker 保持一致）
    const lowerSearchText = this.searchText ? String(this.searchText).toLowerCase() : ''
    // 注意：tree 始终是纯数据结构（与 Worker 路径保持一致）
    bfsWalk(tree, node => {
      // 纯数据结构中，node 是 { data: {...}, children: [...] } 结构
      let { richText, text, generalization, tag } = node.data

      // 根据搜索类型进行匹配
      let isMatch = false
      if (this.searchType === 'tag') {
        // 标签搜索
        if (tag && Array.isArray(tag)) {
          // 处理标签可能是字符串或对象的情况
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
        // 文本搜索
        if (!text) {
          text = ''
        }
        if (richText) {
          text = getTextFromHtml(text)
        }
        isMatch = String(text).toLowerCase().includes(lowerSearchText)
      }

      if (isMatch) {
        // 纯数据结构中，node 是 { data: {...}, children: [...] } 结构
        // 需要提取 data 部分，并尝试查找对应的节点实例
        if (isOnlySearchCurrentRenderNodes) {
          // 尝试查找节点实例（如果已渲染）
          const nodeInstance = this.mindMap.renderer.findNodeByUid(node.data.uid)
          if (nodeInstance) {
            matchList.push(nodeInstance)
          } else {
            // 未渲染，使用数据对象
            matchList.push({ data: node.data })
          }
        } else {
          matchList.push({ data: node.data })
        }
      }

      // 概要节点
      const generalizationList = formatGetNodeGeneralization({
        generalization
      })
      generalizationList.forEach(gNode => {
        let { richText, text, uid, tag } = gNode
        // 检查节点是否已渲染（仅当 isOnlySearchCurrentRenderNodes 为 true 时）
        if (isOnlySearchCurrentRenderNodes && !this.mindMap.renderer.findNodeByUid(uid)) {
          return
        }

        // 根据搜索类型进行匹配
        let isMatch = false
        if (this.searchType === 'tag') {
          // 标签搜索
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
          // 文本搜索
          if (!text) {
            text = ''
          }
          if (richText) {
            text = getTextFromHtml(text)
          }
          isMatch = String(text).toLowerCase().includes(lowerSearchText)
        }

        if (isMatch) {
          matchList.push({
            data: gNode
          })
        }
      })
    })

    this.updateMatchNodeList(matchList)
  }

  // 搜索匹配的节点
  async doSearch() {
    this.clearHighlightOnReadonly()
    this.updateMatchNodeList([])
    this.currentIndex = -1
    const { isOnlySearchCurrentRenderNodes } = this.mindMap.opt
    // 如果要搜索收起来的节点，那么要遍历渲染树而不是节点树
    // 注意：Worker 需要纯数据对象
    let tree = null
    if (isOnlySearchCurrentRenderNodes) {
      // 如果只搜索当前渲染节点，且 root 存在，则使用 root.getPureData()
      if (this.mindMap.renderer.root) {
        tree = this.mindMap.renderer.root.getPureData()
      }
    } else {
      // 否则使用 renderTree (纯数据)
      tree = this.mindMap.renderer.renderTree
    }

    if (!tree) return

    // 保存当前搜索的版本号和参数，用于验证结果是否仍然有效
    const currentVersion = this.searchVersion
    const currentSearchText = this.searchText
    const currentSearchType = this.searchType

    try {
      // 使用 Worker 进行搜索
      const resultList = await WorkerManager.searchNodes(tree, currentSearchText, currentSearchType)
      
      // 检查搜索是否已被新的搜索请求取代
      if (this.searchVersion !== currentVersion || 
          this.searchText !== currentSearchText || 
          this.searchType !== currentSearchType) {
        // 搜索已被新的请求取代，忽略此结果
        return
      }

      // 将 Worker 返回的 UID 转换为节点实例或数据对象
      const matchList = []
      resultList.forEach(item => {
        const { uid, isGeneralization } = item

        // 尝试在渲染器缓存中查找节点实例
        // 注意：findNodeByUid 只能找到已渲染（即在缓存中）的节点
        // 如果 isOnlySearchCurrentRenderNodes 为 false，我们需要处理未渲染的节点
        // 但目前的 Search 插件逻辑似乎倾向于操作 "节点" 用于高亮等
        // 如果节点未渲染，execCommand('GO_TARGET_NODE') 会负责展开并渲染它

        const node = this.mindMap.renderer.findNodeByUid(uid)

        if (isGeneralization) {
          // 概要节点特殊处理
          // 如果找到了渲染的节点（概要节点也是 MindMapNode）
          if (node) {
            matchList.push({ data: node.getData() })
          } else {
            // 未渲染，从 renderTree 中查找完整的节点数据
            const nodeData = this.findNodeDataByUid(tree, uid)
            if (nodeData) {
              matchList.push({ data: nodeData })
            } else {
              // 如果仍然找不到，至少保留 uid 供后续 GO_TARGET_NODE 使用
              matchList.push({ data: { uid } })
            }
          }
        } else {
          if (node) {
            matchList.push(node)
          } else {
            // 未渲染的普通节点，从 renderTree 中查找完整的节点数据
            const nodeData = this.findNodeDataByUid(tree, uid)
            if (nodeData) {
              matchList.push({ data: nodeData })
            } else {
              // 如果仍然找不到，至少保留 uid 供后续 GO_TARGET_NODE 使用
              matchList.push({ data: { uid } })
            }
          }
        }
      })

      // 在更新结果前再次检查搜索是否已被新的搜索请求取代
      // 防止在构建 matchList 的过程中搜索被取代
      if (this.searchVersion !== currentVersion || 
          this.searchText !== currentSearchText || 
          this.searchType !== currentSearchType) {
        // 搜索已被新的请求取代，忽略此结果
        return
      }

      this.updateMatchNodeList(matchList)
    } catch (e) {
      // 检查搜索是否已被新的搜索请求取代
      if (this.searchVersion !== currentVersion || 
          this.searchText !== currentSearchText || 
          this.searchType !== currentSearchType) {
        // 搜索已被新的请求取代，忽略此错误
        return
      }
      
      console.warn('Worker search failed, fallback to main thread', e)
      // 降级到主线程搜索
      // 使用与 Worker 路径相同的数据结构（纯数据），确保一致性
      // tree 已经在上面根据 isOnlySearchCurrentRenderNodes 正确设置了
      if (tree) {
        // 再次检查搜索是否已被新的搜索请求取代
        if (this.searchVersion !== currentVersion || 
            this.searchText !== currentSearchText || 
            this.searchType !== currentSearchType) {
          return
        }
        this.doSearchMainThread(tree, isOnlySearchCurrentRenderNodes)
      }
    }
  }

  // 判断对象是否是节点实例
  isNodeInstance(node) {
    return node instanceof MindMapNode
  }

  // 从 renderTree 中根据 uid 查找节点数据（包括概要节点）
  findNodeDataByUid(tree, uid) {
    if (!tree || !uid) return null
    
    // 使用广度优先遍历查找节点
    const stack = [tree]
    while (stack.length > 0) {
      const node = stack.shift()
      
      // 检查当前节点
      if (node.data && node.data.uid === uid) {
        return node.data
      }
      
      // 检查概要节点
      const generalizationList = formatGetNodeGeneralization(node.data || {})
      for (const gNode of generalizationList) {
        if (gNode.uid === uid) {
          return gNode
        }
      }
      
      // 继续遍历子节点
      if (node.children && node.children.length > 0) {
        stack.push(...node.children)
      }
    }
    
    return null
  }

  // 搜索下一个或指定索引，定位到下一个匹配节点
  searchNext(callback, index) {
    if (!this.isSearching || this.matchNodeList.length <= 0) return
    if (
      index !== undefined &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < this.matchNodeList.length
    ) {
      this.currentIndex = index
    } else {
      if (this.currentIndex < this.matchNodeList.length - 1) {
        this.currentIndex++
      } else {
        this.currentIndex = 0
      }
    }
    const { readonly } = this.mindMap.opt
    // 只读模式下需要清除之前节点的高亮
    this.clearHighlightOnReadonly()
    const currentNode = this.matchNodeList[this.currentIndex]
    this.notResetSearchText = true
    const uid = this.isNodeInstance(currentNode)
      ? currentNode.getData('uid')
      : currentNode.data.uid
    if (!uid) {
      callback()
      return
    }
    const targetNode = this.mindMap.renderer.findNodeByUid(uid)
    this.mindMap.execCommand('GO_TARGET_NODE', uid, node => {
      if (!this.isNodeInstance(currentNode)) {
        this.matchNodeList[this.currentIndex] = node
        this.updateMatchNodeList(this.matchNodeList)
      }
      callback()
      // 只读模式下节点无法激活，所以通过高亮的方式
      if (readonly) {
        node.highlight()
      }
      // 如果当前节点实例已经存在，则不会触发data_change事件，那么需要手动把标志复位
      if (targetNode) {
        this.notResetSearchText = false
      }
    })
  }

  // 只读模式下清除现有匹配节点的高亮
  clearHighlightOnReadonly() {
    const { readonly } = this.mindMap.opt
    if (readonly) {
      this.matchNodeList.forEach(node => {
        if (this.isNodeInstance(node)) {
          node.closeHighlight()
        }
      })
    }
  }

  // 定位到指定搜索结果索引的节点
  jump(index, callback = () => {}) {
    this.searchNext(callback, index)
  }

  // 替换当前节点
  replace(replaceText, jumpNext = false) {
    if (
      replaceText === null ||
      replaceText === undefined ||
      !this.isSearching ||
      this.matchNodeList.length <= 0
    )
      return
    // 自动跳转下一个匹配节点
    this.isJumpNext = jumpNext
    replaceText = String(replaceText)
    let currentNode = this.matchNodeList[this.currentIndex]
    if (!currentNode) return
    // 如果当前搜索文本是替换文本的子串，那么该节点还是符合搜索结果的
    // 使用不区分大小写的匹配，与搜索功能保持一致
    const keep = String(replaceText).toLowerCase().includes(String(this.searchText).toLowerCase())
    const text = this.getReplacedText(currentNode, this.searchText, replaceText)
    this.notResetSearchText = true
    // 根据节点类型选择不同的更新方式
    if (this.isNodeInstance(currentNode)) {
      currentNode.setText(text, currentNode.getData('richText'))
    } else {
      // 对于数据对象，直接更新数据
      currentNode.data.text = text
      // 如果节点已渲染，需要更新渲染
      const nodeInstance = this.mindMap.renderer.findNodeByUid(currentNode.data.uid)
      if (nodeInstance) {
        const data = { text }
        this.mindMap.renderer.setNodeDataRender(nodeInstance, data, true)
      }
      // 无论节点是否已渲染，都需要触发渲染和命令历史（与 replaceAll 保持一致）
      this.mindMap.render()
      this.mindMap.command.addHistory()
    }
    if (keep) {
      this.updateMatchNodeList(this.matchNodeList)
      return
    }
    const newList = this.matchNodeList.filter(node => {
      return currentNode !== node
    })
    this.updateMatchNodeList(newList)
    if (this.currentIndex > this.matchNodeList.length - 1) {
      this.currentIndex = -1
    } else {
      this.currentIndex--
    }
    this.emitEvent()
  }

  // 替换所有
  replaceAll(replaceText) {
    if (
      replaceText === null ||
      replaceText === undefined ||
      !this.isSearching ||
      this.matchNodeList.length <= 0
    )
      return
    replaceText = String(replaceText)
    // 如果当前搜索文本是替换文本的子串，那么该节点还是符合搜索结果的
    // 使用不区分大小写的匹配，与搜索功能保持一致
    const keep = String(replaceText).toLowerCase().includes(String(this.searchText).toLowerCase())
    this.notResetSearchText = true
    this.matchNodeList.forEach(node => {
      const text = this.getReplacedText(node, this.searchText, replaceText)
      if (this.isNodeInstance(node)) {
        const data = {
          text
        }
        this.mindMap.renderer.setNodeDataRender(node, data, true)
      } else {
        node.data.text = text
      }
    })
    this.mindMap.render()
    this.mindMap.command.addHistory()
    if (keep) {
      this.updateMatchNodeList(this.matchNodeList)
    } else {
      this.endSearch()
    }
  }

  // 获取某个节点替换后的文本
  getReplacedText(node, searchText, replaceText) {
    let { richText, text } = this.isNodeInstance(node)
      ? node.getData()
      : (node.data || {})
    
    // 防御性检查：如果 text 不存在或不是字符串，返回空字符串或原始值
    if (text === undefined || text === null) {
      text = ''
    }
    text = String(text)
    
    if (richText) {
      return replaceHtmlText(text, searchText, replaceText)
    } else {
      // 使用不区分大小写的正则表达式，与搜索功能保持一致
      return text.replace(new RegExp(searchText, 'gi'), replaceText)
    }
  }

  // 发送事件
  emitEvent() {
    this.mindMap.emit('search_info_change', {
      currentIndex: this.currentIndex,
      total: this.matchNodeList.length
    })
  }

  // 插件被移除前做的事情
  beforePluginRemove() {
    this.unBindEvent()
  }

  // 插件被卸载前做的事情
  beforePluginDestroy() {
    this.unBindEvent()
  }
}

Search.instanceName = 'search'

export default Search
