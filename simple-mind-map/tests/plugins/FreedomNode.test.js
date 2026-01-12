/**
 * FreedomNode Plugin Unit Tests
 * 自由节点插件单元测试
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import MindMap from '../../index.js'
import FreedomNode from '../../src/plugins/FreedomNode.js'

describe('FreedomNode Plugin', () => {
  let mindMap
  let container

  beforeEach(() => {
    // 创建测试容器
    container = document.createElement('div')
    container.style.width = '800px'
    container.style.height = '600px'
    document.body.appendChild(container)

    // 注册插件
    MindMap.usePlugin(FreedomNode)

    // 初始化思维导图实例
    mindMap = new MindMap({
      el: container,
      data: {
        data: { text: '根节点' },
        children: [
          { data: { text: '子节点1' } },
          { data: { text: '子节点2' } }
        ]
      },
      freedomNodeConfig: {
        enableFreedomNode: true,
        dragToBlankConvertSafeDistance: 150,
        snapToTreeDistance: 100
      }
    })

    // 等待初始渲染完成
    return new Promise(resolve => {
      mindMap.on('node_tree_render_end', () => {
        resolve()
      })
    })
  })

  afterEach(() => {
    // 清理
    if (mindMap) {
      mindMap.destroy()
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  describe('插件初始化', () => {
    test('应该成功挂载到 mindMap.freeNode', () => {
      expect(mindMap.freeNode).toBeDefined()
      expect(mindMap.freeNode).toBeInstanceOf(FreedomNode)
    })

    test('应该正确初始化配置选项', () => {
      expect(mindMap.freeNode.options.enableFreedomNode).toBe(true)
      expect(mindMap.freeNode.options.dragToBlankConvertSafeDistance).toBe(150)
      expect(mindMap.freeNode.options.snapToTreeDistance).toBe(100)
    })

    test('应该注册所有必需的命令', () => {
      expect(mindMap.command.commands.CREATE_FREEDOM_NODE).toBeDefined()
      expect(mindMap.command.commands.CONVERT_TO_FREEDOM).toBeDefined()
      expect(mindMap.command.commands.ATTACH_FREEDOM_NODE).toBeDefined()
      expect(mindMap.command.commands.MOVE_FREEDOM_NODE).toBeDefined()
      expect(mindMap.command.commands.REMOVE_FREEDOM_NODE).toBeDefined()
    })
  })

  describe('创建自由节点', () => {
    test('应该成功创建单个自由节点', () => {
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 500, top: 300 },
        text: '测试自由节点'
      })

      expect(freeNodeId).toBeDefined()
      expect(freeNodeId).toMatch(/^fn_/)
      expect(mindMap.freeNode.freeNodeMap.has(freeNodeId)).toBe(true)

      const freeNodeData = mindMap.freeNode.freeNodeMap.get(freeNodeId)
      expect(freeNodeData.position).toEqual({ left: 500, top: 300 })
      expect(freeNodeData.root.data.text).toBe('测试自由节点')
    })

    test('应该创建带有子节点的自由节点', () => {
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 600, top: 400 },
        text: '父节点',
        children: [
          { data: { text: '子节点A' } },
          { data: { text: '子节点B' } }
        ]
      })

      const freeNodeData = mindMap.freeNode.freeNodeMap.get(freeNodeId)
      expect(freeNodeData.root.children).toHaveLength(2)
      expect(freeNodeData.root.children[0].data.text).toBe('子节点A')
      expect(freeNodeData.root.children[1].data.text).toBe('子节点B')
    })

    test('应该使用自定义布局创建自由节点', () => {
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 700, top: 500 },
        text: '逻辑结构图',
        layout: 'logicalStructure'
      })

      const freeNodeData = mindMap.freeNode.freeNodeMap.get(freeNodeId)
      expect(freeNodeData.layout).toBe('logicalStructure')
    })

    test('应该触发 freedom_node_created 事件', (done) => {
      mindMap.on('freedom_node_created', (freeNodeData) => {
        expect(freeNodeData.id).toMatch(/^fn_/)
        expect(freeNodeData.position).toEqual({ left: 800, top: 200 })
        done()
      })

      mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 800, top: 200 },
        text: '事件测试'
      })
    })
  })

  describe('节点转自由节点', () => {
    test('应该成功将普通节点转为自由节点', () => {
      const node = mindMap.renderer.root.children[0]
      const originalText = node.getData('text')
      const originalUid = node.getData('uid')

      const freeNodeId = mindMap.execCommand('CONVERT_TO_FREEDOM', node, {
        left: 1000,
        top: 500
      })

      expect(freeNodeId).toBeDefined()
      expect(mindMap.freeNode.freeNodeMap.has(freeNodeId)).toBe(true)

      const freeNodeData = mindMap.freeNode.freeNodeMap.get(freeNodeId)
      expect(freeNodeData.root.data.text).toBe(originalText)
      expect(freeNodeData.root.data.isFreedomNode).toBe(true)
      expect(freeNodeData.position).toEqual({ left: 1000, top: 500 })
    })

    test('应该保留子节点树结构', () => {
      // 创建带子节点的节点
      const parentNode = mindMap.renderer.root.children[0]
      mindMap.execCommand('INSERT_CHILD_NODE', parentNode, {
        data: { text: '子节点' }
      })

      const childrenCount = parentNode.children.length

      // 转为自由节点
      const freeNodeId = mindMap.execCommand('CONVERT_TO_FREEDOM', parentNode, {
        left: 1100,
        top: 600
      })

      const freeNodeData = mindMap.freeNode.freeNodeMap.get(freeNodeId)
      expect(freeNodeData.root.children).toHaveLength(childrenCount)
    })

    test('不应该允许转换根节点', () => {
      const rootNode = mindMap.renderer.root
      const freeNodeId = mindMap.execCommand('CONVERT_TO_FREEDOM', rootNode, {
        left: 500,
        top: 500
      })

      expect(freeNodeId).toBeNull()
    })

    test('应该触发 node_converted_to_freedom 事件', (done) => {
      const node = mindMap.renderer.root.children[0]

      mindMap.on('node_converted_to_freedom', (originalNode, freeNodeId) => {
        expect(originalNode).toBe(node)
        expect(freeNodeId).toMatch(/^fn_/)
        done()
      })

      mindMap.execCommand('CONVERT_TO_FREEDOM', node, { left: 900, top: 400 })
    })
  })

  describe('自由节点吸附回树', () => {
    test('应该成功将自由节点吸附为子节点', () => {
      // 创建自由节点
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 500, top: 300 },
        text: '待吸附节点'
      })

      const targetNode = mindMap.renderer.root
      const originalChildrenCount = targetNode.children.length

      // 吸附回树
      mindMap.execCommand('ATTACH_FREEDOM_NODE', freeNodeId, targetNode, 0)

      expect(mindMap.freeNode.freeNodeMap.has(freeNodeId)).toBe(false)
      expect(targetNode.children.length).toBe(originalChildrenCount + 1)
      expect(targetNode.children[0].getData('text')).toBe('待吸附节点')
      expect(targetNode.children[0].getData('isFreedomNode')).toBeUndefined()
    })

    test('应该支持指定插入位置', () => {
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 600, top: 400 },
        text: '插入到中间'
      })

      const targetNode = mindMap.renderer.root
      const insertIndex = 1

      mindMap.execCommand('ATTACH_FREEDOM_NODE', freeNodeId, targetNode, insertIndex)

      expect(targetNode.children[insertIndex].getData('text')).toBe('插入到中间')
    })

    test('应该保留子树结构', () => {
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 700, top: 500 },
        text: '带子树的节点',
        children: [
          { data: { text: '子节点1' } },
          { data: { text: '子节点2' } }
        ]
      })

      const targetNode = mindMap.renderer.root
      mindMap.execCommand('ATTACH_FREEDOM_NODE', freeNodeId, targetNode)

      const attachedNode = targetNode.children.find(
        child => child.getData('text') === '带子树的节点'
      )
      expect(attachedNode.children).toHaveLength(2)
    })

    test('应该触发 freedom_node_attached 事件', (done) => {
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 800, top: 600 },
        text: '事件测试'
      })

      const targetNode = mindMap.renderer.root

      mindMap.on('freedom_node_attached', (id, target) => {
        expect(id).toBe(freeNodeId)
        expect(target).toBe(targetNode)
        done()
      })

      mindMap.execCommand('ATTACH_FREEDOM_NODE', freeNodeId, targetNode)
    })
  })

  describe('移动自由节点', () => {
    test('应该成功移动自由节点', () => {
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 500, top: 300 },
        text: '可移动节点'
      })

      mindMap.execCommand('MOVE_FREEDOM_NODE', freeNodeId, 50, -30)

      const freeNodeData = mindMap.freeNode.freeNodeMap.get(freeNodeId)
      expect(freeNodeData.position).toEqual({ left: 550, top: 270 })
    })

    test('应该支持连续移动', () => {
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 100, top: 100 },
        text: '连续移动'
      })

      mindMap.execCommand('MOVE_FREEDOM_NODE', freeNodeId, 10, 20)
      mindMap.execCommand('MOVE_FREEDOM_NODE', freeNodeId, 30, 40)

      const freeNodeData = mindMap.freeNode.freeNodeMap.get(freeNodeId)
      expect(freeNodeData.position).toEqual({ left: 140, top: 160 })
    })

    test('应该触发 freedom_node_moved 事件', (done) => {
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 200, top: 200 },
        text: '移动事件测试'
      })

      mindMap.on('freedom_node_moved', (id, newPosition) => {
        expect(id).toBe(freeNodeId)
        expect(newPosition).toEqual({ left: 250, top: 180 })
        done()
      })

      mindMap.execCommand('MOVE_FREEDOM_NODE', freeNodeId, 50, -20)
    })
  })

  describe('删除自由节点', () => {
    test('应该成功删除自由节点', () => {
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 500, top: 300 },
        text: '待删除节点'
      })

      expect(mindMap.freeNode.freeNodeMap.has(freeNodeId)).toBe(true)

      mindMap.execCommand('REMOVE_FREEDOM_NODE', freeNodeId)

      expect(mindMap.freeNode.freeNodeMap.has(freeNodeId)).toBe(false)
    })

    test('应该触发 freedom_node_removed 事件', (done) => {
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 600, top: 400 },
        text: '删除事件测试'
      })

      mindMap.on('freedom_node_removed', (id) => {
        expect(id).toBe(freeNodeId)
        done()
      })

      mindMap.execCommand('REMOVE_FREEDOM_NODE', freeNodeId)
    })
  })

  describe('导出导入', () => {
    test('应该成功导出自由节点数据', () => {
      mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 500, top: 300 },
        text: '导出测试1'
      })
      mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 700, top: 400 },
        text: '导出测试2'
      })

      const exportedData = mindMap.freeNode.exportFreeNodes()

      expect(Array.isArray(exportedData)).toBe(true)
      expect(exportedData).toHaveLength(2)
      expect(exportedData[0].id).toMatch(/^fn_/)
      expect(exportedData[0].position).toBeDefined()
      expect(exportedData[0].root).toBeDefined()
    })

    test('应该成功导入自由节点数据（追加模式）', () => {
      const importData = [
        {
          id: 'fn_test_001',
          position: { left: 800, top: 500 },
          layout: 'mindMap',
          root: {
            data: { text: '导入节点1', uid: 'uid-001' },
            children: []
          }
        },
        {
          id: 'fn_test_002',
          position: { left: 900, top: 600 },
          layout: 'logicalStructure',
          root: {
            data: { text: '导入节点2', uid: 'uid-002' },
            children: []
          }
        }
      ]

      mindMap.freeNode.importFreeNodes(importData, { mode: 'append' })

      expect(mindMap.freeNode.freeNodeMap.size).toBe(2)
      expect(mindMap.freeNode.freeNodeMap.has('fn_test_001')).toBe(true)
      expect(mindMap.freeNode.freeNodeMap.has('fn_test_002')).toBe(true)
    })

    test('应该成功导入自由节点数据（替换模式）', () => {
      mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 100, top: 100 },
        text: '旧节点'
      })

      const importData = [
        {
          id: 'fn_test_003',
          position: { left: 200, top: 200 },
          layout: 'mindMap',
          root: {
            data: { text: '新节点', uid: 'uid-003' },
            children: []
          }
        }
      ]

      mindMap.freeNode.importFreeNodes(importData, { mode: 'replace' })

      expect(mindMap.freeNode.freeNodeMap.size).toBe(1)
      expect(mindMap.freeNode.freeNodeMap.has('fn_test_003')).toBe(true)
    })

    test('导出导入应保持数据完整性', () => {
      const originalData = {
        position: { left: 1000, top: 800 },
        text: '完整性测试',
        layout: 'catalogOrganization',
        children: [
          { data: { text: '子节点A' } },
          { data: { text: '子节点B' } }
        ]
      }

      mindMap.execCommand('CREATE_FREEDOM_NODE', originalData)

      const exported = mindMap.freeNode.exportFreeNodes()
      mindMap.freeNode.clear()
      mindMap.freeNode.importFreeNodes(exported)

      const reimported = mindMap.freeNode.exportFreeNodes()
      expect(reimported[0].position).toEqual(originalData.position)
      expect(reimported[0].layout).toBe(originalData.layout)
      expect(reimported[0].root.data.text).toBe(originalData.text)
      expect(reimported[0].root.children).toHaveLength(2)
    })
  })

  describe('撤销重做', () => {
    test('应该支持撤销创建自由节点', () => {
      const initialCount = mindMap.freeNode.freeNodeMap.size

      mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 500, top: 300 },
        text: '撤销测试'
      })

      expect(mindMap.freeNode.freeNodeMap.size).toBe(initialCount + 1)

      mindMap.command.back()

      expect(mindMap.freeNode.freeNodeMap.size).toBe(initialCount)
    })

    test('应该支持重做创建自由节点', () => {
      const initialCount = mindMap.freeNode.freeNodeMap.size

      mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 600, top: 400 },
        text: '重做测试'
      })

      mindMap.command.back()
      expect(mindMap.freeNode.freeNodeMap.size).toBe(initialCount)

      mindMap.command.forward()
      expect(mindMap.freeNode.freeNodeMap.size).toBe(initialCount + 1)
    })

    test('应该支持撤销删除自由节点', () => {
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 700, top: 500 },
        text: '删除撤销测试'
      })

      mindMap.execCommand('REMOVE_FREEDOM_NODE', freeNodeId)
      expect(mindMap.freeNode.freeNodeMap.has(freeNodeId)).toBe(false)

      mindMap.command.back()
      expect(mindMap.freeNode.freeNodeMap.has(freeNodeId)).toBe(true)
    })

    test('应该支持撤销移动自由节点', () => {
      const freeNodeId = mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 800, top: 600 },
        text: '移动撤销测试'
      })

      const originalPosition = { ...mindMap.freeNode.freeNodeMap.get(freeNodeId).position }

      mindMap.execCommand('MOVE_FREEDOM_NODE', freeNodeId, 100, 100)

      mindMap.command.back()

      const currentPosition = mindMap.freeNode.freeNodeMap.get(freeNodeId).position
      expect(currentPosition).toEqual(originalPosition)
    })
  })

  describe('边界情况', () => {
    test('应该处理无效的自由节点 ID', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      mindMap.execCommand('MOVE_FREEDOM_NODE', 'invalid_id', 10, 20)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Free node not found')
      )

      consoleSpy.mockRestore()
    })

    test('应该处理空数组导入', () => {
      mindMap.freeNode.importFreeNodes([])
      expect(mindMap.freeNode.freeNodeMap.size).toBe(0)
    })

    test('应该处理无效的导入数据', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      mindMap.freeNode.importFreeNodes([
        { invalid: 'data' }
      ])

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid free node data')
      )

      consoleSpy.mockRestore()
    })

    test('清空操作应该移除所有自由节点', () => {
      mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 100, top: 100 },
        text: '节点1'
      })
      mindMap.execCommand('CREATE_FREEDOM_NODE', {
        position: { left: 200, top: 200 },
        text: '节点2'
      })

      expect(mindMap.freeNode.freeNodeMap.size).toBeGreaterThan(0)

      mindMap.freeNode.clear()

      expect(mindMap.freeNode.freeNodeMap.size).toBe(0)
      expect(mindMap.freeNode.freeRootList.length).toBe(0)
    })
  })

  describe('性能测试', () => {
    test('应该高效处理批量创建', () => {
      const startTime = performance.now()

      for (let i = 0; i < 50; i++) {
        mindMap.execCommand('CREATE_FREEDOM_NODE', {
          position: { left: i * 100, top: i * 50 },
          text: `批量节点 ${i}`
        })
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(1000) // 应在1秒内完成
      expect(mindMap.freeNode.freeNodeMap.size).toBe(50)
    })

    test('应该高效处理批量移动', () => {
      const freeNodeIds = []

      for (let i = 0; i < 20; i++) {
        const id = mindMap.execCommand('CREATE_FREEDOM_NODE', {
          position: { left: i * 50, top: i * 50 },
          text: `节点 ${i}`
        })
        freeNodeIds.push(id)
      }

      const startTime = performance.now()

      freeNodeIds.forEach((id, index) => {
        mindMap.execCommand('MOVE_FREEDOM_NODE', id, index * 10, index * 5)
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(500) // 应在0.5秒内完成
    })
  })
})
