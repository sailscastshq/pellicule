#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { resolve, extname, basename, dirname } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToMp4 } from 'pellicule/render'

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
  ${c.info('-d, --duration')} <frames> Duration in frames ${c.dim('(default: 90)')}
  ${c.info('-f, --fps')} <number>      Frames per second ${c.dim('(default: 30)')}
  ${c.info('-w, --width')} <pixels>    Video width ${c.dim('(default: 1920)')}
  ${c.info('-h, --height')} <pixels>   Video height ${c.dim('(default: 1080)')}
  ${c.info('-r, --range')} <start:end> Frame range for partial render ${c.dim('(e.g., 100:200)')}
  ${c.info('--help')}                 Show this help message
  ${c.info('--version')}               Show version number

${c.bold('EXAMPLES')}
  ${c.dim('# Zero-config (renders Video.vue → output.mp4)')}
  ${c.highlight('pellicule')}

  ${c.dim('# Specify input file (.vue extension is optional)')}
  ${c.highlight('pellicule')} MyVideo

  ${c.dim('# Custom output and duration')}
  ${c.highlight('pellicule')} Video.vue -o intro.mp4 -d 150

  ${c.dim('# 4K video at 60fps')}
  ${c.highlight('pellicule')} Video.vue -w 3840 -h 2160 -f 60

  ${c.dim('# 10 second video')}
  ${c.highlight('pellicule')} Video.vue -d 300 -f 30

  ${c.dim('# Render only frames 100-200 (for faster iteration)')}
  ${c.highlight('pellicule')} Video.vue -d 300 -r 100:200

  ${c.dim('# Render from frame 150 to 250')}
  ${c.highlight('pellicule')} Video.vue -d 300 --range 150:250

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

  // Default to Video.vue if no input provided
  const input = positionals[0] || 'Video.vue'

  // Try to resolve the input file, auto-appending .vue if needed
  let inputPath = resolve(input)

  if (!existsSync(inputPath) && !input.endsWith('.vue')) {
    const withVue = resolve(input + '.vue')
    if (existsSync(withVue)) {
      inputPath = withVue
    }
  }

  if (!existsSync(inputPath)) fail(`File not found: ${input}`)
  if (extname(inputPath) !== '.vue') fail(`Input must be a .vue file, got: ${extname(inputPath) || '(no extension)'}`)

  // Parse options with defaults
  const fps = parseInt(values.fps || '30', 10)
  const durationInFrames = parseInt(values.duration || '90', 10)
  const width = parseInt(values.width || '1920', 10)
  const height = parseInt(values.height || '1080', 10)
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

  // Validate options
  if (isNaN(fps) || fps <= 0) fail(`Invalid fps value: ${values.fps}`)
  if (isNaN(durationInFrames) || durationInFrames <= 0) fail(`Invalid duration value: ${values.duration}`)
  if (isNaN(width) || width <= 0) fail(`Invalid width value: ${values.width}`)
  if (isNaN(height) || height <= 0) fail(`Invalid height value: ${values.height}`)
  if (startFrame >= endFrame) fail(`Start frame (${startFrame}) must be less than end frame (${endFrame})`)
  if (endFrame > durationInFrames) fail(`End frame (${endFrame}) exceeds duration (${durationInFrames})`)

  // Print banner and config
  printBanner()

  const isPartialRender = startFrame > 0 || endFrame < durationInFrames
  const framesToRender = endFrame - startFrame
  const durationSeconds = (durationInFrames / fps).toFixed(1)
  const partialSeconds = (framesToRender / fps).toFixed(1)

  console.log(`  ${c.bold('Input')}      ${c.info(basename(inputPath))}`)
  console.log(`  ${c.bold('Output')}     ${c.info(basename(outputPath))}`)
  console.log(`  ${c.bold('Resolution')} ${width}x${height}`)
  console.log(`  ${c.bold('Duration')}   ${durationInFrames} frames @ ${fps}fps ${c.dim(`(${durationSeconds}s)`)}`)
  if (isPartialRender) {
    console.log(`  ${c.bold('Range')}      ${c.highlight(`frames ${startFrame}-${endFrame - 1}`)} ${c.dim(`(${framesToRender} frames, ${partialSeconds}s)`)}`)
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
      silent: true,
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

    process.exit(1)
  }
}

main().catch((error) => {
  console.error(c.error(`\nUnexpected error: ${error.message}\n`))
  process.exit(1)
})
