/**
 * Bundler-agnostic entry file generation.
 *
 * Both the Vite adapter and the Rsbuild adapter produce the same
 * index.html + entry.js scaffold to mount the user's Vue component.
 * This module owns that template so changes propagate everywhere.
 */

import { writeFile, mkdir, rm } from 'fs/promises'
import { join, basename } from 'path'
import { generateOverlayScript } from '../dev/overlay.js'

/**
 * Generate the entry HTML that wraps the video at the given dimensions.
 *
 * @param {object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {boolean} [options.preview] - Whether to inject the dev overlay
 * @param {number} [options.fps] - FPS (used for overlay display)
 * @param {number} [options.durationInFrames] - Total frames (used for overlay)
 * @param {string} [options.version] - Package version (shown in overlay)
 * @returns {string}
 */
export function generateHtml({ width = 1920, height = 1080, preview = false, fps = 30, durationInFrames = 90, version = '' }) {
  const overlayHtml = preview ? generateOverlayScript({ fps, durationInFrames, version }) : ''

  if (preview) {
    // Preview mode: scale the video canvas to fit the browser window
    // while maintaining aspect ratio, with the overlay bar below
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #111; }
    #pellicule-canvas {
      width: ${width}px;
      height: ${height}px;
      transform-origin: top left;
      position: absolute;
      top: 0;
      left: 0;
    }
    #app { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="pellicule-canvas">
    <div id="app"></div>
  </div>
  <script type="module" src="./entry.js"></script>
  <script>
    (function() {
      const VIDEO_W = ${width};
      const VIDEO_H = ${height};
      const OVERLAY_H = 64;
      const canvas = document.getElementById('pellicule-canvas');

      function fitToWindow() {
        const winW = window.innerWidth;
        const winH = window.innerHeight - OVERLAY_H;
        const scale = Math.min(winW / VIDEO_W, winH / VIDEO_H);
        const offsetX = (winW - VIDEO_W * scale) / 2;
        const offsetY = (winH - VIDEO_H * scale) / 2;
        canvas.style.transform = 'scale(' + scale + ')';
        canvas.style.left = offsetX + 'px';
        canvas.style.top = offsetY + 'px';
      }

      fitToWindow();
      window.addEventListener('resize', fitToWindow);
    })();
  </script>
  ${overlayHtml}
</body>
</html>`
  }

  // Render mode: fixed pixel dimensions matching Playwright viewport
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
    #app { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./entry.js"></script>
</body>
</html>`
}

/**
 * Generate the entry JS that mounts the Vue component with
 * Pellicule's frame/config injection.
 *
 * @param {object} options
 * @param {string} options.componentPath - Relative path from the temp dir to the .vue file
 * @param {number} options.width
 * @param {number} options.height
 * @param {boolean} [options.preview] - Whether the entry is used for dev preview
 * @returns {string}
 */
export function generateEntryJs({ componentPath, width = 1920, height = 1080, preview = false }) {
  return `
import { createApp, ref, provide, h, nextTick } from 'vue'
import VideoComponent from '${componentPath}'
import { buildVideoConfigUrl, haveVideoConfigChanged, parseVideoConfigFromSearch, resolveVideoConfig } from 'pellicule/runtime/config'
import { waitForRenderReady } from 'pellicule/runtime/ready'

// Pellicule injection keys (must match composables.js)
const FRAME_KEY = Symbol.for('pellicule-frame')
const CONFIG_KEY = Symbol.for('pellicule-config')

const params = new URLSearchParams(window.location.search)
const config = parseVideoConfigFromSearch(window.location.search, {
  width: ${width},
  height: ${height}
})
const allowPreviewConfigSync = ${preview ? 'true' : 'false'} && params.get('config-refresh') === '1'
let pendingReload = false

// Frame ref - reactive, will trigger re-render when changed
const frameRef = ref(0)

globalThis.__PELLICULE_COMPONENT_CONFIG__ = null
globalThis.__PELLICULE_ON_CONFIG__ = (componentConfig) => {
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

// Expose setFrame function for the renderer to call
window.__PELLICULE_SET_FRAME__ = async (frame) => {
  frameRef.value = frame
  await nextTick() // Wait for Vue to re-render
  await waitForRenderReady()
}

try {
  // Create app with frame context
  const app = createApp({
    setup() {
      provide(FRAME_KEY, frameRef)
      provide(CONFIG_KEY, config)
      return () => h(VideoComponent)
    }
  })

  app.mount('#app')

  if (!pendingReload) {
    await nextTick()
    await waitForRenderReady()
    window.__PELLICULE_READY__ = true
  }
} catch (error) {
  console.error('Pellicule render error:', error)
  window.__PELLICULE_READY__ = true
  window.__PELLICULE_ERROR__ = error.message
}
`
}

/**
 * Write the temp scaffold (.pellicule/ folder with index.html + entry.js).
 *
 * @param {object} options
 * @param {string} options.inputPath - Absolute path to the .vue file
 * @param {number} options.width
 * @param {number} options.height
 * @param {boolean} [options.preview] - Whether to inject the dev overlay
 * @param {number} [options.fps] - FPS (used for overlay)
 * @param {number} [options.durationInFrames] - Total frames (used for overlay)
 * @param {string} [options.version] - Package version (shown in overlay)
 * @returns {Promise<{ tempDir: string, cleanup: () => Promise<void> }>}
 */
export async function writeTempEntry({ inputPath, width = 1920, height = 1080, preview = false, fps = 30, durationInFrames = 90, version = '' }) {
  const inputDir = join(inputPath, '..')
  const inputFile = basename(inputPath)
  const tempDir = join(inputDir, '.pellicule')

  await mkdir(tempDir, { recursive: true })

  const html = generateHtml({ width, height, preview, fps, durationInFrames, version })
  const js = generateEntryJs({
    componentPath: `../${inputFile}`,
    width,
    height,
    preview
  })

  await writeFile(join(tempDir, 'index.html'), html)
  await writeFile(join(tempDir, 'entry.js'), js)

  const cleanup = async () => {
    await rm(tempDir, { recursive: true, force: true })
  }

  return { tempDir, cleanup }
}
