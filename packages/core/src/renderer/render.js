import { chromium } from 'playwright'
import { mkdir, rm } from 'fs/promises'
import { join, dirname } from 'path'

/** @typedef {import('../types.js').PelliculeWindow} PelliculeWindow */
/** @typedef {import('../types.js').BundlerServerOptions} BundlerServerOptions */
/** @typedef {import('../types.js').BundlerServerResult} BundlerServerResult */
/** @typedef {import('../types.js').ProgressCallback} ProgressCallback */
/** @typedef {import('../types.js').RenderVideoOptions} RenderVideoOptions */
/** @typedef {import('../types.js').RenderVideoResult} RenderVideoResult */

/**
 * @typedef {{
 *   page: import('playwright').Page,
 *   frame: number,
 *   outputFrameNum: number
 * }} RenderFrameContext
 */

/**
 * @typedef {{
 *   goto: (url: string, options: { waitUntil: 'networkidle' }) => Promise<unknown>,
 *   waitForFunction: (callback: () => boolean, options: { timeout: number }) => Promise<unknown>,
 *   evaluate: (callback: (...args: any[]) => unknown, ...args: any[]) => Promise<any>
 * }} RenderPageLike
 */

/**
 * @typedef {{
 *   page: RenderPageLike,
 *   url: string,
 *   fps: number,
 *   width: number,
 *   height: number,
 *   durationInFrames: number,
 *   startFrame: number,
 *   actualEndFrame: number,
 *   framesToRender: number,
 *   onProgress?: ProgressCallback,
 *   log: (...args: any[]) => void
 * }} RenderSessionLike
 */

/**
 * Create a video server using the appropriate bundler adapter.
 *
 * @param {BundlerServerOptions} options
 * @returns {Promise<BundlerServerResult>}
 */
export async function startBundlerServer(options) {
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
 * Build the renderer page URL with the active runtime config encoded as query params.
 *
 * @param {string} url
 * @param {{ fps: number, durationInFrames: number, width: number, height: number }} options
 * @returns {string}
 */
export function buildRenderPageUrl(url, options) {
  const resolved = new URL(url, 'http://localhost')
  resolved.searchParams.set('fps', String(options.fps))
  resolved.searchParams.set('duration', String(options.durationInFrames))
  resolved.searchParams.set('width', String(options.width))
  resolved.searchParams.set('height', String(options.height))
  return resolved.toString()
}

/**
 * @param {RenderVideoOptions} options
 * @returns {Promise<{
 *   page: import('playwright').Page,
 *   browser: import('playwright').Browser,
 *   cleanup: () => Promise<void>,
 *   tempDir: string,
 *   url: string,
 *   fps: number,
 *   width: number,
 *   height: number,
 *   durationInFrames: number,
 *   startFrame: number,
 *   actualEndFrame: number,
 *   framesToRender: number,
 *   onProgress?: ProgressCallback,
 *   log: (...args: any[]) => void,
 *   startTime: number
 * }>}
 */
async function createRenderSession(options) {
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

  const actualEndFrame = endFrame !== undefined ? endFrame : durationInFrames
  const framesToRender = actualEndFrame - startFrame
  const log = silent ? () => {} : console.log.bind(console)
  const startTime = Date.now()

  let url
  let cleanup
  let tempDir

  if (serverUrl) {
    log(`Using external server at ${serverUrl}...`)
    url = serverUrl
    const byosTempDir = join(dirname(input), '.pellicule')
    await mkdir(byosTempDir, { recursive: true })
    tempDir = byosTempDir
    cleanup = async () => {
      await rm(byosTempDir, { recursive: true, force: true })
    }
  } else {
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

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1
  })
  const page = await context.newPage()

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

  return {
    page,
    browser,
    cleanup,
    tempDir,
    url,
    fps,
    width,
    height,
    durationInFrames,
    startFrame,
    actualEndFrame,
    framesToRender,
    onProgress,
    log,
    startTime
  }
}

/**
 * @param {RenderSessionLike} session
 * @param {(context: RenderFrameContext) => Promise<void>} handleFrame
 * @returns {Promise<void>}
 */
