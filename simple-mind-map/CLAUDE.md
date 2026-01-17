# simple-mind-map

[根目录](../CLAUDE.md) > **simple-mind-map**

---

## 变更记录 (Changelog)

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-01-17T22:28:39+0800 | 初始化 | 模块文档首次创建 |

---

## 模块职责

simple-mind-map 是一个**框架无关**的思维导图核心引擎库，提供：

- SVG 渲染引擎（基于 SVG.js）
- 多种布局算法（逻辑结构图、思维导图、组织架构图、时间轴、鱼骨图等）
- 插件化功能扩展系统
- 主题系统
- 命令模式（撤销/重做）
- 事件系统
- 数据格式解析（XMind、Markdown）

---

## 入口与启动

### 入口文件

| 文件 | 用途 |
|------|------|
| `index.js` | 最小核心，需手动注册插件 |
| `full.js` | 完整版，预注册所有 24 个插件 |

### 实例化示例

```javascript
import MindMap from 'simple-mind-map/full.js'

const mindMap = new MindMap({
  el: document.getElementById('container'),
  data: {
    data: { text: '根节点' },
    children: []
  }
})
```

### 插件注册

```javascript
import MindMap from 'simple-mind-map'
import MiniMap from 'simple-mind-map/src/plugins/MiniMap.js'

MindMap.usePlugin(MiniMap)
```

---

## 对外接口

### MindMap 类主要方法

| 方法 | 说明 |
|------|------|
| `render(callback, source)` | 渲染思维导图 |
| `reRender(callback, source)` | 重新渲染（清空缓存） |
| `setData(data)` | 设置节点数据 |
| `getData(withConfig)` | 获取数据（可包含布局/主题/视图） |
| `setFullData(data)` | 设置完整数据（含布局/主题） |
| `setTheme(theme)` | 设置主题 |
| `setLayout(layout)` | 设置布局 |
| `setMode(mode)` | 设置只读/编辑模式 |
| `execCommand(cmd, ...args)` | 执行命令 |
| `on(event, fn)` | 监听事件 |
| `emit(event, ...args)` | 触发事件 |
| `off(event, fn)` | 解绑事件 |
| `export(type, ...)` | 导出（需 Export 插件） |
| `destroy()` | 销毁实例 |

### 静态方法

| 方法 | 说明 |
|------|------|
| `MindMap.usePlugin(plugin, opt)` | 注册插件 |
| `MindMap.hasPlugin(plugin)` | 检查插件是否已注册 |
| `MindMap.defineTheme(name, config)` | 定义自定义主题 |
| `MindMap.removeTheme(name)` | 移除主题 |

---

## 关键依赖与配置

### 核心依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| @svgdotjs/svg.js | 3.2.0 | SVG 渲染核心 |
| deepmerge | ^1.5.2 | 深度合并配置 |
| eventemitter3 | ^4.0.7 | 事件发射器 |
| quill | ^2.0.3 | 富文本编辑（RichText 插件） |
| katex | ^0.16.8 | 数学公式渲染（Formula 插件） |
| yjs | ^13.6.8 | 实时协作（Cooperate 插件） |
| pdf-lib | ^1.17.1 | PDF 导出（ExportPDF 插件） |
| jszip | ^3.10.1 | XMind 导出（ExportXMind 插件） |

### 配置文件

| 文件 | 用途 |
|------|------|
| `.eslintrc.js` | ESLint 配置 |
| `.prettierrc` | Prettier 代码格式化配置 |
| `package.json` | 包配置和脚本 |

---

## 数据模型

### 节点数据结构

```typescript
interface NodeData {
  data: {
    text: string           // 节点文本
    uid?: string           // 唯一标识
    expand?: boolean       // 是否展开
    richText?: boolean     // 是否富文本
    image?: string         // 图片 URL
    imageTitle?: string    // 图片标题
    imageSize?: { width: number, height: number }
    icon?: string[]        // 图标列表
    tag?: string[]         // 标签列表
    hyperlink?: string     // 超链接
    hyperlinkTitle?: string
    note?: string          // 备注
    generalization?: object // 概要信息
    // ... 更多样式属性
  }
  children: NodeData[]     // 子节点
}
```

### 完整数据结构

