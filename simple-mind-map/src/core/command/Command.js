import {
  copyRenderTree,
  simpleDeepClone,
  throttle,
  isSameObject,
  transformTreeDataToObject
} from '../../utils'
import { ERROR_TYPES } from '../../constants/constant'
import pkg from '../../../package.json'
import { compare as jsonPatchCompare, applyPatch } from 'fast-json-patch'

//  命令类
class Command {
  //  构造函数
  constructor(opt = {}) {
    this.opt = opt
    this.mindMap = opt.mindMap
    this.commands = {}
    // 增量历史记录：存储 patches 和 inversePatches
    this.history = []
    this.activeHistoryIndex = -1 // 改为 -1，表示没有历史记录
    // 当前不可变状态（Immer frozen object）
    this.currentState = null
    // 批次操作状态
    this.batchDepth = 0 // 支持嵌套批次
    this.batchStartState = null // 批次开始时的状态快照
    // 注册快捷键
    this.registerShortcutKeys()
    // 保存原始方法引用
    this.originAddHistory = this._addHistoryImpl.bind(this)
    // 使用 throttle 包装，添加调试日志
    const throttled = throttle(
      () => {
        // 如果在批次中，跳过 throttle 触发
        if (this.batchDepth > 0) {
          // console.log('[History] >>> throttle 触发但在批次中，跳过')
          return
        }
        // console.log('[History] >>> throttle 定时器触发，执行 _addHistoryImpl')
        this._addHistoryImpl()
      },
      this.mindMap.opt.addHistoryTime,
      this
    )
    this.addHistoryThrottle = throttled
    this.addHistory = () => {
      // console.log('[History] addHistory() 被调用')
      // 批次中跳过，由 endBatch 统一处理
      if (this.batchDepth > 0) {
        // console.log('[History] 在批次中，跳过 addHistory')
        return
      }
      throttled()
    }
    // 是否暂停收集历史数据
    this.isPause = false
    // 暂存暂停期间的历史快照队列（每次异步独立记录）
    this.pendingHistoryQueue = []
  }

  // 开始批次操作：多个命令合并为一个历史记录
  startBatch() {
    if (this.batchDepth === 0) {
      // 取消待执行的 throttle，避免批次中途产生历史
      if (this.addHistoryThrottle && this.addHistoryThrottle.cancel) {
        this.addHistoryThrottle.cancel()
      }
      // 记录批次开始时的状态
      this.batchStartState = this.currentState
      // console.log('[History] 开始批次操作')
    }
    this.batchDepth++
  }

  // 结束批次操作：触发历史记录
  endBatch() {
    if (this.batchDepth <= 0) {
      console.warn('[History] endBatch 调用不匹配')
      return
    }
    this.batchDepth--
    if (this.batchDepth === 0) {
      // console.log('[History] 结束批次操作')
      this.batchStartState = null
      // 批次结束，触发 throttle（与后续 addHistory 合并）
      this.addHistoryThrottle()
    }
  }

  // 在批次中执行操作的便捷方法
  batch(fn) {
    this.startBatch()
    try {
      return fn()
    } finally {
      this.endBatch()
    }
  }

  // 暂停收集历史数据（支持嵌套调用）
  pause() {
    this.pauseCount = (this.pauseCount || 0) + 1
    this.isPause = true
  }

  // 恢复收集历史数据（支持嵌套调用）
  recovery() {
    this.pauseCount = Math.max(0, (this.pauseCount || 0) - 1)
    if (this.pauseCount === 0) {
      this.isPause = false
      if (this.pendingHistoryQueue.length > 0) {
        const queuedList = this.pendingHistoryQueue.slice()
        this.pendingHistoryQueue = []
        queuedList.forEach(queuedState => {
          this._addHistoryImpl(queuedState)
        })
      }
    }
  }

