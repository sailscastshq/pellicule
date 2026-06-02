/**
 * @typedef {import('../types.js').VideoConfig} VideoConfig
 * @typedef {import('../types.js').VideoConfigInput} VideoConfigInput
 * @typedef {import('../types.js').VideoConfigOverrides} VideoConfigOverrides
 */

import { secondsToFrames } from '../utils/timing.js'

/** @type {Readonly<VideoConfig>} */
const DEFAULT_VIDEO_CONFIG = Object.freeze({
  fps: 30,
  durationInFrames: 90,
  width: 1920,
  height: 1080
})

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function parsePositiveInteger(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function parsePositiveNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * Resolve a full runtime-safe video config from defaults plus loose overrides.
 *
 * @param {VideoConfig} [baseConfig=DEFAULT_VIDEO_CONFIG]
 * @param {VideoConfigInput | VideoConfigOverrides} [overrides={}]
 * @returns {VideoConfig}
 */
export function resolveVideoConfig(baseConfig = DEFAULT_VIDEO_CONFIG, overrides = {}) {
  /** @type {VideoConfig} */
  const resolved = {
    ...DEFAULT_VIDEO_CONFIG,
    ...baseConfig
  }

  const fps = parsePositiveInteger(overrides.fps)
  if (fps !== null) {
    resolved.fps = fps
  }

  const width = parsePositiveInteger(overrides.width)
  if (width !== null) {
    resolved.width = width
  }

  const height = parsePositiveInteger(overrides.height)
  if (height !== null) {
    resolved.height = height
  }

  const durationInFrames = parsePositiveInteger(overrides.durationInFrames)
  if (durationInFrames !== null) {
    resolved.durationInFrames = durationInFrames
  } else {
    const durationInSeconds = parsePositiveNumber(overrides.durationInSeconds)
    if (durationInSeconds !== null) {
      resolved.durationInFrames = secondsToFrames(durationInSeconds, resolved.fps)
    } else {
      const audioDurationInSeconds = parsePositiveNumber(overrides.audioDurationInSeconds)
      if (audioDurationInSeconds !== null) {
        resolved.durationInFrames = secondsToFrames(audioDurationInSeconds, resolved.fps)
      }
    }
  }

  return resolved
}

/**
 * Parse Pellicule's URL query params into a normalized runtime config.
 *
 * @param {string} search
 * @param {VideoConfig} [defaults=DEFAULT_VIDEO_CONFIG]
 * @returns {VideoConfig}
 */
export function parseVideoConfigFromSearch(search, defaults = DEFAULT_VIDEO_CONFIG) {
  const params = new URLSearchParams(search)
  return resolveVideoConfig(defaults, {
    fps: params.get('fps'),
    durationInFrames: params.get('duration'),
    width: params.get('width'),
    height: params.get('height')
  })
}

/**
 * @param {VideoConfig} currentConfig
 * @param {VideoConfig} nextConfig
 * @returns {boolean}
 */
export function haveVideoConfigChanged(currentConfig, nextConfig) {
  return (
    currentConfig.fps !== nextConfig.fps ||
    currentConfig.durationInFrames !== nextConfig.durationInFrames ||
    currentConfig.width !== nextConfig.width ||
    currentConfig.height !== nextConfig.height
  )
}

/**
 * @param {string} href
 * @param {VideoConfig} config
 * @returns {string}
 */
export function buildVideoConfigUrl(href, config) {
  const url = new URL(href, 'http://localhost')
  url.searchParams.set('fps', String(config.fps))
  url.searchParams.set('duration', String(config.durationInFrames))
  url.searchParams.set('width', String(config.width))
  url.searchParams.set('height', String(config.height))
  return url.toString()
}
