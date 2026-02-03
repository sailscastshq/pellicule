/**
 * Rsbuild bundler adapter for Pellicule.
 *
 * Handles two scenarios:
 *   1. Standalone Rsbuild projects (rsbuild.config.js / rsbuild.config.ts)
 *   2. Boring Stack apps (config/shipwright.js → reads the `build` key)
 *
 * This module is lazy-loaded. @rsbuild/core is an optional peer dependency.
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { pelliculeMacroRsbuildPlugin } from '../macros/define-video-config.js'
import { writeTempEntry } from './entry.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pelliculeSrc = resolve(__dirname, '..')

/**
 * Load the user's Rsbuild config from a config file.
 *
 * For Shipwright configs, reads config/shipwright.js and
 * extracts the `build` key (standard Rsbuild config).
 *
 * @param {string} configFile - Absolute path to the config file
 * @param {'rsbuild'|'shipwright'} projectType
 * @returns {Promise<object>} Rsbuild config object
 */
async function loadUserConfig(configFile, projectType) {
  if (projectType === 'shipwright') {
    // Shipwright configs are CommonJS: module.exports.shipwright = { build: { ... } }
    const require = createRequire(import.meta.url)
    const mod = require(configFile)
    return mod?.shipwright?.build || {}
  }

  // Standalone rsbuild.config.js — use Rsbuild's own config loader
  const { loadConfig } = await import('@rsbuild/core')
  const { content } = await loadConfig({ cwd: dirname(configFile) })
  return content || {}
}

/**
 * Creates an Rsbuild dev server for rendering a video component.
 *
 * @param {object} options
 * @param {string} options.input - Absolute path to the .vue file
 * @param {number} options.width - Video width
 * @param {number} options.height - Video height
 * @param {string|null} [options.configFile] - Path to the user's config file
 * @param {'rsbuild'|'shipwright'} [options.projectType] - Which config format to read
 * @returns {Promise<{ server: object, url: string, cleanup: function, tempDir: string }>}
 */
export async function createVideoServer(options) {
  const {
    input,
    width = 1920,
    height = 1080,
    configFile = null,
    projectType = 'rsbuild'
  } = options

  // Ensure @rsbuild/core is available
  let createRsbuild, mergeRsbuildConfig
  try {
    const rsbuildCore = await import('@rsbuild/core')
    createRsbuild = rsbuildCore.createRsbuild
    mergeRsbuildConfig = rsbuildCore.mergeRsbuildConfig
  } catch {
    throw new Error(
      'Rsbuild is required but not installed.\n' +
      'Install it with: npm install -D @rsbuild/core @rsbuild/plugin-vue\n' +
      'Or use --bundler vite to use the Vite adapter instead.'
    )
  }

  const inputPath = resolve(input)

  // Write the shared entry scaffold (.pellicule/index.html + entry.js)
  const { tempDir, cleanup: cleanupTemp } = await writeTempEntry({
    inputPath,
    width,
    height
  })

  // Load @rsbuild/plugin-vue
  let pluginVue
  try {
    const mod = await import('@rsbuild/plugin-vue')
    pluginVue = mod.pluginVue
  } catch {
    throw new Error(
      '@rsbuild/plugin-vue is required for Rsbuild projects.\n' +
      'Install it with: npm install -D @rsbuild/plugin-vue'
    )
  }

  // Pellicule's required Rsbuild config
  const pelliculeConfig = {
    source: {
      entry: {
        index: resolve(tempDir, 'entry.js')
      },
      alias: {
        'pellicule': pelliculeSrc
      }
    },
    html: {
      template: resolve(tempDir, 'index.html')
    },
    plugins: [pelliculeMacroRsbuildPlugin(), pluginVue()],
    server: {
      port: 0,
      strictPort: false
    },
    dev: {
      writeToDisk: false
    }
  }

  let finalConfig = pelliculeConfig

  // If the user has a config file, load and merge it
  if (configFile) {
    const userConfig = await loadUserConfig(configFile, projectType)

    if (userConfig && Object.keys(userConfig).length > 0) {
      // User config is the base, Pellicule config merges on top
      finalConfig = mergeRsbuildConfig(userConfig, pelliculeConfig)
    }
  }

  const rsbuild = await createRsbuild({ rsbuildConfig: finalConfig })
  const devServer = await rsbuild.createDevServer()
  await devServer.listen()

  const url = `http://localhost:${devServer.port}`

  const cleanup = async () => {
    await devServer.close()
    await cleanupTemp()
  }

  return { server: devServer, url, cleanup, tempDir }
}
