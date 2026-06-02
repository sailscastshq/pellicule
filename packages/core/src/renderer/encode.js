import { spawn } from 'child_process'
import path from 'path'

/**
 * @typedef {import('../types.js').EncodeVideoOptions} EncodeVideoOptions
 * @typedef {import('../types.js').OutputPresetName} OutputPresetName
 * @typedef {import('../types.js').OutputQuality} OutputQuality
 * @typedef {import('../types.js').RenderToMp4Options} RenderToMp4Options
 * @typedef {import('../types.js').RenderVideoOptions} RenderVideoOptions
 */

/** @type {OutputPresetName} */
export const DEFAULT_OUTPUT_PRESET = 'mp4'
/** @type {OutputQuality} */
export const DEFAULT_OUTPUT_QUALITY = 'standard'
/** @type {OutputPresetName[]} */
export const OUTPUT_PRESET_NAMES = ['mp4', 'webm']
/** @type {OutputQuality[]} */
export const OUTPUT_QUALITY_NAMES = ['draft', 'standard', 'high']

const OUTPUT_PRESETS = {
  mp4: {
    extension: '.mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    videoArgs: ['-pix_fmt', 'yuv420p'],
    qualityArgs: {
      draft: {
        video: ['-preset', 'veryfast', '-crf', '28'],
        audio: ['-b:a', '128k']
      },
      standard: {
        video: ['-preset', 'fast', '-crf', '23'],
        audio: ['-b:a', '192k']
      },
      high: {
        video: ['-preset', 'slow', '-crf', '18'],
        audio: ['-b:a', '256k']
      }
    }
  },
  webm: {
    extension: '.webm',
    videoCodec: 'libvpx-vp9',
    audioCodec: 'libopus',
    videoArgs: [],
    qualityArgs: {
      draft: {
        video: ['-b:v', '0', '-crf', '38', '-deadline', 'realtime', '-cpu-used', '6'],
        audio: ['-b:a', '96k']
      },
      standard: {
        video: ['-b:v', '0', '-crf', '32', '-deadline', 'good', '-cpu-used', '4'],
        audio: ['-b:a', '128k']
      },
      high: {
        video: ['-b:v', '0', '-crf', '24', '-deadline', 'good', '-cpu-used', '2'],
        audio: ['-b:a', '160k']
      }
    }
  }
}

/**
 * @param {string} output
 * @returns {OutputPresetName | null}
 */
function inferPresetFromOutput(output) {
  const extension = path.extname(output).toLowerCase()

  for (const presetName of OUTPUT_PRESET_NAMES) {
    if (OUTPUT_PRESETS[presetName].extension === extension) {
      return presetName
    }
  }

  return extension ? null : DEFAULT_OUTPUT_PRESET
}

/**
 * @param {OutputPresetName} preset
 * @returns {typeof OUTPUT_PRESETS[OutputPresetName]}
 */
function getOutputPreset(preset) {
  return OUTPUT_PRESETS[preset]
}

/**
 * @param {{ output?: string, preset?: OutputPresetName, quality?: OutputQuality }} options
 * @returns {{ output: string, preset: OutputPresetName, quality: OutputQuality }}
 */
export function resolveOutputOptions(options = {}) {
  const requestedOutput = options.output || './output'
  const inferredPreset = inferPresetFromOutput(requestedOutput)
  const preset = options.preset || inferredPreset || DEFAULT_OUTPUT_PRESET

  if (!OUTPUT_PRESET_NAMES.includes(preset)) {
    throw new Error(`Unknown output preset: ${preset}`)
  }

  const quality = options.quality || DEFAULT_OUTPUT_QUALITY
  if (!OUTPUT_QUALITY_NAMES.includes(quality)) {
    throw new Error(`Unknown output quality: ${quality}`)
  }

  const presetConfig = getOutputPreset(preset)
  const extension = path.extname(requestedOutput).toLowerCase()

  if (extension && extension !== presetConfig.extension) {
    throw new Error(
      `Output file extension "${extension}" does not match the ${preset} preset (${presetConfig.extension})`
    )
  }

  return {
    output: extension ? requestedOutput : `${requestedOutput}${presetConfig.extension}`,
    preset,
    quality
  }
}

/**
 * @param {{
 *   output?: string,
 *   fps?: number,
 *   audio?: string|null,
 *   preset?: OutputPresetName,
 *   quality?: OutputQuality,
 *   inputArgs: string[]
 * }} options
 * @returns {string[]}
 */
function createEncodeArgs(options) {
  const {
    fps = 30,
    audio = null,
    inputArgs
  } = options
  const resolved = resolveOutputOptions(options)
  const preset = getOutputPreset(resolved.preset)
  const qualityArgs = preset.qualityArgs[resolved.quality]

  return [
    '-y',
    ...inputArgs,
    ...(audio ? ['-i', audio] : []),
    '-c:v', preset.videoCodec,
    ...preset.videoArgs,
    ...qualityArgs.video,
    ...(audio ? ['-c:a', preset.audioCodec, ...qualityArgs.audio] : []),
    resolved.output
  ]
}

