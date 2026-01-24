<script setup>
/**
 * Karaoke Example - Mind-Blowing Edition
 *
 * Playful colors, particle explosions, bouncing letters,
 * and wild visual effects.
 */
import { computed } from 'vue'
import { useFrame, useVideoConfig, interpolate, Easing } from 'pellicule'

const frame = useFrame()
const { fps } = useVideoConfig()

// Vibrant color palette
const colors = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
  '#F38181', // Salmon
  '#AA96DA', // Lavender
  '#FCBAD3', // Pink
  '#A8D8EA', // Sky Blue
]

// Lyrics with timing
const lyrics = [
  { text: 'Never', start: fps * 0.0, end: fps * 0.5 },
  { text: 'gonna', start: fps * 0.5, end: fps * 1.0 },
  { text: 'give', start: fps * 1.0, end: fps * 1.4 },
  { text: 'you', start: fps * 1.4, end: fps * 1.8 },
  { text: 'up', start: fps * 1.8, end: fps * 2.5 },

  { text: 'Never', start: fps * 3.0, end: fps * 3.5 },
  { text: 'gonna', start: fps * 3.5, end: fps * 4.0 },
  { text: 'let', start: fps * 4.0, end: fps * 4.4 },
  { text: 'you', start: fps * 4.4, end: fps * 4.8 },
  { text: 'down', start: fps * 4.8, end: fps * 5.5 },

  { text: 'Never', start: fps * 6.0, end: fps * 6.5 },
  { text: 'gonna', start: fps * 6.5, end: fps * 7.0 },
  { text: 'run', start: fps * 7.0, end: fps * 7.5 },
  { text: 'around', start: fps * 7.5, end: fps * 8.5 },
]

// Group into lines
const lines = computed(() => {
  const result = []
  let currentLine = []

  lyrics.forEach((word, i) => {
    currentLine.push({ ...word, globalIndex: i })
    const next = lyrics[i + 1]
    if (!next || next.start - word.end > fps * 0.8) {
      result.push([...currentLine])
      currentLine = []
    }
  })
  return result
})

// Current line
const currentLineIndex = computed(() => {
  for (let i = 0; i < lines.value.length; i++) {
    const line = lines.value[i]
    const start = line[0].start - fps * 0.3
    const end = line[line.length - 1].end + fps * 0.5
    if (frame.value >= start && frame.value < end) return i
  }
  return -1
})

// Word state helpers
function isActive(word) {
  return frame.value >= word.start && frame.value < word.end
}

function isPast(word) {
  return frame.value >= word.end
}

function getProgress(word) {
  if (frame.value < word.start) return 0
  if (frame.value >= word.end) return 1
  return (frame.value - word.start) / (word.end - word.start)
}

// Animated word styles with bouncing letters
const wordStyles = computed(() => {
  return lyrics.map((word, wi) => {
    const active = isActive(word)
    const past = isPast(word)
    const progress = getProgress(word)

    // Scale pop when becoming active
    const scale = active
      ? interpolate(progress, [0, 0.2, 0.4], [1, 1.3, 1.1], { easing: Easing.easeOut })
      : past ? 1 : 0.9

    // Rotation wiggle when active
    const rotation = active
      ? Math.sin(frame.value * 0.5 + wi) * 3
      : 0

    // Color - cycle through palette
    const colorIndex = wi % colors.length
    const color = past || active ? colors[colorIndex] : 'rgba(255,255,255,0.25)'

    // Glow intensity
    const glow = active ? 30 : past ? 15 : 0

    return {
      transform: `scale(${scale}) rotate(${rotation}deg)`,
      color,
      textShadow: glow > 0 ? `0 0 ${glow}px ${color}, 0 0 ${glow * 2}px ${color}` : 'none',
      filter: active ? 'brightness(1.2)' : 'none',
    }
  })
})

// Floating particles
const particles = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 4 + Math.random() * 12,
  speed: 0.3 + Math.random() * 0.7,
  hue: Math.random() * 360,
  phase: Math.random() * Math.PI * 2,
}))

const particleStyles = computed(() => {
  return particles.map(p => {
    const y = (p.y + frame.value * p.speed * 0.5) % 120 - 10
    const x = p.x + Math.sin(frame.value * 0.05 + p.phase) * 15
    const hue = (p.hue + frame.value * 2) % 360
    const scale = 0.5 + Math.sin(frame.value * 0.1 + p.phase) * 0.5

    return {
      left: `${x}%`,
      top: `${y}%`,
      width: `${p.size * scale}px`,
      height: `${p.size * scale}px`,
      background: `hsl(${hue}, 80%, 65%)`,
      boxShadow: `0 0 ${p.size}px hsl(${hue}, 80%, 65%)`,
    }
  })
})

