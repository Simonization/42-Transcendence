<script setup lang="ts">
/**
 * HexAvatar - Hexagonal Avatar Component
 * WipEout-style hexagonal clip-path with accent border and online indicator
 */

import { computed } from 'vue'

const props = withDefaults(defineProps<{
  src?: string | null
  alt?: string
  initials?: string
  size?: 'sm' | 'md' | 'lg'
  online?: boolean
}>(), {
  size: 'md',
  online: false,
})

const sizeMap = { sm: 32, md: 40, lg: 64 }
const fontSize = { sm: 'var(--text-xs)', md: 'var(--text-sm)', lg: 'var(--text-xl)' }

const px = computed(() => `${sizeMap[props.size]}px`)
const textSize = computed(() => fontSize[props.size])

const displayInitials = computed(() => {
  if (props.initials) return props.initials.slice(0, 2).toUpperCase()
  if (props.alt) return props.alt.slice(0, 2).toUpperCase()
  return '??'
})
</script>

<template>
  <div class="hex-avatar-wrapper" :style="{ width: px, height: px }">
    <!-- Outer hex border (slightly larger) -->
    <div class="hex-border"></div>
    <!-- Inner hex content -->
    <div class="hex-content">
      <img v-if="src" :src="src" :alt="alt" class="hex-img" />
      <span v-else class="hex-initials" :style="{ fontSize: textSize }">{{ displayInitials }}</span>
    </div>
    <!-- Online indicator (diamond shaped) -->
    <span v-if="online" class="hex-online"></span>
  </div>
</template>

<style scoped>
.hex-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.hex-border {
  position: absolute;
  inset: -2px;
  background: var(--accent-primary);
  opacity: 0.4;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  transition: opacity var(--duration-fast) var(--ease-default);
}

.hex-avatar-wrapper:hover .hex-border {
  opacity: 0.8;
}

.hex-content {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--accent-primary-subtle);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hex-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hex-initials {
  font-weight: var(--font-bold);
  color: var(--accent-primary);
  letter-spacing: var(--tracking-wide);
}

/* Diamond online indicator */
.hex-online {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background: var(--color-success);
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  box-shadow: 0 0 6px var(--color-success);
}
</style>
