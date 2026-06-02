import { spawn } from 'node:child_process'

/**
 * @param {string} output
 * @returns {number}
 */
export function parseAudioDurationSeconds(output) {
  const seconds = Number.parseFloat(output.trim())

  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Unable to determine audio duration from ffprobe output: ${output.trim() || '(empty)'}`)
  }

  return seconds
}

/**
 * Probe an audio file duration using ffprobe.
 *
 * @param {string} audioPath
 * @returns {Promise<number>}
 */
export async function probeAudioDuration(audioPath) {
  return await new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      audioPath
    ])

    let stdout = ''
    let stderr = ''

    ffprobe.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    ffprobe.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    ffprobe.on('error', (error) => {
      reject(new Error(`ffprobe error: ${error.message}. Is FFmpeg installed?`))
    })

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        const detail = stderr.trim()
        reject(new Error(
          detail
            ? `ffprobe exited with code ${code}: ${detail}`
            : `ffprobe exited with code ${code}`
        ))
        return
      }

      try {
        resolve(parseAudioDurationSeconds(stdout))
      } catch (error) {
        reject(error)
      }
    })
  })
}
