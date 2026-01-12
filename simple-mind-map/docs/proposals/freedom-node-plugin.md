# 自由节点插件（FreedomNode Plugin）技术提案

## 文档信息
- **提案编号**: PROP-FREEDOM-NODE-2024
- **创建日期**: 2024-12-26
- **作者**: Claude Code + lixiaoming
- **状态**: 设计评审中
- **版本**: v1.0

## 执行摘要

本提案设计**自由节点（FreedomNode）插件**，通过插件化方式为 simple-mind-map 引入“可在画布任意位置创建、拖拽、编辑的独立节点树”能力。自由节点既可脱离主树独立存在，也可通过拖拽吸附重新融入树形结构，同时支持子节点、关联线、撤销重做等完整功能。

> ⚠️ **实现前提说明**  
> 插件方案必须建立在核心引擎已经支持 `freeNodes` 数据结构、渲染多棵树、扩展命令/事件的前提之上。换言之，需要先落实 `free-node.md` 中描述的核心改造与 Hook，再由本插件负责“功能组合 + UI 交互”。本文档重点描述插件层面的职责分解、Hook 调用方式与配置/测试策略。

**核心价值**:
- 🎯 **灵活布局**: 突破单一根节点限制，支持多棵思维导图共存
- 🔄 **无缝转换**: 普通节点↔自由节点互相转换，保留完整子树
- 🎨 **交互增强**: 拖拽吸附、双向关联、统一渲染
- 📦 **插件架构**: 不影响核心代码，可选安装，向后兼容

---

## 1. 背景与动机

### 1.1 现状分析

**当前架构限制**:
1. **单根树结构**: 所有节点必须挂在根节点下，无法创建独立思维导图
2. **customLeft/customTop 局限**: Drag 插件的 `enableFreeDrag` 只能微调节点位置，无法脱离树形结构
3. **布局算法依赖**: Layout 类始终遍历 `children`，无法处理多棵独立树

**用户需求**:
- 在同一画布上绘制多个独立的思维导图主题
- 临时记录灵感（便签式节点），稍后可拖入主树
- 创建辅助说明节点（不干扰主树结构）
- 将复杂主题的分支拆分为独立自由节点，减少视觉拥挤

### 1.2 已有提案对比

参考 `simple-mind-map/docs/proposals/free-node.md` 的设计，本提案采用**插件化实现**方案，核心差异：

| 方面 | 原提案（核心改造） | 本提案（插件方案） |
|------|--------------------|--------------------|
| **实现方式** | 直接修改 Render/Layout/View/Command | 基于核心暴露的 Hook 与 API 进行组合；若 Hook 不足，需要先合入核心改造 |
| **数据存储** | `renderTree.freeNodes`，内置在引擎 | 复用同一顶层字段，由插件负责读写与导出导入 |
| **渲染时机** | `_render` 中统一调度 | 调用核心暴露的 `beforeRender/afterRender` Hook 或 `renderFreeTrees` API |
| **拖拽逻辑** | Drag 插件内建自由节点逻辑 | 在 Drag 插件中注入扩展（通过事件/拦截器），必要时提交最小核心变更 |
| **兼容性** | 需要同步升级引擎 | 插件可选安装，但依赖核心版本 >= X.Y 才能启用自由节点特性 |

---

## 2. 目标与非目标

### 2.1 核心目标

✅ **功能目标**:
1. 支持在画布任意位置创建自由节点（包含子树）
2. 自由节点可拖拽移动，超出"安全距离"后脱离树形结构
3. 自由节点可拖回树形结构吸附为普通节点
4. 自由节点支持所有节点能力：编辑、样式、图标、图片、标签、备注等
5. 自由节点支持布局设置（与主树独立）
6. 自由节点支持关联线（与树形节点/其他自由节点双向连接）
7. 支持撤销/重做、复制/粘贴、导入/导出
8. 考虑协同编辑兼容性

✅ **技术目标**:
1. 通过新增 Hook / 事件将核心能力抽象出来，在可控范围内扩展核心，其余逻辑由插件实现
2. 数据模型向后兼容，旧版本在无法识别 `freeNodes` 时自动降级
3. 性能优化策略明确（后续实施），并记录核心 Hook 对性能的影响

### 2.2 非目标

❌ **不在本期范围**:
- 自由节点的特殊视觉样式（用户明确不需要）
- XMind、Markdown 等外部格式支持（仅保证 JSON 格式）
- 协同冲突解决策略细节（标记为需考虑，但不在首版实现）
- 性能极限优化（100+ 自由节点场景留待后续）
- UI 控件实现（工具栏、右键菜单等由 web 层补充）

---

### 2.3 实施约束

- **核心最低版本**：FreedomNode 插件依赖 `simple-mind-map` ≥ *TBD*（支持 `freeNodes`、多树渲染 Hook、命令扩展事件）。若无法升级到该版本，则插件自动禁用。
- **Hook 清单**：需要在核心暴露（或计划新增）以下扩展点：`beforeRender`/`afterRender`、`getAllNodes`、`historySnapshotTransformer`、`drag.beforeEnd`、`view.getAllBoundingRects` 等。文档中默认这些 Hook 已存在，若缺失需先提核心改造。
- **最小侵入原则**：除 Hook 注册外，插件不直接修改 `src/core` / `src/layouts` 文件；若必须修改，需要在提案尾部列出“所需核心改动清单”，并单独评审。

---

## 3. 术语定义

