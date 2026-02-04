---
name: styling
description: CSS, fonts, and visual styling in Pellicule
metadata:
  tags: css, fonts, styling, design, colors
---

# Styling Videos

## CSS Support

Standard CSS works in Pellicule. Use scoped or global styles in your Vue component:

```vue
<style>
.video {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  color: white;
}
</style>
```

## Professional Dark Backgrounds

Dark backgrounds look great for videos:

```css
/* Near black */
background: #0a0a0f;

/* Dark with blue tint */
background: #050508;

/* Gradient */
background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);

/* Radial glow */
background: radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 70%);
```

## Google Fonts

Import web fonts at the top of your style block:

```vue
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.video {
  font-family: 'Inter', sans-serif;
}

h1 {
  font-weight: 700;
  font-size: 72px;
  letter-spacing: -2px;
}
</style>
```

Popular font choices:
- **Inter** - Clean, modern UI font
- **Space Grotesk** - Geometric, techy feel
- **Poppins** - Friendly, rounded
- **JetBrains Mono** - Code/terminal look

## Text Gradients

Create gradient text:

```css
h1 {
  background: linear-gradient(135deg, #ffffff 0%, #888888 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

## Shadows and Glow

```css
/* Text shadow */
h1 {
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

/* Glow effect */
.glow {
  text-shadow: 0 0 20px rgba(66, 184, 131, 0.5);
}

/* Box shadow */
.card {
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1);
}
```

## Flexbox Centering

Center content in the video:

```css
.video {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

## Multiple Elements

Stack elements vertically:

```css
.video {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
}
```

## Responsive Sizing

For text that scales with video size:

```css
h1 {
  font-size: 5vw; /* 5% of video width */
}
```

Or use fixed sizes for consistency:

```css
h1 {
  font-size: 72px;
}
```

## CSS Transforms

Transforms are perfect for animations:

```css
.animated {
  transform: translateY(20px) scale(0.95);
  opacity: 0;
}

.animated.visible {
  transform: translateY(0) scale(1);
  opacity: 1;
}
```

In Vue, bind directly:

```vue
<div :style="{
  transform: `translateY(${y}px) scale(${scale})`,
  opacity
}">
```

## Color Palette

Good colors for dark-theme videos:

```css
/* Whites */
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.7);
--text-muted: rgba(255, 255, 255, 0.5);

/* Accents */
--vue-green: #42b883;
--accent-blue: #60a5fa;
--accent-purple: #a78bfa;

/* Backgrounds */
--bg-dark: #0a0a0f;
--bg-card: rgba(255, 255, 255, 0.05);
```

## Images and SVGs

Use standard HTML:

```vue
<template>
  <img src="./logo.png" alt="Logo" style="width: 200px" />

  <!-- Or inline SVG -->
  <svg viewBox="0 0 100 100" style="width: 100px">
    <circle cx="50" cy="50" r="40" fill="#42b883" />
  </svg>
</template>
```

## Terminal/Code Editor Look

```css
.terminal {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 24px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  color: #e2e8f0;
}

.terminal-header {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.terminal-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.terminal-dot.red { background: #ff5f57; }
.terminal-dot.yellow { background: #ffbd2e; }
.terminal-dot.green { background: #28c840; }
```
