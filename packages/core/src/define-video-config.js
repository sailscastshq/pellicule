/**
 * Optional runtime identity helper for Pellicule's compile-time macro.
 *
 * Importing this function is not required, but it gives editors an explicit
 * symbol to attach autocomplete and validation to when an app prefers
 * imported macros over globals.
 *
 * @typedef {import('./types.js').VideoConfigInput} VideoConfigInput
 */

/**
 * @param {VideoConfigInput} config
 * @returns {VideoConfigInput}
 */
export function defineVideoConfig(config) {
  return config
}
