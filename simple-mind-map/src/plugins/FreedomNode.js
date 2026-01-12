import { walk, bfsWalk, simpleDeepClone, createUid } from '../utils/index'

/**
 * 自由节点插件（FreedomNode Plugin）
 * 提供独立于主树的自由节点功能，支持在画布任意位置创建、拖拽和管理节点树
 *
 * @author Claude Code
 * @version 1.0.0
 */
class FreedomNode {
  /**
   * 插件名称，挂载到 mindMap.freeNode
   * @static
   */
  static pluginName = 'freeNode'

  /**
   * 构造函数
   * @param {Object} opt - 配置选项
   * @param {MindMap} opt.mindMap - MindMap 实例
   */
  constructor({ mindMap }) {
    this.mindMap = mindMap

    // 自由节点数据存储
    // Map<id, { id, position, layout, root, nodeInstance }>
    this.freeNodeMap = new Map()

    // 渲染后的自由节点根实例列表
    // Array<MindMapNode>
    this.freeRootList = []

    // 自由节点数据列表（与 freeNodeMap 保持同步）
    this.freeNodeDataList = []

    // 配置项
    this.options = this.initOptions()

    // 预绑定事件处理器，便于解绑
    this.onRenderEndHandler = this.onRenderEnd.bind(this)
    this.onDragEndHandler = this.onDragEnd.bind(this)
    this.onDataChangeHandler = this.onDataChange.bind(this)

    // 绑定事件
    this.bindEvents()

    // 注册命令
    this.registerCommands()
  }

  /**
   * 初始化配置选项
   * @returns {Object} 配置对象
   */
  initOptions() {
    const defaultConfig = {
      enableFreedomNode: true,
      dragToBlankConvertSafeDistance: 150,
      snapToTreeDistance: 100,
      dblclickBlankCreateFreedom: true,
      defaultFreedomNodeText: '自由节点',
      defaultFreedomNodeLayout: null,
      enableFreedomNodeDrag: true,
      exportIncludeFreedomNodes: true
    }

    return {
      ...defaultConfig,
      ...(this.mindMap.opt.freedomNodeConfig || {})
    }
  }

  /**
   * 绑定事件监听
   */
  bindEvents() {
    // 监听渲染完成事件，渲染自由节点
    this.mindMap.on('node_tree_render_end', this.onRenderEndHandler)

    // 监听拖拽结束事件，处理节点转换
    this.mindMap.on('node_dragend', this.onDragEndHandler)

    // 监听数据加载，初始化自由节点
    this.mindMap.on('data_change', this.onDataChangeHandler)
  }

  /**
   * 渲染结束回调
   */
  onRenderEnd() {
    // 渲染所有自由节点
    this.renderAllFreeNodes()
  }

  /**
   * 拖拽结束回调
   * @param {Object} data - 拖拽数据
   */
  onDragEnd(data) {
    // 检查是否需要转换为自由节点
    // 实现在后续版本中补充
  }

  /**
   * 数据变化回调
   * @param {Object} data - 思维导图数据
   */
  onDataChange(data) {
    // 加载自由节点数据
    if (data.freeNodes && Array.isArray(data.freeNodes)) {
      this.importFreeNodes(data.freeNodes, { mode: 'replace' })
    }
  }

  /**
   * 注册命令
   */
  registerCommands() {
    // 创建自由节点命令
    this.mindMap.command.add('CREATE_FREEDOM_NODE', this.createFreeNode.bind(this))

    // 节点转自由节点命令
    this.mindMap.command.add('CONVERT_TO_FREEDOM', this.convertToFreedom.bind(this))

    // 自由节点吸附回树命令
    this.mindMap.command.add('ATTACH_FREEDOM_NODE', this.attachToTree.bind(this))

    // 移动自由节点命令
    this.mindMap.command.add('MOVE_FREEDOM_NODE', this.moveFreeNode.bind(this))

    // 删除自由节点命令
    this.mindMap.command.add('REMOVE_FREEDOM_NODE', this.removeFreeNode.bind(this))
  }

