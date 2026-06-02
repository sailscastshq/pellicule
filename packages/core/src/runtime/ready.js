/** @typedef {import('../types.js').RenderReadyImageLike} RenderReadyImageLike */
/** @typedef {import('../types.js').RenderReadyOptions} RenderReadyOptions */

/**
 * Wait for the next paint so layout, images, and font changes are visible.
 *
 * @param {(callback: (timestamp: number) => void) => any} requestAnimationFrameRef
 * @returns {Promise<void>}
 */
function requestPaint(requestAnimationFrameRef) {
  return new Promise((resolve) => {
    requestAnimationFrameRef(() => resolve())
  })
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {string} label
 * @param {number} timeoutMs
 * @returns {Promise<T>}
 */
function withTimeout(promise, label, timeoutMs) {
  let timeoutId

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

/**
 * @param {RenderReadyImageLike} image
 * @returns {string}
 */
function describeImage(image) {
  return image?.currentSrc || image?.src || image?.alt || '[image]'
}

/**
 * @param {RenderReadyImageLike} image
 * @returns {Promise<void>}
 */
async function decodeImage(image) {
  if (typeof image.decode !== 'function') {
    return
  }

  try {
    await image.decode()
  } catch (error) {
    if (!(image.complete && image.naturalWidth > 0)) {
      throw error
    }
  }
}

/**
 * @param {RenderReadyImageLike} image
 * @returns {Promise<void>}
 */
async function waitForImage(image) {
  if (image.complete) {
    if (image.naturalWidth === 0) {
      throw new Error(`Image failed to load: ${describeImage(image)}`)
    }

    await decodeImage(image)
    return
  }

  await new Promise((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener('load', onLoad)
      image.removeEventListener('error', onError)
    }

    const onLoad = () => {
      cleanup()
      resolve()
    }

    const onError = () => {
      cleanup()
      reject(new Error(`Image failed to load: ${describeImage(image)}`))
    }

    image.addEventListener('load', onLoad)
    image.addEventListener('error', onError)
  })

  if (image.naturalWidth === 0) {
    throw new Error(`Image failed to load: ${describeImage(image)}`)
  }

  await decodeImage(image)
}

/**
 * Wait until fonts, current DOM images, and two paints have completed.
 *
 * This makes first-frame capture more deterministic for preview and render
 * modes without requiring apps to manually coordinate font and image loading.
 *
 * @param {RenderReadyOptions} [options={}]
 * @returns {Promise<void>}
 */
export async function waitForRenderReady(options = {}) {
  const {
    documentRef = globalThis.document,
    requestAnimationFrameRef = globalThis.requestAnimationFrame?.bind(globalThis) ||
      ((callback) => setTimeout(() => callback(Date.now()), 16)),
    timeoutMs = 10000
  } = options

  await withTimeout((async () => {
    if (documentRef?.fonts?.ready) {
      await documentRef.fonts.ready
    }

    const images = Array.from(documentRef?.images || [])
    await Promise.all(images.map(waitForImage))

    await requestPaint(requestAnimationFrameRef)
    await requestPaint(requestAnimationFrameRef)
  })(), 'Render readiness', timeoutMs)
}
