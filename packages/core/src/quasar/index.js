/**
 * pellicule/quasar — Vite plugin for Quasar projects.
 *
 * Usage in quasar.config.js:
 *
 *   build: {
 *     vitePlugins: [
 *       ['pellicule/quasar']
 *     ]
 *   }
 *
 * This plugin does two things:
 *
 * 1. Strips defineVideoConfig() calls (the compile-time macro) so they
 *    don't error at runtime.
 *
 * 2. Serves a /pellicule render page via Vite's configureServer hook.
 *    The page creates a Vue app with Quasar installed, dynamically imports
 *    the requested video component, and exposes __PELLICULE_READY__ /
 *    __PELLICULE_SET_FRAME__ for Playwright to drive frame-by-frame.
 *
 * Because the page is served by the same Vite dev server that Quasar uses,
 * all of Quasar's aliases (src/, etc.), plugins, and pre-bundled deps are
 * available. Quasar UI components (QBtn, QCard, etc.) work because the
 * page installs Quasar via app.use(Quasar).
 */

import { pelliculeMacroVitePlugin } from '../macros/define-video-config.js'

export default function pelliculeQuasar() {
  return [
    pelliculeMacroVitePlugin(),
    pelliculeQuasarServerPlugin()
  ]
}

function pelliculeQuasarServerPlugin() {
  return {
    name: 'pellicule:quasar-server',

    configureServer(server) {
      // Add middleware directly (not via returned function) so it runs
      // BEFORE Quasar's catch-all SPA middleware that would otherwise
      // intercept /pellicule and serve the main app's index.html.
      server.middlewares.use((req, res, next) => {
        // Parse the URL — req.url may include query string
        const parsed = new URL(req.url, 'http://localhost')
        if (parsed.pathname !== '/pellicule') return next()

        const component = parsed.searchParams.get('component')
        const fps = parsed.searchParams.get('fps') || '30'
        const duration = parsed.searchParams.get('duration') || '90'
        const width = parsed.searchParams.get('width') || '1920'
        const height = parsed.searchParams.get('height') || '1080'

        const html = generateRenderPage({ component, fps, duration, width, height })

        // Transform through Vite so module imports resolve and HMR client is injected
        server.transformIndexHtml(req.url, html).then(transformed => {
          res.setHeader('Content-Type', 'text/html')
          res.statusCode = 200
          res.end(transformed)
        }).catch(err => {
          next(err)
        })
      })
    }
  }
}

function generateRenderPage({ component, fps, duration, width, height }) {
  // Inline the values into the HTML so the page doesn't need to parse
  // the URL again. Values are sanitized through parseInt/JSON.stringify.
  const safeComponent = component ? JSON.stringify(component) : 'null'

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${parseInt(width)}px; height: ${parseInt(height)}px; overflow: hidden; }
    #pellicule-app { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="pellicule-app"></div>
  <script type="module">
    import { createApp, ref, nextTick, provide, h } from 'vue'
    import { Quasar } from 'quasar'
    import 'quasar/dist/quasar.css'
    import { buildVideoConfigUrl, haveVideoConfigChanged, parseVideoConfigFromSearch, resolveVideoConfig } from 'pellicule/runtime/config'
    import { setupPreviewOverlay } from 'pellicule/runtime/preview'
    import { waitForRenderReady } from 'pellicule/runtime/ready'

    const componentName = ${safeComponent}
    const params = new URLSearchParams(window.location.search)
    const isPreview = params.get('preview') === '1'
    const rawAudioDurationInSeconds = params.get('audio-duration')
    const audioDurationInSeconds = rawAudioDurationInSeconds
      ? Number(rawAudioDurationInSeconds)
      : null
    const allowPreviewConfigSync = isPreview && params.get('config-refresh') === '1'
    const config = parseVideoConfigFromSearch(window.location.search, {
      fps: ${parseInt(fps)},
      durationInFrames: ${parseInt(duration)},
      width: ${parseInt(width)},
      height: ${parseInt(height)}
    })

    if (!componentName) {
      window.__PELLICULE_ERROR__ = 'Missing ?component= query parameter'
      window.__PELLICULE_READY__ = true
    } else {
      try {
        const mod = await import(/* @vite-ignore */ '/src/videos/' + componentName + '.vue')
        const VideoComponent = mod.default

        const frameRef = ref(0)
        let pendingReload = false

        window.__PELLICULE_COMPONENT_CONFIG__ = null
        window.__PELLICULE_ON_CONFIG__ = (componentConfig) => {
          if (!allowPreviewConfigSync || pendingReload) {
            return
          }

          const nextConfig = resolveVideoConfig(config, {
            ...componentConfig,
            ...(Number.isFinite(audioDurationInSeconds) && audioDurationInSeconds > 0
              ? { audioDurationInSeconds }
              : {})
          })
          if (!haveVideoConfigChanged(config, nextConfig)) {
            return
          }

          pendingReload = true
          window.location.replace(buildVideoConfigUrl(window.location.href, nextConfig))
        }

        const app = createApp({
          setup() {
            provide(Symbol.for('pellicule-frame'), frameRef)
            provide(Symbol.for('pellicule-config'), config)
            return () => h(VideoComponent)
          }
        })

        app.use(Quasar, {})
        app.mount('#pellicule-app')

        if (!pendingReload) {
          window.__PELLICULE_SET_FRAME__ = async (frame) => {
            frameRef.value = frame
            await nextTick()
            await waitForRenderReady()
          }

          if (isPreview) {
            setupPreviewOverlay({
              setFrame: window.__PELLICULE_SET_FRAME__
            })
          }

          await nextTick()
          await waitForRenderReady()
          window.__PELLICULE_READY__ = true
        }
      } catch (err) {
        window.__PELLICULE_ERROR__ = err.message
        console.error('Pellicule render error:', err)
        window.__PELLICULE_READY__ = true
      }
    }
  </script>
</body>
</html>`
}
