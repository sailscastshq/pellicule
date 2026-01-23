<script setup>
import { computed } from 'vue'
import { useFrame, provideSequence } from './composables.js'

const props = defineProps({
  /**
   * The frame number where this sequence starts
   */
  from: {
    type: Number,
    required: true
  },
  /**
   * Duration of this sequence in frames
   */
  durationInFrames: {
    type: Number,
    required: true
  }
})

const globalFrame = useFrame()

// Provide sequence context to children
const { isActive } = provideSequence(props.from, props.durationInFrames)

// Compute whether to show content
const shouldRender = computed(() => isActive.value)
</script>

<template>
  <slot v-if="shouldRender" />
</template>
