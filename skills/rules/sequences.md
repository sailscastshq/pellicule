---
name: sequences
description: Sequence component and useSequence composable for scene management
metadata:
  tags: sequence, scenes, composition, timing, useSequence
---

# Sequences

Sequences let you organize videos into distinct scenes with automatic timing. Much cleaner than manual frame math.

## The Sequence Component

Wrap content in `<Sequence>` to show it only during specific frames:

```vue
<script setup>
import { Sequence } from 'pellicule'
</script>

<template>
  <div class="video">
    <!-- Frames 0-89: Intro -->
    <Sequence :from="0" :durationInFrames="90">
      <IntroScene />
    </Sequence>

    <!-- Frames 90-209: Main content -->
    <Sequence :from="90" :durationInFrames="120">
      <MainScene />
    </Sequence>

    <!-- Frames 210-299: Outro -->
    <Sequence :from="210" :durationInFrames="90">
      <OutroScene />
    </Sequence>
  </div>
</template>
```

Props:
- `from` - Start frame (required)
- `durationInFrames` - How long in frames (required)

The content only renders when the global frame is within range.

## useSequence Composable

Get timing information relative to your sequence:

```vue
<script setup>
import { computed } from 'vue'
import { useSequence, interpolate, Easing } from 'pellicule'

// Inside a <Sequence>, no arguments needed
const { localFrame, progress, isActive } = useSequence()

// localFrame: 0, 1, 2... (resets for each sequence)
// progress: 0 to 1 across the sequence
// isActive: true when sequence is showing

const opacity = computed(() =>
  interpolate(localFrame.value, [0, 30], [0, 1], { easing: Easing.easeOut })
)
</script>
```

### Standalone Usage

Use `useSequence` without a parent component by passing timing directly:

```vue
<script setup>
import { computed } from 'vue'
import { useSequence, interpolate } from 'pellicule'

// Define sequences manually
const intro = useSequence(0, 90)      // frames 0-89
const main = useSequence(90, 120)     // frames 90-209
const outro = useSequence(210, 90)    // frames 210-299

// Animate based on sequence progress
const introOpacity = computed(() =>
  intro.isActive.value
    ? interpolate(intro.progress.value, [0, 0.5, 1], [0, 1, 0])
    : 0
)
</script>

<template>
  <div v-if="intro.isActive.value" :style="{ opacity: introOpacity }">
    Intro Content
  </div>
  <div v-if="main.isActive.value">
    Main Content
  </div>
  <div v-if="outro.isActive.value">
    Outro Content
  </div>
</template>
```

## useSequence Return Values

| Property | Type | Description |
|----------|------|-------------|
| `localFrame` | `ComputedRef<number>` | Frame number relative to sequence start (0, 1, 2...) |
| `progress` | `ComputedRef<number>` | Progress from 0 to 1 across the sequence |
| `isActive` | `ComputedRef<boolean>` | Whether current frame is within this sequence |

## Building a Multi-Scene Video

```vue
<script setup>
import { Sequence, useVideoConfig } from 'pellicule'

const { fps } = useVideoConfig()

// Scene durations in seconds, converted to frames
const INTRO_DURATION = fps * 3    // 3 seconds
const MAIN_DURATION = fps * 5     // 5 seconds
const OUTRO_DURATION = fps * 2    // 2 seconds

// Calculate start frames
const MAIN_START = INTRO_DURATION
const OUTRO_START = MAIN_START + MAIN_DURATION
</script>

<template>
  <div class="video">
    <Sequence :from="0" :durationInFrames="INTRO_DURATION">
      <IntroScene />
    </Sequence>

    <Sequence :from="MAIN_START" :durationInFrames="MAIN_DURATION">
      <MainScene />
    </Sequence>

    <Sequence :from="OUTRO_START" :durationInFrames="OUTRO_DURATION">
      <OutroScene />
    </Sequence>
  </div>
</template>
```

## Scene Component Pattern

Create reusable scene components that use `useSequence` internally:

```vue
<!-- IntroScene.vue -->
<script setup>
import { computed } from 'vue'
import { useSequence, interpolate, Easing } from 'pellicule'

// Automatically gets timing from parent <Sequence>
const { localFrame, progress } = useSequence()

const titleOpacity = computed(() =>
  interpolate(localFrame.value, [0, 30], [0, 1], { easing: Easing.easeOut })
)

const titleY = computed(() =>
  interpolate(localFrame.value, [0, 30], [50, 0], { easing: Easing.easeOut })
)

// Fade out at end using progress
const fadeOut = computed(() =>
  interpolate(progress.value, [0.7, 1], [1, 0])
)
</script>

<template>
  <div
    class="intro"
    :style="{
      opacity: titleOpacity * fadeOut,
      transform: `translateY(${titleY}px)`
    }"
  >
    <h1>Welcome</h1>
  </div>
</template>
```

## When to Use Sequences vs Manual Frame Math

**Use `<Sequence>` + `useSequence` when:**
- Video has distinct scenes or sections
- You want components to manage their own animations
- Scenes need fade in/out or self-contained timing

**Use manual frame math when:**
- Simple single-scene video
- Animations span the entire duration
- You need precise control over every frame
