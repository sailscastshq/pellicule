<script setup>
defineVideoConfig({
  durationInSeconds: 10
})

import { computed } from 'vue'
import { useFrame, useVideoConfig, interpolate, Easing } from 'pellicule'

const frame = useFrame()
const { fps } = useVideoConfig()

// =============================================================================
// SCENE TIMING (10 seconds = 300 frames at 30fps)
// =============================================================================
const SCENE = {
  terminal: { start: 0, end: fps * 5 },           // 0-5s: Terminal typing + SKILLS banner
  announce: { start: fps * 5, end: fps * 6.5 },   // 5-6.5s: Announcement
  logos: { start: fps * 6.5, end: fps * 9.1 },    // 6.5-9.1s: Claude hold, Codex push, Codex hold
  final: { start: fps * 9.1, end: fps * 10 }      // 9.1-10s: Final logo mark
}

const currentScene = computed(() => {
  if (frame.value < SCENE.terminal.end) return 'terminal'
  if (frame.value < SCENE.announce.end) return 'announce'
  if (frame.value < SCENE.logos.end) return 'logos'
  return 'final'
})

// =============================================================================
// BACKGROUND - Animated gradient with glow orbs
// =============================================================================
const bgRotation = computed(() => frame.value * 0.3)
const orb1X = computed(() => Math.sin(frame.value * 0.02) * 100)
const orb1Y = computed(() => Math.cos(frame.value * 0.015) * 80)
const orb2X = computed(() => Math.cos(frame.value * 0.018) * 120)
const orb2Y = computed(() => Math.sin(frame.value * 0.022) * 100)

// =============================================================================
// SCENE 1: TERMINAL - Fast typing, then ASCII banner
// =============================================================================
const command = 'npx skills add sailscastshq/pellicule/skills'

// FAST typing - 1 char per frame, starts at frame 15
const typingStart = fps * 0.5
const typedChars = computed(() => {
  const localFrame = frame.value - typingStart
  const charsPerFrame = 1 // FAST!
  return Math.max(0, Math.min(Math.floor(localFrame * charsPerFrame), command.length))
})

const typingDone = computed(() => typedChars.value >= command.length)
const typingDoneFrame = typingStart + command.length // ~60 frames = 2 seconds

const showCursor = computed(() => {
  return Math.floor(frame.value / 6) % 2 === 0
})

// Terminal continuous floating animation
const terminalFloatY = computed(() => Math.sin(frame.value * 0.05) * 8)
const terminalFloatX = computed(() => Math.cos(frame.value * 0.03) * 5)
const terminalRotateY = computed(() => -6 + Math.sin(frame.value * 0.04) * 2)
const terminalRotateX = computed(() => 3 + Math.cos(frame.value * 0.035) * 1.5)

const terminalScale = computed(() =>
  interpolate(frame.value, [0, fps * 0.4], [0.9, 1], { easing: Easing.easeOut })
)

const terminalOpacity = computed(() => {
  const fadeIn = interpolate(frame.value, [0, fps * 0.3], [0, 1])
  const fadeOut = interpolate(frame.value, [SCENE.terminal.end - fps * 0.3, SCENE.terminal.end], [1, 0])
  return Math.min(fadeIn, fadeOut)
})

// ASCII banner appears AFTER typing is done with a reveal effect
const bannerDelay = typingDoneFrame + fps * 0.3
const bannerOpacity = computed(() =>
  interpolate(frame.value, [bannerDelay, bannerDelay + fps * 0.4], [0, 1], { easing: Easing.easeOut })
)
const bannerScale = computed(() =>
  interpolate(frame.value, [bannerDelay, bannerDelay + fps * 0.5], [0.8, 1], { easing: Easing.easeOut })
)
const bannerY = computed(() =>
  interpolate(frame.value, [bannerDelay, bannerDelay + fps * 0.4], [30, 0], { easing: Easing.easeOut })
)

// Output appears after banner
const outputDelay = bannerDelay + fps * 0.5
const outputOpacity = computed(() =>
  interpolate(frame.value, [outputDelay, outputDelay + fps * 0.4], [0, 1], { easing: Easing.easeOut })
)

// =============================================================================
// SCENE 2: ANNOUNCEMENT - Big reveal
// =============================================================================
const announceOpacity = computed(() => {
  const fadeIn = interpolate(frame.value, [SCENE.announce.start, SCENE.announce.start + fps * 0.25], [0, 1])
  const fadeOut = interpolate(frame.value, [SCENE.announce.end - fps * 0.15, SCENE.announce.end], [1, 0])
  return Math.min(fadeIn, fadeOut)
})

const announceScale = computed(() =>
  interpolate(frame.value, [SCENE.announce.start, SCENE.announce.start + fps * 0.4], [0.85, 1], { easing: Easing.easeOut })
)

