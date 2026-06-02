import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createPipeEncodeArgs,
  resolveOutputOptions
} from '../src/renderer/encode.js'

test('resolveOutputOptions keeps the default mp4 output model', () => {
  const resolved = resolveOutputOptions()

  assert.deepEqual(resolved, {
    output: './output.mp4',
    preset: 'mp4',
    quality: 'standard'
  })
})

test('resolveOutputOptions infers webm from the output extension', () => {
  const resolved = resolveOutputOptions({ output: './demo.webm' })

  assert.deepEqual(resolved, {
    output: './demo.webm',
    preset: 'webm',
    quality: 'standard'
  })
})

test('resolveOutputOptions uses the preset extension when no output path is provided', () => {
  const resolved = resolveOutputOptions({ preset: 'webm' })

  assert.deepEqual(resolved, {
    output: './output.webm',
    preset: 'webm',
    quality: 'standard'
  })
})

test('resolveOutputOptions appends the preset extension when output has no extension', () => {
  const resolved = resolveOutputOptions({ output: './exports/demo', preset: 'webm', quality: 'high' })

  assert.deepEqual(resolved, {
    output: './exports/demo.webm',
    preset: 'webm',
    quality: 'high'
  })
})

test('resolveOutputOptions rejects mismatched preset and file extension', () => {
  assert.throws(
    () => resolveOutputOptions({ output: './demo.mp4', preset: 'webm' }),
    /does not match the webm preset/
  )
})

test('createPipeEncodeArgs builds ffmpeg args for streamed png mp4 output', () => {
  const args = createPipeEncodeArgs({
    output: './video.mp4',
    fps: 60,
    audio: './song.mp3',
    preset: 'mp4',
    quality: 'standard'
  })

  assert.deepEqual(args, [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-framerate', '60',
    '-i', 'pipe:0',
    '-i', './song.mp3',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    './video.mp4'
  ])
})

test('createPipeEncodeArgs builds ffmpeg args for streamed png webm output', () => {
  const args = createPipeEncodeArgs({
    output: './video.webm',
    fps: 30,
    preset: 'webm',
    quality: 'draft'
  })

  assert.deepEqual(args, [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-framerate', '30',
    '-i', 'pipe:0',
    '-c:v', 'libvpx-vp9',
    '-b:v', '0',
    '-crf', '38',
    '-deadline', 'realtime',
    '-cpu-used', '6',
    './video.webm'
  ])
})
