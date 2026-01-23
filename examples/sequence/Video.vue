<script setup>
/**
 * Sequence Example - Premium Motion Design Demo
 */
import { computed } from 'vue'
import { Sequence, useSequence, useFrame, useVideoConfig, interpolate, Easing } from 'pellicule'

const frame = useFrame()
const { fps } = useVideoConfig()

// Scene durations
const INTRO = { start: 0, duration: fps * 2.5 }
const CONTENT = { start: fps * 2.5, duration: fps * 4 }
const OUTRO = { start: fps * 6.5, duration: fps * 1.5 }

// Floating orbs in background
const orbs = [
  { x: 15, y: 20, size: 300, speed: 0.02, phase: 0 },
  { x: 85, y: 70, size: 400, speed: 0.015, phase: 2 },
  { x: 50, y: 85, size: 250, speed: 0.025, phase: 4 },
  { x: 70, y: 15, size: 350, speed: 0.018, phase: 1 },
]

const orbStyles = computed(() =>
  orbs.map(orb => {
    const drift = Math.sin(frame.value * orb.speed + orb.phase) * 30
    const pulse = 1 + Math.sin(frame.value * 0.05 + orb.phase) * 0.2
    return {
      left: `${orb.x}%`,
      top: `${orb.y + drift * 0.1}%`,
      width: `${orb.size * pulse}px`,
      height: `${orb.size * pulse}px`,
      opacity: 0.15 + Math.sin(frame.value * 0.03 + orb.phase) * 0.1,
    }
  })
)

// ===== INTRO =====
const intro = useSequence(INTRO.start, INTRO.duration)
const introTitle = 'PELLICULE'
const introLetters = computed(() =>
  introTitle.split('').map((letter, i) => {
    const delay = i * 4
    const progress = Math.max(0, intro.localFrame.value - delay)
    const y = interpolate(progress, [0, 15], [80, 0], { easing: Easing.easeOut })
    const opacity = interpolate(progress, [0, 10], [0, 1])
    const rotation = interpolate(progress, [0, 15], [-20, 0], { easing: Easing.easeOut })
    const scale = interpolate(progress, [0, 12, 18], [0.5, 1.1, 1], { easing: Easing.easeOut })
    return {
      letter,
      style: {
        opacity,
        transform: `translateY(${y}px) rotate(${rotation}deg) scale(${scale})`,
      }
    }
  })
)

const introLineWidth = computed(() => {
  const start = 30
  return interpolate(intro.localFrame.value, [start, start + 20], [0, 100], { easing: Easing.easeOut })
})

const introSubtitle = computed(() => {
  const start = 45
  const opacity = interpolate(intro.localFrame.value, [start, start + 15], [0, 1])
  const y = interpolate(intro.localFrame.value, [start, start + 20], [20, 0], { easing: Easing.easeOut })
  return { opacity, transform: `translateY(${y}px)` }
})

// ===== CONTENT =====
const content = useSequence(CONTENT.start, CONTENT.duration)
const features = [
  { text: 'COMPOSE', icon: '◆' },
  { text: 'ANIMATE', icon: '▲' },
  { text: 'RENDER', icon: '●' },
]

const featureStyles = computed(() =>
  features.map((_, i) => {
    const stagger = i * 20
    const localProgress = content.localFrame.value - stagger

    // Entrance
    const x = interpolate(localProgress, [0, 25], [i % 2 === 0 ? -200 : 200, 0], { easing: Easing.easeOut })
    const opacity = interpolate(localProgress, [0, 15], [0, 1])
    const scale = interpolate(localProgress, [0, 20, 28], [0.8, 1.05, 1], { easing: Easing.easeOut })

    // Icon rotation
    const rotation = interpolate(localProgress, [0, 30], [180, 0], { easing: Easing.easeOut })

    // Exit
    const exitStart = 90
    const exitOpacity = interpolate(content.localFrame.value, [exitStart, exitStart + 15], [1, 0])
    const exitScale = interpolate(content.localFrame.value, [exitStart, exitStart + 15], [1, 0.8])

    return {
      container: {
        opacity: opacity * exitOpacity,
        transform: `translateX(${x}px) scale(${scale * exitScale})`,
      },
      icon: {
        transform: `rotate(${rotation}deg)`,
      }
    }
  })
)

// Animated counter
const counter = computed(() => {
  const progress = interpolate(content.localFrame.value, [0, 80], [0, 100])
  return Math.floor(progress)
})

const counterStyle = computed(() => {
  const pulse = 1 + Math.sin(content.localFrame.value * 0.3) * 0.05
  const opacity = interpolate(content.localFrame.value, [90, 105], [1, 0])
  return {
    transform: `scale(${pulse})`,
    opacity,
  }
})

// ===== OUTRO =====
const outro = useSequence(OUTRO.start, OUTRO.duration)

const logoReveal = computed(() => {
  const scale = interpolate(outro.localFrame.value, [0, 20], [0, 1], { easing: Easing.easeOut })
  return { transform: `scale(${scale})` }
})