| 术语 | 定义 |
|------|------|
| **主树** | 当前布局下的根节点及其子树 |
| **自由节点 (Freedom Node)** | 不挂在主树上的独立根节点，拥有独立画布锚点 |
| **自由树 (Freedom Tree)** | 以自由节点为根的子树，内部使用既有布局算法 |
| **锚点 (Anchor)** | 自由树整体在画布上的绝对坐标 `{left, top}` |
| **安全距离 (Safe Distance)** | 拖拽时判断是否脱离树形结构的阈值（像素） |
| **吸附 (Snap/Attach)** | 自由节点拖拽到其他节点附近时自动转为其子节点 |

---

## 4. 数据模型设计

### 4.1 Schema 定义

#### 方案：选项 B + 插件处理

```javascript
// 核心数据结构（与原提案一致）
{
  "root": {
    "data": { "text": "主根节点", "uid": "root-xxx" },
    "children": [/* 主树子节点 */]
  },

  // 新增顶层字段：自由节点列表
  "freeNodes": [
    {
      "id": "fn_001",  // 自由节点唯一标识
      "position": { "left": 1200, "top": 360 },  // 画布绝对坐标
      "layout": "logicalStructure",  // 自由树的布局模式（可与主树不同）
      "root": {  // 自由树的根节点数据（格式同普通节点）
        "data": {
          "text": "自由节点1",
          "uid": "free-root-xxx",
          "isFreedomNode": true  // 插件添加的标识
        },
        "children": [/* 自由树的子节点 */]
      }
    }
  ]
}
```

**字段说明**:
- `freeNodes`: 可选字段，不存在时保持向后兼容
- `id`: 自由节点 ID，用于协同编辑时的稳定索引
- `position`: 自由树锚点，所有节点坐标相对此偏移
- `layout`: 自由树的布局类型，支持所有现有布局
- `root`: 标准节点数据，初始化时调用 `createUidForAppointNodes` 生成 `uid`

> 注：数据结构与 `free-node.md` 完全一致，本插件只是在该结构之上增加管理/导出/交互逻辑；因此在实现前必须确保核心已经接收该 Schema 及其校验。

### 4.2 数据处理流程

#### 4.2.1 初始化 (Load)

```javascript
// 扩展 MindMap.handleData (index.js:191-208)
handleData(data) {
  // 处理主树（现有逻辑）
  const processedRoot = this.processRootTree(data.root || data)

  // 处理自由节点（插件负责）
  const processedFreeNodes = this.processFreeNodes(data.freeNodes || [])

  return {
    root: processedRoot,
    freeNodes: processedFreeNodes
  }
}

processFreeNodes(freeNodes) {
  return freeNodes.map(freeNode => {
    // 深拷贝并生成 uid
    const cloned = simpleDeepClone(freeNode)
    createUidForAppointNodes([cloned.root], false, null, true)
    return cloned
  })
}
```

#### 4.2.2 保存/导出 (Save/Export)

```javascript
// 扩展 Command.getCopyData
getCopyData() {
  const mainTreeData = this.copyRenderTree(this.mindMap.renderer.renderTree)

  // 插件提供的导出方法
  const freeNodesData = this.mindMap.freeNode
    ? this.mindMap.freeNode.exportFreeNodes()
    : []

  return {
    root: mainTreeData,
    freeNodes: freeNodesData
  }
}
```

#### 4.2.3 撤销/重做 (Undo/Redo)

命令系统需记录 `freeNodes` 的变化：

```javascript
// Command.addHistory 扩展
addHistory() {
  const snapshot = {
    root: copyRenderTree(this.renderer.renderTree),
    freeNodes: this.mindMap.freeNode ? this.mindMap.freeNode.exportFreeNodes() : []
  }
  this.history.push(snapshot)
}
```

---

## 5. 插件架构设计

### 5.1 插件类结构

```javascript
// simple-mind-map/src/plugins/FreedomNode.js
class FreedomNode {
  static pluginName = 'freeNode'  // 挂载到 mindMap.freeNode

  constructor({ mindMap }) {
    this.mindMap = mindMap

    // 自由节点数据管理
    this.freeNodeMap = new Map()  // id -> { position, layout, root, nodeInstance }
    this.freeRootList = []  // 渲染后的 MindMapNode 实例列表

    // 配置项
    this.options = {
      enableFreedomNode: true,  // 是否启用功能
      safeDistance: 100,  // 拖拽安全距离（像素）
      dblclickBlankCreateFreedom: true,  // 双击空白创建自由节点
      dragToBlankConvertSafeDistance: 150,  // 拖拽转换的安全距离
      enableFreedomNodeDrag: true,  // 是否允许自由节点拖拽
      ...mindMap.opt.freedomNodeConfig
    }

    this.bindEvent()
    this.registerCommands()
  }

  // === 核心 API ===

  // 创建自由节点
  createFreeNode(options) { /* ... */ }

  // 节点转自由节点
  convertToFreedom(node) { /* ... */ }

  // 自由节点吸附回树形结构
  attachToTree(freeNode, targetParent, index) { /* ... */ }

  // 移动自由节点
  moveFreeNode(freeNodeId, deltaX, deltaY) { /* ... */ }

  // 删除自由节点
  removeFreeNode(freeNodeId) { /* ... */ }

  // 导出自由节点数据
  exportFreeNodes() { /* ... */ }

  // 渲染所有自由节点
  renderAllFreeNodes() { /* ... */ }
}

export default FreedomNode
```

### 5.2 插件注册与生命周期

```javascript
// 使用方式
import MindMap from 'simple-mind-map'
import FreedomNode from 'simple-mind-map/src/plugins/FreedomNode'

MindMap.usePlugin(FreedomNode)

const mindMap = new MindMap({
  el: document.getElementById('container'),
  freedomNodeConfig: {
    safeDistance: 120,
    dblclickBlankCreateFreedom: true
  }
})

// 调用 API
mindMap.freeNode.createFreeNode({
  position: { left: 500, top: 300 },
  text: '独立主题',
  layout: 'mindMap'
})
```

