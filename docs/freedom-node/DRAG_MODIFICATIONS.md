# Drag.js 自由节点交互扩展 - 修改清单

## 文档信息
- **修改日期**: 2025-12-26
- **修改人**: Claude Code (Interaction Integrator)
- **基准文件**: `simple-mind-map/src/plugins/Drag.js`
- **参考提案**: `simple-mind-map/docs/proposals/freedom-node-plugin.md` (Section 7)

---

## 修改概述

本次修改为 Drag 插件添加了自由节点（FreedomNode）交互支持，包括：
1. 拖拽超出安全距离时自动转换为自由节点
2. 自由节点拖拽回树形结构时自动吸附
3. 双击空白画布创建自由节点
4. 完整的事件触发机制

---

## 修改列表

### 1. 事件绑定扩展

#### 修改位置: `bindEvent()` 方法 (行 64-77)

**新增内容**:
```javascript
this.onDblclick = this.onDblclick.bind(this)
// ...
this.mindMap.on('dblclick', this.onDblclick)
```

**说明**: 添加双击事件监听，用于双击空白画布创建自由节点。

---

#### 修改位置: `unBindEvent()` 方法 (行 79-86)

**新增内容**:
```javascript
this.mindMap.off('dblclick', this.onDblclick)
```

**说明**: 清理双击事件监听器。

---

### 2. 核心拖拽逻辑扩展

#### 修改位置: `onMouseup()` 方法 (行 127-218)

**修改内容**:

**2.1 添加自由节点拖拽检测** (行 161-166):
```javascript
// 检查是否拖拽自由节点
if (this.mousedownNode && this.mousedownNode.getData('isFreedomNode')) {
  this.handleFreeNodeDragEnd(e)
  this.reset()
  return
}
```

**说明**: 在处理拖拽结束时，优先检查是否拖拽的是自由节点。如果是，调用专用处理方法。

---

**2.2 添加安全距离判断和转换逻辑** (行 192-214):
```javascript
} else if (this.isDragging && this.beingDragNodeList.length === 1) {
  // 检查是否超出安全距离，如果是则转换为自由节点
  const dragToBlankConvertSafeDistance = this.mindMap.opt.dragToBlankConvertSafeDistance
  if (dragToBlankConvertSafeDistance) {
    const distance = this.calculateDistanceFromTree()
    if (distance > dragToBlankConvertSafeDistance) {
      this.convertToFreedomNode(e)
      this.reset()
      return
    }
  }
  // 在安全距离内，设置自定义位置
  if (this.clone && enableFreeDrag) {
    this.setCustomPosition(e)
  }
} else if (
  this.clone &&
  enableFreeDrag &&
  this.beingDragNodeList.length === 1
) {
  // 如果只拖拽了一个节点，那么设置自定义位置
  this.setCustomPosition(e)
}
```

**说明**:
- 当节点拖拽到空白区域时，检查距离树的距离
- 如果超出配置的安全距离（`dragToBlankConvertSafeDistance`），转换为自由节点
- 如果在安全距离内，保持原有行为（设置自定义位置）

---

### 3. 新增辅助方法

所有新增方法位于类的末尾，`beforePluginRemove()` 之前。

---

#### 3.1 `setCustomPosition(e)` (行 1279-1299)

**功能**: 设置节点自定义位置（提取原有逻辑）

**代码**:
```javascript
setCustomPosition(e) {
  let { x, y } = this.mindMap.toPos(
    e.clientX - this.offsetX,
    e.clientY - this.offsetY
  )
  let { scaleX, scaleY, translateX, translateY } = this.drawTransform
  x = (x - translateX) / scaleX
  y = (y - translateY) / scaleY
  this.mousedownNode.left = x
  this.mousedownNode.top = y
  this.mousedownNode.customLeft = x
  this.mousedownNode.customTop = y
  this.mindMap.execCommand(
    'SET_NODE_CUSTOM_POSITION',
    this.mousedownNode,
    x,
    y
  )
  this.mindMap.render()
}
```

**说明**: 从 `onMouseup()` 中提取的设置自定义位置逻辑，避免代码重复。

---

#### 3.2 `calculateDistanceFromTree()` (行 1301-1327)

**功能**: 计算拖拽节点距树的最近距离

**代码**:
```javascript
calculateDistanceFromTree() {
  if (!this.beingDragNodeList || this.beingDragNodeList.length === 0) {
    return 0
  }

  const draggedNode = this.beingDragNodeList[0]
  const { x, y } = this.mindMap.toPos(
    this.mouseMoveX - this.offsetX,
    this.mouseMoveY - this.offsetY
  )

  // 计算与最近节点的距离
  let minDistance = Infinity
  this.nodeList.forEach(node => {
    const nodeRect = this.getNodeRect(node)
    // 计算到节点边界的距离
    const distance = Math.sqrt(
      Math.pow(nodeRect.originLeft - x, 2) + Math.pow(nodeRect.originTop - y, 2)
    )
    if (distance < minDistance) {
      minDistance = distance
    }
  })

  return minDistance
}
```

