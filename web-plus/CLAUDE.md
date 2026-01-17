# web-plus

[根目录](../CLAUDE.md) > **web-plus**

---

## 变更记录 (Changelog)

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-01-17T22:28:39+0800 | 初始化 | 模块文档首次创建 |

---

## 模块职责

web-plus 是基于 **Vue 3 + Vite** 的新版 Web 应用，提供：

- 完整的思维导图编辑器界面
- 丰富的工具栏和侧边栏组件
- 多种导入/导出格式支持
- AI 辅助创建和编辑功能
- 国际化支持（简中、繁中、英文、越南语）
- 暗黑模式
- 本地存储和外部集成支持

---

## 入口与启动

### 入口文件

| 文件 | 职责 |
|------|------|
| `src/main.ts` | 应用主入口 |
| `src/App.vue` | 根组件 |
| `src/router.ts` | 路由配置 |

### 启动命令

```bash
pnpm install    # 安装依赖
pnpm dev        # 启动开发服务器
pnpm build      # 构建生产版本
pnpm preview    # 预览构建结果
```

### 路由配置

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `pages/Edit/Index.vue` | 主编辑器页面 |
| `/index` | 重定向到 `/` | - |
| `/doc/zh` | `pages/Doc.vue` | 文档页面 |

---

## 对外接口

### 数据持久化 API (`src/api/index.ts`)

| 函数 | 说明 |
|------|------|
| `getData()` | 获取思维导图数据 |
| `storeData(data)` | 存储思维导图数据 |
| `getConfig()` | 获取配置 |
| `storeConfig(config)` | 存储配置 |
| `getLang()` | 获取语言设置 |
| `storeLang(lang)` | 存储语言设置 |
| `getLocalConfig()` | 获取本地配置 |
| `storeLocalConfig(config)` | 存储本地配置 |

### 数据存储模式

1. **localStorage**（默认）- 浏览器本地存储
2. **本地文件模式** - `isHandleLocalFile` 标志启用
3. **接管模式** - `window.takeOverApp` 为 true（桌面应用/插件集成）

---

## 关键依赖与配置

### 主要依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| vue | ^3.5.24 | 前端框架 |
| pinia | ^3.0.4 | 状态管理 |
| vue-router | ^4.6.4 | 路由管理 |
| element-plus | ^2.13.1 | UI 组件库 |
| vue-i18n | ^9.14.4 | 国际化 |
| axios | ^1.13.2 | HTTP 请求 |
| simple-mind-map | file:../simple-mind-map | 核心引擎（本地链接） |

### 构建配置

| 文件 | 职责 |
|------|------|
| `vite.config.ts` | Vite 构建配置 |
| `tsconfig.json` | TypeScript 配置 |
| `tsconfig.app.json` | 应用 TS 配置 |
| `tsconfig.node.json` | Node TS 配置 |

### Vite 关键配置

```typescript
// 别名配置
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    'simple-mind-map': path.resolve(__dirname, '../simple-mind-map')
  },
  mainFields: ['module', 'main']  // 优先使用源码
}

// 开发服务器配置
server: {
  fs: { allow: ['..'] }  // 允许访问父目录
}

// 依赖优化
optimizeDeps: {
  exclude: ['simple-mind-map']  // 排除预构建，使用源码
}
```

---

## 数据模型

### 状态管理 (`src/store/index.ts`)

```typescript
interface MainStore {
  // 模式标志
  isHandleLocalFile: boolean    // 本地文件模式
  isOutlineEdit: boolean        // 大纲编辑模式
  isReadonly: boolean           // 只读模式
  isSourceCodeEdit: boolean     // 源码编辑模式

  // 本地配置
  localConfig: {
    isZenMode: boolean          // 禅模式
    openNodeRichText: boolean   // 富文本开关
    useLeftKeySelectionRightKeyDrag: boolean  // 鼠标行为
    isShowScrollbar: boolean    // 显示滚动条
    isDark: boolean             // 暗黑模式
    enableAi: boolean           // 启用 AI
  }

  // AI 配置
  aiConfig: {
    api: string                 // API 端点
    key: string                 // API 密钥
    model: string               // 模型名称
    port: number                // 本地端口
    method: string              // 请求方法
  }

  // UI 状态
  activeSidebar: string         // 当前激活的侧边栏
  extendThemeGroupList: any[]   // 扩展主题列表
  bgList: any[]                 // 背景列表
}
```

---

## 测试与质量

### 开发验证

```bash
pnpm dev                    # 启动开发服务器进行手动测试
vue-tsc -b                  # TypeScript 类型检查
```

**注意**：当前无自动化测试套件。

---

## 常见问题 (FAQ)

### Q: 如何添加新的编辑器组件？

1. 在 `src/pages/Edit/components/` 创建 Vue 组件
2. 在 `Edit.vue` 或 `MindMapContainer.vue` 中引入使用
3. 如需国际化，在 `src/lang/` 添加对应文本

### Q: 如何添加新的侧边栏面板？

1. 创建面板组件
2. 在 `Sidebar.vue` 中注册
3. 通过 `store.setActiveSidebar()` 控制显示

### Q: 如何修改 AI 配置？

