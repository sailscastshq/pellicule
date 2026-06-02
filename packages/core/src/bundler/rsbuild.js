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
 * @typedef {import('../types.js').BundlerServerResult} BundlerServerResult
 * @typedef {import('../types.js').BundlerServerOptions} BundlerServerOptions
 */

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
  // @ts-expect-error Rsbuild is an optional peer dependency and may not be installed in this workspace.
  const { loadConfig } = await import('@rsbuild/core')
  const { content } = await loadConfig({ cwd: dirname(configFile) })
  return content || {}
}

/**
 * Creates an Rsbuild dev server for rendering a video component.
 *
 * @param {BundlerServerOptions} options
 * @returns {Promise<BundlerServerResult>}
 */
export async function createVideoServer(options) {
  const {
    input,
    width = 1920,
    height = 1080,
    configFile = null,
    projectType = 'rsbuild',
    preview = false,
    fps = 30,
    durationInFrames = 90,
    version = ''
  } = options

  // Resolve Rsbuild from the user's project (not from pellicule's location).
  // This is necessary because pellicule may be symlinked, and ESM import()
  // resolves relative to the file's physical location, not the project root.
  const projectRequire = createRequire(resolve(process.cwd(), 'package.json'))

  /** @type {((options: { rsbuildConfig: object }) => Promise<any>) | undefined} */
  let createRsbuild
  /** @type {((base: object, extra: object) => object) | undefined} */
  let mergeRsbuildConfig
  try {
    const rsbuildCorePath = projectRequire.resolve('@rsbuild/core')
    const rsbuildCore = await import(rsbuildCorePath)
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
    height,
    preview,
    fps,
    durationInFrames,
    version
  })

  // Load @rsbuild/plugin-vue (also resolved from user's project)
  /** @type {(() => any) | undefined} */
  let pluginVue
  try {
    const pluginVuePath = projectRequire.resolve('@rsbuild/plugin-vue')
    const mod = await import(pluginVuePath)
    pluginVue = mod.pluginVue
  } catch {
    throw new Error(
      '@rsbuild/plugin-vue is required for Rsbuild projects.\n' +
      'Install it with: npm install -D @rsbuild/plugin-vue'
    )
  }

  if (!createRsbuild || !pluginVue) {
    throw new Error('Rsbuild helpers were not loaded correctly')
  }

  // Build resolve.alias — always alias 'pellicule' to the local source.
  // Also alias 'vue' to the project's Vue to avoid duplicate Vue runtimes.
  // Without this, pellicule's source files (physically located in the pellicule
  // repo) would resolve 'vue' from their own node_modules, while the project's
  // entry code resolves 'vue' from the project's node_modules — two different
  // Vue instances means provide/inject breaks silently.
  // For Shipwright projects, also add the conventional ~ and @ aliases
  // that sails-hook-shipwright normally injects at runtime.
  /** @type {Record<string, string>} */
  const aliases = {
    'pellicule': pelliculeSrc,
    'vue': projectRequire.resolve('vue')
  }

  if (projectType === 'shipwright') {
    const cwd = process.cwd()
    aliases['@'] = resolve(cwd, 'assets', 'js')
    aliases['~'] = resolve(cwd, 'assets')
  }

  // Pellicule's required Rsbuild config
  // logLevel: 'error' suppresses Rsbuild's "start build started..." and
  // "ready built in X s" messages. Pellicule has its own progress display.
  // Note: rsbuild.logger is NOT exposed on the createRsbuild() return object,
  // so logger.override() doesn't work. logLevel is the config-level equivalent.
  const pelliculeConfig = {
    source: {
      entry: {
        index: resolve(tempDir, 'entry.js')
      }
    },
    resolve: {
      alias: aliases
    },
    html: {
      template: resolve(tempDir, 'index.html')
    },
    plugins: [pelliculeMacroRsbuildPlugin(), pluginVue()],
    server: {
      strictPort: false,
      printUrls: false
    },
    dev: {
      writeToDisk: false
    },
    logLevel: 'error'
  }

  let finalConfig = pelliculeConfig

  const rsbuildProjectType = projectType === 'shipwright' ? 'shipwright' : 'rsbuild'

  // If the user has a config file, load and merge it
  if (configFile) {
    const userConfig = await loadUserConfig(configFile, rsbuildProjectType)

    if (userConfig && Object.keys(userConfig).length > 0) {
      // User config is the base, Pellicule config merges on top
      finalConfig = mergeRsbuildConfig
        ? mergeRsbuildConfig(userConfig, pelliculeConfig)
        : pelliculeConfig
    }
  }

  const rsbuild = await createRsbuild({ rsbuildConfig: finalConfig })

  const devServer = await rsbuild.createDevServer()
  const { port } = await devServer.listen()

  const url = `http://localhost:${port}`

  const cleanup = async () => {
    await devServer.close()
    await cleanupTemp()
  }

  return { server: devServer, url, cleanup, tempDir }
}
