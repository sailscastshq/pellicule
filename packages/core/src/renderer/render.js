import { chromium } from 'playwright'
import { mkdir, rm } from 'fs/promises'
import { join, dirname } from 'path'

/**
 * Create a video server using the appropriate bundler adapter.
 *
 * @param {object} options
 * @param {string} options.input - Absolute path to the .vue file
 * @param {number} options.width
 * @param {number} options.height
 * @param {'vite'|'rsbuild'} options.bundler - Which bundler adapter to use
 * @param {string|null} options.configFile - Path to the user's config file
 * @param {string} options.projectType - Detected project type (for Shipwright config reading)
 * @returns {Promise<{ url: string, cleanup: function, tempDir: string }>}
 */
async function startBundlerServer(options) {
  const { bundler = 'vite', ...serverOptions } = options

  if (bundler === 'rsbuild') {
    // Lazy-load the Rsbuild adapter
    const { createVideoServer } = await import('../bundler/rsbuild.js')
    return createVideoServer(serverOptions)
  }

  // Default: Vite adapter (always available)
  const { createVideoServer } = await import('../bundler/vite.js')
  return createVideoServer(serverOptions)
}

/**
 * Renders a .vue component to video frames.
 *
 * @param {object} options
 * @param {string} options.input - Path to the .vue file
 * @param {number} options.fps - Frames per second (default: 30)
 * @param {number} options.durationInFrames - Total frames in the video (for animation calculations)
 * @param {number} options.startFrame - First frame to render (default: 0)
 * @param {number} options.endFrame - Last frame to render, exclusive (default: durationInFrames)
 * @param {number} options.width - Video width in pixels (default: 1920)
 * @param {number} options.height - Video height in pixels (default: 1080)
 * @param {function} options.onProgress - Progress callback
 * @param {string|null} [options.serverUrl] - BYOS: skip bundler, use this URL instead
 * @param {'vite'|'rsbuild'} [options.bundler] - Which bundler adapter to use (default: 'vite')
 * @param {string|null} [options.configFile] - Path to the user's config file
 * @param {string} [options.projectType] - Detected project type
 * @returns {Promise<{ framesDir: string, totalFrames: number, cleanup: function }>}
 */
export async function renderVideo(options) {
  const {
    input,
    fps = 30,
    durationInFrames,
    startFrame = 0,
    endFrame,
    width = 1920,
    height = 1080,
    onProgress,
    silent = false,
    serverUrl = null,
    bundler = 'vite',
    configFile = null,
    projectType = 'standalone'
  } = options

  // Calculate actual frame range to render
  const actualEndFrame = endFrame !== undefined ? endFrame : durationInFrames
  const framesToRender = actualEndFrame - startFrame

  const log = silent ? () => {} : console.log.bind(console)

  const startTime = Date.now()

  let url
  let cleanup
  let tempDir

  if (serverUrl) {
    // BYOS mode: skip the bundler entirely, use the provided URL
    log(`Using external server at ${serverUrl}...`)
    url = serverUrl
    // Create a temp dir for frames and provide cleanup
    const byosTempDir = join(dirname(input), '.pellicule')
    await mkdir(byosTempDir, { recursive: true })
    tempDir = byosTempDir
    cleanup = async () => {
      await rm(byosTempDir, { recursive: true, force: true })
    }
  } else {
    // Start a bundler dev server
    const bundlerName = bundler === 'rsbuild' ? 'Rsbuild' : 'Vite'
    log(`Starting ${bundlerName} server for ${input}...`)
    const serverStart = Date.now()
    const server = await startBundlerServer({
      input,
      width,
      height,
      bundler,
      configFile,
      projectType
    })
    url = server.url
    cleanup = server.cleanup
    tempDir = server.tempDir
    log(`Server ready in ${Date.now() - serverStart}ms`)
  }

  // Store frames inside .pellicule (cleaned up automatically after encoding)
  const framesDir = join(tempDir, 'frames')
  await mkdir(framesDir, { recursive: true })

  // Launch browser
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1
  })
  const page = await context.newPage()

  // Capture console errors (only log if not silent)
  page.on('console', msg => {
    if (msg.type() === 'error' && !silent) {
      console.error('Browser error:', msg.text())
    }
  })

  page.on('pageerror', error => {
    if (!silent) {
      console.error('Page error:', error.message)
    }
  })

  const rangeInfo = startFrame > 0 || actualEndFrame < durationInFrames
    ? ` (frames ${startFrame}-${actualEndFrame - 1})`
    : ''
  log(`Rendering ${framesToRender} frames at ${fps}fps (${width}x${height})${rangeInfo}`)

  try {
    // Load page ONCE with config (durationInFrames stays full for correct animation calculations)
    const pageUrl = `${url}?fps=${fps}&duration=${durationInFrames}&width=${width}&height=${height}`
    await page.goto(pageUrl, { waitUntil: 'networkidle' })

    // Wait for Vue to mount
    await page.waitForFunction(() => window.__PELLICULE_READY__ === true, { timeout: 10000 })

    // Check for errors
    const error = await page.evaluate(() => window.__PELLICULE_ERROR__)
    if (error) {
      throw new Error(`Render error: ${error}`)
    }

    const renderStart = Date.now()

    // Render each frame in the specified range
    for (let frame = startFrame; frame < actualEndFrame; frame++) {
      // Update frame number - Vue reactivity handles re-render
      await page.evaluate((f) => window.__PELLICULE_SET_FRAME__(f), frame)

      // Screenshot - output frames are numbered from 0
      const outputFrameNum = frame - startFrame
      const framePath = join(framesDir, `frame-${String(outputFrameNum).padStart(5, '0')}.png`)
      await page.screenshot({ path: framePath })

      // Progress callback
      if (onProgress) {
        const elapsed = Date.now() - renderStart
        const framesRendered = outputFrameNum + 1
        const currentFps = framesRendered / (elapsed / 1000)
        onProgress({ frame: outputFrameNum, total: framesToRender, fps: currentFps })
      }

      // Log progress every 10 frames
      const outputFrameIndex = frame - startFrame
      if (outputFrameIndex % 10 === 0 || frame === actualEndFrame - 1) {
        const percent = Math.round(((outputFrameIndex + 1) / framesToRender) * 100)
        const elapsed = Date.now() - renderStart
        const framesPerSec = ((outputFrameIndex + 1) / (elapsed / 1000)).toFixed(1)
        log(`Frame ${outputFrameIndex + 1}/${framesToRender} (${percent}%) - ${framesPerSec} fps`)
      }
    }

    const renderTime = Date.now() - renderStart
    log(`Rendered ${framesToRender} frames in ${renderTime}ms (${(framesToRender / (renderTime / 1000)).toFixed(1)} fps)`)

  } finally {
    await browser.close()
    // Don't cleanup here - frames are needed for encoding
    // Cleanup will be called by renderToMp4 after encoding
  }

  log(`Total time: ${Date.now() - startTime}ms`)

  return { framesDir, totalFrames: framesToRender, cleanup }
}