通过 `AiConfigDialog.vue` 组件或直接修改 store：

```typescript
store.setLocalConfig({
  api: 'your-api-endpoint',
  key: 'your-api-key',
  model: 'gpt-4'
})
```

### Q: 如何支持新的语言？

1. 在 `src/lang/` 添加语言文件（如 `ja_jp.ts`）
2. 在 `src/lang/index.ts` 导出
3. 在 `src/config/` 添加对应配置文件
4. 在 `src/i18n.ts` 注册

---

## 相关文件清单

### 页面组件 (`src/pages/`)

| 文件 | 职责 |
|------|------|
| `Edit/Index.vue` | 主编辑器页面 |
| `Edit/components/MindMapContainer.vue` | 思维导图容器核心组件 |
| `Edit/components/Edit.vue` | 编辑区域 |
| `Edit/components/Toolbar.vue` | 工具栏 |
| `Edit/components/Sidebar.vue` | 侧边栏容器 |
| `Doc.vue` | 文档页面 |

### 编辑器组件 (`src/pages/Edit/components/`)

#### 样式与主题
| 组件 | 功能 |
|------|------|
| `BaseStyle.vue` | 基础样式设置 |
| `Style.vue` | 节点样式 |
| `Theme.vue` | 主题选择 |
| `AssociativeLineStyle.vue` | 关联线样式 |
| `NodeTagStyle.vue` | 标签样式 |

#### 导入导出
| 组件 | 功能 |
|------|------|
| `Import.vue` | 导入对话框 |
| `Export.vue` | 导出对话框 |

#### AI 功能
| 组件 | 功能 |
|------|------|
| `AiChat.vue` | AI 聊天界面 |
| `AiCreate.vue` | AI 创建思维导图 |
| `AiConfigDialog.vue` | AI 配置对话框 |

#### 导航工具
| 组件 | 功能 |
|------|------|
| `Navigator.vue` | 小地图导航 |
| `NavigatorToolbar.vue` | 导航工具栏 |
| `Outline.vue` | 大纲视图 |
| `OutlineEdit.vue` | 大纲编辑 |
| `OutlineSidebar.vue` | 大纲侧边栏 |

#### 节点编辑
| 组件 | 功能 |
|------|------|
| `NodeImage.vue` | 节点图片 |
| `NodeIcon.vue` | 节点图标 |
| `NodeHyperlink.vue` | 节点超链接 |
| `NodeNote.vue` | 节点备注 |
| `NodeTag.vue` | 节点标签 |
| `NodeOuterFrame.vue` | 节点外框 |
| `RichTextToolbar.vue` | 富文本工具栏 |

#### 其他功能
| 组件 | 功能 |
|------|------|
| `Search.vue` | 搜索 |
| `Scale.vue` | 缩放控制 |
| `Fullscreen.vue` | 全屏 |
| `Demonstrate.vue` | 演示模式 |
| `Setting.vue` | 设置 |
| `ShortcutKey.vue` | 快捷键说明 |
| `Contextmenu.vue` | 右键菜单 |

### 组合式函数 (`src/composables/`)

| 文件 | 功能 |
|------|------|
| `useMindMapCore.ts` | 思维导图核心逻辑 |
| `useMindMapEvents.ts` | 事件处理 |
| `useMindMapLoading.ts` | 加载状态 |
| `useMindMapLock.ts` | 锁定状态 |
| `useEditorState.ts` | 编辑器状态 |
| `useLocalStorage.ts` | 本地存储 |

### 状态管理 (`src/store/`)

| 文件 | 功能 |
|------|------|
| `index.ts` | 主 store（配置、模式、UI 状态） |
| `mind.ts` | 思维导图相关 store |
| `case.ts` | 用例相关 store |

### 配置文件 (`src/config/`)

| 文件 | 功能 |
|------|------|
| `index.ts` | 配置入口 |
| `constant.ts` | 常量定义 |
| `zh.ts` | 中文配置 |
| `en.ts` | 英文配置 |
| `zhtw.ts` | 繁体中文配置 |
| `vi.ts` | 越南语配置 |
| `icon.ts` | 图标配置 |
| `image.ts` | 图片配置 |
| `example.ts` | 示例数据 |

### 国际化 (`src/lang/`)

| 文件 | 语言 |
|------|------|
| `zh_cn.ts` | 简体中文 |
| `zh_tw.ts` | 繁体中文 |
| `en_us.ts` | 英文 |
| `vi_vn.ts` | 越南语 |

### 工具函数 (`src/utils/`)

| 文件 | 功能 |
|------|------|
| `index.ts` | 通用工具 |
| `ai.ts` | AI 相关工具 |
| `eventBus.ts` | 事件总线 |
| `loading.ts` | 加载状态 |
| `handleClipboardText.ts` | 剪贴板处理 |
| `registerPlugins.ts` | 插件注册 |

### API (`src/api/`)

| 文件 | 功能 |
|------|------|
| `index.ts` | 数据持久化 API |
| `common.ts` | 通用 API |
| `mind/index.ts` | 思维导图 API |
| `mind/types.ts` | 类型定义 |
| `request/config.ts` | 请求配置 |