---

## 6. 渲染与布局实现

### 6.1 渲染流程改造（选项 B: 统一渲染）

#### 扩展 Render._render

```javascript
// simple-mind-map/src/core/render/Render.js
_render() {
  // 1. 渲染主树（现有流程）
  this.layout.doLayout(root => {
    this.root = root

    // 2. 如果安装了 FreedomNode 插件，渲染自由节点
    if (this.mindMap.freeNode) {
      this.mindMap.freeNode.renderAllFreeNodes()
    }

    // 3. 主树渲染
    this.root.render(() => {
      // 4. 自由节点渲染完成后的回调
      if (this.mindMap.freeNode) {
        this.mindMap.freeNode.onRenderComplete()
      }
      this.onRenderEnd()
    })
  })
}
```

#### 自由节点渲染逻辑

```javascript
// FreedomNode.renderAllFreeNodes
renderAllFreeNodes() {
  const freeNodesData = this.mindMap.renderer.renderTree.freeNodes || []

  this.freeRootList = freeNodesData.map(freeNodeData => {
    // 使用 Layout 计算自由树布局
    const layout = this.getLayoutInstance(freeNodeData.layout)

    // 布局计算（不设置根节点居中）
    layout.doLayout(root => {
      // 应用锚点偏移
      this.applyAnchorOffset(root, freeNodeData.position)

      // 标记为自由节点
      this.markAsFreedomNode(root, freeNodeData.id)

      return root
    }, { isFreeTree: true })  // 标记为自由树

    return layout.root
  })
}

// 应用锚点偏移
applyAnchorOffset(node, position) {
  walk(node, null, (n) => {
    n.left += position.left
    n.top += position.top
  })
}
```

### 6.2 布局算法复用

#### 扩展 Layout.doLayout

```javascript
// simple-mind-map/src/layouts/Base.js
doLayout(callback, options = {}) {
  const { isFreeTree = false } = options

  // 自由树不设置根节点居中
  if (!isFreeTree) {
    this.setNodeCenter(this.root)
  } else {
    // 自由树根节点从 (0, 0) 开始
    this.root.left = 0
    this.root.top = 0
  }

  // 其余布局计算复用现有逻辑
  this.computedBaseValue()
  this.computedTopValue()
  this.adjustTopValue()

  callback(this.root)
}
```

### 6.3 子节点布局策略

**方案**: 自由节点的子节点使用与主树相同的布局算法

```javascript
// 自由节点创建时指定布局
mindMap.freeNode.createFreeNode({
  position: { left: 500, top: 300 },
  text: '自由主题',
  layout: 'mindMap',  // 可选：logicalStructure、catalogOrganization 等
  children: [
    { data: { text: '子节点1' } },
    { data: { text: '子节点2' } }
  ]
})
```

**布局特点**:
- 自由节点的 `layout` 可与主树不同
- 子节点布局完全复用现有算法（LogicalStructure、MindMap 等）
- 坐标计算相对自由节点根位置，最后整体应用锚点偏移

---

## 7. 拖拽交互设计（方案 A: 扩展 Drag 插件）

### 7.1 拖拽逻辑扩展

#### 安全距离判断

```javascript
// simple-mind-map/src/plugins/Drag.js 扩展
onMouseup(e) {
  const { enableFreeDrag, dragToBlankConvertSafeDistance } = this.mindMap.opt

  // 检查是否为自由节点拖拽
  if (this.mousedownNode.isFreedomNode) {
    // 自由节点拖拽逻辑
    this.handleFreeNodeDragEnd(e)
    return
  }

  // 普通节点拖拽逻辑
  if (this.overlapNode) {
    // 吸附到其他节点
    this.mindMap.execCommand('MOVE_NODE_TO', this.beingDragNodeList, this.overlapNode)
  } else if (this.prevNode || this.nextNode) {
    // 移动到兄弟节点位置
    // ... 现有逻辑
  } else if (this.calculateDistanceFromTree() > dragToBlankConvertSafeDistance) {
    // 超出安全距离，转为自由节点
    this.convertToFreedomNode(e)
  } else if (enableFreeDrag) {
    // 在安全距离内，设置 customLeft/customTop（现有逻辑）
    // ...
  }
}

// 计算节点距离树形结构的距离
calculateDistanceFromTree() {
  const draggedNode = this.beingDragNodeList[0]
  const { x, y } = this.mindMap.toPos(
    this.mouseMoveX - this.offsetX,
    this.mouseMoveY - this.offsetY
  )

  // 计算与最近节点的距离
  let minDistance = Infinity
  this.nodeList.forEach(node => {
    const distance = Math.sqrt(
      Math.pow(node.left - x, 2) + Math.pow(node.top - y, 2)
    )
    if (distance < minDistance) {
      minDistance = distance
    }
  })

  return minDistance
}

// 转为自由节点
convertToFreedomNode(e) {
  if (!this.mindMap.freeNode) return

  const node = this.beingDragNodeList[0]
  const { x, y } = this.mindMap.toPos(
    e.clientX - this.offsetX,
    e.clientY - this.offsetY
  )

  // 调用插件方法
  this.mindMap.freeNode.convertToFreedom(node, { left: x, top: y })
}
```

#### 自由节点拖拽处理

