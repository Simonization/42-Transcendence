<script setup lang="ts">
/**
 * Copies a tournament's share link. The link is the backend's /api/share/t/:id, the address that
 * unfurls with a preview card in Discord/Slack/WhatsApp/X and sends people on to /t/:id.
 */

import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '../../stores/notifications'
import { shareUrl } from '../../api/public'

const props = defineProps<{ tournamentId: number }>()

const { t } = useI18n()
const toasts = useNotificationsStore()

/** Clipboard API needs a secure context; fall back to a hidden textarea elsewhere. */
async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      return ok
    } catch {
      return false
    }
  }
}

async function share() {
  const url = shareUrl(props.tournamentId)
  if (await copy(url)) toasts.success(t('share.copied'))
  else toasts.error(t('share.copyFailed', { url }))
}
</script>

<template>
  <button type="button" class="share-btn" :title="t('share.title')" @click="share">
    {{ t('share.button') }}
  </button>
</template>

<style scoped>
.share-btn {
  flex-shrink: 0;
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-display);
  font-size: var(--t-micro);
  font-weight: var(--font-heavy);
  letter-spacing: var(--track-micro);
  text-transform: uppercase;
  color: var(--accent-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-default);
}

.share-btn:hover {
  background: var(--bg-selected);
}

.share-btn:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
</style>
