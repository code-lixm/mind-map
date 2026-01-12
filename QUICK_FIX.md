# 🔧 FreedomNode 快速修复指南

## ⚡ 立即执行 - 三步修复

### 第 1 步：重启开发服务器

```bash
# 停止所有旧的开发服务器
pkill -f "vue-cli-service serve"

# 进入 web 目录
cd /Users/lixiaoming/Downloads/mind-map/web

# 重新构建库（确保包含最新的 FreedomNode 插件）
npm run buildLibrary

# 启动开发服务器
npm run serve
```

###  第 2 步：在浏览器中测试

1. 打开 http://localhost:8080
2. 按 F12 打开控制台
3. 粘贴以下代码并回车：

```javascript
// 完整诊断
console.log('=== FreedomNode 诊断 ===')
console.log('1. MindMap:', typeof window.MindMap)
console.log('2. mindMap实例:', !!window.mindMap)
console.log('3. FreedomNode插件:', !!window.mindMap?.freeNode)
console.log('4. 配置启用:', window.mindMap?.opt?.enableFreedomNode)
console.log('5. 命令注册:', !!window.mindMap?.command?.commands?.CREATE_FREEDOM_NODE)

// 如果插件存在但未启用，执行启用
if (window.mindMap && !window.mindMap.opt.enableFreedomNode) {
  console.log('正在启用 FreedomNode...')
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
  console.log('✅ 已启用，刷新页面后生效')
  setTimeout(() => location.reload(), 1000)
}

// 测试创建
if (window.mindMap?.freeNode) {
  console.log('测试创建自由节点...')
  window.mindMap.execCommand('CREATE_FREEDOM_NODE', {
    text: '测试节点 ' + Date.now()
  })
  console.log('✅ 测试完成，检查画布')
}
```

### 第 3 步：如果还是不行

打开另一个终端，运行测试文件：

```bash
cd /Users/lixiaoming/Downloads/mind-map
open test-freedom-node.html
```

这个测试页面会自动检测所有问题。

---

## 🎯 最可能的问题和解决方案

### 问题 A：配置未生效

**症状**: 工具栏按钮存在但点击无反应

**原因**: Edit.vue 中的配置已添加，但 localStorage 中可能有旧配置覆盖

**解决**:
```javascript
// 在浏览器控制台执行
localStorage.removeItem('SIMPLE_MIND_MAP_CONFIG')
location.reload()
```

### 问题 B：浏览器缓存

**症状**: 修改代码后没有效果

**解决**:
1. 按 Ctrl + Shift + R (Windows) 或 Cmd + Shift + R (Mac) 强制刷新
2. 或者在浏览器控制台执行:
```javascript
caches.keys().then(keys => keys.forEach(key => caches.delete(key)))
location.reload(true)
```

### 问题 C：构建缓存

**症状**: buildLibrary 执行了但没有包含新代码

**解决**:
```bash
cd web

# 清除缓存
rm -rf node_modules/.cache
rm -rf ../simple-mind-map/dist

# 重新构建
npm run buildLibrary

# 重启服务器
pkill -f "vue-cli-service serve"
npm run serve
```

---

## 📋 完整的检查脚本

复制以下内容到浏览器控制台，一次性检查所有问题：

