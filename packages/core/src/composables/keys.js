/**
 * Injection keys for Pellicule context
 * Using Symbol.for() so keys are shared across module instances
 */
/** @type {symbol} */
export const FRAME_KEY = Symbol.for('pellicule-frame')
/** @type {symbol} */
export const CONFIG_KEY = Symbol.for('pellicule-config')
/** @type {symbol} */
export const SEQUENCE_KEY = Symbol.for('pellicule-sequence')
