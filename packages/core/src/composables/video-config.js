import { inject } from 'vue'
import { CONFIG_KEY } from './keys.js'

/** @typedef {import('../types.js').VideoConfig} VideoConfig */

/**
 * Get the video configuration (fps, duration, dimensions).
 * Must be used within a Pellicule render context.
 *
 * @returns {VideoConfig}
 *
 * @example
 * const { fps, durationInFrames, width, height } = useVideoConfig()
 */
export function useVideoConfig() {
  /** @type {VideoConfig | undefined} */
  const config = inject(CONFIG_KEY)

  if (!config) {
    throw new Error(
      'useVideoConfig() must be used within a Pellicule render context'
    )
  }

  return config
}
