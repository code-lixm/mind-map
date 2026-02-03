import { throttle } from '../utils/index'

/**
 * 视口检测插件
 * 用于判断当前脑图是否在可视窗口之内
 */
class ViewportDetector {
  constructor(opt) {
    this.mindMap = opt.mindMap
    // 插件是否启用，默认不启用
    this.enabled = false
    // 上一次的可见性状态
    this.lastVisibility = null
    // 节流后的检测方法
    this.throttledCheck = throttle(this.check.bind(this), 100, this)
    // 绑定事件处理器
    this.bindEventHandlers()
  }

  // 绑定事件处理器（但不立即监听，等启用后再监听）
  bindEventHandlers() {
    this.onViewChange = this.onViewChange.bind(this)
  }

  // 绑定事件监听
  bindEvent() {
    this.mindMap.on('view_data_change', this.onViewChange)
    this.mindMap.on('node_tree_render_end', this.onViewChange)
    this.mindMap.on('resize', this.onViewChange)
    this.mindMap.on('scale', this.onViewChange)
  }

  // 解绑事件监听
  unBindEvent() {
    this.mindMap.off('view_data_change', this.onViewChange)
    this.mindMap.off('node_tree_render_end', this.onViewChange)
    this.mindMap.off('resize', this.onViewChange)
    this.mindMap.off('scale', this.onViewChange)
  }

  /**
   * 启用插件
   */
  enable() {
    if (this.enabled) return
    this.enabled = true
    this.bindEvent()
    // 启用后立即检测一次
    this.check()
  }

  /**
   * 禁用插件
   */
  disable() {
    if (!this.enabled) return
    this.enabled = false
    this.unBindEvent()
    this.lastVisibility = null
  }

  /**
   * 切换启用状态
   * @returns {boolean} 切换后的状态
   */
  toggle() {
    if (this.enabled) {
      this.disable()
    } else {
      this.enable()
    }
    return this.enabled
  }

  /**
   * 获取是否启用
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled
  }

  // 视图变化时的处理
  onViewChange() {
    if (!this.enabled) return
    this.throttledCheck()
  }

  /**
   * 手动触发检测并 emit 事件
   * @returns {Object} 可见性信息
   */
  emitCheck() {
    const visibility = this.getVisibility()
    this.mindMap.emit('viewport_change', visibility)
    this.lastVisibility = visibility
    return visibility
  }

  /**
   * 检测可见性并在状态变化时触发事件
   * @returns {Object} 可见性信息
   */
  check() {
    this.mindMap.getElRectInfo()
    if (!this.enabled) {
      return this.getVisibility()
    }
    const visibility = this.getVisibility()
    // 判断可见性状态是否发生变化
    if (
      !this.lastVisibility ||
      this.lastVisibility.status !== visibility.status ||
      this.lastVisibility.isFullyVisible !== visibility.isFullyVisible
    ) {
      this.mindMap.emit('viewport_change', visibility)
    }
    this.lastVisibility = visibility
    return visibility
  }

  /**
   * 获取思维导图的边界信息（相对于画布）
   * @returns {Object} 边界信息
   */
  getMindMapBounds() {
    const rect = this.mindMap.draw.rbox()
    const elRect = this.mindMap.elRect
    // 转换为相对于画布容器的坐标
    return {
      left: rect.x - elRect.left,
      top: rect.y - elRect.top,
      right: rect.x2 - elRect.left,
      bottom: rect.y2 - elRect.top,
      width: rect.width,
      height: rect.height,
      centerX: rect.cx - elRect.left,
      centerY: rect.cy - elRect.top
    }
  }

  /**
   * 获取视口（画布容器）的边界信息
   * @returns {Object} 视口边界
   */
  getViewportBounds() {
    return {
      left: 0,
      top: 0,
      right: this.mindMap.width,
      bottom: this.mindMap.height,
      width: this.mindMap.width,
      height: this.mindMap.height,
      centerX: this.mindMap.width / 2,
      centerY: this.mindMap.height / 2
    }
  }

