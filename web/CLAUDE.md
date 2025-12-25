# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Vue 2.x + ElementUI** web application for the Simple Mind Map project (思绪思维导图). The repository is a monorepo containing:
- `web/` - The Vue.js web application (this directory)
- `simple-mind-map/` - The core JavaScript mind map library (framework-agnostic)

The web app serves as both a demo application and a full-featured mind mapping tool that can be self-hosted or used as a template for custom implementations.

## Development Commands

### Development Server
```bash
npm run serve
```
Starts the dev server with hot-reload at localhost:8080.

### Build Commands
```bash
# Build the web application
npm run build

# Build the simple-mind-map library
npm run buildLibrary
```
The `buildLibrary` script:
1. Updates version in `full.js` from `simple-mind-map/package.json`
2. Builds UMD bundle to `simple-mind-map/dist/`
3. Creates ESM bundles (both normal and minified) using esbuild

### Code Quality
```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format

# Create node image list (asset generation)
npm run createNodeImageList
```

### AI Development Server
```bash
npm run ai:serve
```
Runs a local development server with AI integration features (see `scripts/ai.js`).

## Architecture

### Monorepo Structure
The project uses a sibling directory structure:
- `web/` contains the Vue application
- `simple-mind-map/` contains the core library
- Build scripts in `web/` interact with `simple-mind-map/` using relative paths (e.g., `../simple-mind-map/`)

### Core Mind Map Library Integration
The web app imports from `simple-mind-map` in two ways:
1. **Full bundle**: `simple-mind-map/full.js` - includes all plugins pre-registered
2. **Core only**: `simple-mind-map/index.js` - minimal core for custom plugin selection

The library uses a **plugin architecture**. All features beyond basic rendering are plugins registered via `MindMap.usePlugin()`. Available plugins include:
- Export (PDF, PNG, SVG, XMind, Markdown)
- RichText (Quill-based rich text editing)
- Drag (node drag & drop)
- Select (multi-select)
- AssociativeLine (node connections)
- MiniMap, Watermark, Scrollbar
- Search, Formula (KaTeX)
- Demonstrate (presentation mode)
- RainbowLines, OuterFrame
- And more (see `simple-mind-map/src/plugins/`)

### Vue Application Architecture

**Main Entry**: `src/main.js`
- Vue 2.x with Vuex for state management
- Vue Router with simple routing
- ElementUI component library
- Vue i18n for internationalization (zh_cn, en_us, zh_tw, vi_vn)

**Routing** (`src/router.js`):
- `/` and `/index` - Main editor (Edit page)
- `/doc/zh` - Documentation page

**State Management** (`src/store.js`):
- `localConfig` - User preferences (zen mode, dark mode, rich text enabled, scrollbar visibility, mouse behavior)
- `aiConfig` - AI integration settings (API endpoint, key, model, port)
- `activeSidebar` - Current sidebar panel
- `isHandleLocalFile` - Flag for local file operations mode
- `isOutlineEdit`, `isReadonly`, `isSourceCodeEdit` - Editor modes

**Main Edit Page** (`src/pages/Edit/Index.vue`):
- Conditionally renders `Toolbar` (hidden in zen mode) and `Edit` components
- The `Edit` component (`src/pages/Edit/components/Edit.vue`) contains the mind map canvas
- 40+ specialized components in `src/pages/Edit/components/` handle features:
  - Style panels: `BaseStyle.vue`, `AssociativeLineStyle.vue`
  - Import/Export: `Import.vue`, `Export.vue`
  - AI features: `AiChat.vue`, `AiCreate.vue`, `AiConfigDialog.vue`
  - Navigation: `Navigator.vue`, `NavigatorToolbar.vue`, `Outline.vue`
  - Editing: `NodeImage.vue`, `NodeIcon.vue`, `NodeHyperlink.vue`, `NodeNote.vue`
  - Display modes: `Fullscreen.vue`, `Demonstrate.vue`
  - And many more specialized UI components

### Data Persistence (`src/api/index.js`)
The app supports three modes:
1. **localStorage** (default) - Data stored in browser
2. **Local file mode** - Direct file system operations (when `isHandleLocalFile` flag is set)
3. **Takeover mode** - External integration (when `window.takeOverApp` is true, used for desktop app/plugin integration)

### Internationalization
Language files in `src/lang/` map to config files in `src/config/`:
- `src/lang/zh_cn.js` ↔ `src/config/zh.js`
- `src/lang/en_us.js` ↔ `src/config/en.js`
- `src/lang/zh_tw.js` ↔ `src/config/zhtw.js`
- `src/lang/vi_vn.js` ↔ `src/config/vi.js`

Config files contain translated UI strings, tooltips, and labels.

### Build Configuration
**Vue Config** (`vue.config.js`):
- Development: `publicPath: ''`
- Production: `publicPath: './dist'`, outputs to `../dist/`
- Dynamic public path support via `webpack-dynamic-public-path` plugin
- Transpiles `yjs`, `lib0`, `quill` dependencies
- Dev proxy for AI API: `/api/v3/` → `http://ark.cn-beijing.volces.com`

## Key Implementation Details

### Mind Map Instance
The mind map is created in `Edit.vue` by instantiating the `MindMap` class from `simple-mind-map`:
```javascript
import MindMap from 'simple-mind-map'
const mindMap = new MindMap({
  el: containerElement,
  data: mindMapData,
  // ...configuration options
})
```

### Event Communication
Uses Vue's event bus pattern (`this.$bus`) for cross-component communication:
- `write_local_file` - Trigger local file save
- `localStorageExceeded` - Handle storage quota exceeded
- Components emit and listen to custom events via `$bus`

### Theming
- Dark mode implemented via global CSS class `.isDark` on `<body>`
- Theme definitions in `simple-mind-map/src/theme/`
- Extended theme support via `extendThemeGroupList` in Vuex store

### Special Modes
- **Zen Mode** (`isZenMode`) - Hides toolbar for distraction-free editing
- **Outline Edit** (`isOutlineEdit`) - Tree-based editing interface
- **Readonly** (`isReadonly`) - View-only mode
- **Source Code Edit** (`isSourceCodeEdit`) - Edit raw JSON data

## Testing
No test framework is currently configured in this project.

## Common Development Patterns

When adding new features to the mind map:
1. Check if functionality should be a library plugin (in `simple-mind-map/src/plugins/`) or a UI component (in `web/src/pages/Edit/components/`)
2. Core rendering/layout logic belongs in the library
3. UI controls, dialogs, and user interactions belong in the web app
4. Use Vuex for state that needs to be shared across multiple components
5. Use `$bus` for one-time events or notifications between loosely coupled components

When modifying the library:
1. Changes to `simple-mind-map/` require running `npm run buildLibrary` to rebuild
2. The web app imports from the built library, not the source directly
3. Plugin registration happens in `simple-mind-map/full.js`

## AI Integration
The application includes AI-powered features:
- Chat interface for AI assistance (`AiChat.vue`)
- AI-based mind map generation (`AiCreate.vue`)
- Configurable AI endpoints (`AiConfigDialog.vue`)
- Local AI server support via `npm run ai:serve`
- Default API endpoint: `http://ark.cn-beijing.volces.com/api/v3/chat/completions`
