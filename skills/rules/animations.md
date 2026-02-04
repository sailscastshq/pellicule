---
name: animations
description: Animation utilities for Pellicule - interpolate, sequence, easing
metadata:
  tags: animation, interpolate, sequence, easing, motion
---

# Animation Utilities

## interpolate

Maps a value from one range to another. Essential for frame-based animations.

```js
import { interpolate } from 'pellicule'

// Basic usage
const opacity = interpolate(frame.value, [0, 30], [0, 1])
// frame 0 → 0, frame 15 → 0.5, frame 30 → 1

// With easing
import { Easing } from 'pellicule'

const opacity = interpolate(
  frame.value,
  [0, 30],           // input range (frames)
  [0, 1],            // output range (values)
  { easing: Easing.easeOut }
)
```

### Multiple keyframes

```js
// Move right, then left, then right
const x = interpolate(
  frame.value,
  [0, 30, 60, 90],      // keyframe times
  [0, 100, -50, 200]    // positions
)
```

### Clamping

By default, values extrapolate beyond the range. Use clamp to limit:

```js
const opacity = interpolate(
  frame.value,
  [0, 30],
  [0, 1],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
)
// Before frame 0: stays at 0
// After frame 30: stays at 1
```

## Easing Functions

```js
import { Easing } from 'pellicule'

Easing.linear     // No easing (default)
Easing.easeIn     // Slow start, fast end
Easing.easeOut    // Fast start, slow end (most natural)
Easing.easeInOut  // Slow start and end
```

Use `easeOut` for most UI animations - it feels responsive.

```js
const scale = interpolate(
  frame.value,
  [0, 20],
  [0, 1],
  { easing: Easing.easeOut }
)
```

## sequence

Chain multiple animations together:

```js
import { sequence } from 'pellicule'

const value = sequence(frame.value, [
  { start: 0, end: 30, from: 0, to: 100 },
  { start: 30, end: 60, from: 100, to: 50 },
  { start: 60, end: 90, from: 50, to: 200 }
])
```

Each step defines:
- `start` / `end` - Frame range
- `from` / `to` - Value range

## Common Animation Patterns

### Fade In

```js
const opacity = computed(() =>
  interpolate(frame.value, [0, 30], [0, 1], { easing: Easing.easeOut })
)
```

### Slide Up

```js
const translateY = computed(() =>
  interpolate(frame.value, [0, 20], [50, 0], { easing: Easing.easeOut })
)
```

### Scale In

```js
const scale = computed(() =>
  interpolate(frame.value, [0, 25], [0.8, 1], { easing: Easing.easeOut })
)
```

### Fade Out (at end)

```js
const { fps, durationInFrames } = useVideoConfig()
const fadeOutStart = durationInFrames - fps // Last second

const opacity = computed(() =>
  interpolate(frame.value, [fadeOutStart, durationInFrames], [1, 0])
)
```

### Bounce

```js
const bounce = computed(() => {
  const progress = interpolate(frame.value, [0, 30], [0, 1])
  // Custom bounce curve
  return Math.sin(progress * Math.PI) * 20
})
```