/**
 * @param {{
 *   output?: string,
 *   fps?: number,
 *   audio?: string|null,
 *   preset?: OutputPresetName,
 *   quality?: OutputQuality
 * }} options
 * @returns {string[]}
 */
export function createPipeEncodeArgs(options) {
  const {
    fps = 30
  } = options

  return createEncodeArgs({
    ...options,
    inputArgs: ['-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(fps), '-i', 'pipe:0']
  })
}

/**
 * @param {NodeJS.WritableStream & { write: (chunk: Buffer) => boolean }} stream
 * @param {Buffer} chunk
 * @returns {Promise<void>}
 */
async function writeChunk(stream, chunk) {
  await new Promise((resolve, reject) => {
    let settled = false

    const cleanup = () => {
      stream.off('error', onError)
      stream.off('drain', onDrain)
    }

    const finish = (callback) => (value) => {
      if (settled) return
      settled = true
      cleanup()
      callback(value)
    }

    const onError = finish(reject)
    const onDrain = finish(resolve)

    stream.on('error', onError)

    const canContinue = stream.write(chunk, (error) => {
      if (error) {
        onError(error)
      } else if (canContinue) {
        onDrain()
      }
    })

    if (!canContinue) {
      stream.once('drain', onDrain)
    }
  })
}

/**
 * @param {{ args: string[], silent?: boolean }} options
 * @returns {{ ffmpeg: import('child_process').ChildProcessWithoutNullStreams, done: Promise<string> }}
 */
function spawnFfmpeg(options) {
  const { args, silent = false } = options
  const ffmpeg = spawn('ffmpeg', args)

  if (!silent) {
    console.log(`Encoding video: ffmpeg ${args.join(' ')}`)
  }

  ffmpeg.stderr.on('data', (data) => {
    if (!silent) {
      const line = data.toString()
      if (line.includes('frame=')) {
        process.stdout.write(`\r${line.trim()}`)
      }
    }
  })

  const done = new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (!silent) {
        console.log('')
      }
      if (code === 0) {
        resolve(args[args.length - 1])
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`))
      }
    })

    ffmpeg.on('error', (err) => {
      reject(new Error(`ffmpeg error: ${err.message}. Is ffmpeg installed?`))
    })
  })

  return { ffmpeg, done }
}

/**
 * Encodes PNG frames into an MP4 video using FFmpeg.
 *
 * @param {EncodeVideoOptions} options
 * @returns {Promise<string>} Path to the output video
 */
export function encodeVideo(options) {
  const { framesDir, fps = 30, silent = false } = options
  const framePattern = path.join(framesDir, 'frame-%05d.png')
  const args = createEncodeArgs({
    ...options,
    fps,
    inputArgs: ['-framerate', String(fps), '-i', framePattern]
  })

  const { done } = spawnFfmpeg({ args, silent })
  return done
}

/**
 * Full render pipeline: Vue component → frames → encoded video
 *
 * @param {RenderToMp4Options} options - Same as renderVideo, plus output path
 * @returns {Promise<string>} Path to the output video
 */
export async function renderToMp4(options) {
  const { streamVideoFrames } = await import('./render.js')

  const { audio = null, preset, quality, silent = false, ...rawRenderOptions } = options
  /** @type {RenderVideoOptions} */
  const renderOptions = rawRenderOptions
  const resolvedOutput = resolveOutputOptions({
    output: options.output,
    preset,
    quality
  })

  /** @type {(() => Promise<void>) | null} */
  let cleanup = null
  const { ffmpeg, done } = spawnFfmpeg({
    args: createPipeEncodeArgs({
      output: resolvedOutput.output,
      fps: renderOptions.fps || 30,
      audio,
      preset: resolvedOutput.preset,
      quality: resolvedOutput.quality
    }),
    silent
  })

  try {
    const renderResult = await streamVideoFrames({
      ...renderOptions,
      silent,
      onFrame: async (png) => {
        await writeChunk(ffmpeg.stdin, png)
      }
    })
    cleanup = renderResult.cleanup

    ffmpeg.stdin.end()
    const videoPath = await done

    if (!silent) {
      console.log(`Video saved to ${videoPath}`)
    }

    return videoPath
  } catch (error) {
    ffmpeg.stdin.destroy()
    ffmpeg.kill('SIGKILL')
    try {
      await done
    } catch {
      // Ignore ffmpeg shutdown errors when the render loop is already failing.
    }
    throw error
  } finally {
    if (cleanup) {
      await cleanup()
    }
  }
}
