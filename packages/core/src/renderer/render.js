import { chromium } from 'playwright'
import { createVideoServer } from '../bundler/vite.js'
import { mkdir } from 'fs/promises'
import { join } from 'path'

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
    silent = false
  } = options

  // Calculate actual frame range to render
  const actualEndFrame = endFrame !== undefined ? endFrame : durationInFrames
  const framesToRender = actualEndFrame - startFrame

  const log = silent ? () => {} : console.log.bind(console)

  const startTime = Date.now()

  // Start Vite server with the video component
  log(`Starting Vite server for ${input}...`)
  const viteStart = Date.now()
  const { url, cleanup, tempDir } = await createVideoServer({ input, width, height })
  log(`Server ready in ${Date.now() - viteStart}ms`)

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
