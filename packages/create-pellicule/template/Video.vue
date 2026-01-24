<script setup>
import { computed } from 'vue'
import { useFrame, useVideoConfig, interpolate, Easing } from 'pellicule'

const frame = useFrame()
const { width, height, fps, durationInFrames } = useVideoConfig()

// Animation: fade in and scale up
const opacity = computed(() =>
  interpolate(frame.value, [0, 30], [0, 1])
)

const scale = computed(() =>
  interpolate(frame.value, [0, 30], [0.8, 1], { easing: Easing.easeOut })
)

// Animation: slide up the subtitle
const subtitleY = computed(() =>
  interpolate(frame.value, [20, 50], [40, 0], { easing: Easing.easeOut })
)

const subtitleOpacity = computed(() =>
  interpolate(frame.value, [20, 50], [0, 1])
)
</script>

<template>
  <div class="video">
    <!-- Main content -->
    <div
      class="content"
      :style="{
        opacity,
        transform: `scale(${scale})`
      }"
    >
      <h1 class="title">Hello, Pellicule!</h1>

      <p
        class="subtitle"
        :style="{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`
        }"
      >
        Vue-native programmatic video
      </p>
    </div>

    <!-- Frame counter (helpful for debugging) -->
    <div class="frame-info">
      Frame {{ frame }} / {{ durationInFrames }}
    </div>
  </div>
</template>

<style scoped>
.video {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: system-ui, -apple-system, sans-serif;
  color: white;
}

.content {
  text-align: center;
}

.title {
  font-size: 72px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #42b883 0%, #6ee7a0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 32px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 20px;
}

.frame-info {
  position: absolute;
  bottom: 40px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.3);
  font-family: monospace;
}
</style>