  /**
   * 创建自由节点
   * @param {Object} options - 创建选项
   * @param {Object} options.position - 位置 { left, top }
   * @param {String} [options.text] - 节点文本
   * @param {String} [options.layout] - 布局类型
   * @param {Object} [options.data] - 节点数据覆盖
   * @param {Array} [options.children] - 子节点列表
   * @returns {String} 自由节点 ID
   */
  createFreeNode(options = {}) {
    const {
      position = { left: 0, top: 0 },
      text = this.options.defaultFreedomNodeText,
      layout = this.options.defaultFreedomNodeLayout || this.mindMap.opt.layout,
      data = {},
      children = []
    } = options

    // 生成唯一 ID
    const freeNodeId = `fn_${createUid()}`

    // 构建节点数据
    const nodeData = {
      data: {
        text,
        uid: createUid(),
        isFreedomNode: true,
        ...data
      },
      children: children.map(child => this.processChildNode(child))
    }

    // 标记自由节点树
    this.markTreeDataWithFreeId(nodeData, freeNodeId, true)

    // 构建自由节点数据
    const freeNodeData = {
      id: freeNodeId,
      position: { ...position },
      layout,
      root: nodeData
    }

    // 添加到数据管理
    this.freeNodeMap.set(freeNodeId, freeNodeData)
    this.syncDataList()

    // 触发事件
    this.mindMap.emit('freedom_node_created', freeNodeData)
    this.mindMap.emit('freedom_node_change', {
      type: 'created',
      data: freeNodeData
    })

    // 重新渲染
    this.mindMap.render()

    return freeNodeId
  }

  /**
   * 处理子节点数据，确保有 uid
   * @param {Object} child - 子节点数据
   * @returns {Object} 处理后的子节点数据
   */
  processChildNode(child) {
    const processed = simpleDeepClone(child)
    if (!processed.data) {
      processed.data = {}
    }
    if (!processed.data.uid) {
      processed.data.uid = createUid()
    }
    if (processed.children && processed.children.length > 0) {
      processed.children = processed.children.map(c => this.processChildNode(c))
    }
    return processed
  }

  /**
   * 节点转自由节点
   * @param {MindMapNode} node - 要转换的节点
   * @param {Object} position - 目标位置 { left, top }
   * @returns {String} 新创建的自由节点 ID
   */
  convertToFreedom(node, position) {
    if (!node || node.isRoot) {
      console.warn('[FreedomNode] Cannot convert root node or invalid node')
      return null
    }

    // 获取节点数据（包含子树）
    const nodeData = this.getNodeDataWithChildren(node)

    // 标记为自由节点
    nodeData.data.isFreedomNode = true

    // 记录原始父节点和索引
    const parent = node.parent
    const nodeIndex = parent ? parent.children.indexOf(node) : -1

    // 从父节点移除
    if (parent && nodeIndex !== -1) {
      this.mindMap.execCommand('REMOVE_NODE', [node])
    }

    // 创建自由节点
    const freeNodeId = this.createFreeNode({
      position,
      layout: this.mindMap.opt.layout,
      data: nodeData.data,
      children: nodeData.children || []
    })

    // 触发事件
    this.mindMap.emit('node_converted_to_freedom', node, freeNodeId)
    this.mindMap.emit('freedom_node_change', {
      type: 'converted',
      data: { nodeUid: node.getData('uid'), freeNodeId }
    })

    return freeNodeId
  }

  /**
   * 获取节点数据（包含完整子树）
   * @param {MindMapNode} node - 节点实例
   * @returns {Object} 节点数据对象
   */
  getNodeDataWithChildren(node) {
    const nodeData = {
      data: simpleDeepClone(node.nodeData.data),
      children: []
    }

    if (node.children && node.children.length > 0) {
      nodeData.children = node.children.map(child =>
        this.getNodeDataWithChildren(child)
      )
    }

    return nodeData
  }

  /**
   * 自由节点吸附回树
   * @param {String} freeNodeId - 自由节点 ID
   * @param {MindMapNode} targetNode - 目标父节点
   * @param {Number} [index] - 插入位置索引
   */
  attachToTree(freeNodeId, targetNode, index) {
    const freeNodeData = this.freeNodeMap.get(freeNodeId)

    if (!freeNodeData) {
      console.warn('[FreedomNode] Free node not found:', freeNodeId)
      return
    }

    if (!targetNode) {
      console.warn('[FreedomNode] Target node is invalid')
      return
    }

    // 获取自由节点的根数据
    const nodeData = simpleDeepClone(freeNodeData.root)

    // 移除自由节点标记
    delete nodeData.data.isFreedomNode

    // 添加到目标节点
    this.mindMap.execCommand('INSERT_CHILD_NODE', targetNode, nodeData, index)

    // 从自由节点列表移除
    this.freeNodeMap.delete(freeNodeId)
    this.syncDataList()

    // 触发事件
    this.mindMap.emit('freedom_node_attached', freeNodeId, targetNode)
    this.mindMap.emit('freedom_node_change', {
      type: 'attached',
      data: { freeNodeId, targetNodeUid: targetNode.getData('uid') }
    })

    // 重新渲染
    this.mindMap.render()
  }

