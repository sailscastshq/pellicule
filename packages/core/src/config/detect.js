/**
 * Auto-detect the project type, config file, and videos directory.
 *
 * Detection chain (first match wins):
 *   1. vite.config.js / vite.config.ts    → Vite adapter
 *   2. rsbuild.config.js / rsbuild.config.ts → Rsbuild adapter
 *   3. config/shipwright.js               → Rsbuild adapter (reads `build` key)
 *   4. nuxt.config.ts / nuxt.config.js    → BYOS mode (needs running Nuxt server)
 *   5. quasar.config.js                   → Vite adapter (Quasar Vite mode)
 *   6. Nothing found                      → Built-in Vite adapter (zero config)
 */

import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'

/**
 * @typedef {'vite'|'rsbuild'|'shipwright'|'nuxt'|'quasar'|'standalone'} ProjectType
 *
 * @typedef {Object} DetectedProject
 * @property {ProjectType} projectType
 * @property {'vite'|'rsbuild'} bundler - Which bundler adapter to use
 * @property {string|null} configFile - Absolute path to the detected config file
 * @property {string} videosDir - Absolute path to the conventional videos directory
 * @property {boolean} byos - Whether this project requires BYOS (Bring Your Own Server)
 * @property {string|null} defaultServerUrl - Default server URL for BYOS projects (e.g., Nuxt)
 */

/**
 * Detect the project type by scanning for config files from cwd.
 *
 * @param {string} [cwd] - Directory to scan (defaults to process.cwd())
 * @returns {DetectedProject}
 */
export function detectProject(cwd) {
  const root = resolve(cwd || process.cwd())

  // 1. Vite
  for (const name of ['vite.config.js', 'vite.config.ts']) {
    const file = join(root, name)
    if (existsSync(file)) {
      return {
        projectType: 'vite',
        bundler: 'vite',
        configFile: file,
        videosDir: join(root, 'src', 'videos'),
        byos: false
      }
    }
  }

  // 2. Rsbuild (standalone)
  for (const name of ['rsbuild.config.js', 'rsbuild.config.ts']) {
    const file = join(root, name)
    if (existsSync(file)) {
      return {
        projectType: 'rsbuild',
        bundler: 'rsbuild',
        configFile: file,
        videosDir: join(root, 'src', 'videos'),
        byos: false
      }
    }
  }

  // 3. Shipwright (boring stack)
  {
    const file = join(root, 'config', 'shipwright.js')
    if (existsSync(file)) {
      return {
        projectType: 'shipwright',
        bundler: 'rsbuild',
        configFile: file,
        videosDir: join(root, 'assets', 'js', 'videos'),
        byos: false
      }
    }
  }

  // 4. Nuxt
  for (const name of ['nuxt.config.ts', 'nuxt.config.js']) {
    const file = join(root, name)
    if (existsSync(file)) {
      return {
        projectType: 'nuxt',
        bundler: 'vite',
        configFile: file,
        videosDir: join(root, 'app', 'videos'),
        byos: true,
        defaultServerUrl: 'http://localhost:3000'
      }
    }
  }

  // 5. Quasar
  {
    const file = join(root, 'quasar.config.js')
    if (existsSync(file)) {
      return {
        projectType: 'quasar',
        bundler: 'vite',
        configFile: file,
        videosDir: join(root, 'src', 'videos'),
        byos: false
      }
    }
  }

  // 6. No config found → standalone (create-pellicule / bare project)
  return {
    projectType: 'standalone',
    bundler: 'vite',
    configFile: null,
    videosDir: root,
    byos: false
  }
}

/**
 * Read project-level Pellicule config from the `pellicule` key in package.json.
 *
 * This lets users set options once per project instead of passing CLI flags
 * every time. Useful for Nuxt projects (serverUrl), custom video directories,
 * or forcing a specific bundler.
 *
 * Supported keys:
 *   - serverUrl  — URL of a running dev server (BYOS mode)
 *   - videosDir  — custom directory for video components
 *   - outDir     — directory for rendered video output
 *   - bundler    — force 'vite' or 'rsbuild'
 *
 * @param {string} [cwd] - Directory to scan (defaults to process.cwd())
 * @returns {{ serverUrl?: string, videosDir?: string, outDir?: string, bundler?: string }}
 */
export function readPelliculeConfig(cwd) {
  const root = resolve(cwd || process.cwd())
  const pkgPath = join(root, 'package.json')

  if (!existsSync(pkgPath)) return {}

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const config = pkg.pellicule

    if (!config || typeof config !== 'object') return {}

    const result = {}
    if (typeof config.serverUrl === 'string') result.serverUrl = config.serverUrl
    if (typeof config.videosDir === 'string') result.videosDir = resolve(root, config.videosDir)
    if (typeof config.outDir === 'string') result.outDir = resolve(root, config.outDir)
    if (typeof config.bundler === 'string') result.bundler = config.bundler

    return result
  } catch {
    return {}
  }
}

/**
 * Resolve input file path using smart defaults.
 *
 * Resolution order:
 *   1. Exact path (as given)
 *   2. Exact path + .vue extension
 *   3. videosDir + filename
 *   4. videosDir + filename + .vue
 *
 * @param {string} input - User-provided input (e.g., "InvoiceDemo" or "InvoiceDemo.vue")
 * @param {string} videosDir - Conventional videos directory for this project type
 * @returns {{ resolved: string } | { error: string, searched: string[] }}
 */
export function resolveInputFile(input, videosDir) {
  const candidates = []

  // 1. Exact path
  const exact = resolve(input)
  candidates.push(exact)

  // 2. Exact path + .vue
  if (!input.endsWith('.vue')) {
    candidates.push(resolve(input + '.vue'))
  }

  // 3. videosDir + filename
  const inVideosDir = join(videosDir, input.endsWith('.vue') ? input : input + '.vue')
  if (inVideosDir !== exact && inVideosDir !== exact + '.vue') {
    candidates.push(inVideosDir)
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return { resolved: candidate }
    }
  }

  return {
    error: `File not found: ${input}`,
    searched: candidates
  }
}
