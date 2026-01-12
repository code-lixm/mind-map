# FreedomNode 故障排查指南

## 🔧 已修复的关键问题

### ✅ 问题 1: 插件未注册（已修复）

**问题**: FreedomNode 插件没有在 `simple-mind-map/full.js` 中注册

**修复**:
```javascript
// 已添加导入
import FreedomNode from './src/plugins/FreedomNode.js'

// 已添加注册
MindMap.usePlugin(FreedomNode)
```

**文件**: `simple-mind-map/full.js` (第 23 行和第 58 行)

### ✅ 问题 2: 库未重新构建（已修复）

**问题**: 修改插件后需要重新构建库

**修复**: 已执行 `npm run buildLibrary`

**结果**:
- ✅ simpleMindMap.umd.min.js - 6985.31 KiB
- ✅ simpleMindMap.esm.js - 3.0mb
- ✅ simpleMindMap.esm.min.js - 1.6mb

---

## 🔍 诊断步骤

### 步骤 1: 检查插件是否加载

打开浏览器控制台 (F12)，运行：

```javascript
// 检查插件是否注册
console.log('FreedomNode plugin:', window.MindMap?.pluginNameMap?.freeNode)

// 检查 mindMap 实例
console.log('MindMap instance:', window.mindMap)

// 检查是否有 freeNode 属性
console.log('FreeNode handler:', window.mindMap?.freeNode)
```

**预期结果**:
- `FreedomNode plugin` 应该显示插件类
- `MindMap instance` 应该显示 MindMap 对象
- `FreeNode handler` 应该显示 FreedomNode 实例

### 步骤 2: 检查配置是否启用

```javascript
// 检查配置
console.log('enableFreedomNode:', window.mindMap?.opt?.enableFreedomNode)
console.log('freedomNodeConfig:', window.mindMap?.opt?.freedomNodeConfig)
```

**预期结果**:
- `enableFreedomNode` 应该为 `true`
- `freedomNodeConfig` 应该显示配置对象

**如果为 false，执行以下命令启用**:

```javascript
// 启用 FreedomNode
window.mindMap.updateConfig({
  enableFreedomNode: true,
  freedomNodeConfig: {
    dragToBlankConvertSafeDistance: 150,
    snapToTreeDistance: 100,
    dblclickBlankCreateFreedom: true,
    defaultFreedomNodeText: '自由节点',
    enableFreedomNodeDrag: true
  }
})

// 保存到 localStorage
localStorage.setItem('SIMPLE_MIND_MAP_CONFIG', JSON.stringify({
  enableFreedomNode: true,
  freedomNodeConfig: {
    dragToBlankConvertSafeDistance: 150,
    snapToTreeDistance: 100,
    dblclickBlankCreateFreedom: true,
    defaultFreedomNodeText: '自由节点',
    enableFreedomNodeDrag: true
  }
}))

// 刷新页面
location.reload()
```

### 步骤 3: 测试命令执行

```javascript
// 测试创建自由节点命令
try {
  window.mindMap.execCommand('CREATE_FREEDOM_NODE', {
    text: '测试节点',
    position: { left: 100, top: 100 }
  })
  console.log('✅ CREATE_FREEDOM_NODE 命令成功')
} catch (e) {
  console.error('❌ CREATE_FREEDOM_NODE 命令失败:', e.message)
}

// 检查自由节点列表
console.log('Free nodes:', window.mindMap?.freeNode?.freeRootList)
```

### 步骤 4: 检查事件总线

```javascript
// 测试事件总线是否工作
window.app.$bus.$on('test_event', () => {
  console.log('✅ Event bus is working')
})
window.app.$bus.$emit('test_event')

// 测试 execCommand 事件
window.app.$bus.$on('execCommand', (...args) => {
  console.log('✅ execCommand event received:', args)
})
```

### 步骤 5: 检查工具栏按钮

```javascript
// 检查工具栏按钮是否存在
const toolbarBtns = document.querySelectorAll('.toolbarBtn')
console.log('Toolbar buttons:', toolbarBtns.length)

// 查找自由节点按钮
const freedomNodeBtn = Array.from(toolbarBtns).find(btn =>
  btn.textContent.includes('自由节点') ||
  btn.textContent.includes('Freedom node')
)
console.log('FreedomNode button:', freedomNodeBtn)
```

---

## 🚨 常见问题和解决方案

### 问题 A: "Cannot read property 'execCommand' of undefined"

**原因**: mindMap 实例未初始化

**解决**:
1. 等待页面完全加载
2. 在浏览器控制台检查: `window.mindMap`
3. 确保在 Edit.vue 组件 mounted 之后访问

### 问题 B: 工具栏按钮点击无反应

**可能原因**:
1. ✅ 插件未注册 (已修复)
2. ✅ 库未重新构建 (已修复)
3. ❓ 配置未启用
4. ❓ 事件总线未正确连接

**排查**:
```javascript
// 1. 检查按钮是否绑定了点击事件
const btn = document.querySelector('.toolbarBtn:has(.text:contains("自由节点"))')
console.log('Button:', btn)
console.log('Click handler:', btn?.__vue__?.$listeners?.click)

// 2. 手动触发事件
window.app.$bus.$emit('execCommand', 'CREATE_FREEDOM_NODE', {
  text: '手动测试'
})
```