**说明**:
- 遍历所有树形节点
- 计算拖拽节点到每个节点的欧氏距离
- 返回最小距离值

---

#### 3.3 `convertToFreedomNode(e)` (行 1329-1353)

**功能**: 将普通节点转换为自由节点

**代码**:
```javascript
convertToFreedomNode(e) {
  if (!this.mindMap.freeNode) {
    console.warn('FreedomNode plugin not installed')
    return
  }

  const node = this.beingDragNodeList[0]
  let { x, y } = this.mindMap.toPos(
    e.clientX - this.offsetX,
    e.clientY - this.offsetY
  )
  let { scaleX, scaleY, translateX, translateY } = this.drawTransform
  x = (x - translateX) / scaleX
  y = (y - translateY) / scaleY

  // 调用FreedomNode插件的转换方法
  this.mindMap.freeNode.convertToFreedom(node, { left: x, top: y })

  // 触发事件
  this.mindMap.emit('node_converted_to_freedom', {
    node: node,
    position: { left: x, top: y }
  })
}
```

**说明**:
- 检查 FreedomNode 插件是否安装
- 计算节点在画布上的绝对位置
- 调用 FreedomNode 插件的 `convertToFreedom` 方法
- 触发 `node_converted_to_freedom` 事件

---

#### 3.4 `handleFreeNodeDragEnd(e)` (行 1355-1392)

**功能**: 处理自由节点拖拽结束

**代码**:
```javascript
handleFreeNodeDragEnd(e) {
  if (!this.mindMap.freeNode) {
    return
  }

  const draggedNode = this.beingDragNodeList[0]
  let { x, y } = this.mindMap.toPos(
    e.clientX - this.offsetX,
    e.clientY - this.offsetY
  )
  let { scaleX, scaleY, translateX, translateY } = this.drawTransform
  x = (x - translateX) / scaleX
  y = (y - translateY) / scaleY

  // 检查是否拖入树形结构（吸附）
  const targetNode = this.checkSnapToTree(draggedNode, { x, y })

  if (targetNode) {
    // 吸附回树形结构
    const freeNodeId = draggedNode._freedomNodeId
    this.mindMap.freeNode.attachToTree(freeNodeId, targetNode)

    // 触发事件
    this.mindMap.emit('freedom_node_attached', {
      freeNodeId: freeNodeId,
      targetNode: targetNode
    })
  } else {
    // 更新自由节点位置
    const deltaX = x - draggedNode.left
    const deltaY = y - draggedNode.top
    const freeNodeId = draggedNode._freedomNodeId
    if (freeNodeId) {
      this.mindMap.freeNode.moveFreeNode(freeNodeId, deltaX, deltaY)
    }
  }
}
```

**说明**:
- 计算拖拽结束位置
- 检查是否应该吸附到树形节点（调用 `checkSnapToTree`）
- 如果吸附，调用 FreedomNode 插件的 `attachToTree` 方法
- 如果不吸附，调用 FreedomNode 插件的 `moveFreeNode` 方法更新位置
- 触发相应事件

---

#### 3.5 `checkSnapToTree(draggedNode, mousePos)` (行 1397-1417)

**功能**: 检查自由节点是否应该吸附到树形节点

**代码**:
```javascript
checkSnapToTree(draggedNode, mousePos) {
  const snapDistance = this.mindMap.opt.snapToTreeDistance || 100

  // 遍历所有树形节点
  for (const node of this.nodeList) {
    if (node.getData('isFreedomNode')) continue

    const nodeRect = this.getNodeRect(node)
    const distance = Math.sqrt(
      Math.pow(nodeRect.originLeft - mousePos.x, 2) +
      Math.pow(nodeRect.originTop - mousePos.y, 2)
    )

    if (distance < snapDistance) {
      return node  // 返回目标节点
    }
  }

  return null
}
```

**说明**:
- 遍历所有树形节点（跳过自由节点）
- 计算距离每个节点的欧氏距离
- 如果距离小于吸附距离（`snapToTreeDistance`，默认 100px），返回目标节点
- 否则返回 null

---

#### 3.6 `onDblclick(e)` (行 1419-1448)

**功能**: 双击空白画布创建自由节点

**代码**:
```javascript
onDblclick(e) {
  if (this.mindMap.opt.readonly) {
    return
  }

  // 检查配置项
  const dblclickBlankCreateFreedom = this.mindMap.opt.dblclickBlankCreateFreedom
  if (!dblclickBlankCreateFreedom || !this.mindMap.freeNode) {
    return
  }

  // 检查是否点击在节点上
  const target = e.target
  if (target && target.closest('.smm-node')) {
    return  // 点击在节点上，不创建自由节点
  }

  // 计算点击位置
  let { x, y } = this.mindMap.toPos(e.clientX, e.clientY)
  const transform = this.mindMap.draw.transform()
  x = (x - transform.translateX) / transform.scaleX
  y = (y - transform.translateY) / transform.scaleY

  // 调用FreedomNode插件创建自由节点
  this.mindMap.freeNode.createFreeNode({
    position: { left: x, top: y },
    text: this.mindMap.opt.defaultFreedomNodeText || '自由节点'
  })
}
```

