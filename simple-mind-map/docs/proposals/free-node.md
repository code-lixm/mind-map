# 自由节点（Free Node）提案

## 背景
- 现有渲染器只会处理一棵有根树，`simple-mind-map/src/layouts` 下的布局类始终遍历 `children`，默认全部节点都隶属于主根节点。
- Drag 插件虽然提供了 `enableFreeDrag`，但 `onMouseup` 仅仅把被拖动节点的 `customLeft/customTop` 改写（`simple-mind-map/src/plugins/Drag.js:170-208`），节点仍然挂在原父节点下，拓扑未改变，自然无法生成真正独立的根。
- `MindMapNode` 把 `customLeft/customTop` 当作布局结果的覆盖值（`simple-mind-map/src/core/render/node/MindMapNode.js:60-66`），并不存在“自由根 + 锚点”的概念，因此无法在同一画布上渲染多棵互不关联的树。
- 产品侧需要 **自由节点**：用户可以在任意位置落下一棵独立主题，继续编辑它的子树，并在拖拽、序列化、撤销重做、导出时与主树享受同样的能力。

## 目标
- 在主根节点之外支持多个 **自由根**，每个自由根都能承载完整的子树与样式。
- 提供创建 / 删除 / 转换（普通节点 ⇄ 自由根）/ 移动 / 吸附的命令或 API，并写入历史记录。
- 将自由节点持久化到数据模型中，保证加载、保存、导入、导出都能恢复。
- 核心插件（Drag、Select、Export、AssociativeLine、Navigator 等）对自由节点有感知，交互保持一致。
- 明确测试计划与上线节奏，方便 `web` 包后续接入 UI。

## 非目标
- 暂不拆分协同存储，所有树仍共享同一个 Yjs 文档。
- XMind、Markdown 等外部格式不在第一阶段处理，仅保证 simple-mind-map JSON 正确。
- UI 控件（工具栏、右键菜单、快捷键）由 `web/` 层在引擎完成后补充。

## 术语
- **主树**：当前选定布局下的根节点及其子树。
- **自由根**：不挂在主树上的顶层节点，拥有独立的画布锚点。
- **自由树**：以自由根为根的子树，内部仍使用既有布局算法。
- **锚点 Anchor**：自由树整体偏移使用的 `{left, top}` 画布坐标。

## 功能概述
1. **创建自由节点**：API 传入画布坐标与可选文本/布局覆盖，直接生成一棵自由树。
2. **节点转自由根**：将某节点（连同子树）从主树或其他自由树中拆出，记录当前包围盒，写入自由节点列表。
3. **吸附回主树**：把自由根拖入某个父节点或通过命令插入，即刻移除锚点，恢复为普通子节点。
4. **移动自由树**：拖拽自由根时整体平移锚点，除非命中其他节点触发吸附，否则不改变父子关系。
5. **删除 / 复制 / 导出**：自由树应支持所有原有节点操作，包括撤销重做、复制粘贴、PNG/PDF/SVG 导出等。

## 数据模型与序列化
### Schema
```json
{
  "data": { ... },
  "children": [ ... ],
  "freeNodes": [
    {
      "id": "fn_xxx",
      "position": { "left": 1200, "top": 360 },
      "layout": "logicalStructure",
      "root": { "data": { ... }, "children": [ ... ] }
    }
  ]
}
```
- `freeNodes` 可选，老数据无该字段时维持现状。
- `root` 重用现有节点格式，初始化时需对 `freeNodes[i].root` 调用 `createUidForAppointNodes` 以生成 `uid`。

### 初始化与拷贝
- 扩展 `MindMap.handleData`（`simple-mind-map/index.js:191-208`）以深拷贝 `freeNodes`，对每棵自由树调用 `createUidForAppointNodes`。
- `Command.getCopyData` 与 `copyRenderTree`（`simple-mind-map/src/core/command/Command.js:177-185`、`simple-mind-map/src/utils/index.js:71-105`）必须把 `freeNodes` 记录进历史 / 导出数据，且在 `removeActiveState` 时清理自由树节点的激活状态。
- 提供 `walkTrees` 之类的辅助方法，统一遍历主树与全部自由树，避免插件重复实现。
- `transformTreeDataToObject`（用于 `emitDataUpdatesEvent`）也需要索引自由树，否则监听 `data_change_detail` 时感知不到自由节点的变化。

### 加载与保存
- `MindMap.setData`（`simple-mind-map/index.js:467-505`）与 `Render.setData` 需同时写入根节点与 `freeNodes`。
- `Command.removeDataUid` 也要覆盖自由树，确保导出数据一致。

## 渲染与布局
### 渲染流程
- 目前 `Render._render`（`simple-mind-map/src/core/render/Render.js:562-640`）只渲染 `this.root`，需要改造为：
  1. 先按原有流程计算主树布局，生成 `this.root`。
  2. 遍历 `renderTree.freeNodes`，通过新增的 `layout.layoutTree(...)` 构建各自的 `MindMapNode` 树。
  3. 将自由根集合保存到 `this.freeRootList`，在主树渲染完成后依次渲染它们，并在绘制前整体平移 `{left, top}` 锚点。
  4. 维护自由根的 `nodeCache`，当自由根删除时能正确触发 `destroy()`。

