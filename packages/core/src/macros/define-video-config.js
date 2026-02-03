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

import { parse } from '@vue/compiler-sfc'
import { readFileSync } from 'fs'

// ============================================================================
// Config Extraction (for CLI)
// ============================================================================

/**
 * Extract video config from a .vue file.
 */
export function extractVideoConfig(filePath) {
  const source = readFileSync(filePath, 'utf-8')
  return extractVideoConfigFromSource(source)
}

/**
 * Extract video config from Vue SFC source code.
 */
export function extractVideoConfigFromSource(source) {
  const { descriptor } = parse(source)
  const scriptSetup = descriptor.scriptSetup

  if (!scriptSetup) return null

  const match = scriptSetup.content.match(/defineVideoConfig\s*\(\s*(\{[\s\S]*?\})\s*\)/)
  if (!match) return null

  try {
    return parseObjectLiteral(match[1])
  } catch (error) {
    console.warn(`Failed to parse defineVideoConfig: ${error.message}`)
    return null
  }
}

/**
 * Parse a static object literal string.
 */
function parseObjectLiteral(str) {
  const trimmed = str.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    throw new Error('Not an object literal')
  }

  const config = {}
  const regex = /(\w+)\s*:\s*(-?\d+(?:\.\d+)?|true|false|'[^']*'|"[^"]*")/g
  let match

  while ((match = regex.exec(trimmed)) !== null) {
    const key = match[1]
    let value = match[2]

    if (value === 'true') value = true
    else if (value === 'false') value = false
    else if (value.startsWith("'") || value.startsWith('"')) value = value.slice(1, -1)
    else value = parseFloat(value)

    config[key] = value
  }

  return config
}

/**
 * Resolve final config: defaults < defineVideoConfig < CLI flags
 */
export function resolveVideoConfig({ componentConfig, cliFlags }) {
  const defaults = { fps: 30, width: 1920, height: 1080, durationInFrames: 90 }
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
 * Strip defineVideoConfig() calls and imports from source code.
 *
 * This is the core transform logic used by both the Vite plugin and
 * the Rsbuild plugin. It's pure string manipulation — no bundler APIs.
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

  // Remove the defineVideoConfig() call
  transformed = transformed.replace(
    /defineVideoConfig\s*\(\s*\{[\s\S]*?\}\s*\)\s*;?\n?/g,
    ''
  )

  return transformed !== code ? transformed : null
}

// ============================================================================
// Vite Plugin (strips macro from compiled output)
// ============================================================================

/**
 * Vite plugin that strips defineVideoConfig() calls.
 * Runs before Vue's compiler (enforce: 'pre').
 */
export function pelliculeMacroVitePlugin() {
  return {
    name: 'pellicule:define-video-config',
    enforce: 'pre',

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
 * Uses Rsbuild's api.transform() to process .vue files.
 */
export function pelliculeMacroRsbuildPlugin() {
  return {
    name: 'pellicule:define-video-config',
    setup(api) {
      api.transform({ test: /\.vue$/ }, ({ code }) => {
        const result = stripDefineVideoConfig(code)
        return result !== null ? result : code
      })
    }
  }
}
