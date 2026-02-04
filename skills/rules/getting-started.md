---
name: getting-started
description: Installation, setup, and framework integration for Pellicule
metadata:
  tags: install, setup, vue, video, nuxt, quasar, laravel
---

# Getting Started with Pellicule

## Quick Start (Standalone Project)

Scaffold a new project with everything configured:

```bash
npx create-pellicule my-video
cd my-video
npm install
```

Then edit `Video.vue` and render:

```bash
npx pellicule Video.vue
```

## Manual Installation

```bash
npm install pellicule vue
```

## Requirements

- Node.js 18+
- FFmpeg installed and in PATH
- Vue 3.x

## What is Pellicule?

Pellicule renders Vue components to MP4 videos. Your Vue component IS the video - use `useFrame()` to get the current frame number and animate based on it.

## Core Concept

Videos are rendered frame-by-frame. Each frame, your component receives a new frame number. All visual properties should be computed from this frame number.

```vue
<script setup>
import { computed } from 'vue'
import { useFrame } from 'pellicule'

const frame = useFrame()
const opacity = computed(() => Math.min(1, frame.value / 30))
</script>

<template>
  <div :style="{ opacity }">Hello!</div>
</template>
```

## Deterministic Rendering

Same frame number = same pixels. Never use:
- `Date.now()`
- `Math.random()`
- `setTimeout` / `setInterval`

Everything must be derived from the frame number.

## Framework Integration

Pellicule auto-detects your project type and adapts. You can use it inside any Vue-based project.

### Supported Frameworks

| Framework | Config detected | Videos directory | Mode |
|-----------|----------------|-----------------|------|
| Standalone | (none) | project root | Bundler |
| Vite + Vue | `vite.config.js` | `src/videos/` | Bundler |
| Nuxt | `nuxt.config.ts` | `app/videos/` | BYOS |
| Quasar | `quasar.config.js` | `src/videos/` | BYOS |
| Laravel | `artisan` + `vite.config.ts` | `resources/js/videos/` | Bundler |
| Boring Stack | `config/shipwright.js` | `assets/js/videos/` | Bundler |
| Rsbuild | `rsbuild.config.js` | `src/videos/` | Bundler |

**Bundler mode**: Pellicule starts its own dev server to render frames.
**BYOS mode** (Bring Your Own Server): Pellicule connects to your running dev server.

### Nuxt

1. Add the Pellicule Nuxt module:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['pellicule/nuxt']
})
```

2. Create video components in `app/videos/`:

```vue
<!-- app/videos/Demo.vue -->
<script setup>
import { computed } from 'vue'
import { useFrame } from 'pellicule'

defineVideoConfig({ durationInSeconds: 5 })

const frame = useFrame()
const opacity = computed(() => Math.min(1, frame.value / 30))
</script>

<template>
  <div :style="{ opacity }">Hello from Nuxt!</div>
</template>
```

3. Start your Nuxt dev server, then render:

```bash
nuxt dev
npx pellicule Demo
```

### Quasar

1. Add the Pellicule Vite plugin in your Quasar config:

```js
// quasar.config.js
module.exports = configure(function () {
  return {
    build: {
      vitePlugins: [
        ['pellicule/quasar']
      ]
    }
  }
})
```

2. Create video components in `src/videos/`:

```vue
<!-- src/videos/Demo.vue -->
<script setup>
import { computed } from 'vue'
import { useFrame } from 'pellicule'

defineVideoConfig({ durationInSeconds: 5 })

const frame = useFrame()
const opacity = computed(() => Math.min(1, frame.value / 30))
</script>

<template>
  <div :style="{ opacity }">Hello from Quasar!</div>
</template>
```

3. Start your Quasar dev server, then render:

```bash
quasar dev
npx pellicule Demo
```

### Laravel (Inertia + Vue)

1. Install Pellicule in your Laravel project:

```bash
npm install pellicule
```

2. Create video components in `resources/js/videos/`:

```vue
<!-- resources/js/videos/Demo.vue -->
<script setup>
import { computed } from 'vue'
import { useFrame } from 'pellicule'

defineVideoConfig({ durationInSeconds: 5 })

const frame = useFrame()
const opacity = computed(() => Math.min(1, frame.value / 30))
</script>

<template>
  <div :style="{ opacity }">Hello from Laravel!</div>
</template>
```

3. Render (no dev server needed):

```bash
npx pellicule Demo
```

Pellicule reads your `vite.config.ts` and strips Laravel-specific plugins that would conflict, so rendering works out of the box.

### Vite + Vue (Existing Project)

1. Install Pellicule:

```bash
npm install pellicule
```

2. Create video components in `src/videos/`:

```bash
npx pellicule Demo
```

Pellicule merges your existing `vite.config.js` with its own config automatically.

## Quick Example

Create `Video.vue`:

```vue
<script setup>
import { computed } from 'vue'
import { useFrame, interpolate, Easing } from 'pellicule'

// Define video duration - no CLI flags needed!
// No import required - defineVideoConfig is a compiler macro
defineVideoConfig({
  durationInSeconds: 3
})

const frame = useFrame()

const opacity = computed(() =>
  interpolate(frame.value, [0, 30], [0, 1], { easing: Easing.easeOut })
)

const translateY = computed(() =>
  interpolate(frame.value, [0, 20], [50, 0], { easing: Easing.easeOut })
)
</script>

<template>
  <div class="video">
    <h1 :style="{ opacity, transform: `translateY(${translateY}px)` }">
      Hello, Pellicule!
    </h1>
  </div>
</template>

<style>
.video {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  color: white;
  font-family: system-ui, sans-serif;
}

h1 {
  font-size: 72px;
  font-weight: 600;
}
</style>
```

Render it:

```bash
npx pellicule Video.vue
```

That's it! The duration comes from `defineVideoConfig`.
