/**
 * Injection keys for Pellicule context
 * Using Symbol.for() so keys are shared across module instances
 */
export const FRAME_KEY = Symbol.for('pellicule-frame')
export const CONFIG_KEY = Symbol.for('pellicule-config')
export const SEQUENCE_KEY = Symbol.for('pellicule-sequence')