  //  清空历史数据
  clearHistory() {
    this.history = []
    this.activeHistoryIndex = -1
    this.currentState = null
    if (this.addHistoryThrottle && this.addHistoryThrottle.cancel) {
      this.addHistoryThrottle.cancel()
    }
    this.mindMap.emit('back_forward', 0, 0)
  }

  //  注册快捷键
  registerShortcutKeys() {
    this.mindMap.keyCommand.addShortcut('Control+z', () => {
      this.mindMap.execCommand('BACK')
    })
    this.mindMap.keyCommand.addShortcut('Control+y', () => {
      this.mindMap.execCommand('FORWARD')
    })
  }

  //  执行命令
  exec(name, ...args) {
    if (this.commands[name]) {
      // console.log('[Command] 执行命令:', name)
      this.commands[name].forEach(fn => {
        fn(...args)
      })
      this.mindMap.emit('afterExecCommand', name, ...args)
      if (
        ['BACK', 'FORWARD', 'SET_NODE_ACTIVE', 'CLEAR_ACTIVE_NODE'].includes(
          name
        )
      ) {
        // console.log('[Command] 跳过 addHistory (特殊命令)')
        return
      }
      // console.log('[Command] 调用 addHistory')
      this.addHistory()
    }
  }

  //  添加命令
  add(name, fn) {
    if (this.commands[name]) {
      this.commands[name].push(fn)
    } else {
      this.commands[name] = [fn]
    }
  }

  //  移除命令
  remove(name, fn) {
    if (!this.commands[name]) {
      return
    }
    if (!fn) {
      this.commands[name] = []
      delete this.commands[name]
    } else {
      let index = this.commands[name].find(item => {
        return item === fn
      })
      if (index !== -1) {
        this.commands[name].splice(index, 1)
      }
    }
  }

  //  添加回退数据（基于 Immer 增量补丁）- 实际实现
  _addHistoryImpl(nextStateRawInput) {
    if (this.mindMap.opt.readonly || this.isPause) {
      if (this.isPause) {
        const queuedState = nextStateRawInput || this.getCopyData()
        if (queuedState) {
          this.pendingHistoryQueue.push(queuedState)
          // console.log('[History] 暂存历史快照', {
          //   queueLength: this.pendingHistoryQueue.length
          // })
        }
      }
      return
    }
    this.mindMap.emit('beforeAddHistory')

    // 1. 获取当前画布数据的纯对象副本
    const nextStateRaw = nextStateRawInput || this.getCopyData()
    if (!nextStateRaw) return

    // 2. 初始化基准状态（首次调用）
    if (!this.currentState) {
      this.currentState = nextStateRaw
      // 首次不产生 patches，但需要触发事件
      // back_forward(0, 1) 表示：当前在位置 0，共 1 个状态（初始状态）
      // console.log('[History] 初始化基准状态', {
      //   childrenCount: nextStateRaw.children?.length || 0
      // })
      this.mindMap.emit('data_change', nextStateRaw)
      this.mindMap.emit('back_forward', 0, 1)
      return
    }

    // 3. 使用 fast-json-patch 生成增量补丁
    const stripSmmVersion = data => {
      if (!data || !Object.prototype.hasOwnProperty.call(data, 'smmVersion')) {
        return data
      }
      const res = { ...data }
      delete res.smmVersion
      return res
    }
    const baseForDiff = stripSmmVersion(simpleDeepClone(this.currentState))
    const nextForDiff = stripSmmVersion(simpleDeepClone(nextStateRaw))

    // 使用 fast-json-patch 比较两个对象，生成正确的增量补丁
    const patches = jsonPatchCompare(baseForDiff, nextForDiff)

    // 4. 过滤非 UI 变化的补丁（例如 smmVersion）
    const effectivePatches = patches.filter(p => !p.path.startsWith('/smmVersion'))

    // 5. 无变化检测
    if (effectivePatches.length === 0) {
      // console.log('[History] 无变化，跳过')
      return
    }

    // 生成反向补丁（用于撤销）
    const inversePatches = jsonPatchCompare(nextForDiff, baseForDiff)
    const effectiveInversePatches = inversePatches.filter(p => !p.path.startsWith('/smmVersion'))

    // 调试：打印 patches 详情
    // console.log('[History] 检测到变化', {
    //   patchCount: effectivePatches.length,
    //   patches: effectivePatches.map(p => ({
    //     op: p.op,
    //     path: p.path,
    //     valueType: typeof p.value,
    //     valuePreview: typeof p.value === 'object'
    //       ? (p.value?.data?.text || p.value?.data?.uid || JSON.stringify(p.value).slice(0, 100))
    //       : p.value
    //   })),
    //   patchPaths: effectivePatches.map(p => p.path),
    //   patchPathsText: effectivePatches.map(p => p.path).join(','),
    //   historyIndex: this.activeHistoryIndex,
    //   historyLength: this.history.length
    // })

    // 6. 派发变更事件
    this.emitDataUpdatesEventFromPatches(effectivePatches, effectiveInversePatches)

    // 7. 删除当前指针后面的记录（处理撤销后又操作的情况）
    this.history = this.history.slice(0, this.activeHistoryIndex + 1)

    // 8. 存入历史（仅存储差异）
    this.history.push({
      patches: effectivePatches,
      inversePatches: effectiveInversePatches
    })

    // 9. 历史记录数超过最大数量
    if (this.history.length > this.mindMap.opt.maxHistoryCount) {
      this.history.shift()
      // 注意：移除最早记录后，无法回退到初始状态
    } else {
      this.activeHistoryIndex++
    }

    // 10. 更新当前状态为最新快照
    this.currentState = nextStateRaw

    this.mindMap.emit('data_change', simpleDeepClone(this.currentState))
    this.mindMap.emit(
      'back_forward',
      this.activeHistoryIndex + 1, // +1 是因为 activeHistoryIndex 从 -1 开始
      this.history.length + 1 // +1 是因为 history 存储的是变化，状态数 = 变化数 + 1
    )
  }

