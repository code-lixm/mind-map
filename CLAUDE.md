# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 JavaScript/Vue 的 Web 思维导图开源项目（simple-mind-map），采用 Monorepo 架构：

- **`simple-mind-map/`** - 框架无关的核心思维导图引擎库（纯 JavaScript + SVG.js）
- **`web/`** - Vue 2.x + ElementUI 的演示应用和完整功能的思维导图工具
- **`web-plus/`** - 新版 Web 应用（基于 Vue 3 + Vite）

核心库通过插件架构实现功能扩展，Web 应用提供完整的用户界面和交互。

## 开发命令

### 核心库（simple-mind-map/）

```bash
# 安装依赖
cd simple-mind-map
npm install

# 代码质量检查
npm run lint

# 生成 TypeScript 类型定义文件
npm run types

# 代码格式化
npm run format

# 启动 WebSocket 协作服务器
npm run wsServe
```

### Web 应用（web/）

```bash
# 安装依赖
cd web
npm install

# 启动开发服务器（localhost:8080）
npm run serve

# 构建 Web 应用（输出到 ../dist/）
npm run build

# 构建核心库（UMD + ESM 格式）
npm run buildLibrary

# 代码检查和格式化
npm run lint
npm run format

# 生成节点图片列表资源
npm run createNodeImageList

# 启动 AI 开发服务器
npm run ai:serve
```

### 完整构建流程

1. **修改核心库代码** → `cd web && npm run buildLibrary` → 重建库
2. **修改 Web 代码** → `npm run build` → 构建应用

## 架构设计

### 核心库架构（simple-mind-map/）

**入口文件：**
- `index.js` - 最小核心，需手动注册插件
- `full.js` - 完整版，预注册所有插件（当前版本 0.14.0-fix.18）

**核心模块：** (`src/core/`)
- `view/View.js` - 视图层：缩放、拖拽、画布管理
- `event/Event.js` - 事件系统：键盘、鼠标、触摸事件处理
- `render/Render.js` - 渲染引擎：节点渲染、样式应用
- `command/Command.js` - 命令模式：撤销/重做功能
- `command/KeyCommand.js` - 快捷键命令绑定

**布局引擎：** (`src/layouts/`)
- `Base.js` - 布局基类
- `LogicalStructure.js` - 逻辑结构图
- `MindMap.js` - 经典思维导图
- `OrganizationStructure.js` - 组织架构图
- `CatalogOrganization.js` - 目录组织图
- `Timeline.js` / `VerticalTimeline.js` - 时间轴
- `Fishbone.js` - 鱼骨图

**插件系统：** (`src/plugins/`)
所有功能特性均通过插件实现，使用 `MindMap.usePlugin(PluginClass)` 注册：

- **导入导出：** `Export`、`ExportPDF`、`ExportXMind`
- **交互增强：** `Drag`、`Select`、`TouchEvent`、`KeyboardNavigation`
- **视觉效果：** `MiniMap`、`Watermark`、`Scrollbar`、`RainbowLines`、`OuterFrame`
- **编辑功能：** `RichText`（基于 Quill）、`Search`、`Formula`（KaTeX 公式）、`NodeImgAdjust`
- **高级特性：** `AssociativeLine`（关联线）、`Demonstrate`（演示模式）、`Painter`（格式刷）
- **协作与扩展：** `Cooperate`（协作）、`MindMapLayoutPro`、`NodeBase64ImageStorage`

**主题系统：** (`src/theme/`)
- `default.js` - 默认主题配置
- 支持主题扩展和自定义

**工具模块：** (`src/utils/`)
- 数据克隆、UID 生成、SVG 数据处理等

**数据格式解析：** (`src/parse/`)
- `xmind.js` - XMind 格式解析
- `markdown.js` - Markdown 格式解析

### Web 应用架构（web/）

**技术栈：**
- Vue 2.6 + Vue Router + Vuex
- ElementUI 组件库
- Vue i18n 国际化（支持简中、繁中、英文、越南语）

**主入口：** `src/main.js`

**路由：** (`src/router.js`)
- `/` 和 `/index` - 主编辑器页面
- `/doc/zh` - 文档页面

**状态管理：** (`src/store.js`)
关键状态：
- `localConfig` - 用户偏好设置（禅模式、暗黑模式、富文本、滚动条、鼠标行为）
- `aiConfig` - AI 集成配置（API 端点、密钥、模型、端口）
- `activeSidebar` - 当前激活的侧边栏面板
- `isHandleLocalFile` - 本地文件操作模式标志
- `isOutlineEdit`、`isReadonly`、`isSourceCodeEdit` - 编辑器模式

**主编辑页面：** (`src/pages/Edit/Index.vue`)
- 包含 `Toolbar`（工具栏）和 `Edit`（编辑器）组件
- 40+ 专用子组件位于 `src/pages/Edit/components/`：
  - **样式面板：** `BaseStyle.vue`、`AssociativeLineStyle.vue`
  - **导入导出：** `Import.vue`、`Export.vue`
  - **AI 功能：** `AiChat.vue`、`AiCreate.vue`、`AiConfigDialog.vue`
  - **导航工具：** `Navigator.vue`、`NavigatorToolbar.vue`、`Outline.vue`
  - **编辑功能：** `NodeImage.vue`、`NodeIcon.vue`、`NodeHyperlink.vue`、`NodeNote.vue`
  - **显示模式：** `Fullscreen.vue`、`Demonstrate.vue`

