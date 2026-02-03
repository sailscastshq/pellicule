/**
 * Bundler-agnostic entry file generation.
 *
 * Both the Vite adapter and the Rsbuild adapter produce the same
 * index.html + entry.js scaffold to mount the user's Vue component.
 * This module owns that template so changes propagate everywhere.
 */

import { writeFile, mkdir, rm } from 'fs/promises'
import { join, basename } from 'path'

/**
 * Generate the entry HTML that wraps the video at the given dimensions.
 *
 * @param {object} options
 * @param {number} options.width
 * @param {number} options.height
 * @returns {string}
 */
export function generateHtml({ width = 1920, height = 1080 }) {
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
 * @returns {string}
 */
export function generateEntryJs({ componentPath, width = 1920, height = 1080 }) {
  return `
import { createApp, ref, provide, h, nextTick } from 'vue'
import VideoComponent from '${componentPath}'

// Pellicule injection keys (must match composables.js)
const FRAME_KEY = Symbol.for('pellicule-frame')
const CONFIG_KEY = Symbol.for('pellicule-config')

// Get initial config from URL
const params = new URLSearchParams(window.location.search)
const fps = parseInt(params.get('fps') || '30', 10)
const durationInFrames = parseInt(params.get('duration') || '90', 10)
const width = parseInt(params.get('width') || '${width}', 10)
const height = parseInt(params.get('height') || '${height}', 10)

const config = { fps, durationInFrames, width, height }

// Frame ref - reactive, will trigger re-render when changed
const frameRef = ref(0)

// Expose setFrame function for the renderer to call
window.__PELLICULE_SET_FRAME__ = async (frame) => {
  frameRef.value = frame
  await nextTick() // Wait for Vue to re-render
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
  window.__PELLICULE_READY__ = true
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
 * @returns {Promise<{ tempDir: string, cleanup: () => Promise<void> }>}
 */
export async function writeTempEntry({ inputPath, width = 1920, height = 1080 }) {
  const inputDir = join(inputPath, '..')
  const inputFile = basename(inputPath)
  const tempDir = join(inputDir, '.pellicule')

  await mkdir(tempDir, { recursive: true })

  const html = generateHtml({ width, height })
  const js = generateEntryJs({
    componentPath: `../${inputFile}`,
    width,
    height
  })

  await writeFile(join(tempDir, 'index.html'), html)
  await writeFile(join(tempDir, 'entry.js'), js)

  const cleanup = async () => {
    await rm(tempDir, { recursive: true, force: true })
  }

  return { tempDir, cleanup }
}
