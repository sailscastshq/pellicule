#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { resolve, join, extname, basename, dirname } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToMp4 } from '../src/render.js'
import { DefineVideoConfigParseError, extractVideoConfig, resolveVideoConfig } from '../src/macros/define-video-config.js'
import { detectProject, readPelliculeConfig, resolveInputFile } from '../src/config/detect.js'
import { startDevServer } from '../src/dev/server.js'
import {
  DEFAULT_OUTPUT_QUALITY,
  DEFAULT_OUTPUT_PRESET,
  OUTPUT_PRESET_NAMES,
  OUTPUT_QUALITY_NAMES,
  resolveOutputOptions
} from '../src/renderer/encode.js'

/**
 * @typedef {import('../src/types.js').BundlerName} BundlerName
 * @typedef {import('../src/types.js').CliVideoConfigFlags} CliVideoConfigFlags
 * @typedef {import('../src/types.js').DetectedProject} DetectedProject
 * @typedef {import('../src/types.js').InputResolutionFailure} InputResolutionFailure
 * @typedef {import('../src/types.js').InputResolutionSuccess} InputResolutionSuccess
 * @typedef {import('../src/types.js').OutputPresetName} OutputPresetName
 * @typedef {import('../src/types.js').OutputQuality} OutputQuality
 * @typedef {import('../src/types.js').ProjectType} ProjectType
 * @typedef {import('../src/types.js').RenderProgress} RenderProgress
 * @typedef {import('../src/types.js').VideoConfigLiteral} VideoConfigLiteral
 */

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url))
/** @type {{ version: string }} */
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))
const VERSION = pkg.version

// ANSI color codes (no dependencies needed)
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  pellicule: '\x1b[38;2;66;184;131m', // #42b883 - Vue green
  bgPellicule: '\x1b[48;2;66;184;131m'
}

const c = {
  /** @param {string} s */
  error: (s) => `${colors.red}${s}${colors.reset}`,
  /** @param {string} s */
  warn: (s) => `${colors.yellow}${s}${colors.reset}`,
  /** @param {string} s */
  info: (s) => `${colors.cyan}${s}${colors.reset}`,
  /** @param {string} s */
  dim: (s) => `${colors.dim}${s}${colors.reset}`,
  /** @param {string} s */
  bold: (s) => `${colors.bold}${s}${colors.reset}`,
  /** @param {string} s */
  highlight: (s) => `${colors.pellicule}${s}${colors.reset}`,
  /** @param {string} s */
  brand: (s) => `${colors.bgPellicule}${colors.white}${colors.bold}${s}${colors.reset}`
}

/**
 * @param {string} msg
 * @param {string} [hint]
 * @returns {never}
 */
function fail(msg, hint) {
  console.error(c.error(`\nError: ${msg}\n`))
  if (hint) console.error(c.dim(`  ${hint}\n`))
  process.exit(1)
}