```javascript
// FreedomNode.handleFreeNodeDrag
handleFreeNodeDragEnd(draggedNode, mousePos) {
  const freeNodeId = draggedNode._freedomNodeId

  // 检查是否拖入树形结构（吸附）
  const targetNode = this.checkSnapToTree(draggedNode, mousePos)

  if (targetNode) {
    // 吸附回树形结构
    this.attachToTree(freeNodeId, targetNode)
  } else {
    // 更新自由节点位置
    const deltaX = mousePos.x - draggedNode.left
    const deltaY = mousePos.y - draggedNode.top
    this.moveFreeNode(freeNodeId, deltaX, deltaY)
  }
}

// 检查是否应该吸附到树形节点
checkSnapToTree(draggedNode, mousePos) {
  const safeDistance = this.options.safeDistance

  // 遍历所有树形节点
  for (const node of this.mindMap.renderer.nodeList) {
    if (node.isFreedomNode) continue

    const distance = this.calculateDistance(draggedNode, node)
    if (distance < safeDistance) {
      return node  // 返回目标节点
    }
  }

  return null
}
```

### 7.2 拖拽转换规则

| 场景 | 起始状态 | 拖拽距离 | 终止状态 | 行为 |
|------|---------|---------|---------|------|
| 1 | 普通节点 | < 安全距离 | 普通节点 | 设置 `customLeft/customTop` |
| 2 | 普通节点 | > 安全距离 | 自由节点 | 从父节点移除，创建自由节点 |
| 3 | 自由节点 | 拖入节点范围 | 普通节点 | 吸附为目标节点子节点 |
| 4 | 自由节点 | 空白区域 | 自由节点 | 更新锚点坐标 |

**拖拽转换子节点处理**:
```javascript
// 支持“连带后续兄弟节点”模式：将当前节点及其之后的兄弟节点一起迁移为自由节点
convertToFreedom(node, position) {
  // 1. 获取节点及其所有子节点
  const nodeData = this.getNodeWithChildren(node)

  // 2. 从父节点移除（包括兄弟节点之后的所有节点）
  const parent = node.parent
  const nodeIndex = parent.children.indexOf(node)
  const removedNodes = parent.children.splice(nodeIndex)  // 移除当前及之后的所有节点

  // 3. 创建自由节点
  this.createFreeNode({
    position,
    layout: node.getData('layout') || this.mindMap.opt.layout,
    root: nodeData,
    includedNodes: removedNodes  // 一起迁移的节点
  })

  // 4. 触发渲染
  this.mindMap.render()
}
```

---

## 8. 关联线集成

### 8.1 查找机制扩展

```javascript
// Render.findNodeByUid 扩展
findNodeByUid(uid) {
  // 1. 在主树中查找（现有逻辑）
  let node = this.findInTree(this.root, uid)
  if (node) return node

  // 2. 在自由节点中查找
  if (this.mindMap.freeNode) {
    node = this.mindMap.freeNode.findNodeByUid(uid)
  }

  return node
}

// FreedomNode.findNodeByUid
findNodeByUid(uid) {
  for (const freeRoot of this.freeRootList) {
    const node = this.findInTree(freeRoot, uid)
    if (node) return node
  }
  return null
}
```

### 8.2 关联线坐标计算

```javascript
// AssociativeLine 插件需感知自由节点
// simple-mind-map/src/plugins/AssociativeLine.js

updateAllLinesPos(node, toNode, associativeLinePoint) {
  // 计算起点和终点
  let [startPoint, endPoint] = computeNodePoints(node, toNode)

  // 如果是自由节点，需要考虑锚点偏移
  if (node.isFreedomNode || toNode.isFreedomNode) {
    startPoint = this.adjustForFreedomNode(startPoint, node)
    endPoint = this.adjustForFreedomNode(endPoint, toNode)
  }

  // 其余逻辑不变
  // ...
}
```

### 8.3 关联线支持矩阵

| 连接类型 | 起点 | 终点 | 支持 | 说明 |
|---------|------|------|------|------|
| 树形→树形 | 普通节点 | 普通节点 | ✅ | 现有功能 |
| 树形→自由 | 普通节点 | 自由节点 | ✅ | 通过 uid 查找 |
| 自由→树形 | 自由节点 | 普通节点 | ✅ | 双向关联 |
| 自由→自由 | 自由节点 | 自由节点 | ✅ | 完全支持 |

**数据结构**:
```javascript
// 节点数据中存储关联线目标
{
  data: {
    uid: "node-001",
    associativeLineTargets: [
      "free-node-002",  // 可以是自由节点的 uid
      "normal-node-003"
    ]
  }
}
```

---

## 9. 命令系统集成

### 9.1 新增命令

```javascript
// Render.registerCommands 中注册
registerCommands() {
  // 现有命令...

  // 自由节点命令
  if (this.mindMap.freeNode) {
    this.mindMap.command.add('CREATE_FREEDOM_NODE', this.mindMap.freeNode.createFreeNode.bind(this.mindMap.freeNode))
    this.mindMap.command.add('CONVERT_TO_FREEDOM', this.mindMap.freeNode.convertToFreedom.bind(this.mindMap.freeNode))
    this.mindMap.command.add('ATTACH_FREEDOM_NODE', this.mindMap.freeNode.attachToTree.bind(this.mindMap.freeNode))
    this.mindMap.command.add('MOVE_FREEDOM_NODE', this.mindMap.freeNode.moveFreeNode.bind(this.mindMap.freeNode))
    this.mindMap.command.add('REMOVE_FREEDOM_NODE', this.mindMap.freeNode.removeFreeNode.bind(this.mindMap.freeNode))
  }
}
```

### 9.2 命令参数定义

