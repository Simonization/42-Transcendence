import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import type { ShaderMount } from '@paper-design/shaders'

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
  u_rotation?: number
  u_originX?: number
  u_originY?: number
  u_offsetX?: number
  u_offsetY?: number
  u_worldWidth?: number
  u_worldHeight?: number
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
  // Sizing uniforms have no shader-side defaults: anything omitted arrives as 0, which anchors
  // the shape at the canvas corner instead of its centre and covers only part of the button.
  u_scale: 4,
  u_rotation: 0,
  u_originX: 0.5,
  u_originY: 0.5,
  u_offsetX: 0,
  u_offsetY: 0,
  u_worldWidth: 0,
  u_worldHeight: 0,
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

export function useShader(options: UseShaderOptions) {
  const { container, params = {}, speed: initialSpeed = 0.6, enabled = true } = options
  const isLoaded = ref(false)
  const error = ref<string | null>(null)
  const webglSupported = ref(hasWebGL())
  let shaderMount: ShaderMount | null = null
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
    if (!shaderMount) return
    shaderMount.dispose?.()
    shaderMount = null
    activeShaderCount--
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

    try {
      const { liquidMetalFragmentShader, ShaderMount, ShaderFitOptions, LiquidMetalShapes } =
        await import('@paper-design/shaders')

      if (!container.value) return

      shaderMount = new ShaderMount(
        container.value,
        liquidMetalFragmentShader,
        {
          u_fit: ShaderFitOptions.cover,
          u_shape: LiquidMetalShapes.circle,
          u_isImage: false,
          u_colorBack: [0, 0, 0, 0],
          u_colorTint: [1, 1, 1, 1],
          ...DEFAULT_PARAMS,
          ...params,
        },
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
