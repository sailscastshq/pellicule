#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { resolve, extname, basename, dirname } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToMp4 } from '../src/render.js'
import { extractVideoConfig, resolveVideoConfig } from '../src/macros/define-video-config.js'
import { detectProject, resolveInputFile } from '../src/config/detect.js'

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url))
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
  error: (s) => `${colors.red}${s}${colors.reset}`,
  warn: (s) => `${colors.yellow}${s}${colors.reset}`,
  info: (s) => `${colors.cyan}${s}${colors.reset}`,
  dim: (s) => `${colors.dim}${s}${colors.reset}`,
  bold: (s) => `${colors.bold}${s}${colors.reset}`,
  highlight: (s) => `${colors.pellicule}${s}${colors.reset}`,
  brand: (s) => `${colors.bgPellicule}${colors.white}${colors.bold}${s}${colors.reset}`
}

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

${c.bold('OPTIONS')}
  ${c.info('-o, --output')} <file>     Output file path ${c.dim('(default: ./output.mp4)')}
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

${c.bold('COMPONENT CONFIG')}
  Use ${c.highlight('defineVideoConfig')} in your component to set defaults:

  ${c.dim('defineVideoConfig({ durationInSeconds: 5 })')}

  No import needed - it's a compiler macro like Vue's defineProps.
  Then just run: ${c.highlight('pellicule')} ${c.dim('(no flags needed!)')}

${c.bold('AUTO-DETECTION')}
  Pellicule reads your existing config files automatically:
  ${c.dim('vite.config.js')}       → Vite adapter
  ${c.dim('rsbuild.config.js')}    → Rsbuild adapter
  ${c.dim('config/shipwright.js')} → Rsbuild adapter (boring stack)
  ${c.dim('nuxt.config.ts')}       → Needs --server-url (BYOS mode)
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

  ${c.dim('# Use with Nuxt (BYOS mode)')}
  ${c.highlight('pellicule')} InvoiceDemo --server-url http://localhost:3000

  ${c.dim('# Force Rsbuild bundler')}
  ${c.highlight('pellicule')} Video.vue --bundler rsbuild

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

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`
  const seconds = (ms / 1000).toFixed(1)
  return `${seconds}s`
}

function formatProgress(frame, total, fps) {
  const percent = Math.round(((frame + 1) / total) * 100)
  const barWidth = 30
  const filled = Math.round((percent / 100) * barWidth)
  const empty = barWidth - filled
  const bar = c.highlight('█'.repeat(filled)) + c.dim('░'.repeat(empty))
  return `  ${bar} ${c.bold(percent + '%')} ${c.dim(`(${frame + 1}/${total} @ ${fps.toFixed(1)} fps)`)}`
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      output: { type: 'string', short: 'o' },
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

  // ── Auto-detection ────────────────────────────────────────────────
  const detected = detectProject()

  // CLI flags override auto-detected values
  const bundler = values.bundler || detected.bundler
  const configFile = values.config ? resolve(values.config) : detected.configFile
  const videosDir = values['videos-dir'] ? resolve(values['videos-dir']) : detected.videosDir
  const serverUrl = values['server-url'] || null
  const projectType = detected.projectType

  // Validate bundler flag
  if (values.bundler && !['vite', 'rsbuild'].includes(values.bundler)) {
    fail(`Unknown bundler: ${values.bundler}`, 'Supported bundlers: vite, rsbuild')
  }

  // Warn if Nuxt was detected but no --server-url provided
  if (detected.byos && !serverUrl) {
    fail(
      'Nuxt project detected. Pellicule needs your running Nuxt dev server.',
      'Start your Nuxt server and pass: --server-url http://localhost:3000'
    )
  }

  // ── Input file resolution ─────────────────────────────────────────
  const input = positionals[0] || 'Video.vue'
  const result = resolveInputFile(input, videosDir)

  if (result.error) {
    const searchedPaths = result.searched.map(p => `  - ${p}`).join('\n')
    fail(result.error, `Looked in:\n${searchedPaths}`)
  }

  const inputPath = result.resolved

  if (extname(inputPath) !== '.vue') {
    fail(`Input must be a .vue file, got: ${extname(inputPath) || '(no extension)'}`)
  }

  // Extract config from component (if defineVideoConfig is used)
  const componentConfig = extractVideoConfig(inputPath)

  // Resolve audio file path (CLI flag takes precedence over component config)
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
  const output = values.output || './output.mp4'
  const outputPath = resolve(output)

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
  if (startFrame >= endFrame) fail(`Start frame (${startFrame}) must be less than end frame (${endFrame})`)
  if (endFrame > durationInFrames) fail(`End frame (${endFrame}) exceeds duration (${durationInFrames})`)

  // Print banner and config
  printBanner()

  const isPartialRender = startFrame > 0 || endFrame < durationInFrames
  const framesToRender = endFrame - startFrame
  const durationSeconds = (durationInFrames / fps).toFixed(1)
  const partialSeconds = (framesToRender / fps).toFixed(1)

  console.log(`  ${c.bold('Input')}      ${c.info(basename(inputPath))}`)
  if (componentConfig) {
    console.log(`  ${c.bold('Config')}     ${c.highlight('defineVideoConfig')} ${c.dim('detected ✓')}`)
  }

  // Show detected project info
  if (projectType !== 'standalone') {
    const projectLabels = {
      vite: 'Vite',
      rsbuild: 'Rsbuild',
      shipwright: 'Boring Stack (Shipwright)',
      nuxt: 'Nuxt',
      quasar: 'Quasar'
    }
    console.log(`  ${c.bold('Project')}    ${c.highlight(projectLabels[projectType] || projectType)} ${c.dim('detected ✓')}`)
  }
  if (serverUrl) {
    console.log(`  ${c.bold('Server')}     ${c.info(serverUrl)} ${c.dim('(BYOS)')}`)
  }

  console.log(`  ${c.bold('Output')}     ${c.info(basename(outputPath))}`)
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
      silent: true,
      serverUrl,
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
    console.error(c.error(`  Error: ${error.message}`))
    console.error()

    if (error.message.includes('ffmpeg')) {
      console.error(c.warn('  Hint: Make sure FFmpeg is installed and available in your PATH'))
      console.error(c.dim('  Install: https://ffmpeg.org/download.html'))
      console.error()
    }

    if (error.message.includes('Rsbuild')) {
      console.error(c.warn('  Hint: Install @rsbuild/core and @rsbuild/plugin-vue'))
      console.error(c.dim('  npm install -D @rsbuild/core @rsbuild/plugin-vue'))
      console.error()
    }

    process.exit(1)
  }
}

main().catch((error) => {
  console.error(c.error(`\nUnexpected error: ${error.message}\n`))
  process.exit(1)
})
