# Skills Example Test Notes

Use this example to verify two behaviors:

1. Pellicule waits for DOM assets before declaring the frame ready.
2. `pellicule dev` refreshes preview timing when `defineVideoConfig()` changes.

## Setup

```bash
cd examples/skills
npm install
```

## Manual verification

### 1. Preview config refresh

Start preview:

```bash
npm run dev
```

Then edit `Video.vue` and change:

```js
durationInSeconds: 8
```

to:

```js
durationInSeconds: 10
```

Expected result:

- The preview page reloads automatically.
- The overlay updates from `239` total frames / `8.00s` to `299` total frames / `10.00s`.
- The timeline scrubber max updates with the new duration.

Change the value back to `8` and confirm the preview shrinks again.

### 2. Asset readiness during render

Render the example:

```bash
npm run render
```

Expected result:

- The output renders successfully to `skills-demo.mp4`.
- The first visible frames already contain the Claude Code logo image from `assets/claude-code-logo.png`.
- There should be no missing-image flash at the start of the video.

## What this does not verify

- It does not infer duration from scene count automatically.
- If you add more scenes but do not update `defineVideoConfig()`, Pellicule still uses the configured duration.

