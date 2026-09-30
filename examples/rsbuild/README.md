# Rsbuild 2 demo

This 12-second, 1280×720, 24 fps video is rendered by Pellicule itself through the Rsbuild adapter. It exercises `defineVideoConfig`, `useFrame`, easing, an imported SVG and a custom Rsbuild config filename. It uses deterministic frame math, local assets and system fonts, with no network fonts or random animation state. There is intentionally no audio.

From the repository root:

```bash
npm ci
node packages/core/bin/cli.js examples/rsbuild/Video.vue --bundler rsbuild --config examples/rsbuild/video.config.mjs --quality high -o rsbuild-demo.mp4
```

Scenes: 0–4 seconds introduces Rsbuild 2; 4–8 seconds shows reactive frame motion and the Vue SVG; 8–12 seconds shows explicit config selection and coordinated dependency migration. This demonstrates the adapter changes; it does not claim a release has been published.
