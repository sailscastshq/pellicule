<script setup>
/**
 * Pellicule - Hero Product Video
 *
 * A cinematic showcase with particle systems, light rays,
 * and premium motion design. Sharp edges, no rounded corners.
 */
import { computed } from 'vue'
import { Sequence, useSequence, useFrame, useVideoConfig, interpolate, Easing } from 'pellicule'

const frame = useFrame()
const { fps } = useVideoConfig()

// =============================================================================
// SCENE TIMING - 10 second video (300 frames at 30fps)
// =============================================================================
const SCENES = {
  LOGO: { start: 0, duration: fps * 3 },
  TAGLINE: { start: fps * 3, duration: fps * 2.5 },
  TERMINAL: { start: fps * 5.5, duration: fps * 2.5 },
  FEATURES: { start: fps * 8, duration: fps * 1.5 },
  FINAL: { start: fps * 9.5, duration: fps * 0.5 }
}

// =============================================================================
// GLOBAL EFFECTS
// =============================================================================

// Floating particles
const particles = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 4,
  speed: 0.1 + Math.random() * 0.3,
  opacity: 0.1 + Math.random() * 0.4,
  phase: Math.random() * Math.PI * 2
}))

const particleStyles = computed(() => {
  return particles.map(p => {
    const y = (p.y + frame.value * p.speed * 0.3) % 110 - 5
    const x = p.x + Math.sin(frame.value * 0.02 + p.phase) * 8
    const pulse = 0.5 + Math.sin(frame.value * 0.05 + p.phase) * 0.5

    return {
      left: `${x}%`,
      top: `${y}%`,
      width: `${p.size * pulse}px`,
      height: `${p.size * pulse}px`,
      opacity: p.opacity * pulse
    }
  })
})

// Light rays emanating from center
const rayStyles = computed(() => {
  const rays = []
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * 360 + frame.value * 0.3
    const length = 800 + Math.sin(frame.value * 0.05 + i) * 200
    const opacity = 0.03 + Math.sin(frame.value * 0.03 + i * 0.5) * 0.02

    rays.push({
      transform: `rotate(${angle}deg)`,
      width: `${length}px`,
      opacity
    })
  }
  return rays
})

// Ambient glow pulse
const glowIntensity = computed(() =>
  0.15 + Math.sin(frame.value * 0.03) * 0.05
)

// =============================================================================
// SCENE 1: LOGO REVEAL
// =============================================================================
const logo = useSequence(SCENES.LOGO.start, SCENES.LOGO.duration)

const logoBarLeftHeight = computed(() =>
  interpolate(logo.localFrame.value, [0, 25], [0, 100], { easing: Easing.easeOut })
)

const logoBarRightHeight = computed(() =>
  interpolate(logo.localFrame.value, [5, 30], [0, 100], { easing: Easing.easeOut })
)

const logoTextOpacity = computed(() =>
  interpolate(logo.localFrame.value, [25, 45], [0, 1])
)

const logoTextY = computed(() =>
  interpolate(logo.localFrame.value, [25, 50], [30, 0], { easing: Easing.easeOut })
)

const logoScale = computed(() =>
  interpolate(logo.localFrame.value, [60, 90], [1, 0.85], { easing: Easing.easeInOut })
)

const logoSceneOpacity = computed(() =>
  interpolate(logo.localFrame.value, [75, 90], [1, 0])
)

// =============================================================================
// SCENE 2: TAGLINE
// =============================================================================
const tagline = useSequence(SCENES.TAGLINE.start, SCENES.TAGLINE.duration)

const taglineWords = ['Write', 'Vue.', 'Render', 'Videos.']

const taglineWordStyles = computed(() => {
  return taglineWords.map((_, i) => {
    const delay = i * 8
    const localProgress = tagline.localFrame.value - delay

    const opacity = interpolate(localProgress, [0, 12], [0, 1])
    const y = interpolate(localProgress, [0, 15], [40, 0], { easing: Easing.easeOut })
    const scale = interpolate(localProgress, [0, 12, 18], [0.9, 1.05, 1], { easing: Easing.easeOut })

    // Green highlight on "Vue." and "Videos."
    const isHighlight = i === 1 || i === 3

    return {
      opacity,
      transform: `translateY(${y}px) scale(${scale})`,
      color: isHighlight ? '#42b883' : 'white'
    }
  })
})

