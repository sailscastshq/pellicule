import { createServer, loadConfigFromFile, mergeConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pelliculeMacroVitePlugin } from '../macros/define-video-config.js'
import { writeTempEntry } from './entry.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pelliculeSrc = resolve(__dirname, '..')

/**
 * Creates a Vite dev server for rendering a video component.
 *
 * When a configFile is provided, Pellicule loads the user's existing
 * vite.config.js and deep-merges it with its own required config.
 * This means aliases, plugins, and settings from the user's project
 * are automatically available inside video components.
 *
 * @param {object} options
 * @param {string} options.input - Absolute path to the .vue file
 * @param {number} options.width - Video width
 * @param {number} options.height - Video height
 * @param {string|null} [options.configFile] - Path to the user's vite.config.js (auto-detected or explicit)
 * @returns {Promise<{ server: object, url: string, cleanup: function, tempDir: string }>}
 */
export async function createVideoServer(options) {
  const { input, width = 1920, height = 1080, configFile = null } = options

  const inputPath = resolve(input)

  // Write the shared entry scaffold (.pellicule/index.html + entry.js)
  const { tempDir, cleanup: cleanupTemp } = await writeTempEntry({
    inputPath,
    width,
    height
  })

  // Pellicule's required config — these must always be present
  const pelliculeConfig = {
    root: tempDir,
    plugins: [pelliculeMacroVitePlugin(), vue()],
    server: {
      port: 0,
      strictPort: false
    },
    resolve: {
      alias: {
        'pellicule': pelliculeSrc
      }
    },
    logLevel: 'warn'
  }

  let finalConfig = pelliculeConfig

  // If the user has a vite.config.js, load and merge it
  if (configFile) {
    const loaded = await loadConfigFromFile(
      { command: 'serve', mode: 'development' },
      configFile
    )

    if (loaded?.config) {
      // User config is the base, Pellicule config merges on top.
      // This ensures Pellicule's required plugins and aliases always win,
      // while the user's aliases, plugins, and settings are preserved.
      finalConfig = mergeConfig(loaded.config, pelliculeConfig)
    }
  }

  const server = await createServer(finalConfig)
  await server.listen()

  const address = server.httpServer.address()
  const url = `http://localhost:${address.port}`

  const cleanup = async () => {
    await server.close()
    await cleanupTemp()
  }

  return { server, url, cleanup, tempDir }
}
