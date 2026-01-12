# 核心架构改造清单 - FreedomNode 插件

## 1. 核心改造概述

FreedomNode 插件需要扩展 simple-mind-map 的核心渲染、布局和交互系统，以支持自由节点（不受布局算法约束的节点）。核心策略是**最小侵入**，通过 Hook 机制和插件 API 扩展现有功能。

---

## 2. 需要添加的 Hook 列表

### 2.1 渲染流程 Hook（`Render.js`）

#### Hook: `beforeNodeRender`
- **位置**: `Render.js:598` (doLayout 回调开始时)
- **时机**: 在布局计算完成后、节点渲染开始前
- **参数**: `{ root, nodeList, renderSource }`
- **用途**: FreedomNode 插件拦截自由节点，跳过布局计算
- **代码建议**:
```javascript
// Render.js line 598
this.layout.doLayout(root => {
  // 添加 Hook
  this.mindMap.emit('beforeNodeRender', { root, nodeList: this.nodeCache, renderSource: this.renderSourceList })

  // 原有代码继续...
  Object.keys(this.lastNodeCache).forEach(uid => {
    // ...
  })
})
```

#### Hook: `afterNodeRender`
- **位置**: `Render.js:622` (root.render 回调完成时)
- **时机**: 节点树渲染完成后
- **参数**: `{ root, nodeCache }`
- **用途**: FreedomNode 插件渲染自由节点树
- **代码建议**:
```javascript
// Render.js line 612
this.root.render(() => {
  // 添加 Hook
  this.mindMap.emit('afterNodeRender', { root: this.root, nodeCache: this.nodeCache })

  this.isRendering = false
  // ...
})
```

#### Hook: `nodePositionChange`
- **位置**: `Render.js:2036` (moveNodeToCenter 方法调用时)
- **时机**: 节点位置更新时
- **参数**: `{ node, left, top, type: 'custom' | 'layout' }`
- **用途**: 追踪自由节点位置变化，用于拖拽后的位置保存
- **代码建议**:
```javascript
// 在 setNodeCustomPosition 方法中添加
this.mindMap.emit('nodePositionChange', {
  node: item,
  left: item.customLeft,
  top: item.customTop,
  type: 'custom'
})
```

---

### 2.2 布局系统 Hook（`Base.js`）

#### Hook: `beforeLayout`
- **位置**: `Base.js:25` (doLayout 方法开始时)
- **时机**: 布局计算开始前
- **参数**: `{ renderTree, layout }`
- **用途**: FreedomNode 插件标记自由节点，从布局树中临时移除
- **代码建议**:
```javascript
// Base.js - 在子类的 doLayout 实现开始处
doLayout(callback) {
  this.renderer.mindMap.emit('beforeLayout', {
    renderTree: this.renderer.renderTree,
    layout: this
  })
  // 原有布局逻辑...
}
```

#### Hook: `afterLayout`
- **位置**: `Base.js` (doLayout 回调结束时)
- **时机**: 布局计算完成后
- **参数**: `{ root, layoutResult }`
- **用途**: FreedomNode 插件恢复自由节点到渲染树
- **代码建议**:
```javascript
// 在布局完成后触发
this.renderer.mindMap.emit('afterLayout', {
  root: rootNode,
  layoutResult: { /* 布局统计信息 */ }
})
callback(rootNode)
```

---

### 2.3 命令系统 Hook（`Command.js`）

#### Hook: `beforeCommand`
- **位置**: `Command.js:60` (exec 方法开始时)
- **时机**: 命令执行前
- **参数**: `{ commandName, args }`
- **用途**: FreedomNode 插件拦截特定命令（如 MOVE_NODE_TO），处理自由节点特殊逻辑
- **代码建议**:
```javascript
// Command.js line 60
exec(name, ...args) {
  if (this.commands[name]) {
    // 添加 Hook
    this.mindMap.emit('beforeCommand', { commandName: name, args })

    this.commands[name].forEach(fn => {
      fn(...args)
    })
    // ...
  }
}
```

#### Hook: `afterCommand`
- **位置**: `Command.js:65` (现有 afterExecCommand 之后)
- **参数**: `{ commandName, args, result }`
- **用途**: FreedomNode 插件清理或更新自由节点状态
- **建议**: 已有 `afterExecCommand` 事件可复用

