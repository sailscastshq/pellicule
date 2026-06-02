import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DefineVideoConfigParseError,
  extractVideoConfigFromSource
} from '../src/macros/define-video-config.js'

test('extractVideoConfigFromSource returns null when no macro is present', () => {
  const source = `
    <script setup>
    const message = 'hello'
    </script>
  `

  assert.equal(extractVideoConfigFromSource(source, { filename: 'NoMacro.vue' }), null)
})

test('extractVideoConfigFromSource parses static nested config from a TypeScript script setup', () => {
  const source = `
    <script setup lang="ts">
    type Marker = { label: string, at: number }

    defineVideoConfig({
      fps: 60,
      durationInSeconds: 4,
      audio: './theme.mp3',
      title: \`Launch Day\`,
      markers: [
        { label: 'Intro', at: 0 },
        { label: 'Outro', at: 180 }
      ],
      metadata: {
        palette: ['#0f172a', '#42b883'],
        published: true,
        version: 2
      }
    } satisfies Record<string, unknown>)
    </script>
  `

  assert.deepEqual(extractVideoConfigFromSource(source, { filename: 'Nested.vue' }), {
    fps: 60,
    durationInSeconds: 4,
    audio: './theme.mp3',
    title: 'Launch Day',
    markers: [
      { label: 'Intro', at: 0 },
      { label: 'Outro', at: 180 }
    ],
    metadata: {
      palette: ['#0f172a', '#42b883'],
      published: true,
      version: 2
    }
  })
})

test('extractVideoConfigFromSource rejects non-static values with a clear parse error', () => {
  const source = `
    <script setup>
    const total = 120

    defineVideoConfig({
      durationInFrames: total
    })
    </script>
  `

  assert.throws(
    () => extractVideoConfigFromSource(source, { filename: 'NonStatic.vue' }),
    (error) => {
      assert.ok(error instanceof DefineVideoConfigParseError)
      assert.match(error.message, /NonStatic\.vue:\d+:\d+ defineVideoConfig\(\) does not support Identifier values\./)
      return true
    }
  )
})

test('extractVideoConfigFromSource rejects multiple macro calls', () => {
  const source = `
    <script setup>
    defineVideoConfig({ fps: 30 })
    defineVideoConfig({ durationInSeconds: 5 })
    </script>
  `

  assert.throws(
    () => extractVideoConfigFromSource(source, { filename: 'Multiple.vue' }),
    (error) => {
      assert.ok(error instanceof DefineVideoConfigParseError)
      assert.match(error.message, /defineVideoConfig\(\) can only be called once per component\./)
      return true
    }
  )
})

test('extractVideoConfigFromSource rejects spread syntax in the macro payload', () => {
  const source = `
    <script setup>
    const base = { fps: 30 }

    defineVideoConfig({
      ...base,
      durationInSeconds: 5
    })
    </script>
  `

  assert.throws(
    () => extractVideoConfigFromSource(source, { filename: 'Spread.vue' }),
    (error) => {
      assert.ok(error instanceof DefineVideoConfigParseError)
      assert.match(error.message, /defineVideoConfig\(\) does not support spread syntax inside objects\./)
      return true
    }
  )
})