### 问题 C: 快捷键不工作

**排查**:
```javascript
// 检查快捷键是否注册
console.log('Shortcuts:', window.mindMap?.keyCommand?.shortcutMap)

// 查找 Ctrl+Shift+F
const shortcut = Object.keys(window.mindMap?.keyCommand?.shortcutMap || {}).find(key =>
  key.toLowerCase().includes('control+shift+f')
)
console.log('FreedomNode shortcut:', shortcut)

// 手动触发
if (window.mindMap?.keyCommand?.shortcutMap?.[shortcut]) {
  window.mindMap.keyCommand.shortcutMap[shortcut]()
}
```

### 问题 D: 右键菜单项不显示

**排查**:
1. 右键点击节点
2. 检查控制台是否有错误
3. 查看 Contextmenu.vue 组件状态

```javascript
// 检查右键菜单组件
const contextmenu = document.querySelector('.contextmenuContainer')
console.log('Contextmenu:', contextmenu)
console.log('Contextmenu items:', contextmenu?.querySelectorAll('.item'))
```

---

## 📋 完整检查清单

### 服务器和构建
- [x] ✅ 开发服务器正在运行 (`npm run serve`)
- [x] ✅ 库已重新构建 (`npm run buildLibrary`)
- [x] ✅ 插件已在 full.js 中注册

### 浏览器检查
- [ ] 打开 http://localhost:8080 (或服务器提示的地址)
- [ ] 打开浏览器控制台 (F12)
- [ ] 检查是否有 JavaScript 错误
- [ ] 运行诊断步骤 1-5

### 配置检查
- [ ] 运行步骤 2 检查配置
- [ ] 如果未启用，执行启用命令
- [ ] 刷新页面后重新检查

### 功能测试
- [ ] 点击工具栏"自由节点"按钮
- [ ] 按快捷键 Ctrl+Shift+F
- [ ] 右键点击节点，查看"转换为自由节点"选项
- [ ] 使用控制台命令手动创建

---

## 🔧 紧急修复命令

如果以上都不工作，在浏览器控制台执行：

```javascript
// 完整的诊断和修复脚本
(function() {
  console.log('=== FreedomNode 诊断开始 ===')

  // 1. 检查插件
  const plugin = window.MindMap?.pluginNameMap?.freeNode
  console.log('1. 插件注册:', plugin ? '✅ 是' : '❌ 否')

  // 2. 检查实例
  const mindMap = window.mindMap
  console.log('2. MindMap 实例:', mindMap ? '✅ 存在' : '❌ 不存在')

  if (!mindMap) {
    console.error('❌ MindMap 实例不存在，请等待页面加载完成')
    return
  }

  // 3. 检查 FreeNode 处理器
  const freeNode = mindMap.freeNode
  console.log('3. FreeNode 处理器:', freeNode ? '✅ 存在' : '❌ 不存在')

  if (!freeNode) {
    console.error('❌ FreeNode 处理器不存在，插件可能未正确加载')
    console.log('尝试重新加载页面...')
    return
  }

  // 4. 检查配置
  const enabled = mindMap.opt.enableFreedomNode
  console.log('4. 配置启用:', enabled ? '✅ 是' : '❌ 否')

  if (!enabled) {
    console.log('正在启用 FreedomNode...')
    mindMap.updateConfig({
      enableFreedomNode: true,
      freedomNodeConfig: {
        dragToBlankConvertSafeDistance: 150,
        snapToTreeDistance: 100,
        dblclickBlankCreateFreedom: true,
        defaultFreedomNodeText: '自由节点',
        enableFreedomNodeDrag: true
      }
    })
    console.log('✅ 配置已更新，请测试功能')
  }

  // 5. 测试命令
  console.log('5. 测试创建命令...')
  try {
    mindMap.execCommand('CREATE_FREEDOM_NODE', {
      text: '诊断测试节点',
      position: { left: 200, top: 200 }
    })
    console.log('✅ CREATE_FREEDOM_NODE 命令执行成功')
    console.log('检查画布上是否出现了新节点')
  } catch (e) {
    console.error('❌ 命令执行失败:', e.message)
    console.error('完整错误:', e)
  }

  // 6. 检查自由节点列表
  const freeRootList = freeNode.freeRootList || []
  console.log('6. 自由节点数量:', freeRootList.length)
  if (freeRootList.length > 0) {
    console.log('✅ 自由节点已创建')
    console.log('节点列表:', freeRootList)
  }

  console.log('=== 诊断完成 ===')
  console.log('如果仍有问题，请将以上输出截图发送给开发者')
})()
```

---

## 📞 获取帮助

如果问题仍未解决：

1. **复制控制台输出**: 运行上面的诊断脚本，复制所有输出
2. **检查网络面板**: F12 → Network 标签，查看是否有加载失败的资源
3. **查看完整错误**: 控制台中的红色错误信息
4. **提供截图**: 工具栏区域、右键菜单、控制台输出

---

## 🎯 快速测试命令

```javascript
// 快速测试 - 复制粘贴到控制台
window.mindMap.updateConfig({ enableFreedomNode: true })
window.mindMap.execCommand('CREATE_FREEDOM_NODE', { text: '测试' })
```

如果这个命令能创建节点，说明功能正常，问题可能出在 UI 集成上。
