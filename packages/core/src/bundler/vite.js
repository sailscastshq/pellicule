import { createServer, loadConfigFromFile, mergeConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { pelliculeMacroVitePlugin } from '../macros/define-video-config.js'
import { writeTempEntry } from './entry.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pelliculeSrc = resolve(__dirname, '..')

/**
 * @typedef {import('net').AddressInfo} AddressInfo
 * @typedef {import('vite').InlineConfig} InlineConfig
 * @typedef {import('vite').PluginOption} VitePluginOption
 * @typedef {import('../types.js').BundlerServerResult} BundlerServerResult
 * @typedef {import('../types.js').BundlerServerOptions} BundlerServerOptions
 */

/**
 * Creates a Vite dev server for rendering a video component.
 *
 * When a configFile is provided, Pellicule loads the user's existing
 * vite.config.js and deep-merges it with its own required config.
 * This means aliases, plugins, and settings from the user's project
 * are automatically available inside video components.
 *
 * @param {BundlerServerOptions} options
 * @returns {Promise<BundlerServerResult>}
 */
export async function createVideoServer(options) {
  const { input, width = 1920, height = 1080, configFile = null, preview = false, fps = 30, durationInFrames = 90, version = '' } = options

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

  // Resolve Vue from the user's project to avoid duplicate Vue runtimes.
  // Without this, pellicule's source files (physically in the pellicule repo)
  // would resolve 'vue' from their own node_modules — different instance
  // than the project's Vue, which breaks provide/inject silently.
  const projectRequire = createRequire(resolve(process.cwd(), 'package.json'))
  /** @type {string | undefined} */
  let vueAlias
  try {
    vueAlias = projectRequire.resolve('vue')
  } catch {
    // If vue can't be resolved from project, let Vite handle it naturally
  }

  /** @type {Record<string, string>} */
  const aliases = {
    'pellicule': pelliculeSrc
  }
  if (vueAlias) aliases['vue'] = vueAlias

  // When the user has a vite.config.js, they already have vue() in their
  // plugins. Adding ours too causes a duplicate plugin conflict — the second
  // vue() sees already-transformed output and fails. So we only add vue()
  // when there's no user config (standalone pellicule rendering).
  /** @type {InlineConfig} */
  let finalConfig

  if (configFile) {
    /** @type {Awaited<ReturnType<typeof loadConfigFromFile>> | null} */
    let loaded = null
    try {
      loaded = await loadConfigFromFile(
        { command: 'serve', mode: 'development' },
        configFile
      )
    } catch {
      // Config file exists but can't be loaded (e.g. Quasar's #q-app/wrappers).
      // Fall through to the fallback path below.
    }

    /** @type {InlineConfig} */
    const pelliculeConfig = {
      root: tempDir,
      plugins: /** @type {VitePluginOption[]} */ ([pelliculeMacroVitePlugin()]),
      server: { port: 0, strictPort: false },
      resolve: { alias: aliases },
      logLevel: 'warn'
    }

    if (loaded?.config) {
      // Strip plugins that assume the original project root and break when
      // Pellicule changes root to its temp directory. Currently this affects
      // laravel-vite-plugin which configures base/publicDir/HMR relative to
      // the Laravel project root.
      if (loaded.config.plugins) {
        const conflicting = new Set(['laravel', 'vite-plugin-full-reload'])
        const loadedPlugins = /** @type {any[]} */ (loaded.config.plugins)
        loaded.config.plugins = /** @type {VitePluginOption[]} */ (loadedPlugins
          .flat(Infinity)
          .filter((plugin) => !(
            plugin &&
            typeof plugin === 'object' &&
            'name' in plugin &&
            typeof plugin.name === 'string' &&
            conflicting.has(plugin.name)
          )))
      }
      finalConfig = /** @type {InlineConfig} */ (mergeConfig(loaded.config, pelliculeConfig))
    } else {
      // Config file existed but failed to load — add vue() as fallback
      pelliculeConfig.plugins = [
        ...(pelliculeConfig.plugins || []),
        vue()
      ]
      finalConfig = pelliculeConfig
    }
  } else {
    // No user config — pellicule provides everything including vue()
    /** @type {InlineConfig} */
    finalConfig = {
      root: tempDir,
      plugins: [pelliculeMacroVitePlugin(), vue()],
      server: { port: 0, strictPort: false },
      resolve: { alias: aliases },
      logLevel: 'warn'
    }
  }

  const server = await createServer(finalConfig)
  await server.listen()

  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') {
    throw new Error('Vite server did not expose a numeric port')
  }

  const url = `http://localhost:${address.port}`

  const cleanup = async () => {
    await server.close()
    await cleanupTemp()
  }

  return { server, url, cleanup, tempDir }
}