const HELP = `
${c.bold('pellicule')} ${c.dim(`v${VERSION}`)} - Render Vue components to video

${c.bold('USAGE')}
  ${c.highlight('pellicule')}                            ${c.dim('→ renders Video.vue to output.mp4')}
  ${c.highlight('pellicule')} <input.vue>                ${c.dim('→ custom input file')}
  ${c.highlight('pellicule')} <input.vue> -o <file>      ${c.dim('→ custom output path')}
  ${c.highlight('pellicule dev')}                        ${c.dim('→ live preview in browser')}
  ${c.highlight('pellicule dev')} <input.vue>            ${c.dim('→ preview a specific component')}

${c.bold('OPTIONS')}
  ${c.info('-o, --output')} <file>     Output file path ${c.dim('(default: ./output.mp4)')}
  ${c.info('--preset')} <name>         Output preset: ${OUTPUT_PRESET_NAMES.join(', ')} ${c.dim(`(default: ${DEFAULT_OUTPUT_PRESET})`)}
  ${c.info('--quality')} <level>       Output quality: ${OUTPUT_QUALITY_NAMES.join(', ')} ${c.dim(`(default: ${DEFAULT_OUTPUT_QUALITY})`)}
  ${c.info('-d, --duration')} <frames> Duration in frames ${c.dim('(default: from component or 90)')}
  ${c.info('-f, --fps')} <number>      Frames per second ${c.dim('(default: from component or 30)')}
  ${c.info('-w, --width')} <pixels>    Video width ${c.dim('(default: from component or 1920)')}
  ${c.info('-h, --height')} <pixels>   Video height ${c.dim('(default: from component or 1080)')}
  ${c.info('-r, --range')} <start:end> Frame range for partial render ${c.dim('(e.g., 100:200)')}
  ${c.info('-a, --audio')} <file>     Audio file to include ${c.dim('(mp3, wav, aac, etc.)')}
  ${c.info('--help')}                 Show this help message
  ${c.info('--version')}               Show version number

${c.bold('INTEGRATION OPTIONS')}
  ${c.info('--server-url')} <url>      Use a running dev server (BYOS mode)
  ${c.info('--bundler')} <name>        Force a bundler: vite or rsbuild
  ${c.info('--config')} <file>         Use a specific config file
  ${c.info('--videos-dir')} <path>     Custom directory for video components
  ${c.info('--out-dir')} <path>        Directory for rendered video output

${c.bold('COMPONENT CONFIG')}
  Use ${c.highlight('defineVideoConfig')} in your component to set defaults:

  ${c.dim('defineVideoConfig({ durationInSeconds: 5 })')}

  No import needed - it's a compiler macro like Vue's defineProps.
  Then just run: ${c.highlight('pellicule')} ${c.dim('(no flags needed!)')}

${c.bold('PROJECT CONFIG')}
  Set options once in package.json instead of passing CLI flags:

  ${c.dim('{ "pellicule": { "serverUrl": "http://localhost:3000" } }')}

  Supported keys: ${c.info('serverUrl')}, ${c.info('videosDir')}, ${c.info('outDir')}, ${c.info('bundler')}
  Resolution: CLI flags > package.json > auto-detected > defaults

${c.bold('AUTO-DETECTION')}
  Pellicule reads your existing config files automatically:
  ${c.dim('vite.config.js')}       → Vite adapter
  ${c.dim('rsbuild.config.js')}    → Rsbuild adapter
  ${c.dim('config/shipwright.js')} → Rsbuild adapter (boring stack)
  ${c.dim('nuxt.config.ts')}       → BYOS mode (defaults to localhost:3000)
  ${c.dim('No config')}            → Built-in Vite (zero config)

${c.bold('EXAMPLES')}
  ${c.dim('# Zero-config (uses defineVideoConfig from component)')}
  ${c.highlight('pellicule')}

  ${c.dim('# Specify input file (.vue extension is optional)')}
  ${c.highlight('pellicule')} MyVideo

  ${c.dim('# Override component config with CLI flags')}
  ${c.highlight('pellicule')} Video.vue -d 150

  ${c.dim('# 4K video at 60fps')}
  ${c.highlight('pellicule')} Video.vue -w 3840 -h 2160 -f 60

  ${c.dim('# Render only frames 100-200 (for faster iteration)')}
  ${c.highlight('pellicule')} Video.vue -r 100:200

  ${c.dim('# Use with Nuxt (auto-detects, connects to localhost:3000)')}
  ${c.highlight('pellicule')} InvoiceDemo

  ${c.dim('# Force Rsbuild bundler')}
  ${c.highlight('pellicule')} Video.vue --bundler rsbuild

  ${c.dim('# Render a WebM for the web')}
  ${c.highlight('pellicule')} Video.vue --preset webm

  ${c.dim('# Pick a higher-quality encode')}
  ${c.highlight('pellicule')} Video.vue --quality high

  ${c.dim('# Live preview with hot-reload (Space to play, arrows to step)')}
  ${c.highlight('pellicule dev')}

  ${c.dim('# Preview a specific component at 720p')}
  ${c.highlight('pellicule dev')} MyVideo -w 1280 -h 720

${c.bold('DURATION HELPER')}
  frames = seconds * fps
  ${c.dim('3 seconds at 30fps  = 90 frames')}
  ${c.dim('5 seconds at 30fps  = 150 frames')}
  ${c.dim('10 seconds at 60fps = 600 frames')}

${c.dim('Documentation: https://docs.sailscasts.com/pellicule')}
`

