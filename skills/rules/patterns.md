---
name: patterns
description: Common patterns for Pellicule - typewriter, staggered, scenes, loops
metadata:
  tags: patterns, typewriter, staggered, scenes, loop
---

# Common Patterns

## Typewriter Effect

Reveal text character by character:

```vue
<script setup>
import { computed } from 'vue'
import { useFrame } from 'pellicule'

const frame = useFrame()
const text = 'Hello, World!'

const visibleChars = computed(() => {
  const charsPerFrame = 0.5 // Adjust speed
  return Math.min(Math.floor(frame.value * charsPerFrame), text.length)
})

// Blinking cursor
const showCursor = computed(() =>
  visibleChars.value < text.length && Math.floor(frame.value / 8) % 2 === 0
)
</script>

<template>
  <span>{{ text.slice(0, visibleChars) }}</span>
  <span v-if="showCursor" class="cursor">|</span>
</template>
```

## Staggered Animations

Animate multiple items with delay:

```vue
<script setup>
import { computed } from 'vue'
import { useFrame, interpolate, Easing } from 'pellicule'

const frame = useFrame()
const items = ['First', 'Second', 'Third']

const itemStyles = computed(() =>
  items.map((_, i) => {
    const delay = i * 10 // 10 frames between each
    const opacity = interpolate(
      frame.value,
      [delay, delay + 20],
      [0, 1],
      { easing: Easing.easeOut }
    )
    const y = interpolate(
      frame.value,
      [delay, delay + 20],
      [30, 0],
      { easing: Easing.easeOut }
    )
    return { opacity, transform: `translateY(${y}px)` }
  })
)
</script>

<template>
  <div v-for="(item, i) in items" :key="i" :style="itemStyles[i]">
    {{ item }}
  </div>
</template>
```

## Scene Management

Organize video into scenes:

```vue
<script setup>
import { computed } from 'vue'
import { useFrame, useVideoConfig, interpolate } from 'pellicule'

const frame = useFrame()
const { fps } = useVideoConfig()

// Define scenes
const SCENES = {
  intro: { start: 0, end: fps * 3 },           // 0-3 seconds
  main: { start: fps * 3, end: fps * 8 },      // 3-8 seconds
  outro: { start: fps * 8, end: fps * 10 }     // 8-10 seconds
}

const currentScene = computed(() => {
  if (frame.value < SCENES.intro.end) return 'intro'
  if (frame.value < SCENES.main.end) return 'main'
  return 'outro'
})

// Scene-specific animations
const introOpacity = computed(() => {
  const fadeIn = interpolate(frame.value, [0, fps * 0.5], [0, 1])
  const fadeOut = interpolate(
    frame.value,
    [SCENES.intro.end - fps * 0.5, SCENES.intro.end],
    [1, 0]
  )
  return Math.min(fadeIn, fadeOut)
})
</script>

<template>
  <div v-if="currentScene === 'intro'" :style="{ opacity: introOpacity }">
    Intro Scene
  </div>
  <div v-else-if="currentScene === 'main'">
    Main Content
  </div>
  <div v-else>
    Outro
  </div>
</template>
```

## Looping Animations

Create repeating animations:

```vue
<script setup>
import { computed } from 'vue'
import { useFrame } from 'pellicule'

const frame = useFrame()

// Sine wave bounce (60-frame cycle)
const bounce = computed(() => {
  const cycle = frame.value % 60
  return Math.sin((cycle / 60) * Math.PI * 2) * 20
})

// Pulsing scale (30-frame cycle)
const scale = computed(() => {
  const cycle = frame.value % 30
  const progress = cycle / 30
  return 1 + Math.sin(progress * Math.PI * 2) * 0.1
})

// Rotation (continuous)
const rotation = computed(() => (frame.value * 2) % 360)
</script>

<template>
  <div :style="{
    transform: `translateY(${bounce}px) scale(${scale}) rotate(${rotation}deg)`
  }">
    Animated!
  </div>
</template>
```

## Delayed Start

Start an animation after a delay:

```vue
<script setup>
import { computed } from 'vue'
import { useFrame, useVideoConfig, interpolate, Easing } from 'pellicule'

const frame = useFrame()
const { fps } = useVideoConfig()

const delay = fps * 2 // Wait 2 seconds

const opacity = computed(() => {
  if (frame.value < delay) return 0
  return interpolate(
    frame.value - delay, // Offset frame count
    [0, fps * 0.5],
    [0, 1],
    { easing: Easing.easeOut }
  )
})
</script>
```

## Combining Fade In/Out

Appear and disappear:

```vue
<script setup>
import { computed } from 'vue'
import { useFrame, useVideoConfig, interpolate } from 'pellicule'

const frame = useFrame()
const { fps, durationInFrames } = useVideoConfig()

const opacity = computed(() => {
  const fadeIn = interpolate(frame.value, [0, fps], [0, 1])
  const fadeOut = interpolate(
    frame.value,
    [durationInFrames - fps, durationInFrames],
    [1, 0]
  )
  return Math.min(fadeIn, fadeOut)
})
</script>
```