  //  回退（应用反向补丁）
  back(step = 1) {
    if (this.mindMap.opt.readonly) {
      return
    }
    // 检查是否可以回退
    if (this.activeHistoryIndex < 0 || !this.currentState) {
      // console.log('[History] back: 无法回退', {
      //   activeHistoryIndex: this.activeHistoryIndex,
      //   hasCurrentState: !!this.currentState
      // })
      return
    }

    let actualStep = Math.min(step, this.activeHistoryIndex + 1)
    if (actualStep <= 0) return

    this.pause()
    if (this.addHistoryThrottle && this.addHistoryThrottle.cancel) {
      this.addHistoryThrottle.cancel()
    }

    // console.log('[History] back: 开始回退', {
    //   requestedStep: step,
    //   actualStep,
    //   fromIndex: this.activeHistoryIndex
    // })

    try {
      // 循环应用反向补丁
      for (let i = 0; i < actualStep; i++) {
        const historyItem = this.history[this.activeHistoryIndex]
        if (!historyItem) break

        // console.log('[History] back: 应用反向补丁', {
        //   index: this.activeHistoryIndex,
        //   inversePatchCount: historyItem.inversePatches.length,
        //   inversePatches: historyItem.inversePatches.map(p => ({
        //     op: p.op,
        //     path: p.path
        //   }))
        // })

        // 应用反向补丁还原状态（先深拷贝再应用，避免修改原对象）
        const newState = simpleDeepClone(this.currentState)
        applyPatch(newState, historyItem.inversePatches)
        this.currentState = newState
        this.activeHistoryIndex--
      }

      this.mindMap.emit(
        'back_forward',
        this.activeHistoryIndex + 1,
        this.history.length + 1
      )

      // 返回解冻的数据副本供 Render 使用
      // 注意：data_change 事件由 Render.backForward 触发，这里不重复触发
      return simpleDeepClone(this.currentState)
    } finally {
      this.recovery()
      if (this.pendingHistoryQueue.length > 0) {
        const queuedList = this.pendingHistoryQueue.slice()
        this.pendingHistoryQueue = []
        // console.log('[History] 回退结束，处理暂存历史', {
        //   queueLength: queuedList.length
        // })
        queuedList.forEach((queuedState) => {
          // console.log('[History] 处理暂存历史', {
          //   index,
          //   total: queuedList.length
          // })
          this._addHistoryImpl(queuedState)
        })
      }
    }
  }

