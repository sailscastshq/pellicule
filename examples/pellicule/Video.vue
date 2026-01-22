<script setup>
import { computed } from 'vue'
import { useFrame, useVideoConfig, interpolate, Easing } from 'pellicule'

const frame = useFrame()
const { fps } = useVideoConfig()

// =============================================================================
// SCENE TIMING (frames) - 26 second video
// =============================================================================
const SCENE = {
  // Scene 1: Logo reveal (0-3s)
  logoStart: 0,
  logoEnd: fps * 3,

  // Scene 2: "Write Vue components" (3-6s)
  vueStart: fps * 3,
  vueEnd: fps * 6,

  // Scene 3: "Render videos" (6-9s)
  renderStart: fps * 6,
  renderEnd: fps * 9,

  // Scene 4: Terminal demo (9-14s)
  terminalStart: fps * 9,
  terminalEnd: fps * 14,

  // Scene 5: Code editor (14-19s)
  codeStart: fps * 14,
  codeEnd: fps * 19,

  // Scene 6: Features (19-22s)
  featuresStart: fps * 19,
  featuresEnd: fps * 22,

  // Scene 7: Closing (22-25s)
  closingStart: fps * 22,
  closingEnd: fps * 25,

  // Scene 8: Final logo mark (25-26s)
  finalStart: fps * 25,
  finalEnd: fps * 26
}

// Current scene helper
const currentScene = computed(() => {
  const f = frame.value
  if (f < SCENE.logoEnd) return 'logo'
  if (f < SCENE.vueEnd) return 'vue'
  if (f < SCENE.renderEnd) return 'render'
  if (f < SCENE.terminalEnd) return 'terminal'
  if (f < SCENE.codeEnd) return 'code'
  if (f < SCENE.featuresEnd) return 'features'
  if (f < SCENE.closingEnd) return 'closing'
  return 'final'
})

// =============================================================================
// BACKGROUND COLORS
// =============================================================================
const backgroundColor = computed(() => {
  const f = frame.value
  // Smooth color transitions
  if (f < SCENE.logoEnd) return '#050508'
  if (f < SCENE.vueEnd) return '#040806'
  if (f < SCENE.renderEnd) return '#080406'
  if (f < SCENE.terminalEnd) return '#050508'
  if (f < SCENE.codeEnd) return '#04050a'
  if (f < SCENE.featuresEnd) return '#050806'
  return '#050508'
})

// =============================================================================
// SCENE 1: LOGO REVEAL
// =============================================================================
const logoBarHeight = computed(() =>
  interpolate(frame.value, [0, fps * 0.5], [0, 160], { easing: Easing.easeOut })
)

const logoBarOpacity = computed(() =>
  interpolate(frame.value, [0, fps * 0.25], [0, 1])
)

const wordmarkOpacity = computed(() =>
  interpolate(frame.value, [fps * 0.6, fps * 1], [0, 1])
)

const wordmarkY = computed(() =>
  interpolate(frame.value, [fps * 0.6, fps * 1], [40, 0], { easing: Easing.easeOut })
)

const scene1Opacity = computed(() =>
  interpolate(frame.value, [SCENE.logoEnd - fps * 0.4, SCENE.logoEnd], [1, 0])
)

// =============================================================================
// SCENE 2: "Write Vue components" - TYPEWRITER
// =============================================================================
const vueHeadline = 'Write Vue components.'
const vueSubheadline = 'Use the full power of Vue 3 and the Composition API.'

const vueHeadlineChars = computed(() => {
  const localFrame = frame.value - SCENE.vueStart
  const typingStart = fps * 0.2
  const charsTyped = Math.floor((localFrame - typingStart) * 0.6)
  return Math.max(0, Math.min(charsTyped, vueHeadline.length))
})

const vueSubOpacity = computed(() => {
  const localFrame = frame.value - SCENE.vueStart
  return interpolate(localFrame, [fps * 1.5, fps * 2], [0, 1])
})

const vueSceneOpacity = computed(() => {
  const fadeIn = interpolate(frame.value, [SCENE.vueStart, SCENE.vueStart + fps * 0.2], [0, 1])
  const fadeOut = interpolate(frame.value, [SCENE.vueEnd - fps * 0.4, SCENE.vueEnd], [1, 0])
  return Math.min(fadeIn, fadeOut)
})

