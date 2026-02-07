import { ref, onMounted, onUnmounted, type Ref } from 'vue'

interface ShaderParams {
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
  let shaderMount: any = null

  const setSpeed = (speed: number) => {
    shaderMount?.setSpeed?.(speed)
  }

  const destroy = () => {
    if (shaderMount?.destroy) {
      shaderMount.destroy()
      shaderMount = null
    }
  }

  onMounted(async () => {
    if (!enabled) return
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
      isLoaded.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Shader load failed'
      if (import.meta.env.DEV) {
        console.warn('[HUD] Shader not available, falling back to CSS-only:', error.value)
      }
    }
  })

  onUnmounted(() => {
    destroy()
  })

  return {
    isLoaded,
    error,
    setSpeed,
    destroy,
  }
}
