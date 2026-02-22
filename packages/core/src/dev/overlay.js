/**
 * Generate the preview overlay HTML/CSS/JS that gets injected into the entry page.
 *
 * This is a self-contained vanilla JS overlay — no Vue dependency.
 * It controls frames via the same `window.__PELLICULE_SET_FRAME__()` interface
 * that Playwright uses during rendering, ensuring WYSIWYG fidelity.
 *
 * @param {object} options
 * @param {number} options.fps
 * @param {number} options.durationInFrames
 * @param {string} options.version
 * @returns {string} Script tag contents to inject
 */
export function generateOverlayScript({ fps = 30, durationInFrames = 90, version = '' }) {
  // Inline SVG icons — consistent sizing across all platforms.
  // These are static, trusted strings generated at build time (not user input).
  const playIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>'
  const pauseIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>'
  const prevIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,3 7,12 19,21"/><rect x="5" y="3" width="3" height="18"/></svg>'
  const nextIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 17,12 5,21"/><rect x="16" y="3" width="3" height="18"/></svg>'

  return `
<style>
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
  /* Responsive: hide keyboard hints on narrow screens */
  @media (max-width: 640px) {
    #pellicule-overlay .po-kbd { display: none; }
  }
</style>
<div id="pellicule-overlay">
  <div class="po-top">
    <span class="po-brand-group">
      <span class="po-brand">Pellicule</span>
      <span class="po-version">v${version}</span>
    </span>
    <span class="po-controls">
      <button class="po-btn" id="po-play" title="Play / Pause (Space)">${playIcon}</button>
      <button class="po-btn" id="po-prev" title="Previous frame (←)">${prevIcon}</button>
      <button class="po-btn" id="po-next" title="Next frame (→)">${nextIcon}</button>
    </span>
    <span class="po-info">
      <span id="po-frame">0</span> / ${durationInFrames - 1}
      &nbsp;·&nbsp;
      <span id="po-time">0.00s</span> / ${(durationInFrames / fps).toFixed(2)}s
      &nbsp;·&nbsp;
      ${fps}fps
    </span>
    <span class="po-kbd">
      <kbd>Space</kbd> play
      <kbd>←</kbd><kbd>→</kbd> step
    </span>
  </div>
  <div class="po-bottom">
    <input type="range" class="po-scrubber" id="po-scrubber" min="0" max="${durationInFrames - 1}" value="0">
  </div>
</div>
<script>
(function() {
  var FPS = ${fps};
  var TOTAL = ${durationInFrames};
  var FRAME_MS = 1000 / FPS;

  var currentFrame = 0;
  var playing = false;
  var lastTime = 0;

  var scrubber = document.getElementById('po-scrubber');
  var frameDisplay = document.getElementById('po-frame');
  var timeDisplay = document.getElementById('po-time');
  var playBtn = document.getElementById('po-play');
  var prevBtn = document.getElementById('po-prev');
  var nextBtn = document.getElementById('po-next');

  // Pre-create the SVG DOM nodes for play/pause toggle (avoids innerHTML)
  var playTemplate = document.createElement('template');
  playTemplate.innerHTML = '${playIcon}';
  var pauseTemplate = document.createElement('template');
  pauseTemplate.innerHTML = '${pauseIcon}';

  function setFrame(f) {
    f = Math.max(0, Math.min(TOTAL - 1, f));
    if (f === currentFrame) return;
    currentFrame = f;
    scrubber.value = f;
    frameDisplay.textContent = f;
    timeDisplay.textContent = (f / FPS).toFixed(2) + 's';
    if (window.__PELLICULE_SET_FRAME__) {
      window.__PELLICULE_SET_FRAME__(f);
    }
  }

  function togglePlay() {
    playing = !playing;
    // Swap the SVG icon by cloning from the template
    playBtn.replaceChildren(
      (playing ? pauseTemplate : playTemplate).content.cloneNode(true)
    );
    if (playing) {
      lastTime = performance.now();
      requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    if (!playing) return;
    var delta = now - lastTime;
    if (delta >= FRAME_MS) {
      var steps = Math.floor(delta / FRAME_MS);
      var nextFrame = currentFrame + steps;
      if (nextFrame >= TOTAL) {
        setFrame(0);
      } else {
        setFrame(nextFrame);
      }
      lastTime = now - (delta % FRAME_MS);
    }
    requestAnimationFrame(tick);
  }

  // Scrubber interaction
  scrubber.addEventListener('input', function() {
    setFrame(parseInt(scrubber.value, 10));
  });

  playBtn.addEventListener('click', togglePlay);
  prevBtn.addEventListener('click', function() { setFrame(currentFrame - 1); });
  nextBtn.addEventListener('click', function() { setFrame(currentFrame + 1); });

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (playing) togglePlay();
        setFrame(currentFrame - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (playing) togglePlay();
        setFrame(currentFrame + 1);
        break;
      case 'Home':
        e.preventDefault();
        setFrame(0);
        break;
      case 'End':
        e.preventDefault();
        setFrame(TOTAL - 1);
        break;
    }
  });
})();
</script>`
}