const showVueCursor = computed(() => {
  const localFrame = frame.value - SCENE.vueStart
  return vueHeadlineChars.value < vueHeadline.length && Math.floor(localFrame / 8) % 2 === 0
})

// =============================================================================
// SCENE 3: "Render videos" - TYPEWRITER
// =============================================================================
const renderHeadline = 'Render videos.'
const renderSubheadline = 'Deterministic, frame-perfect MP4 output every time.'

const renderHeadlineChars = computed(() => {
  const localFrame = frame.value - SCENE.renderStart
  const typingStart = fps * 0.2
  const charsTyped = Math.floor((localFrame - typingStart) * 0.5)
  return Math.max(0, Math.min(charsTyped, renderHeadline.length))
})

const renderSubOpacity = computed(() => {
  const localFrame = frame.value - SCENE.renderStart
  return interpolate(localFrame, [fps * 1.2, fps * 1.7], [0, 1])
})

const renderSceneOpacity = computed(() => {
  const fadeIn = interpolate(frame.value, [SCENE.renderStart, SCENE.renderStart + fps * 0.2], [0, 1])
  const fadeOut = interpolate(frame.value, [SCENE.renderEnd - fps * 0.4, SCENE.renderEnd], [1, 0])
  return Math.min(fadeIn, fadeOut)
})

const showRenderCursor = computed(() => {
  const localFrame = frame.value - SCENE.renderStart
  return renderHeadlineChars.value < renderHeadline.length && Math.floor(localFrame / 8) % 2 === 0
})

// =============================================================================
// SCENE 4: TERMINAL
// =============================================================================
const terminalCommand = 'npx pellicule Video.vue'
const terminalOutput = `
  PELLICULE  v1.0.0

  Input      Video.vue
  Output     output.mp4
  Resolution 1920x1080
  Duration   90 frames @ 30fps (3.0s)

  ████████████████████████████░░ 93% (84/90 @ 28.3 fps)`

const terminalTypedChars = computed(() => {
  const localFrame = frame.value - SCENE.terminalStart
  const typingStart = fps * 0.5
  const charsTyped = Math.floor((localFrame - typingStart) * 0.5)
  return Math.max(0, Math.min(charsTyped, terminalCommand.length))
})

const showTerminalCursor = computed(() => {
  const localFrame = frame.value - SCENE.terminalStart
  return localFrame < fps * 2.5 && Math.floor(localFrame / 8) % 2 === 0
})

const terminalOutputOpacity = computed(() => {
  const localFrame = frame.value - SCENE.terminalStart
  return interpolate(localFrame, [fps * 2, fps * 2.5], [0, 1])
})

const terminalScale = computed(() =>
  interpolate(frame.value, [SCENE.terminalStart, SCENE.terminalStart + fps * 0.5], [0.9, 1], { easing: Easing.easeOut })
)

const terminalOpacity = computed(() => {
  const fadeIn = interpolate(frame.value, [SCENE.terminalStart, SCENE.terminalStart + fps * 0.3], [0, 1])
  const fadeOut = interpolate(frame.value, [SCENE.terminalEnd - fps * 0.4, SCENE.terminalEnd], [1, 0])
  return Math.min(fadeIn, fadeOut)
})

// =============================================================================
// SCENE 5: CODE EDITOR
// =============================================================================
const codeContent = `<script setup>
import { useFrame } from 'pellicule'

const frame = useFrame()
<\/script>

<template>
  <div class="video">
    <h1>Frame {{ frame }}</h1>
  </div>
</template>

<style>
.video {
  background: #0a0a0f;
  color: white;
}
</style>`

const codeTypedChars = computed(() => {
  const localFrame = frame.value - SCENE.codeStart
  const typingStart = fps * 0.3
  const charsTyped = Math.floor((localFrame - typingStart) * 2)
  return Math.max(0, Math.min(charsTyped, codeContent.length))
})

const showCodeCursor = computed(() => {
  const localFrame = frame.value - SCENE.codeStart
  return Math.floor(localFrame / 10) % 2 === 0
})

