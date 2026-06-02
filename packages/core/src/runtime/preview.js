/**
 * @typedef {import('../types.js').PreviewOverlayOptions} PreviewOverlayOptions
 * @typedef {import('../types.js').PelliculeWindow} PelliculeWindow
 */

const OVERLAY_ID = 'pellicule-overlay'
const AUDIO_ID = 'pellicule-preview-audio'

const PLAY_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>'
const PAUSE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>'
const PREV_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,3 7,12 19,21"/><rect x="5" y="3" width="3" height="18"/></svg>'
const NEXT_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 17,12 5,21"/><rect x="16" y="3" width="3" height="18"/></svg>'

const OVERLAY_STYLE = `
#pellicule-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99999;
  background: rgba(15, 15, 15, 0.92);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(66, 184, 131, 0.3);
  padding: 8px 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 12px;
  color: #e0e0e0;
  user-select: none;
}
#pellicule-overlay .po-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
#pellicule-overlay .po-bottom {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
#pellicule-overlay .po-brand-group {
  display: flex;
  align-items: baseline;
  gap: 5px;
  white-space: nowrap;
  flex-shrink: 0;
}
#pellicule-overlay .po-brand {
  color: #42b883;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
#pellicule-overlay .po-version {
  color: rgba(66, 184, 131, 0.5);
  font-size: 9px;
  font-weight: 500;
}
#pellicule-overlay .po-controls {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
#pellicule-overlay .po-btn {
  background: rgba(66, 184, 131, 0.15);
  border: 1px solid rgba(66, 184, 131, 0.3);
  color: #42b883;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
  padding: 0;
  line-height: 0;
}
#pellicule-overlay .po-btn:hover {
  background: rgba(66, 184, 131, 0.25);
}
#pellicule-overlay .po-btn svg {
  display: block;
}
#pellicule-overlay .po-scrubber {
  flex: 1;
  min-width: 60px;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
#pellicule-overlay .po-scrubber::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #42b883;
  cursor: pointer;
  border: 2px solid #0f0f0f;
}
#pellicule-overlay .po-scrubber::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #42b883;
  cursor: pointer;
  border: 2px solid #0f0f0f;
}
#pellicule-overlay .po-info {
  font-variant-numeric: tabular-nums;
  color: #999;
  white-space: nowrap;
  font-size: 11px;
  flex-shrink: 0;
}
#pellicule-overlay .po-info span {
  color: #e0e0e0;
}
#pellicule-overlay .po-audio {
  color: rgba(66, 184, 131, 0.85);
}
#pellicule-overlay .po-kbd {
  font-size: 10px;
  color: #666;
  white-space: nowrap;
  margin-left: auto;
  flex-shrink: 0;
}
#pellicule-overlay .po-kbd kbd {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  padding: 1px 4px;
  font-family: inherit;
  font-size: 10px;
  color: #888;
}
@media (max-width: 640px) {
  #pellicule-overlay .po-kbd { display: none; }
}
`

/**
 * @param {string} id
 * @param {string} cssText
 * @returns {void}
 */
function ensureStyle(id, cssText) {
  if (document.getElementById(id)) {
    return
  }

  const style = document.createElement('style')
  style.id = id
  style.textContent = cssText
  document.head.appendChild(style)
}

/**
 * @param {string} icon
 * @returns {Node}
 */
function createIcon(icon) {
  const template = document.createElement('template')
  template.innerHTML = icon
  return template.content.cloneNode(true)
}

/**
 * @param {string | null} audioUrl
 * @returns {HTMLAudioElement | null}
 */
function getPreviewAudio(audioUrl) {
  if (!audioUrl) {
    return null
  }

  const existing = document.getElementById(AUDIO_ID)
  if (existing instanceof HTMLAudioElement) {
    if (existing.src !== audioUrl) {
      existing.src = audioUrl
    }
    return existing
  }

  const audio = document.createElement('audio')
  audio.id = AUDIO_ID
  audio.src = audioUrl
  audio.preload = 'auto'
  audio.crossOrigin = 'anonymous'
  audio.setAttribute('playsinline', 'true')
  audio.style.display = 'none'
  document.body.appendChild(audio)
  return audio
}