```javascript
// CREATE_FREEDOM_NODE
mindMap.execCommand('CREATE_FREEDOM_NODE', {
  position: { left: 500, top: 300 },  // 必需
  text: '自由主题',  // 可选，默认 "自由节点"
  layout: 'mindMap',  // 可选，默认使用主树布局
  data: { /* 节点数据覆盖 */ },  // 可选
  children: []  // 可选
})

// CONVERT_TO_FREEDOM
mindMap.execCommand('CONVERT_TO_FREEDOM', node, position)

// ATTACH_FREEDOM_NODE
mindMap.execCommand('ATTACH_FREEDOM_NODE', freeNodeId, targetNode, index)

// MOVE_FREEDOM_NODE
mindMap.execCommand('MOVE_FREEDOM_NODE', freeNodeId, deltaX, deltaY)

// REMOVE_FREEDOM_NODE
mindMap.execCommand('REMOVE_FREEDOM_NODE', freeNodeId)
```

### 9.3 撤销/重做支持

```javascript
// Command.addHistory 扩展
addHistory() {
  const snapshot = {
    root: copyRenderTree(this.renderer.renderTree),
    freeNodes: this.mindMap.freeNode ? this.mindMap.freeNode.exportFreeNodes() : []
  }

  // 检查是否有变化
  const lastSnapshot = this.history[this.historyIndex]
  if (this.isSnapshotEqual(lastSnapshot, snapshot)) return

  // 记录历史
  this.history.splice(this.historyIndex + 1)
  this.history.push(snapshot)
  this.historyIndex++
}

// 恢复历史
restoreSnapshot(snapshot) {
  // 恢复主树
  this.renderer.setData(snapshot.root)

  // 恢复自由节点
  if (this.mindMap.freeNode && snapshot.freeNodes) {
    this.mindMap.freeNode.importFreeNodes(snapshot.freeNodes)
  }

  this.mindMap.render()
}
```

---

## 10. 配置选项设计

### 10.1 实例化配置

```javascript
// simple-mind-map/src/constants/defaultOptions.js 新增

export const defaultOpt = {
  // ... 现有配置

  // ========== 自由节点配置 ==========

  // 是否启用自由节点功能（需安装 FreedomNode 插件）
  enableFreedomNode: true,

  // 自由节点详细配置
  freedomNodeConfig: {
    // 拖拽转换的安全距离（像素）
    // 节点拖拽超过此距离会转为自由节点
    dragToBlankConvertSafeDistance: 150,

    // 自由节点吸附回树的安全距离（像素）
    // 自由节点拖拽到节点范围此距离内会吸附
    snapToTreeDistance: 100,

    // 双击空白画布创建自由节点
    dblclickBlankCreateFreedom: true,

    // 左键双击画布的行为
    // 'freedom': 创建自由节点
    // 'backToRoot': 返回根节点（现有行为）
    // false: 禁用双击
    dblclickCanvasAction: 'freedom',  // 左键双击画布时的行为

    // 右键双击画布返回根节点
    rightDblclickBackToRoot: true,

    // 自由节点默认文本
    defaultFreedomNodeText: '自由节点',

    // 自由节点默认布局（null 表示使用主树布局）
    defaultFreedomNodeLayout: null,

    // 是否允许自由节点拖拽
    enableFreedomNodeDrag: true,

    // 拖拽转换时子节点处理方式
    // 'includeFollowing': 包含当前及之后的所有兄弟节点
    // 'currentOnly': 仅当前节点及其子树
    convertToFreedomIncludeMode: 'includeFollowing',

    // 自由节点可以通过右键菜单创建
    enableContextMenuCreateFreedom: true,

    // 是否在导出时包含自由节点
    exportIncludeFreedomNodes: true
  },

  // 覆盖原有配置：左键双击交互由自由节点占用，回到根节点改为右键双击
  enableDblclickBackToRootNode: false,  // 禁用原功能
  enableRightDblclickBackToRootNode: true  // 启用右键双击
}
```

### 10.2 运行时配置更新

```javascript
// 动态更新配置
mindMap.updateConfig({
  freedomNodeConfig: {
    dragToBlankConvertSafeDistance: 200  // 增大安全距离
  }
})
```

---

## 11. 事件系统

### 11.1 新增事件

```javascript
// FreedomNode 插件触发的事件

// 自由节点创建完成
mindMap.on('freedom_node_created', (freeNode) => {
  console.log('创建自由节点:', freeNode.id, freeNode.position)
})

// 节点转为自由节点
mindMap.on('node_converted_to_freedom', (node, freeNodeId) => {
  console.log('节点转为自由节点:', node.getData('uid'), freeNodeId)
})

// 自由节点吸附回树
mindMap.on('freedom_node_attached', (freeNodeId, targetNode) => {
  console.log('自由节点吸附:', freeNodeId, targetNode.getData('uid'))
})

// 自由节点移动
mindMap.on('freedom_node_moved', (freeNodeId, newPosition) => {
  console.log('自由节点移动:', freeNodeId, newPosition)
})

// 自由节点删除
mindMap.on('freedom_node_removed', (freeNodeId) => {
  console.log('自由节点删除:', freeNodeId)
})

// 自由节点数据变化（统一事件）
mindMap.on('freedom_node_change', ({ type, data }) => {
  console.log('自由节点变化:', type, data)
  // type: 'created' | 'converted' | 'attached' | 'moved' | 'removed'
})
```

### 11.2 现有事件扩展

```javascript
// data_change 事件需包含自由节点变化
mindMap.on('data_change', (data) => {
  console.log('主树数据:', data.root)
  console.log('自由节点数据:', data.freeNodes)
})

// node_tree_render_end 在自由节点渲染后触发
mindMap.on('node_tree_render_end', () => {
  console.log('主树和自由节点渲染完成')
})
```