const codeOpacity = computed(() => {
  const fadeIn = interpolate(frame.value, [SCENE.codeStart, SCENE.codeStart + fps * 0.3], [0, 1])
  const fadeOut = interpolate(frame.value, [SCENE.codeEnd - fps * 0.4, SCENE.codeEnd], [1, 0])
  return Math.min(fadeIn, fadeOut)
})

const codeScale = computed(() =>
  interpolate(frame.value, [SCENE.codeStart, SCENE.codeStart + fps * 0.5], [0.9, 1], { easing: Easing.easeOut })
)

// =============================================================================
// SCENE 6: FEATURES
// =============================================================================
const features = [
  { icon: '⚡', text: 'Powered by Vite' },
  { icon: '🎬', text: 'Frame-perfect rendering' },
  { icon: '🎨', text: 'Full CSS & animations' }
]

const featureOpacities = computed(() => {
  const localFrame = frame.value - SCENE.featuresStart
  return features.map((_, i) => {
    const start = fps * 0.4 * i
    const fadeIn = interpolate(localFrame, [start, start + fps * 0.3], [0, 1])
    const fadeOut = interpolate(frame.value, [SCENE.featuresEnd - fps * 0.3, SCENE.featuresEnd], [1, 0])
    return Math.min(fadeIn, fadeOut)
  })
})

const featureYs = computed(() => {
  const localFrame = frame.value - SCENE.featuresStart
  return features.map((_, i) => {
    const start = fps * 0.4 * i
    return interpolate(localFrame, [start, start + fps * 0.4], [50, 0], { easing: Easing.easeOut })
  })
})

// =============================================================================
// SCENE 7: CLOSING
// =============================================================================
const closingLogoOpacity = computed(() =>
  interpolate(frame.value, [SCENE.closingStart, SCENE.closingStart + fps * 0.4], [0, 1])
)

const closingLogoScale = computed(() =>
  interpolate(frame.value, [SCENE.closingStart, SCENE.closingStart + fps * 0.5], [0.9, 1], { easing: Easing.easeOut })
)

const closingTaglineOpacity = computed(() =>
  interpolate(frame.value, [SCENE.closingStart + fps * 0.4, SCENE.closingStart + fps * 0.8], [0, 1])
)

const closingUrlOpacity = computed(() =>
  interpolate(frame.value, [SCENE.closingStart + fps * 0.8, SCENE.closingStart + fps * 1.2], [0, 1])
)

const closingSceneOpacity = computed(() =>
  interpolate(frame.value, [SCENE.closingEnd - fps * 0.3, SCENE.closingEnd], [1, 0])
)

// =============================================================================
// SCENE 8: FINAL LOGO MARK
// =============================================================================
const finalBarOpacity = computed(() =>
  interpolate(frame.value, [SCENE.finalStart, SCENE.finalStart + fps * 0.3], [0, 1])
)

const finalBarScale = computed(() =>
  interpolate(frame.value, [SCENE.finalStart, SCENE.finalStart + fps * 0.4], [0.8, 1], { easing: Easing.easeOut })
)

// Syntax highlighting helper
function highlightCode(code, visibleChars) {
  const visible = code.slice(0, visibleChars)
  return visible
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(import|from|const|function|return)/g, '<span class="keyword">$1</span>')
    .replace(/('pellicule'|'vue')/g, '<span class="string">$1</span>')
    .replace(/(useFrame|useVideoConfig|computed)/g, '<span class="function">$1</span>')
    .replace(/(&lt;script|&lt;template|&lt;style|&lt;\/script|&lt;\/template|&lt;\/style|&lt;div|&lt;\/div|&lt;h1|&lt;\/h1)/g, '<span class="tag">$1</span>')
    .replace(/(setup|class|scoped)/g, '<span class="attr">$1</span>')
    .replace(/(frame|video)/g, '<span class="variable">$1</span>')
}
</script>

