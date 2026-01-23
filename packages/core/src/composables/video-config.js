import { inject } from 'vue'
import { CONFIG_KEY } from './keys.js'

/**
 * Get the video configuration (fps, duration, dimensions).
 * Must be used within a Pellicule render context.
 *
 * @returns {{ fps: number, durationInFrames: number, width: number, height: number }}
 *
 * @example
 * const { fps, durationInFrames, width, height } = useVideoConfig()
 */
export function useVideoConfig() {
  const config = inject(CONFIG_KEY)

  if (!config) {
    throw new Error(
      'useVideoConfig() must be used within a Pellicule render context'
    )
  }

  return config
}
