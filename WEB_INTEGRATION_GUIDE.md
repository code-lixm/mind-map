# FreedomNode Web 集成指南

本指南详细说明如何在 Simple Mind Map 的 Web 项目中集成 FreedomNode 插件。

---

## 📋 目录

1. [插件注册](#1-插件注册)
2. [工具栏集成](#2-工具栏集成)
3. [右键菜单集成](#3-右键菜单集成)
4. [快捷键集成](#4-快捷键集成)
5. [国际化配置](#5-国际化配置)
6. [启用配置](#6-启用配置)
7. [使用示例](#7-使用示例)

---

## 1. 插件注册

### 1.1 在 `simple-mind-map/full.js` 中注册插件

**文件**: `simple-mind-map/full.js`

```javascript
// 导入 FreedomNode 插件
import FreedomNode from './src/plugins/FreedomNode.js'

// 在插件链中注册
MindMap.usePlugin(RichText)
  .usePlugin(Select)
  .usePlugin(Drag)
  // ... 其他插件
  .usePlugin(FreedomNode)  // ✅ 添加这一行

export default MindMap
```

**位置**: 在第 23 行添加 import，在第 57 行添加 `.usePlugin(FreedomNode)`

---

## 2. 工具栏集成

### 2.1 添加工具栏按钮

**文件**: `web/src/pages/Edit/components/Toolbar.vue`

在 `defaultBtnList` 数组中添加 `'freedomNode'`:

```javascript
const defaultBtnList = [
  'back',
  'forward',
  'painter',
  'siblingNode',
  'childNode',
  'freedomNode',  // ✅ 添加这一行
  'deleteNode',
  // ... 其他按钮
]
```

**位置**: 第 168 行

### 2.2 实现工具栏按钮组件

**文件**: `web/src/pages/Edit/components/ToolbarNodeBtnList.vue`

#### 2.2.1 添加按钮模板 (第 60-67 行)

```vue
<div
  v-if="item === 'freedomNode'"
  class="toolbarBtn"
  @click="createFreedomNode"
>
  <span class="icon iconfont iconjiedian"></span>
  <span class="text">{{ $t('toolbar.freedomNode') }}</span>
</div>
```

#### 2.2.2 添加点击处理方法 (第 325-330 行)

```javascript
methods: {
  // ... 其他方法

  // 创建自由节点
  createFreedomNode() {
    this.$bus.$emit('execCommand', 'CREATE_FREEDOM_NODE', {
      text: this.$t('toolbar.defaultFreedomNodeText')
    })
  }
}
```

---

## 3. 右键菜单集成

### 3.1 添加右键菜单项

**文件**: `web/src/pages/Edit/components/Contextmenu.vue`

#### 3.1.1 添加菜单项模板 (第 43-49 行)

```vue
<div class="splitLine"></div>
<div
  class="item"
  @click="convertToFreedom"
  :class="{ disabled: isGeneralization }"
>
  <span class="name">{{ $t('contextmenu.convertToFreedom') }}</span>
</div>
<div class="splitLine"></div>
```

**位置**: 在概要节点菜单项之后

#### 3.1.2 添加转换方法 (第 526-531 行)

```javascript
methods: {
  // ... 其他方法

  // 转换为自由节点
  convertToFreedom() {
    if (!this.node) return
    this.mindMap.execCommand('CONVERT_TO_FREEDOM', this.node)
    this.hide()
  }
}
```

---

## 4. 快捷键集成

### 4.1 注册快捷键处理

**文件**: `web/src/pages/Edit/components/Edit.vue`

在 `init()` 方法中添加快捷键注册 (第 578-583 行):

```javascript
// 注册自由节点快捷键
this.mindMap.keyCommand.addShortcut('Control+Shift+f', () => {
  this.mindMap.execCommand('CREATE_FREEDOM_NODE', {
    text: this.$t('toolbar.defaultFreedomNodeText')
  })
})
```

**位置**: 在 `Control+s` 快捷键注册之后

### 4.2 添加快捷键文档

需要在 4 个配置文件中添加快捷键说明:

#### 简体中文 (`web/src/config/zh.js` - 第 317-321 行)

```javascript
{
  icon: 'iconjiedian',
  name: '创建自由节点',
  value: `${ctrl} + Shift + F`
},
```

#### 英文 (`web/src/config/en.js` - 第 241-245 行)

```javascript
{
  icon: 'iconjiedian',
  name: 'Create freedom node',
  value: `${ctrl} + Shift + F`
},
```

#### 繁体中文 (`web/src/config/zhtw.js` - 第 241-245 行)

```javascript
{
  icon: 'iconjiedian',
  name: '建立自由節點',
  value: `${ctrl} + Shift + F`
},
```

#### 越南语 (`web/src/config/vi.js` - 第 245-249 行)

```javascript
{
  icon: 'iconjiedian',
  name: 'Tạo nút tự do',
  value: `${ctrl} + Shift + F`
},
```

---

## 5. 国际化配置

### 5.1 工具栏翻译

在 4 个语言文件的 `toolbar` 部分添加:

#### 简体中文 (`web/src/lang/zh_cn.js`)

```javascript
toolbar: {
  // ... 其他翻译
  freedomNode: '自由节点',
  defaultFreedomNodeText: '自由节点',
}
```

#### 英文 (`web/src/lang/en_us.js`)

```javascript
toolbar: {
  // ... other translations
  freedomNode: 'Freedom node',
  defaultFreedomNodeText: 'Freedom node',
}
```

#### 繁体中文 (`web/src/lang/zh_tw.js`)

```javascript
toolbar: {
  // ... 其他翻譯
  freedomNode: '自由節點',
  defaultFreedomNodeText: '自由節點',
}
```

#### 越南语 (`web/src/lang/vi_vn.js`)

```javascript
toolbar: {
  // ... các bản dịch khác
  freedomNode: 'Nút tự do',
  defaultFreedomNodeText: 'Nút tự do',
}
```

### 5.2 右键菜单翻译

在 4 个语言文件的 `contextmenu` 部分添加:

#### 简体中文

```javascript
contextmenu: {
  // ... 其他翻译
  convertToFreedom: '转换为自由节点',
}
```

#### 英文

```javascript
contextmenu: {
  // ... other translations
  convertToFreedom: 'Convert to freedom node',
}
```

#### 繁体中文

```javascript
contextmenu: {
  // ... 其他翻譯
  convertToFreedom: '轉換為自由節點',
}
```

#### 越南语

```javascript
contextmenu: {
  // ... các bản dịch khác
  convertToFreedom: 'Chuyển đổi sang nút tự do',
}
```

---

## 6. 启用配置

### 6.1 通过浏览器控制台启用

在应用运行时，打开浏览器控制台执行:

```javascript
// 启用自由节点功能
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

// 刷新页面使配置生效
location.reload()
```

### 6.2 通过代码默认启用

**文件**: `simple-mind-map/src/constants/defaultOptions.js`

修改默认配置 (第 68 行):

```javascript
// 是否启用自由节点功能
enableFreedomNode: true,  // 改为 true
```

---

## 7. 使用示例

### 7.1 通过工具栏创建自由节点

1. 点击工具栏的"自由节点"按钮
2. 在画布中心创建一个自由节点
3. 可以拖拽自由节点到任意位置

### 7.2 通过右键菜单转换节点

1. 右键点击任意非根节点
2. 选择"转换为自由节点"
3. 该节点及其子树会转换为独立的自由节点

### 7.3 通过快捷键创建

1. 按 `Ctrl + Shift + F` (Windows/Linux)
2. 或 `Cmd + Shift + F` (Mac)
3. 在画布中心创建自由节点

### 7.4 通过 API 创建

```javascript
// 获取 mindMap 实例
const mindMap = this.mindMap

// 创建自由节点
mindMap.execCommand('CREATE_FREEDOM_NODE', {
  text: '我的自由节点',
  position: { left: 100, top: 100 },
  layout: 'mindMap' // 可选：指定布局
})
```

### 7.5 转换现有节点

```javascript
// 获取要转换的节点
const node = mindMap.renderer.activeNodeList[0]

// 转换为自由节点
mindMap.execCommand('CONVERT_TO_FREEDOM', node, {
  left: 200,
  top: 200
})
```

---

## 8. 完整的文件修改清单

### ✅ 核心库文件 (1 个)

1. `simple-mind-map/full.js` - 注册插件

### ✅ Web 应用文件 (3 个)

1. `web/src/pages/Edit/components/Toolbar.vue` - 工具栏配置
2. `web/src/pages/Edit/components/ToolbarNodeBtnList.vue` - 工具栏按钮实现
3. `web/src/pages/Edit/components/Contextmenu.vue` - 右键菜单
4. `web/src/pages/Edit/components/Edit.vue` - 快捷键注册

### ✅ 配置文件 (4 个)

1. `web/src/config/zh.js` - 简体中文快捷键文档
2. `web/src/config/en.js` - 英文快捷键文档
3. `web/src/config/zhtw.js` - 繁体中文快捷键文档
4. `web/src/config/vi.js` - 越南语快捷键文档

### ✅ 国际化文件 (8 个)

**工具栏翻译**:
1. `web/src/lang/zh_cn.js` - 简体中文
2. `web/src/lang/en_us.js` - 英文
3. `web/src/lang/zh_tw.js` - 繁体中文
4. `web/src/lang/vi_vn.js` - 越南语

**右键菜单翻译** (同上 4 个文件)

---

## 9. 验证集成

### 9.1 运行开发服务器

```bash
cd web
npm run serve
```

### 9.2 验证功能

#### ✅ 工具栏按钮
- 工具栏应该显示"自由节点"按钮
- 点击按钮应该创建一个自由节点

#### ✅ 右键菜单
- 右键点击普通节点应该显示"转换为自由节点"选项
- 点击菜单项应该将节点转换为自由节点

#### ✅ 快捷键
- 按 `Ctrl + Shift + F` 应该创建自由节点
- 快捷键面板应该显示该快捷键说明

#### ✅ 国际化
- 切换语言时，所有文本应该正确翻译
- 支持：简体中文、英文、繁体中文、越南语

---

## 10. 常见问题

### Q1: 工具栏按钮不显示？

**原因**: 可能是工具栏按钮太多，被折叠到"更多"菜单中

**解决**: 点击工具栏最右侧的"更多"按钮查看

### Q2: 点击按钮没反应？

**原因**: 插件未正确注册或未启用

**解决**:
1. 检查 `full.js` 是否正确导入和注册插件
2. 检查配置 `enableFreedomNode: true`
3. 清除浏览器缓存并重新加载

### Q3: 快捷键不工作？

**原因**: 快捷键冲突或未正确注册

**解决**:
1. 检查 `Edit.vue` 中的快捷键注册代码
2. 确保使用正确的按键组合 (注意大小写)
3. 检查浏览器是否拦截了该快捷键

### Q4: 翻译文本不显示？

**原因**: 国际化配置缺失

**解决**:
1. 检查所有 4 个语言文件是否都添加了翻译
2. 确保键名完全一致
3. 重启开发服务器

---

## 11. 下一步

集成完成后，建议：

1. **阅读 API 文档**: 查看 `simple-mind-map/docs/zh/freedom-node-api.md`
2. **查看配置选项**: 了解 `freedomNodeConfig` 的详细配置
3. **运行测试**: 执行 `simple-mind-map/docs/zh/freedom-node-testing.md` 中的测试用例
4. **自定义样式**: 根据需要调整自由节点的样式

---

## 12. 技术支持

- **完整文档**: `simple-mind-map/docs/zh/freedom-node-plugin.md`
- **API 参考**: `simple-mind-map/docs/zh/freedom-node-api.md`
- **测试指南**: `simple-mind-map/docs/zh/freedom-node-testing.md`
- **架构分析**: `openspec/changes/add-freedom-node-plugin/architecture-analysis.md`

---

**集成完成！** 🎉

现在你的 Web 应用已经完全集成了 FreedomNode 插件，用户可以通过工具栏、右键菜单和快捷键轻松创建和管理自由节点。