<template>
  <div class="scene" :style="{ background: backgroundColor }">
    <!-- Animated gradient background -->
    <div class="bg-gradient" :class="currentScene"></div>

    <!-- ================================================================== -->
    <!-- SCENE 1: Logo Reveal -->
    <!-- ================================================================== -->
    <div
      v-if="currentScene === 'logo'"
      class="logo-scene"
      :style="{ opacity: scene1Opacity }"
    >
      <div
        class="wordmark-container"
        :style="{
          opacity: wordmarkOpacity,
          transform: `translateY(${wordmarkY}px)`
        }"
      >
        <span class="wordmark-text">Pe</span>
        <div class="logo-bars-inline">
          <div
            class="logo-bar left"
            :style="{ height: `${logoBarHeight}px`, opacity: logoBarOpacity }"
          ></div>
          <div
            class="logo-bar right"
            :style="{ height: `${logoBarHeight}px`, opacity: logoBarOpacity }"
          ></div>
        </div>
        <span class="wordmark-text">icule</span>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- SCENE 2: "Write Vue components" - Typewriter -->
    <!-- ================================================================== -->
    <div
      v-if="currentScene === 'vue'"
      class="apple-text-scene"
      :style="{ opacity: vueSceneOpacity }"
    >
      <h1 class="apple-headline">
        <span class="typed-text">{{ vueHeadline.slice(0, vueHeadlineChars) }}</span>
        <span v-if="showVueCursor" class="type-cursor">|</span>
      </h1>
      <p class="apple-subheadline" :style="{ opacity: vueSubOpacity }">
        {{ vueSubheadline }}
      </p>
    </div>

    <!-- ================================================================== -->
    <!-- SCENE 3: "Render videos" - Typewriter -->
    <!-- ================================================================== -->
    <div
      v-if="currentScene === 'render'"
      class="apple-text-scene"
      :style="{ opacity: renderSceneOpacity }"
    >
      <h1 class="apple-headline">
        <span class="typed-text">{{ renderHeadline.slice(0, renderHeadlineChars) }}</span>
        <span v-if="showRenderCursor" class="type-cursor">|</span>
      </h1>
      <p class="apple-subheadline" :style="{ opacity: renderSubOpacity }">
        {{ renderSubheadline }}
      </p>
    </div>

    <!-- ================================================================== -->
    <!-- SCENE 4: Terminal -->
    <!-- ================================================================== -->
    <div
      v-if="currentScene === 'terminal'"
      class="terminal-scene"
      :style="{ opacity: terminalOpacity }"
    >
      <div
        class="terminal"
        :style="{ transform: `perspective(1200px) rotateY(-5deg) rotateX(2deg) scale(${terminalScale})` }"
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
          <div class="terminal-line">
            <span class="prompt">$</span>
            <span class="command">{{ terminalCommand.slice(0, terminalTypedChars) }}</span>
            <span v-if="showTerminalCursor && terminalTypedChars < terminalCommand.length" class="cursor">▋</span>
          </div>

          <pre
            class="terminal-output"
            :style="{ opacity: terminalOutputOpacity }"
          >{{ terminalOutput }}</pre>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- SCENE 5: Code Editor -->
    <!-- ================================================================== -->
    <div
      v-if="currentScene === 'code'"
      class="code-scene"
      :style="{ opacity: codeOpacity }"
    >
      <div
        class="editor"
        :style="{ transform: `perspective(1200px) rotateY(5deg) rotateX(2deg) scale(${codeScale})` }"
      >
        <div class="editor-header">
          <div class="editor-buttons">
            <span class="btn red"></span>
            <span class="btn yellow"></span>
            <span class="btn green"></span>
          </div>
          <div class="editor-tab">
            <span class="vue-icon">◇</span>
            Video.vue
          </div>
        </div>

        <div class="editor-body">
          <div class="line-numbers">
            <div v-for="n in 20" :key="n" class="line-number">{{ n }}</div>
          </div>
          <pre class="code"><code v-html="highlightCode(codeContent, codeTypedChars)"></code><span v-if="showCodeCursor" class="cursor">▋</span></pre>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- SCENE 6: Features -->
    <!-- ================================================================== -->
    <div
      v-if="currentScene === 'features'"
      class="features-scene"
    >
      <div
        v-for="(feature, i) in features"
        :key="i"
        class="feature"
        :style="{
          opacity: featureOpacities[i],
          transform: `translateY(${featureYs[i]}px)`
        }"
      >
        <span class="feature-icon">{{ feature.icon }}</span>
        <span class="feature-text">{{ feature.text }}</span>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- SCENE 7: Closing -->
    <!-- ================================================================== -->
    <div
      v-if="currentScene === 'closing'"
      class="closing-scene"
      :style="{ opacity: closingSceneOpacity }"
    >
      <div
        class="closing-logo"
        :style="{
          opacity: closingLogoOpacity,
          transform: `scale(${closingLogoScale})`
        }"
      >
        <div class="closing-wordmark-container">
          <span class="closing-wordmark-text">Pe</span>
          <div class="closing-logo-bars">
            <div class="logo-bar left"></div>
            <div class="logo-bar right"></div>
          </div>
          <span class="closing-wordmark-text">icule</span>
        </div>
      </div>

      <p class="closing-tagline" :style="{ opacity: closingTaglineOpacity }">
        Write Vue components. Render videos.
      </p>

      <a class="closing-url" :style="{ opacity: closingUrlOpacity }">
        docs.sailscasts.com/pellicule
      </a>
    </div>

    <!-- ================================================================== -->
    <!-- SCENE 8: Final Logo Mark (Pause Icon) -->
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
        <div class="final-bar left"></div>
        <div class="final-bar right"></div>
      </div>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

