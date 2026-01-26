import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join, resolve, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import { pelliculeMacroPlugin } from '../macros/define-video-config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pelliculeSrc = resolve(__dirname, '..')

/**
 * Creates a Vite dev server in the user's project directory.
 * This way Vite naturally finds their node_modules with Vue installed.
 *
 * @param {object} options
 * @param {string} options.input - Path to the .vue file
 * @param {number} options.width - Video width
 * @param {number} options.height - Video height
 * @returns {Promise<{ server: object, url: string, cleanup: function }>}
 */
export async function createVideoServer(options) {
  const { input, width = 1920, height = 1080 } = options

  const inputPath = resolve(input)
  const inputDir = dirname(inputPath)
  const inputFile = basename(inputPath)

  // Create .pellicule temp folder in user's project
  const tempDir = join(inputDir, '.pellicule')
  await mkdir(tempDir, { recursive: true })

  // Create entry HTML
  const htmlContent = `<!DOCTYPE html>
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

  // Create entry JS with setFrame function for fast frame updates
  const entryContent = `
import { createApp, ref, provide, h, nextTick } from 'vue'
import VideoComponent from '../${inputFile}'

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

  await writeFile(join(tempDir, 'index.html'), htmlContent)
  await writeFile(join(tempDir, 'entry.js'), entryContent)

  // Create Vite server rooted in the user's project directory
  const server = await createServer({
    root: tempDir,
    plugins: [pelliculeMacroPlugin(), vue()],
    server: {
      port: 0,
      strictPort: false
    },
    resolve: {
      alias: {
        'pellicule': pelliculeSrc
      }
    },
    logLevel: 'warn'
  })

  await server.listen()

  const address = server.httpServer.address()
  const url = `http://localhost:${address.port}`

  const cleanup = async () => {
    await server.close()
    await rm(tempDir, { recursive: true, force: true })
  }

  return { server, url, cleanup, tempDir }
}