**数据持久化：** (`src/api/index.js`)
三种模式：
1. **localStorage**（默认）- 浏览器本地存储
2. **本地文件模式** - 直接文件系统操作（`isHandleLocalFile` 标志启用）
3. **接管模式** - 外部集成（`window.takeOverApp` 为 true，用于桌面应用/插件）

**国际化：**
语言文件（`src/lang/`）对应配置文件（`src/config/`）：
- `zh_cn.js` ↔ `zh.js`
- `en_us.js` ↔ `en.js`
- `zh_tw.js` ↔ `zhtw.js`
- `vi_vn.js` ↔ `vi.js`

**构建配置：** (`vue.config.js`)
- 开发环境：`publicPath: ''`
- 生产环境：`publicPath: './dist'`，输出到 `../dist/`
- 使用 `webpack-dynamic-public-path` 插件支持动态公共路径
- 转译 `yjs`、`lib0`、`quill` 依赖
- 开发代理：`/api/v3/` → `http://ark.cn-beijing.volces.com`（AI API）

## 关键实现细节

### 思维导图实例创建

在 `Edit.vue` 中实例化：
```javascript
import MindMap from 'simple-mind-map'
const mindMap = new MindMap({
  el: containerElement,
  data: mindMapData,
  // ...配置选项
})
```

### 事件通信

使用 Vue 事件总线（`this.$bus`）进行跨组件通信：
- `write_local_file` - 触发本地文件保存
- `localStorageExceeded` - 处理存储配额超限
- 组件通过 `$bus` 发射和监听自定义事件

### 主题系统

- 通过全局 CSS 类 `.isDark`（添加到 `<body>`）实现暗黑模式
- 主题定义在 `simple-mind-map/src/theme/`
- Vuex store 中的 `extendThemeGroupList` 支持扩展主题

### 特殊模式

- **禅模式**（`isZenMode`）- 隐藏工具栏，专注编辑
- **大纲编辑**（`isOutlineEdit`）- 树形编辑界面
- **只读模式**（`isReadonly`）- 仅查看
- **源码编辑**（`isSourceCodeEdit`）- 编辑原始 JSON 数据

## 代码风格

### 核心库（simple-mind-map/）

遵循 `.prettierrc` 规则：
- 2 空格缩进
- 无分号（`semi: false`）
- 单引号（`singleQuote: true`）
- 80 字符行宽限制
- ESLint 规则：`eslint:recommended`

### Web 应用（web/）

- Vue 组件文件使用 PascalCase 命名（如 `NavigatorToolbar.vue`）
- Store 键和插件使用 camelCase
- 用户可见文本必须通过 `src/lang/` 国际化
- ESLint 规则：`plugin:vue/essential`

## 常见开发模式

### 添加新功能时的决策

1. **判断功能归属：**
   - 核心渲染/布局逻辑 → `simple-mind-map/src/plugins/` 或 `src/core/`
   - UI 控件、对话框、用户交互 → `web/src/pages/Edit/components/`

2. **状态管理：**
   - 跨多个组件共享的状态 → Vuex
   - 一次性事件或松耦合组件间通知 → `$bus`

3. **修改核心库后：**
   - 必须运行 `npm run buildLibrary` 重新构建
   - Web 应用导入的是构建后的库，而非源码
   - 插件注册在 `simple-mind-map/full.js`

## AI 集成

应用包含 AI 驱动功能：
- 聊天界面提供 AI 辅助（`AiChat.vue`）
- AI 生成思维导图（`AiCreate.vue`）
- 可配置 AI 端点（`AiConfigDialog.vue`）
- 本地 AI 服务器支持：`npm run ai:serve`
- 默认 API 端点：`http://ark.cn-beijing.volces.com/api/v3/chat/completions`

## OpenSpec 工作流

项目使用 OpenSpec 进行规范驱动开发（位于 `openspec/` 目录）：

### 常用命令
```bash
openspec list                    # 列出活动的变更
openspec list --specs             # 列出规范
openspec show [item]              # 显示变更或规范详情
openspec validate [item] --strict # 验证变更或规范
openspec archive <change-id> [-y] # 归档已完成的变更
```

### 开发流程
1. **创建变更提案** - 使用 `/openspec-proposal` 命令
2. **实施变更** - 使用 `/openspec-apply` 命令
3. **归档变更** - 使用 `/openspec-archive` 命令

详见 `openspec/AGENTS.md` 获取完整指南。

## 手动测试检查清单

项目无自动化测试套件，每次变更后必须：
1. 运行 `npm run lint`（在两个包中）
2. 启动 `npm run serve` 进行功能测试
3. 验证关键功能：
   - 节点编辑
   - JSON/PNG 导入导出
   - 语言切换
   - 协作功能（需要 `npm run wsServe`）

## Git 提交规范

当前提交历史多为单词提交（如 "update"），建议采用规范化格式：
- 使用祈使语气、带作用域的标题：`fix(export): guard empty svg data`
- 保持 PR 聚焦，描述问题和方法
- 列出执行的命令，附加 UI 工作的截图或录屏
- 检查通过 lint 和手动测试后再请求审查

## 安全与配置注意事项

- **切勿提交 API 密钥**：AI 功能的密钥应本地配置
- **Docker 部署前**：运行 `npm run build` 确保 `/app/dist` 存在
- **CDN 托管**：设置 `window.externalPublicPath`
- **集成保护**：在 `web/src/api` 中保持能力检查，以保护桌面、Obsidian 和 UTools 集成