/* Base */
.scene {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow: hidden;
  transition: background 0.6s ease;
}

.bg-gradient {
  position: absolute;
  inset: 0;
  opacity: 0.7;
  transition: all 0.6s ease;
}

.bg-gradient.logo {
  background: radial-gradient(ellipse at 50% 40%, rgba(66, 184, 131, 0.2) 0%, transparent 55%);
}

.bg-gradient.vue {
  background: radial-gradient(ellipse at 30% 40%, rgba(66, 184, 131, 0.25) 0%, transparent 45%),
              radial-gradient(ellipse at 75% 65%, rgba(53, 73, 94, 0.2) 0%, transparent 45%);
}

.bg-gradient.render {
  background: radial-gradient(ellipse at 70% 35%, rgba(147, 51, 234, 0.15) 0%, transparent 45%),
              radial-gradient(ellipse at 25% 70%, rgba(66, 184, 131, 0.15) 0%, transparent 45%);
}

.bg-gradient.terminal {
  background: radial-gradient(ellipse at 50% 50%, rgba(66, 184, 131, 0.12) 0%, transparent 50%);
}

.bg-gradient.code {
  background: radial-gradient(ellipse at 55% 45%, rgba(96, 165, 250, 0.12) 0%, transparent 50%);
}

.bg-gradient.features {
  background: radial-gradient(ellipse at 50% 45%, rgba(66, 184, 131, 0.18) 0%, transparent 55%);
}

.bg-gradient.closing,
.bg-gradient.final {
  background: radial-gradient(ellipse at 50% 45%, rgba(66, 184, 131, 0.22) 0%, transparent 50%);
}

/* ==========================================================================
   SCENE 1: Logo with embedded bars
   ========================================================================== */
.logo-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}

.wordmark-container {
  display: flex;
  align-items: center;
}

.wordmark-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 140px;
  font-weight: 400;
  color: white;
  letter-spacing: -5px;
}

.logo-bars-inline {
  display: flex;
  gap: 14px;
  margin: 0 6px;
  align-items: flex-end;
  height: 160px;
}

.logo-bar {
  width: 38px;
  border-radius: 6px;
}

