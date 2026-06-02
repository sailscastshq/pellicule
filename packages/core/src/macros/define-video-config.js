/**
 * defineVideoConfig - Compile-time macro for video configuration
 *
 * This module provides:
 * 1. extractVideoConfig() - CLI uses this to read config from .vue files
 * 2. pelliculeMacroVitePlugin() - Vite plugin that strips the macro from output
 *
 * Usage in components (no import needed):
 *
 *   defineVideoConfig({
 *     durationInSeconds: 5
 *   })
 */

import { readFileSync } from 'fs'

/**
 * @typedef {import('../types.js').CliVideoConfigFlags} CliVideoConfigFlags
 * @typedef {import('../types.js').VideoConfig} VideoConfig
 * @typedef {import('../types.js').VideoConfigInput} VideoConfigInput
 * @typedef {import('../types.js').VideoConfigLiteral} VideoConfigLiteral
 */

const DEFINE_VIDEO_CONFIG_RUNTIME = `((config) => {
  if (typeof globalThis === 'undefined') return
  globalThis.__PELLICULE_COMPONENT_CONFIG__ = config
  if (typeof globalThis.__PELLICULE_ON_CONFIG__ === 'function') {
    globalThis.__PELLICULE_ON_CONFIG__(config)
  }
})`

// ============================================================================
// Config Extraction (for CLI)
// ============================================================================

/**
 * Extract video config from a .vue file.
 *
 * @param {string} filePath
 * @returns {VideoConfigLiteral | null}
 */
export function extractVideoConfig(filePath) {
  const source = readFileSync(filePath, 'utf-8')
  return extractVideoConfigFromSource(source)
}

/**
 * Extract video config from Vue SFC source code.
 *
 * @param {string} source
 * @returns {VideoConfigLiteral | null}
 */
