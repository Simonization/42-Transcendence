<script setup lang="ts">
/**
 * ShaderSurface - Generic slot-based shader background wrapper
 * Any content can sit on top of a liquid metal shader background.
 * Falls back to CSS gradient when WebGL is unavailable or reduced motion is preferred.
 */

import { ref, computed } from 'vue'
import { useShader, type ShaderParams } from '../../composables/useShader'

const props = withDefaults(defineProps<{
  enabled?: boolean
  params?: ShaderParams
  idleSpeed?: number
  hoverSpeed?: number
  activeSpeed?: number
  fallbackClass?: string
}>(), {
  enabled: true,
  idleSpeed: 0.6,
  hoverSpeed: 1,
  activeSpeed: 2.4,
  fallbackClass: 'shader-fallback-metallic',
})

const shaderContainer = ref<HTMLElement | null>(null)
const isHovered = ref(false)

const { isLoaded, webglSupported, setSpeed, pause, resume, destroy } = useShader({
  container: shaderContainer,
  speed: props.idleSpeed,
  enabled: props.enabled,
  params: props.params,
})

const showShader = computed(() =>
  props.enabled && webglSupported.value && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
)

const handleMouseEnter = () => {
  isHovered.value = true
  if (isLoaded.value) setSpeed(props.hoverSpeed)
}

const handleMouseLeave = () => {
  isHovered.value = false
  if (isLoaded.value) setSpeed(props.idleSpeed)
}

const burst = () => {
  if (!isLoaded.value) return
  setSpeed(props.activeSpeed)
  setTimeout(() => setSpeed(isHovered.value ? props.hoverSpeed : props.idleSpeed), 300)
}

defineExpose({ burst, setSpeed, pause, resume, destroy })
</script>

<template>
  <div
    class="shader-surface"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div
      v-if="showShader"
      ref="shaderContainer"
      class="shader-container shader-surface__bg"
      :class="{ 'shader-loaded': isLoaded }"
    />
    <div v-else :class="fallbackClass" class="shader-surface__bg" />
    <div class="shader-surface__content">
      <slot :is-loaded="isLoaded" :is-hovered="isHovered" :burst="burst" />
    </div>
  </div>
</template>

<style scoped>
.shader-surface {
  position: relative;
  overflow: hidden;
}

.shader-surface__bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-default);
}

.shader-surface__bg.shader-loaded,
.shader-surface__bg.shader-fallback-metallic {
  opacity: 1;
}

.shader-surface__content {
  position: relative;
  z-index: 1;
}
</style>
