## ADDED Requirements
### Requirement: Freedom Node Trees
The system SHALL let users create and manage one or more freedom node trees that live outside the primary root, each with its own anchor position, layout mode, and full node feature parity (editing, styling, children, icons, labels, images, notes, associative lines, etc.). Freedom nodes SHALL be enabled only when the `enableFreedomNode` flag and plugin are both active, and they SHALL expose configuration for safe distance thresholds, double-click behavior, default texts/layouts, and export toggles.

#### Scenario: Create freedom node tree on canvas
- **GIVEN** freedom nodes are enabled and the user double-clicks an empty canvas region
- **WHEN** the FreedomNode plugin receives the gesture with a requested layout and position
- **THEN** it SHALL create a new freedom tree at the requested coordinates with generated node IDs and plugin configuration defaults.

#### Scenario: Convert a branch into a freedom node tree
- **GIVEN** a standard node with descendants is dragged beyond the configured safe distance
- **WHEN** conversion rules are met
- **THEN** the command system SHALL hand the branch to the plugin, remove it from the parent, and rehydrate it as a freedom node tree anchored to the drop coordinates.

#### Scenario: Attach freedom node back to tree
- **GIVEN** a freedom node tree is dragged near another node within the snap threshold
- **WHEN** the user releases the drag gesture
- **THEN** the plugin SHALL attach the freedom node as a child of the target, remove its anchor offsets, and emit an attachment event.

### Requirement: Drag and Interaction Model
The system SHALL extend the Drag plugin (and equivalent touch handlers) to distinguish standard vs freedom nodes, enforce safe-distance rules, and hand control to the FreedomNode plugin for conversions, moves, and snapping. Freedom node drag/move operations SHALL respect `enableFreedomNodeDrag`, support updating anchor offsets, and integrate with selection, keyboard shortcuts, toolbar actions, and context menus.

#### Scenario: Move freedom node with drag
- **GIVEN** `enableFreedomNodeDrag` is true and a freedom node root is selected
- **WHEN** the user drags it across the canvas without entering another node's snap radius
- **THEN** the plugin SHALL update the anchor position, keep the tree detached, and emit a `freedom_node_moved` event.

#### Scenario: Disable drag globally
- **GIVEN** administrators turn off `enableFreedomNodeDrag`
- **WHEN** the user attempts to drag a freedom node
- **THEN** the plugin SHALL block the drag and leave the anchor unchanged while keeping ordinary node drag behavior unaffected.

### Requirement: Data, Commands, and Events
Freedom node state SHALL live under a `freeNodes` array at the root of the mind-map JSON schema, with stable IDs, anchor positions, per-tree layout, and a nested node tree. Command history, undo/redo snapshots, copy/paste, and export flows SHALL serialize both the main root and `freeNodes` via public transformers. The system SHALL expose commands (`CREATE_`, `CONVERT_`, `ATTACH_`, `MOVE_`, `REMOVE_`) and fire structured events for creation, conversion, attachment, movement, removal, and aggregate data changes.

#### Scenario: Record undo/redo with freedom nodes
- **GIVEN** the user creates or modifies a freedom node tree
- **WHEN** the command history captures a snapshot
- **THEN** the snapshot SHALL include both the primary `root` and `freeNodes` payload so that undo restores the exact detached trees.

#### Scenario: Command invocation
- **GIVEN** an integration calls `mindMap.execCommand('CREATE_FREEDOM_NODE', { position, text, layout })`
- **WHEN** command validation passes
- **THEN** the plugin SHALL create the tree, add it to `freeNodes`, and emit `freedom_node_created`.

### Requirement: Rendering and Tooling Integration
Rendering SHALL treat freedom node trees as first-class citizens: layouts compute coordinates per tree without centering, the renderer applies anchor offsets, associative lines resolve node lookups across main and freedom trees, Select/Search/View/MiniMap/Export plugins include freedom nodes in their bounding boxes, and `view.fit` SHALL frame both primary and freedom nodes simultaneously.

#### Scenario: Fit view with mixed trees
- **GIVEN** at least one freedom node tree exists alongside the main tree
- **WHEN** `view.fit()` executes
- **THEN** it SHALL compute a combined bounding box covering all trees before applying zoom/pan so every node remains visible.

#### Scenario: Associative lines between freedom and main nodes
- **GIVEN** a user links a main-tree node to a freedom node
- **WHEN** the renderer updates associative line positions
- **THEN** it SHALL locate both nodes across trees, adjust for anchor offsets, and draw the connection without breaking existing lines.

### Requirement: Import, Export, and Compatibility
JSON import/export, copy/paste, and PNG/SVG/PDF outputs SHALL include freedom nodes whenever `exportIncludeFreedomNodes` is true. Older datasets lacking `freeNodes` SHALL continue to load (defaulting to zero freedom nodes), and older runtimes that do not support the plugin SHALL ignore the `freeNodes` field gracefully. The system SHALL provide append/replace import modes for freedom nodes only, plus configuration to omit them from exports when the host application requires backward compatibility.

#### Scenario: Export with and without freedom nodes
- **GIVEN** a document contains both kinds of nodes and `exportIncludeFreedomNodes` defaults to true
- **WHEN** the user exports PNG/SVG/PDF
- **THEN** the output SHALL include freedom nodes; if the user toggles the config off, subsequent exports SHALL omit them without altering saved data.

#### Scenario: Load legacy document
- **GIVEN** a legacy JSON payload that only defines `root`
- **WHEN** it is loaded while the plugin is installed
- **THEN** the system SHALL initialize `freeNodes` as an empty array and leave all freedom-node-specific behaviors idle.

### Requirement: Collaboration and Performance Baseline
Freedom nodes SHALL generate UUID-based IDs so concurrent edits converge. Conflicts in move/attach actions SHALL resolve via last-writer-wins while emitting change notifications. The first release SHALL document performance expectations (up to ~50 freedom nodes) and expose extension points (virtualization hooks, anchor quad-trees) for future optimizations without degrading current rendering or drag responsiveness.

#### Scenario: Concurrent move operations
- **GIVEN** two collaborators move the same freedom node shortly apart
- **WHEN** their updates arrive via Yjs
- **THEN** ID-stable entries SHALL merge deterministically, using last timestamp wins while emitting a change event so clients can refresh the rendered position.

#### Scenario: Performance guardrail
- **GIVEN** a document with dozens of freedom nodes
- **WHEN** the renderer updates during pan/zoom
- **THEN** it SHALL reuse cached layouts and avoid blocking the main thread beyond the documented baseline (under ~1 second for 50 nodes), providing telemetry hooks for future optimizations.
