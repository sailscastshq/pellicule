import test from 'node:test'
import assert from 'node:assert/strict'

import { createPipeEncodeArgs } from '../src/renderer/encode.js'

test('createPipeEncodeArgs builds ffmpeg args for streamed PNG input', () => {
  const args = createPipeEncodeArgs({
    output: './video.mp4',
    fps: 60,
    audio: './song.mp3'
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
    '-c:a', 'aac',
    './video.mp4'
  ])
})