---

## 12. 导入/导出功能

### 12.1 JSON 导出（支持单独导出自由节点）

```javascript
// 完整数据导出
const fullData = mindMap.getData()
// 返回格式：
{
  root: { /* 主树数据 */ },
  freeNodes: [ /* 自由节点数据 */ ]
}

// 仅导出自由节点
const freeNodesData = mindMap.freeNode.exportFreeNodes()
// 返回格式：
[
  { id: 'fn_001', position: {...}, layout: '...', root: {...} }
]

// 导出单个自由节点
const singleFreeNode = mindMap.freeNode.exportFreeNode('fn_001')
```

### 12.2 JSON 导入

```javascript
// 完整导入（包含主树和自由节点）
mindMap.setData({
  root: mainTreeData,
  freeNodes: freeNodesData
})

// 仅导入自由节点（追加）
mindMap.freeNode.importFreeNodes(freeNodesData, { mode: 'append' })

// 仅导入自由节点（替换）
mindMap.freeNode.importFreeNodes(freeNodesData, { mode: 'replace' })
```

### 12.3 图片/SVG/PDF 导出

```javascript
// Export 插件自动包含自由节点
// 无需特殊处理，因为自由节点已渲染到画布

// 如果需要排除自由节点
mindMap.updateConfig({
  freedomNodeConfig: {
    exportIncludeFreedomNodes: false
  }
})

mindMap.export('png', true, '思维导图')
```

### 12.4 兼容性处理

```javascript
// 旧版本数据（无 freeNodes）
const oldData = {
  data: { text: '根节点' },
  children: [...]
}

// 自动转换为新格式
mindMap.setData(oldData)
// 内部处理：
// {
//   root: oldData,
//   freeNodes: []
// }

// 新版本数据导入旧版本
// 旧版本会忽略 freeNodes 字段，只加载 root
```

---

## 13. 其他插件兼容性

### 13.1 Select 插件

```javascript
// simple-mind-map/src/plugins/Select.js
checkInNodes(nodes) {
  const inNodes = []

  // 1. 检查主树节点
  walk(this.mindMap.renderer.root, null, (node) => {
    if (this.checkNodeInRect(node)) {
      inNodes.push(node)
    }
  })

  // 2. 检查自由节点
  if (this.mindMap.freeNode) {
    this.mindMap.freeNode.freeRootList.forEach(freeRoot => {
      walk(freeRoot, null, (node) => {
        if (this.checkNodeInRect(node)) {
          inNodes.push(node)
        }
      })
    })
  }

  return inNodes
}
```

### 13.2 Search 插件

```javascript
// Render.goTargetNode 扩展
goTargetNode(uid, callback) {
  // 1. 在主树中查找
  let targetNode = this.findNodeByUid(uid)

  // 2. 在自由节点中查找
  if (!targetNode && this.mindMap.freeNode) {
    targetNode = this.mindMap.freeNode.findNodeByUid(uid)
  }

  if (targetNode) {
    targetNode.active()
    this.moveNodeToCenter(targetNode)
    callback(targetNode)
  }
}
```

### 13.3 View.fit() 扩展

```javascript
// simple-mind-map/src/core/view/View.js
fit(paddingX = 50, paddingY = 50) {
  // 计算主树包围盒
  const mainTreeRect = getNodeTreeBoundingRect(this.mindMap.renderer.root)

  // 计算自由节点包围盒
  let freeNodesRect = null
  if (this.mindMap.freeNode && this.mindMap.freeNode.freeRootList.length > 0) {
    freeNodesRect = this.mindMap.freeNode.getFreeNodesBoundingRect()
  }

  // 合并包围盒
  const combinedRect = this.combineBoundingRects(mainTreeRect, freeNodesRect)

  // 应用缩放和位移
  this.fitRect(combinedRect, paddingX, paddingY)
}
```

### 13.4 MiniMap 插件

```javascript
// MiniMap 需要渲染自由节点
renderMap() {
  // 渲染主树
  this.renderMainTree()

  // 渲染自由节点
  if (this.mindMap.freeNode) {
    this.mindMap.freeNode.freeRootList.forEach(freeRoot => {
      this.renderNode(freeRoot)
    })
  }
}
```

---

## 14. 协同编辑考虑

### 14.1 数据冲突场景

| 场景 | 冲突类型 | 处理策略 |
|------|---------|---------|
| 同时创建自由节点 | ID 冲突 | 使用 UUID 生成唯一 ID |
| 同时移动自由节点 | 位置冲突 | 后操作覆盖 + 冲突提示 |
| 同时吸附同一自由节点 | 父节点冲突 | 先到先得 + 操作失败提示 |
| 删除自由节点 vs 编辑 | 存在性冲突 | 删除优先 + 自动撤销编辑 |

### 14.2 Yjs 集成建议

```javascript
// freeNodes 使用 Y.Array 存储
const ydoc = new Y.Doc()
const yFreeNodes = ydoc.getArray('freeNodes')

// 创建自由节点
yFreeNodes.push([{
  id: createUid(),
  position: { left: 500, top: 300 },
  layout: 'mindMap',
  root: { /* ... */ }
}])

// 移动自由节点（使用 observe 监听）
yFreeNodes.observe(event => {
  event.changes.added.forEach(item => {
    // 渲染新增的自由节点
  })
  event.changes.deleted.forEach(item => {
    // 删除自由节点
  })
})
```

### 14.3 首版实现范围

