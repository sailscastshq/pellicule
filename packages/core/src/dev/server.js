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
import { startAudioPreviewServer } from './audio-server.js'
import { startBundlerServer } from '../renderer/render.js'

/**
 * @typedef {import('../types.js').AsyncCleanup} AsyncCleanup
 * @typedef {import('../types.js').DevServerOptions} DevServerOptions
 * @typedef {import('../types.js').DevServerResult} DevServerResult
 */

/**
 * Open a URL in the user's default browser using platform-native commands.
 * Uses execFile (not exec) to avoid shell injection.
 * @param {string} url
 * @returns {void}
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
 * @param {boolean} [options.syncConfigWithComponent]
 * @param {string|null} [options.audio]
 * @param {number|null} [options.audioDurationInSeconds]
 * @param {string|null} [options.configFile]
 * @param {import('../types.js').ProjectType} [options.projectType]
 * @param {string} [options.version] - Package version (shown in overlay)
 * @returns {Promise<DevServerResult>}
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
    syncConfigWithComponent = false,
    audio = null,
    audioDurationInSeconds = null,
    configFile = null,
    projectType = 'standalone',
    version = ''
  } = options

  let url
  /** @type {AsyncCleanup[]} */
  const cleanupTasks = []

  if (serverUrl) {
    // BYOS mode (Nuxt/Quasar) — just use the existing server
    url = serverUrl
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
    cleanupTasks.push(server.cleanup)
  }

  /** @type {string|null} */
  let audioUrl = null
  if (audio) {
    const audioServer = await startAudioPreviewServer(audio)
    audioUrl = audioServer.url
    cleanupTasks.push(audioServer.cleanup)
  }

  const fullUrl = new URL(url)
  fullUrl.searchParams.set('fps', String(fps))
  fullUrl.searchParams.set('duration', String(durationInFrames))
  fullUrl.searchParams.set('width', String(width))
  fullUrl.searchParams.set('height', String(height))
  fullUrl.searchParams.set('preview', '1')

  if (syncConfigWithComponent) {
    fullUrl.searchParams.set('config-refresh', '1')
  }
  if (audioUrl) {
    fullUrl.searchParams.set('audio-url', audioUrl)
  }
  if (audioDurationInSeconds !== null) {
    fullUrl.searchParams.set('audio-duration', String(audioDurationInSeconds))
  }

  // Open in the user's default browser
  openBrowser(fullUrl.toString())

  /** @type {AsyncCleanup} */
  const cleanup = async () => {
    const tasks = cleanupTasks.slice().reverse()
    for (const task of tasks) {
      await task()
    }
  }

  // Keep process alive and handle graceful shutdown
  const shutdown = async () => {
    await cleanup()
    process.exit(0)
  }

  process.on('SIGINT', () => {
    void shutdown()
  })
  process.on('SIGTERM', () => {
    void shutdown()
  })

  return { url: fullUrl.toString(), cleanup }
}