---

### 2.4 拖拽系统 Hook（`Drag.js`）

#### Hook: `dragCheckDistance`
- **位置**: `Drag.js:397` (checkOverlapNode 方法中)
- **时机**: 拖拽时检测重叠节点
- **参数**: `{ dragNode, targetNode, distance, mousePos }`
- **用途**: FreedomNode 插件实现安全距离判断，决定是否转换为自由节点
- **代码建议**:
```javascript
// Drag.js 在 checkOverlapNode 中添加
checkOverlapNode() {
  // 原有检测逻辑...

  // 添加自定义距离检测 Hook
  const customCheck = this.mindMap.emit('dragCheckDistance', {
    dragNode: this.beingDragNodeList[0],
    targetNode: node,
    distance: Math.sqrt(dx*dx + dy*dy),
    mousePos: { x: this.mouseMoveX, y: this.mouseMoveY }
  })

  // 如果插件返回 false，跳过默认检测
  if (customCheck === false) return
}
```

#### Hook: `beforeDragEnd`
- **位置**: `Drag.js:148` (已存在)
- **时机**: 拖拽结束前
- **参数**: `{ overlapNodeUid, prevNodeUid, nextNodeUid, beingDragNodeList }`
- **用途**: 已存在，可直接使用，FreedomNode 插件在此判断是否需要转换节点类型
- **建议**: 无需修改，插件通过 `mindMap.on('beforeDragEnd')` 监听即可

---

## 3. 需要修改的核心代码

### 3.1 渲染系统修改（最小侵入）

#### 文件: `Render.js`

**修改点 1: 节点缓存机制**
- **位置**: `Render.js:584-585`
- **现状**: `this.nodeCache = {}`
- **修改**: 无需修改，插件可通过 Hook 访问 nodeCache
- **风险**: 无

**修改点 2: 渲染流程调度**
- **位置**: `Render.js:598-621`
- **现状**: 调用 `this.layout.doLayout()` → 删除不需要节点 → `this.root.render()`
- **修改**: 添加上述 `beforeNodeRender` 和 `afterNodeRender` Hook
- **风险**: 低，仅插入事件触发，不改变原有逻辑

---

### 3.2 布局系统修改

#### 文件: `Base.js`

**修改点 1: createNode 方法**
- **位置**: `Base.js:110-275`
- **现状**: 创建节点时强制添加到父节点的 children
- **修改**: 添加判断，跳过自由节点的自动父子关系绑定
- **代码建议**:
```javascript
// Base.js line 268
if (isRoot) {
  this.root = newNode
} else {
  // 修改：检查是否为自由节点
  if (!newNode.getData('isFreedomNode')) {
    parent._node.addChildren(newNode)
  }
}
```
- **风险**: 中，需要确保自由节点不会被布局算法处理

**修改点 2: getNodeBoundaries 方法**
- **位置**: `Base.js:649-706`
- **现状**: 递归计算节点树边界
- **修改**: 添加自由节点跳过逻辑
- **代码建议**:
```javascript
// Base.js line 657
if (root.children && root.children.length > 0) {
  root.children.forEach(child => {
    // 跳过自由节点
    if (child.getData('isFreedomNode')) return

    let { left, right, top, bottom } = walk(child)
    // ...
  })
}
```
- **风险**: 中，可能影响画布边界计算

---

### 3.3 命令系统修改

#### 文件: `Command.js`

**修改点 1: 添加新命令**
- **位置**: 无需修改核心，通过插件注册
- **代码建议**:
```javascript
// 在 FreedomNode 插件中注册命令
this.mindMap.command.add('CONVERT_TO_FREEDOM_NODE', this.convertToFreedomNode.bind(this))
this.mindMap.command.add('CONVERT_TO_NORMAL_NODE', this.convertToNormalNode.bind(this))
```
- **风险**: 无

---

### 3.4 拖拽系统修改

#### 文件: `Drag.js`