const taglineSceneOpacity = computed(() =>
  interpolate(tagline.localFrame.value, [60, 75], [1, 0])
)

// =============================================================================
// SCENE 3: TERMINAL
// =============================================================================
const terminal = useSequence(SCENES.TERMINAL.start, SCENES.TERMINAL.duration)

const terminalCommand = 'npx pellicule Video.vue -o video.mp4'

const terminalTypedChars = computed(() => {
  const typingStart = 10
  const charsTyped = Math.floor((terminal.localFrame.value - typingStart) * 0.8)
  return Math.max(0, Math.min(charsTyped, terminalCommand.length))
})

const showTerminalCursor = computed(() => {
  return Math.floor(terminal.localFrame.value / 8) % 2 === 0
})

const terminalScale = computed(() =>
  interpolate(terminal.localFrame.value, [0, 20], [0.95, 1], { easing: Easing.easeOut })
)

const terminalOpacity = computed(() => {
  const fadeIn = interpolate(terminal.localFrame.value, [0, 15], [0, 1])
  const fadeOut = interpolate(terminal.localFrame.value, [60, 75], [1, 0])
  return Math.min(fadeIn, fadeOut)
})

const terminalOutputOpacity = computed(() =>
  interpolate(terminal.localFrame.value, [40, 50], [0, 1])
)

const progressWidth = computed(() => {
  const start = 45
  return interpolate(terminal.localFrame.value, [start, start + 25], [0, 100])
})

// =============================================================================
// SCENE 4: FEATURES
// =============================================================================
const features = useSequence(SCENES.FEATURES.start, SCENES.FEATURES.duration)

const featureItems = [
  { icon: '◆', text: 'Vue 3 + Vite' },
  { icon: '▲', text: 'Frame-perfect' },
  { icon: '●', text: 'MP4 output' }
]

const featureStyles = computed(() => {
  return featureItems.map((_, i) => {
    const delay = i * 6
    const localProgress = features.localFrame.value - delay

    const opacity = interpolate(localProgress, [0, 10], [0, 1])
    const x = interpolate(localProgress, [0, 15], [80, 0], { easing: Easing.easeOut })

    return {
      opacity,
      transform: `translateX(${x}px)`
    }
  })
})

const featuresSceneOpacity = computed(() =>
  interpolate(features.localFrame.value, [35, 45], [1, 0])
)

// =============================================================================
// SCENE 5: FINAL LOGO
// =============================================================================
const final = useSequence(SCENES.FINAL.start, SCENES.FINAL.duration)

const finalScale = computed(() =>
  interpolate(final.localFrame.value, [0, 10], [0.8, 1], { easing: Easing.easeOut })
)

const finalOpacity = computed(() =>
  interpolate(final.localFrame.value, [0, 8], [0, 1])
)
</script>

