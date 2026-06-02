import test from 'node:test'
import assert from 'node:assert/strict'

import { buildRenderPageUrl, renderFrameSequence } from '../src/renderer/render.js'

/**
 * @param {{ ready?: boolean, error?: string|null }} [options]
 * @returns {{
 *   page: {
 *     gotoCalls: Array<{ url: string, options: { waitUntil: 'networkidle' } }>,
 *     setFrames: number[],
 *     goto: (url: string, options: { waitUntil: 'networkidle' }) => Promise<void>,
 *     waitForFunction: (callback: () => boolean, options: { timeout: number }) => Promise<void>,
 *     evaluate: (callback: (...args: any[]) => unknown, ...args: any[]) => Promise<any>
 *   },
 *   waitCalls: Array<{ timeout: number }>
 * }}
 */
function createMockPage(options = {}) {
  const gotoCalls = []
  const waitCalls = []
  const setFrames = []
  const ready = options.ready ?? true
  const error = options.error ?? null
  let evaluateCallCount = 0

  return {
    page: {
      gotoCalls,
      setFrames,
      async goto(url, gotoOptions) {
        gotoCalls.push({ url, options: gotoOptions })
      },
      async waitForFunction(callback, waitOptions) {
        waitCalls.push(waitOptions)
        assert.equal(typeof callback, 'function')
        assert.equal(ready, true)
      },
      async evaluate(_callback, ...args) {
        evaluateCallCount += 1

        if (evaluateCallCount === 1) {
          return error
        }

        if (args.length > 0) {
          setFrames.push(args[0])
        }

        return undefined
      }
    },
    waitCalls
  }
}

test('buildRenderPageUrl merges render config into the target URL', () => {
  const url = buildRenderPageUrl('http://localhost:3000/pellicule?component=Demo&preview=1', {
    fps: 60,
    durationInFrames: 180,
    width: 1080,
    height: 1920
  })

  assert.equal(
    url,
    'http://localhost:3000/pellicule?component=Demo&preview=1&fps=60&duration=180&width=1080&height=1920'
  )
})

test('renderFrameSequence drives a minimal render loop and reports progress', async () => {
  const { page, waitCalls } = createMockPage()
  const handledFrames = []
  const progress = []
  const logs = []

  await renderFrameSequence({
    page,
    url: 'http://localhost:4173/pellicule?component=Demo',
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 8,
    startFrame: 2,
    actualEndFrame: 5,
    framesToRender: 3,
    onProgress: (entry) => {
      progress.push(entry)
    },
    log: (...args) => {
      logs.push(args.join(' '))
    }
  }, async ({ frame, outputFrameNum }) => {
    handledFrames.push({ frame, outputFrameNum })
  })

  assert.deepEqual(page.gotoCalls, [{
    url: 'http://localhost:4173/pellicule?component=Demo&fps=30&duration=8&width=1920&height=1080',
    options: { waitUntil: 'networkidle' }
  }])
  assert.deepEqual(waitCalls, [{ timeout: 10000 }])
  assert.deepEqual(page.setFrames, [2, 3, 4])
  assert.deepEqual(handledFrames, [
    { frame: 2, outputFrameNum: 0 },
    { frame: 3, outputFrameNum: 1 },
    { frame: 4, outputFrameNum: 2 }
  ])
  assert.equal(progress.length, 3)
  assert.equal(progress[2].frame, 2)
  assert.equal(progress[2].total, 3)
  assert.match(logs[0], /Rendering 3 frames at 30fps/)
  assert.match(logs.at(-1) || '', /Rendered 3 frames in/)
})

test('renderFrameSequence throws when the page reports a render error', async () => {
  const { page } = createMockPage({ error: 'kaboom' })

  await assert.rejects(
    renderFrameSequence({
      page,
      url: 'http://localhost:4173',
      fps: 30,
      width: 1920,
      height: 1080,
      durationInFrames: 4,
      startFrame: 0,
      actualEndFrame: 1,
      framesToRender: 1,
      log: () => {}
    }, async () => {}),
    /Render error: kaboom/
  )
})
