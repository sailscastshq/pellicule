<script setup>
defineVideoConfig({ durationInSeconds: 12, fps: 24, width: 1280, height: 720 })
import { computed } from 'vue'
import { useFrame, interpolate, Easing } from 'pellicule'
import vueMark from './assets/vue.svg'

const bundler = DEMO_BUNDLER
const frame = useFrame()
const scene = computed(() => Math.min(2, Math.floor(frame.value / 96)))
const local = computed(() => frame.value % 96)
const opacity = computed(() => interpolate(local.value, [0, 10], [0, 1]))
const y = computed(() => interpolate(local.value, [0, 18], [24, 0], { easing: Easing.easeOut }))
const progress = computed(() => frame.value / 287 * 100)
const pages = [
  { eyebrow: 'PELLICULE / COMPATIBILITY UPDATE', title: 'Vue video.\nRsbuild 2.', copy: 'A new build generation for your next video.' },
  { eyebrow: 'REAL VUE. REAL ASSETS.', title: 'Same component.\nNew build path.', copy: 'Macro config, reactive frames and SVG imports — rendered together.' },
  { eyebrow: 'YOUR CONFIG, RESPECTED', title: 'Bring your\nvideo config.', copy: 'Explicit config files now reach the adapter. Upgrade core and Vue plugin together.' }
]
</script>
<template>
  <main class="film">
    <header><div class="brand"><i></i><i></i><span>pellicule</span></div><span>{{ bundler }}</span></header>
    <section :style="{ opacity, transform: `translateY(${y}px)` }">
      <div class="eyebrow">{{ pages[scene].eyebrow }}</div>
      <h1>{{ pages[scene].title }}</h1>
      <p>{{ pages[scene].copy }}</p>
      <code v-if="scene === 2">--bundler rsbuild --config video.config.mjs</code>
    </section>
    <aside>
      <div class="ring" :style="{ transform: `rotate(${frame * 0.65}deg)` }"><b></b></div>
      <img :src="vueMark" alt="Vue" />
      <span class="caption">{{ scene === 0 ? 'WRITE VUE. RENDER VIDEOS.' : scene === 1 ? `REACTIVE FRAME ${String(frame).padStart(3, '0')}` : 'CUSTOM CONFIG + VUE ASSETS' }}</span>
    </aside>
    <footer><span>Rendered with Pellicule · Rsbuild adapter</span><span>{{ String(frame).padStart(3, '0') }} / 287 · 24 FPS</span></footer>
    <div class="progress" :style="{ width: `${progress}%` }"></div>
  </main>
</template>
<style>
.film { width:100%; height:100%; background:#090f0d; color:#f4faf6; font-family:'Avenir Next','Helvetica Neue',sans-serif; position:relative; padding:48px 64px; overflow:hidden; }
header,footer { display:flex; justify-content:space-between; align-items:center; color:#9baaa2; font-size:18px; }
.brand { display:flex; align-items:center; gap:7px; color:#f4faf6; font-size:25px; font-weight:600; }
.brand i { display:block; height:27px; width:8px; background:#42b883; }
.brand i:nth-child(2) { background:#2d7557; }.brand span { margin-left:10px; }
section { position:absolute; top:183px; left:64px; width:765px; }
.eyebrow { color:#42b883; letter-spacing:3px; font-size:15px; font-weight:700; }
h1 { white-space:pre-line; font-size:80px; line-height:1.02; letter-spacing:-4px; margin:26px 0; font-weight:600; }
p { color:#aabdb2; font-size:23px; line-height:1.5; width:660px; margin:0; }
code { display:block; margin-top:25px; color:#76d8a8; font-family:monospace; font-size:19px; }
aside { position:absolute; left:880px; top:234px; width:272px; height:272px; display:grid; place-items:center; }
aside img { width:156px; position:absolute; }
.ring { position:absolute; width:272px; height:272px; border:1px solid #284a39; border-radius:50%; }
.ring b { position:absolute; top:-6px; left:130px; height:12px; width:12px; background:#42b883; border-radius:50%; }
.caption { position:absolute; top:313px; color:#6a9a80; font-size:12px; letter-spacing:1.2px; white-space:nowrap; }
footer { position:absolute; bottom:40px; left:64px; right:64px; font-size:15px; }
.progress { position:absolute; bottom:0; left:0; height:5px; background:#42b883; }
</style>