  /**
   * 获取详细的可见性信息
   * @returns {Object} 可见性详情
   * - status: 'fully_visible' | 'partially_visible' | 'invisible'
   * - isFullyVisible: boolean - 是否完全可见
   * - isPartiallyVisible: boolean - 是否部分可见
   * - isInvisible: boolean - 是否完全不可见
   * - visibleRatio: number - 可见比例 (0-1)
   * - overflow: { left, top, right, bottom } - 各方向溢出的像素值（正值表示溢出）
   * - directions: string[] - 溢出的方向列表
   * - mindMapBounds: Object - 思维导图边界
   * - viewportBounds: Object - 视口边界
   */
  getVisibility() {
    const mindMapBounds = this.getMindMapBounds()
    const viewportBounds = this.getViewportBounds()

    // 计算各方向溢出值（正值表示溢出视口）
    const overflow = {
      left: -mindMapBounds.left, // 脑图左边超出视口左边
      top: -mindMapBounds.top, // 脑图顶部超出视口顶部
      right: mindMapBounds.right - viewportBounds.right, // 脑图右边超出视口右边
      bottom: mindMapBounds.bottom - viewportBounds.bottom // 脑图底部超出视口底部
    }

    // 获取溢出的方向
    const directions = []
    if (overflow.left > 0) directions.push('left')
    if (overflow.top > 0) directions.push('top')
    if (overflow.right > 0) directions.push('right')
    if (overflow.bottom > 0) directions.push('bottom')

    // 计算可见区域
    const visibleLeft = Math.max(mindMapBounds.left, viewportBounds.left)
    const visibleTop = Math.max(mindMapBounds.top, viewportBounds.top)
    const visibleRight = Math.min(mindMapBounds.right, viewportBounds.right)
    const visibleBottom = Math.min(mindMapBounds.bottom, viewportBounds.bottom)

    // 计算可见区域的宽高
    const visibleWidth = Math.max(0, visibleRight - visibleLeft)
    const visibleHeight = Math.max(0, visibleBottom - visibleTop)
    const visibleArea = visibleWidth * visibleHeight

    // 计算思维导图总面积
    const totalArea = mindMapBounds.width * mindMapBounds.height

    // 计算可见比例
    const visibleRatio = totalArea > 0 ? visibleArea / totalArea : 0

    // 判断可见性状态
    let status
    let isFullyVisible = false
    let isPartiallyVisible = false
    let isInvisible = false

    if (visibleRatio >= 0.9999) {
      // 完全可见（允许微小误差）
      status = 'fully_visible'
      isFullyVisible = true
    } else if (visibleRatio > 0) {
      // 部分可见
      status = 'partially_visible'
      isPartiallyVisible = true
    } else {
      // 完全不可见
      status = 'invisible'
      isInvisible = true
    }

    // 计算根节点是否可见
    const rootVisible = this.isRootNodeVisible()

    return {
      status,
      isFullyVisible,
      isPartiallyVisible,
      isInvisible,
      visibleRatio,
      visibleArea,
      overflow,
      directions,
      rootVisible,
      mindMapBounds,
      viewportBounds,
      visibleBounds: {
        left: visibleLeft,
        top: visibleTop,
        right: visibleRight,
        bottom: visibleBottom,
        width: visibleWidth,
        height: visibleHeight
      }
    }
  }

  /**
   * 检查根节点是否可见
   * @returns {boolean}
   */
  isRootNodeVisible() {
    const root = this.mindMap.renderer.root
    if (!root || !root.group) return false

    const rootRect = root.group.rbox()
    const elRect = this.mindMap.elRect
    const viewportBounds = this.getViewportBounds()

    // 转换为相对于画布的坐标
    const rootBounds = {
      left: rootRect.x - elRect.left,
      top: rootRect.y - elRect.top,
      right: rootRect.x2 - elRect.left,
      bottom: rootRect.y2 - elRect.top
    }

    // 检查根节点是否与视口有交集
    return !(
      rootBounds.right < viewportBounds.left ||
      rootBounds.left > viewportBounds.right ||
      rootBounds.bottom < viewportBounds.top ||
      rootBounds.top > viewportBounds.bottom
    )
  }

