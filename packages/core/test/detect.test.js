import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import { detectProject, readPelliculeConfig, resolveInputFile } from '../src/config/detect.js'

/**
 * @param {string} prefix
 * @returns {Promise<string>}
 */
async function createFixtureDir(prefix) {
  return await mkdtemp(join(tmpdir(), prefix))
}

/**
 * @param {string} root
 * @param {string} relativePath
 * @param {string} [contents]
 * @returns {Promise<void>}
 */
async function writeFixture(root, relativePath, contents = '') {
  const fullPath = join(root, relativePath)
  await mkdir(join(fullPath, '..'), { recursive: true })
  await writeFile(fullPath, contents)
}

test('detectProject identifies Laravel projects before plain Vite', async () => {
  const root = await createFixtureDir('pellicule-detect-laravel-')

  try {
    await writeFixture(root, 'artisan')
    await writeFixture(root, 'vite.config.js', 'export default {}')

    assert.deepEqual(detectProject(root), {
      projectType: 'laravel',
      bundler: 'vite',
      configFile: join(root, 'vite.config.js'),
      videosDir: join(root, 'resources', 'js', 'videos'),
      byos: false
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('detectProject identifies Nuxt projects with BYOS defaults', async () => {
  const root = await createFixtureDir('pellicule-detect-nuxt-')

  try {
    await writeFixture(root, 'nuxt.config.ts', 'export default defineNuxtConfig({})')

    assert.deepEqual(detectProject(root), {
      projectType: 'nuxt',
      bundler: 'vite',
      configFile: join(root, 'nuxt.config.ts'),
      videosDir: join(root, 'app', 'videos'),
      byos: true,
      defaultServerUrl: 'http://localhost:3000'
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('detectProject falls back to standalone when no framework config exists', async () => {
  const root = await createFixtureDir('pellicule-detect-standalone-')

  try {
    assert.deepEqual(detectProject(root), {
      projectType: 'standalone',
      bundler: 'vite',
      configFile: null,
      videosDir: root,
      byos: false
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('readPelliculeConfig resolves supported package.json options', async () => {
  const root = await createFixtureDir('pellicule-config-')

  try {
    await writeFixture(root, 'package.json', JSON.stringify({
      pellicule: {
        serverUrl: 'http://localhost:4100',
        videosDir: 'custom/videos',
        outDir: 'renders',
        bundler: 'rsbuild'
      }
    }))

    assert.deepEqual(readPelliculeConfig(root), {
      serverUrl: 'http://localhost:4100',
      videosDir: join(root, 'custom', 'videos'),
      outDir: join(root, 'renders'),
      bundler: 'rsbuild'
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('readPelliculeConfig ignores invalid package.json content', async () => {
  const root = await createFixtureDir('pellicule-config-invalid-')

  try {
    await writeFixture(root, 'package.json', '{ not valid json')
    assert.deepEqual(readPelliculeConfig(root), {})
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('resolveInputFile finds exact and videosDir-relative component paths', async () => {
  const root = await createFixtureDir('pellicule-input-')
  const videosDir = join(root, 'src', 'videos')

  try {
    await writeFixture(root, 'Video.vue', '<template />')
    await writeFixture(root, 'src/videos/Intro.vue', '<template />')

    assert.deepEqual(resolveInputFile(join(root, 'Video.vue'), videosDir), {
      resolved: join(root, 'Video.vue')
    })

    assert.deepEqual(resolveInputFile('Intro', videosDir), {
      resolved: join(videosDir, 'Intro.vue')
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('resolveInputFile reports every searched path when the component is missing', async () => {
  const root = await createFixtureDir('pellicule-input-missing-')
  const videosDir = join(root, 'src', 'videos')

  try {
    assert.deepEqual(resolveInputFile('Missing', videosDir), {
      error: 'File not found: Missing',
      searched: [
        resolve('Missing'),
        resolve('Missing.vue'),
        join(videosDir, 'Missing.vue')
      ]
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