<template>
  <div class="video">
    <!-- Background gradient -->
    <div class="bg-gradient" />

    <!-- Ambient glow -->
    <div class="ambient-glow" :style="{ opacity: glowIntensity }" />

    <!-- Light rays -->
    <div class="rays">
      <div
        v-for="(style, i) in rayStyles"
        :key="i"
        class="ray"
        :style="style"
      />
    </div>

    <!-- Floating particles -->
    <div class="particles">
      <div
        v-for="(style, i) in particleStyles"
        :key="i"
        class="particle"
        :style="style"
      />
    </div>

    <!-- ================================================================== -->
    <!-- SCENE 1: Logo Reveal -->
    <!-- ================================================================== -->
    <Sequence :from="SCENES.LOGO.start" :duration-in-frames="SCENES.LOGO.duration">
      <div
        class="scene logo-scene"
        :style="{
          opacity: logoSceneOpacity,
          transform: `scale(${logoScale})`
        }"
      >
        <div class="logo-container">
          <!-- Logo bars -->
          <div class="logo-bars">
            <div
              class="bar left"
              :style="{ height: `${logoBarLeftHeight}%` }"
            />
            <div
              class="bar right"
              :style="{ height: `${logoBarRightHeight}%` }"
            />
          </div>

          <!-- Wordmark -->
          <div
            class="wordmark"
            :style="{
              opacity: logoTextOpacity,
              transform: `translateY(${logoTextY}px)`
            }"
          >
            Pellicule
          </div>
        </div>
      </div>
    </Sequence>

    <!-- ================================================================== -->
    <!-- SCENE 2: Tagline -->
    <!-- ================================================================== -->
    <Sequence :from="SCENES.TAGLINE.start" :duration-in-frames="SCENES.TAGLINE.duration">
      <div
        class="scene tagline-scene"
        :style="{ opacity: taglineSceneOpacity }"
      >
        <h1 class="tagline">
          <span
            v-for="(word, i) in taglineWords"
            :key="i"
            class="tagline-word"
            :style="taglineWordStyles[i]"
          >{{ word }}</span>
        </h1>

        <p class="sub-tagline" :style="{ opacity: taglineWordStyles[3]?.opacity || 0 }">
          Programmatic video generation for Vue
        </p>
      </div>
    </Sequence>

    <!-- ================================================================== -->
    <!-- SCENE 3: Terminal -->
    <!-- ================================================================== -->
    <Sequence :from="SCENES.TERMINAL.start" :duration-in-frames="SCENES.TERMINAL.duration">
      <div
        class="scene terminal-scene"
        :style="{ opacity: terminalOpacity }"
      >
        <div
          class="terminal"
          :style="{ transform: `scale(${terminalScale})` }"
        >
          <div class="terminal-header">
            <div class="terminal-buttons">
              <span class="btn red" />
              <span class="btn yellow" />
              <span class="btn green" />
            </div>
            <span class="terminal-title">Terminal</span>
          </div>

          <div class="terminal-body">
            <div class="terminal-line">
              <span class="prompt">$</span>
              <span class="command">{{ terminalCommand.slice(0, terminalTypedChars) }}</span>
              <span v-if="showTerminalCursor" class="cursor">▋</span>
            </div>

            <div class="terminal-output" :style="{ opacity: terminalOutputOpacity }">
              <div class="output-line">
                <span class="label">PELLICULE</span>
                <span class="value accent">v1.0.0</span>
              </div>
              <div class="output-line">
                <span class="label">Rendering</span>
                <span class="value">Video.vue → video.mp4</span>
              </div>
              <div class="progress-container">
                <div class="progress-bar" :style="{ width: `${progressWidth}%` }" />
              </div>
              <div class="output-line">
                <span class="label">Progress</span>
                <span class="value accent">{{ Math.floor(progressWidth) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Sequence>

    <!-- ================================================================== -->
    <!-- SCENE 4: Features -->
    <!-- ================================================================== -->
    <Sequence :from="SCENES.FEATURES.start" :duration-in-frames="SCENES.FEATURES.duration">
      <div
        class="scene features-scene"
        :style="{ opacity: featuresSceneOpacity }"
      >
        <div class="features">
          <div
            v-for="(feature, i) in featureItems"
            :key="i"
            class="feature"
            :style="featureStyles[i]"
          >
            <span class="feature-icon">{{ feature.icon }}</span>
            <span class="feature-text">{{ feature.text }}</span>
          </div>
        </div>
      </div>
    </Sequence>

    <!-- ================================================================== -->
    <!-- SCENE 5: Final Logo -->
    <!-- ================================================================== -->
    <Sequence :from="SCENES.FINAL.start" :duration-in-frames="SCENES.FINAL.duration">
      <div class="scene final-scene">
        <div
          class="final-logo"
          :style="{
            opacity: finalOpacity,
            transform: `scale(${finalScale})`
          }"
        >
          <div class="bar left" />
          <div class="bar right" />
        </div>
      </div>
    </Sequence>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');

.video {
  width: 100%;
  height: 100%;
  background: #000;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow: hidden;
}

/* Background effects */
.bg-gradient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 40%, rgba(66, 184, 131, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 20% 80%, rgba(66, 184, 131, 0.06) 0%, transparent 40%),
    radial-gradient(ellipse at 80% 20%, rgba(110, 231, 160, 0.04) 0%, transparent 40%);
}