**说明**:
- 检查只读模式和配置项（`dblclickBlankCreateFreedom`）
- 检查 FreedomNode 插件是否安装
- 检查是否双击在节点上（如果是，不创建）
- 计算点击位置的画布坐标
- 调用 FreedomNode 插件的 `createFreeNode` 方法

---

## 依赖的配置项

以下配置项需要在 `mindMap.opt` 中定义：

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `dragToBlankConvertSafeDistance` | Number | - | 拖拽转换的安全距离（像素），超出此距离转为自由节点 |
| `snapToTreeDistance` | Number | 100 | 自由节点吸附回树的安全距离（像素） |
| `dblclickBlankCreateFreedom` | Boolean | false | 是否启用双击空白画布创建自由节点 |
| `defaultFreedomNodeText` | String | '自由节点' | 双击创建的自由节点默认文本 |
| `enableFreeDrag` | Boolean | false | 是否启用自由拖拽（原有配置项） |

---

## 触发的事件

| 事件名 | 触发时机 | 参数 |
|--------|---------|------|
| `node_converted_to_freedom` | 普通节点转换为自由节点时 | `{ node, position }` |
| `freedom_node_attached` | 自由节点吸附回树形结构时 | `{ freeNodeId, targetNode }` |

---

## 调用的 FreedomNode 插件 API

| 方法 | 参数 | 说明 |
|------|------|------|
| `convertToFreedom(node, position)` | `node`: 节点实例, `position`: `{left, top}` | 将节点转换为自由节点 |
| `attachToTree(freeNodeId, targetNode)` | `freeNodeId`: 自由节点ID, `targetNode`: 目标节点 | 将自由节点吸附回树 |
| `moveFreeNode(freeNodeId, deltaX, deltaY)` | `freeNodeId`: 自由节点ID, `deltaX/deltaY`: 位移量 | 移动自由节点 |
| `createFreeNode(options)` | `options`: `{ position, text, ... }` | 创建新自由节点 |

---

## 兼容性说明

### 向后兼容
- 所有修改都是**增量式**的，不影响现有功能
- 如果 FreedomNode 插件未安装，所有新增逻辑会自动跳过
- 如果配置项未启用（如 `dragToBlankConvertSafeDistance` 未设置），相关功能不会激活

### 最小侵入原则
- ✅ 不修改现有方法的核心逻辑
- ✅ 使用插件检测（`this.mindMap.freeNode`）确保安全
- ✅ 通过配置项控制功能启用
- ✅ 所有新增方法集中在类的末尾

---

## 测试建议

### 单元测试
1. 测试 `calculateDistanceFromTree()` 距离计算是否正确
2. 测试 `checkSnapToTree()` 吸附判断逻辑
3. 测试 `setCustomPosition()` 坐标转换准确性

### 集成测试
1. **拖拽转换场景**:
   - 拖拽节点超出安全距离 → 转为自由节点
   - 拖拽节点在安全距离内 → 设置自定义位置
   - 未安装 FreedomNode 插件 → 保持原有行为

2. **自由节点拖拽场景**:
   - 拖拽自由节点到树形节点附近 → 自动吸附
   - 拖拽自由节点到空白区域 → 更新位置

3. **双击创建场景**:
   - 双击空白画布 → 创建自由节点
   - 双击节点 → 不创建自由节点
   - 配置项禁用 → 不创建自由节点

### 边界条件测试
- 拖拽多个节点（`beingDragNodeList.length > 1`）
- 只读模式下的行为
- FreedomNode 插件未安装时的降级

---

## 性能考虑

### 优化点
1. **距离计算优化**: `calculateDistanceFromTree()` 和 `checkSnapToTree()` 遍历所有节点，可能影响性能
   - **建议**: 后续可引入空间索引（如 R-Tree）加速查询

2. **事件频率控制**: `checkOverlapNode()` 已使用节流（300ms），无需额外优化

### 性能影响评估
- **低风险**: 新增逻辑仅在拖拽结束时执行，不影响拖拽过程
- **可接受开销**: 距离计算复杂度 O(n)，n 为节点总数，对于 <1000 节点的场景可接受

---

## 后续改进方向

1. **空间索引**: 引入四叉树或 R-Tree 优化距离查询
2. **视觉反馈**: 在拖拽过程中显示"即将转换为自由节点"的提示
3. **吸附预览**: 在自由节点接近树形节点时显示吸附预览
4. **配置优化**: 支持更细粒度的吸附行为配置（如仅吸附为子节点、兄弟节点等）

---

## 版本信息

- **修改版本**: v1.0
- **基准版本**: simple-mind-map v0.14.0-fix.2
- **测试状态**: 待测试
- **文档状态**: 已完成

---

**修改人**: Claude Code (Interaction Integrator)
**审核人**: 待审核
**批准人**: 待批准
