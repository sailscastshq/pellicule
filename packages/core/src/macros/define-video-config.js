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
import { parse as parseScript } from '@babel/parser'
import { parse as parseSfc } from '@vue/compiler-sfc'

/**
 * @typedef {import('../types.js').CliVideoConfigFlags} CliVideoConfigFlags
 * @typedef {import('../types.js').VideoConfig} VideoConfig
 * @typedef {import('../types.js').VideoConfigInput} VideoConfigInput
 * @typedef {import('../types.js').VideoConfigLiteral} VideoConfigLiteral
 * @typedef {string|number|boolean|null} StaticConfigPrimitive
 * @typedef {StaticConfigPrimitive | Record<string, unknown> | unknown[]} StaticConfigValue
 * @typedef {Record<string, unknown>} StaticConfigObject
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

export class DefineVideoConfigParseError extends Error {
  /**
   * @param {string} message
   * @param {{ filename?: string, line?: number|null, column?: number|null, hint?: string }} [options]
   */
  constructor(message, options = {}) {
    const { filename, line = null, column = null, hint } = options
    const location = filename && line !== null && column !== null
      ? `${filename}:${line}:${column}`
      : filename || null
    const suffix = hint ? ` Hint: ${hint}` : ''
    super(location ? `${location} ${message}${suffix}` : `${message}${suffix}`)
    this.name = 'DefineVideoConfigParseError'
  }
}

/**
 * @param {string} source
 * @param {number} offset
 * @returns {{ line: number, column: number }}
 */
function offsetToLineColumn(source, offset) {
  const safeOffset = Math.max(0, Math.min(offset, source.length))
  let line = 1
  let lastLineStart = 0

  for (let index = 0; index < safeOffset; index++) {
    if (source[index] === '\n') {
      line += 1
      lastLineStart = index + 1
    }
  }

  return {
    line,
    column: safeOffset - lastLineStart + 1
  }
}

/**
 * @param {{ filename: string, source: string, contentStartOffset: number }} context
 * @param {string} message
 * @param {{ start?: number|null } | undefined} node
 * @param {string} [hint]
 * @returns {DefineVideoConfigParseError}
 */
function createParseError(context, message, node, hint) {
  const relativeOffset = typeof node?.start === 'number' ? node.start : 0
  const { line, column } = offsetToLineColumn(context.source, context.contentStartOffset + relativeOffset)
  return new DefineVideoConfigParseError(message, {
    filename: context.filename,
    line,
    column,
    hint
  })
}

/**
 * @param {string|null|undefined} lang
 * @returns {import('@babel/parser').ParserPlugin[]}
 */
function getScriptParserPlugins(lang) {
  /** @type {import('@babel/parser').ParserPlugin[]} */
  const plugins = ['importAttributes']

  if (lang === 'ts' || lang === 'tsx') {
    plugins.push('typescript')
  }

  if (lang === 'jsx' || lang === 'tsx') {
    plugins.push('jsx')
  }

  return plugins
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, any>}
 */
function isAstNode(value) {
  return !!value && typeof value === 'object' && typeof /** @type {{ type?: unknown }} */ (value).type === 'string'
}

/**
 * @param {unknown} expression
 * @returns {expression is Record<string, any>}
 */
function isDefineVideoConfigCall(expression) {
  return isAstNode(expression)
    && expression.type === 'CallExpression'
    && isAstNode(expression.callee)
    && expression.callee.type === 'Identifier'
    && expression.callee.name === 'defineVideoConfig'
    && Array.isArray(expression.arguments)
}

/**
 * @param {unknown} expression
 * @returns {Record<string, any> | null}
 */
function unwrapDefineVideoConfigCall(expression) {
  if (isDefineVideoConfigCall(expression)) {
    return expression
  }

  if (!isAstNode(expression)) {
    return null
  }

  if (
    expression.type === 'ParenthesizedExpression' ||
    expression.type === 'TSAsExpression' ||
    expression.type === 'TSSatisfiesExpression' ||
    expression.type === 'TSNonNullExpression'
  ) {
    return unwrapDefineVideoConfigCall(expression.expression)
  }

  return null
}

/**
 * @param {{ body: unknown[] }} program
 * @returns {Array<any>}
 */
function collectDefineVideoConfigCalls(program) {
  /** @type {Array<any>} */
  const calls = []

  for (const statement of program.body) {
    if (!isAstNode(statement)) {
      continue
    }

    if (statement.type === 'ExpressionStatement') {
      const call = unwrapDefineVideoConfigCall(statement.expression)
      if (call) calls.push(call)
      continue
    }

    if (statement.type === 'VariableDeclaration') {
      for (const declaration of statement.declarations) {
        const call = unwrapDefineVideoConfigCall(declaration.init)
        if (call) calls.push(call)
      }
      continue
    }

    if (statement.type === 'ExportDefaultDeclaration') {
      const call = unwrapDefineVideoConfigCall(statement.declaration)
      if (call) calls.push(call)
    }
  }

  return calls
}

/**
 * @param {unknown} keyNode
 * @param {{ filename: string, source: string, contentStartOffset: number }} context
 * @returns {string}
  */
function evaluateObjectKey(keyNode, context) {
  if (!isAstNode(keyNode)) {
    throw createParseError(context, 'defineVideoConfig() object keys must be static.', undefined)
  }

  if (keyNode.type === 'Identifier') {
    return keyNode.name
  }

  if (keyNode.type === 'StringLiteral' || keyNode.type === 'NumericLiteral') {
    return String(keyNode.value)
  }

  if (keyNode.type === 'TemplateLiteral' && keyNode.expressions.length === 0) {
    return keyNode.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('')
  }

  throw createParseError(
    context,
    'defineVideoConfig() object keys must be plain identifiers or static strings.',
    keyNode,
    'Avoid computed keys and expressions in the macro payload.'
  )
}