✅ **首版支持**:
- 数据结构支持协同（使用稳定的 `id` 字段）
- 基础冲突检测和提示

❌ **后续迭代**:
- 完整的 Yjs 集成
- 操作锁机制（防止同时编辑）
- 冲突自动解决策略

---

## 15. 性能优化策略

### 15.1 首版实现

✅ **基本性能保证**:
- 复用现有布局算法，避免重复计算
- 自由节点使用独立 `nodeCache`，减少遍历开销
- 事件监听优化（节流/防抖）

### 15.2 后续优化方向

#### 大量自由节点场景 (100+)

**优化 1: 虚拟滚动**
```javascript
// 只渲染可视区域内的自由节点
renderVisibleFreeNodes() {
  const viewport = this.getViewport()

  this.freeNodeMap.forEach((freeNode, id) => {
    if (this.isInViewport(freeNode.position, viewport)) {
      this.renderFreeNode(freeNode)
    } else {
      this.hideFreeNode(id)
    }
  })
}
```

**优化 2: 空间索引（四叉树）**
```javascript
// 使用四叉树加速碰撞检测
class QuadTree {
  insert(freeNode) { /* ... */ }
  query(rect) { /* ... */ }  // 快速查找范围内的节点
}

// 拖拽时只检测附近的节点
checkSnapToTree(draggedNode) {
  const nearbyNodes = this.quadTree.query(draggedNode.getBoundingRect())
  // 只对附近节点进行距离计算
}
```

**优化 3: 布局缓存**
```javascript
// 缓存自由节点的布局结果
layoutFreeNode(freeNode) {
  const cacheKey = `${freeNode.id}_${freeNode.layout}_${freeNode.childrenHash}`

  if (this.layoutCache.has(cacheKey)) {
    return this.layoutCache.get(cacheKey)
  }

  const layout = this.calculateLayout(freeNode)
  this.layoutCache.set(cacheKey, layout)
  return layout
}
```

---

## 16. 测试计划

### 16.1 单元测试

```javascript
describe('FreedomNode Plugin', () => {
  test('创建自由节点', () => {
    const freeNode = mindMap.freeNode.createFreeNode({
      position: { left: 500, top: 300 },
      text: '测试节点'
    })
    expect(freeNode.id).toBeDefined()
    expect(freeNode.position).toEqual({ left: 500, top: 300 })
  })

  test('节点转自由节点', () => {
    const node = mindMap.renderer.root.children[0]
    const freeNodeId = mindMap.freeNode.convertToFreedom(node, { left: 100, top: 100 })
    expect(node.parent.children).not.toContain(node)
    expect(mindMap.freeNode.freeNodeMap.has(freeNodeId)).toBe(true)
  })

  test('自由节点吸附回树', () => {
    const freeNodeId = 'fn_001'
    const targetNode = mindMap.renderer.root
    mindMap.freeNode.attachToTree(freeNodeId, targetNode)
    expect(targetNode.children.some(child => child.getData('uid') === 'free-root-xxx')).toBe(true)
    expect(mindMap.freeNode.freeNodeMap.has(freeNodeId)).toBe(false)
  })

  test('导出/导入自由节点', () => {
    const exported = mindMap.freeNode.exportFreeNodes()
    mindMap.freeNode.clear()
    mindMap.freeNode.importFreeNodes(exported)
    expect(mindMap.freeNode.freeNodeMap.size).toBe(exported.length)
  })

  test('撤销/重做支持', () => {
    mindMap.freeNode.createFreeNode({ position: { left: 0, top: 0 }, text: '测试' })
    const beforeCount = mindMap.freeNode.freeNodeMap.size
    mindMap.command.back()
    expect(mindMap.freeNode.freeNodeMap.size).toBe(beforeCount - 1)
    mindMap.command.forward()
    expect(mindMap.freeNode.freeNodeMap.size).toBe(beforeCount)
  })
})
```

### 16.2 集成测试

| 测试项 | 步骤 | 预期结果 |
|-------|------|---------|
| 拖拽转换 | 拖拽节点超出安全距离 | 节点转为自由节点 |
| 拖拽吸附 | 自由节点拖入树形区域 | 自动吸附为子节点 |
| 关联线 | 树形节点连接自由节点 | 关联线正确绘制 |
| 框选 | 框选包含自由节点 | 自由节点被选中 |
| 搜索定位 | 搜索自由节点 | 视图定位到自由节点 |
| view.fit() | 调用 fit | 视图包含主树和自由节点 |
| 导出 PNG | 导出包含自由节点的思维导图 | 图片包含所有节点 |
| 数据持久化 | 保存→刷新→加载 | 自由节点恢复 |

### 16.3 性能测试

| 场景 | 指标 | 目标 |
|------|------|------|
| 创建 50 个自由节点 | 渲染时间 | < 1s |
| 拖拽自由节点 | 帧率 | ≥ 30 FPS |
| 导出包含 100 个自由节点 | 导出时间 | < 3s |
| 撤销/重做 | 响应时间 | < 100ms |

---

## 17. 实施计划

### 阶段 1: 核心功能（2 周）

**Week 1: 数据层和渲染**
- [ ] 数据模型设计和初始化逻辑
- [ ] 扩展 Render._render 支持自由节点渲染
- [ ] 布局算法复用（Layout.doLayout 扩展）
- [ ] 基础命令实现（CREATE/REMOVE）

**Week 2: 拖拽交互**
- [ ] 扩展 Drag 插件（安全距离判断）
- [ ] 拖拽转换逻辑（CONVERT_TO_FREEDOM）
- [ ] 拖拽吸附逻辑（ATTACH_FREEDOM_NODE）
- [ ] 移动自由节点（MOVE_FREEDOM_NODE）

