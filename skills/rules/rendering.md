---
name: rendering
description: CLI options, rendering modes, dev preview, and framework integration
metadata:
  tags: render, cli, output, mp4, ffmpeg, byos, nuxt, quasar, dev, preview
---

# Rendering Videos

## Basic Usage

```bash
npx pellicule Video.vue
```

This renders `Video.vue` to `./output.mp4` with defaults:
- 90 frames (3 seconds)
- 30 fps
- 1920x1080 resolution

The `.vue` extension is optional:

```bash
npx pellicule Video        # Works!
npx pellicule Video.vue    # Also works
```

## CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output <file>` | Output file path | `./output.mp4` |
| `-d, --duration <frames>` | Duration in frames | `90` |
| `-f, --fps <number>` | Frames per second | `30` |
| `-w, --width <pixels>` | Video width | `1920` |
| `-h, --height <pixels>` | Video height | `1080` |
| `-r, --range <start:end>` | Frame range for partial render | Full duration |
| `-a, --audio <file>` | Audio file to include | None |

### Integration Options

| Flag | Description | Default |
|------|-------------|---------|
| `--server-url <url>` | Use a running dev server (BYOS mode) | Auto-detected |
| `--bundler <name>` | Force a bundler: `vite` or `rsbuild` | Auto-detected |
| `--config <file>` | Use a specific bundler config file | Auto-detected |
| `--videos-dir <path>` | Custom directory for video components | Auto-detected |
| `--out-dir <path>` | Directory for rendered video output | Current directory |

## Common Commands

### 5-second video

```bash
# 5 seconds = 150 frames at 30fps
npx pellicule Video.vue -d 150 -o intro.mp4
```

### 10-second video at 60fps

```bash
# 10 seconds = 600 frames at 60fps
npx pellicule Video.vue -d 600 -f 60 -o smooth.mp4
```

### 4K resolution

```bash
npx pellicule Video.vue -w 3840 -h 2160 -o 4k-video.mp4
```

### Square video (Instagram)

```bash
npx pellicule Video.vue -w 1080 -h 1080 -o square.mp4
```

### Vertical video (TikTok/Reels)

```bash
npx pellicule Video.vue -w 1080 -h 1920 -o vertical.mp4
```

### Partial render (for faster iteration)

```bash
# Render only frames 100-200 of a 300-frame video
npx pellicule Video.vue -d 300 -r 100:200

# Preview the ending (last 30 frames)
npx pellicule Video.vue -d 300 -r 270:300
```

Use `-r` during development to quickly preview specific sections without rendering the entire video.

### With background audio

```bash
# Add background music
npx pellicule Video.vue -a background.mp3

# Combine with other options
npx pellicule Video.vue -d 300 -o intro.mp4 --audio music.wav
```

**Audio behavior:**
- Video duration is the source of truth — audio does not change video length
- Audio shorter than video: ends early, video continues silent
- Audio longer than video: truncated to match video duration
- Supported formats: MP3, WAV, AAC, and any FFmpeg-supported format
- Audio is re-encoded to AAC for universal MP4 compatibility

## Auto-Detection

Pellicule automatically detects your project type by scanning for config files:

| Config file | Detected as | Bundler | Default videos dir |
|-------------|-------------|---------|-------------------|
| `artisan` + `vite.config.ts` | Laravel | Vite | `resources/js/videos/` |
| `vite.config.js` / `.ts` | Vite | Vite | `src/videos/` |
| `rsbuild.config.js` / `.ts` | Rsbuild | Rsbuild | `src/videos/` |
| `config/shipwright.js` | Boring Stack | Rsbuild | `assets/js/videos/` |
| `nuxt.config.ts` / `.js` | Nuxt | BYOS | `app/videos/` |
| `quasar.config.js` | Quasar | BYOS | `src/videos/` |
| (none) | Standalone | Vite | project root |

Detection is first-match, so a project with both `artisan` and `vite.config.ts` is detected as Laravel (not generic Vite).

## BYOS Mode (Bring Your Own Server)