  /**
   * 检查思维导图是否在视口内（至少部分可见）
   * @returns {boolean}
   */
  isInViewport() {
    const visibility = this.getVisibility()
    return !visibility.isInvisible
  }

  /**
   * 检查思维导图是否完全在视口内
   * @returns {boolean}
   */
  isFullyInViewport() {
    const visibility = this.getVisibility()
    return visibility.isFullyVisible
  }

  /**
   * 获取思维导图超出视口的方向
   * @returns {string[]} 方向数组，可能包含 'left', 'top', 'right', 'bottom'
   */
  getOverflowDirections() {
    const visibility = this.getVisibility()
    return visibility.directions
  }

  /**
   * 获取将思维导图移动到视口中心所需的偏移量
   * @returns {Object} { x, y } 需要移动的距离
   */
  getCenterOffset() {
    const mindMapBounds = this.getMindMapBounds()
    const viewportBounds = this.getViewportBounds()

    return {
      x: viewportBounds.centerX - mindMapBounds.centerX,
      y: viewportBounds.centerY - mindMapBounds.centerY
    }
  }

  /**
   * 获取将思维导图完全移入视口所需的最小偏移量
   * @returns {Object} { x, y } 需要移动的距离
   */
  getMinimalOffset() {
    const visibility = this.getVisibility()
    const { overflow } = visibility

    let x = 0
    let y = 0

    // 优先处理左右方向
    if (overflow.left > 0 && overflow.right <= 0) {
      x = overflow.left // 向右移动
    } else if (overflow.right > 0 && overflow.left <= 0) {
      x = -overflow.right // 向左移动
    }

    // 处理上下方向
    if (overflow.top > 0 && overflow.bottom <= 0) {
      y = overflow.top // 向下移动
    } else if (overflow.bottom > 0 && overflow.top <= 0) {
      y = -overflow.bottom // 向上移动
    }

    return { x, y }
  }

  /**
   * 回到视图中心（将根节点移动到视口中心）
   */
  backToCenter() {
    if (this.mindMap.renderer && this.mindMap.renderer.setRootNodeCenter) {
      this.mindMap.renderer.setRootNodeCenter()
    } else {
      this.mindMap.view.reset()
    }
  }

  /**
   * 检查指定节点是否在视口内
   * @param {Node} node - 节点实例
   * @returns {boolean}
   */
  isNodeInViewport(node) {
    if (!node || !node.group) return false

    const nodeRect = node.group.rbox()
    const elRect = this.mindMap.elRect
    const viewportBounds = this.getViewportBounds()

    const nodeBounds = {
      left: nodeRect.x - elRect.left,
      top: nodeRect.y - elRect.top,
      right: nodeRect.x2 - elRect.left,
      bottom: nodeRect.y2 - elRect.top
    }

    // 检查节点是否与视口有交集
    return !(
      nodeBounds.right < viewportBounds.left ||
      nodeBounds.left > viewportBounds.right ||
      nodeBounds.bottom < viewportBounds.top ||
      nodeBounds.top > viewportBounds.bottom
    )
  }

  /**
   * 获取所有在视口内的节点
   * @returns {Node[]}
   */
  getVisibleNodes() {
    const allNodes = []
    const walk = node => {
      if (node) {
        allNodes.push(node)
        if (node.children && node.children.length > 0) {
          node.children.forEach(child => walk(child))
        }
      }
    }
    walk(this.mindMap.renderer.root)

    return allNodes.filter(node => this.isNodeInViewport(node))
  }

  /**
   * 获取所有不在视口内的节点
   * @returns {Node[]}
   */
  getInvisibleNodes() {
    const allNodes = []
    const walk = node => {
      if (node) {
        allNodes.push(node)
        if (node.children && node.children.length > 0) {
          node.children.forEach(child => walk(child))
        }
      }
    }
    walk(this.mindMap.renderer.root)

    return allNodes.filter(node => !this.isNodeInViewport(node))
  }

  // 插件被移除前的清理
  beforePluginRemove() {
    this.disable()
  }

  // 插件被销毁前的清理
  beforePluginDestroy() {
    this.disable()
  }
}

// 插件实例名称
ViewportDetector.instanceName = 'viewportDetector'

export default ViewportDetector