  //  前进（应用正向补丁）
  forward(step = 1) {
    if (this.mindMap.opt.readonly) {
      return
    }
    // 检查是否可以前进
    const len = this.history.length
    if (this.activeHistoryIndex >= len - 1 || !this.currentState) {
      return
    }

    let actualStep = Math.min(step, len - 1 - this.activeHistoryIndex)
    if (actualStep <= 0) return

    this.pause()
    if (this.addHistoryThrottle && this.addHistoryThrottle.cancel) {
      this.addHistoryThrottle.cancel()
    }

    try {
      // 循环应用正向补丁
      for (let i = 0; i < actualStep; i++) {
        const nextIndex = this.activeHistoryIndex + 1
        const historyItem = this.history[nextIndex]
        if (!historyItem) break

        // 应用正向补丁前进状态（先深拷贝再应用，避免修改原对象）
        const newState = simpleDeepClone(this.currentState)
        applyPatch(newState, historyItem.patches)
        this.currentState = newState
        this.activeHistoryIndex++
      }

      this.mindMap.emit(
        'back_forward',
        this.activeHistoryIndex + 1,
        this.history.length + 1
      )

      // 返回解冻的数据副本供 Render 使用
      // 注意：data_change 事件由 Render.backForward 触发，这里不重复触发
      return simpleDeepClone(this.currentState)
    } finally {
      this.recovery()
      if (this.pendingHistoryQueue.length > 0) {
        const queuedList = this.pendingHistoryQueue.slice()
        this.pendingHistoryQueue = []
        // console.log('[History] 前进结束，处理暂存历史', {
        //   queueLength: queuedList.length
        // })
        queuedList.forEach((queuedState) => {
          // console.log('[History] 处理暂存历史', {
          //   index,
          //   total: queuedList.length
          // })
          this._addHistoryImpl(queuedState)
        })
      }
    }
  }

  //  获取渲染树数据副本
  getCopyData() {
    if (!this.mindMap.renderer.renderTree) return null
    const res = copyRenderTree({}, this.mindMap.renderer.renderTree, true)
    res.smmVersion = pkg.version

    // 【FreedomNode 扩展】包含自由节点数据
    // 如果存在自由节点，则将其深拷贝到结果中
    if (this.mindMap.renderer.renderTree.freeNodes) {
      res.freeNodes = simpleDeepClone(this.mindMap.renderer.renderTree.freeNodes)
    }
    // 调试：打印复制的数据结构
    // const debugNodeKeys = (node, depth = 0) => {
    //   if (depth > 1) return null // 只打印前两层
    //   const keys = Object.keys(node).filter(k => !['data', 'children'].includes(k))
    //   return {
    //     extraKeys: keys,
    //     extraKeysText: keys.join(','),
    //     hasInserting: 'inserting' in node,
    //     childrenCount: node.children?.length || 0,
    //     children: node.children?.map(c => debugNodeKeys(c, depth + 1)).filter(Boolean)
    //   }
    // }
    // console.log('[History] getCopyData 数据结构', debugNodeKeys(res))

    return res
  }

  // 移除节点数据中的uid
  removeDataUid(data) {
    data = simpleDeepClone(data)
    let walk = root => {
      delete root.data.uid
      if (root.children && root.children.length > 0) {
        root.children.forEach(item => {
          walk(item)
        })
      }
    }
    walk(data)
    return data
  }