.ambient-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 800px;
  height: 800px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(66, 184, 131, 0.25) 0%, transparent 60%);
  pointer-events: none;
}

/* Light rays */
.rays {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
}

.ray {
  position: absolute;
  height: 2px;
  background: linear-gradient(90deg, rgba(66, 184, 131, 0.4) 0%, transparent 100%);
  transform-origin: left center;
}

/* Particles */
.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  background: #42b883;
  border-radius: 50%;
}

/* Scene base */
.scene {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* ==========================================================================
   SCENE 1: Logo
   ========================================================================== */
.logo-scene .logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.logo-bars {
  display: flex;
  gap: 24px;
  height: 220px;
  align-items: flex-end;
}

.logo-bars .bar {
  width: 64px;
  border-radius: 0;
}

.logo-bars .bar.left {
  background: linear-gradient(180deg, #6ee7a0 0%, #42b883 100%);
}

.logo-bars .bar.right {
  background: linear-gradient(180deg, #42b883 0%, #1a4a3a 100%);
}

.wordmark {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 72px;
  font-weight: 500;
  letter-spacing: -2px;
  color: white;
}

/* ==========================================================================
   SCENE 2: Tagline
   ========================================================================== */
.tagline-scene {
  gap: 40px;
}

.tagline {
  display: flex;
  gap: 24px;
  margin: 0;
}

.tagline-word {
  font-size: 110px;
  font-weight: 600;
  letter-spacing: -3px;
}

.sub-tagline {
  font-size: 32px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  letter-spacing: 2px;
}

/* ==========================================================================
   SCENE 3: Terminal
   ========================================================================== */
.terminal {
  width: 900px;
  background: #0d0d12;
  box-shadow:
    0 50px 100px -20px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    0 0 120px rgba(66, 184, 131, 0.08);
}

.terminal-header {
  background: #18181f;
  padding: 16px 20px;
  display: flex;
  align-items: center;
}

.terminal-buttons {
  display: flex;
  gap: 10px;
}

.btn {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.btn.red { background: #ff5f57; }
.btn.yellow { background: #ffbd2e; }
.btn.green { background: #28c840; }

.terminal-title {
  flex: 1;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  margin-right: 60px;
}

.terminal-body {
  padding: 32px 36px;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 22px;
}

.terminal-line {
  display: flex;
  align-items: center;
  gap: 16px;
}

.prompt {
  color: #42b883;
  font-weight: 600;
}

.command {
  color: #e2e8f0;
}

.cursor {
  color: #42b883;
}

.terminal-output {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.output-line {
  display: flex;
  gap: 20px;
}

.output-line .label {
  color: rgba(255, 255, 255, 0.4);
  width: 120px;
}

.output-line .value {
  color: rgba(255, 255, 255, 0.8);
}

.output-line .value.accent {
  color: #42b883;
}

.progress-container {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  margin: 8px 0;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #42b883 0%, #6ee7a0 100%);
}

/* ==========================================================================
   SCENE 4: Features
   ========================================================================== */
.features {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 28px;
}

.feature-icon {
  font-size: 36px;
  color: #42b883;
  width: 50px;
  text-align: center;
}

.feature-text {
  font-size: 52px;
  font-weight: 500;
  color: white;
  letter-spacing: -1px;
}

/* ==========================================================================
   SCENE 5: Final
   ========================================================================== */
.final-logo {
  display: flex;
  gap: 24px;
  height: 180px;
  align-items: flex-end;
}

.final-logo .bar {
  width: 56px;
  height: 100%;
  border-radius: 0;
}

.final-logo .bar.left {
  background: linear-gradient(180deg, #6ee7a0 0%, #42b883 100%);
}

.final-logo .bar.right {
  background: linear-gradient(180deg, #42b883 0%, #1a4a3a 100%);
}
</style>
