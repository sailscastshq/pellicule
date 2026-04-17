---
name: pellicule
description: "Create programmatic videos, animations, and motion graphics with Vue using Pellicule. Render Vue components to MP4 deterministically with frame-based animation, scene composition, and easing. Use when the user wants to generate videos from code, render animated intros or explainers, build motion graphics with Vue, or mentions Pellicule, video rendering, or programmatic video generation."
metadata:
  tags: pellicule, video, vue, animation, composition, rendering, motion-graphics, mp4
---

## When to use

Use this skill when the user wants to create programmatic videos, render animations to MP4, build motion graphics, compose multi-scene videos, or generate video content using Vue components. Activate when the user mentions Pellicule, video rendering, video generation, animated intros, explainers, or Vue-based video creation.

## Quick start

1. **Create a video component** (`Video.vue`):

```vue
<script setup>
import { computed } from 'vue'
import { useFrame, interpolate, Easing } from 'pellicule'

defineVideoConfig({ durationInSeconds: 3 })

const frame = useFrame()
const opacity = computed(() =>
  interpolate(frame.value, [0, 30], [0, 1], { easing: Easing.easeOut })
)
</script>

<template>
  <div class="video" :style="{ opacity }">
    <h1>Hello, Pellicule!</h1>
  </div>
</template>

<style>
.video {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: #0a0a0f; color: white; font-family: system-ui, sans-serif;
}
</style>
```

2. **Render to MP4**:

```bash
npx pellicule Video.vue -o hello.mp4
```

3. **Verify** the output file exists and play it to confirm the animation rendered correctly.

## Workflow

1. **Install**: `npm install pellicule vue` (requires Node.js 18+, FFmpeg in PATH)
2. **Create component**: Write a `.vue` file using `useFrame()` to drive animations from the frame number
3. **Configure**: Use `defineVideoConfig({ durationInSeconds: N })` in `<script setup>` (compiler macro, no import needed)
4. **Preview**: `npx pellicule dev Video.vue` — opens a browser with play/pause, frame stepping, and hot-reload
5. **Render**: `npx pellicule Video.vue -o output.mp4` — renders deterministically via Playwright + FFmpeg

## Key concepts

- **Deterministic rendering**: Same frame = same pixels. Never use `Date.now()`, `Math.random()`, or timers.
- **Frame-based animation**: All visuals derive from `useFrame()`. Use `interpolate()` to map frame ranges to values.
- **Sequences**: Use `<Sequence>` component and `useSequence()` for multi-scene videos with automatic timing.
- **Framework integration**: Auto-detects Nuxt, Quasar, Laravel, Vite, and Rsbuild projects.

## Detailed references

Read individual rule files for in-depth explanations and code examples:

- [rules/getting-started.md](rules/getting-started.md) - Installation, setup, and framework integration (Nuxt, Quasar, Laravel, etc.)
- [rules/macros.md](rules/macros.md) - defineVideoConfig macro for zero-config rendering
- [rules/animations.md](rules/animations.md) - Animation utilities: interpolate, sequence, easing
- [rules/composables.md](rules/composables.md) - useFrame and useVideoConfig composables
- [rules/sequences.md](rules/sequences.md) - Sequence component and useSequence for scene management
- [rules/patterns.md](rules/patterns.md) - Common patterns: typewriter, staggered, scenes, loops
- [rules/rendering.md](rules/rendering.md) - CLI options, BYOS mode, auto-detection, and rendering
- [rules/styling.md](rules/styling.md) - CSS, fonts, and visual styling
