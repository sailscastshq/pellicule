import { inject, computed } from 'vue'
import { FRAME_KEY } from './keys.js'

/** @typedef {import('vue').Ref<number>} FrameRef */

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
  /** @type {FrameRef | undefined} */
  const frame = inject(FRAME_KEY)

  if (frame === undefined) {
    throw new Error(
      'useFrame() must be used within a Pellicule render context'
    )
  }

  return computed(() => frame.value)
}