const announceY = computed(() =>
  interpolate(frame.value, [SCENE.announce.start, SCENE.announce.start + fps * 0.4], [60, 0], { easing: Easing.easeOut })
)

// Glowing pulse on text
const glowPulse = computed(() => 0.4 + Math.sin(frame.value * 0.15) * 0.2)

// =============================================================================
// SCENE 3: LOGOS - Slide in with bounce
// =============================================================================
const logosOpacity = computed(() =>
  interpolate(frame.value, [SCENE.logos.start, SCENE.logos.start + fps * 0.2], [0, 1])
)

const logosScale = computed(() =>
  interpolate(frame.value, [SCENE.logos.start, SCENE.logos.start + fps * 0.35], [0.85, 1], { easing: Easing.easeOut })
)

const pelliculeX = computed(() =>
  interpolate(frame.value, [SCENE.logos.start, SCENE.logos.start + fps * 0.35], [-220, 0], { easing: Easing.easeOut })
)

const partnerLogoX = computed(() =>
  interpolate(frame.value, [SCENE.logos.start, SCENE.logos.start + fps * 0.35], [220, 0], { easing: Easing.easeOut })
)

const handoffStart = SCENE.logos.start + fps * 0.75
const handoffEnd = SCENE.logos.start + fps * 1.2

const codexY = computed(() =>
  interpolate(frame.value, [handoffStart, handoffEnd], [-320, 0], { easing: Easing.easeInOut })
)

const codexScale = computed(() =>
  interpolate(frame.value, [handoffStart, handoffEnd], [0.96, 1], { easing: Easing.easeOut })
)

const claudeY = computed(() =>
  interpolate(frame.value, [handoffStart, handoffEnd], [0, 320], { easing: Easing.easeInOut })
)

const claudeScale = computed(() =>
  interpolate(frame.value, [handoffStart, handoffEnd], [1, 0.98], { easing: Easing.easeInOut })
)

const logosFadeOut = computed(() =>
  interpolate(frame.value, [SCENE.logos.end - fps * 0.2, SCENE.logos.end], [1, 0])
)

// Plus sign rotation
const plusRotation = computed(() =>
  interpolate(frame.value, [SCENE.logos.start, SCENE.logos.start + fps * 0.4], [180, 0], { easing: Easing.easeOut })
)

// =============================================================================
// SCENE 4: FINAL LOGO MARK - Epic entrance
// =============================================================================
const finalBarOpacity = computed(() =>
  interpolate(frame.value, [SCENE.final.start, SCENE.final.start + fps * 0.15], [0, 1])
)

const finalBarScale = computed(() =>
  interpolate(frame.value, [SCENE.final.start, SCENE.final.start + fps * 0.25], [0.7, 1], { easing: Easing.easeOut })
)

// Bars slide in from sides
const leftBarX = computed(() =>
  interpolate(frame.value, [SCENE.final.start, SCENE.final.start + fps * 0.25], [-100, 0], { easing: Easing.easeOut })
)
const rightBarX = computed(() =>
  interpolate(frame.value, [SCENE.final.start, SCENE.final.start + fps * 0.25], [100, 0], { easing: Easing.easeOut })
)

// ASCII SKILLS banner
const skillsBanner = `███████╗██╗  ██╗██╗██╗     ██╗     ███████╗
██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝
███████╗█████╔╝ ██║██║     ██║     ███████╗
╚════██║██╔═██╗ ██║██║     ██║     ╚════██║
███████║██║  ██╗██║███████╗███████╗███████║
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝`
</script>