.logo-bar.left {
  background: linear-gradient(180deg, #6ee7a0 0%, #42b883 100%);
}

.logo-bar.right {
  background: linear-gradient(180deg, #42b883 0%, #35495e 100%);
}

/* ==========================================================================
   SCENES 2-3: Apple-style text with typewriter
   ========================================================================== */
.apple-text-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 32px;
  z-index: 1;
  padding: 0 80px;
}

.apple-headline {
  font-size: 100px;
  font-weight: 600;
  color: white;
  letter-spacing: -4px;
  line-height: 1.05;
  margin: 0;
  min-height: 120px;
}

.typed-text {
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.type-cursor {
  color: #42b883;
  font-weight: 300;
  animation: none;
}

.apple-subheadline {
  font-size: 40px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
  max-width: 1000px;
}

/* ==========================================================================
   SCENE 4: Terminal
   ========================================================================== */
.terminal-scene {
  z-index: 1;
}

.terminal {
  width: 1100px;
  background: #12121a;
  border-radius: 20px;
  box-shadow:
    0 70px 140px -25px rgba(0, 0, 0, 0.65),
    0 50px 100px -35px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(255, 255, 255, 0.06),
    0 0 100px rgba(66, 184, 131, 0.08);
  overflow: hidden;
}

.terminal-header {
  background: #1e1e28;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  gap: 18px;
}

.terminal-buttons {
  display: flex;
  gap: 12px;
}

.btn {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.btn.red { background: #ff5f57; }
.btn.yellow { background: #ffbd2e; }
.btn.green { background: #28c840; }

.terminal-title {
  flex: 1;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
  font-size: 15px;
  margin-right: 80px;
}

.terminal-body {
  padding: 36px 40px;
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  font-size: 26px;
  line-height: 1.7;
}

.terminal-line {
  display: flex;
  align-items: center;
  gap: 18px;
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
  margin-top: 28px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 20px;
  white-space: pre;
}

/* ==========================================================================
   SCENE 5: Code Editor
   ========================================================================== */
.code-scene {
  z-index: 1;
}

.editor {
  width: 1020px;
  background: #16161e;
  border-radius: 20px;
  box-shadow:
    0 70px 140px -25px rgba(0, 0, 0, 0.65),
    0 50px 100px -35px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(255, 255, 255, 0.06),
    0 0 100px rgba(66, 184, 131, 0.06);
  overflow: hidden;
}

.editor-header {
  background: #1e1e28;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.editor-buttons {
  display: flex;
  gap: 12px;
}

.editor-tab {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #42b883;
  font-size: 17px;
  background: #16161e;
  padding: 10px 24px;
  border-radius: 10px 10px 0 0;
  margin-bottom: -18px;
}

.vue-icon {
  color: #42b883;
  font-size: 20px;
}

.editor-body {
  display: flex;
  padding: 28px 0;
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  font-size: 21px;
  line-height: 1.55;
  min-height: 500px;
}

.line-numbers {
  padding: 0 22px;
  color: rgba(255, 255, 255, 0.22);
  text-align: right;
  user-select: none;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.line-number {
  height: 1.55em;
}

.code {
  padding: 0 28px;
  color: #e2e8f0;
  margin: 0;
  white-space: pre;
  flex: 1;
}

/* Syntax highlighting - vibrant */
.code :deep(.keyword) { color: #d19afc; font-weight: 500; }
.code :deep(.string) { color: #7ee787; }
.code :deep(.function) { color: #79c0ff; font-weight: 500; }
.code :deep(.tag) { color: #ff7b93; }
.code :deep(.attr) { color: #ffa657; }
.code :deep(.variable) { color: #ffd866; }

/* ==========================================================================
   SCENE 6: Features
   ========================================================================== */
.features-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 56px;
  z-index: 1;
}

.feature {
  display: flex;
  align-items: center;
  gap: 28px;
}

.feature-icon {
  font-size: 56px;
}

.feature-text {
  font-size: 56px;
  font-weight: 500;
  color: white;
  letter-spacing: -1.5px;
}

/* ==========================================================================
   SCENE 7: Closing
   ========================================================================== */
.closing-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 44px;
  z-index: 1;
}

.closing-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.closing-wordmark-container {
  display: flex;
  align-items: center;
}

.closing-wordmark-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 96px;
  font-weight: 400;
  color: white;
  letter-spacing: -4px;
}

.closing-logo-bars {
  display: flex;
  gap: 12px;
  margin: 0 4px;
  align-items: flex-end;
  height: 110px;
}

.closing-logo-bars .logo-bar {
  width: 26px;
  height: 110px;
  border-radius: 5px;
}

.closing-tagline {
  font-size: 48px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
}

.closing-url {
  font-size: 38px;
  color: #42b883;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-weight: 500;
}

/* ==========================================================================
   SCENE 8: Final Logo Mark
   ========================================================================== */
.final-scene {
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.final-logo-mark {
  display: flex;
  gap: 28px;
}

.final-bar {
  width: 56px;
  height: 200px;
  border-radius: 10px;
}

.final-bar.left {
  background: linear-gradient(180deg, #6ee7a0 0%, #42b883 100%);
}

.final-bar.right {
  background: linear-gradient(180deg, #42b883 0%, #35495e 100%);
}
</style>
