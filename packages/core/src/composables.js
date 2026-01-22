import { inject, computed } from 'vue'

/**
 * Injection keys for Pellicule context
 * Using Symbol.for() so keys are shared across module instances
 */
export const FRAME_KEY = Symbol.for('pellicule-frame')
export const CONFIG_KEY = Symbol.for('pellicule-config')

/**
 * Get the current frame number.
 * Must be used within a Pellicule render context.
 *
 * @returns {import('vue').ComputedRef<number>} Current frame number
 *
 * @example
 * const frame = useFrame()
 * const opacity = computed(() => frame.value / 30) // fade in over 1 second at 30fps
 */
export function useFrame() {
  const frame = inject(FRAME_KEY)

  if (frame === undefined) {
    throw new Error(
      'useFrame() must be used within a Pellicule render context'
    )
  }

  return computed(() => frame.value)
}

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