<template>
  <div class="video">
    <!-- Animated dark background with floating orbs -->
    <div class="bg-base"></div>
    <div
      class="bg-orb orb-1"
      :style="{
        transform: `translate(${orb1X}px, ${orb1Y}px)`
      }"
    ></div>
    <div
      class="bg-orb orb-2"
      :style="{
        transform: `translate(${orb2X}px, ${orb2Y}px)`
      }"
    ></div>
    <div class="bg-grid" :style="{ transform: `rotate(${bgRotation}deg)` }"></div>

    <!-- ================================================================== -->
    <!-- SCENE 1: Terminal with 3D perspective + continuous animation -->
    <!-- ================================================================== -->
    <div
      v-if="currentScene === 'terminal'"
      class="terminal-scene"
      :style="{ opacity: terminalOpacity }"
    >
      <div
        class="terminal"
        :style="{
          transform: `
            perspective(2500px)
            translate(${terminalFloatX}px, ${terminalFloatY}px)
            rotateY(${terminalRotateY}deg)
            rotateX(${terminalRotateX}deg)
            scale(${terminalScale})
          `
        }"
      >
        <div class="terminal-header">
          <div class="terminal-buttons">
            <span class="btn red"></span>
            <span class="btn yellow"></span>
            <span class="btn green"></span>
          </div>
          <div class="terminal-title">Terminal</div>
        </div>
        <div class="terminal-body">
          <!-- Command line -->
          <div class="terminal-line command-line">
            <span class="prompt">~</span>
            <span class="dollar">$</span>
            <span class="command">{{ command.slice(0, typedChars) }}</span>
            <span v-if="showCursor && !typingDone" class="cursor">▋</span>
          </div>

          <!-- ASCII SKILLS Banner - appears AFTER typing -->
          <div
            class="banner-container"
            :style="{
              opacity: bannerOpacity,
              transform: `scale(${bannerScale}) translateY(${bannerY}px)`
            }"
          >
            <pre class="skills-banner">{{ skillsBanner }}</pre>
          </div>

          <!-- Output -->
          <div class="output" :style="{ opacity: outputOpacity }">
            <div class="output-section">
              <span class="label">skills</span>
            </div>
            <div class="output-line">
              <span class="diamond">◇</span>
              <span>Source: <span class="url">github.com/sailscastshq/pellicule/tree/main/skills</span></span>
            </div>
            <div class="output-line highlight">
              <span class="bullet">●</span>
              <span>Skill: <strong>pellicule</strong></span>
            </div>
            <div class="output-line description">
              Create videos with Vue using Pellicule
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- SCENE 2: Announcement with glow -->
    <!-- ================================================================== -->
    <div
      v-if="currentScene === 'announce'"
      class="announce-scene"
      :style="{
        opacity: announceOpacity,
        transform: `scale(${announceScale}) translateY(${announceY}px)`
      }"
    >
      <h1 :style="{ textShadow: `0 0 ${80 * glowPulse}px rgba(66, 184, 131, ${glowPulse})` }">
        Pellicule Skills
      </h1>
      <p>now available for Claude Code and Codex</p>
    </div>

    <!-- ================================================================== -->
    <!-- SCENE 3: Logos with slide-in -->
    <!-- ================================================================== -->
    <div
      v-if="currentScene === 'logos'"
      class="logos-scene"
      :style="{
        opacity: logosOpacity * logosFadeOut,
        transform: `scale(${logosScale})`
      }"
    >
      <!-- Pellicule Logo (bars) -->
      <div class="logo-item" :style="{ transform: `translateX(${pelliculeX}px)` }">
        <div class="pellicule-logo">
          <div class="bar left"></div>
          <div class="bar right"></div>
        </div>
      </div>

      <span
        class="logo-connector"
        :style="{ transform: `rotate(${plusRotation}deg)` }"
      >×</span>

      <div class="partner-logo-stack" :style="{ transform: `translateX(${partnerLogoX}px)` }">
        <div
          class="logo-item claude-logo"
          :style="{
            transform: `translateY(${claudeY}px) scale(${claudeScale})`
          }"
        >
          <img src="./assets/claude-code-logo.png" alt="Claude Code" class="logo-img" />
        </div>

        <div
          class="logo-item codex-logo"
          :style="{
            transform: `translateY(${codexY}px) scale(${codexScale})`
          }"
        >
          <img src="./assets/codex-logo.svg" alt="Codex" class="logo-img codex-img" />
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- SCENE 4: Final Logo Mark (Pause Icon) - Epic entrance -->
    <!-- ================================================================== -->
    <div
      v-if="currentScene === 'final'"
      class="final-scene"
    >
      <div
        class="final-logo-mark"
        :style="{
          opacity: finalBarOpacity,
          transform: `scale(${finalBarScale})`
        }"
      >
        <div
          class="final-bar left"
          :style="{ transform: `translateX(${leftBarX}px)` }"
        ></div>
        <div
          class="final-bar right"
          :style="{ transform: `translateX(${rightBarX}px)` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.video {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow: hidden;
}

/* ==========================================================================
   DARK BACKGROUND with animated elements
   ========================================================================== */
.bg-base {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0a0a12 0%, #0f0f1a 50%, #0a0a12 100%);
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.5;
}

.bg-orb.orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(66, 184, 131, 0.4) 0%, transparent 70%);
  top: 10%;
  left: 20%;
}

.bg-orb.orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(96, 165, 250, 0.3) 0%, transparent 70%);
  bottom: 10%;
  right: 15%;
}

