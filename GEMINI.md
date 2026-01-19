# Project Overview

This project is a monorepo-style codebase consisting of a core mind map engine and a Vue.js-based web application. It aims to provide a simple, web-based online mind mapping tool.

## Key Components

*   **`simple-mind-map/`**: The core logic library for the mind map, built with JavaScript and SVG (using `@svgdotjs/svg.js`). It handles rendering, events, and data manipulation.
*   **`web/`**: A Vue 2.x application that serves as the frontend editor. It utilizes `element-ui` for the UI and consumes the `simple-mind-map` library.
*   **`dist/`**: The production build output for the web application.

## Tech Stack

*   **Language:** JavaScript (ES6+)
*   **Frontend Framework:** Vue.js 2.x
*   **UI Library:** Element UI
*   **Core Engine:** `@svgdotjs/svg.js`, `quill` (rich text), `yjs` (collaboration)
*   **Build Tools:** Vue CLI, esbuild, Webpack

## Building and Running

### Web Application (`web/`)

*   **Install Dependencies:**
    ```bash
    cd web
    npm install
    ```
*   **Development Server:**
    ```bash
    cd web
    npm run serve
    ```
    Starts the app at `http://localhost:8080`.
*   **Production Build:**
    ```bash
    cd web
    npm run build
    ```
    Builds the Vue app to `../dist/` and syncs the entry `index.html`.

### Core Library (`simple-mind-map/`)

*   **Install Dependencies:**
    ```bash
    cd simple-mind-map
    npm install
    ```
*   **Build Library:**
    The library build is triggered from the `web` directory commands, which output to `simple-mind-map/dist/`.
    ```bash
    cd web
    npm run buildLibrary
    ```
*   **Collaboration Server (Dev):**
    ```bash
    cd simple-mind-map
    npm run wsServe
    ```
    Starts a WebSocket server for testing collaboration features.

## Development Conventions

*   **Linting:**
    *   **Web:** Uses `plugin:vue/essential`. Run `npm run lint` in `web/`.
    *   **Library:** Uses `eslint:recommended`. Run `npm run lint` in `simple-mind-map/`.
*   **Formatting:** Prettier is used with specific settings:
    *   2 spaces indentation
    *   No semicolons
    *   Single quotes
    *   80 character line width
*   **Testing:** Currently, there is no automated test suite. Manual verification is required.
    *   Check node editing, import/export, and locale switching.
    *   Run `npm run lint` before committing.
*   **Commit Messages:** Use imperative, scoped messages (e.g., `fix(export): guard empty svg data`).

response with chinese

不要主动 commit
不要在改动文件的时候进行全局的 lint 和 format 导致文件改动混淆
不要使用 build,run 等方式来进行测试行为