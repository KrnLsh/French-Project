# Repository Guidelines

## Project Structure & Module Organization

L'Art du Jeu is a static, interactive exhibition about French video games. `dist/` contains the editable site source and is served directly; there is no separate build step. `dist/index.html` is the entry point, `dist/app.js` coordinates interactions, and feature files such as `chronicle.js`, `theme.js`, and their styles organize individual experiences. `dist/assets/` holds images, fonts, credits, and vendored libraries. `scripts/` contains the development server, validation script, and tests.

## Build, Test, and Development Commands

Run commands from the repository root with Node.js and npm available. No package dependencies are currently declared.

- `npm run dev`: serve `dist/` at `http://127.0.0.1:4173`.
- `npm test`: run the four Node test suites.
- `npm run check`: check JavaScript syntax, validate local assets, anchors, accessibility references, and image credits, then run tests.
- `node --test scripts/runtime.test.mjs`: run one suite while developing.

## Coding Style & Naming Conventions

Use plain JavaScript, HTML, and CSS. Browser features generally use strict-mode IIFEs and expose shared interfaces through `window`; development scripts use ES modules (`.mjs`). Follow the surrounding formatting, using two-space indentation for new expanded blocks, semicolons, and single-quoted JavaScript strings. Use camelCase for variables and functions, and kebab-case for feature filenames and CSS classes. Preserve LF line endings as specified by `.gitattributes`. No formatter or linter is configured.

## Testing Guidelines

Tests use `node:test`, `node:assert/strict`, and browser fixtures in `node:vm`. Name suites `scripts/<feature>.test.mjs` and describe observable behavior in test names. Register new suites in both `test` and `check` in `package.json`. No numerical coverage threshold is configured. Cover relevant motion preferences, lifecycle cleanup, and rendering performance. Run `npm run check` before submitting. For visual changes, also review desktop/mobile layouts, keyboard navigation, themes, and reduced motion in a browser.

## Commit & Pull Request Guidelines

History contains only `Initial Commit` and `major changes`, so no consistent convention is established. Use concise, imperative subjects describing a focused change. Pull requests should explain the behavior changed, list validation performed, link relevant issues, and include screenshots or recordings for visual changes.

## Asset Attribution

When adding imagery or third-party assets, update `dist/assets/image-credits.json` or `dist/assets/THIRD-PARTY-LICENSES.txt` as appropriate. Keep asset paths valid within `dist/`.
