# 自由节点配置文档

## 概述

自由节点（FreedomNode）功能允许在思维导图画布上创建独立于主树的节点树，这些节点可以自由放置、拖拽和转换。

## 基本配置

### 启用自由节点功能

```javascript
import MindMap from 'simple-mind-map'
import FreedomNode from 'simple-mind-map/src/plugins/FreedomNode'

// 注册插件
MindMap.usePlugin(FreedomNode)

// 创建实例
const mindMap = new MindMap({
  el: document.getElementById('container'),
  // 启用自由节点功能
  enableFreedomNode: true,
  // 自由节点配置
  freedomNodeConfig: {
    // ... 配置项
  }
})
```

## 配置项详解

### enableFreedomNode

- **类型**: `Boolean`
- **默认值**: `false`
- **描述**: 是否启用自由节点功能（需安装 FreedomNode 插件）

```javascript
{
  enableFreedomNode: true
}
```

### freedomNodeConfig

自由节点的详细配置对象。

#### dragToBlankConvertSafeDistance

- **类型**: `Number`
- **默认值**: `150`
- **单位**: 像素
- **描述**: 拖拽转换的安全距离。当节点拖拽超过此距离时，会自动转换为自由节点。

```javascript
{
  freedomNodeConfig: {
    dragToBlankConvertSafeDistance: 200  // 增大安全距离
  }
}
```

#### snapToTreeDistance

- **类型**: `Number`
- **默认值**: `100`
- **单位**: 像素
- **描述**: 自由节点吸附回树的安全距离。当自由节点拖拽到树形节点范围此距离内时会自动吸附。

```javascript
{
  freedomNodeConfig: {
    snapToTreeDistance: 80  // 减小吸附距离
  }
}
```

#### dblclickBlankCreateFreedom

- **类型**: `Boolean`
- **默认值**: `true`
- **描述**: 是否允许双击空白画布创建自由节点

```javascript
{
  freedomNodeConfig: {
    dblclickBlankCreateFreedom: false  // 禁用双击创建
  }
}
```

#### defaultFreedomNodeText

- **类型**: `String`
- **默认值**: `'自由节点'`
- **描述**: 新创建自由节点的默认文本内容

```javascript
{
  freedomNodeConfig: {
    defaultFreedomNodeText: 'New Free Node'
  }
}
```

#### defaultFreedomNodeLayout

- **类型**: `String | null`
- **默认值**: `null`
- **可选值**: `'logicalStructure'`, `'mindMap'`, `'catalogOrganization'`, `'organizationStructure'`, `'timeline'`, `'timeline2'`, `'fishbone'`, `'verticalTimeline'`, `null`
- **描述**: 自由节点默认使用的布局类型。如果为 `null`，则使用主树的布局类型。

```javascript
{
  freedomNodeConfig: {
    defaultFreedomNodeLayout: 'mindMap'  // 自由节点使用思维导图布局
  }
}
```

#### enableFreedomNodeDrag

- **类型**: `Boolean`
- **默认值**: `true`
- **描述**: 是否允许自由节点拖拽移动

```javascript
{
  freedomNodeConfig: {
    enableFreedomNodeDrag: false  // 禁止拖拽自由节点
  }
}
```

#### convertToFreedomIncludeMode

- **类型**: `String`
- **默认值**: `'currentOnly'`
- **可选值**:
  - `'currentOnly'`: 仅转换当前节点及其子树
  - `'includeFollowing'`: 包含当前节点及其之后的所有兄弟节点
- **描述**: 拖拽转换时子节点的处理方式

```javascript
{
  freedomNodeConfig: {
    // 转换时包含后续兄弟节点
    convertToFreedomIncludeMode: 'includeFollowing'
  }
}
```

#### exportIncludeFreedomNodes

- **类型**: `Boolean`
- **默认值**: `true`
- **描述**: 导出图片、SVG、PDF 时是否包含自由节点

```javascript
{
  freedomNodeConfig: {
    exportIncludeFreedomNodes: false  // 导出时排除自由节点
  }
}
```

## 数据结构

### JSON 格式

自由节点的数据以 `freeNodes` 字段存储在顶层数据结构中：

```javascript
{
  "root": {
    "data": {
      "text": "主根节点",
      "uid": "root-xxx"
    },
    "children": [
      // 主树子节点
    ]
  },
  "freeNodes": [
    {
      "id": "fn_001",  // 自由节点唯一标识
      "position": {
        "left": 1200,  // 画布绝对坐标 X
        "top": 360     // 画布绝对坐标 Y
      },
      "layout": "logicalStructure",  // 自由树的布局模式
      "root": {
        "data": {
          "text": "自由节点1",
          "uid": "free-root-xxx",
          "isFreedomNode": true  // 自由节点标识
        },
        "children": [
          // 自由树的子节点
        ]
      }
    }
  ]
}
```

### 字段说明

- **freeNodes**: 自由节点列表，可选字段，不存在时保持向后兼容
- **id**: 自由节点 ID，用于协同编辑时的稳定索引
- **position**: 自由树锚点，所有节点坐标相对此偏移
- **layout**: 自由树的布局类型，支持所有现有布局
- **root**: 标准节点数据，包含 `data` 和 `children`

## 命令 API

### CREATE_FREEDOM_NODE

创建新的自由节点

```javascript
mindMap.execCommand('CREATE_FREEDOM_NODE', {
  position: { left: 500, top: 300 },  // 必需：位置
  text: '自由主题',                    // 可选：文本
  layout: 'mindMap',                   // 可选：布局
  data: { /* 节点数据 */ },            // 可选：节点数据
  children: []                         // 可选：子节点
})
```

