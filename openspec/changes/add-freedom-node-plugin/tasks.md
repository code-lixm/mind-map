## 1. Core Plugin Functionality
- [ ] 1.1 Scaffold `FreedomNode` plugin with data map, config，并挂载到 `mindMap.freeNode`
- [ ] 1.2 Implement create/convert/attach/move/remove/export/import APIs and hook them into command system
- [ ] 1.3 Extend renderer/layout hooks so自由节点树可以计算布局并与主树一同渲染
- [ ] 1.4 Persist `freeNodes` in history/copy/export flows via公开 transformer 或事件

## 2. Interaction & Integration
- [ ] 2.1 Update Drag 插件以支持安全距离判断、自由节点拖拽、吸附逻辑
- [ ] 2.2 Integrate with associative lines、Select、Search/goTargetNode、View.fit、MiniMap、Export、data_change 事件
- [ ] 2.3 Add configuration、事件、快捷键以及 web 层入口（工具栏/右键菜单），并确保可禁用

## 3. Quality & Compatibility
- [ ] 3.1 Provide协同/导入导出兼容策略（ID 稳定性、Yjs 结构等）
- [ ] 3.2 Implement单元/集成/性能测试覆盖拖拽、吸附、撤销重做、导出等关键流程
- [ ] 3.3 Document自由节点使用说明、API、配置项以及核心 Hook 依赖，并准备验证/回归清单
