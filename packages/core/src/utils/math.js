/**
 * @typedef {import('../types.js').EasingFunction} EasingFunction
 * @typedef {import('../types.js').InterpolationOptions} InterpolationOptions
 * @typedef {import('../types.js').SequenceStep} SequenceStep
 */

/**
 * Easing functions for smooth animations
 */
/** @type {{ linear: EasingFunction, easeIn: EasingFunction, easeOut: EasingFunction, easeInOut: EasingFunction }} */
export const Easing = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
}

/**
 * Maps a value from one range to another.
 * The core animation primitive in Pellicule.
 *
 * @param {number} frame - Current frame number
 * @param {[number, number]} inputRange - [startFrame, endFrame]
 * @param {[number, number]} outputRange - [startValue, endValue]
 * @param {InterpolationOptions} [options] - Optional settings
 * @returns {number} Interpolated value
 *
 * @example
 * // Fade in over first 30 frames
 * const opacity = interpolate(frame, [0, 30], [0, 1])
 *
 * @example
 * // Slide from left with easing
 * const x = interpolate(frame, [0, 60], [-100, 0], { easing: Easing.easeOut })
 */
export function interpolate(frame, inputRange, outputRange, options = {}) {
  const { easing = Easing.linear, extrapolate = 'clamp' } = options

  const [inStart, inEnd] = inputRange
  const [outStart, outEnd] = outputRange

  // Calculate progress (0 to 1)
  let progress = (frame - inStart) / (inEnd - inStart)

  // Handle extrapolation
  if (extrapolate === 'clamp') {
    progress = Math.max(0, Math.min(1, progress))
  }

  // Apply easing
  const easedProgress = easing(progress)

  // Map to output range
  return outStart + (outEnd - outStart) * easedProgress
}

/**
 * Creates a sequence of timed animations.
 * Useful for staggered or chained animations.
 *
 * @param {number} frame - Current frame number
 * @param {SequenceStep[]} steps
 * @returns {number} Current value in the sequence
 *
 * @example
 * const scale = sequence(frame, [
 *   { start: 0, end: 15, from: 0, to: 1 },    // grow
 *   { start: 45, end: 60, from: 1, to: 0 }    // shrink
 * ])
 */
export function sequence(frame, steps) {
  for (const step of steps) {
    if (frame >= step.start && frame <= step.end) {
      return interpolate(frame, [step.start, step.end], [step.from, step.to])
    }
    if (frame < step.start) {
      return step.from
    }
  }
  // Return last value if past all steps
  const lastStep = steps[steps.length - 1]
  return lastStep ? lastStep.to : 0
}
