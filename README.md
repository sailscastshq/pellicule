# Pellicule

Deterministic video rendering with Vue.

<video src="https://github.com/sailscastshq/pellicule/blob/3043cee432769ac0ced2fd56228852a026856040/.github/pellicule.mp4" autoplay loop muted playsinline></video>

Write Vue components. Render videos.

## Installation

```bash
npm install pellicule
```

## Quick Start

**1. Create a video component**

```vue
<script setup>
import { useFrame, interpolate, Easing } from 'pellicule'
import { computed } from 'vue'

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
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  color: white;
}
</style>
```

**2. Render it**

```bash
npx pellicule Video.vue -d 90 -o hello.mp4
```

## CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output` | Output file path | `./output.mp4` |
| `--preset` | Output preset (`mp4`, `webm`) | `mp4` |
| `--quality` | Output quality (`draft`, `standard`, `high`) | `standard` |
| `-d, --duration` | Duration in frames | `90` |
| `-f, --fps` | Frames per second | `30` |
| `-w, --width` | Video width | `1920` |
| `-h, --height` | Video height | `1080` |

Example output commands:

```bash
# Default MP4 (H.264 + AAC)
npx pellicule Video.vue

# WebM output
npx pellicule Video.vue --preset webm

# Higher-quality MP4
npx pellicule Video.vue --quality high
```

## API

### Composables

- `useFrame()` - Get the current frame number as a reactive ref
- `useVideoConfig()` - Access video configuration (fps, duration, dimensions)

### Animation Utilities

- `interpolate(frame, inputRange, outputRange, options)` - Map values between ranges
- `sequence(frame, steps)` - Chain multiple animations together
- `Easing` - Built-in easing functions: `linear`, `easeIn`, `easeOut`, `easeInOut`

## How It Works

1. **Vite** bundles your Vue component
2. **Playwright** renders each frame in a headless browser
3. **FFmpeg** encodes the frames into the selected output format

The rendering is deterministic - the same component produces the exact same video every time.

## Requirements

- Node.js 18+
- FFmpeg installed and in PATH
- Vue 3.x

## Documentation

https://docs.sailscasts.com/pellicule

## License

MIT
