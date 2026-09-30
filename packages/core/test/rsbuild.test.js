import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createVideoServer } from '../src/bundler/rsbuild.js'

test('Rsbuild compiles Vue, macros, asset imports and an explicit user config', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pellicule-rsbuild-'))
  let server
  try {
    await writeFile(join(dir, 'Video.vue'), `<script setup>
defineVideoConfig({ durationInFrames: 3 })
import { useFrame } from 'pellicule'
import image from './mark.svg'
const frame = useFrame()
const label = DEMO_LABEL
</script>
<template><div>{{ frame }} {{ label }}<img :src="image" /></div></template>`)
    await writeFile(join(dir, 'mark.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><circle r="2" /></svg>')
    // A default config must not replace the filename requested by --config.
    await writeFile(join(dir, 'rsbuild.config.mjs'), 'throw new Error("wrong config loaded")')
    const configFile = join(dir, 'video.config.mjs')
    await writeFile(configFile, `export default { source: { define: { DEMO_LABEL: JSON.stringify('explicit-rsbuild-config') } } }`)
    server = await createVideoServer({ input: join(dir, 'Video.vue'), configFile, width: 320, height: 180 })
    const html = await (await fetch(server.url)).text()
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1])
    assert.ok(scripts.length > 0, 'Rsbuild serves the compiled entry')
    const bundles = await Promise.all(scripts.map(async src => {
      const response = await fetch(new URL(src, server.url))
      assert.equal(response.status, 200)
      return response.text()
    }))
    const code = bundles.join('\n')
    assert.ok(code.includes('explicit-rsbuild-config'), 'explicit source.define reaches the Vue script')
    assert.match(code, /mark\.svg|data:image\/svg/)
    assert.match(code, /__PELLICULE_READY__/)
  } finally {
    await server?.cleanup()
    await rm(dir, { recursive: true, force: true })
  }
})
