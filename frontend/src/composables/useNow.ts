import { onBeforeUnmount, onMounted, ref } from 'vue'

/** A reactive `Date.now()` that ticks while the component is mounted (default: every second). */
export function useNow(intervalMs = 1000) {
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    now.value = Date.now()
    timer = setInterval(() => {
      now.value = Date.now()
    }, intervalMs)
  })
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
    timer = null
  })

  return now
}