### 阶段 2: 插件集成（1 周）

**Week 3: 其他插件兼容**
- [ ] Select 插件扩展（框选自由节点）
- [ ] Search/goTargetNode 扩展
- [ ] View.fit() 扩展
- [ ] AssociativeLine 集成（关联线支持）
- [ ] MiniMap/Export 验证

### 阶段 3: 完善和测试（1 周）

**Week 4: 测试和优化**
- [ ] 单元测试编写
- [ ] 集成测试和回归测试
- [ ] 性能测试和优化
- [ ] 文档编写（API 文档、使用示例）

### 阶段 4: Web 层集成（后续）

**由 web/ 团队负责**:
- [ ] 工具栏按钮（创建自由节点）
- [ ] 右键菜单项（节点转自由节点）
- [ ] 快捷键绑定（Ctrl+Shift+F）
- [ ] 用户引导和提示

---

## 18. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 拖拽逻辑复杂，冲突难以调试 | 高 | 中 | 详细的状态机设计，充分的单元测试 |
| 性能问题（大量自由节点） | 中 | 低 | 分阶段实现，首版限制数量，后续优化 |
| 协同编辑冲突 | 中 | 中 | 首版标记需考虑，留出扩展空间 |
| 导入导出兼容性 | 低 | 低 | 严格的版本检查和降级处理 |
| 插件之间干扰 | 中 | 低 | 充分的集成测试，明确插件职责边界 |

---

### 18.1 所需核心改动清单

为了保证插件可以“最小侵入”地交付，需要在核心提前提供以下能力（大部分内容可复用 `free-node.md` 的实现）：

1. **数据 Hook**：`MindMap.handleData` / `Command.getCopyData` / `Command.addHistory` 支持注册外部 transformer，使插件可以在不改源码的情况下读写 `freeNodes`。
2. **渲染 Hook**：`Render` 提供 `beforeRender`、`afterRender`、`registerExtraTree(renderer => ...)` 等接口，让插件有机会参与渲染和 `nodeCache` 管理。
3. **布局入口**：`layouts/Base` 暴露 `layoutTree(treeData, { isFreeTree })` 供插件复用；或者提供 `MindMap.createNodeTreeFromData`。
4. **拖拽扩展点**：`Drag` 插件对外暴露 `beforeStart`, `beforeEnd`, `onMoveExtend` 等事件，插件可在这些事件里接管自由节点拖拽。
5. **视图/工具扩展**：`View.fit`、`Select`、`AssociativeLine` 等插件暴露查询/绘制 Hook，例如 `mindMap.getAllRoots()`、`mindMap.renderExtraBoundingRects()`。

若上述 Hook 尚未合并，需要先提交核心改造 PR，再启用 FreedomNode 插件；否则本提案中的插件代码只能通过 fork 核心才能运行。

---

## 19. 开放问题

1. **性能阈值**: 自由节点数量超过多少时需要启用虚拟滚动？
   - **建议**: 首版不限制，后续根据用户反馈优化

2. **协同锁机制**: 是否需要在首版实现操作锁？
   - **建议**: 首版只做基础冲突提示，锁机制留待后续

3. **快捷键冲突**: 如何处理与现有快捷键的冲突？
   - **建议**: 使用 `Ctrl+Shift+F`（不常用）或可配置快捷键

4. **移动端支持**: 触摸操作如何实现拖拽转换？
   - **建议**: 首版专注桌面端，移动端后续专项设计

---

## 20. 参考文档

- [原 Free Node 提案](simple-mind-map/docs/proposals/free-node.md)
- [Drag 插件源码](simple-mind-map/src/plugins/Drag.js)
- [AssociativeLine 插件源码](simple-mind-map/src/plugins/AssociativeLine.js)
- [Render 类源码](simple-mind-map/src/core/render/Render.js)
- [Layout 基类源码](simple-mind-map/src/layouts/Base.js)

---

## 附录 A: API 速查

### 创建自由节点
```javascript
mindMap.execCommand('CREATE_FREEDOM_NODE', {
  position: { left: 500, top: 300 },
  text: '自由主题',
  layout: 'mindMap',
  children: []
})
```

### 节点转自由节点
```javascript
mindMap.execCommand('CONVERT_TO_FREEDOM', node, { left: 100, top: 100 })
```

### 自由节点吸附回树
```javascript
mindMap.execCommand('ATTACH_FREEDOM_NODE', freeNodeId, targetNode, index)
```

### 移动自由节点
```javascript
mindMap.execCommand('MOVE_FREEDOM_NODE', freeNodeId, 50, -30)
```

### 删除自由节点
```javascript
mindMap.execCommand('REMOVE_FREEDOM_NODE', freeNodeId)
```

### 导出自由节点
```javascript
const freeNodesData = mindMap.freeNode.exportFreeNodes()
```

---

## 附录 B: 配置项完整清单

```javascript
{
  enableFreedomNode: true,
  freedomNodeConfig: {
    dragToBlankConvertSafeDistance: 150,
    snapToTreeDistance: 100,
    dblclickBlankCreateFreedom: true,
    dblclickCanvasAction: 'freedom',
    rightDblclickBackToRoot: true,
    defaultFreedomNodeText: '自由节点',
    defaultFreedomNodeLayout: null,
    enableFreedomNodeDrag: true,
    convertToFreedomIncludeMode: 'includeFollowing',
    enableContextMenuCreateFreedom: true,
    exportIncludeFreedomNodes: true
  }
}
```

---

**提案状态**: 待评审
**下一步**: 团队评审 → 技术细节确认 → 开发排期