  // 基于 JSON patches 派发思维导图更新明细事件
  emitDataUpdatesEventFromPatches(patches, inversePatches) {
    try {
      const eventName = 'data_change_detail'
      const count = this.mindMap.event.listenerCount(eventName)
      if (count <= 0 || !patches || patches.length === 0) return

      // 将 fast-json-patch 格式转换为 data_change_detail 事件格式
      // fast-json-patch 格式: { op: 'add'|'remove'|'replace', path: '/children/0', value: ... }
      const res = []
      const processedPaths = new Set()

      patches.forEach(patch => {
        const { op, path, value } = patch
        // path 已经是字符串格式

        // 避免重复处理同一路径
        if (processedPaths.has(path)) return
        processedPaths.add(path)

        // 根据操作类型映射
        let action
        switch (op) {
          case 'add':
            action = 'create'
            break
          case 'remove':
            action = 'delete'
            break
          case 'replace':
            action = 'update'
            break
          default:
            return
        }

        // 构建事件数据
        const eventData = {
          action,
          path: path.split('/').filter(Boolean), // 转换为数组格式
          data: value
        }

        // 对于更新操作，尝试找到对应的旧值
        if (action === 'update' && inversePatches) {
          const inversePatch = inversePatches.find(ip => ip.path === path)
          if (inversePatch) {
            eventData.oldData = inversePatch.value
          }
        }

        res.push(eventData)
      })

      if (res.length > 0) {
        this.mindMap.emit(eventName, res)
      }
    } catch (error) {
      this.mindMap.opt.errorHandler(
        ERROR_TYPES.DATA_CHANGE_DETAIL_EVENT_ERROR,
        error
      )
    }
  }

  // 派发思维导图更新明细事件（旧版，基于 JSON 字符串比较，保留向后兼容）
  emitDataUpdatesEvent(lastDataStr, dataStr) {
    try {
      // 如果data_change_detail没有监听者，那么不进行计算，节省性能
      const eventName = 'data_change_detail'
      const count = this.mindMap.event.listenerCount(eventName)
      if (count > 0 && lastDataStr && dataStr) {
        const lastData = JSON.parse(lastDataStr)
        const data = JSON.parse(dataStr)
        const lastDataObj = simpleDeepClone(transformTreeDataToObject(lastData))
        const dataObj = simpleDeepClone(transformTreeDataToObject(data))
        const res = []
        const walkReplace = (root, obj) => {
          if (root.children && root.children.length > 0) {
            root.children.forEach((childUid, index) => {
              root.children[index] =
                typeof childUid === 'string'
                  ? obj[childUid]
                  : obj[childUid.data.uid]
              walkReplace(root.children[index], obj)
            })
          }
          return root
        }
        // 找出新增的或修改的
        Object.keys(dataObj).forEach(uid => {
          // 新增的或已经存在的，如果数据发生了改变
          if (!lastDataObj[uid]) {
            res.push({
              action: 'create',
              data: walkReplace(dataObj[uid], dataObj)
            })
          } else if (!isSameObject(lastDataObj[uid], dataObj[uid])) {
            res.push({
              action: 'update',
              oldData: walkReplace(lastDataObj[uid], lastDataObj),
              data: walkReplace(dataObj[uid], dataObj)
            })
          }
        })
        // 找出删除的
        Object.keys(lastDataObj).forEach(uid => {
          if (!dataObj[uid]) {
            res.push({
              action: 'delete',
              data: walkReplace(lastDataObj[uid], lastDataObj)
            })
          }
        })
        this.mindMap.emit(eventName, res)
      }
    } catch (error) {
      this.mindMap.opt.errorHandler(
        ERROR_TYPES.DATA_CHANGE_DETAIL_EVENT_ERROR,
        error
      )
    }
  }
}

export default Command
