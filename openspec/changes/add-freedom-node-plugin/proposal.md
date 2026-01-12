## Why
simple-mind-map 目前无法在同一画布上同时管理多棵思维导图或“临时便签”节点，团队需要一个可选插件在不破坏核心架构的前提下，实现可以自由放置、拖拽、吸附和导出的自由节点体验，以满足多主题记录、辅助说明、拆分复杂分支等使用场景。

## What Changes
- 引入 FreedomNode 插件，复用核心新增的 `freeNodes` 数据结构，在任意画布位置创建/删除/移动完全体节点树，并通过命令系统和事件系统暴露 API。
- 扩展拖拽、选择、关联线、视图、MiniMap、导出等现有插件与核心 Hook，让自由节点与主树保持一致的编辑、布局、撤销/重做和导入导出体验。
- 增加自由节点配置项、事件以及 JSON/Yjs 兼容策略，确保可以启用/禁用、保留历史记录并与协作模式兼容。
- 记录核心 Hook 依赖与最小侵入改造清单，保证插件可以基于公开扩展点实现而不直接 fork 核心。

## Impact
- Affected specs: `freedom-node-plugin`
- Affected code: `simple-mind-map/src/plugins/*`, `simple-mind-map/src/core/render`, `src/core/view`, `src/plugins/Drag|AssociativeLine|Select|MiniMap|Export`, `web` toolbar/menus, `copy.js`