/**
 * @param {PreviewOverlayOptions} options
 * @returns {void}
 */
export function setupPreviewOverlay(options) {
  const { version = '', setFrame } = options

  if (document.getElementById(OVERLAY_ID)) {
    return
  }

  const params = new URLSearchParams(window.location.search)
  const fps = Math.max(1, Number.parseInt(params.get('fps') || '30', 10) || 30)
  const totalFrames = Math.max(1, Number.parseInt(params.get('duration') || '90', 10) || 90)
  const audioUrl = params.get('audio-url')
  const audio = getPreviewAudio(audioUrl)
  const frameMs = 1000 / fps

  ensureStyle('pellicule-preview-style', OVERLAY_STYLE)

  const overlay = document.createElement('div')
  overlay.id = OVERLAY_ID
  overlay.innerHTML = `
    <div class="po-top">
      <span class="po-brand-group">
        <span class="po-brand">Pellicule</span>
        <span class="po-version">v${version}</span>
      </span>
      <span class="po-controls">
        <button class="po-btn" id="po-play" title="Play / Pause (Space)"></button>
        <button class="po-btn" id="po-prev" title="Previous frame (←)"></button>
        <button class="po-btn" id="po-next" title="Next frame (→)"></button>
      </span>
      <span class="po-info">
        <span id="po-frame">0</span> / <span id="po-total">${totalFrames - 1}</span>
        &nbsp;·&nbsp;
        <span id="po-time">0.00s</span> / <span id="po-total-time">${(totalFrames / fps).toFixed(2)}s</span>
        &nbsp;·&nbsp;
        <span id="po-fps">${fps}</span>fps
        ${audio ? '&nbsp;·&nbsp;<span class="po-audio">audio sync</span>' : ''}
      </span>
      <span class="po-kbd">
        <kbd>Space</kbd> play
        <kbd>←</kbd><kbd>→</kbd> step
      </span>
    </div>
    <div class="po-bottom">
      <input type="range" class="po-scrubber" id="po-scrubber" min="0" max="${totalFrames - 1}" value="0">
    </div>
  `
  document.body.appendChild(overlay)

  const scrubber = /** @type {HTMLInputElement} */ (overlay.querySelector('#po-scrubber'))
  const frameDisplay = /** @type {HTMLSpanElement} */ (overlay.querySelector('#po-frame'))
  const timeDisplay = /** @type {HTMLSpanElement} */ (overlay.querySelector('#po-time'))
  const playBtn = /** @type {HTMLButtonElement} */ (overlay.querySelector('#po-play'))
  const prevBtn = /** @type {HTMLButtonElement} */ (overlay.querySelector('#po-prev'))
  const nextBtn = /** @type {HTMLButtonElement} */ (overlay.querySelector('#po-next'))

  playBtn.replaceChildren(createIcon(PLAY_ICON))
  prevBtn.replaceChildren(createIcon(PREV_ICON))
  nextBtn.replaceChildren(createIcon(NEXT_ICON))

  let currentFrame = 0
  let playing = false
  let lastTime = 0

  /**
   * @param {number} frame
   * @returns {void}
   */
  function syncUi(frame) {
    scrubber.value = String(frame)
    frameDisplay.textContent = String(frame)
    timeDisplay.textContent = (frame / fps).toFixed(2) + 's'
  }

  /**
   * @param {number} frame
   * @param {{ syncAudio?: boolean }} [options]
   * @returns {void}
   */
  function updateFrame(frame, options = {}) {
    const syncAudio = options.syncAudio !== false
    const nextFrame = Math.max(0, Math.min(totalFrames - 1, frame))

    if (nextFrame === currentFrame) {
      if (audio && syncAudio) {
        audio.currentTime = nextFrame / fps
      }
      syncUi(nextFrame)
      return
    }

    currentFrame = nextFrame
    syncUi(nextFrame)

    if (audio && syncAudio) {
      audio.currentTime = nextFrame / fps
    }

    const pelliculeWindow = /** @type {PelliculeWindow} */ (window)
    const applyFrame = typeof pelliculeWindow.__PELLICULE_SET_FRAME__ === 'function'
      ? pelliculeWindow.__PELLICULE_SET_FRAME__
      : setFrame

    Promise.resolve(applyFrame(nextFrame)).catch((error) => {
      console.error('Pellicule preview frame update failed:', error)
    })
  }

  /**
   * @returns {Promise<boolean>}
   */
  async function startAudioPlayback() {
    if (!audio) {
      return true
    }

    audio.currentTime = currentFrame / fps

    try {
      await audio.play()
      return true
    } catch (error) {
      console.warn('Pellicule preview audio could not start:', error)
      return false
    }
  }

  /**
   * @returns {void}
   */
  function updatePlayButton() {
    playBtn.replaceChildren(createIcon(playing ? PAUSE_ICON : PLAY_ICON))
  }

  /**
   * @returns {Promise<void>}
   */
  async function togglePlay() {
    if (playing) {
      playing = false
      if (audio) {
        audio.pause()
      }
      updatePlayButton()
      return
    }

    const canPlay = await startAudioPlayback()
    if (!canPlay) {
      playing = false
      updatePlayButton()
      return
    }

    playing = true
    updatePlayButton()
    lastTime = performance.now()
    requestAnimationFrame(tick)
  }

  /**
   * @returns {void}
   */
  function restartPlayback() {
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      void audio.play().catch((error) => {
        console.warn('Pellicule preview audio could not restart:', error)
      })
    }
    updateFrame(0, { syncAudio: false })
    lastTime = performance.now()
  }

  /**
   * @param {number} now
   * @returns {void}
   */
  function tick(now) {
    if (!playing) {
      return
    }

    if (audio) {
      const nextFrame = Math.round(audio.currentTime * fps)
      if (nextFrame >= totalFrames) {
        restartPlayback()
      } else {
        updateFrame(nextFrame, { syncAudio: false })
      }
      requestAnimationFrame(tick)
      return
    }

    const delta = now - lastTime
    if (delta >= frameMs) {
      const steps = Math.floor(delta / frameMs)
      const nextFrame = currentFrame + steps
      if (nextFrame >= totalFrames) {
        updateFrame(0)
      } else {
        updateFrame(nextFrame)
      }
      lastTime = now - (delta % frameMs)
    }

    requestAnimationFrame(tick)
  }

  scrubber.addEventListener('input', () => {
    updateFrame(Number.parseInt(scrubber.value, 10))
  })

  playBtn.addEventListener('click', () => {
    void togglePlay()
  })

  prevBtn.addEventListener('click', () => {
    if (playing) {
      void togglePlay().then(() => {
        updateFrame(currentFrame - 1)
      })
      return
    }

    updateFrame(currentFrame - 1)
  })

  nextBtn.addEventListener('click', () => {
    if (playing) {
      void togglePlay().then(() => {
        updateFrame(currentFrame + 1)
      })
      return
    }

    updateFrame(currentFrame + 1)
  })

  document.addEventListener('keydown', (event) => {
    const target = /** @type {HTMLElement | null} */ (event.target)
    if (target?.tagName === 'INPUT' && /** @type {HTMLInputElement} */ (target).type !== 'range') {
      return
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault()
        void togglePlay()
        break
      case 'ArrowLeft':
        event.preventDefault()
        if (playing) {
          void togglePlay().then(() => {
            updateFrame(currentFrame - 1)
          })
        } else {
          updateFrame(currentFrame - 1)
        }
        break
      case 'ArrowRight':
        event.preventDefault()
        if (playing) {
          void togglePlay().then(() => {
            updateFrame(currentFrame + 1)
          })
        } else {
          updateFrame(currentFrame + 1)
        }
        break
      case 'Home':
        event.preventDefault()
        updateFrame(0)
        break
      case 'End':
        event.preventDefault()
        updateFrame(totalFrames - 1)
        break
    }
  })

  syncUi(0)
}
