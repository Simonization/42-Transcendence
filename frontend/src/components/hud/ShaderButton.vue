<script setup lang="ts">
/**
 * ShaderButton - Liquid Metal HUD Button
 * WipEout-style chamfered button with optional WebGL shader effect
 * Uses clip-path for 45° corner cuts, double-hull border via pseudo-element
 */

import { ref, computed } from 'vue'
import { useShader } from '../../composables/useShader'

const props = withDefaults(defineProps<{
  label?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  shader?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'primary',
  size: 'md',
  shader: false,
  disabled: false,
  type: 'button',
})

const emit = defineEmits<{
  click: [e: MouseEvent]
}>()

const shaderContainer = ref<HTMLElement | null>(null)
const isHovered = ref(false)
const isPressed = ref(false)

// Only mount shader if enabled
const { isLoaded: shaderReady, setSpeed } = useShader({
  container: shaderContainer,
  speed: 0.6,
  enabled: props.shader,
})

const handleMouseEnter = () => {
  isHovered.value = true
  if (props.shader) setSpeed(1)
}

const handleMouseLeave = () => {
  isHovered.value = false
  isPressed.value = false
  if (props.shader) setSpeed(0.6)
}

const handleClick = (e: MouseEvent) => {
  if (props.disabled) return
  isPressed.value = true
  if (props.shader) {
    setSpeed(2.4)
    setTimeout(() => setSpeed(isHovered.value ? 1 : 0.6), 300)
  }
  setTimeout(() => { isPressed.value = false }, 150)
  emit('click', e)
}

const sizeClass = computed(() => `shader-btn-${props.size}`)
</script>

<template>
  <button
    class="shader-btn"
    :class="[
      `shader-btn-${variant}`,
      sizeClass,
      { 'shader-btn-hovered': isHovered, 'shader-btn-pressed': isPressed }
    ]"
    :type="type"
    :disabled="disabled"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <!-- Shader layer (behind text) -->
    <div
      v-if="shader"
      ref="shaderContainer"
      class="shader-container shader-layer"
      :class="{ 'shader-loaded': shaderReady }"
    ></div>

    <!-- Text layer -->
    <span class="shader-btn-label">
      <slot>{{ label }}</slot>
    </span>

    <!-- HUD bracket decoration -->
    <span class="shader-btn-bracket shader-btn-bracket-tl"></span>
    <span class="shader-btn-bracket shader-btn-bracket-br"></span>
  </button>
</template>

<style scoped>
.shader-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-display);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  border: none;
  cursor: pointer;
  overflow: hidden;
  transition: all var(--duration-fast) var(--ease-default);
  clip-path: polygon(
    var(--chamfer-sm) 0,
    100% 0,
    100% calc(100% - var(--chamfer-sm)),
    calc(100% - var(--chamfer-sm)) 100%,
    0 100%,
    0 var(--chamfer-sm)
  );
}

.shader-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Sizes */
.shader-btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
}

.shader-btn-md {
  padding: var(--space-2) var(--space-5);
  font-size: var(--text-sm);
}

.shader-btn-lg {
  padding: var(--space-3) var(--space-8);
  font-size: var(--text-base);
}

/* Variants */
.shader-btn-primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}

.shader-btn-primary:hover:not(:disabled) {
  filter: brightness(1.15);
}

.shader-btn-secondary {
  background: transparent;
  color: var(--btn-secondary-text);
  box-shadow: inset 0 0 0 var(--hud-border) var(--btn-secondary-border);
}

.shader-btn-secondary:hover:not(:disabled) {
  background: var(--bg-hover);
  box-shadow: inset 0 0 0 var(--hud-border) var(--accent-primary);
}

.shader-btn-ghost {
  background: transparent;
  color: var(--btn-ghost-text);
}

.shader-btn-ghost:hover:not(:disabled) {
  color: var(--btn-ghost-text-hover);
  background: var(--bg-hover);
}

.shader-btn-danger {
  background: var(--color-error);
  color: white;
}

.shader-btn-danger:hover:not(:disabled) {
  filter: brightness(1.2);
}

/* Pressed state */
.shader-btn-pressed {
  transform: translateY(1px) scale(0.98);
}

/* Shader layer */
.shader-layer {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-default);
  pointer-events: none;
  z-index: 0;
}

.shader-layer.shader-loaded {
  opacity: 1;
}

/* Label above shader */
.shader-btn-label {
  position: relative;
  z-index: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* HUD bracket decorations */
.shader-btn-bracket {
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: var(--accent-primary);
  border-style: solid;
  opacity: 0;
  transition: all var(--duration-fast) var(--ease-default);
  pointer-events: none;
  z-index: 2;
}

.shader-btn-bracket-tl {
  top: 2px;
  left: 2px;
  border-width: var(--hud-border-thick) 0 0 var(--hud-border-thick);
}

.shader-btn-bracket-br {
  bottom: 2px;
  right: 2px;
  border-width: 0 var(--hud-border-thick) var(--hud-border-thick) 0;
}

.shader-btn-hovered .shader-btn-bracket {
  opacity: 0.8;
  width: 12px;
  height: 12px;
}
</style>
