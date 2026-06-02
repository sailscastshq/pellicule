import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildVideoConfigUrl,
  haveVideoConfigChanged,
  parseVideoConfigFromSearch,
  resolveVideoConfig
} from '../src/runtime/config.js'
import { waitForRenderReady } from '../src/runtime/ready.js'

function createMockImage(options = {}) {
  const listeners = new Map()
  const image = {
    alt: options.alt || '',
    src: options.src || '',
    currentSrc: options.currentSrc || options.src || '',
    complete: options.complete ?? true,
    naturalWidth: options.naturalWidth ?? 100,
    decode: options.decode || null,
    addEventListener(type, listener) {
      listeners.set(type, listener)
    },
    removeEventListener(type) {
      listeners.delete(type)
    },
    emit(type) {
      const listener = listeners.get(type)
      if (listener) {
        listener()
      }
    }
  }

  return image
}

test('resolveVideoConfig derives duration from durationInSeconds using the resolved fps', () => {
  const config = resolveVideoConfig(
    { fps: 30, durationInFrames: 90, width: 1920, height: 1080 },
    { fps: 60, durationInSeconds: 2.5 }
  )

  assert.deepEqual(config, {
    fps: 60,
    durationInFrames: 150,
    width: 1920,
    height: 1080
  })
})

test('parseVideoConfigFromSearch reads query params with sane fallbacks', () => {
  const config = parseVideoConfigFromSearch('?fps=48&duration=240&width=1280', {
    fps: 30,
    durationInFrames: 90,
    width: 1920,
    height: 1080
  })

  assert.deepEqual(config, {
    fps: 48,
    durationInFrames: 240,
    width: 1280,
    height: 1080
  })
})

test('buildVideoConfigUrl preserves unrelated query params while replacing config values', () => {
  const url = buildVideoConfigUrl('http://localhost:4173/pellicule?component=Demo&preview=1', {
    fps: 60,
    durationInFrames: 180,
    width: 1080,
    height: 1920
  })

  assert.equal(
    url,
    'http://localhost:4173/pellicule?component=Demo&preview=1&fps=60&duration=180&width=1080&height=1920'
  )
})

test('haveVideoConfigChanged detects runtime config mismatches', () => {
  const currentConfig = { fps: 30, durationInFrames: 90, width: 1920, height: 1080 }
  const sameConfig = { ...currentConfig }
  const nextConfig = { ...currentConfig, durationInFrames: 120 }

  assert.equal(haveVideoConfigChanged(currentConfig, sameConfig), false)
  assert.equal(haveVideoConfigChanged(currentConfig, nextConfig), true)
})

test('waitForRenderReady resolves after fonts and images are ready', async () => {
  let rafCalls = 0
  const image = createMockImage({
    decode: async () => {}
  })

  await waitForRenderReady({
    documentRef: {
      fonts: { ready: Promise.resolve() },
      images: [image]
    },
    requestAnimationFrameRef(callback) {
      rafCalls += 1
      callback(0)
    },
    timeoutMs: 50
  })

  assert.equal(rafCalls, 2)
})

test('waitForRenderReady waits for late-loading images', async () => {
  const image = createMockImage({
    complete: false,
    naturalWidth: 0,
    src: 'https://example.com/poster.png'
  })

  const ready = waitForRenderReady({
    documentRef: {
      fonts: { ready: Promise.resolve() },
      images: [image]
    },
    requestAnimationFrameRef(callback) {
      callback(0)
    },
    timeoutMs: 100
  })

  setTimeout(() => {
    image.complete = true
    image.naturalWidth = 400
    image.emit('load')
  }, 10)

  await ready
})

test('waitForRenderReady rejects on broken images', async () => {
  const image = createMockImage({
    naturalWidth: 0,
    src: 'https://example.com/broken.png'
  })

  await assert.rejects(
    waitForRenderReady({
      documentRef: {
        fonts: { ready: Promise.resolve() },
        images: [image]
      },
      requestAnimationFrameRef(callback) {
        callback(0)
      },
      timeoutMs: 50
    }),
    /Image failed to load: https:\/\/example.com\/broken.png/
  )
})