For Nuxt and Quasar projects, Pellicule uses **BYOS mode** — it connects to your already-running dev server instead of starting its own.

### How it works

1. You start your dev server (`nuxt dev` or `quasar dev`)
2. Pellicule connects to it via `--server-url` (auto-detected or explicit)
3. Playwright navigates to a special `/pellicule` render page
4. Frames are captured and encoded to MP4

### Nuxt BYOS

```bash
# Terminal 1: Start Nuxt
nuxt dev

# Terminal 2: Render
npx pellicule Demo
```

Pellicule auto-detects the Nuxt project and defaults to `http://localhost:3000`.

### Quasar BYOS

```bash
# Terminal 1: Start Quasar
quasar dev

# Terminal 2: Render
npx pellicule Demo
```

Pellicule auto-detects the Quasar project and defaults to `http://localhost:9000`.

### Custom server URL

If your dev server runs on a different port:

```bash
npx pellicule Demo --server-url http://localhost:4000
```

## Project Config (package.json)

Set options once per project instead of passing CLI flags every time:

```json
{
  "pellicule": {
    "serverUrl": "http://localhost:3000",
    "videosDir": "src/my-videos",
    "outDir": "rendered",
    "bundler": "vite"
  }
}
```

Resolution order: **CLI flags > package.json > auto-detected > defaults**

## How Rendering Works

### Bundler mode (Standalone, Vite, Rsbuild, Laravel, Boring Stack)

1. Pellicule reads your existing bundler config (if any) and merges it with its own
2. A temporary dev server starts with your Vue component as the entry point
3. **Playwright** renders each frame in a headless browser
4. **FFmpeg** encodes the frames into MP4

### BYOS mode (Nuxt, Quasar)

1. You start your dev server (which includes the Pellicule module/plugin)
2. Pellicule navigates Playwright to the `/pellicule` render page
3. The render page loads your video component and exposes frame control
4. **Playwright** renders each frame in a headless browser
5. **FFmpeg** encodes the frames into MP4

The process is deterministic — same component = same video every time.

## Duration Calculator

```
frames = seconds × fps

Examples:
3 seconds at 30fps  = 90 frames
5 seconds at 30fps  = 150 frames
10 seconds at 30fps = 300 frames
10 seconds at 60fps = 600 frames
```

## Requirements

Make sure FFmpeg is installed:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows (with chocolatey)
choco install ffmpeg
```

## Dev Preview

Use `pellicule dev` to preview your video in the browser with hot-reload and interactive controls — no full render needed.

```bash
# Preview the default Video.vue
npx pellicule dev

# Preview a specific component
npx pellicule dev MyVideo

# Preview at 720p
npx pellicule dev MyVideo -w 1280 -h 720
```

The preview opens in your browser with:
- **Play/Pause** — auto-advance frames at the configured FPS
- **Frame stepping** — `←` and `→` arrow keys
- **Timeline scrubber** — seek to any frame
- **Frame counter** — current frame, time, and FPS display

All file changes are hot-reloaded instantly via Vite HMR.

### How it works

`pellicule dev` reuses the same bundler pipeline and `window.__PELLICULE_SET_FRAME__()` mechanism as `pellicule`. The only difference is it opens a browser instead of launching headless Playwright. What you see in the preview is what you get in the final render.

### BYOS projects (Nuxt/Quasar)

Start your dev server first, then run `pellicule dev`:

```bash
# Terminal 1
npm run dev

# Terminal 2
npx pellicule dev InvoiceDemo
```

### Recommended workflow

1. Start the preview: `npx pellicule dev`
2. Edit your component, save — HMR refreshes instantly
3. Scrub/play to check the result
4. When happy, render the final video: `npx pellicule`

## Tips

1. **Start small** - Test with short durations first (`-d 30`)
2. **Use dev preview** - `pellicule dev` for instant visual feedback while iterating
3. **Use meaningful names** - `-o project-intro-v2.mp4`
4. **Use partial renders** - `-r 0:30` to preview just the first second
5. **Use `defineVideoConfig`** - Set duration in the component so you don't need CLI flags
