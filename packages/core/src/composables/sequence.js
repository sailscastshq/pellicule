import { inject, computed, provide } from 'vue'
import { SEQUENCE_KEY } from './keys.js'
import { useFrame } from './frame.js'

/**
 * Get sequence timing information.
 * Can be used in two ways:
 *
 * 1. Inside a <Sequence> component - returns timing for that sequence
 * 2. With explicit timing - useSequence(from, durationInFrames)
 *
 * @param {number} [from] - Start frame (optional if inside <Sequence>)
 * @param {number} [durationInFrames] - Duration in frames (optional if inside <Sequence>)
 * @returns {{ localFrame: ComputedRef<number>, progress: ComputedRef<number>, isActive: ComputedRef<boolean> }}
 *
 * @example
 * // Inside a <Sequence> component
 * const { localFrame, progress, isActive } = useSequence()
 *
 * @example
 * // With explicit timing
 * const verse1 = useSequence(0, 90)
 * const verse2 = useSequence(90, 90)
 */
export function useSequence(from, durationInFrames) {
  const globalFrame = useFrame()

  // If arguments provided, use them directly
  if (from !== undefined && durationInFrames !== undefined) {
    const end = from + durationInFrames

    const localFrame = computed(() => Math.max(0, globalFrame.value - from))
    const progress = computed(() => {
      if (globalFrame.value < from) return 0
      if (globalFrame.value >= end) return 1
      return (globalFrame.value - from) / durationInFrames
    })
    const isActive = computed(() =>
      globalFrame.value >= from && globalFrame.value < end
    )

    return { localFrame, progress, isActive }
  }

  // Otherwise, try to get from parent <Sequence>
  const sequenceContext = inject(SEQUENCE_KEY, null)

  if (!sequenceContext) {
    throw new Error(
      'useSequence() must be used within a <Sequence> component or called with (from, durationInFrames) arguments'
    )
  }

  return sequenceContext
}

/**
 * Provide sequence context to children.
 * Used internally by the <Sequence> component.
 *
 * @param {number} from - Start frame
 * @param {number} durationInFrames - Duration in frames
 */
export function provideSequence(from, durationInFrames) {
  const globalFrame = useFrame()
  const end = from + durationInFrames

  const localFrame = computed(() => Math.max(0, globalFrame.value - from))
  const progress = computed(() => {
    if (globalFrame.value < from) return 0
    if (globalFrame.value >= end) return 1
    return (globalFrame.value - from) / durationInFrames
  })
  const isActive = computed(() =>
    globalFrame.value >= from && globalFrame.value < end
  )

  const context = { localFrame, progress, isActive, from, durationInFrames }
  provide(SEQUENCE_KEY, context)

  return context
}
