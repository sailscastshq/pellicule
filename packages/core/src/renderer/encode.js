import { spawn } from 'child_process'
import path from 'path'

/**
 * Encodes PNG frames into an MP4 video using FFmpeg.
 *
 * @param {object} options
 * @param {string} options.framesDir - Directory containing frame-XXXXX.png files
 * @param {string} options.output - Output video path (default: './output.mp4')
 * @param {number} options.fps - Frames per second (default: 30)
 * @param {boolean} options.silent - Suppress console output (default: false)
 * @returns {Promise<string>} Path to the output video
 */
export function encodeVideo(options) {
  const {
    framesDir,
    output = './output.mp4',
    fps = 30,
    silent = false
  } = options

  return new Promise((resolve, reject) => {
    const framePattern = path.join(framesDir, 'frame-%05d.png')

    const args = [
      '-y', // Overwrite output
      '-framerate', String(fps),
      '-i', framePattern,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p', // Compatibility
      '-preset', 'fast',
      output
    ]

    if (!silent) {
      console.log(`Encoding video: ffmpeg ${args.join(' ')}`)
    }

    const ffmpeg = spawn('ffmpeg', args)

    ffmpeg.stderr.on('data', (data) => {
      // FFmpeg outputs progress to stderr
      if (!silent) {
        const line = data.toString()
        if (line.includes('frame=')) {
          process.stdout.write(`\r${line.trim()}`)
        }
      }
    })

    ffmpeg.on('close', (code) => {
      if (!silent) {
        console.log('') // New line after progress
      }
      if (code === 0) {
        if (!silent) {
          console.log(`Video saved to ${output}`)
        }
        resolve(output)
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`))
      }
    })

    ffmpeg.on('error', (err) => {
      reject(new Error(`ffmpeg error: ${err.message}. Is ffmpeg installed?`))
    })
  })
}

/**
 * Full render pipeline: Vue component → frames → MP4
 *
 * @param {object} options - Same as renderVideo, plus output path
 * @param {boolean} options.silent - Suppress console output (default: false)
 * @returns {Promise<string>} Path to the output video
 */
export async function renderToMp4(options) {
  const { renderVideo } = await import('./render.js')

  const { output = './output.mp4', silent = false, ...renderOptions } = options

  // Step 1: Render frames
  const { framesDir } = await renderVideo({ ...renderOptions, silent })

  // Step 2: Encode to MP4
  const videoPath = await encodeVideo({
    framesDir,
    output,
    fps: renderOptions.fps || 30,
    silent
  })

  return videoPath
}