export function extractVideoConfigFromSource(source) {
  // Extract <script setup> content with a regex instead of pulling in
  // the full @vue/compiler-sfc parser. The block can't nest, so this
  // is reliable and avoids a heavy dependency.
  const scriptSetupMatch = source.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/)
  if (!scriptSetupMatch) return null

  const match = scriptSetupMatch[1].match(/defineVideoConfig\s*\(\s*(\{[\s\S]*?\})\s*\)/)
  if (!match) return null

  try {
    return parseObjectLiteral(match[1])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Failed to parse defineVideoConfig: ${message}`)
    return null
  }
}

/**
 * Parse a static object literal string.
 *
 * @param {string} str
 * @returns {VideoConfigLiteral}
 */
function parseObjectLiteral(str) {
  const trimmed = str.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    throw new Error('Not an object literal')
  }

  /** @type {Record<string, string | number | boolean | undefined>} */
  const config = {}
  const regex = /(\w+)\s*:\s*(-?\d+(?:\.\d+)?|true|false|'[^']*'|"[^"]*")/g
  let match

  while ((match = regex.exec(trimmed)) !== null) {
    const key = match[1]
    const rawValue = match[2]
    /** @type {string | number | boolean} */
    let value

    if (rawValue === 'true') value = true
    else if (rawValue === 'false') value = false
    else if (rawValue.startsWith("'") || rawValue.startsWith('"')) value = rawValue.slice(1, -1)
    else value = parseFloat(rawValue)

    config[key] = value
  }

  return /** @type {VideoConfigLiteral} */ (config)
}

/**
 * Resolve final config: defaults < defineVideoConfig < CLI flags
 *
 * @param {{ componentConfig?: VideoConfigInput | null, cliFlags?: CliVideoConfigFlags }} options
 * @returns {VideoConfig}
 */
export function resolveVideoConfig({ componentConfig, cliFlags }) {
  /** @type {VideoConfig} */
  const defaults = { fps: 30, width: 1920, height: 1080, durationInFrames: 90 }
  /** @type {VideoConfig} */
  const config = { ...defaults }

  if (componentConfig) {
    if (componentConfig.durationInSeconds !== undefined) {
      const fps = componentConfig.fps || config.fps
      config.durationInFrames = Math.round(componentConfig.durationInSeconds * fps)
    }
    if (componentConfig.durationInFrames !== undefined) config.durationInFrames = componentConfig.durationInFrames
    if (componentConfig.fps !== undefined) config.fps = componentConfig.fps
    if (componentConfig.width !== undefined) config.width = componentConfig.width
    if (componentConfig.height !== undefined) config.height = componentConfig.height
  }

  if (cliFlags.duration !== undefined) config.durationInFrames = cliFlags.duration
  if (cliFlags.fps !== undefined) config.fps = cliFlags.fps
  if (cliFlags.width !== undefined) config.width = cliFlags.width
  if (cliFlags.height !== undefined) config.height = cliFlags.height

  return config
}

// ============================================================================
// Shared Transform (bundler-agnostic)
// ============================================================================

/**
 * Remove mistaken defineVideoConfig imports from source code.
 *
 * The macro call itself is preserved and replaced at compile time via
 * Vite/Rsbuild `define`, which lets Pellicule observe config changes
 * during dev HMR without requiring an import.
 *
 * @param {string} code - Source code (typically a .vue file)
 * @returns {string|null} Transformed code, or null if unchanged
 */
export function stripDefineVideoConfig(code) {
  if (!code.includes('defineVideoConfig')) {
    return null
  }

  let transformed = code

  // Remove import of defineVideoConfig (in case user mistakenly imports it)
  transformed = transformed.replace(
    /import\s*\{[^}]*defineVideoConfig[^}]*\}\s*from\s*['"]pellicule['"]\s*;?\n?/g,
    (match) => {
      const other = match
        .replace(/defineVideoConfig\s*,?\s*/g, '')
        .replace(/,\s*\}/g, '}')
        .replace(/\{\s*,/g, '{')
        .replace(/\{\s*\}/g, '')
      return other.includes('{') && !other.match(/\{\s*\}/) ? other : ''
    }
  )

  return transformed !== code ? transformed : null
}

// ============================================================================
// Vite Plugin (strips macro from compiled output)
// ============================================================================

/**
 * Vite plugin that strips defineVideoConfig() calls.
 * Runs before Vue's compiler (enforce: 'pre').
 *
 * @returns {import('vite').Plugin}
 */
export function pelliculeMacroVitePlugin() {
  return {
    name: 'pellicule:define-video-config',
    enforce: 'pre',

    config() {
      return {
        define: {
          defineVideoConfig: DEFINE_VIDEO_CONFIG_RUNTIME
        }
      }
    },

    transform(code, id) {
      if (!id.endsWith('.vue')) return null

      const result = stripDefineVideoConfig(code)
      return result !== null ? { code: result, map: null } : null
    }
  }
}

// ============================================================================
// Rsbuild Plugin (strips macro from compiled output)
// ============================================================================

/**
 * Rsbuild plugin that strips defineVideoConfig() calls.
 *
 * Rsbuild's api.transform() runs AFTER built-in loaders, which means
 * vue-loader has already compiled the <script setup> block by the time
 * our transform runs. The raw .vue source is split into sub-modules
 * and our regex may never see the actual defineVideoConfig() call.
 *
 * To handle this reliably, we use source.define to replace the
 * defineVideoConfig identifier with a no-op function at compile time
 * via Rspack's DefinePlugin. This runs during Rspack's compilation
 * phase (after all loaders) and replaces free identifiers in the AST.
 *
 * The api.transform() is kept as a belt-and-suspenders measure —
 * if it manages to strip the call from the raw source, even better.
 *
 * @returns {object}
 */
export function pelliculeMacroRsbuildPlugin() {
  return {
    name: 'pellicule:define-video-config',
    setup(api) {
      // Define defineVideoConfig as a compile-time no-op.
      // This ensures the macro call doesn't crash at runtime
      // regardless of loader ordering.
      api.modifyRsbuildConfig((config) => {
        config.source = config.source || {}
        config.source.define = config.source.define || {}
        config.source.define.defineVideoConfig = DEFINE_VIDEO_CONFIG_RUNTIME
      })

      // Also attempt to strip the call from .vue source directly.
      api.transform({ test: /\.vue$/ }, ({ code }) => {
        const result = stripDefineVideoConfig(code)
        return result !== null ? result : code
      })
    }
  }
}