  /**
   * 追加节点到已有的自由节点根下
   * @param {MindMapNode} node - 被追加的节点
   * @param {String} freeNodeId - 目标自由节点 ID
   */
  appendNodeToFreeRoot(node, freeNodeId) {
    if (!node || !freeNodeId) {
      return
    }
    const freeNodeData = this.freeNodeMap.get(freeNodeId)
    if (!freeNodeData || !freeNodeData.root) {
      console.warn('[FreedomNode] Target free node not found:', freeNodeId)
      return
    }
    const nodeData = this.getNodeDataWithChildren(node)
    nodeData.data.isFreedomNode = false
    this.markTreeDataWithFreeId(nodeData, freeNodeId, false)
    this.mindMap.execCommand('REMOVE_NODE', [node])
    if (!Array.isArray(freeNodeData.root.children)) {
      freeNodeData.root.children = []
    }
    freeNodeData.root.children.push(nodeData)
    this.syncDataList()
    this.mindMap.emit('freedom_node_change', {
      type: 'child_appended',
      data: {
        freeNodeId,
        nodeUid: node.getData('uid')
      }
    })
    this.mindMap.render()
  }

  /**
   * 移动自由节点
   * @param {String} freeNodeId - 自由节点 ID
   * @param {Number} deltaX - X 方向偏移
   * @param {Number} deltaY - Y 方向偏移
   */
  moveFreeNode(freeNodeId, deltaX, deltaY) {
    const freeNodeData = this.freeNodeMap.get(freeNodeId)

    if (!freeNodeData) {
      console.warn('[FreedomNode] Free node not found:', freeNodeId)
      return
    }

    // 更新位置
    freeNodeData.position.left += deltaX
    freeNodeData.position.top += deltaY
    this.syncDataList()

    // 触发事件
    this.mindMap.emit('freedom_node_moved', freeNodeId, freeNodeData.position)
    this.mindMap.emit('freedom_node_change', {
      type: 'moved',
      data: { freeNodeId, position: freeNodeData.position }
    })

    // 重新渲染
    this.mindMap.render()
  }

  /**
   * 删除自由节点
   * @param {String} freeNodeId - 自由节点 ID
   */
  removeFreeNode(freeNodeId) {
    const freeNodeData = this.freeNodeMap.get(freeNodeId)

    if (!freeNodeData) {
      console.warn('[FreedomNode] Free node not found:', freeNodeId)
      return
    }

    // 移除节点实例
    const nodeInstance = this.findFreeNodeInstance(freeNodeId)
    if (nodeInstance) {
      nodeInstance.remove()
    }

    // 从数据管理移除
    this.freeNodeMap.delete(freeNodeId)
    this.syncDataList()

    // 触发事件
    this.mindMap.emit('freedom_node_removed', freeNodeId)
    this.mindMap.emit('freedom_node_change', {
      type: 'removed',
      data: { freeNodeId }
    })

    // 重新渲染
    this.mindMap.render()
  }

  /**
   * 查找自由节点实例
   * @param {String} freeNodeId - 自由节点 ID
   * @returns {MindMapNode|null} 节点实例
   */
  findFreeNodeInstance(freeNodeId) {
    for (const root of this.freeRootList) {
      if (root.getData('_freedomNodeId') === freeNodeId) {
        return root
      }
    }
    return null
  }

  /**
   * 渲染所有自由节点
   */
  renderAllFreeNodes() {
    if (this.freeRootList.length > 0) {
      this.freeRootList.forEach(root => {
        root.remove()
      })
    }
    this.freeRootList = []

    // 如果没有自由节点，直接返回
    if (this.freeNodeMap.size === 0) {
      return
    }

    // 遍历所有自由节点数据
    this.freeNodeMap.forEach((freeNodeData, freeNodeId) => {
      this.renderFreeNode(freeNodeData, freeNodeId)
    })
  }

