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
 * @param {number} options.durationInFrames - Total frames to render
 * @param {number} options.width - Video width in pixels (default: 1920)
 * @param {number} options.height - Video height in pixels (default: 1080)
 * @param {string} options.outputDir - Directory for frame images (default: './frames')
 * @param {function} options.onProgress - Progress callback
 * @returns {Promise<{ framesDir: string, totalFrames: number }>}
 */
export async function renderVideo(options) {
  const {
    input,
    fps = 30,
    durationInFrames,
    width = 1920,
    height = 1080,
    outputDir = './frames',
    onProgress,
    silent = false
  } = options

  const log = silent ? () => {} : console.log.bind(console)

  const startTime = Date.now()

  // Start Vite server with the video component
  log(`Starting Vite server for ${input}...`)
  const viteStart = Date.now()
  const { url, cleanup } = await createVideoServer({ input, width, height })
  log(`Server ready in ${Date.now() - viteStart}ms`)

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true })

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

  log(`Rendering ${durationInFrames} frames at ${fps}fps (${width}x${height})`)

  try {
    // Load page ONCE with config
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

    // Render each frame by updating the frame ref (no page reload!)
    for (let frame = 0; frame < durationInFrames; frame++) {
      // Update frame number - Vue reactivity handles re-render
      await page.evaluate((f) => window.__PELLICULE_SET_FRAME__(f), frame)

      // Screenshot
      const framePath = join(outputDir, `frame-${String(frame).padStart(5, '0')}.png`)
      await page.screenshot({ path: framePath })

      // Progress callback
      if (onProgress) {
        const elapsed = Date.now() - renderStart
        const currentFps = (frame + 1) / (elapsed / 1000)
        onProgress({ frame, total: durationInFrames, fps: currentFps })
      }

      // Log progress every 10 frames
      if (frame % 10 === 0 || frame === durationInFrames - 1) {
        const percent = Math.round(((frame + 1) / durationInFrames) * 100)
        const elapsed = Date.now() - renderStart
        const framesPerSec = ((frame + 1) / (elapsed / 1000)).toFixed(1)
        log(`Frame ${frame + 1}/${durationInFrames} (${percent}%) - ${framesPerSec} fps`)
      }
    }

    const renderTime = Date.now() - renderStart
    log(`Rendered ${durationInFrames} frames in ${renderTime}ms (${(durationInFrames / (renderTime / 1000)).toFixed(1)} fps)`)

  } finally {
    await browser.close()
    await cleanup()
  }

  log(`Total time: ${Date.now() - startTime}ms`)
  log(`Frames saved to ${outputDir}`)

  return { framesDir: outputDir, totalFrames: durationInFrames }
}
