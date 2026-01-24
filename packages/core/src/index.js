/**
 * Pellicule - Deterministic video rendering with Vue
 *
 * This is the browser-safe entry point.
 * For rendering (Node.js), import from 'pellicule/render'
 */

// Composables
export { useFrame } from './composables/frame.js'
export { useVideoConfig } from './composables/video-config.js'
export { useSequence } from './composables/sequence.js'
export { FRAME_KEY, CONFIG_KEY, SEQUENCE_KEY } from './composables/keys.js'

// Components
export { default as Sequence } from './components/Sequence.vue'

// Animation utilities
export { interpolate, sequence, Easing } from './utils/math.js'