### CONVERT_TO_FREEDOM

将普通节点转换为自由节点

```javascript
mindMap.execCommand('CONVERT_TO_FREEDOM', node, position)
```

### ATTACH_FREEDOM_NODE

将自由节点吸附回树形结构

```javascript
mindMap.execCommand('ATTACH_FREEDOM_NODE', freeNodeId, targetNode, index)
```

### MOVE_FREEDOM_NODE

移动自由节点位置

```javascript
mindMap.execCommand('MOVE_FREEDOM_NODE', freeNodeId, deltaX, deltaY)
```

### REMOVE_FREEDOM_NODE

删除自由节点

```javascript
mindMap.execCommand('REMOVE_FREEDOM_NODE', freeNodeId)
```

## 事件系统

### freedom_node_created

自由节点创建完成时触发

```javascript
mindMap.on('freedom_node_created', (freeNode) => {
  console.log('创建自由节点:', freeNode.id, freeNode.position)
})
```

### node_converted_to_freedom

节点转换为自由节点时触发

```javascript
mindMap.on('node_converted_to_freedom', (node, freeNodeId) => {
  console.log('节点转为自由节点:', node.getData('uid'), freeNodeId)
})
```

### freedom_node_attached

自由节点吸附回树时触发

```javascript
mindMap.on('freedom_node_attached', (freeNodeId, targetNode) => {
  console.log('自由节点吸附:', freeNodeId, targetNode.getData('uid'))
})
```

### freedom_node_moved

自由节点移动时触发

```javascript
mindMap.on('freedom_node_moved', (freeNodeId, newPosition) => {
  console.log('自由节点移动:', freeNodeId, newPosition)
})
```

### freedom_node_removed

自由节点删除时触发

```javascript
mindMap.on('freedom_node_removed', (freeNodeId) => {
  console.log('自由节点删除:', freeNodeId)
})
```

### freedom_node_change

自由节点数据变化时触发（统一事件）

```javascript
mindMap.on('freedom_node_change', ({ type, data }) => {
  console.log('自由节点变化:', type, data)
  // type: 'created' | 'converted' | 'attached' | 'moved' | 'removed'
})
```

## 使用示例

### 基本使用

```javascript
import MindMap from 'simple-mind-map'
import FreedomNode from 'simple-mind-map/src/plugins/FreedomNode'

// 注册插件
MindMap.usePlugin(FreedomNode)

// 创建实例
const mindMap = new MindMap({
  el: document.getElementById('container'),
  enableFreedomNode: true,
  freedomNodeConfig: {
    dragToBlankConvertSafeDistance: 150,
    snapToTreeDistance: 100,
    dblclickBlankCreateFreedom: true,
    defaultFreedomNodeText: '自由节点',
    enableFreedomNodeDrag: true
  }
})

// 监听事件
mindMap.on('freedom_node_created', (freeNode) => {
  console.log('创建了自由节点:', freeNode)
})
```

### 动态配置

```javascript
// 更新配置
mindMap.updateConfig({
  freedomNodeConfig: {
    dragToBlankConvertSafeDistance: 200  // 增大安全距离
  }
})
```

### 数据导入导出

```javascript
// 导出包含自由节点的数据
const data = mindMap.getData()
// 返回格式：
// {
//   root: { /* 主树数据 */ },
//   freeNodes: [ /* 自由节点数据 */ ]
// }

// 导入数据
mindMap.setData({
  root: mainTreeData,
  freeNodes: freeNodesData
})
```

## 兼容性说明

### 向后兼容

- 旧版本数据（无 `freeNodes` 字段）可以正常加载，会被自动转换为新格式
- 新版本数据导入旧版本时，`freeNodes` 字段会被忽略，只加载主树

### 数据迁移

```javascript
// 旧版本数据
const oldData = {
  data: { text: '根节点' },
  children: [...]
}

// 自动转换为新格式
mindMap.setData(oldData)
// 内部处理后：
// {
//   root: oldData,
//   freeNodes: []
// }
```

## 注意事项

1. **插件依赖**: 必须先注册 FreedomNode 插件才能使用自由节点功能
2. **性能考虑**: 大量自由节点（>100）可能影响性能，建议合理控制数量
3. **数据持久化**: 确保保存和加载数据时包含 `freeNodes` 字段
4. **协同编辑**: 使用协同编辑功能时，需要注意自由节点的冲突处理
5. **导出功能**: 可以通过 `exportIncludeFreedomNodes` 配置控制导出时是否包含自由节点

## 最佳实践

### 1. 合理设置安全距离

```javascript
{
  freedomNodeConfig: {
    // 根据画布大小和节点密度调整
    dragToBlankConvertSafeDistance: 150,  // 适中的转换距离
    snapToTreeDistance: 100                // 适中的吸附距离
  }
}
```

### 2. 限制自由节点数量

```javascript
// 在创建前检查数量
if (mindMap.freeNode && mindMap.freeNode.freeNodeMap.size < 50) {
  mindMap.execCommand('CREATE_FREEDOM_NODE', { /* ... */ })
} else {
  console.warn('自由节点数量已达上限')
}
```

### 3. 定期清理未使用的自由节点

```javascript
// 删除不需要的自由节点
mindMap.freeNode.freeNodeMap.forEach((freeNode, id) => {
  if (shouldRemove(freeNode)) {
    mindMap.execCommand('REMOVE_FREEDOM_NODE', id)
  }
})
```

## 相关文档

- [FreedomNode 插件开发文档](./freedom-node-plugin.md)
- [自由节点技术提案](../proposals/freedom-node-plugin.md)
- [命令系统文档](./command.md)
- [事件系统文档](./event.md)