export async function renderFrameSequence(session, handleFrame) {
  const {
    page,
    url,
    fps,
    width,
    height,
    durationInFrames,
    startFrame,
    actualEndFrame,
    framesToRender,
    onProgress,
    log
  } = session

  const rangeInfo = startFrame > 0 || actualEndFrame < durationInFrames
    ? ` (frames ${startFrame}-${actualEndFrame - 1})`
    : ''
  log(`Rendering ${framesToRender} frames at ${fps}fps (${width}x${height})${rangeInfo}`)

  const pageUrl = buildRenderPageUrl(url, { fps, durationInFrames, width, height })
  await page.goto(pageUrl, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => /** @type {PelliculeWindow} */ (window).__PELLICULE_READY__ === true, { timeout: 10000 })

  const error = await page.evaluate(() => /** @type {PelliculeWindow} */ (window).__PELLICULE_ERROR__)
  if (error) {
    throw new Error(`Render error: ${error}`)
  }

  const renderStart = Date.now()

  for (let frame = startFrame; frame < actualEndFrame; frame++) {
    await page.evaluate((f) => /** @type {PelliculeWindow} */ (window).__PELLICULE_SET_FRAME__?.(f), frame)

    const outputFrameNum = frame - startFrame
    await handleFrame({
      page: /** @type {import('playwright').Page} */ (page),
      frame,
      outputFrameNum
    })

    if (onProgress) {
      const elapsed = Date.now() - renderStart
      const framesRendered = outputFrameNum + 1
      const currentFps = framesRendered / (elapsed / 1000)
      onProgress({ frame: outputFrameNum, total: framesToRender, fps: currentFps })
    }

    if (outputFrameNum % 10 === 0 || frame === actualEndFrame - 1) {
      const percent = Math.round(((outputFrameNum + 1) / framesToRender) * 100)
      const elapsed = Date.now() - renderStart
      const framesPerSec = ((outputFrameNum + 1) / (elapsed / 1000)).toFixed(1)
      log(`Frame ${outputFrameNum + 1}/${framesToRender} (${percent}%) - ${framesPerSec} fps`)
    }
  }

  const renderTime = Date.now() - renderStart
  log(`Rendered ${framesToRender} frames in ${renderTime}ms (${(framesToRender / (renderTime / 1000)).toFixed(1)} fps)`)
}

/**
 * Renders a .vue component to video frames.
 *
 * @param {RenderVideoOptions} options
 * @returns {Promise<RenderVideoResult>}
 */
export async function renderVideo(options) {
  const session = await createRenderSession(options)
  const framesDir = join(session.tempDir, 'frames')
  await mkdir(framesDir, { recursive: true })

  try {
    await renderFrameSequence(session, async ({ page, outputFrameNum }) => {
      const framePath = join(framesDir, `frame-${String(outputFrameNum).padStart(5, '0')}.png`)
      await page.screenshot({ path: framePath })
    })
  } catch (error) {
    await session.cleanup()
    throw error
  } finally {
    await session.browser.close()
  }

  session.log(`Total time: ${Date.now() - session.startTime}ms`)

  return { framesDir, totalFrames: session.framesToRender, cleanup: session.cleanup }
}

/**
 * Render a frame sequence and hand each PNG buffer to a caller-provided sink.
 *
 * @param {RenderVideoOptions & { onFrame: (png: Buffer, outputFrameNum: number) => Promise<void> }} options
 * @returns {Promise<{ totalFrames: number, cleanup: () => Promise<void> }>}
 */
export async function streamVideoFrames(options) {
  const { onFrame, ...renderOptions } = options
  const session = await createRenderSession(renderOptions)

  try {
    await renderFrameSequence(session, async ({ page, outputFrameNum }) => {
      const png = await page.screenshot()
      await onFrame(png, outputFrameNum)
    })
  } catch (error) {
    await session.cleanup()
    throw error
  } finally {
    await session.browser.close()
  }

  session.log(`Total time: ${Date.now() - session.startTime}ms`)

  return { totalFrames: session.framesToRender, cleanup: session.cleanup }
}
