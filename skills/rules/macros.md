---
name: macros
description: defineVideoConfig macro for component-level video configuration
metadata:
  tags: macro, defineVideoConfig, config, duration
---

# Macros

## defineVideoConfig

Declare video configuration directly in your component. No CLI flags needed.

```vue
<script setup>
// No import needed! defineVideoConfig is a compiler macro
defineVideoConfig({
  durationInSeconds: 5
})

import { useFrame } from 'pellicule'
const frame = useFrame()
</script>
```

Then render with zero config:

```bash
npx pellicule Video.vue
```

### Config Options

| Property | Type | Description |
|----------|------|-------------|
| `durationInSeconds` | `number` | Duration in seconds (recommended) |
| `durationInFrames` | `number` | Duration in frames (use this OR durationInSeconds) |
| `fps` | `number` | Frames per second (default: 30) |
| `width` | `number` | Video width in pixels (default: 1920) |
| `height` | `number` | Video height in pixels (default: 1080) |
| `audio` | `string` | Path to audio file (relative to component) |

### Examples

**5-second video (simplest):**

```vue
<script setup>
defineVideoConfig({
  durationInSeconds: 5
})
</script>
```

**10-second 4K video at 60fps:**

```vue
<script setup>
defineVideoConfig({
  durationInSeconds: 10,
  fps: 60,
  width: 3840,
  height: 2160
})
</script>
```

**Square video for Instagram:**

```vue
<script setup>
defineVideoConfig({
  durationInSeconds: 15,
  width: 1080,
  height: 1080
})
</script>
```

**Precise frame count:**

```vue
<script setup>
defineVideoConfig({
  durationInFrames: 147  // Exactly 147 frames
})
</script>
```

**With background audio:**

```vue
<script setup>
defineVideoConfig({
  durationInSeconds: 30,
  audio: './background-music.mp3'
})
</script>
```

The audio path is resolved relative to the component file. Audio does not affect video duration — if audio is shorter it ends early, if longer it's truncated.

### How It Works

`defineVideoConfig` is a **true compile-time macro**, just like Vue's `defineProps`:

1. You write `defineVideoConfig({ ... })` in `<script setup>` — no import needed
2. The CLI extracts the config from your `.vue` file at compile time
3. Pellicule's bundler plugin strips the call before Vue compiles
4. Your component never sees the macro at runtime

```
Priority: CLI flags > defineVideoConfig > built-in defaults
```

### Framework Support

The macro works across all supported frameworks:

- **Standalone / Vite / Laravel**: Pellicule's Vite plugin strips the call automatically
- **Nuxt**: The `pellicule/nuxt` module registers the Vite plugin for you
- **Quasar**: The `pellicule/quasar` plugin registers it via Quasar's Vite config
- **Rsbuild**: Pellicule's Rsbuild plugin uses both `source.define` and `api.transform` to strip the call

### ESLint `no-undef`

Since `defineVideoConfig` is a compiler macro (no import), ESLint may warn about an undefined variable. Add it to your ESLint globals:

```js
// eslint.config.js
export default [
  {
    languageOptions: {
      globals: {
        defineVideoConfig: 'readonly'
      }
    }
  }
]
```

### CLI Override

You can always override with CLI flags:

```bash
# Component says 5 seconds, but render 10 seconds instead
npx pellicule Video.vue -d 300
```

### Relationship with useVideoConfig

| | `defineVideoConfig` | `useVideoConfig` |
|---|---|---|
| **When** | Compile time | Runtime |
| **Purpose** | Declare intended config | Access actual values |
| **Import** | Not needed (macro) | Required |
| **Used by** | CLI | Component code |

Your component should use `useVideoConfig()` to read the actual values:

```vue
<script setup>
// Macro - no import needed
defineVideoConfig({
  durationInSeconds: 5
})

// Composable - import required
import { useFrame, useVideoConfig } from 'pellicule'

// Read actual values (might differ if CLI overrides)
const { fps, durationInFrames } = useVideoConfig()
const frame = useFrame()
</script>
```

### Static Values Only

The macro extracts values at compile time, so use literal values:

```vue
<script setup>
// ✅ Works - literal values
defineVideoConfig({
  durationInSeconds: 5,
  fps: 30
})

// ❌ Won't work - computed values
const FPS = 30
defineVideoConfig({
  durationInFrames: FPS * 5  // Can't evaluate at compile time
})
</script>
```

Use `durationInSeconds` instead of computing frames manually.
