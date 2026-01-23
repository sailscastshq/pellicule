/**
 * Pellicule - Deterministic video rendering with Vue
 *
 * This is the browser-safe entry point.
 * For rendering (Node.js), import from 'pellicule/render'
 */

// Composables
export {
  useFrame,
  useVideoConfig,
  useSequence,
  FRAME_KEY,
  CONFIG_KEY,
  SEQUENCE_KEY
} from './composables.js'

// Components
export { default as Sequence } from './Sequence.vue'

// Animation utilities
export { interpolate, sequence, Easing } from './math.js'
