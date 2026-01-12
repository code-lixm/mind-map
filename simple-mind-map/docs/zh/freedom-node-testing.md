# 自由节点功能集成测试指南

本文档提供 FreedomNode 插件的集成测试场景、测试用例和性能测试指南。

## 目录

- [测试环境准备](#测试环境准备)
- [拖拽转换测试](#拖拽转换测试)
- [拖拽吸附测试](#拖拽吸附测试)
- [关联线测试](#关联线测试)
- [框选测试](#框选测试)
- [导出测试](#导出测试)
- [性能测试指南](#性能测试指南)
- [自动化测试脚本](#自动化测试脚本)

---

## 测试环境准备

### 1. 安装依赖

```bash
npm install --save-dev @testing-library/dom @testing-library/user-event
```

### 2. 初始化测试实例

```javascript
import MindMap from 'simple-mind-map'
import FreedomNode from 'simple-mind-map/src/plugins/FreedomNode'
import Drag from 'simple-mind-map/src/plugins/Drag'
import Select from 'simple-mind-map/src/plugins/Select'
import AssociativeLine from 'simple-mind-map/src/plugins/AssociativeLine'

// 注册必要插件
MindMap.usePlugin(FreedomNode)
MindMap.usePlugin(Drag)
MindMap.usePlugin(Select)
MindMap.usePlugin(AssociativeLine)

// 创建测试实例
const mindMap = new MindMap({
  el: document.getElementById('test-container'),
  data: {
    data: { text: '测试根节点' },
    children: [
      { data: { text: '子节点1' } },
      { data: { text: '子节点2' } },
      { data: { text: '子节点3' } }
    ]
  },
  freedomNodeConfig: {
    enableFreedomNode: true,
    dragToBlankConvertSafeDistance: 150,
    snapToTreeDistance: 100,
    enableFreedomNodeDrag: true
  }
})
```

---

## 拖拽转换测试

### 测试场景 1: 普通节点转自由节点

**目标**: 验证拖拽节点超出安全距离后自动转为自由节点

**前置条件**:
- 思维导图已渲染完成
- 存在至少一个非根节点

**测试步骤**:

1. **选择目标节点**
   ```javascript
   const targetNode = mindMap.renderer.root.children[0]
   const originalText = targetNode.getData('text')
   const originalParent = targetNode.parent
   ```

2. **模拟拖拽操作**
   ```javascript
   // 模拟鼠标按下
   const mousedownEvent = new MouseEvent('mousedown', {
     clientX: targetNode.left,
     clientY: targetNode.top,
     bubbles: true
   })
   targetNode._el.dispatchEvent(mousedownEvent)

   // 模拟拖拽到空白区域（超出安全距离）
   const mousemoveEvent = new MouseEvent('mousemove', {
     clientX: targetNode.left + 200, // 超出 150px 安全距离
     clientY: targetNode.top + 200,
     bubbles: true
   })
   document.dispatchEvent(mousemoveEvent)

   // 模拟鼠标释放
   const mouseupEvent = new MouseEvent('mouseup', {
     clientX: targetNode.left + 200,
     clientY: targetNode.top + 200,
     bubbles: true
   })
   document.dispatchEvent(mouseupEvent)
   ```

3. **验证结果**
   ```javascript
   // 检查原节点是否从树中移除
   expect(originalParent.children).not.toContain(targetNode)

   // 检查是否创建了自由节点
   expect(mindMap.freeNode.freeNodeMap.size).toBeGreaterThan(0)

   // 查找创建的自由节点
   const freeNodes = mindMap.freeNode.exportFreeNodes()
   const convertedNode = freeNodes.find(
     fn => fn.root.data.text === originalText
   )

   expect(convertedNode).toBeDefined()
   expect(convertedNode.root.data.isFreedomNode).toBe(true)
   ```

**预期结果**:
- ✅ 原节点从父节点子节点列表中移除
- ✅ 创建新的自由节点，文本内容一致
- ✅ 自由节点位置为拖拽终点坐标
- ✅ 自由节点标记 `isFreedomNode: true`
- ✅ 触发 `node_converted_to_freedom` 事件

---

### 测试场景 2: 带子树节点转自由节点

**目标**: 验证转换节点时保留完整子树结构

**测试步骤**:

1. **创建带子节点的测试节点**
   ```javascript
   const parentNode = mindMap.renderer.root.children[0]

   mindMap.execCommand('INSERT_CHILD_NODE', parentNode, {
     data: { text: '子节点A' }
   })
   mindMap.execCommand('INSERT_CHILD_NODE', parentNode, {
     data: { text: '子节点B' }
   })

   const childrenCount = parentNode.children.length
   ```

2. **执行拖拽转换**
   ```javascript
   // 拖拽父节点超出安全距离
   // ... (同测试场景1)
   ```

3. **验证子树完整性**
   ```javascript
   const freeNodes = mindMap.freeNode.exportFreeNodes()
   const convertedNode = freeNodes[freeNodes.length - 1]

   expect(convertedNode.root.children).toHaveLength(childrenCount)
   expect(convertedNode.root.children[0].data.text).toBe('子节点A')
   expect(convertedNode.root.children[1].data.text).toBe('子节点B')
   ```

**预期结果**:
- ✅ 子节点数量不变
- ✅ 子节点数据完整保留
- ✅ 子树层级结构正确

---

### 测试场景 3: 安全距离边界测试

**目标**: 验证在安全距离内不转换，超出安全距离才转换

**测试用例**:

| 拖拽距离 | 预期行为 |
|---------|---------|
| 50px | 不转换，设置 `customLeft/customTop` |
| 149px | 不转换 |
| 150px | 临界点，应转换 |
| 200px | 转换为自由节点 |

```javascript
describe('安全距离边界测试', () => {
  const testCases = [
    { distance: 50, shouldConvert: false },
    { distance: 149, shouldConvert: false },
    { distance: 150, shouldConvert: true },
    { distance: 200, shouldConvert: true }
  ]

  testCases.forEach(({ distance, shouldConvert }) => {
    test(`拖拽 ${distance}px 应该 ${shouldConvert ? '转换' : '不转换'}`, () => {
      const node = mindMap.renderer.root.children[0]
      const initialFreeNodeCount = mindMap.freeNode.freeNodeMap.size

      // 模拟拖拽 distance 距离
      dragNode(node, distance, distance)

      if (shouldConvert) {
        expect(mindMap.freeNode.freeNodeMap.size).toBe(initialFreeNodeCount + 1)
      } else {
        expect(mindMap.freeNode.freeNodeMap.size).toBe(initialFreeNodeCount)
        expect(node.getData('customLeft')).toBeDefined()
      }
    })
  })
})
```

---

## 拖拽吸附测试

### 测试场景 4: 自由节点吸附回树形结构

**目标**: 验证自由节点拖入树形节点附近自动吸附

**测试步骤**:

1. **创建自由节点**
   ```javascript
   const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
     position: { left: 1000, top: 500 },
     text: '待吸附节点'
   })
   ```

2. **模拟拖拽到树形节点附近**
   ```javascript
   const targetNode = mindMap.renderer.root.children[0]
   const targetX = targetNode.left + 50 // 在 100px 吸附距离内
   const targetY = targetNode.top + 50

   // 获取自由节点根实例
   const freeRootNode = mindMap.freeNode.findFreeNodeInstance(freeNodeId)

   // 模拟拖拽
   dragNode(freeRootNode, targetX, targetY)
   ```

3. **验证吸附结果**
   ```javascript
   // 检查自由节点是否被移除
   expect(mindMap.freeNode.freeNodeMap.has(freeNodeId)).toBe(false)

   // 检查是否成为目标节点的子节点
   const attachedNode = targetNode.children.find(
     child => child.getData('text') === '待吸附节点'
   )

   expect(attachedNode).toBeDefined()
   expect(attachedNode.getData('isFreedomNode')).toBeUndefined()
   ```

**预期结果**:
- ✅ 自由节点从 `freeNodeMap` 中移除
- ✅ 节点添加到目标节点的子节点列表
- ✅ 移除 `isFreedomNode` 标记
- ✅ 触发 `freedom_node_attached` 事件
- ✅ 节点位置重新计算，符合布局算法

---

### 测试场景 5: 吸附距离阈值测试

**目标**: 验证在吸附距离内才吸附，超出距离则移动自由节点

```javascript
describe('吸附距离阈值测试', () => {
  test('在吸附距离内应该吸附', () => {
    const freeNodeId = createTestFreeNode()
    const targetNode = mindMap.renderer.root.children[0]

    dragFreeNodeToPosition(freeNodeId,
      targetNode.left + 80, // < 100px
      targetNode.top + 80
    )

    expect(mindMap.freeNode.freeNodeMap.has(freeNodeId)).toBe(false)
  })

  test('超出吸附距离应该移动而不吸附', () => {
    const freeNodeId = createTestFreeNode()
    const targetNode = mindMap.renderer.root.children[0]

    dragFreeNodeToPosition(freeNodeId,
      targetNode.left + 120, // > 100px
      targetNode.top + 120
    )

    expect(mindMap.freeNode.freeNodeMap.has(freeNodeId)).toBe(true)
    const freeNode = mindMap.freeNode.freeNodeMap.get(freeNodeId)
    expect(freeNode.position.left).toBeCloseTo(targetNode.left + 120, 1)
  })
})
```

---

## 关联线测试

### 测试场景 6: 树形节点连接自由节点

**目标**: 验证关联线正确连接树形节点和自由节点

**测试步骤**:

1. **创建自由节点和关联线**
   ```javascript
   // 创建自由节点
   const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
     position: { left: 800, top: 400 },
     text: '关联目标'
   })

   // 获取树形节点
   const sourceNode = mindMap.renderer.root.children[0]
   const freeRootNode = mindMap.freeNode.findFreeNodeInstance(freeNodeId)

   // 创建关联线
   mindMap.execCommand('ADD_ASSOCIATIVE_LINE', {
     from: sourceNode.getData('uid'),
     to: freeRootNode.getData('uid')
   })
   ```

2. **验证关联线渲染**
   ```javascript
   // 检查关联线数据
   const sourceData = sourceNode.nodeData.data
   expect(sourceData.associativeLineTargets).toContain(
     freeRootNode.getData('uid')
   )

   // 检查关联线渲染
   const associativeLine = mindMap.associativeLine.getLine(
     sourceNode.getData('uid'),
     freeRootNode.getData('uid')
   )

   expect(associativeLine).toBeDefined()
   expect(associativeLine.path).toBeDefined()
   ```

3. **验证关联线坐标**
   ```javascript
   const lineCoords = associativeLine.getCoordinates()

   // 起点应该在源节点
   expect(lineCoords.start.x).toBeCloseTo(sourceNode.left + sourceNode.width / 2, 1)
   expect(lineCoords.start.y).toBeCloseTo(sourceNode.top + sourceNode.height / 2, 1)

   // 终点应该在自由节点
   expect(lineCoords.end.x).toBeCloseTo(freeRootNode.left + freeRootNode.width / 2, 1)
   expect(lineCoords.end.y).toBeCloseTo(freeRootNode.top + freeRootNode.height / 2, 1)
   ```

**预期结果**:
- ✅ 关联线正确渲染
- ✅ 关联线起点和终点坐标正确
- ✅ 移动节点时关联线自动更新

---

### 测试场景 7: 自由节点之间的关联线

**目标**: 验证两个自由节点之间的关联线

```javascript
test('自由节点之间应该支持关联线', () => {
  const freeNode1Id = mindMap.execCommand('CREATE_FREEDOM_NODE', {
    position: { left: 600, top: 300 },
    text: '自由节点1'
  })

  const freeNode2Id = mindMap.execCommand('CREATE_FREEDOM_NODE', {
    position: { left: 900, top: 500 },
    text: '自由节点2'
  })

  const freeRoot1 = mindMap.freeNode.findFreeNodeInstance(freeNode1Id)
  const freeRoot2 = mindMap.freeNode.findFreeNodeInstance(freeNode2Id)

  mindMap.execCommand('ADD_ASSOCIATIVE_LINE', {
    from: freeRoot1.getData('uid'),
    to: freeRoot2.getData('uid')
  })

  const line = mindMap.associativeLine.getLine(
    freeRoot1.getData('uid'),
    freeRoot2.getData('uid')
  )

  expect(line).toBeDefined()
  expect(line.isVisible()).toBe(true)
})
```

---

## 框选测试

### 测试场景 8: 框选包含自由节点

**目标**: 验证框选操作能够选中自由节点

**测试步骤**:

1. **创建测试场景**
   ```javascript
   // 创建多个自由节点
   const freeNode1Id = mindMap.execCommand('CREATE_FREEDOM_NODE', {
     position: { left: 500, top: 300 },
     text: '自由节点1'
   })

   const freeNode2Id = mindMap.execCommand('CREATE_FREEDOM_NODE', {
     position: { left: 700, top: 400 },
     text: '自由节点2'
   })

   const freeNode3Id = mindMap.execCommand('CREATE_FREEDOM_NODE', {
     position: { left: 900, top: 500 },
     text: '自由节点3'
   })
   ```

2. **模拟框选操作**
   ```javascript
   // 定义选框范围（包含节点1和2，不包含节点3）
   const selectRect = {
     left: 450,
     top: 250,
     right: 800,
     bottom: 500
   }

   // 执行框选
   mindMap.select.doSelect(selectRect)
   ```

3. **验证选中结果**
   ```javascript
   const selectedNodes = mindMap.renderer.activeNodeList

   // 检查选中的节点
   const selectedTexts = selectedNodes.map(node => node.getData('text'))

   expect(selectedTexts).toContain('自由节点1')
   expect(selectedTexts).toContain('自由节点2')
   expect(selectedTexts).not.toContain('自由节点3')
   ```

**预期结果**:
- ✅ 选框范围内的自由节点被选中
- ✅ 选框外的自由节点不被选中
- ✅ 同时选中树形节点和自由节点

---

### 测试场景 9: 混合选择

**目标**: 验证同时选中树形节点和自由节点

```javascript
test('应该支持同时选中树形节点和自由节点', () => {
  const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
    position: { left: 600, top: 400 },
    text: '混合选择测试'
  })

  // 定义包含根节点子节点和自由节点的选框
  const selectRect = {
    left: 0,
    top: 0,
    right: 1000,
    bottom: 600
  }

  mindMap.select.doSelect(selectRect)

  const selectedNodes = mindMap.renderer.activeNodeList

  // 应该包含树形节点
  const hasTreeNode = selectedNodes.some(
    node => !node.getData('isFreedomNode')
  )

  // 应该包含自由节点
  const hasFreeNode = selectedNodes.some(
    node => node.getData('isFreedomNode')
  )

  expect(hasTreeNode).toBe(true)
  expect(hasFreeNode).toBe(true)
})
```

---

## 导出测试

### 测试场景 10: JSON 数据导出

**目标**: 验证导出的 JSON 数据包含自由节点

**测试步骤**:

1. **创建测试数据**
   ```javascript
   // 创建自由节点
   mindMap.execCommand('CREATE_FREEDOM_NODE', {
     position: { left: 500, top: 300 },
     text: '导出测试1',
     children: [
       { data: { text: '子节点A' } }
     ]
   })

   mindMap.execCommand('CREATE_FREEDOM_NODE', {
     position: { left: 800, top: 500 },
     text: '导出测试2',
     layout: 'logicalStructure'
   })
   ```

2. **导出数据**
   ```javascript
   const exportedData = mindMap.getData({
     withConfig: true
   })
   ```

3. **验证导出格式**
   ```javascript
   // 检查数据结构
   expect(exportedData).toHaveProperty('root')
   expect(exportedData).toHaveProperty('freeNodes')

   // 检查自由节点数据
   expect(Array.isArray(exportedData.freeNodes)).toBe(true)
   expect(exportedData.freeNodes).toHaveLength(2)

   // 检查第一个自由节点
   const freeNode1 = exportedData.freeNodes[0]
   expect(freeNode1).toHaveProperty('id')
   expect(freeNode1).toHaveProperty('position')
   expect(freeNode1).toHaveProperty('layout')
   expect(freeNode1).toHaveProperty('root')

   expect(freeNode1.root.data.text).toBe('导出测试1')
   expect(freeNode1.root.children).toHaveLength(1)

   // 检查第二个自由节点
   const freeNode2 = exportedData.freeNodes[1]
   expect(freeNode2.layout).toBe('logicalStructure')
   ```

**预期结果**:
- ✅ 导出数据包含 `freeNodes` 字段
- ✅ 自由节点数据完整（id、position、layout、root）
- ✅ 子节点树结构完整

---

### 测试场景 11: PNG/SVG 图片导出

**目标**: 验证图片导出包含自由节点

```javascript
test('PNG 导出应该包含自由节点', async () => {
  // 创建自由节点
  mindMap.execCommand('CREATE_FREEDOM_NODE', {
    position: { left: 1000, top: 500 },
    text: '图片导出测试'
  })

  // 导出为 PNG
  const imageData = await mindMap.export('png', true, '测试导图')

  // 验证图片包含自由节点区域
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = new Image()

  img.onload = () => {
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    // 检查自由节点位置的像素不为空白
    const freeNodeRect = mindMap.freeNode.getFreeNodesBoundingRect()
    const imageData = ctx.getImageData(
      freeNodeRect.left,
      freeNodeRect.top,
      freeNodeRect.width,
      freeNodeRect.height
    )

    const hasNonWhitePixel = Array.from(imageData.data).some((value, index) => {
      if (index % 4 === 3) return false // 跳过 alpha 通道
      return value < 250 // 非白色像素
    })

    expect(hasNonWhitePixel).toBe(true)
  }

  img.src = imageData
})
```

---

## 性能测试指南

### 测试场景 12: 大量自由节点性能

**目标**: 验证系统在大量自由节点场景下的性能

#### 12.1 批量创建性能

```javascript
test('批量创建 50 个自由节点应在 1 秒内完成', () => {
  const startTime = performance.now()

  for (let i = 0; i < 50; i++) {
    mindMap.execCommand('CREATE_FREEDOM_NODE', {
      position: { left: Math.random() * 2000, top: Math.random() * 1500 },
      text: `性能测试节点 ${i}`
    })
  }

  const endTime = performance.now()
  const duration = endTime - startTime

  console.log(`创建 50 个自由节点耗时: ${duration.toFixed(2)}ms`)

  expect(duration).toBeLessThan(1000)
  expect(mindMap.freeNode.freeNodeMap.size).toBe(50)
})
```

**性能基准**:
| 节点数量 | 创建耗时 | 目标 |
|---------|---------|------|
| 10 | < 200ms | ✅ |
| 50 | < 1s | ✅ |
| 100 | < 3s | ⚠️ 可能需要优化 |

---

#### 12.2 渲染性能测试

```javascript
test('渲染 50 个自由节点帧率应保持在 30 FPS 以上', async () => {
  // 创建 50 个自由节点
  for (let i = 0; i < 50; i++) {
    mindMap.execCommand('CREATE_FREEDOM_NODE', {
      position: { left: i * 100, top: (i % 10) * 150 },
      text: `节点 ${i}`,
      children: [
        { data: { text: `子节点 ${i}-1` } },
        { data: { text: `子节点 ${i}-2` } }
      ]
    })
  }

  // 测量渲染帧率
  let frameCount = 0
  const startTime = performance.now()

  const measureFrame = () => {
    frameCount++
    if (performance.now() - startTime < 1000) {
      requestAnimationFrame(measureFrame)
    } else {
      console.log(`渲染帧率: ${frameCount} FPS`)
      expect(frameCount).toBeGreaterThanOrEqual(30)
    }
  }

  requestAnimationFrame(measureFrame)
})
```

---

#### 12.3 拖拽性能测试

```javascript
test('拖拽自由节点应保持流畅', async () => {
  const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
    position: { left: 500, top: 300 },
    text: '拖拽性能测试'
  })

  const frames = []
  let lastFrameTime = performance.now()

  // 模拟连续拖拽
  for (let i = 0; i < 60; i++) {
    const startTime = performance.now()

    mindMap.execCommand('MOVE_FREEDOM_NODE', freeNodeId, 5, 5)

    const frameTime = performance.now() - startTime
    frames.push(frameTime)
  }

  // 计算平均帧时间
  const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length

  console.log(`平均帧时间: ${avgFrameTime.toFixed(2)}ms`)
  console.log(`理论 FPS: ${(1000 / avgFrameTime).toFixed(2)}`)

  expect(avgFrameTime).toBeLessThan(33) // 30 FPS
})
```

---

### 测试场景 13: 内存占用测试

**目标**: 验证自由节点不会导致内存泄漏

```javascript
test('创建和删除自由节点不应导致内存泄漏', async () => {
  const getMemoryUsage = () => {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize
    }
    return null
  }

  // 强制垃圾回收（仅在开发环境）
  if (global.gc) {
    global.gc()
  }

  const initialMemory = getMemoryUsage()

  // 创建和删除 100 次
  for (let i = 0; i < 100; i++) {
    const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
      position: { left: Math.random() * 1000, top: Math.random() * 1000 },
      text: `内存测试 ${i}`
    })

    mindMap.execCommand('REMOVE_FREEDOM_NODE', freeNodeId)
  }

  // 强制垃圾回收
  if (global.gc) {
    global.gc()
  }

  await new Promise(resolve => setTimeout(resolve, 1000))

  const finalMemory = getMemoryUsage()

  if (initialMemory && finalMemory) {
    const memoryIncrease = finalMemory - initialMemory
    const increasePercentage = (memoryIncrease / initialMemory) * 100

    console.log(`内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    console.log(`增长百分比: ${increasePercentage.toFixed(2)}%`)

    // 内存增长不应超过 10%
    expect(increasePercentage).toBeLessThan(10)
  }
})
```

---

## 自动化测试脚本

### 完整的 E2E 测试套件

```javascript
// tests/e2e/freedom-node.e2e.test.js

import { setupTestEnvironment, teardownTestEnvironment } from './test-utils'

describe('FreedomNode E2E Tests', () => {
  let mindMap

  beforeAll(async () => {
    mindMap = await setupTestEnvironment()
  })

  afterAll(async () => {
    await teardownTestEnvironment(mindMap)
  })

  describe('完整工作流测试', () => {
    test('用户完整使用流程', async () => {
      // 1. 创建自由节点
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 800, top: 400 },
        text: '项目计划'
      })

      // 2. 添加子节点
      const freeRootNode = mindMap.freeNode.findFreeNodeInstance(freeNodeId)
      mindMap.execCommand('INSERT_CHILD_NODE', freeRootNode, {
        data: { text: '阶段一' }
      })

      // 3. 移动自由节点
      mindMap.execCommand('MOVE_FREEDOM_NODE', freeNodeId, 100, 50)

      // 4. 创建关联线
      const treeNode = mindMap.renderer.root.children[0]
      mindMap.execCommand('ADD_ASSOCIATIVE_LINE', {
        from: treeNode.getData('uid'),
        to: freeRootNode.getData('uid')
      })

      // 5. 导出数据
      const exportedData = mindMap.getData()

      // 6. 清空并重新导入
      mindMap.freeNode.clear()
      mindMap.setData(exportedData)

      // 7. 验证数据恢复
      expect(mindMap.freeNode.freeNodeMap.size).toBe(1)

      // 8. 删除自由节点
      mindMap.execCommand('REMOVE_FREEDOM_NODE', freeNodeId)
      expect(mindMap.freeNode.freeNodeMap.size).toBe(0)
    })
  })

  describe('边界情况和错误处理', () => {
    test('应该处理并发操作', async () => {
      const operations = []

      for (let i = 0; i < 10; i++) {
        operations.push(
          mindMap.execCommand('CREATE_FREEDOM_NODE', {
            position: { left: i * 100, top: i * 100 },
            text: `并发节点 ${i}`
          })
        )
      }

      await Promise.all(operations)

      expect(mindMap.freeNode.freeNodeMap.size).toBe(10)
    })

    test('应该处理极端坐标值', () => {
      const extremeCoords = [
        { left: 0, top: 0 },
        { left: -1000, top: -1000 },
        { left: 10000, top: 10000 }
      ]

      extremeCoords.forEach(coords => {
        const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
          position: coords,
          text: '极端坐标测试'
        })

        const freeNode = mindMap.freeNode.freeNodeMap.get(freeNodeId)
        expect(freeNode.position).toEqual(coords)
      })
    })
  })
})
```

---

## 测试报告模板

### 测试结果记录

```markdown
## FreedomNode 插件测试报告