```typescript
interface MindMapFullData {
  layout: string           // 布局类型
  root: NodeData           // 根节点
  theme: {
    template: string       // 主题模板名
    config: object         // 自定义主题配置
  }
  view: {
    scale: number          // 缩放比例
    x: number              // 视图 X 偏移
    y: number              // 视图 Y 偏移
  }
}
```

---

## 测试与质量

### 代码检查

```bash
npm run lint      # ESLint 检查
npm run format    # Prettier 格式化
```

### 类型定义

```bash
npm run types     # 生成 TypeScript 类型定义到 types/ 目录
```

**注意**：当前无自动化测试套件，依赖手动测试。

---

## 常见问题 (FAQ)

### Q: 如何添加新插件？

1. 在 `src/plugins/` 目录创建插件文件
2. 插件类需要包含 `instanceName` 静态属性
3. 在 `full.js` 中使用 `MindMap.usePlugin()` 注册

### Q: 如何添加新布局？

1. 在 `src/layouts/` 目录创建布局类
2. 继承 `Base.js` 布局基类
3. 在 `src/core/render/Render.js` 的 `layouts` 对象中注册

### Q: 如何自定义主题？

```javascript
MindMap.defineTheme('myTheme', {
  backgroundColor: '#fff',
  lineColor: '#333',
  // ... 更多配置
})
```

---

## 相关文件清单

### 核心模块 (`src/core/`)

| 文件 | 职责 |
|------|------|
| `render/Render.js` | 渲染引擎核心 |
| `render/TextEdit.js` | 文本编辑框 |
| `render/node/MindMapNode.js` | 节点类 |
| `render/node/Style.js` | 节点样式 |
| `render/node/Shape.js` | 节点形状 |
| `view/View.js` | 视图操作（缩放、拖拽） |
| `event/Event.js` | 事件系统 |
| `command/Command.js` | 命令系统 |
| `command/KeyCommand.js` | 快捷键绑定 |

### 布局引擎 (`src/layouts/`)

| 文件 | 布局类型 |
|------|----------|
| `Base.js` | 布局基类 |
| `LogicalStructure.js` | 逻辑结构图 |
| `MindMap.js` | 经典思维导图 |
| `OrganizationStructure.js` | 组织架构图 |
| `CatalogOrganization.js` | 目录组织图 |
| `Timeline.js` | 时间轴 |
| `VerticalTimeline.js` | 竖向时间轴 |
| `Fishbone.js` | 鱼骨图 |

### 插件系统 (`src/plugins/`)

| 插件 | 功能 |
|------|------|
| `Export.js` | 导出（PNG/SVG/JSON/SMM） |
| `ExportPDF.js` | PDF 导出 |
| `ExportXMind.js` | XMind 格式导出 |
| `Drag.js` | 节点拖拽 |
| `Select.js` | 框选节点 |
| `RichText.js` | 富文本编辑 |
| `MiniMap.js` | 小地图 |
| `Watermark.js` | 水印 |
| `Scrollbar.js` | 滚动条 |
| `KeyboardNavigation.js` | 键盘导航 |
| `TouchEvent.js` | 触摸事件 |
| `Search.js` | 搜索 |
| `Formula.js` | 数学公式 |
| `AssociativeLine.js` | 关联线 |
| `Demonstrate.js` | 演示模式 |
| `Painter.js` | 格式刷 |
| `OuterFrame.js` | 外框 |
| `RainbowLines.js` | 彩虹线条 |
| `Cooperate.js` | 实时协作 |
| `NodeImgAdjust.js` | 节点图片调整 |
| `NodeBase64ImageStorage.js` | Base64 图片存储 |
| `MindMapLayoutPro.js` | 布局增强 |
| `ViewportDetector.js` | 视口检测 |

### 主题系统 (`src/theme/`)

| 文件 | 职责 |
|------|------|
| `index.js` | 主题注册和管理 |
| `default.js` | 默认主题配置 |
| `convertTheme.js` | 主题转换工具 |

### 数据解析 (`src/parse/`)

| 文件 | 职责 |
|------|------|
| `xmind.js` | XMind 格式解析 |
| `markdown.js` | Markdown 格式解析 |
| `toMarkdown.js` | 导出为 Markdown |
| `toTxt.js` | 导出为纯文本 |