  /**
   * 渲染单个自由节点树
   * @param {Object} freeNodeData - 自由节点数据
   * @param {String} freeNodeId - 自由节点 ID
   */
  renderFreeNode(freeNodeData, freeNodeId) {
    const { position, layout, root } = freeNodeData
    if (!root || !root.data) {
      return
    }

    // 标记数据树
    this.markTreeDataWithFreeId(root, freeNodeId, true)

    // 获取布局实例
    const layoutInstance = this.getLayoutInstance(
      layout || this.mindMap.opt.layout
    )

    if (!layoutInstance || !layoutInstance.renderer) {
      console.warn('[FreedomNode] Layout not found:', layout)
      return
    }

    const rootNode = this.computeFreeTreeLayout(layoutInstance, root)
    if (!rootNode) {
      return
    }

    this.markInstanceTreeAsFree(rootNode, freeNodeId)
    this.layoutFreeTree(rootNode, layoutInstance, position)

    // 渲染节点
    rootNode.render(() => {
      // 渲染完成回调
    })

    // 保存实例
    this.freeRootList.push(rootNode)
  }

  /**
   * 计算自由节点树的布局
   * @param {Object} layoutInstance - 布局实例
   * @param {Object} rootData - 根数据
   * @returns {MindMapNode|null} 根节点实例
   */
  computeFreeTreeLayout(layoutInstance, rootData) {
    const renderer = layoutInstance.renderer
    if (!renderer) {
      return null
    }
    const originalRenderTree = renderer.renderTree
    renderer.renderTree = rootData
    let rootNode = null
    try {
      layoutInstance.computedBaseValue && layoutInstance.computedBaseValue()
      layoutInstance.computedTopValue && layoutInstance.computedTopValue()
      layoutInstance.adjustTopValue && layoutInstance.adjustTopValue()
      rootNode = layoutInstance.root
    } catch (err) {
      console.error('[FreedomNode] Layout free node tree failed:', err)
      rootNode = null
    } finally {
      renderer.renderTree = originalRenderTree
    }
    return rootNode
  }

  /**
   * 标记自由节点数据树
   * @param {Object} nodeData - 节点数据
   * @param {String} freeNodeId - 自由节点 ID
   * @param {Boolean} isRoot - 是否根节点
   */
  markTreeDataWithFreeId(nodeData, freeNodeId, isRoot = false) {
    if (!nodeData || !nodeData.data) {
      return
    }
    nodeData.data._freedomNodeId = freeNodeId
    if (isRoot) {
      nodeData.data.isFreedomNode = true
    } else {
      delete nodeData.data.isFreedomNode
    }
    if (Array.isArray(nodeData.children)) {
      nodeData.children.forEach(child =>
        this.markTreeDataWithFreeId(child, freeNodeId, false)
      )
    }
  }

  /**
   * 标记自由节点实例树
   * @param {MindMapNode} rootNode - 根节点实例
   * @param {String} freeNodeId - 自由节点 ID
   */
  markInstanceTreeAsFree(rootNode, freeNodeId) {
    if (!rootNode) return
    bfsWalk(rootNode, (node) => {
      node._isFreeTree = true
      const data = node.nodeData && node.nodeData.data ? node.nodeData.data : {}
      data._freedomNodeId = freeNodeId
      if (node === rootNode) {
        data.isFreedomNode = true
      } else {
        delete data.isFreedomNode
      }
      node.nodeData.data = data
      return
    })
  }

  /**
   * 获取布局实例
   * @param {String} layoutName - 布局名称
   * @returns {Object|null} 布局实例
   */
  getLayoutInstance(layoutName) {
    // 复用渲染器的布局实例
    const LayoutClass = this.mindMap.renderer.layout.constructor
    return new LayoutClass(this.mindMap.renderer)
  }

  /**
   * 布局自由节点树
   * @param {MindMapNode} rootNode - 根节点
   * @param {Object} layoutInstance - 布局实例
   * @param {Object} position - 锚点位置
   */
  layoutFreeTree(rootNode, layoutInstance, position) {
    // 设置根节点为自由树模式（不居中）
    rootNode._isFreeTree = true

    // 计算布局
    layoutInstance.root = rootNode
    layoutInstance.doLayout(() => {
      // 应用锚点偏移
      this.applyAnchorOffset(rootNode, position)
    })
  }

  /**
   * 应用锚点偏移
   * @param {MindMapNode} node - 根节点
   * @param {Object} position - 锚点位置 { left, top }
   */
  applyAnchorOffset(node, position) {
    walk(node, null, (n) => {
      n.left += position.left
      n.top += position.top
    })
  }

