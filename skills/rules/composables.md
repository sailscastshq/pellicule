---
name: composables
description: useFrame, useVideoConfig, and useSequence composables for Pellicule
metadata:
  tags: useFrame, useVideoConfig, useSequence, composables, vue
---

# Pellicule Composables

## useFrame

Returns a reactive ref containing the current frame number (starting at 0).

```js
import { useFrame } from 'pellicule'

const frame = useFrame()

// frame.value is 0, 1, 2, 3, ... as video renders
```

Use it to drive all animations:

```vue
<script setup>
import { computed } from 'vue'
import { useFrame } from 'pellicule'

const frame = useFrame()

// Fade in over 30 frames
const opacity = computed(() => Math.min(1, frame.value / 30))

// Move from left to right
const x = computed(() => frame.value * 2)
</script>

<template>
  <div :style="{ opacity, transform: `translateX(${x}px)` }">
    Moving text
  </div>
</template>
```

## useVideoConfig

Returns the video configuration object:

```js
import { useVideoConfig } from 'pellicule'

const config = useVideoConfig()
// {
//   fps: 30,              // Frames per second
//   durationInFrames: 90, // Total frames
//   width: 1920,          // Video width in pixels
//   height: 1080          // Video height in pixels
// }
```

Use `fps` to write time-based animations:

```vue
<script setup>
import { computed } from 'vue'
import { useFrame, useVideoConfig, interpolate } from 'pellicule'

const frame = useFrame()
const { fps } = useVideoConfig()

// Fade in over 1 second (fps frames)
const opacity = computed(() =>
  interpolate(frame.value, [0, fps], [0, 1])
)

// Slide up over 0.5 seconds
const y = computed(() =>
  interpolate(frame.value, [0, fps * 0.5], [100, 0])
)
</script>
```

This makes your animations work at any framerate.

## Best Practice

Always destructure what you need from `useVideoConfig`:

```js
// Good
const { fps, width, height } = useVideoConfig()

// Then use fps for timing
const fadeInDuration = fps * 2 // 2 seconds
```

## useSequence

For organizing videos into scenes with automatic timing. See [sequences.md](sequences.md) for full documentation.

```js
import { useSequence } from 'pellicule'

// Inside a <Sequence> component
const { localFrame, progress, isActive } = useSequence()

// Or with explicit timing
const intro = useSequence(0, 90)  // frames 0-89
```