// Background gradient animation
const bgStyle = computed(() => {
  const hue1 = (frame.value * 1.5) % 360
  const hue2 = (hue1 + 60) % 360
  const hue3 = (hue1 + 180) % 360

  return {
    background: `
      radial-gradient(ellipse at 20% 20%, hsla(${hue1}, 70%, 50%, 0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, hsla(${hue2}, 70%, 50%, 0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, hsla(${hue3}, 60%, 20%, 0.5) 0%, transparent 70%),
      linear-gradient(135deg, #0d0d1a 0%, #1a0d2e 50%, #0d1a1a 100%)
    `
  }
})

// Burst particles when word activates
const burstParticles = computed(() => {
  const bursts = []
  lyrics.forEach((word, wi) => {
    const timeSinceStart = frame.value - word.start
    if (timeSinceStart >= 0 && timeSinceStart < 20) {
      // Create burst effect
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        const distance = timeSinceStart * 8
        const opacity = 1 - timeSinceStart / 20
        const size = 8 - timeSinceStart * 0.3

        bursts.push({
          key: `${wi}-${i}`,
          x: 50 + Math.cos(angle) * distance * 0.5,
          y: 50 + Math.sin(angle) * distance,
          size: Math.max(2, size),
          opacity,
          color: colors[wi % colors.length],
        })
      }
    }
  })
  return bursts
})

// Progress bar with rainbow
const progressWidth = computed(() => (frame.value / (fps * 10)) * 100)
const progressGradient = computed(() => {
  const hue = (frame.value * 3) % 360
  return `linear-gradient(90deg,
    hsl(${hue}, 80%, 60%) 0%,
    hsl(${(hue + 60) % 360}, 80%, 60%) 50%,
    hsl(${(hue + 120) % 360}, 80%, 60%) 100%)`
})
</script>

<template>
  <div class="video" :style="bgStyle">
    <!-- Floating particles -->
    <div class="particles">
      <div
        v-for="(style, i) in particleStyles"
        :key="i"
        class="particle"
        :style="style"
      />
    </div>

    <!-- Burst particles -->
    <div class="bursts">
      <div
        v-for="burst in burstParticles"
        :key="burst.key"
        class="burst"
        :style="{
          left: burst.x + '%',
          top: burst.y + '%',
          width: burst.size + 'px',
          height: burst.size + 'px',
          opacity: burst.opacity,
          background: burst.color,
          boxShadow: `0 0 ${burst.size * 2}px ${burst.color}`,
        }"
      />
    </div>

    <!-- Lyrics -->
    <div class="lyrics-container">
      <div
        v-for="(line, li) in lines"
        v-show="li === currentLineIndex"
        :key="li"
        class="line"
      >
        <span
          v-for="word in line"
          :key="word.globalIndex"
          class="word"
          :style="wordStyles[word.globalIndex]"
        >
          {{ word.text }}
        </span>
      </div>
    </div>

    <!-- Rainbow progress bar -->
    <div class="progress-container">
      <div
        class="progress-bar"
        :style="{
          width: progressWidth + '%',
          background: progressGradient,
        }"
      />
    </div>

    <!-- Corner decorations -->
    <div class="corner corner-tl" />
    <div class="corner corner-tr" />
    <div class="corner corner-bl" />
    <div class="corner corner-br" />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap');

.video {
  width: 100%;
  height: 100%;
  font-family: 'Fredoka', sans-serif;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

/* Particles */
.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.6;
}

/* Burst particles */
.bursts {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.burst {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

/* Lyrics */
.lyrics-container {
  position: relative;
  z-index: 10;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.line {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 1400px;
  padding: 0 40px;
}

.word {
  font-size: 120px;
  font-weight: 700;
  letter-spacing: -2px;
  transition: transform 0.1s ease;
  display: inline-block;
}

/* Progress bar */
.progress-container {
  position: absolute;
  bottom: 60px;
  width: 70%;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  z-index: 10;
}

.progress-bar {
  height: 100%;
  transition: width 0.033s linear;
}

/* Corner decorations */
.corner {
  position: absolute;
  width: 100px;
  height: 100px;
  border: 4px solid rgba(255, 255, 255, 0.2);
}

.corner-tl {
  top: 40px;
  left: 40px;
  border-right: none;
  border-bottom: none;
}

.corner-tr {
  top: 40px;
  right: 40px;
  border-left: none;
  border-bottom: none;
}

.corner-bl {
  bottom: 100px;
  left: 40px;
  border-right: none;
  border-top: none;
}

.corner-br {
  bottom: 100px;
  right: 40px;
  border-left: none;
  border-top: none;
}
</style>
