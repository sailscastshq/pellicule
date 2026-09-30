# Pellicule 0.4.0 — Vue video rendering on Rsbuild 2

Pellicule 0.4.0 aligns Vue video rendering with the Rsbuild 2 toolchain and fixes two problems in real video workflows: Vue compilation failing during macro processing, and explicit config filenames being ignored. `create-pellicule` is aligned at 0.4.0 so newly scaffolded projects use `pellicule ^0.4.0`.

## What changed

- Updated the optional Rsbuild peers to `@rsbuild/core ^2.2.5` and `@rsbuild/plugin-vue ^2.0.1`.
- Fixed macro-transform ordering so Vue components compile correctly with Rsbuild 2.
- Made explicit `--config` filenames load through the same project-resolved Rsbuild installation used for rendering.
- Added a real compilation regression test covering Vue, macro config, SVG imports, and custom configuration.
- Added a reproducible, verified 12-second Rsbuild demo with [review screenshots](https://github.com/sailscastshq/pellicule/blob/9f771a45b041e86e39dfe033a404626e3df08349/.github/review/pellicule-rsbuild-2.jpg).
- Added the FLOSSAfrica funding badge to the README.

## Breaking upgrade

Rsbuild 1 support is removed. Rsbuild and Shipwright projects must upgrade core and the Vue plugin together:

```bash
npm install pellicule@^0.4.0
npm install -D @rsbuild/core@^2.2.5 @rsbuild/plugin-vue@^2.0.1
```

Rsbuild 2 requires Node.js `^20.19.0 || >=22.12.0`. Coordinate this with the host app's build-tool upgrade. The Vite adapter remains unchanged.

For new projects after publication:

```bash
npm create pellicule@0.4.0 my-video
```

## Validation

A clean `npm ci`, all 42 tests, and `npm run typecheck` passed. The Rsbuild demo was rendered using Pellicule itself, fully decoded with FFmpeg, and visually inspected: 12 seconds, 1280×720, 24 fps, 288 frames, H.264, intentionally silent. Both package tarballs are inspected before publication.

## Release scope

Closes [#42](https://github.com/sailscastshq/pellicule/issues/42) through [#44](https://github.com/sailscastshq/pellicule/pull/44); documentation update in [#43](https://github.com/sailscastshq/pellicule/pull/43). The June rendering, audio, output, and preview work was already shipped in 0.3.0.

[Full comparison since 0.3.0](https://github.com/sailscastshq/pellicule/compare/v0.3.0...v0.4.0).
