/**
 * Shared JSDoc typedefs for Pellicule.
 *
 * These keep editor autocomplete and JS diagnostics useful without turning the
 * package into a TypeScript codebase. The public shapes stay intentionally
 * small and ergonomic so they work well both inside Pellicule and in apps that
 * consume it from JavaScript.
 *
 * @typedef {'vite'|'rsbuild'} BundlerName
 *
 * @typedef {'laravel'|'vite'|'rsbuild'|'shipwright'|'nuxt'|'quasar'|'standalone'} ProjectType
 *
 * @typedef {Object} VideoConfig
 * @property {number} fps
 * @property {number} durationInFrames
 * @property {number} width
 * @property {number} height
 *
 * @typedef {Object} VideoConfigInput
 * @property {number} [fps]
 * @property {number} [durationInFrames]
 * @property {number} [durationInSeconds]
 * @property {number} [width]
 * @property {number} [height]
 * @property {string} [audio]
 *
 * @typedef {Object} VideoConfigOverrides
 * @property {number|string|null} [fps]
 * @property {number|string|null} [durationInFrames]
 * @property {number|string|null} [durationInSeconds]
 * @property {number|string|null} [width]
 * @property {number|string|null} [height]
 * @property {string|null} [audio]
 *
 * @typedef {VideoConfigInput & Record<string, unknown>} VideoConfigLiteral
 *
 * @typedef {Object} CliVideoConfigFlags
 * @property {number} [duration]
 * @property {number} [fps]
 * @property {number} [width]
 * @property {number} [height]
 *
 * @typedef {(t: number) => number} EasingFunction
 *
 * @typedef {Object} InterpolationOptions
 * @property {EasingFunction} [easing]
 * @property {'clamp'|'extend'} [extrapolate]
 *
 * @typedef {Object} SequenceStep
 * @property {number} start
 * @property {number} end
 * @property {number} from
 * @property {number} to
 *
 * @typedef {Object} SequenceContext
 * @property {import('vue').ComputedRef<number>} localFrame
 * @property {import('vue').ComputedRef<number>} progress
 * @property {import('vue').ComputedRef<boolean>} isActive
 *
 * @typedef {SequenceContext & {
 *   from: number,
 *   durationInFrames: number
 * }} SequenceProviderContext
 *
 * @typedef {(config: VideoConfigInput) => void} ComponentConfigHandler
 *
 * @typedef {Window & typeof globalThis & {
 *   __PELLICULE_SET_FRAME__?: (frame: number) => Promise<void>,
 *   __PELLICULE_READY__?: boolean,
 *   __PELLICULE_ERROR__?: string,
 *   __PELLICULE_COMPONENT_CONFIG__?: VideoConfigInput | null,
 *   __PELLICULE_ON_CONFIG__?: ComponentConfigHandler | null
 * }} PelliculeWindow
 *
 * @typedef {Object} RenderReadyImageLike
 * @property {string} [alt]
 * @property {string} [src]
 * @property {string} [currentSrc]
 * @property {boolean} complete
 * @property {number} naturalWidth
 * @property {(() => Promise<void>)} [decode]
 * @property {(type: string, listener: () => void) => void} addEventListener
 * @property {(type: string, listener?: () => void) => void} removeEventListener
 *
 * @typedef {Object} RenderReadyDocumentLike
 * @property {{ ready: Promise<unknown> }} [fonts]
 * @property {ArrayLike<RenderReadyImageLike>} [images]
 *
 * @typedef {Object} RenderReadyOptions
 * @property {RenderReadyDocumentLike} [documentRef]
 * @property {(callback: (timestamp: number) => void) => any} [requestAnimationFrameRef]
 * @property {number} [timeoutMs]
 *
 * @typedef {Object} PelliculeProjectConfig
 * @property {string} [serverUrl]
 * @property {string} [videosDir]
 * @property {string} [outDir]
 * @property {BundlerName} [bundler]
 *
 * @typedef {Object} DetectedProject
 * @property {ProjectType} projectType
 * @property {BundlerName} bundler
 * @property {string|null} configFile
 * @property {string} videosDir
 * @property {boolean} byos
 * @property {string|null} [defaultServerUrl]
 *
 * @typedef {{ resolved: string }} InputResolutionSuccess
 * @typedef {{ error: string, searched: string[] }} InputResolutionFailure
 * @typedef {InputResolutionSuccess | InputResolutionFailure} InputResolutionResult
 *
 * @typedef {() => Promise<void>} AsyncCleanup
 *
 * @typedef {Object} BundlerServerResult
 * @property {object} server
 * @property {string} url
 * @property {AsyncCleanup} cleanup
 * @property {string} tempDir
 *
 * @typedef {Object} BundlerServerOptions
 * @property {string} input
 * @property {number} width
 * @property {number} height
 * @property {BundlerName} [bundler]
 * @property {string|null} [configFile]
 * @property {ProjectType} [projectType]
 * @property {boolean} [preview]
 * @property {number} [fps]
 * @property {number} [durationInFrames]
 * @property {string} [version]
 *
 * @typedef {Object} DevServerOptions
 * @property {string} input
 * @property {number} [fps]
 * @property {number} [durationInFrames]
 * @property {number} [width]
 * @property {number} [height]
 * @property {string|null} [serverUrl]
 * @property {BundlerName} [bundler]
 * @property {boolean} [syncConfigWithComponent]
 * @property {string|null} [configFile]
 * @property {ProjectType} [projectType]
 * @property {string} [version]
 *
 * @typedef {Object} DevServerResult
 * @property {string} url
 * @property {AsyncCleanup} cleanup
 *
 * @typedef {Object} RenderProgress
 * @property {number} frame
 * @property {number} total
 * @property {number} fps
 *
 * @typedef {(progress: RenderProgress) => void} ProgressCallback
 *
 * @typedef {Object} RenderVideoOptions
 * @property {string} input
 * @property {number} fps
 * @property {number} durationInFrames
 * @property {number} [startFrame]
 * @property {number} [endFrame]
 * @property {number} [width]
 * @property {number} [height]
 * @property {ProgressCallback} [onProgress]
 * @property {boolean} [silent]
 * @property {string|null} [serverUrl]
 * @property {BundlerName} [bundler]
 * @property {string|null} [configFile]
 * @property {ProjectType} [projectType]
 *
 * @typedef {Object} RenderVideoResult
 * @property {string} framesDir
 * @property {number} totalFrames
 * @property {AsyncCleanup} cleanup
 *
 * @typedef {Object} EncodeVideoOptions
 * @property {string} framesDir
 * @property {string} [output]
 * @property {number} [fps]
 * @property {string|null} [audio]
 * @property {boolean} [silent]
 *
 * @typedef {RenderVideoOptions & {
 *   output?: string,
 *   audio?: string|null,
 *   silent?: boolean
 * }} RenderToMp4Options
 *
 * @typedef {(config: VideoConfigInput) => VideoConfigInput} DefineVideoConfig
 */

export {}