**修改点 1: 距离判断逻辑**
- **位置**: `Drag.js:1122-1142` (checkIsOverlap 方法)
- **现状**: 固定距离判断（1/4 宽度/高度）
- **修改**: 提取为可配置参数 + Hook
- **代码建议**:
```javascript
// Drag.js line 1134
checkIsOverlap({ node, dir, prevBrotherOffset, nextBrotherOffset, size, pos, nodeRect }) {
  // 添加可配置的距离因子
  const overlapFactor = this.mindMap.opt.dragOverlapFactor || 0.25

  if (!this.overlapNode && !this.prevNode && !this.nextNode) {
    if (
      nodeRect[dir1] + (prevBrotherOffset > 0 ? 0 : size * overlapFactor) <= pos &&
      nodeRect[dir2] - (nextBrotherOffset > 0 ? 0 : size * overlapFactor) >= pos
    ) {
      // 触发自定义检测 Hook
      const shouldOverlap = this.mindMap.emit('dragCheckOverlap', { node, pos, nodeRect })
      if (shouldOverlap !== false) {
        this.overlapNode = node
      }
    }
  }
}
```
- **风险**: 低，向后兼容（默认值 0.25）

**修改点 2: 自由拖拽模式**
- **位置**: `Drag.js:186-208`
- **现状**: 已支持 `enableFreeDrag` 配置
- **修改**: 无需修改，插件可直接使用
- **风险**: 无

---

## 4. 插件依赖的现有 API 列表

### 4.1 渲染 API
| API | 文件 | 用途 |
|-----|------|------|
| `mindMap.render()` | Render.js:562 | 触发重新渲染 |
| `mindMap.renderer.root` | Render.js:104 | 访问根节点 |
| `mindMap.renderer.nodeCache` | Render.js:92 | 访问节点缓存 |
| `mindMap.renderer.activeNodeList` | Render.js:99 | 访问激活节点列表 |

### 4.2 节点 API
| API | 文件 | 用途 |
|-----|------|------|
| `node.getData(key)` | MindMapNode.js | 读取节点数据 |
| `node.setData(data)` | MindMapNode.js | 设置节点数据 |
| `node.left / node.top` | MindMapNode.js:178-192 | 节点位置 |
| `node.width / node.height` | MindMapNode.js:54-56 | 节点尺寸 |
| `node.customLeft / node.customTop` | MindMapNode.js:64-65 | 自定义位置 |
| `node.render()` | MindMapNode.js | 渲染节点 |
| `node.getSize()` | MindMapNode.js:171 | 计算节点尺寸 |

### 4.3 布局 API
| API | 文件 | 用途 |
|-----|------|------|
| `layout.doLayout(callback)` | Base.js:25 | 执行布局计算 |
| `layout.createNode()` | Base.js:110 | 创建节点实例 |
| `layout.getNodeBoundaries()` | Base.js:649 | 计算节点边界 |

### 4.4 命令 API
| API | 文件 | 用途 |
|-----|------|------|
| `mindMap.execCommand(name, ...args)` | Command.js:60 | 执行命令 |
| `mindMap.command.add(name, fn)` | Command.js:78 | 注册命令 |
| `SET_NODE_DATA` | Render.js:324 | 设置节点数据命令（已存在） |
| `SET_NODE_CUSTOM_POSITION` | Render.js:357 | 设置自定义位置命令（已存在） |

### 4.5 事件 API
| API | 文件 | 用途 |
|-----|------|------|
| `mindMap.on(event, handler)` | Event.js (EventEmitter) | 监听事件 |
| `mindMap.emit(event, data)` | Event.js (EventEmitter) | 触发事件 |
| `node_dragging` | Drag.js:122 | 节点拖拽中事件（已存在） |
| `node_dragend` | Drag.js:211 | 节点拖拽结束事件（已存在） |

### 4.6 配置 API
| API | 文件 | 用途 |
|-----|------|------|
| `mindMap.opt.enableFreeDrag` | Drag.js:187 | 启用自由拖拽（已存在） |
| `mindMap.opt.readonly` | Render.js:721 | 只读模式 |

---

## 5. 风险评估和兼容性建议

### 5.1 高风险点

#### 风险 1: 布局算法绕过
- **描述**: 自由节点绕过布局算法可能导致画布边界计算错误
- **影响范围**: 导出、缩放、滚动条
- **缓解措施**:
  1. 在 `getNodeBoundaries` 中正确处理自由节点
  2. 提供独立的自由节点边界计算方法
  3. 在导出时特殊处理自由节点

