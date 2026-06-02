import { spawn } from 'child_process'
import path from 'path'

/**
 * @typedef {import('../types.js').EncodeVideoOptions} EncodeVideoOptions
 * @typedef {import('../types.js').RenderToMp4Options} RenderToMp4Options
 * @typedef {import('../types.js').RenderVideoOptions} RenderVideoOptions
 */

/**
 * @param {{ output?: string, fps?: number, audio?: string|null }} options
 * @returns {string[]}
 */
export function createPipeEncodeArgs(options) {
  const {
    output = './output.mp4',
    fps = 30,
    audio = null
  } = options

  return [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-framerate', String(fps),
    '-i', 'pipe:0',
    ...(audio ? ['-i', audio] : []),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    ...(audio ? ['-c:a', 'aac'] : []),
    output
  ]
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
  const { framesDir, output = './output.mp4', fps = 30, audio = null, silent = false } = options
  const framePattern = path.join(framesDir, 'frame-%05d.png')
  const args = [
    '-y',
    '-framerate', String(fps),
    '-i', framePattern,
    ...(audio ? ['-i', audio] : []),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    ...(audio ? ['-c:a', 'aac'] : []),
    output
  ]

  const { done } = spawnFfmpeg({ args, silent })
  return done
}

/**
 * Full render pipeline: Vue component → frames → MP4
 *
 * @param {RenderToMp4Options} options - Same as renderVideo, plus output path
 * @returns {Promise<string>} Path to the output video
 */
export async function renderToMp4(options) {
  const { streamVideoFrames } = await import('./render.js')

  const { output = './output.mp4', audio = null, silent = false, ...rawRenderOptions } = options
  /** @type {RenderVideoOptions} */
  const renderOptions = rawRenderOptions

  /** @type {(() => Promise<void>) | null} */
  let cleanup = null
  const { ffmpeg, done } = spawnFfmpeg({
    args: createPipeEncodeArgs({
      output,
      fps: renderOptions.fps || 30,
      audio
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
