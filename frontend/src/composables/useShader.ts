import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export interface ShaderParams {
  u_repetition?: number
  u_softness?: number
  u_shiftRed?: number
  u_shiftBlue?: number
  u_distortion?: number
  u_contour?: number
  u_angle?: number
  u_scale?: number
  u_shape?: number
  u_offsetX?: number
  u_offsetY?: number
}

interface UseShaderOptions {
  container: Ref<HTMLElement | null>
  params?: ShaderParams
  speed?: number
  enabled?: boolean
}

const DEFAULT_PARAMS: ShaderParams = {
  u_repetition: 4,
  u_softness: 0.5,
  u_shiftRed: 0.3,
  u_shiftBlue: 0.3,
  u_distortion: 0,
  u_contour: 0,
  u_angle: 45,
  u_scale: 8,
  u_shape: 1,
  u_offsetX: 0.1,
  u_offsetY: -0.1,
}

// Global shader instance counter
let activeShaderCount = 0
const MAX_SHADERS = 3

// WebGL detection (cached)
let _webglSupported: boolean | null = null
function hasWebGL(): boolean {
  if (_webglSupported !== null) return _webglSupported
  try {
    const canvas = document.createElement('canvas')
    _webglSupported = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    _webglSupported = false
  }
  return _webglSupported!
}

// Inject global style for shader canvas once
let styleInjected = false
function injectShaderStyle() {
  if (styleInjected) return
  const style = document.createElement('style')
  style.id = 'hud-shader-canvas-style'
  style.textContent = `
    .shader-container canvas {
      width: 100% !important;
      height: 100% !important;
      display: block !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
    }
  `
  document.head.appendChild(style)
  styleInjected = true
}

export function useShader(options: UseShaderOptions) {
  const { container, params = {}, speed: initialSpeed = 0.6, enabled = true } = options
  const isLoaded = ref(false)
  const error = ref<string | null>(null)
  const webglSupported = ref(hasWebGL())
  // ShaderMount from @paper-design/shaders — no exported type available
  let shaderMount: { setSpeed?: (s: number) => void; destroy?: () => void; [k: string]: unknown } | null = null
  let currentSpeed = initialSpeed

  const setSpeed = (speed: number) => {
    currentSpeed = speed
    shaderMount?.setSpeed?.(speed)
  }

  const pause = () => {
    shaderMount?.setSpeed?.(0)
  }

  const resume = () => {
    shaderMount?.setSpeed?.(currentSpeed)
  }

  const destroy = () => {
    if (shaderMount?.destroy) {
      shaderMount.destroy()
      shaderMount = null
      activeShaderCount--
    }
  }

  const handleVisibility = () => {
    if (document.hidden) {
      pause()
    } else {
      resume()
    }
  }

  onMounted(async () => {
    if (!enabled) return

    // Skip if reduced motion preferred
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Skip if no WebGL
    if (!hasWebGL()) return

    // Skip if too many shaders already active
    if (activeShaderCount >= MAX_SHADERS) {
      if (import.meta.env.DEV) {
        console.warn(`[HUD] Shader limit reached (${MAX_SHADERS}), skipping`)
      }
      return
    }

    injectShaderStyle()

    try {
      const { liquidMetalFragmentShader, ShaderMount } = await import('@paper-design/shaders')

      if (!container.value) return

      shaderMount = new ShaderMount(
        container.value,
        liquidMetalFragmentShader,
        { ...DEFAULT_PARAMS, ...params },
        undefined,
        initialSpeed,
      )
      activeShaderCount++
      isLoaded.value = true

      // Pause shader when tab is hidden
      document.addEventListener('visibilitychange', handleVisibility)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Shader load failed'
      if (import.meta.env.DEV) {
        console.warn('[HUD] Shader not available, falling back to CSS-only:', error.value)
      }
    }
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibility)
    destroy()
  })

  return {
    isLoaded,
    error,
    webglSupported,
    setSpeed,
    pause,
    resume,
    destroy,
  }
}
