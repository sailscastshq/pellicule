/**
 * Convert seconds to the nearest whole frame at the given frame rate.
 *
 * @param {number} seconds
 * @param {number} fps
 * @returns {number}
 */
export function secondsToFrames(seconds, fps) {
  return Math.round(seconds * fps)
}

/**
 * Convert a frame count to seconds at the given frame rate.
 *
 * @param {number} frames
 * @param {number} fps
 * @returns {number}
 */
export function framesToSeconds(frames, fps) {
  return frames / fps
}
