import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { parseAudioDurationSeconds } from '../src/audio/probe.js'
import { startAudioPreviewServer } from '../src/dev/audio-server.js'

test('parseAudioDurationSeconds parses ffprobe output', () => {
  assert.equal(parseAudioDurationSeconds('4.250000\n'), 4.25)
})

test('parseAudioDurationSeconds rejects empty output', () => {
  assert.throws(
    () => parseAudioDurationSeconds('\n'),
    /Unable to determine audio duration/
  )
})

test('startAudioPreviewServer serves audio files with range support', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'pellicule-audio-preview-'))
  const audioPath = join(tempDir, 'tone.wav')
  await writeFile(audioPath, Buffer.from('0123456789'))

  const server = await startAudioPreviewServer(audioPath)

  try {
    const headResponse = await fetch(server.url, { method: 'HEAD' })
    assert.equal(headResponse.status, 200)
    assert.equal(headResponse.headers.get('content-type'), 'audio/wav')
    assert.equal(headResponse.headers.get('accept-ranges'), 'bytes')

    const rangeResponse = await fetch(server.url, {
      headers: {
        Range: 'bytes=2-5'
      }
    })

    assert.equal(rangeResponse.status, 206)
    assert.equal(rangeResponse.headers.get('content-range'), 'bytes 2-5/10')
    assert.equal(await rangeResponse.text(), '2345')
  } finally {
    await server.cleanup()
    await rm(tempDir, { recursive: true, force: true })
  }
})
