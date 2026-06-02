<script setup>
/**
 * Pellicule render page for Nuxt.
 *
 * This page is injected by the pellicule/nuxt module. It replicates
 * the entry.js scaffold that Pellicule generates for Vite/Rsbuild
 * bundler modes, but as a Nuxt page that runs inside the user's app.
 *
 * Playwright navigates here, waits for __PELLICULE_READY__,
 * then calls __PELLICULE_SET_FRAME__(n) for each frame.
 */
import { ref, provide, onMounted, nextTick, shallowRef } from 'vue'
import { resolveVideoComponent, getAvailableVideos } from '#pellicule/video-components'
import { buildVideoConfigUrl, haveVideoConfigChanged, resolveVideoConfig } from '../../runtime/config.js'
import { waitForRenderReady } from '../../runtime/ready.js'

definePageMeta({
  layout: false
})

const route = useRoute()

// ── Parse query parameters ──────────────────────────────────────────
const componentName = route.query.component
const fps = parseInt(route.query.fps || '30', 10)
const durationInFrames = parseInt(route.query.duration || '90', 10)
const width = parseInt(route.query.width || '1920', 10)
const height = parseInt(route.query.height || '1080', 10)
const isPreview = route.query.preview === '1'
const allowPreviewConfigSync = isPreview && route.query['config-refresh'] === '1'
let pendingReload = false

// ── Viewport styling ────────────────────────────────────────────────
// Inject viewport CSS directly via DOM instead of useHead(), which
// doesn't reliably apply styles in client-only (ssr: false) pages.
if (import.meta.client) {
  const style = document.createElement('style')
  style.textContent = [
    '* { margin: 0; padding: 0; box-sizing: border-box; }',
    `html, body { width: ${width}px; height: ${height}px; overflow: hidden; }`,
    '#__nuxt, #__nuxt > * { width: 100%; height: 100%; }'
  ].join('\n')
  document.head.appendChild(style)
}

// ── Frame injection (same keys as composables/keys.js) ──────────────
const frameRef = ref(0)
const config = { fps, durationInFrames, width, height }

provide(Symbol.for('pellicule-frame'), frameRef)
provide(Symbol.for('pellicule-config'), config)

// ── Resolve the video component ─────────────────────────────────────
const VideoComponent = shallowRef(null)
const error = ref(null)

if (!componentName) {
  error.value = 'Missing ?component= query parameter'
} else {
  const resolved = resolveVideoComponent(componentName)
  if (!resolved) {
    const available = getAvailableVideos()
    const list = available.length > 0
      ? `Available videos: ${available.join(', ')}`
      : 'No video components found. Make sure .vue files exist in your videos directory.'
    error.value = `Component "${componentName}" not found. ${list}`
  } else {
    VideoComponent.value = resolved
  }
}

if (import.meta.client) {
  window.__PELLICULE_COMPONENT_CONFIG__ = null
  window.__PELLICULE_ON_CONFIG__ = (componentConfig) => {
    if (!allowPreviewConfigSync || pendingReload) {
      return
    }

    const nextConfig = resolveVideoConfig(config, componentConfig)
    if (!haveVideoConfigChanged(config, nextConfig)) {
      return
    }

    pendingReload = true
    window.location.replace(buildVideoConfigUrl(window.location.href, nextConfig))
  }
}

// ── Expose globals for Playwright ───────────────────────────────────
onMounted(() => {
  window.__PELLICULE_SET_FRAME__ = async (frame) => {
    frameRef.value = frame
    await nextTick()
    await waitForRenderReady()
  }

  if (error.value) {
    window.__PELLICULE_ERROR__ = error.value
    console.error('Pellicule render error:', error.value)
    window.__PELLICULE_READY__ = true
    return
  }

  if (pendingReload) {
    return
  }

  waitForRenderReady()
    .then(() => {
      if (pendingReload) {
        return
      }
      window.__PELLICULE_READY__ = true
    })
    .catch((err) => {
      window.__PELLICULE_ERROR__ = err.message
      console.error('Pellicule render error:', err)
      window.__PELLICULE_READY__ = true
    })
})
</script>

<template>
  <component :is="VideoComponent" v-if="VideoComponent" />
  <div v-else-if="error" style="color: red; padding: 20px; font-family: monospace;">
    {{ error }}
  </div>
</template>