#### 风险 2: 父子关系断裂
- **描述**: 自由节点不在父节点的 children 列表中，可能导致遍历丢失
- **影响范围**: 全选、导出、搜索
- **缓解措施**:
  1. 在节点数据 `nodeData.children` 中保留自由节点
  2. 在节点实例 `node.children` 中移除自由节点
  3. 插件维护独立的自由节点映射表

#### 风险 3: 命令系统兼容性
- **描述**: 现有命令（删除、复制、粘贴）可能不支持自由节点
- **影响范围**: 所有节点操作命令
- **缓解措施**:
  1. 使用 `beforeCommand` Hook 拦截命令
  2. 为自由节点提供特殊处理逻辑
  3. 在插件中实现命令包装器

---

### 5.2 中等风险点

#### 风险 4: 拖拽碰撞检测
- **描述**: 原有碰撞检测逻辑不支持自由节点
- **影响范围**: 拖拽转换、位置吸附
- **缓解措施**:
  1. 通过 `dragCheckDistance` Hook 自定义检测逻辑
  2. 在插件中维护自由节点的空间索引（如 R-Tree）

#### 风险 5: 性能影响
- **描述**: 自由节点需要独立渲染流程，可能增加渲染时间
- **影响范围**: 大型思维导图（>500 节点）
- **缓解措施**:
  1. 使用虚拟列表技术渲染可见区域
  2. 缓存自由节点树的布局结果
  3. 异步渲染自由节点

---

### 5.3 低风险点

#### 风险 6: 快捷键冲突
- **描述**: 自由节点的快捷键可能与现有冲突
- **影响范围**: 用户体验
- **缓解措施**: 使用 `Ctrl+Shift+F` 等不常用组合键

#### 风险 7: 主题样式兼容
- **描述**: 现有主题可能不包含自由节点样式
- **影响范围**: 视觉效果
- **缓解措施**: 插件提供默认样式，支持主题覆盖

---

## 6. 兼容性保证

### 6.1 向后兼容策略

1. **数据结构兼容**:
   - 自由节点标记为 `data.isFreedomNode: true`
   - 旧版本忽略此字段，不影响现有功能
   - 新版本加载旧数据时，所有节点默认为普通节点

2. **API 兼容**:
   - 所有新增 Hook 为可选监听
   - 不修改现有 API 签名
   - 使用 `mindMap.opt` 扩展配置，不影响默认行为

3. **布局兼容**:
   - 不启用插件时，所有节点按原有布局算法处理
   - 启用插件后，仅标记为自由节点的节点受影响

---

### 6.2 测试建议

#### 单元测试
- 测试自由节点创建、转换、删除
- 测试布局算法跳过自由节点
- 测试命令系统兼容性

#### 集成测试
- 测试混合节点树（普通节点 + 自由节点）
- 测试拖拽转换逻辑
- 测试导出功能（包含自由节点）

#### 性能测试
- 测试 1000 节点场景下的渲染性能
- 测试自由节点数量对布局算法的影响

#### 兼容性测试
- 测试旧数据导入
- 测试插件禁用时的行为
- 测试与其他插件（Drag, Export）的交互

---

## 7. 实现优先级建议

### P0 - 核心功能（必须实现）
1. 在 `Render.js` 中添加 `beforeNodeRender` 和 `afterNodeRender` Hook
2. 在 `Base.js` 的 `createNode` 中添加自由节点判断
3. 在 `Drag.js` 中添加 `dragCheckDistance` Hook
4. 实现自由节点数据结构（`data.isFreedomNode`）

### P1 - 扩展功能（重要）
5. 在 `Base.js` 中添加 `beforeLayout` 和 `afterLayout` Hook
6. 在 `Command.js` 中添加 `beforeCommand` Hook
7. 修改 `getNodeBoundaries` 支持自由节点
8. 实现自由节点的独立布局算法

### P2 - 优化功能（可选）
9. 实现自由节点的虚拟列表渲染
10. 实现自由节点的空间索引（R-Tree）
11. 添加性能监控和优化工具

---

## 8. 核心代码示例

### 示例 1: 在 Render.js 中添加 Hook

