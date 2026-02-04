# Pellicule Skills for Claude Code

Create videos with Vue just by prompting Claude Code.

## Installation

```bash
npx skills add sailscastshq/pellicule/skills
```

## Usage

After installing, just ask Claude to create a video:

> "Create a 5-second intro video for my app called 'Notify' with a bell icon that bounces in"

Claude will:
1. Write a Vue component with proper Pellicule animations
2. Render it to MP4 using `npx pellicule`

## Skills Included

- **getting-started** - Installation, setup, and framework integration (Nuxt, Quasar, Laravel, etc.)
- **macros** - `defineVideoConfig` compiler macro for zero-config rendering
- **animations** - interpolate, sequence, easing
- **composables** - useFrame, useVideoConfig, useSequence
- **sequences** - Sequence component and useSequence for scene management
- **patterns** - typewriter, staggered, scenes, loops
- **rendering** - CLI options, BYOS mode, auto-detection, and rendering
- **styling** - CSS, fonts, colors

## What is Pellicule?

[Pellicule](https://github.com/sailscastshq/pellicule) is a Vue-native video rendering library. Write Vue components, render videos.

```bash
npm install pellicule
```

## Requirements

- Node.js 18+
- FFmpeg installed
- Vue 3.x

## Links

- [Pellicule Documentation](https://docs.sailscasts.com/pellicule)
- [Pellicule GitHub](https://github.com/sailscastshq/pellicule)

## License

MIT