  /**
   * 通过 uid 查找节点（包括自由节点）
   * @param {String} uid - 节点 uid
   * @returns {MindMapNode|null} 节点实例
   */
  findNodeByUid(uid) {
    for (const freeRoot of this.freeRootList) {
      const found = this.findInTree(freeRoot, uid)
      if (found) {
        return found
      }
    }
    return null
  }

  /**
   * 在树中查找节点
   * @param {MindMapNode} root - 根节点
   * @param {String} uid - 目标 uid
   * @returns {MindMapNode|null} 找到的节点
   */
  findInTree(root, uid) {
    if (root.getData('uid') === uid) {
      return root
    }

    if (root.children && root.children.length > 0) {
      for (const child of root.children) {
        const found = this.findInTree(child, uid)
        if (found) {
          return found
        }
      }
    }

    return null
  }

  /**
   * 导出自由节点数据
   * @returns {Array} 自由节点数据列表
   */
  exportFreeNodes() {
    return this.freeNodeDataList.map(freeNode =>
      simpleDeepClone(freeNode)
    )
  }

  /**
   * 导入自由节点数据
   * @param {Array} data - 自由节点数据列表
   * @param {Object} [options] - 导入选项
   * @param {String} [options.mode='append'] - 导入模式：'append' 追加，'replace' 替换
   */
  importFreeNodes(data, options = {}) {
    const { mode = 'append' } = options

    if (!Array.isArray(data)) {
      console.warn('[FreedomNode] Invalid import data, expected array')
      return
    }

    // 替换模式：清空现有数据
    if (mode === 'replace') {
      this.freeNodeMap.clear()
    }

    // 导入数据
    data.forEach(freeNodeData => {
      const { id, position, layout, root } = freeNodeData

      // 确保数据完整
      if (!id || !position || !root) {
        console.warn('[FreedomNode] Invalid free node data:', freeNodeData)
        return
      }

      // 添加到 Map
      const clonedRoot = simpleDeepClone(root)
      this.markTreeDataWithFreeId(clonedRoot, id, true)
      this.freeNodeMap.set(id, {
        id,
        position: { ...position },
        layout: layout || this.mindMap.opt.layout,
        root: clonedRoot
      })
    })

    // 同步数据列表
    this.syncDataList()

    // 重新渲染
    this.mindMap.render()
  }

  /**
   * 同步数据列表（保持 Map 和 Array 一致）
   */
  syncDataList() {
    this.freeNodeDataList = Array.from(this.freeNodeMap.values())
    if (this.mindMap.renderer && this.mindMap.renderer.renderTree) {
      if (this.freeNodeDataList.length > 0) {
        this.mindMap.renderer.renderTree.freeNodes = this.freeNodeDataList.map(
          item => simpleDeepClone(item)
        )
      } else {
        delete this.mindMap.renderer.renderTree.freeNodes
      }
    }
  }

  /**
   * 获取所有自由节点的边界矩形
   * @returns {Object|null} 边界矩形 { left, top, right, bottom }
   */
  getFreeNodesBoundingRect() {
    if (this.freeRootList.length === 0) {
      return null
    }

    let minLeft = Infinity
    let minTop = Infinity
    let maxRight = -Infinity
    let maxBottom = -Infinity

    this.freeRootList.forEach(root => {
      walk(root, null, (node) => {
        const { left, top, width, height } = node
        minLeft = Math.min(minLeft, left)
        minTop = Math.min(minTop, top)
        maxRight = Math.max(maxRight, left + width)
        maxBottom = Math.max(maxBottom, top + height)
      })
    })

    return {
      left: minLeft,
      top: minTop,
      right: maxRight,
      bottom: maxBottom,
      width: maxRight - minLeft,
      height: maxBottom - minTop
    }
  }

  /**
   * 清空所有自由节点
   */
  clear() {
    // 移除所有节点实例
    this.freeRootList.forEach(root => {
      root.remove()
    })

    // 清空数据
    this.freeNodeMap.clear()
    this.freeRootList = []
    this.syncDataList()

    // 重新渲染
    this.mindMap.render()
  }

  /**
   * 插件被移除前的清理工作
   */
  beforePluginRemove() {
    this.clear()
    this.mindMap.off('node_tree_render_end', this.onRenderEndHandler)
    this.mindMap.off('node_dragend', this.onDragEndHandler)
    this.mindMap.off('data_change', this.onDataChangeHandler)
  }

  /**
   * 插件被销毁前的清理工作
   */
  beforePluginDestroy() {
    this.beforePluginRemove()
  }
}

// 设置实例名称
FreedomNode.instanceName = 'freeNode'

export default FreedomNode
