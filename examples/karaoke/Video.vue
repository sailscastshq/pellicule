<script setup>
/**
 * Karaoke Example
 *
 * Demonstrates using useSequence for word-by-word text highlighting,
 * perfect for karaoke videos, subtitles, or lyric videos.
 *
 * Each word has a start and end frame. When the current frame
 * falls within that range, the word is highlighted.
 */
import { computed } from 'vue'
import { useFrame, useVideoConfig, useSequence, interpolate, Easing } from 'pellicule'

const frame = useFrame()
const { fps } = useVideoConfig()

// Lyrics with timing (frame numbers)
// In a real app, you'd sync this to audio timestamps
const lyrics = [
  // Line 1: "Never gonna give you up" (0-3s)
  { text: 'Never', start: fps * 0.0, end: fps * 0.4 },
  { text: 'gonna', start: fps * 0.4, end: fps * 0.8 },
  { text: 'give', start: fps * 0.8, end: fps * 1.1 },
  { text: 'you', start: fps * 1.1, end: fps * 1.4 },
  { text: 'up', start: fps * 1.4, end: fps * 2.0 },

  // Line 2: "Never gonna let you down" (3-6s)
  { text: 'Never', start: fps * 3.0, end: fps * 3.4 },
  { text: 'gonna', start: fps * 3.4, end: fps * 3.8 },
  { text: 'let', start: fps * 3.8, end: fps * 4.1 },
  { text: 'you', start: fps * 4.1, end: fps * 4.4 },
  { text: 'down', start: fps * 4.4, end: fps * 5.0 },

  // Line 3: "Never gonna run around" (6-9s)
  { text: 'Never', start: fps * 6.0, end: fps * 6.4 },
  { text: 'gonna', start: fps * 6.4, end: fps * 6.8 },
  { text: 'run', start: fps * 6.8, end: fps * 7.2 },
  { text: 'around', start: fps * 7.2, end: fps * 8.0 },
]

// Group lyrics by line (based on gaps in timing)
const lines = computed(() => {
  const result = []
  let currentLine = []

  lyrics.forEach((word, i) => {
    currentLine.push(word)

    const nextWord = lyrics[i + 1]
    // New line if gap > 1 second or end of lyrics
    if (!nextWord || nextWord.start - word.end > fps) {
      result.push([...currentLine])
      currentLine = []
    }
  })

  return result
})

// Get the current line index
const currentLineIndex = computed(() => {
  for (let i = 0; i < lines.value.length; i++) {
    const line = lines.value[i]
    const lineStart = line[0].start
    const lineEnd = line[line.length - 1].end + fps // buffer after line ends

    if (frame.value >= lineStart && frame.value < lineEnd) {
      return i
    }
  }
  return -1
})

// Check if a word is currently active
function isWordActive(word) {
  return frame.value >= word.start && frame.value < word.end
}

// Check if a word has been sung (past)
function isWordPast(word) {
  return frame.value >= word.end
}

// Get word progress (0-1) for smooth highlight
function getWordProgress(word) {
  if (frame.value < word.start) return 0
  if (frame.value >= word.end) return 1
  return (frame.value - word.start) / (word.end - word.start)
}

// Background pulse based on beat
const bgPulse = computed(() => {
  // Simple pulse every 0.5 seconds
  const cycle = (frame.value % (fps * 0.5)) / (fps * 0.5)
  return 0.15 + Math.sin(cycle * Math.PI) * 0.05
})
</script>

<template>
  <div class="video" :style="{ '--bg-pulse': bgPulse }">
    <div class="lyrics-container">
      <TransitionGroup name="line">
        <div
          v-for="(line, lineIndex) in lines"
          v-show="lineIndex === currentLineIndex"
          :key="lineIndex"
          class="line"
        >
          <span
            v-for="(word, wordIndex) in line"
            :key="wordIndex"
            class="word"
            :class="{
              active: isWordActive(word),
              past: isWordPast(word)
            }"
            :style="{
              '--progress': getWordProgress(word)
            }"
          >
            {{ word.text }}
          </span>
        </div>
      </TransitionGroup>
    </div>

    <!-- Progress bar -->
    <div class="progress-container">
      <div
        class="progress-bar"
        :style="{ width: (frame / (fps * 10)) * 100 + '%' }"
      ></div>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

.video {
  width: 100%;
  height: 100%;
  background: radial-gradient(
    ellipse at center,
    rgba(66, 184, 131, var(--bg-pulse, 0.15)) 0%,
    #0a0a12 70%
  );
  font-family: 'Inter', sans-serif;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.lyrics-container {
  position: relative;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.line {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 1400px;
}

.word {
  font-size: 96px;
  font-weight: 900;
  letter-spacing: -2px;
  color: rgba(255, 255, 255, 0.3);
  transition: color 0.1s ease;
  position: relative;
}

/* Word being sung - gradient fill based on progress */
.word.active {
  color: white;
  text-shadow: 0 0 40px rgba(66, 184, 131, 0.8);
}

/* Word already sung */
.word.past {
  color: #42b883;
}

/* Progress bar */
.progress-container {
  position: absolute;
  bottom: 60px;
  width: 60%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #42b883 0%, #6ee7a0 100%);
  border-radius: 3px;
  transition: width 0.033s linear;
}

/* Line transition */
.line-enter-active,
.line-leave-active {
  transition: all 0.3s ease;
}

.line-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.line-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
</style>