```javascript
(async function diagnose() {
  const results = {
    passed: [],
    failed: [],
    warnings: []
  }

  function test(name, condition, fix = null) {
    if (condition) {
      results.passed.push(`✅ ${name}`)
      console.log(`%c✅ ${name}`, 'color: green')
      return true
    } else {
      results.failed.push(`❌ ${name}`)
      console.log(`%c❌ ${name}`, 'color: red')
      if (fix) {
        console.log(`   修复: ${fix}`)
      }
      return false
    }
  }

  console.log('%c=== FreedomNode 完整诊断 ===', 'font-size: 16px; font-weight: bold')

  // 1. 基础检查
  console.log('\\n1️⃣ 基础环境')
  test('MindMap 类存在', typeof window.MindMap !== 'undefined')
  test('mindMap 实例存在', !!window.mindMap, '等待页面完全加载')

  if (!window.mindMap) {
    console.log('\\n⚠️  mindMap 实例不存在，等待 3 秒后重试...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    if (!window.mindMap) {
      console.error('❌ mindMap 实例始终未初始化，请检查 Edit.vue')
      return
    }
  }

  // 2. 插件检查
  console.log('\\n2️⃣ 插件状态')
  const mindMap = window.mindMap
  test('FreedomNode 插件注册', !!window.MindMap?.pluginNameMap?.freeNode, '检查 full.js 是否正确导入')
  test('freeNode 处理器存在', !!mindMap.freeNode, '插件未正确初始化')
  test('Drag 插件存在', !!mindMap.drag, 'FreedomNode 依赖 Drag 插件')

  // 3. 配置检查
  console.log('\\n3️⃣ 配置状态')
  const enabled = mindMap.opt.enableFreedomNode
  test('enableFreedomNode = true', enabled, '运行修复脚本启用配置')
  test('freedomNodeConfig 存在', !!mindMap.opt.freedomNodeConfig)

  // 4. 命令检查
  console.log('\\n4️⃣ 命令注册')
  const commands = [
    'CREATE_FREEDOM_NODE',
    'CONVERT_TO_FREEDOM',
    'ATTACH_FREEDOM_TO_TREE',
    'UPDATE_FREEDOM_NODE_POSITION',
    'DELETE_FREEDOM_NODE'
  ]
  commands.forEach(cmd => {
    test(`命令 ${cmd}`, !!mindMap.command?.commands?.[cmd])
  })

  // 5. UI 检查
  console.log('\\n5️⃣ UI 集成')
  const toolbarBtns = document.querySelectorAll('.toolbarBtn .text')
  const hasFreedomBtn = Array.from(toolbarBtns).some(el =>
    el.textContent.includes('自由节点') ||
    el.textContent.includes('Freedom')
  )
  test('工具栏按钮存在', hasFreedomBtn, '检查 Toolbar.vue 和 ToolbarNodeBtnList.vue')

  // 6. 功能测试
  console.log('\\n6️⃣ 功能测试')
  if (mindMap.freeNode && enabled) {
    try {
      const beforeCount = mindMap.freeNode.freeRootList?.length || 0
      mindMap.execCommand('CREATE_FREEDOM_NODE', {
        text: '诊断测试节点',
        position: { left: 50, top: 50 }
      })
      await new Promise(resolve => setTimeout(resolve, 500))
      const afterCount = mindMap.freeNode.freeRootList?.length || 0
      test('创建命令执行', afterCount > beforeCount, '检查控制台错误信息')

      if (afterCount > beforeCount) {
        console.log(`   ℹ️  当前自由节点数量: ${afterCount}`)
        results.passed.push(`创建了 ${afterCount - beforeCount} 个节点`)
      }
    } catch (e) {
      test('创建命令执行', false, e.message)
      console.error('详细错误:', e)
    }
  } else {
    results.warnings.push('⚠️  跳过功能测试：插件未启用或不存在')
  }

  // 总结
  console.log('\\n' + '='.repeat(50))
  console.log('%c总结', 'font-size: 14px; font-weight: bold')
  console.log(`✅ 通过: ${results.passed.length}`)
  console.log(`❌ 失败: ${results.failed.length}`)
  console.log(`⚠️  警告: ${results.warnings.length}`)

  if (results.failed.length === 0) {
    console.log('\\n%c🎉 所有检查通过！FreedomNode 插件工作正常！', 'color: green; font-size: 14px; font-weight: bold')

    if (!enabled) {
      console.log('\\n%c但是配置未启用，运行以下命令启用：', 'color: orange')
      console.log(`
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
      `)
    }
  } else {
    console.log('\\n%c❌ 发现问题，请根据上面的提示修复', 'color: red; font-size: 14px; font-weight: bold')
    console.log('\\n详细失败项:')
    results.failed.forEach(item => console.log(`  ${item}`))
  }

  if (results.warnings.length > 0) {
    console.log('\\n警告:')
    results.warnings.forEach(item => console.log(`  ${item}`))
  }

  return results
})()
```

---

## 🆘 如果以上都不行

### 最后的杀手锏：

```bash
# 1. 完全清除并重新安装
cd /Users/lixiaoming/Downloads/mind-map/web
rm -rf node_modules package-lock.json
npm install

# 2. 清除构建产物
rm -rf ../simple-mind-map/dist

# 3. 重新构建库
npm run buildLibrary

# 4. 确认文件存在
ls -lh ../simple-mind-map/dist/simpleMindMap.umd.min.js
ls -lh ../simple-mind-map/src/plugins/FreedomNode.js

# 5. 启动服务器
npm run serve
```

### 在浏览器中：

```javascript
// 清除所有缓存和存储
localStorage.clear()
sessionStorage.clear()
indexedDB.databases().then(dbs => dbs.forEach(db => indexedDB.deleteDatabase(db.name)))
caches.keys().then(keys => keys.forEach(key => caches.delete(key)))

// 强制刷新
location.reload(true)
```

---

## 📞 报告问题

如果仍然无法工作，请提供以下信息：

1. **诊断脚本的完整输出** (复制整个控制台输出)
2. **浏览器控制台的红色错误** (截图)
3. **网络面板** (F12 → Network，截图显示所有加载的文件)
4. **构建日志** (`npm run buildLibrary` 的完整输出)

把这些信息发给我，我可以精确定位问题所在。
