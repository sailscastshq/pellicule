/**
 * Pellicule - Deterministic video rendering with Vue
 *
 * This is the browser-safe entry point.
 * For rendering (Node.js), import from 'pellicule/render'
 */

// Composables
export { useFrame, useVideoConfig, FRAME_KEY, CONFIG_KEY } from './composables.js'

// Animation utilities
export { interpolate, sequence, Easing } from './math.js'