### 复用布局
- 在 `layouts/Base` 中新增 `layoutTree(treeData, { isFree, layoutOverride })`。当 `isFree === true` 时：
  - 跳过 `setNodeCenter`，根节点默认放在 `(0, 0)`。
  - 结果节点标记 `isFreeRoot`，方便 Drag/Select 等插件识别。
  - 其余计算（`createNode`、`computedBaseValue`、`adjustTopValue` 等）复用现有逻辑。
- `getNodeTreeBoundingRect` / `getNodeTreeBoundingRectByNodeData`（`simple-mind-map/src/utils/index.js:1658-1706`）要支持传入多棵树，使 `view.fit()` 能包含自由树范围。

## 命令、API 与事件
在 `Render.registerCommands` 中新增：
1. `CREATE_FREE_NODE(position, text, layout?, dataPatch?)`：向 `renderTree.freeNodes` 追加条目，生成 `uid` 后调用 `render()`。
2. `CONVERT_TO_FREE_NODE(node)`：从父节点移除该节点，测量其包围盒作为锚点，写入 `freeNodes`。
3. `ATTACH_FREE_NODE(node, targetParent, index?)`：将自由根重新插入指定父节点，清空 `position`。
4. `MOVE_FREE_NODE(node, delta)`：更新锚点坐标（供 Drag / 键盘调用）。
5. `REMOVE_FREE_NODE(node)`：删除自由根。

命令执行后抛出 `free_node_change` 事件（`{ type, data }`），方便 `web` 层同步状态。

## 插件与交互影响
1. **Drag（`simple-mind-map/src/plugins/Drag.js`）**
   - `mousedownNode.isFreeRoot` 为 true 时进入“自由树拖拽”分支：不计算兄弟占位，直接调用 `MOVE_FREE_NODE` 更新锚点；若释放时命中其他节点则转为 `ATTACH_FREE_NODE`。
   - 非自由根节点保持原逻辑，`enableFreeDrag` 仍仅作用于单节点偏移。
2. **Select（`simple-mind-map/src/plugins/Select.js`）**
   - `checkInNodes` 需要在遍历主树后继续遍历 `renderer.freeRootList`，确保自由树也能被框选。
3. **Search / goTargetNode**
   - `Render.goTargetNode`（`simple-mind-map/src/core/render/Render.js:606-640`）及其查找函数需涵盖自由树，否则快捷定位无法命中自由节点。
4. **View.fit 与导出**
   - `view.fit()` 调用更新后的包围盒工具，以免视图只包含主树。导出插件使用画布内容，渲染正确后无需额外处理。

## 兼容性与迁移
- 老版本数据默认 `renderTree.freeNodes = []`，行为保持不变。
- 新版本写出的 JSON 包含 `freeNodes`，旧版本读取会忽略该字段，因此必须同步升级引擎与 `web`；需在发布说明中提示。
- `MindMap` 既要兼容旧的“裸节点”数据，也要兼容 `{ root, freeNodes }` 的新包装形式，便于 `web` 端逐步迁移。

## 测试计划
- **类单元测试**
  - `copyRenderTree` 深拷贝 `freeNodes`，保留 `uid`，且在移除激活状态时正确处理自由树。
  - `getNodeTreeBoundingRect` 在包含自由树时返回期望范围，`view.fit()` 不再裁剪。
- **手动回归**
  1. 创建多个自由节点，保存并刷新后仍可恢复，撤销/重做可回退创建、移动、吸附操作。
  2. 拖拽自由根并吸附到其他节点，验证普通节点拖拽不受影响。
  3. 导出 PNG/PDF/SVG，确认自由树未被裁剪。
  4. 对自由节点执行 `view.fit()`、`goTargetNode()`。
  5. 自由节点与 Select、AssociativeLine、RichText、性能模式等插件组合使用无异常。

## 实施步骤
1. **数据层**：`handleData`、`copyRenderTree`、命令历史、工具遍历统一支持 `freeNodes`，补充 `walkTrees`。
2. **渲染 / 布局**：`layout.doLayout`、`Render._render` 支持产出 `freeRootList` 并在渲染时应用锚点；`MindMapNode` 标记自由根。
3. **命令与插件**：实现 `CREATE/CONVERT/ATTACH/MOVE/REMOVE_FREE_NODE`，同步调整 Drag、Select、View、goTargetNode，触发 `free_node_change`。
4. **Web 集成（后续）**：在 `web/` 中增加操作入口（按钮、快捷键、右键菜单）调用新命令。
5. **文档与 QA**：更新 README/示例，输出回归清单，记录 schema 变化。

## 风险与开放问题
- **性能**：自由树数量多时需要多次布局，可能带来性能压力，需评估缓存策略或复用布局实例。
- **拖拽体验**：自由根拖拽与普通节点拖拽共存，需明确命中策略，避免误操作，可考虑指针样式或提示。
- **外部格式**：未来若要支持 XMind/Markdown，需要额外的格式映射，目前未覆盖。
- **协同冲突**：`freeNodes` 为数组，协同时需要稳定的 `id` 来避免乱序，必要时可引入排序或映射结构。