function printBanner() {
  console.log()
  console.log(`  ${c.brand(' PELLICULE ')} ${c.dim(`v${VERSION}`)}`)
  console.log()
}

/**
 * @param {number} ms
 * @returns {string}
 */
function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`
  const seconds = (ms / 1000).toFixed(1)
  return `${seconds}s`
}

/**
 * @param {number} frame
 * @param {number} total
 * @param {number} fps
 * @returns {string}
 */
function formatProgress(frame, total, fps) {
  const percent = Math.round(((frame + 1) / total) * 100)
  const barWidth = 30
  const filled = Math.round((percent / 100) * barWidth)
  const empty = barWidth - filled
  const bar = c.highlight('█'.repeat(filled)) + c.dim('░'.repeat(empty))
  return `  ${bar} ${c.bold(percent + '%')} ${c.dim(`(${frame + 1}/${total} @ ${fps.toFixed(1)} fps)`)}`
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * @param {string | undefined} value
 * @returns {BundlerName | undefined}
 */
function parseBundlerName(value) {
  if (value === 'vite' || value === 'rsbuild') {
    return value
  }

  return undefined
}

/**
 * @param {string | undefined} value
 * @returns {OutputPresetName | undefined}
 */
function parseOutputPreset(value) {
  if (value && OUTPUT_PRESET_NAMES.some((preset) => preset === value)) {
    return /** @type {OutputPresetName} */ (value)
  }

  return undefined
}

/**
 * @param {string | undefined} value
 * @returns {OutputQuality | undefined}
 */
function parseOutputQuality(value) {
  if (value && OUTPUT_QUALITY_NAMES.some((quality) => quality === value)) {
    return /** @type {OutputQuality} */ (value)
  }

  return undefined
}

/**
 * @param {import('../src/config/detect.js').resolveInputFile extends (...args: any[]) => infer R ? R : never} result
 * @returns {result is InputResolutionFailure}
 */
function isInputResolutionFailure(result) {
  return 'error' in result
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      output: { type: 'string', short: 'o' },
      preset: { type: 'string' },
      quality: { type: 'string' },
      duration: { type: 'string', short: 'd' },
      fps: { type: 'string', short: 'f' },
      width: { type: 'string', short: 'w' },
      height: { type: 'string', short: 'h' },
      range: { type: 'string', short: 'r' },
      audio: { type: 'string', short: 'a' },
      'server-url': { type: 'string' },
      bundler: { type: 'string' },
      config: { type: 'string' },
      'videos-dir': { type: 'string' },
      'out-dir': { type: 'string' },
      help: { type: 'boolean' },
      version: { type: 'boolean' }
    }
  })

  // Handle help and version
  if (values.help) {
    console.log(HELP)
    process.exit(0)
  }

  if (values.version) {
    console.log(VERSION)
    process.exit(0)
  }

  // ── Subcommand detection ─────────────────────────────────────────
  const isDevMode = positionals[0] === 'dev'
  if (isDevMode) positionals.shift()

  // ── Auto-detection ────────────────────────────────────────────────
  const detected = detectProject()
  const pkgConfig = readPelliculeConfig()

  // Resolution: CLI flags > package.json "pellicule" key > auto-detected
  const cliBundler = parseBundlerName(values.bundler)
  const cliPreset = parseOutputPreset(values.preset)
  const cliQuality = parseOutputQuality(values.quality)
  const bundler = cliBundler || pkgConfig.bundler || detected.bundler
  const configFile = values.config ? resolve(values.config) : detected.configFile
  const videosDir = values['videos-dir'] ? resolve(values['videos-dir']) : pkgConfig.videosDir || detected.videosDir
  const outDir = values['out-dir'] ? resolve(values['out-dir']) : pkgConfig.outDir || null
  const serverUrl = values['server-url'] || pkgConfig.serverUrl || detected.defaultServerUrl || null
  const projectType = detected.projectType

  /** @type {Partial<Record<ProjectType, string>>} */
  const projectLabels = {
    laravel: 'Laravel',
    vite: 'Vite',
    rsbuild: 'Rsbuild',
    shipwright: 'Boring Stack (Shipwright)',
    nuxt: 'Nuxt',
    quasar: 'Quasar',
    standalone: 'Standalone'
  }

  // Validate bundler flag
  if (values.bundler && !cliBundler) {
    fail(`Unknown bundler: ${values.bundler}`, 'Supported bundlers: vite, rsbuild')
  }
  if (values.preset && !cliPreset) {
    fail(`Unknown output preset: ${values.preset}`, `Supported presets: ${OUTPUT_PRESET_NAMES.join(', ')}`)
  }
  if (values.quality && !cliQuality) {
    fail(`Unknown output quality: ${values.quality}`, `Supported qualities: ${OUTPUT_QUALITY_NAMES.join(', ')}`)
  }

  // ── Input file resolution ─────────────────────────────────────────
  const input = positionals[0] || 'Video.vue'
  const result = resolveInputFile(input, videosDir)

  if (isInputResolutionFailure(result)) {
    const searchedPaths = result.searched.map((searchedPath) => `  - ${searchedPath}`).join('\n')
    fail(result.error, `Looked in:\n${searchedPaths}`)
  }

  const inputPath = result.resolved

  if (extname(inputPath) !== '.vue') {
    fail(`Input must be a .vue file, got: ${extname(inputPath) || '(no extension)'}`)
  }

  // Extract config from component (if defineVideoConfig is used)
  let componentConfig
  try {
    componentConfig = extractVideoConfig(inputPath)
  } catch (error) {
    if (error instanceof DefineVideoConfigParseError) {
      fail(error.message, 'Keep defineVideoConfig() to one static object literal.')
    }
    throw error
  }

  // Resolve audio file path (CLI flag takes precedence over component config)
  /** @type {string | null} */
  let audioPath = null
  if (values.audio) {
    audioPath = resolve(values.audio)
    if (!existsSync(audioPath)) fail(`Audio file not found: ${values.audio}`)
  } else if (componentConfig?.audio) {
    // Resolve component audio path relative to the component file
    audioPath = resolve(dirname(inputPath), componentConfig.audio)
    if (!existsSync(audioPath)) fail(`Audio file not found: ${componentConfig.audio}`)
  }

  // Build CLI flags object (only include explicitly provided values)
  /** @type {CliVideoConfigFlags} */
  const cliFlags = {}
  if (values.duration !== undefined) cliFlags.duration = parseInt(values.duration, 10)
  if (values.fps !== undefined) cliFlags.fps = parseInt(values.fps, 10)
  if (values.width !== undefined) cliFlags.width = parseInt(values.width, 10)
  if (values.height !== undefined) cliFlags.height = parseInt(values.height, 10)

  // Resolve final config: defaults < componentConfig < cliFlags
  const resolvedConfig = resolveVideoConfig({ componentConfig, cliFlags })

  const fps = resolvedConfig.fps
  const durationInFrames = resolvedConfig.durationInFrames
  const width = resolvedConfig.width
  const height = resolvedConfig.height
  const componentName = basename(inputPath, '.vue')
  let outputBase
  if (values.output) {
    outputBase = values.output
  } else if (outDir) {
    // Use component name as filename when outDir is configured
    outputBase = join(outDir, componentName)
  } else {
    outputBase = './output'
  }
  let resolvedOutput
  try {
    resolvedOutput = resolveOutputOptions({
      output: outputBase,
      preset: cliPreset,
      quality: cliQuality
    })
  } catch (error) {
    fail(getErrorMessage(error))
  }
  const outputPath = resolve(resolvedOutput.output)

  // Parse optional range (start:end format)
  let startFrame = 0
  let endFrame = durationInFrames

  if (values.range) {
    const rangeParts = values.range.split(':')
    if (rangeParts.length !== 2) fail(`Invalid range format: ${values.range}`, 'Expected format: start:end (e.g., 100:200)')
    const [startStr, endStr] = rangeParts
    startFrame = parseInt(startStr, 10)
    endFrame = parseInt(endStr, 10)
    if (isNaN(startFrame) || startFrame < 0) fail(`Invalid start frame in range: ${startStr}`)
    if (isNaN(endFrame) || endFrame <= 0) fail(`Invalid end frame in range: ${endStr}`)
  }

  // Validate resolved config
  if (isNaN(fps) || fps <= 0) fail(`Invalid fps value: ${fps}`)
  if (isNaN(durationInFrames) || durationInFrames <= 0) fail(`Invalid duration value: ${durationInFrames}`)
  if (isNaN(width) || width <= 0) fail(`Invalid width value: ${width}`)
  if (isNaN(height) || height <= 0) fail(`Invalid height value: ${height}`)
  if (!isDevMode && startFrame >= endFrame) fail(`Start frame (${startFrame}) must be less than end frame (${endFrame})`)
  if (!isDevMode && endFrame > durationInFrames) fail(`End frame (${endFrame}) exceeds duration (${durationInFrames})`)

  const durationSeconds = (durationInFrames / fps).toFixed(1)

  // ── Dev mode ─────────────────────────────────────────────────────
  if (isDevMode) {
    printBanner()

    console.log(`  ${c.bold('Mode')}       ${c.highlight('dev')} ${c.dim('(live preview)')}`)
    console.log(`  ${c.bold('Input')}      ${c.info(basename(inputPath))}`)
    if (componentConfig) {
      console.log(`  ${c.bold('Config')}     ${c.highlight('defineVideoConfig')} ${c.dim('detected ✓')}`)
    }
    if (projectType !== 'standalone') {
      console.log(`  ${c.bold('Project')}    ${c.highlight(projectLabels[projectType] || projectType)} ${c.dim('detected ✓')}`)
    }
    if (serverUrl) {
      console.log(`  ${c.bold('Server')}     ${c.info(serverUrl)} ${c.dim('(BYOS)')}`)
    }
    console.log(`  ${c.bold('Resolution')} ${width}x${height}`)
    console.log(`  ${c.bold('Duration')}   ${durationInFrames} frames @ ${fps}fps ${c.dim(`(${durationSeconds}s)`)}`)
    console.log()

    // For Nuxt/Quasar, construct /pellicule render page URL
    let devServerUrl = serverUrl
    if ((projectType === 'nuxt' || projectType === 'quasar') && serverUrl) {
      const componentName = basename(inputPath, '.vue')
      devServerUrl = `${serverUrl.replace(/\/$/, '')}/pellicule?component=${encodeURIComponent(componentName)}`
    }

    try {
      const { url } = await startDevServer({
        input: inputPath,
        fps,
        durationInFrames,
        width,
        height,
        serverUrl: devServerUrl,
        bundler,
        syncConfigWithComponent: (
          values.duration === undefined &&
          values.fps === undefined &&
          values.width === undefined &&
          values.height === undefined
        ),
        configFile,
        projectType,
        version: VERSION
      })

      console.log(`  ${c.highlight('Preview ready!')} ${c.info(url)}`)
      console.log()
      console.log(`  ${c.dim('Controls:')} ${c.bold('Space')} play/pause  ${c.bold('←→')} step frame  ${c.bold('Home/End')} first/last`)
      console.log(`  ${c.dim('Press')} ${c.bold('Ctrl+C')} ${c.dim('to stop')}`)
      console.log()

      // Keep process alive
      await new Promise(() => {})
    } catch (error) {
      console.error(c.error(`  Error: ${getErrorMessage(error)}`))
      process.exit(1)
    }
  }

  // Print banner and config
  printBanner()

  const isPartialRender = startFrame > 0 || endFrame < durationInFrames
  const framesToRender = endFrame - startFrame
  const partialSeconds = (framesToRender / fps).toFixed(1)

  console.log(`  ${c.bold('Input')}      ${c.info(basename(inputPath))}`)
  if (componentConfig) {
    console.log(`  ${c.bold('Config')}     ${c.highlight('defineVideoConfig')} ${c.dim('detected ✓')}`)
  }

  if (projectType !== 'standalone') {
    console.log(`  ${c.bold('Project')}    ${c.highlight(projectLabels[projectType] || projectType)} ${c.dim('detected ✓')}`)
  }
  if (serverUrl) {
    console.log(`  ${c.bold('Server')}     ${c.info(serverUrl)} ${c.dim('(BYOS)')}`)
  }

  console.log(`  ${c.bold('Output')}     ${c.info(basename(outputPath))}`)
  console.log(`  ${c.bold('Preset')}     ${c.info(resolvedOutput.preset)}`)
  console.log(`  ${c.bold('Quality')}    ${c.info(resolvedOutput.quality)}`)
  console.log(`  ${c.bold('Resolution')} ${width}x${height}`)
  console.log(`  ${c.bold('Duration')}   ${durationInFrames} frames @ ${fps}fps ${c.dim(`(${durationSeconds}s)`)}`)
  if (isPartialRender) {
    console.log(`  ${c.bold('Range')}      ${c.highlight(`frames ${startFrame}-${endFrame - 1}`)} ${c.dim(`(${framesToRender} frames, ${partialSeconds}s)`)}`)
  }
  if (audioPath) {
    console.log(`  ${c.bold('Audio')}      ${c.info(basename(audioPath))}`)
  }
  console.log()

  const startTime = Date.now()

  // ANSI escape codes for line control
  const clearLine = '\x1b[2K'  // Clear entire line
  const cursorToStart = '\r'   // Move cursor to start of line

  // For Nuxt and Quasar projects, construct the /pellicule render page URL.
  // - Nuxt: pellicule/nuxt module injects the page
  // - Quasar: pellicule/quasar Vite plugin serves the page
  let finalServerUrl = serverUrl
  if ((projectType === 'nuxt' || projectType === 'quasar') && serverUrl) {
    const componentName = basename(inputPath, '.vue')
    finalServerUrl = `${serverUrl.replace(/\/$/, '')}/pellicule?component=${encodeURIComponent(componentName)}`
  }

  try {
    // Render with progress callback
    await renderToMp4({
      input: inputPath,
      fps,
      durationInFrames,
      startFrame,
      endFrame,
      width,
      height,
      output: outputPath,
      audio: audioPath,
      preset: resolvedOutput.preset,
      quality: resolvedOutput.quality,
      silent: true,
      serverUrl: finalServerUrl,
      bundler,
      configFile,
      projectType,
      onProgress: ({ frame, total, fps: currentFps }) => {
        // Clear line and print progress (stays on same line)
        process.stdout.write(clearLine + cursorToStart + formatProgress(frame, total, currentFps || fps))
      }
    })

    // Clear progress line when done
    process.stdout.write(clearLine + cursorToStart)

    const totalTime = Date.now() - startTime
    console.log()
    console.log(`  ${c.highlight('Done!')} Rendered ${framesToRender} frames in ${formatTime(totalTime)}`)
    console.log(`  ${c.dim('Output:')} ${outputPath}`)
    console.log()

  } catch (error) {
    // Clear progress line on error
    process.stdout.write(clearLine + cursorToStart)
    console.error()
    const message = getErrorMessage(error)
    console.error(c.error(`  Error: ${message}`))
    console.error()

    if (message.includes('ffmpeg')) {
      console.error(c.warn('  Hint: Make sure FFmpeg is installed and available in your PATH'))
      console.error(c.dim('  Install: https://ffmpeg.org/download.html'))
      console.error()
    }

    if (message.includes('Rsbuild')) {
      console.error(c.warn('  Hint: Install @rsbuild/core and @rsbuild/plugin-vue'))
      console.error(c.dim('  npm install -D @rsbuild/core @rsbuild/plugin-vue'))
      console.error()
    }

    process.exit(1)
  }
}

main().catch((error) => {
  console.error(c.error(`\nUnexpected error: ${getErrorMessage(error)}\n`))
  process.exit(1)
})
