<script setup>
/**
 * Sequence Example
 *
 * Demonstrates using <Sequence> for structured video content:
 * - Intro (0-2s)
 * - Main content (2-6s)
 * - Outro (6-8s)
 *
 * Each section uses useSequence() to get local timing -
 * components don't need to know their absolute position in the timeline.
 */
import { computed } from 'vue'
import { Sequence, useSequence, useVideoConfig, interpolate, Easing } from 'pellicule'

const { fps } = useVideoConfig()

// Scene durations (in frames)
const INTRO = { start: 0, duration: fps * 2 }
const CONTENT = { start: fps * 2, duration: fps * 4 }
const OUTRO = { start: fps * 6, duration: fps * 2 }

// Content items for staggered animation
const items = ['Build', 'Animate', 'Render']
</script>

<template>
  <div class="video">
    <!-- INTRO: Fade in title -->
    <Sequence :from="INTRO.start" :duration-in-frames="INTRO.duration">
      <IntroSection />
    </Sequence>

    <!-- CONTENT: Staggered items -->
    <Sequence :from="CONTENT.start" :duration-in-frames="CONTENT.duration">
      <ContentSection :items="items" />
    </Sequence>

    <!-- OUTRO: Logo reveal -->
    <Sequence :from="OUTRO.start" :duration-in-frames="OUTRO.duration">
      <OutroSection />
    </Sequence>
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { useSequence, interpolate, Easing } from 'pellicule'

// Intro Section - uses local frame from Sequence
const IntroSection = defineComponent({
  setup() {
    const { localFrame } = useSequence()

    const style = computed(() => {
      const opacity = interpolate(localFrame.value, [0, 15], [0, 1], { easing: Easing.easeOut })
      const scale = interpolate(localFrame.value, [0, 20], [0.8, 1], { easing: Easing.easeOut })
      const y = interpolate(localFrame.value, [0, 20], [40, 0], { easing: Easing.easeOut })
      return { opacity, transform: `scale(${scale}) translateY(${y}px)` }
    })

    return { style }
  },
  template: `
    <div class="scene" :style="style">
      <h1>Welcome</h1>
      <p class="subtitle">A Pellicule Sequence Demo</p>
    </div>
  `
})

// Content Section - staggered items with local timing
const ContentSection = defineComponent({
  props: ['items'],
  setup(props) {
    const { localFrame } = useSequence()

    const itemStyles = computed(() =>
      props.items.map((_, i) => {
        const delay = i * 15
        const opacity = interpolate(localFrame.value, [delay, delay + 20], [0, 1], { easing: Easing.easeOut })
        const x = interpolate(localFrame.value, [delay, delay + 20], [-50, 0], { easing: Easing.easeOut })
        return { opacity, transform: `translateX(${x}px)` }
      })
    )

    const containerStyle = computed(() => ({
      opacity: interpolate(localFrame.value, [100, 120], [1, 0])
    }))

    return { itemStyles, containerStyle }
  },
  template: `
    <div class="scene content" :style="containerStyle">
      <div v-for="(item, i) in items" :key="item" class="item" :style="itemStyles[i]">
        {{ item }}
      </div>
    </div>
  `
})

// Outro Section - logo reveal
const OutroSection = defineComponent({
  setup() {
    const { localFrame } = useSequence()

    const style = computed(() => {
      const opacity = interpolate(localFrame.value, [0, 15], [0, 1], { easing: Easing.easeOut })
      const scale = interpolate(localFrame.value, [0, 20], [0.9, 1], { easing: Easing.easeOut })
      return { opacity, transform: `scale(${scale})` }
    })

    return { style }
  },
  template: `
    <div class="scene outro" :style="style">
      <div class="logo">
        <div class="bar left"></div>
        <div class="bar right"></div>
      </div>
      <p>Made with Pellicule</p>
    </div>
  `
})

export default {
  components: { IntroSection, ContentSection, OutroSection }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

.video {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0a0a12 0%, #1a1a2e 100%);
  font-family: 'Inter', sans-serif;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.scene {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/* Intro */
h1 {
  font-size: 120px;
  font-weight: 900;
  margin: 0;
  letter-spacing: -4px;
}

.subtitle {
  font-size: 32px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 16px;
}

/* Content */
.content {
  gap: 24px;
}

.content .item {
  font-size: 72px;
  font-weight: 700;
  background: linear-gradient(135deg, #42b883 0%, #6ee7a0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Outro */
.outro {
  gap: 32px;
}

.outro .logo {
  display: flex;
  gap: 20px;
}

.outro .bar {
  width: 48px;
  height: 160px;
}

.outro .bar.left {
  background: linear-gradient(180deg, #6ee7a0 0%, #42b883 100%);
}

.outro .bar.right {
  background: linear-gradient(180deg, #42b883 0%, #1a3a4a 100%);
}

.outro p {
  font-size: 28px;
  color: rgba(255, 255, 255, 0.5);
}
</style>