const logoBarStyles = computed(() => {
  const f = outro.localFrame.value
  return {
    left: {
      height: `${interpolate(f, [0, 15], [0, 100], { easing: Easing.easeOut })}%`,
      opacity: interpolate(f, [0, 10], [0, 1]),
    },
    right: {
      height: `${interpolate(f, [5, 20], [0, 100], { easing: Easing.easeOut })}%`,
      opacity: interpolate(f, [5, 15], [0, 1]),
    }
  }
})

const outroText = computed(() => {
  const start = 25
  const opacity = interpolate(outro.localFrame.value, [start, start + 10], [0, 1])
  const y = interpolate(outro.localFrame.value, [start, start + 15], [30, 0], { easing: Easing.easeOut })
  const letterSpacing = interpolate(outro.localFrame.value, [start, start + 20], [20, 4])
  return { opacity, transform: `translateY(${y}px)`, letterSpacing: `${letterSpacing}px` }
})
</script>

<template>
  <div class="video">
    <!-- Animated background orbs -->
    <div class="orbs">
      <div v-for="(style, i) in orbStyles" :key="i" class="orb" :style="style" />
    </div>

    <!-- Grid overlay -->
    <div class="grid-overlay" />

    <!-- INTRO -->
    <Sequence :from="INTRO.start" :duration-in-frames="INTRO.duration">
      <div class="scene intro">
        <div class="title">
          <span
            v-for="(item, i) in introLetters"
            :key="i"
            class="letter"
            :style="item.style"
          >{{ item.letter }}</span>
        </div>
        <div class="title-line" :style="{ width: introLineWidth + '%' }" />
        <p class="subtitle" :style="introSubtitle">Programmatic Video for Vue</p>
      </div>
    </Sequence>

    <!-- CONTENT -->
    <Sequence :from="CONTENT.start" :duration-in-frames="CONTENT.duration">
      <div class="scene content-scene">
        <div class="features">
          <div
            v-for="(feature, i) in features"
            :key="feature.text"
            class="feature"
            :style="featureStyles[i].container"
          >
            <span class="feature-icon" :style="featureStyles[i].icon">{{ feature.icon }}</span>
            <span class="feature-text">{{ feature.text }}</span>
          </div>
        </div>
        <div class="counter" :style="counterStyle">
          <span class="counter-value">{{ counter }}</span>
          <span class="counter-label">FPS RENDERED</span>
        </div>
      </div>
    </Sequence>

    <!-- OUTRO -->
    <Sequence :from="OUTRO.start" :duration-in-frames="OUTRO.duration">
      <div class="scene outro">
        <div class="logo-container" :style="logoReveal">
          <div class="logo">
            <div class="bar left" :style="logoBarStyles.left" />
            <div class="bar right" :style="logoBarStyles.right" />
          </div>
        </div>
        <p class="outro-text" :style="outroText">PELLICULE</p>
      </div>
    </Sequence>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

.video {
  width: 100%;
  height: 100%;
  background: #000000;
  font-family: 'Inter', sans-serif;
  color: white;
  position: relative;
  overflow: hidden;
}

/* Background effects */
.orbs {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(66, 184, 131, 0.4) 0%, transparent 70%);
  filter: blur(60px);
  transform: translate(-50%, -50%);
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(66, 184, 131, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(66, 184, 131, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}

/* Scene base */
.scene {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* INTRO */
.intro .title {
  display: flex;
  gap: 8px;
}

.intro .letter {
  font-size: 140px;
  font-weight: 900;
  letter-spacing: -4px;
  background: linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 80px rgba(66, 184, 131, 0.5);
}

.intro .title-line {
  height: 4px;
  background: linear-gradient(90deg, transparent, #42b883, transparent);
  margin-top: 20px;
  border-radius: 2px;
}

.intro .subtitle {
  margin-top: 30px;
  font-size: 28px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 8px;
  text-transform: uppercase;
}

/* CONTENT */
.content-scene {
  gap: 60px;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 30px;
}

.feature-icon {
  font-size: 48px;
  color: #42b883;
  text-shadow: 0 0 30px rgba(66, 184, 131, 0.8);
}

.feature-text {
  font-size: 72px;
  font-weight: 800;
  letter-spacing: 12px;
  background: linear-gradient(135deg, #ffffff 0%, #42b883 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.counter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 40px;
}

.counter-value {
  font-size: 96px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: #42b883;
  text-shadow: 0 0 60px rgba(66, 184, 131, 0.6);
}

.counter-label {
  font-size: 14px;
  letter-spacing: 6px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
}

/* OUTRO */
.outro {
  gap: 50px;
  background: #000000;
  z-index: 10;
}

.logo-container {
  display: flex;
  justify-content: center;
}

.logo {
  display: flex;
  gap: 24px;
  height: 200px;
  align-items: flex-end;
}

.logo .bar {
  width: 56px;
}

.logo .bar.left {
  background: linear-gradient(180deg, #6ee7a0 0%, #42b883 100%);
}

.logo .bar.right {
  background: linear-gradient(180deg, #42b883 0%, #1a4a3a 100%);
}

.outro-text {
  font-size: 32px;
  font-weight: 700;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.8);
}
</style>
