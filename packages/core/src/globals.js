/**
 * Editor-only globals for Pellicule macros.
 *
 * This file is intentionally never imported at runtime. Keeping the macro
 * shape in plain JavaScript lets TS-based editors understand
 * `defineVideoConfig()` inside this workspace without introducing `.d.ts`
 * files or changing the runtime behavior of the macro.
 *
 * @typedef {import('./types.js').DefineVideoConfig} DefineVideoConfig
 */

/**
 * Compile-time Pellicule macro for video defaults.
 *
 * @type {DefineVideoConfig}
 */
function defineVideoConfig(config) {
  return config
}

void defineVideoConfig
