# Repository Guidelines

## Project Structure & Module Organization
- `simple-mind-map/`: core engine; focus on `src/core`, `src/plugins`, `src/theme`, plus the bundled `full.js`. Build artifacts live in `simple-mind-map/dist/`.
- `web/`: Vue 2 client using ElementUI; key directories are `src/pages/Edit`, `src/api`, `src/lang`, and `src/store.js`.
- Production output lands in `dist/` at the repo root along with the SPA `index.html`. Use `copy.js` to keep it synchronized for the Docker `nginx` image.

## Build, Test, and Development Commands
- `cd web && npm run serve`: launches the dev server on `localhost:8080` with `/api/v3/` proxying.
- `cd web && npm run build`: emits the Vue bundle into `../dist/` and refreshes the root `index.html` via `node ../copy.js`.
- `cd web && npm run buildLibrary`: rebuilds the distributable UMD/ESM artifacts inside `simple-mind-map/dist/`.
- `cd web && npm run lint|format|ai:serve|createNodeImageList`: linting, Prettier formatting, AI prototype server, and node-image manifest.
- `cd simple-mind-map && npm run lint|types|wsServe`: lint library code, emit `.d.ts` + plugin typings, or run the Yjs collaboration helper.

## Coding Style & Naming Conventions
- Library code follows `eslint:recommended` plus `.prettierrc` defaults (2 spaces, no semicolons, single quotes, 80-char lines). Keep comments minimal and descriptive.
- Vue app inherits `plugin:vue/essential`. Components use PascalCase filenames (e.g., `NavigatorToolbar.vue`), store keys/plugins stay camelCase, and user-facing text goes through `web/src/lang/`.

## Testing Guidelines
- No automated suite; run `npm run lint` in both packages before every PR.
- Manually verify `npm run serve` for node editing, JSON/PNG import-export, locale switches, and, when relevant, collaboration via `npm run wsServe`.
- Document manual test steps in your PR description.

## Commit & Pull Request Guidelines
- Prefer imperative, scoped commit messages like `fix(export): guard empty svg data`; avoid generic "update" titles.
- PRs should describe the problem, outline the approach, list commands/tests run, attach UI captures for visual tweaks, and link issues before requesting review.

## Security & Configuration Tips
- Never commit AI API keys. Configure them locally so the `/api/v3/` proxy in `web/vue.config.js` can forward securely.
- Before Docker deploys, ensure `npm run build` has produced `/dist`, set `window.externalPublicPath` for CDN hosting, and keep capability guards intact in `web/src/api`.
