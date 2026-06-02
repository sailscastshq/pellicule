import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { basename, extname } from 'node:path'
import { once } from 'node:events'

/** @typedef {import('../types.js').AsyncCleanup} AsyncCleanup */

const AUDIO_CONTENT_TYPES = {
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus',
  '.wav': 'audio/wav',
  '.weba': 'audio/webm'
}

/**
 * @param {string} audioPath
 * @returns {string}
 */
function getAudioContentType(audioPath) {
  return AUDIO_CONTENT_TYPES[extname(audioPath).toLowerCase()] || 'application/octet-stream'
}

/**
 * @param {string | undefined} header
 * @param {number} size
 * @returns {{ start: number, end: number } | null}
 */
function parseRangeHeader(header, size) {
  if (!header || !header.startsWith('bytes=')) {
    return null
  }

  const [startText, endText] = header.slice('bytes='.length).split('-', 2)
  const hasStart = startText !== undefined && startText !== ''
  const hasEnd = endText !== undefined && endText !== ''

  if (!hasStart && !hasEnd) {
    return null
  }

  let start = hasStart ? Number.parseInt(startText, 10) : NaN
  let end = hasEnd ? Number.parseInt(endText, 10) : NaN

  if (!hasStart && Number.isFinite(end)) {
    start = Math.max(size - end, 0)
    end = size - 1
  } else {
    if (!Number.isFinite(start) || start < 0) {
      return null
    }
    if (!Number.isFinite(end) || end >= size) {
      end = size - 1
    }
  }

  if (start > end || start >= size) {
    return null
  }

  return { start, end }
}

/**
 * Start a tiny HTTP server that exposes one audio file for browser preview.
 *
 * @param {string} audioPath
 * @returns {Promise<{ url: string, cleanup: AsyncCleanup }>}
 */
export async function startAudioPreviewServer(audioPath) {
  const audioStats = await stat(audioPath)
  const pathname = `/${encodeURIComponent(basename(audioPath))}`
  const contentType = getAudioContentType(audioPath)

  const server = createServer((req, res) => {
    const requestUrl = new URL(req.url || '/', 'http://127.0.0.1')

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type')
    res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, Content-Type')

    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }

    if (requestUrl.pathname !== pathname || (req.method !== 'GET' && req.method !== 'HEAD')) {
      res.statusCode = 404
      res.end('Not found')
      return
    }

    res.setHeader('Content-Type', contentType)
    res.setHeader('Accept-Ranges', 'bytes')

    const range = parseRangeHeader(req.headers.range, audioStats.size)
    if (req.headers.range && !range) {
      res.statusCode = 416
      res.setHeader('Content-Range', `bytes */${audioStats.size}`)
      res.end()
      return
    }

    const start = range ? range.start : 0
    const end = range ? range.end : audioStats.size - 1
    const contentLength = end - start + 1

    if (range) {
      res.statusCode = 206
      res.setHeader('Content-Range', `bytes ${start}-${end}/${audioStats.size}`)
    } else {
      res.statusCode = 200
    }

    res.setHeader('Content-Length', String(contentLength))

    if (req.method === 'HEAD') {
      res.end()
      return
    }

    const stream = createReadStream(audioPath, { start, end })
    stream.on('error', () => {
      if (!res.headersSent) {
        res.statusCode = 500
      }
      res.end()
    })
    stream.pipe(res)
  })

  server.listen(0, '127.0.0.1')
  await once(server, 'listening')

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start preview audio server')
  }

  return {
    url: `http://127.0.0.1:${address.port}${pathname}`,
    cleanup: async () => {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })
    }
  }
}
