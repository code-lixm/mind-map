import { walk, bfsWalk, simpleDeepClone, createUid, copyRenderTree } from '../utils/index'

/**
 * 自由节点插件（FreedomNode Plugin）
 * 提供独立于主树的自由节点功能，支持在画布任意位置创建、拖拽和管理节点树
 *
 * @author Claude Code
 * @version 1.0.0
 */
class FreedomNode {
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
   * 获取主树根节点位置
   * @returns {Object} { left, top }
   */
  getMainRootPosition() {
    const root = this.mindMap.renderer.root
    if (root) {
      return { left: root.left, top: root.top }
    }
    return { left: 0, top: 0 }
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
   * @param {Drag} drag - Drag 插件的实例
   */
  onDragEnd(drag) {
    const {
      e,
      overlapNode,
      prevNode,
      nextNode,
      beingDragNodeList
    } = drag

    if (!beingDragNodeList || beingDragNodeList.length === 0) {
      return
    }

    const draggedNode = beingDragNodeList[0]
    const isDragFreedomNode = !!draggedNode.getData('isFreedomNode')

    // 情况一：正在拖拽一个已存在的自由节点
    if (isDragFreedomNode) {
      if (!this.options.enableFreedomNodeDrag) return

      const { x, y } = drag.getDragCanvasPosition(e)
      const targetNodeForSnap = drag.checkSnapToTree(draggedNode, { x, y })

      if (targetNodeForSnap) {
        // 吸附回主树
        const freeNodeId = draggedNode.getData('_freedomNodeId')
        if (freeNodeId) {
          this.attachToTree(freeNodeId, targetNodeForSnap)
        }
      } else {
        // 仅移动自由节点
        const freeNodeId = draggedNode.getData('_freedomNodeId')
        if (freeNodeId) {
          const freeNodeData = this.freeNodeMap.get(freeNodeId)
          if (freeNodeData) {
            const { left: rootLeft, top: rootTop } = this.getMainRootPosition()
            const relX = x - rootLeft
            const relY = y - rootTop
            const deltaX = relX - freeNodeData.position.left
            const deltaY = relY - freeNodeData.position.top
            this.moveFreeNode(freeNodeId, deltaX, deltaY)
          }
        }
      }
      return
    }

    // 情况二：正在拖拽一个普通节点
    if (overlapNode || prevNode || nextNode) {
      // 确定目标节点
      const targetNode = overlapNode || prevNode || nextNode
      // 检查目标节点是否属于自由节点树
      const targetFreeId = targetNode.getData('_freedomNodeId')

      if (targetFreeId) {
        // 目标是自由节点，插入到自由节点树
        if (overlapNode) {
          this.insertNodeToFreeTree(draggedNode, targetFreeId, overlapNode, 'child')
        } else if (prevNode) {
          this.insertNodeToFreeTree(draggedNode, targetFreeId, prevNode, 'after')
        } else if (nextNode) {
          this.insertNodeToFreeTree(draggedNode, targetFreeId, nextNode, 'before')
        }
      } else {
        // 目标是主树（非自由节点树），如果节点来自自由节点树，需要从源中移除
        const uid = draggedNode.getData('uid')
        // 检查被拖拽节点是否有 _freedomNodeId 标记，说明它来自自由节点树
        const draggedFreeId = draggedNode.getData('_freedomNodeId')
        const sourceFreeId = draggedFreeId || this.findFreeNodeIdByChildUid(uid)

        if (sourceFreeId) {
          // 尝试从 freeNodeMap 中移除（可能已在 Drag 插件中移除）
          const removed = this.removeNodeFromFreeList(sourceFreeId, uid)
          if (removed) {
            this.syncDataList()
          }
        }

        // 无论是否成功从 freeNodeMap 移除，都要清除节点的自由节点标记
        // 因为 MOVE_NODE_TO 已经执行，节点已在主树中
        if (draggedFreeId) {
          this.clearFreedomMarkerFromNode(draggedNode)
        }
      }
      return
    }
    // 情况三：拖拽到空白区域
    if (beingDragNodeList.length === 1) {
      // 检查是否要吸附到某个自由节点树上
      const targetRoot = drag.getFreeRootUnderPointer(e)
      if (targetRoot) {
        const freeNodeId = targetRoot.getData('_freedomNodeId')
        if (freeNodeId) {
          this.insertNodeToFreeTree(draggedNode, freeNodeId, targetRoot, 'child')
          return
        }
      }

      // 检查是否超出安全距离，如果是则转换为自由节点
      const dragToBlankConvertSafeDistance = this.options.dragToBlankConvertSafeDistance
      if (dragToBlankConvertSafeDistance > 0) {
        const distance = drag.calculateDistanceFromTree()
        if (distance > dragToBlankConvertSafeDistance) {
          const { x, y } = drag.getDragCanvasPosition(e)

          // 如果节点来自自由节点树，转换前先从源中移除
          const sourceFreeId = this.findFreeNodeIdByChildUid(draggedNode.getData('uid'))
          if (sourceFreeId) {
            this.removeNodeFromFreeList(sourceFreeId, draggedNode.getData('uid'))
            this.syncDataList()
          }

          this.convertToFreedom(draggedNode, { left: x, top: y })
        }
      }
    }
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
   * @param {Object} options.position - 位置 { left, top } (绝对坐标)
   * @param {String} [options.text] - 节点文本
   * @param {String} [options.layout] - 布局类型
   * @param {Object} [options.data] - 节点数据覆盖
   * @param {Array} [options.children] - 子节点列表
   * @param {Boolean} [options.center] - 是否以 position 为中心点
   * @returns {String} 自由节点 ID
   */
  createFreeNode(options = {}) {
    const {
      position = { left: 0, top: 0 },
      text = this.options.defaultFreedomNodeText,
      layout = this.options.defaultFreedomNodeLayout || this.mindMap.opt.layout,
      data = {},
      children = [],
      center = false
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

    // 计算相对位置
    const { left: rootLeft, top: rootTop } = this.getMainRootPosition()
    const relativePosition = {
      left: position.left - rootLeft,
      top: position.top - rootTop
    }

    // 构建自由节点数据
    const freeNodeData = {
      id: freeNodeId,
      position: relativePosition,
      layout,
      root: nodeData,
      center // 标记需要居中
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
  attachToTree(freeNodeId, targetNode) {
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
    // 使用 copyRenderTree 避免循环引用导致克隆失败
    const nodeData = {}
    copyRenderTree(nodeData, freeNodeData.root)

    // 移除自由节点标记
    if (nodeData.data) {
      delete nodeData.data.isFreedomNode
    }

    // 添加到目标节点
    // INSERT_CHILD_NODE(openEdit, appointNodes, appointData, appointChildren)
    this.mindMap.execCommand(
      'INSERT_CHILD_NODE',
      false,
      [targetNode],
      nodeData.data,
      nodeData.children
    )

    // 从自由节点列表移除
    this.freeNodeMap.delete(freeNodeId)
    this.syncDataList()

    // 从 freeRootList 中移除实例，防止 renderAllFreeNodes 将其从 DOM 移除
    const nodeInstance = this.findFreeNodeInstance(freeNodeId)
    if (nodeInstance) {
      this.freeRootList = this.freeRootList.filter(root => root !== nodeInstance)
      if (nodeInstance._isFreeTree) {
        delete nodeInstance._isFreeTree
      }
    }

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
   * 通过子节点 UID 查找所属的自由节点 ID
   * @param {String} uid - 子节点 UID
   * @returns {String|null} 自由节点 ID
   */
    findFreeNodeIdByChildUid(uid) {
      for (const [id, data] of this.freeNodeMap) {
        // 检查是否是根节点
        if (data.root && data.root.data && data.root.data.uid === uid) return id
        
        // 检查子节点
        let found = false
        if (data.root) {
          walk(data.root, null, (node) => {
            if (node && node.data && node.data.uid === uid) {
              found = true
              return true // stop walk
            }
          })
        }
        if (found) return id
      }
      return null
    }
  /**
   * 清除节点及其子节点的自由节点标记
   * @param {MindMapNode} node - 节点实例
   */
  clearFreedomMarkerFromNode(node) {
    if (!node) return
    bfsWalk(node, (n) => {
      if (n.nodeData && n.nodeData.data) {
        delete n.nodeData.data._freedomNodeId
        delete n.nodeData.data.isFreedomNode
      }
    })
  }

  /**
   * 在数据树中查找节点及其父节点
   * @param {Object} root - 数据根
   * @param {String} uid - 目标 UID
   * @returns {Object|null} { node, parent, index }
   */
  findNodeDataAndParent(root, uid) {
    if (root.data.uid === uid) {
      return { node: root, parent: null, index: -1 }
    }
    if (root.children && root.children.length > 0) {
      for (let i = 0; i < root.children.length; i++) {
        const child = root.children[i]
        if (child.data.uid === uid) {
          return { node: child, parent: root, index: i }
        }
        const res = this.findNodeDataAndParent(child, uid)
        if (res) return res
      }
    }
    return null
  }

  /**
   * 从自由节点数据中移除指定节点
   * @param {String} freeNodeId - 自由节点 ID
   * @param {String} nodeUid - 要移除的节点 UID
   * @returns {Boolean} 是否成功移除
   */
  removeNodeFromFreeList(freeNodeId, nodeUid) {
    const freeNodeData = this.freeNodeMap.get(freeNodeId)
    if (!freeNodeData || !freeNodeData.root) {
      console.warn('[FreedomNode] removeNodeFromFreeList: freeNodeData not found', freeNodeId)
      return false
    }

    // 如果要移除的是根节点本身，删除整个自由节点
    if (freeNodeData.root.data && freeNodeData.root.data.uid === nodeUid) {
      this.freeNodeMap.delete(freeNodeId)
      return true
    }

    const remove = (node) => {
      if (!node || !node.children || node.children.length === 0) {
        return false
      }
      const index = node.children.findIndex(item => item && item.data && item.data.uid === nodeUid)
      if (index !== -1) {
        node.children.splice(index, 1)
        return true
      }
      for (const child of node.children) {
        if (child && remove(child)) return true
      }
      return false
    }

    const result = remove(freeNodeData.root)
    if (!result) {
      console.warn('[FreedomNode] removeNodeFromFreeList: node not found in tree', nodeUid)
    }
    return result
  }

  /**
   * 将节点插入到自由节点树的指定位置
   * @param {MindMapNode} node - 被移动的节点
   * @param {String} freeNodeId - 目标自由节点 ID
   * @param {MindMapNode} targetNode - 参照节点（目标父节点或兄弟节点）
   * @param {String} placement - 位置：'child' (子节点), 'after' (后一个兄弟), 'before' (前一个兄弟)
   */
  insertNodeToFreeTree(node, freeNodeId, targetNode, placement = 'child') {
    if (!node || !freeNodeId || !targetNode) return

    const freeNodeData = this.freeNodeMap.get(freeNodeId)
    if (!freeNodeData || !freeNodeData.root) {
      console.warn('[FreedomNode] Target free node not found:', freeNodeId)
      return
    }

    const nodeData = this.getNodeDataWithChildren(node)
    nodeData.data.isFreedomNode = false
    this.markTreeDataWithFreeId(nodeData, freeNodeId, false)

    // 1. 从源中移除
    const sourceId = this.findFreeNodeIdByChildUid(node.getData('uid'))
    if (sourceId) {
      this.removeNodeFromFreeList(sourceId, node.getData('uid'))
    }
    this.mindMap.execCommand('REMOVE_NODE', [node])

    // 2. 查找目标位置
    const targetUid = targetNode.getData('uid')
    const targetInfo = this.findNodeDataAndParent(freeNodeData.root, targetUid)

    if (!targetInfo) {
      // 找不到目标，默认追加到根节点
      if (!Array.isArray(freeNodeData.root.children)) {
        freeNodeData.root.children = []
      }
      freeNodeData.root.children.push(nodeData)
    } else {
      const { node: tNode, parent: tParent, index: tIndex } = targetInfo

      if (placement === 'child') {
        if (!tNode.children) tNode.children = []
        tNode.children.push(nodeData)
        // 如果是插入子节点，自动展开
        tNode.data.expand = true
      } else if (placement === 'after' || placement === 'before') {
        // 如果是根节点，无法插入兄弟（除非支持多个根，但这里不支持）
        if (!tParent) {
          if (!tNode.children) tNode.children = []
          tNode.children.push(nodeData)
        } else {
          const insertIndex = placement === 'after' ? tIndex + 1 : tIndex
          tParent.children.splice(insertIndex, 0, nodeData)
        }
      }
    }

    // 3. 同步和渲染
    this.syncDataList()
    this.mindMap.emit('freedom_node_change', {
      type: 'node_moved',
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

    // 【关键】自由节点渲染完成后，通知依赖位置的插件刷新
    // 由于插件注册顺序，AssociativeLine 和 OuterFrame 的 node_tree_render_end 监听器
    // 会在 FreedomNode 之前执行，此时 freeRootList 还是空的
    // 所以需要在这里手动触发它们的刷新
    this.refreshDependentPlugins()
  }

  /**
   * 刷新依赖节点位置的插件（关联线、外框等）
   */
  refreshDependentPlugins() {
    // 刷新关联线
    if (this.mindMap.associativeLine && this.mindMap.associativeLine.renderAllLines) {
      this.mindMap.associativeLine.renderAllLines()
    }
    // 刷新外框
    if (this.mindMap.outerFrame && this.mindMap.outerFrame.renderOuterFrames) {
      this.mindMap.outerFrame.renderOuterFrames()
    }
  }

  /**
   * 渲染单个自由节点树
   * @param {Object} freeNodeData - 自由节点数据
   * @param {String} freeNodeId - 自由节点 ID
   */
  renderFreeNode(freeNodeData, freeNodeId) {
    const { layout, root } = freeNodeData
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

    // 如果标记了需要居中（通常是刚创建时）
    if (freeNodeData.center) {
      const halfWidth = rootNode.width / 2
      const halfHeight = rootNode.height / 2

      // 更新存储的相对位置（将左上角向左上移动一半尺寸）
      freeNodeData.position.left -= halfWidth
      freeNodeData.position.top -= halfHeight

      // 移除标记，确保只调整一次
      delete freeNodeData.center
    }

    // Calculate absolute position for rendering
    const { left: rootLeft, top: rootTop } = this.getMainRootPosition()
    const absolutePosition = {
      left: rootLeft + freeNodeData.position.left,
      top: rootTop + freeNodeData.position.top
    }

    this.layoutFreeTree(rootNode, layoutInstance, absolutePosition)
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
  getLayoutInstance() {
    // 复用渲染器的布局实例
    const LayoutClass = this.mindMap.renderer.layout.constructor
    return new LayoutClass(this.mindMap.renderer)
  }

  /**
   * 布局自由节点树
   * @param {MindMapNode} rootNode - 根节点
   * @param {Object} layoutInstance - 布局实例
   * @param {Object} position - 目标绝对位置
   */
  layoutFreeTree(rootNode, layoutInstance, position) {
    // 设置根节点为自由树模式（不居中）
    rootNode._isFreeTree = true

    // 计算布局
    // layoutInstance.root = rootNode
    // layoutInstance.doLayout(() => {
    //   // doLayout 会将节点定位在画布中心（默认行为）
    //   // 我们需要计算偏移量，将其移动到目标位置
    //   const deltaX = position.left - rootNode.left
    //   const deltaY = position.top - rootNode.top

    //   // 应用锚点偏移
    //   this.applyAnchorOffset(rootNode, { left: deltaX, top: deltaY })
    // })

    // 直接计算偏移量
    // 此时 rootNode.left/top 已经在 computeFreeTreeLayout 中计算好了（位于画布中心）
    const deltaX = position.left - rootNode.left
    const deltaY = position.top - rootNode.top

    // 应用锚点偏移
    this.applyAnchorOffset(rootNode, { left: deltaX, top: deltaY })
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
      if (!freeNodeData) return
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
          item => {
            const newItem = { ...item }
            // 使用 copyRenderTree 安全地复制 root 数据，去除 _node 等循环引用
            if (item.root) {
              newItem.root = {}
              copyRenderTree(newItem.root, item.root)
            }
            // 深拷贝 position 等其他属性，确保安全
            if (newItem.position) {
              newItem.position = { ...newItem.position }
            }
            return newItem
          }
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