.bg-grid {
  position: absolute;
  inset: -50%;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* ==========================================================================
   SCENE 1: Terminal - 2X BIGGER + Dark theme
   ========================================================================== */
.terminal-scene {
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.terminal {
  width: 1600px;
  background: rgba(20, 20, 30, 0.95);
  border-radius: 32px;
  box-shadow:
    0 80px 160px rgba(0, 0, 0, 0.6),
    0 40px 80px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 0 80px rgba(66, 184, 131, 0.15);
  overflow: hidden;
  transform-style: preserve-3d;
  backdrop-filter: blur(20px);
}

.terminal-header {
  background: rgba(30, 30, 45, 0.9);
  padding: 28px 36px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.terminal-buttons {
  display: flex;
  gap: 16px;
}

.btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.btn.red { background: #ff5f57; }
.btn.yellow { background: #ffbd2e; }
.btn.green { background: #28c840; }

.terminal-title {
  flex: 1;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 22px;
  font-weight: 500;
  margin-right: 104px;
}

.terminal-body {
  padding: 48px 56px;
  font-family: 'SF Mono', 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 28px;
  line-height: 1.6;
  color: #e2e8f0;
}

.terminal-line.command-line {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 32px;
  margin-bottom: 32px;
}

.prompt {
  color: #42b883;
  font-weight: 700;
}

.dollar {
  color: rgba(255, 255, 255, 0.4);
}

.command {
  color: #e2e8f0;
  font-weight: 500;
}

.cursor {
  color: #42b883;
  animation: none;
}

/* ASCII SKILLS Banner */
.banner-container {
  margin: 28px 0 40px;
}

.skills-banner {
  font-size: 20px;
  line-height: 1.15;
  font-family: 'SF Mono', 'JetBrains Mono', monospace;
  background: linear-gradient(135deg, #42b883 0%, #6ee7a0 50%, #42b883 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 20px rgba(66, 184, 131, 0.4));
}

/* Output section */
.output {
  margin-top: 20px;
}

.output-section {
  margin-bottom: 20px;
}

.label {
  background: linear-gradient(135deg, #42b883 0%, #35a06e 100%);
  color: white;
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 22px;
  font-weight: 600;
  font-family: 'SF Mono', monospace;
  box-shadow: 0 4px 20px rgba(66, 184, 131, 0.3);
}

.output-line {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 10px 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 24px;
}

.diamond {
  color: #42b883;
  font-size: 18px;
}

.bullet {
  color: #42b883;
  font-size: 18px;
}

.output-line.highlight {
  color: #e2e8f0;
  font-size: 28px;
}

.output-line.highlight strong {
  color: #42b883;
  font-weight: 700;
}

.output-line.description {
  padding-left: 36px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 22px;
}

.url {
  color: #42b883;
}

/* ==========================================================================
   SCENE 2: Announcement - 2X BIGGER
   ========================================================================== */
.announce-scene {
  text-align: center;
  z-index: 1;
}

.announce-scene h1 {
  font-size: 160px;
  font-weight: 900;
  color: white;
  margin: 0;
  letter-spacing: -6px;
  text-shadow: 0 0 60px rgba(66, 184, 131, 0.5);
}

.announce-scene p {
  font-size: 64px;
  font-weight: 500;
  color: #42b883;
  margin: 24px 0 0;
  text-shadow: 0 0 30px rgba(66, 184, 131, 0.4);
}

/* ==========================================================================
   SCENE 3: Logos - 2X BIGGER
   ========================================================================== */
.logos-scene {
  display: flex;
  align-items: center;
  gap: 72px;
  z-index: 1;
}

.logo-item {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pellicule-logo {
  display: flex;
  gap: 32px;
}

.pellicule-logo .bar {
  width: 80px;
  height: 260px;
}

.pellicule-logo .bar.left {
  background: linear-gradient(180deg, #6ee7a0 0%, #42b883 100%);
}

.pellicule-logo .bar.right {
  background: linear-gradient(180deg, #42b883 0%, #1a3a4a 100%);
}

.logo-connector {
  font-size: 84px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.partner-logo-stack {
  position: relative;
  width: 340px;
  height: 280px;
  overflow: hidden;
}

.partner-logo-stack .logo-item {
  position: absolute;
  inset: 0;
}

.claude-logo {
  z-index: 1;
}

.codex-logo {
  z-index: 2;
}

.logo-img {
  height: 220px;
  width: auto;
  filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.4));
}

.codex-img {
  height: 250px;
}

/* ==========================================================================
   SCENE 4: Final Logo Mark - 2X BIGGER
   ========================================================================== */
.final-scene {
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.final-logo-mark {
  display: flex;
  gap: 48px;
}

.final-bar {
  width: 96px;
  height: 320px;
  /* Sharp edges - no border-radius, no blur */
}

.final-bar.left {
  background: linear-gradient(180deg, #6ee7a0 0%, #42b883 100%);
}

.final-bar.right {
  background: linear-gradient(180deg, #42b883 0%, #1a3a4a 100%);
}
</style>
