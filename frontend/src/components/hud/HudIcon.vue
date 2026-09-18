<script setup lang="ts">
/**
 * Instrument pictograms.
 *
 * One stroke weight across the whole set, no fills, currentColor only. Emoji were previously
 * used here: nine multicoloured objects that dominated every screen and broke the
 * one-accent-per-screen rule this design depends on. See ../../DESIGN.md.
 */

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
  }>(),
  { size: 18 },
)

// 20x20 grid, geometric forms only — these read as instrument glyphs, not illustrations.
const PATHS: Record<string, string> = {
  home: 'M2 10 L10 3 L18 10 M5 8.5 V17 H15 V8.5',
  user: 'M10 4 a3.2 3.2 0 1 0 0 6.4 a3.2 3.2 0 1 0 0 -6.4 M3.5 17 c0-3.3 2.9-5 6.5-5 s6.5 1.7 6.5 5',
  friend: 'M7 5 a2.6 2.6 0 1 0 0 5.2 a2.6 2.6 0 1 0 0 -5.2 M1.5 16.5 c0-2.8 2.4-4.2 5.5-4.2 s5.5 1.4 5.5 4.2 M13.5 5.4 a2.6 2.6 0 0 1 0 4.9 M14.5 12.5 c2.4.4 4 1.7 4 4',
  chat: 'M2.5 4 H17.5 V13 H9 L4.5 16.5 V13 H2.5 Z',
  tournament: 'M4 3 H16 V6.5 a6 6 0 0 1 -12 0 Z M10 12.5 V16 M6.5 17 H13.5',
  history: 'M3 17 V9 H6.5 V17 M8.25 17 V4 H11.75 V17 M13.5 17 V11.5 H17 V17',
  brackets: 'M2.5 4 H7 V9 H11 V4.5 M2.5 16 H7 V11 H11 V15.5 M11 10 H17.5',
  orgs: 'M3.5 17 V3 H12 V17 M12 17 V8 H16.5 V17 M6 6 H9.5 M6 9.5 H9.5 M6 13 H9.5',
  admin: 'M2.5 7 H17.5 M2.5 13.5 H17.5 M11 5.2 h3.2 v3.6 h-3.2 z M5 11.7 h3.2 v3.6 h-3.2 z',
  search: 'M8.8 3.5 a5.3 5.3 0 1 0 0 10.6 a5.3 5.3 0 1 0 0 -10.6 M12.8 12.8 L17 17',
  bell: 'M6 8.5 a4 4 0 0 1 8 0 c0 4 1.5 5 1.5 5 H4.5 s1.5-1 1.5-5 M8.3 16 a1.9 1.9 0 0 0 3.4 0',
}
</script>

<template>
  <svg
    class="hud-icon"
    :width="props.size"
    :height="props.size"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.4"
    stroke-linecap="square"
    stroke-linejoin="miter"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="PATHS[props.name] ?? PATHS.home" />
  </svg>
</template>

<style scoped>
.hud-icon {
  display: block;
  flex: none;
}
</style>
