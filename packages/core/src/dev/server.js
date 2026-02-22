/**
 * Dev preview server.
 *
 * Starts the same bundler dev server used for rendering, but instead of
 * launching Playwright to screenshot frames, opens the user's browser
 * with an interactive preview overlay.
 *
 * The overlay uses the same `window.__PELLICULE_SET_FRAME__()` mechanism
 * as the renderer, so what you see in preview is what you get in the
 * final render.
 */

import { execFile } from 'node:child_process'
import { startBundlerServer } from '../renderer/render.js'

/**
 * Open a URL in the user's default browser using platform-native commands.
 * Uses execFile (not exec) to avoid shell injection.
 * @param {string} url
 */
function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'start'
    : 'xdg-open'
  execFile(cmd, [url], () => {})
}

/**
 * Start the dev preview server.
 *
 * @param {object} options
 * @param {string} options.input - Absolute path to the .vue file
 * @param {number} options.fps
 * @param {number} options.durationInFrames
 * @param {number} options.width
 * @param {number} options.height
 * @param {string|null} [options.serverUrl] - BYOS server URL (Nuxt/Quasar)
 * @param {'vite'|'rsbuild'} [options.bundler]
 * @param {string|null} [options.configFile]
 * @param {string} [options.projectType]
 * @param {string} [options.version] - Package version (shown in overlay)
 * @returns {Promise<void>}
 */
export async function startDevServer(options) {
  const {
    input,
    fps = 30,
    durationInFrames = 90,
    width = 1920,
    height = 1080,
    serverUrl = null,
    bundler = 'vite',
    configFile = null,
    projectType = 'standalone',
    version = ''
  } = options

  let url
  let cleanup

  if (serverUrl) {
    // BYOS mode (Nuxt/Quasar) — just use the existing server
    url = serverUrl
    cleanup = async () => {}
  } else {
    // Start a bundler dev server with preview overlay enabled
    const server = await startBundlerServer({
      input,
      width,
      height,
      bundler,
      configFile,
      projectType,
      preview: true,
      fps,
      durationInFrames,
      version
    })
    url = server.url
    cleanup = server.cleanup
  }

  // Build the full URL with config params
  const separator = url.includes('?') ? '&' : '?'
  const fullUrl = `${url}${separator}fps=${fps}&duration=${durationInFrames}&width=${width}&height=${height}`

  // Open in the user's default browser
  openBrowser(fullUrl)

  // Keep process alive and handle graceful shutdown
  const shutdown = async () => {
    await cleanup()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  return { url: fullUrl, cleanup }
}
