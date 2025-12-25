# Repository Guidelines

## Project Structure & Module Organization
Two sibling packages power this repo: `simple-mind-map/` (engine living in `src/core`, `src/plugins`, `src/theme`, and the `full.js` bundle) and `web/` (Vue 2 + ElementUI client with `src/pages/Edit`, `src/api`, `src/lang`, and `src/store.js`). Production builds land in the root `dist/` alongside `index.html`, and `copy.js` keeps that HTML entry in sync so the `Dockerfile`/`nginx.conf` pair can serve the app as an SPA.

## Build, Test, and Development Commands
Install dependencies separately in each package. Core workflows:
- `cd web && npm run serve` – dev server (localhost:8080) with `/api/v3/` proxying.
- `cd web && npm run build` – Vue production bundle to `../dist/`, then refresh the root `index.html` via `node ../copy.js`.
- `cd web && npm run buildLibrary` – rebuild the distributable in `simple-mind-map/dist/` (UMD + ESM) before releases or embeds.
- `cd web && npm run lint|format|ai:serve|createNodeImageList` – lint, Prettier, AI prototype server, and asset manifest creation.
- `cd simple-mind-map && npm run lint|types|wsServe` – lint JS, emit `.d.ts` plus plugin typings, or launch the Yjs helper.

## Coding Style & Naming Conventions
`web` inherits `plugin:vue/essential` rules, while the library sticks to `eslint:recommended`; run the relevant lint script before committing. The library’s `.prettierrc` locks 2-space indent, `semi: false`, `singleQuote: true`, and 80-character lines—follow that throughout `simple-mind-map/`. Keep Vue components in PascalCase files (e.g., `NavigatorToolbar.vue`), store keys/plugins in camelCase, and route user-visible text through `src/lang/` for future locales.

## Testing Guidelines
There is no automated suite, so every change must run `npm run lint` inside both packages and sanity-check `npm run serve` (node editing, JSON/PNG import-export, locale toggles, and, when relevant, collaboration via `npm run wsServe`). List the manual checks in your PR.

## Commit & Pull Request Guidelines
`git log` currently shows mostly single-word commits like “update”; shift to imperative, scoped titles such as `fix(export): guard empty svg data` so changelogs stay actionable. Keep PRs focused, describe the problem and approach, list commands executed, attach screenshots or recordings for UI work, link issues, and request review only after linting and manual checks pass.

## Security & Configuration Tips
Never commit API keys for the AI features; configure them locally so the `/api/v3/` proxy in `vue.config.js` can forward requests safely. Before Dockerized deployments, run `npm run build` so `/app/dist` exists, set `window.externalPublicPath` when hosting behind a CDN, and keep capability guards in `web/src/api` to protect the desktop, Obsidian, and UTools integrations.