/**
 * @param {unknown} node
 * @param {{ filename: string, source: string, contentStartOffset: number }} context
 * @returns {StaticConfigValue}
 */
function evaluateStaticNode(node, context) {
  if (!isAstNode(node)) {
    throw createParseError(context, 'defineVideoConfig() contains an unsupported value.', undefined)
  }

  if (
    node.type === 'ParenthesizedExpression' ||
    node.type === 'TSAsExpression' ||
    node.type === 'TSSatisfiesExpression' ||
    node.type === 'TSNonNullExpression'
  ) {
    return evaluateStaticNode(node.expression, context)
  }

  switch (node.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
      return node.value

    case 'NullLiteral':
      return null

    case 'TemplateLiteral':
      if (node.expressions.length > 0) {
        throw createParseError(
          context,
          'defineVideoConfig() template strings must be fully static.',
          node,
          'Replace interpolated templates with a plain string literal.'
        )
      }
      return node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('')

    case 'UnaryExpression':
      if ((node.operator === '-' || node.operator === '+') && isAstNode(node.argument) && node.argument.type === 'NumericLiteral') {
        return node.operator === '-' ? -node.argument.value : node.argument.value
      }
      throw createParseError(
        context,
        `defineVideoConfig() does not support the unary operator "${node.operator}".`,
        node,
        'Use plain static numbers, strings, booleans, null, arrays, or object literals.'
      )

    case 'ArrayExpression':
      return node.elements.map((element) => {
        if (element === null) {
          throw createParseError(
            context,
            'defineVideoConfig() arrays cannot contain holes.',
            node,
            'Provide an explicit value for every array entry.'
          )
        }

        if (isAstNode(element) && element.type === 'SpreadElement') {
          throw createParseError(
            context,
            'defineVideoConfig() does not support spread syntax inside arrays.',
            element,
            'Expand the array to explicit static values.'
          )
        }

        return evaluateStaticNode(element, context)
      })

    case 'ObjectExpression': {
      /** @type {StaticConfigObject} */
      const value = {}

      for (const property of node.properties) {
        if (!isAstNode(property)) {
          throw createParseError(context, 'defineVideoConfig() contains an unsupported object property.', node)
        }

        if (property.type === 'SpreadElement') {
          throw createParseError(
            context,
            'defineVideoConfig() does not support spread syntax inside objects.',
            property,
            'Write out each property explicitly so the config stays static.'
          )
        }

        if (property.type !== 'ObjectProperty') {
          throw createParseError(
            context,
            'defineVideoConfig() only supports plain object properties.',
            property,
            'Remove methods, getters, and setters from the macro payload.'
          )
        }

        if (property.computed) {
          throw createParseError(
            context,
            'defineVideoConfig() does not support computed property keys.',
            property,
            'Use plain identifiers or quoted string keys instead.'
          )
        }

        const key = evaluateObjectKey(property.key, context)
        value[key] = evaluateStaticNode(property.value, context)
      }

      return value
    }

    default:
      throw createParseError(
        context,
        `defineVideoConfig() does not support ${node.type} values.`,
        node,
        'Use only static strings, numbers, booleans, null, arrays, and object literals.'
      )
  }
}

/**
 * Extract video config from a .vue file.
 *
 * @param {string} filePath
 * @returns {VideoConfigLiteral | null}
 */
export function extractVideoConfig(filePath) {
  const source = readFileSync(filePath, 'utf-8')
  return extractVideoConfigFromSource(source, { filename: filePath })
}

/**
 * Extract video config from Vue SFC source code.
 *
 * @param {string} source
 * @param {{ filename?: string }} [options]
 * @returns {VideoConfigLiteral | null}
 */
export function extractVideoConfigFromSource(source, options = {}) {
  const filename = options.filename || 'Video.vue'
  const { descriptor, errors } = parseSfc(source, { filename })

  if (errors.length > 0) {
    const firstError = errors[0]
    const message = firstError instanceof Error ? firstError.message : String(firstError)
    throw new DefineVideoConfigParseError(`Failed to parse Vue component. ${message}`, { filename })
  }

  const scriptSetup = descriptor.scriptSetup
  if (!scriptSetup) {
    return null
  }

  const contentStartOffset = source.indexOf(scriptSetup.content, scriptSetup.loc.start.offset)
  const context = {
    filename,
    source,
    contentStartOffset: contentStartOffset >= 0 ? contentStartOffset : scriptSetup.loc.start.offset
  }

  let scriptAst
  try {
    scriptAst = parseScript(scriptSetup.content, {
      sourceType: 'module',
      plugins: getScriptParserPlugins(scriptSetup.lang)
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new DefineVideoConfigParseError(`Failed to parse <script setup>. ${message}`, { filename })
  }

  const calls = collectDefineVideoConfigCalls(scriptAst.program)
  if (calls.length === 0) {
    return null
  }

  if (calls.length > 1) {
    throw createParseError(
      context,
      'defineVideoConfig() can only be called once per component.',
      calls[1],
      'Keep a single top-level macro call and merge the config into one object.'
    )
  }

  const [call] = calls
  if (call.arguments.length !== 1) {
    throw createParseError(
      context,
      'defineVideoConfig() expects exactly one argument.',
      call,
      'Pass a single static object literal to the macro.'
    )
  }

  const value = evaluateStaticNode(call.arguments[0], context)
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw createParseError(
      context,
      'defineVideoConfig() expects a static object literal.',
      call.arguments[0],
      'Wrap the config in `{}` and keep every value static.'
    )
  }

  return /** @type {VideoConfigLiteral} */ (value)
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
