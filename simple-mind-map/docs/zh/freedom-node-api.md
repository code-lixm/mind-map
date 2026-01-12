# 自由节点 API 文档

FreedomNode 插件为 simple-mind-map 提供独立于主树的自由节点功能。本文档提供完整的 API 参考、使用示例、最佳实践和常见问题解答。

## 目录

- [快速开始](#快速开始)
- [配置选项](#配置选项)
- [核心 API](#核心-api)
- [命令系统](#命令系统)
- [事件系统](#事件系统)
- [数据结构](#数据结构)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)
- [类型定义](#类型定义)

---

## 快速开始

### 安装和注册

```javascript
import MindMap from 'simple-mind-map'
import FreedomNode from 'simple-mind-map/src/plugins/FreedomNode'

// 注册插件
MindMap.usePlugin(FreedomNode)

// 创建实例
const mindMap = new MindMap({
  el: document.getElementById('mindMapContainer'),
  data: {
    data: { text: '根节点' },
    children: []
  },
  // 自由节点配置（可选）
  freedomNodeConfig: {
    enableFreedomNode: true,
    dragToBlankConvertSafeDistance: 150,
    snapToTreeDistance: 100
  }
})
```

### 基本使用

```javascript
// 创建自由节点
const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
  position: { left: 500, top: 300 },
  text: '我的第一个自由节点'
})

// 移动自由节点
mindMap.execCommand('MOVE_FREEDOM_NODE', freeNodeId, 50, 30)

// 删除自由节点
mindMap.execCommand('REMOVE_FREEDOM_NODE', freeNodeId)
```

---

## 配置选项

### 完整配置列表

```javascript
{
  // 是否启用自由节点功能
  enableFreedomNode: true,

  // 自由节点详细配置
  freedomNodeConfig: {
    // 拖拽转换的安全距离（像素）
    // 节点拖拽超过此距离会转为自由节点
    dragToBlankConvertSafeDistance: 150,

    // 自由节点吸附回树的距离阈值（像素）
    snapToTreeDistance: 100,

    // 双击空白画布是否创建自由节点
    dblclickBlankCreateFreedom: true,

    // 自由节点默认文本
    defaultFreedomNodeText: '自由节点',

    // 自由节点默认布局（null 表示使用主树布局）
    defaultFreedomNodeLayout: null,

    // 是否允许自由节点拖拽
    enableFreedomNodeDrag: true,

    // 导出时是否包含自由节点
    exportIncludeFreedomNodes: true
  }
}
```

### 配置项详解

#### `enableFreedomNode`

- **类型**: `Boolean`
- **默认值**: `true`
- **说明**: 全局开关，控制是否启用自由节点功能

```javascript
const mindMap = new MindMap({
  el: container,
  enableFreedomNode: false // 禁用自由节点
})
```

#### `dragToBlankConvertSafeDistance`

- **类型**: `Number`
- **默认值**: `150`
- **单位**: 像素
- **说明**: 拖拽节点超出此距离时转为自由节点

```javascript
freedomNodeConfig: {
  dragToBlankConvertSafeDistance: 200 // 增大安全距离
}
```

#### `snapToTreeDistance`

- **类型**: `Number`
- **默认值**: `100`
- **单位**: 像素
- **说明**: 自由节点拖入此距离内会自动吸附到树形节点

```javascript
freedomNodeConfig: {
  snapToTreeDistance: 80 // 缩小吸附距离
}
```

#### `dblclickBlankCreateFreedom`

- **类型**: `Boolean`
- **默认值**: `true`
- **说明**: 双击空白画布是否创建自由节点

```javascript
freedomNodeConfig: {
  dblclickBlankCreateFreedom: false // 禁用双击创建
}
```

#### `defaultFreedomNodeText`

- **类型**: `String`
- **默认值**: `'自由节点'`
- **说明**: 创建自由节点时的默认文本

```javascript
freedomNodeConfig: {
  defaultFreedomNodeText: '新建节点' // 自定义默认文本
}
```

#### `defaultFreedomNodeLayout`

- **类型**: `String | null`
- **默认值**: `null`
- **可选值**: `'logicalStructure' | 'mindMap' | 'catalogOrganization' | 'organizationStructure' | 'timeline' | 'fishbone'`
- **说明**: 自由节点的默认布局，`null` 表示使用主树布局

```javascript
freedomNodeConfig: {
  defaultFreedomNodeLayout: 'logicalStructure' // 默认使用逻辑结构图布局
}
```

#### `enableFreedomNodeDrag`

- **类型**: `Boolean`
- **默认值**: `true`
- **说明**: 是否允许拖拽自由节点

```javascript
freedomNodeConfig: {
  enableFreedomNodeDrag: false // 禁止拖拽自由节点
}
```

#### `exportIncludeFreedomNodes`

- **类型**: `Boolean`
- **默认值**: `true`
- **说明**: 导出时是否包含自由节点

```javascript
freedomNodeConfig: {
  exportIncludeFreedomNodes: false // 导出时不包含自由节点
}
```

---

## 核心 API

### `mindMap.freeNode` 实例方法

#### `createFreeNode(options)`

创建自由节点

**参数**:

- `options` (Object) - 创建选项
  - `position` (Object) - **必需** - 位置坐标 `{ left, top }`
  - `text` (String) - 可选 - 节点文本，默认使用配置的 `defaultFreedomNodeText`
  - `layout` (String) - 可选 - 布局类型，默认使用配置的 `defaultFreedomNodeLayout`
  - `data` (Object) - 可选 - 节点数据覆盖
  - `children` (Array) - 可选 - 子节点列表

**返回值**: `String` - 自由节点 ID

**示例**:

```javascript
// 简单创建
const freeNodeId = mindMap.freeNode.createFreeNode({
  position: { left: 500, top: 300 },
  text: '项目计划'
})

// 带子节点创建
const freeNodeId = mindMap.freeNode.createFreeNode({
  position: { left: 800, top: 400 },
  text: '产品路线图',
  layout: 'timeline',
  children: [
    { data: { text: 'Q1 阶段' } },
    { data: { text: 'Q2 阶段' } },
    { data: { text: 'Q3 阶段' } }
  ]
})

// 自定义节点数据
const freeNodeId = mindMap.freeNode.createFreeNode({
  position: { left: 600, top: 500 },
  text: '重要任务',
  data: {
    tag: ['紧急', '重要'],
    note: '需要在本周完成',
    backgroundColor: '#ff6b6b'
  }
})
```

---

#### `convertToFreedom(node, position)`

将普通节点转换为自由节点

**参数**:

- `node` (MindMapNode) - **必需** - 要转换的节点实例
- `position` (Object) - **必需** - 目标位置 `{ left, top }`

**返回值**: `String | null` - 自由节点 ID，失败返回 `null`

**示例**:

```javascript
// 获取要转换的节点
const node = mindMap.renderer.root.children[0]

// 转换为自由节点
const freeNodeId = mindMap.freeNode.convertToFreedom(node, {
  left: 1000,
  top: 500
})

if (freeNodeId) {
  console.log('转换成功，自由节点 ID:', freeNodeId)
}
```

---

#### `attachToTree(freeNodeId, targetNode, index)`

将自由节点吸附回树形结构

**参数**:

- `freeNodeId` (String) - **必需** - 自由节点 ID
- `targetNode` (MindMapNode) - **必需** - 目标父节点
- `index` (Number) - 可选 - 插入位置索引

**返回值**: `void`

**示例**:

```javascript
// 吸附到根节点
const freeNodeId = 'fn_abc123'
const rootNode = mindMap.renderer.root

mindMap.freeNode.attachToTree(freeNodeId, rootNode)

// 吸附到指定节点的指定位置
const targetNode = mindMap.renderer.root.children[0]
mindMap.freeNode.attachToTree(freeNodeId, targetNode, 0) // 插入到第一个位置
```

---

#### `moveFreeNode(freeNodeId, deltaX, deltaY)`

移动自由节点

**参数**:

- `freeNodeId` (String) - **必需** - 自由节点 ID
- `deltaX` (Number) - **必需** - X 方向偏移量
- `deltaY` (Number) - **必需** - Y 方向偏移量

**返回值**: `void`

**示例**:

```javascript
const freeNodeId = 'fn_abc123'

// 向右移动 50px，向下移动 30px
mindMap.freeNode.moveFreeNode(freeNodeId, 50, 30)

// 向左移动 100px，向上移动 80px
mindMap.freeNode.moveFreeNode(freeNodeId, -100, -80)
```

---

#### `removeFreeNode(freeNodeId)`

删除自由节点

**参数**:

- `freeNodeId` (String) - **必需** - 自由节点 ID

**返回值**: `void`

**示例**:

```javascript
const freeNodeId = 'fn_abc123'

mindMap.freeNode.removeFreeNode(freeNodeId)
```

---

#### `exportFreeNodes()`

导出所有自由节点数据

**参数**: 无

**返回值**: `Array<Object>` - 自由节点数据列表

**示例**:

```javascript
const freeNodesData = mindMap.freeNode.exportFreeNodes()

console.log('自由节点数量:', freeNodesData.length)

// 数据格式
// [
//   {
//     id: 'fn_abc123',
//     position: { left: 500, top: 300 },
//     layout: 'mindMap',
//     root: {
//       data: { text: '自由节点1', uid: 'uid-xxx' },
//       children: []
//     }
//   }
// ]
```

---

#### `importFreeNodes(data, options)`

导入自由节点数据

**参数**:

- `data` (Array<Object>) - **必需** - 自由节点数据列表
- `options` (Object) - 可选 - 导入选项
  - `mode` (String) - 导入模式：`'append'`（追加）或 `'replace'`（替换），默认 `'append'`

**返回值**: `void`

**示例**:

```javascript
const importData = [
  {
    id: 'fn_001',
    position: { left: 800, top: 500 },
    layout: 'logicalStructure',
    root: {
      data: { text: '导入节点', uid: 'uid-001' },
      children: []
    }
  }
]

// 追加模式（保留现有自由节点）
mindMap.freeNode.importFreeNodes(importData, { mode: 'append' })

// 替换模式（清空现有自由节点）
mindMap.freeNode.importFreeNodes(importData, { mode: 'replace' })
```

---

#### `findNodeByUid(uid)`

通过 UID 查找自由节点

**参数**:

- `uid` (String) - **必需** - 节点 UID

**返回值**: `MindMapNode | null` - 节点实例，未找到返回 `null`

**示例**:

```javascript
const uid = 'node-uid-xxx'
const node = mindMap.freeNode.findNodeByUid(uid)

if (node) {
  console.log('找到节点:', node.getData('text'))
}
```

---

#### `findFreeNodeInstance(freeNodeId)`

查找自由节点根实例

**参数**:

- `freeNodeId` (String) - **必需** - 自由节点 ID

**返回值**: `MindMapNode | null` - 自由节点根实例，未找到返回 `null`

**示例**:

```javascript
const freeNodeId = 'fn_abc123'
const freeRootNode = mindMap.freeNode.findFreeNodeInstance(freeNodeId)

if (freeRootNode) {
  console.log('自由节点文本:', freeRootNode.getData('text'))
  console.log('子节点数量:', freeRootNode.children.length)
}
```

---

#### `getFreeNodesBoundingRect()`

获取所有自由节点的边界矩形

**参数**: 无

**返回值**: `Object | null` - 边界矩形 `{ left, top, right, bottom, width, height }`，无自由节点返回 `null`

**示例**:

```javascript
const boundingRect = mindMap.freeNode.getFreeNodesBoundingRect()

if (boundingRect) {
  console.log('自由节点区域:', boundingRect)
  // {
  //   left: 500,
  //   top: 300,
  //   right: 1200,
  //   bottom: 800,
  //   width: 700,
  //   height: 500
  // }
}
```

---

#### `clear()`

清空所有自由节点

**参数**: 无

**返回值**: `void`

**示例**:

```javascript
// 清空所有自由节点
mindMap.freeNode.clear()

console.log('剩余自由节点数量:', mindMap.freeNode.freeNodeMap.size) // 0
```

---

## 命令系统

自由节点插件注册了以下命令，可通过 `mindMap.execCommand()` 调用。

### `CREATE_FREEDOM_NODE`

创建自由节点命令

**参数**: 同 `createFreeNode()` 方法

**示例**:

```javascript
const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
  position: { left: 500, top: 300 },
  text: '命令创建的自由节点'
})
```

---

### `CONVERT_TO_FREEDOM`

节点转自由节点命令

**参数**:
1. `node` (MindMapNode) - 要转换的节点
2. `position` (Object) - 目标位置 `{ left, top }`

**示例**:

```javascript
const node = mindMap.renderer.root.children[0]

const freeNodeId = mindMap.execCommand('CONVERT_TO_FREEDOM', node, {
  left: 1000,
  top: 500
})
```

---

### `ATTACH_FREEDOM_NODE`

自由节点吸附回树命令

**参数**:
1. `freeNodeId` (String) - 自由节点 ID
2. `targetNode` (MindMapNode) - 目标父节点
3. `index` (Number, 可选) - 插入位置索引

**示例**:

```javascript
const freeNodeId = 'fn_abc123'
const targetNode = mindMap.renderer.root

mindMap.execCommand('ATTACH_FREEDOM_NODE', freeNodeId, targetNode, 0)
```

---

### `MOVE_FREEDOM_NODE`

移动自由节点命令

**参数**:
1. `freeNodeId` (String) - 自由节点 ID
2. `deltaX` (Number) - X 方向偏移
3. `deltaY` (Number) - Y 方向偏移

**示例**:

```javascript
mindMap.execCommand('MOVE_FREEDOM_NODE', 'fn_abc123', 50, 30)
```

---

### `REMOVE_FREEDOM_NODE`

删除自由节点命令

**参数**:
1. `freeNodeId` (String) - 自由节点 ID

**示例**:

```javascript
mindMap.execCommand('REMOVE_FREEDOM_NODE', 'fn_abc123')
```

---

## 事件系统

自由节点插件触发以下事件，可通过 `mindMap.on()` 监听。

### `freedom_node_created`

自由节点创建完成事件

**回调参数**:
- `freeNodeData` (Object) - 自由节点数据

**示例**:

```javascript
mindMap.on('freedom_node_created', (freeNodeData) => {
  console.log('创建了自由节点:', freeNodeData.id)
  console.log('位置:', freeNodeData.position)
  console.log('文本:', freeNodeData.root.data.text)
})
```

---

### `node_converted_to_freedom`

节点转为自由节点事件

**回调参数**:
- `node` (MindMapNode) - 原始节点实例
- `freeNodeId` (String) - 新创建的自由节点 ID

**示例**:

```javascript
mindMap.on('node_converted_to_freedom', (node, freeNodeId) => {
  console.log('节点已转为自由节点')
  console.log('原节点 UID:', node.getData('uid'))
  console.log('自由节点 ID:', freeNodeId)
})
```

---

### `freedom_node_attached`

自由节点吸附回树事件

**回调参数**:
- `freeNodeId` (String) - 自由节点 ID
- `targetNode` (MindMapNode) - 目标父节点

**示例**:

```javascript
mindMap.on('freedom_node_attached', (freeNodeId, targetNode) => {
  console.log('自由节点已吸附:', freeNodeId)
  console.log('吸附到:', targetNode.getData('text'))
})
```

---

### `freedom_node_moved`

自由节点移动事件

**回调参数**:
- `freeNodeId` (String) - 自由节点 ID
- `newPosition` (Object) - 新位置 `{ left, top }`

**示例**:

```javascript
mindMap.on('freedom_node_moved', (freeNodeId, newPosition) => {
  console.log('自由节点已移动:', freeNodeId)
  console.log('新位置:', newPosition)
})
```

---

### `freedom_node_removed`

自由节点删除事件

**回调参数**:
- `freeNodeId` (String) - 自由节点 ID

**示例**:

```javascript
mindMap.on('freedom_node_removed', (freeNodeId) => {
  console.log('自由节点已删除:', freeNodeId)
})
```

---

### `freedom_node_change`

自由节点变化统一事件

**回调参数**:
- `changeInfo` (Object) - 变化信息
  - `type` (String) - 变化类型：`'created' | 'converted' | 'attached' | 'moved' | 'removed'`
  - `data` (Object) - 变化数据

**示例**:

```javascript
mindMap.on('freedom_node_change', ({ type, data }) => {
  switch (type) {
    case 'created':
      console.log('创建:', data)
      break
    case 'converted':
      console.log('转换:', data)
      break
    case 'attached':
      console.log('吸附:', data)
      break
    case 'moved':
      console.log('移动:', data)
      break
    case 'removed':
      console.log('删除:', data)
      break
  }
})
```

---

## 数据结构

### 自由节点数据格式

```typescript
interface FreeNodeData {
  // 自由节点唯一标识
  id: string  // 格式: 'fn_' + uid

  // 画布绝对坐标（锚点位置）
  position: {
    left: number
    top: number
  }

  // 布局类型
  layout: 'logicalStructure' | 'mindMap' | 'catalogOrganization' | 'organizationStructure' | 'timeline' | 'fishbone'

  // 自由树的根节点数据
  root: {
    data: {
      text: string
      uid: string
      isFreedomNode: true  // 自由节点标记
      [key: string]: any   // 其他节点数据
    }
    children: Array<NodeData>  // 子节点列表
  }
}
```

### 完整数据导出格式

```javascript
{
  // 主树数据
  root: {
    data: { text: '根节点', uid: 'root-xxx' },
    children: [/* 主树子节点 */]
  },

  // 自由节点列表
  freeNodes: [
    {
      id: 'fn_001',
      position: { left: 500, top: 300 },
      layout: 'mindMap',
      root: {
        data: {
          text: '自由节点1',
          uid: 'free-uid-001',
          isFreedomNode: true
        },
        children: []
      }
    },
    {
      id: 'fn_002',
      position: { left: 800, top: 500 },
      layout: 'logicalStructure',
      root: {
        data: {
          text: '自由节点2',
          uid: 'free-uid-002',
          isFreedomNode: true
        },
        children: [
          { data: { text: '子节点A', uid: 'uid-xxx' } }
        ]
      }
    }
  ]
}
```

---

## 使用示例

### 示例 1: 创建项目管理看板

```javascript
// 创建"进行中"自由节点
const inProgressId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
  position: { left: 500, top: 300 },
  text: '进行中',
  data: {
    backgroundColor: '#ffd93d',
    tag: ['看板']
  },
  children: [
    { data: { text: '任务1：设计评审' } },
    { data: { text: '任务2：代码实现' } }
  ]
})

// 创建"待办"自由节点
const todoId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
  position: { left: 800, top: 300 },
  text: '待办',
  data: {
    backgroundColor: '#6bcf7f',
    tag: ['看板']
  },
  children: [
    { data: { text: '任务3：测试用例' } },
    { data: { text: '任务4：文档编写' } }
  ]
})

// 创建"已完成"自由节点
const doneId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
  position: { left: 1100, top: 300 },
  text: '已完成',
  data: {
    backgroundColor: '#a8e6cf',
    tag: ['看板']
  },
  children: [
    { data: { text: '任务0：需求分析' } }
  ]
})
```

---

### 示例 2: 拖拽排序工作流

```javascript
// 监听自由节点移动事件
mindMap.on('freedom_node_moved', (freeNodeId, newPosition) => {
  // 保存位置到后端
  savePositionToBackend(freeNodeId, newPosition)

  // 检查是否重叠，实现自动排序
  checkAndAutoSort(freeNodeId)
})

function checkAndAutoSort(movedNodeId) {
  const movedNode = mindMap.freeNode.freeNodeMap.get(movedNodeId)
  const allFreeNodes = mindMap.freeNode.exportFreeNodes()

  allFreeNodes.forEach(freeNode => {
    if (freeNode.id === movedNodeId) return

    // 计算距离
    const distance = Math.sqrt(
      Math.pow(freeNode.position.left - movedNode.position.left, 2) +
      Math.pow(freeNode.position.top - movedNode.position.top, 2)
    )

    // 如果距离过近，自动调整位置
    if (distance < 200) {
      mindMap.execCommand('MOVE_FREEDOM_NODE', freeNode.id, 50, 0)
    }
  })
}
```

---

### 示例 3: 自由节点模板系统

```javascript
// 定义自由节点模板
const templates = {
  '便签': {
    layout: 'mindMap',
    data: {
      backgroundColor: '#fff9b1',
      borderColor: '#f9d423',
      borderWidth: 2
    }
  },
  '任务卡片': {
    layout: 'logicalStructure',
    data: {
      backgroundColor: '#e8f5e9',
      tag: ['任务'],
      icon: ['task']
    },
    children: [
      { data: { text: '负责人：' } },
      { data: { text: '截止日期：' } },
      { data: { text: '优先级：' } }
    ]
  },
  '时间线': {
    layout: 'timeline',
    data: {
      backgroundColor: '#e3f2fd'
    }
  }
}

// 使用模板创建自由节点
function createFromTemplate(templateName, position, text) {
  const template = templates[templateName]

  if (!template) {
    console.error('模板不存在:', templateName)
    return null
  }

  return mindMap.execCommand('CREATE_FREEDOM_NODE', {
    position,
    text: text || templateName,
    layout: template.layout,
    data: template.data,
    children: template.children || []
  })
}

// 创建任务卡片
const taskId = createFromTemplate('任务卡片', { left: 600, top: 400 }, '重构登录模块')
```

---

### 示例 4: 批量操作自由节点

```javascript
// 批量创建自由节点
function createBatchFreeNodes(items, startPosition, spacing) {
  const freeNodeIds = []

  items.forEach((item, index) => {
    const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
      position: {
        left: startPosition.left + index * spacing.x,
        top: startPosition.top + index * spacing.y
      },
      text: item.text,
      data: item.data || {},
      children: item.children || []
    })

    freeNodeIds.push(freeNodeId)
  })

  return freeNodeIds
}

// 使用示例
const weekTasks = [
  { text: '周一任务', data: { tag: ['工作'] } },
  { text: '周二任务', data: { tag: ['工作'] } },
  { text: '周三任务', data: { tag: ['工作'] } },
  { text: '周四任务', data: { tag: ['工作'] } },
  { text: '周五任务', data: { tag: ['工作'] } }
]

const taskIds = createBatchFreeNodes(
  weekTasks,
  { left: 500, top: 300 },
  { x: 250, y: 0 }
)

// 批量删除自由节点
function deleteBatchFreeNodes(freeNodeIds) {
  freeNodeIds.forEach(id => {
    mindMap.execCommand('REMOVE_FREEDOM_NODE', id)
  })
}

// 删除所有周任务
deleteBatchFreeNodes(taskIds)
```

---

### 示例 5: 自由节点搜索和过滤

```javascript
// 搜索包含关键词的自由节点
function searchFreeNodes(keyword) {
  const results = []
  const allFreeNodes = mindMap.freeNode.exportFreeNodes()

  allFreeNodes.forEach(freeNode => {
    // 搜索根节点
    if (freeNode.root.data.text.includes(keyword)) {
      results.push({
        freeNodeId: freeNode.id,
        nodeUid: freeNode.root.data.uid,
        text: freeNode.root.data.text,
        position: freeNode.position
      })
    }

    // 递归搜索子节点
    searchInChildren(freeNode.root.children, freeNode.id, results, keyword)
  })

  return results
}

function searchInChildren(children, freeNodeId, results, keyword) {
  if (!children || children.length === 0) return

  children.forEach(child => {
    if (child.data.text.includes(keyword)) {
      results.push({
        freeNodeId,
        nodeUid: child.data.uid,
        text: child.data.text
      })
    }

    if (child.children) {
      searchInChildren(child.children, freeNodeId, results, keyword)
    }
  })
}

// 使用示例
const searchResults = searchFreeNodes('重要')

searchResults.forEach(result => {
  console.log('找到匹配:', result.text)

  // 高亮显示匹配的节点
  const node = mindMap.freeNode.findNodeByUid(result.nodeUid)
  if (node) {
    node.active()
  }
})
```

---

## 最佳实践

### 1. 性能优化

#### 避免频繁创建和删除

```javascript
// ❌ 不推荐：频繁创建删除
for (let i = 0; i < 100; i++) {
  const id = mindMap.execCommand('CREATE_FREEDOM_NODE', {...})
  mindMap.execCommand('REMOVE_FREEDOM_NODE', id)
}

// ✅ 推荐：批量处理后统一渲染
const freeNodeIds = []

// 暂停渲染
mindMap.renderer.pauseRender()

for (let i = 0; i < 100; i++) {
  const id = mindMap.execCommand('CREATE_FREEDOM_NODE', {...})
  freeNodeIds.push(id)
}

// 恢复渲染
mindMap.renderer.resumeRender()
```

#### 使用节流优化拖拽

```javascript
import { throttle } from 'lodash'

// 节流移动操作
const throttledMove = throttle((freeNodeId, deltaX, deltaY) => {
  mindMap.execCommand('MOVE_FREEDOM_NODE', freeNodeId, deltaX, deltaY)
}, 16) // 60 FPS

// 拖拽时调用
document.addEventListener('mousemove', (e) => {
  throttledMove(currentFreeNodeId, e.movementX, e.movementY)
})
```

---

### 2. 数据持久化

#### 自动保存

```javascript
// 监听自由节点变化，自动保存
mindMap.on('freedom_node_change', throttle(() => {
  const data = mindMap.getData()

  // 保存到 localStorage
  localStorage.setItem('mindMapData', JSON.stringify(data))

  // 或保存到后端
  saveToBackend(data)
}, 1000))
```

#### 数据恢复

```javascript
// 从 localStorage 恢复
function loadFromLocalStorage() {
  const savedData = localStorage.getItem('mindMapData')

  if (savedData) {
    try {
      const data = JSON.parse(savedData)
      mindMap.setData(data)
    } catch (error) {
      console.error('数据恢复失败:', error)
    }
  }
}

// 页面加载时恢复
window.addEventListener('load', loadFromLocalStorage)
```

---

### 3. 错误处理

```javascript
// 包装命令调用，统一错误处理
function safeExecCommand(command, ...args) {
  try {
    return mindMap.execCommand(command, ...args)
  } catch (error) {
    console.error(`命令执行失败 [${command}]:`, error)

    // 显示用户友好的错误提示
    showToast(`操作失败: ${error.message}`)

    return null
  }
}

// 使用示例
const freeNodeId = safeExecCommand('CREATE_FREEDOM_NODE', {
  position: { left: 500, top: 300 },
  text: '安全创建'
})

if (freeNodeId) {
  console.log('创建成功:', freeNodeId)
}
```

---

### 4. 状态管理

```javascript
// 使用状态管理库（如 Vuex、Redux）管理自由节点
const store = {
  state: {
    freeNodes: new Map(),
    selectedFreeNodeId: null
  },

  mutations: {
    addFreeNode(freeNodeData) {
      this.state.freeNodes.set(freeNodeData.id, freeNodeData)
    },

    removeFreeNode(freeNodeId) {
      this.state.freeNodes.delete(freeNodeId)
    },

    updateFreeNodePosition(freeNodeId, position) {
      const freeNode = this.state.freeNodes.get(freeNodeId)
      if (freeNode) {
        freeNode.position = position
      }
    },

    selectFreeNode(freeNodeId) {
      this.state.selectedFreeNodeId = freeNodeId
    }
  }
}

// 监听自由节点变化，同步到状态管理
mindMap.on('freedom_node_change', ({ type, data }) => {
  switch (type) {
    case 'created':
      store.mutations.addFreeNode(data)
      break
    case 'removed':
      store.mutations.removeFreeNode(data.freeNodeId)
      break
    case 'moved':
      store.mutations.updateFreeNodePosition(data.freeNodeId, data.position)
      break
  }
})
```

---

## 常见问题

### Q1: 如何判断一个节点是否为自由节点？

```javascript
function isFreedomNode(node) {
  return node.getData('isFreedomNode') === true
}

// 或者
function isFreedomNode(node) {
  return node.nodeData.data._freedomNodeId !== undefined
}
```

---

### Q2: 如何获取自由节点的子节点？

```javascript
const freeNodeId = 'fn_abc123'
const freeRootNode = mindMap.freeNode.findFreeNodeInstance(freeNodeId)

if (freeRootNode) {
  const children = freeRootNode.children

  children.forEach(child => {
    console.log('子节点文本:', child.getData('text'))
  })
}
```

---

### Q3: 如何在自由节点中添加子节点？

```javascript
const freeNodeId = 'fn_abc123'
const freeRootNode = mindMap.freeNode.findFreeNodeInstance(freeNodeId)

if (freeRootNode) {
  // 使用标准的插入子节点命令
  mindMap.execCommand('INSERT_CHILD_NODE', freeRootNode, {
    data: { text: '新子节点' }
  })
}
```

---

### Q4: 如何禁用拖拽转换功能？

```javascript
const mindMap = new MindMap({
  el: container,
  freedomNodeConfig: {
    dragToBlankConvertSafeDistance: Infinity // 设置为无限大，永远不会转换
  }
})
```

---

### Q5: 如何自定义自由节点的默认样式？

```javascript
// 方法1: 在创建时覆盖样式
const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
  position: { left: 500, top: 300 },
  text: '自定义样式',
  data: {
    backgroundColor: '#ff6b6b',
    borderColor: '#c92a2a',
    borderWidth: 3,
    color: '#ffffff'
  }
})

// 方法2: 创建后修改样式
const freeRootNode = mindMap.freeNode.findFreeNodeInstance(freeNodeId)

if (freeRootNode) {
  mindMap.execCommand('SET_NODE_STYLE', freeRootNode, {
    backgroundColor: '#74b9ff',
    color: '#2d3436'
  })
}
```

---

### Q6: 如何导出时排除自由节点？

```javascript
const mindMap = new MindMap({
  el: container,
  freedomNodeConfig: {
    exportIncludeFreedomNodes: false
  }
})

// 或者在导出时临时排除
const dataWithoutFreeNodes = {
  root: mindMap.getData().root
  // 不包含 freeNodes
}
```

---

### Q7: 如何实现自由节点的撤销重做？

自由节点的撤销重做功能已内置支持，无需额外配置。

```javascript
// 创建自由节点
const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
  position: { left: 500, top: 300 },
  text: '可撤销的节点'
})

// 撤销创建
mindMap.command.back()

// 重做创建
mindMap.command.forward()
```

---

### Q8: 如何监听自由节点的双击事件？

```javascript
// 监听节点双击事件
mindMap.on('node_dblclick', (node) => {
  // 判断是否为自由节点
  if (node.getData('isFreedomNode')) {
    console.log('双击了自由节点:', node.getData('text'))

    // 执行自定义操作
    showEditDialog(node)
  }
})
```

---

### Q9: 如何实现自由节点的分组管理？

```javascript
// 为自由节点添加分组标识
const group1Nodes = []

for (let i = 0; i < 3; i++) {
  const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
    position: { left: 500 + i * 200, top: 300 },
    text: `分组1-节点${i}`,
    data: {
      group: 'group1',
      groupColor: '#3498db'
    }
  })

  group1Nodes.push(freeNodeId)
}

// 批量操作分组节点
function moveGroup(groupName, deltaX, deltaY) {
  const allFreeNodes = mindMap.freeNode.exportFreeNodes()

  allFreeNodes.forEach(freeNode => {
    if (freeNode.root.data.group === groupName) {
      mindMap.execCommand('MOVE_FREEDOM_NODE', freeNode.id, deltaX, deltaY)
    }
  })
}

// 移动整个分组
moveGroup('group1', 100, 50)
```

---

### Q10: 如何优化大量自由节点的性能？

```javascript
// 1. 使用虚拟滚动（仅渲染可视区域内的节点）
function renderVisibleFreeNodes() {
  const viewport = mindMap.getViewport()
  const allFreeNodes = mindMap.freeNode.exportFreeNodes()

  allFreeNodes.forEach(freeNode => {
    const isVisible = isInViewport(freeNode.position, viewport)

    if (isVisible) {
      // 渲染节点
      mindMap.freeNode.renderFreeNode(freeNode, freeNode.id)
    } else {
      // 隐藏节点
      mindMap.freeNode.hideFreeNode(freeNode.id)
    }
  })
}

// 2. 使用防抖优化频繁操作
const debouncedRender = debounce(renderVisibleFreeNodes, 100)

mindMap.on('view_data_change', debouncedRender)
```

---

## 类型定义

```typescript
declare module 'simple-mind-map/src/plugins/FreedomNode' {
  import { MindMapNode } from 'simple-mind-map'

  interface FreedomNodeConfig {
    enableFreedomNode?: boolean
    dragToBlankConvertSafeDistance?: number
    snapToTreeDistance?: number
    dblclickBlankCreateFreedom?: boolean
    defaultFreedomNodeText?: string
    defaultFreedomNodeLayout?: string | null
    enableFreedomNodeDrag?: boolean
    exportIncludeFreedomNodes?: boolean
  }

  interface CreateFreeNodeOptions {
    position: { left: number; top: number }
    text?: string
    layout?: string
    data?: Record<string, any>
    children?: Array<any>
  }

  interface FreeNodeData {
    id: string
    position: { left: number; top: number }
    layout: string
    root: {
      data: Record<string, any>
      children: Array<any>
    }
  }

  interface ImportOptions {
    mode?: 'append' | 'replace'
  }

  interface BoundingRect {
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
  }

  export default class FreedomNode {
    static pluginName: string
    static instanceName: string

    constructor(options: { mindMap: any })

    // 核心方法
    createFreeNode(options: CreateFreeNodeOptions): string
    convertToFreedom(node: MindMapNode, position: { left: number; top: number }): string | null
    attachToTree(freeNodeId: string, targetNode: MindMapNode, index?: number): void
    moveFreeNode(freeNodeId: string, deltaX: number, deltaY: number): void
    removeFreeNode(freeNodeId: string): void

    // 查询方法
    findNodeByUid(uid: string): MindMapNode | null
    findFreeNodeInstance(freeNodeId: string): MindMapNode | null
    getFreeNodesBoundingRect(): BoundingRect | null

    // 导入导出
    exportFreeNodes(): Array<FreeNodeData>
    importFreeNodes(data: Array<FreeNodeData>, options?: ImportOptions): void

    // 工具方法
    clear(): void
  }
}
```

---

## 版本历史

### v1.0.0 (2024-12-26)

- ✅ 初始版本发布
- ✅ 创建、转换、吸附、移动、删除功能
- ✅ 导出导入支持
- ✅ 撤销重做支持
- ✅ 关联线集成
- ✅ 框选支持
- ✅ 完整事件系统

---

## 相关文档

- [配置选项详解](./freedom-node-config.md)
- [集成测试指南](./freedom-node-testing.md)
- [技术提案](../proposals/freedom-node-plugin.md)
- [核心设计文档](../proposals/free-node.md)

---

## 技术支持

如有问题或建议，请：

1. 查阅本文档的 [常见问题](#常见问题) 部分
2. 搜索 [GitHub Issues](https://github.com/wanglin2/mind-map/issues)
3. 提交新的 Issue 并附上详细的问题描述和复现步骤

---

**文档版本**: 1.0.0
**最后更新**: 2024-12-26
**维护者**: Claude Code & lixiaoming