```javascript
// Render.js line 598
this.layout.doLayout(root => {
  // === 新增：触发 beforeNodeRender Hook ===
  this.mindMap.emit('beforeNodeRender', {
    root,
    nodeCache: this.nodeCache,
    renderSource: this.renderSourceList
  })
  // === 新增结束 ===

  // 删除本次渲染时不再需要的节点
  Object.keys(this.lastNodeCache).forEach(uid => {
    if (!this.nodeCache[uid]) {
      this.removeNodeFromActiveList(this.lastNodeCache[uid])
      this.emitNodeActiveEvent()
      this.lastNodeCache[uid].destroy()
    }
  })

  this.root = root
  this.root.render(() => {
    // === 新增：触发 afterNodeRender Hook ===
    this.mindMap.emit('afterNodeRender', {
      root: this.root,
      nodeCache: this.nodeCache
    })
    // === 新增结束 ===

    this.isRendering = false
    if (this.hasWaitRendering) {
      this.hasWaitRendering = false
      this.render()
      return
    }
    this.onRenderEnd()
  })
})
```

---

### 示例 2: 在 Base.js 中处理自由节点

```javascript
// Base.js line 268
if (isRoot) {
  this.root = newNode
} else {
  // === 修改：检查是否为自由节点 ===
  const isFreedomNode = newNode.getData('isFreedomNode')
  if (!isFreedomNode) {
    parent._node.addChildren(newNode)
  }
  // 如果是自由节点，保留在 nodeData.children 中但不添加到实例的 children
  // === 修改结束 ===
}
```

---

### 示例 3: 在 Drag.js 中添加距离判断 Hook

```javascript
// Drag.js 在 checkOverlapNode 开始处添加
checkOverlapNode() {
  if (!this.drawTransform || !this.placeholder) {
    return
  }

  // === 新增：触发自定义距离检测 Hook ===
  const customResult = this.mindMap.emit('dragCheckDistance', {
    dragNode: this.beingDragNodeList[0],
    mousePos: { x: this.mouseMoveX, y: this.mouseMoveY },
    nodeList: this.nodeList,
    drawTransform: this.drawTransform
  })

  // 如果 Hook 返回自定义结果，直接使用
  if (customResult && typeof customResult === 'object') {
    this.overlapNode = customResult.overlapNode || null
    this.prevNode = customResult.prevNode || null
    this.nextNode = customResult.nextNode || null
    if (customResult.skipDefault) return
  }
  // === 新增结束 ===

  // 原有检测逻辑...
  const { LOGICAL_STRUCTURE, /* ... */ } = CONSTANTS.LAYOUT
  this.overlapNode = null
  // ...
}
```

---

## 9. 总结

### 核心改造清单
- **4 个关键 Hook**: `beforeNodeRender`, `afterNodeRender`, `dragCheckDistance`, `beforeLayout`
- **3 处核心修改**: Render 流程、Base 节点创建、Drag 距离判断
- **0 处 API 破坏性修改**: 所有修改向后兼容

### 实现路径
1. 先实现 P0 核心 Hook，验证插件可行性
2. 实现自由节点的最小可用版本（MVP）
3. 迭代优化性能和用户体验
4. 完善测试和文档

### 预期效果
- **兼容性**: 100% 向后兼容，不影响现有用户
- **性能**: 自由节点数量 <100 时无明显性能损失
- **可维护性**: 插件与核心解耦，独立迭代

---

## 10. 附录：事件列表

### 现有事件（可直接使用）
- `node_dragging`: 节点拖拽中
- `node_dragend`: 节点拖拽结束
- `beforeDragEnd`: 拖拽结束前（可取消）
- `node_tree_render_start`: 节点树渲染开始
- `node_tree_render_end`: 节点树渲染结束
- `data_change`: 数据变化
- `node_active`: 节点激活
- `afterExecCommand`: 命令执行后

### 需要新增的事件（核心 Hook）
- `beforeNodeRender`: 节点渲染前
- `afterNodeRender`: 节点渲染后
- `beforeLayout`: 布局计算前
- `afterLayout`: 布局计算后
- `dragCheckDistance`: 拖拽距离检测
- `beforeCommand`: 命令执行前（可选）

---

**文档版本**: v1.0
**创建时间**: 2025-12-26
**作者**: Architecture Analyzer Agent
**状态**: 待审核