**测试日期**: YYYY-MM-DD
**测试环境**: Chrome 120 / Firefox 121 / Safari 17
**测试版本**: simple-mind-map v0.14.0

### 功能测试结果

| 功能模块 | 测试用例数 | 通过 | 失败 | 通过率 |
|---------|-----------|------|------|--------|
| 创建自由节点 | 5 | 5 | 0 | 100% |
| 节点转换 | 8 | 8 | 0 | 100% |
| 拖拽吸附 | 6 | 6 | 0 | 100% |
| 关联线 | 4 | 4 | 0 | 100% |
| 框选 | 3 | 3 | 0 | 100% |
| 导出导入 | 7 | 7 | 0 | 100% |
| 撤销重做 | 4 | 4 | 0 | 100% |

### 性能测试结果

| 指标 | 目标值 | 实测值 | 状态 |
|------|--------|--------|------|
| 创建 50 个节点 | < 1s | 850ms | ✅ |
| 渲染帧率 | ≥ 30 FPS | 45 FPS | ✅ |
| 拖拽帧率 | ≥ 30 FPS | 38 FPS | ✅ |
| 导出时间 (100 节点) | < 3s | 2.1s | ✅ |
| 内存增长 | < 10% | 6.3% | ✅ |

### 已知问题

1. **问题**: 在极端缩放比例下（< 10%）自由节点渲染偶现错位
   - **严重程度**: 低
   - **复现步骤**: 缩放到 5% → 创建自由节点 → 观察位置
   - **临时方案**: 限制最小缩放比例为 10%

### 测试覆盖率

- **代码覆盖率**: 92%
- **分支覆盖率**: 88%
- **功能覆盖率**: 95%

### 建议

1. 增加移动端触摸操作测试
2. 补充协同编辑冲突测试场景
3. 添加大规模性能压力测试 (500+ 节点)
```

---

## 持续集成配置

### GitHub Actions 配置示例

```yaml
# .github/workflows/freedom-node-tests.yml

name: FreedomNode Plugin Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]

    steps:
    - uses: actions/checkout@v3

    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}

    - name: Install dependencies
      run: npm ci

    - name: Run FreedomNode tests
      run: npm run test:freedom-node

    - name: Generate coverage report
      run: npm run test:coverage

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/coverage-final.json
```

---

## 总结

本文档涵盖了 FreedomNode 插件的完整集成测试场景，包括：

- ✅ 功能测试（创建、转换、吸附、移动、删除）
- ✅ 交互测试（拖拽、框选、关联线）
- ✅ 数据测试（导出、导入、撤销重做）
- ✅ 性能测试（批量操作、渲染帧率、内存占用）
- ✅ E2E 测试（完整工作流）

建议在每次功能迭代后运行完整测试套件，确保新功能不影响现有功能的稳定性。
