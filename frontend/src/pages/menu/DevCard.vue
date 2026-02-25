<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useThemeStore } from '../../stores/theme'
import { getAccessToken, getRefreshToken } from '../../api'
import { useChat } from '@/composables/useChat'
import { useApiLogger } from '@/composables/useApiLogger'

const WS_TEST_TIMEOUT = 3000

const { t } = useI18n()
const { user } = useAuthStore()
const themeStore = useThemeStore()
const { theme, setTheme, themeName } = themeStore
const { uptime } = useChat()
const { logs, selectedLog, filter, clearLogs } = useApiLogger()

// Backend ping
const pingMessage = ref('')
const pingTime = ref<number | null>(null)
const isPinging = ref(false)

const pingBackend = async () => {
  isPinging.value = true
  pingMessage.value = ''
  const start = performance.now()
  try {
    const response = await fetch('/api/')
    const text = await response.text()
    pingTime.value = Math.round(performance.now() - start)
    pingMessage.value = text
  } catch {
    pingTime.value = null
    pingMessage.value = t('dev.connectionFailed')
  } finally {
    isPinging.value = false
  }
}

// WebSocket status
const wsStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
let ws: WebSocket | null = null
let wsTimeout: ReturnType<typeof setTimeout> | null = null

const checkWebSocket = () => {
  wsStatus.value = 'connecting'
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws = new WebSocket(`${protocol}//${window.location.host}/socket.io/?EIO=4&transport=websocket`)
    ws.onopen = () => { wsStatus.value = 'connected' }
    ws.onclose = () => { wsStatus.value = 'disconnected' }
    ws.onerror = () => { wsStatus.value = 'disconnected' }
    // Close after test timeout
    wsTimeout = setTimeout(() => {
      ws?.close()
      ws = null
    }, WS_TEST_TIMEOUT)
  } catch {
    wsStatus.value = 'disconnected'
  }
}

onUnmounted(() => {
  if (wsTimeout) clearTimeout(wsTimeout)
  ws?.close()
})

// Environment
const buildMode = import.meta.env.MODE
const apiBase = '/api'
const isDev = import.meta.env.DEV

// Auth debug
const tokenInfo = computed(() => {
  const access = getAccessToken()
  const refresh = getRefreshToken()
  return {
    hasAccess: !!access,
    hasRefresh: !!refresh,
    accessPreview: access ? `${access.slice(0, 20)}...` : 'none',
  }
})

// Network log
const logListEl = ref<HTMLElement | null>(null)

const filteredLogs = computed(() => {
  if (filter.value === 'all') return logs.value
  return logs.value.filter(l => l.type === filter.value)
})

const selectLog = (log: typeof logs.value[0]) => {
  selectedLog.value = selectedLog.value?.id === log.id ? null : log
}

const formatTime = (ts: number) => {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

const statusClass = (entry: typeof logs.value[0]) => {
  if (!entry.status) return ''
  if (entry.status >= 200 && entry.status < 300) return 'badge-success'
  if (entry.status >= 400) return 'badge-error'
  return 'badge-warning'
}

// Auto-scroll to latest
watch(() => logs.value.length, async () => {
  if (!selectedLog.value && logListEl.value) {
    await nextTick()
    logListEl.value.scrollTop = logListEl.value.scrollHeight
  }
})

</script>

<template>
  <div class="card card-page glass-panel">
    <!-- Backend Ping -->
    <section class="section">
      <h3 class="section-title">{{ $t('dev.backendPing') }}</h3>
      <div class="ping-row">
        <button class="btn btn-secondary btn-sm" @click="pingBackend" :disabled="isPinging">
          {{ isPinging ? $t('dev.pinging') : $t('dev.ping') }}
        </button>
        <span v-if="pingTime !== null" class="ping-time badge badge-success">
          {{ pingTime }}ms
        </span>
      </div>
      <p v-if="pingMessage" class="mono-text">{{ pingMessage }}</p>
      <p class="timer-text">{{ $t('dev.session', { time: uptime }) }}</p>
    </section>

    <!-- Theme Switcher -->
    <section class="section">
      <h3 class="section-title">{{ $t('dev.theme') }}</h3>
      <div class="theme-row">
        <button
          class="theme-btn"
          :class="{ active: theme === 'stellar' }"
          @click="setTheme('stellar')"
        >
          STELLAR
        </button>
        <button
          class="theme-btn"
          :class="{ active: theme === 'dragon' }"
          @click="setTheme('dragon')"
        >
          DRAGON
        </button>
      </div>
      <p class="hint-text">{{ $t('dev.active', { name: themeName }) }}</p>
    </section>

    <!-- Auth Debug -->
    <section class="section">
      <h3 class="section-title">{{ $t('dev.authDebug') }}</h3>
      <div class="debug-grid">
        <div class="debug-row">
          <span class="label-caps">USER</span>
          <span class="mono-text">{{ user?.username || 'none' }}</span>
        </div>
        <div class="debug-row">
          <span class="label-caps">ID</span>
          <span class="mono-text">{{ user?.id || '-' }}</span>
        </div>
        <div class="debug-row">
          <span class="label-caps">ACCESS TOKEN</span>
          <span class="badge" :class="tokenInfo.hasAccess ? 'badge-success' : 'badge-error'">
            {{ tokenInfo.hasAccess ? 'PRESENT' : 'MISSING' }}
          </span>
        </div>
        <div class="debug-row">
          <span class="label-caps">REFRESH TOKEN</span>
          <span class="badge" :class="tokenInfo.hasRefresh ? 'badge-success' : 'badge-error'">
            {{ tokenInfo.hasRefresh ? 'PRESENT' : 'MISSING' }}
          </span>
        </div>
        <div class="debug-row">
          <span class="label-caps">2FA</span>
          <span class="badge" :class="user?.twoFactorEnabled ? 'badge-primary' : 'badge-warning'">
            {{ user?.twoFactorEnabled ? 'ON' : 'OFF' }}
          </span>
        </div>
      </div>
      <details class="debug-details">
        <summary class="debug-summary">{{ $t('dev.rawUserJson') }}</summary>
        <pre class="debug-json">{{ JSON.stringify(user, null, 2) }}</pre>
      </details>
    </section>

    <!-- WebSocket Status -->
    <section class="section">
      <h3 class="section-title">{{ $t('dev.websocket') }}</h3>
      <div class="ping-row">
        <button class="btn btn-secondary btn-sm" @click="checkWebSocket" :disabled="wsStatus === 'connecting'">
          {{ wsStatus === 'connecting' ? $t('dev.testing') : $t('dev.testConnection') }}
        </button>
        <span class="badge" :class="{
          'badge-success': wsStatus === 'connected',
          'badge-warning': wsStatus === 'connecting',
          'badge-error': wsStatus === 'disconnected',
        }">
          {{ wsStatus.toUpperCase() }}
        </span>
      </div>
    </section>

    <!-- Network Log -->
    <section class="section">
      <div class="netlog-header">
        <h3 class="section-title">NETWORK LOG</h3>
        <div class="netlog-controls">
          <button
            v-for="f in (['all', 'rest', 'ws'] as const)"
            :key="f"
            class="filter-btn"
            :class="{ active: filter === f }"
            @click="filter = f"
          >
            {{ f.toUpperCase() }}
          </button>
          <button class="btn btn-ghost btn-sm" @click="clearLogs">CLEAR</button>
        </div>
      </div>

      <div class="netlog-panes">
        <!-- Log list -->
        <div ref="logListEl" class="netlog-list">
          <div v-if="filteredLogs.length === 0" class="netlog-empty">
            No network activity captured yet.
          </div>
          <div
            v-for="entry in filteredLogs"
            :key="entry.id"
            class="netlog-entry"
            :class="{ selected: selectedLog?.id === entry.id }"
            @click="selectLog(entry)"
          >
            <span class="netlog-time">{{ formatTime(entry.timestamp) }}</span>
            <span class="badge" :class="entry.type === 'rest' ? 'badge-rest' : 'badge-ws'">
              {{ entry.type === 'rest' ? entry.method : (entry.direction === 'out' ? 'EMIT' : 'EVENT') }}
            </span>
            <span class="netlog-endpoint">{{ entry.endpoint }}</span>
            <span v-if="entry.status" class="badge badge-sm" :class="statusClass(entry)">
              {{ entry.status }}
            </span>
            <span v-if="entry.duration" class="netlog-duration">{{ entry.duration }}ms</span>
          </div>
        </div>

        <!-- Detail pane -->
        <div v-if="selectedLog" class="netlog-detail">
          <div class="netlog-detail-header">
            <span class="badge" :class="selectedLog.type === 'rest' ? 'badge-rest' : 'badge-ws'">
              {{ selectedLog.type.toUpperCase() }}
            </span>
            <span class="mono-text">{{ selectedLog.method }} {{ selectedLog.endpoint }}</span>
            <span v-if="selectedLog.status" class="badge badge-sm" :class="statusClass(selectedLog)">
              {{ selectedLog.status }}
            </span>
          </div>
          <div v-if="selectedLog.requestBody" class="netlog-detail-section">
            <span class="label-caps">REQUEST</span>
            <pre class="debug-json">{{ JSON.stringify(selectedLog.requestBody, null, 2) }}</pre>
          </div>
          <div v-if="selectedLog.responseBody" class="netlog-detail-section">
            <span class="label-caps">RESPONSE</span>
            <pre class="debug-json">{{ JSON.stringify(selectedLog.responseBody, null, 2) }}</pre>
          </div>
        </div>
      </div>
      <p class="hint-text">{{ filteredLogs.length }} entries (max 50)</p>
    </section>

    <!-- Environment -->
    <section class="section section-last">
      <h3 class="section-title">{{ $t('dev.environment') }}</h3>
      <div class="debug-grid">
        <div class="debug-row">
          <span class="label-caps">BUILD MODE</span>
          <span class="mono-text">{{ buildMode }}</span>
        </div>
        <div class="debug-row">
          <span class="label-caps">API BASE</span>
          <span class="mono-text">{{ apiBase }}</span>
        </div>
        <div class="debug-row">
          <span class="label-caps">DEV MODE</span>
          <span class="badge" :class="isDev ? 'badge-primary' : 'badge-warning'">
            {{ isDev ? 'YES' : 'NO' }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.card-page {
  width: 100%;
  max-width: 720px;
}

.section {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--border-subtle);
}

.section-last {
  border-bottom: none;
}

.section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-secondary);
  margin: 0 0 var(--space-3) 0;
}

.ping-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.ping-time {
  font-family: var(--font-mono);
}

.mono-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.timer-text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: var(--space-2) 0 0 0;
}

.hint-text {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: var(--space-2) 0 0 0;
}

.theme-row {
  display: flex;
  gap: var(--space-2);
}

.theme-btn {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-default);
  -webkit-clip-path: polygon(var(--chamfer-sm) 0, 100% 0, 100% calc(100% - var(--chamfer-sm)), calc(100% - var(--chamfer-sm)) 100%, 0 100%, 0 var(--chamfer-sm));
  clip-path: polygon(var(--chamfer-sm) 0, 100% 0, 100% calc(100% - var(--chamfer-sm)), calc(100% - var(--chamfer-sm)) 100%, 0 100%, 0 var(--chamfer-sm));
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.theme-btn:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.theme-btn.active {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-glow-sm);
}

.debug-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.debug-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-1) 0;
}

.debug-details {
  margin-top: var(--space-3);
}

.debug-summary {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  cursor: pointer;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.debug-summary:hover {
  color: var(--text-secondary);
}

.debug-json {
  margin-top: var(--space-2);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  -webkit-clip-path: polygon(var(--chamfer-xs) 0, 100% 0, 100% calc(100% - var(--chamfer-xs)), calc(100% - var(--chamfer-xs)) 100%, 0 100%, 0 var(--chamfer-xs));
  clip-path: polygon(var(--chamfer-xs) 0, 100% 0, 100% calc(100% - var(--chamfer-xs)), calc(100% - var(--chamfer-xs)) 100%, 0 100%, 0 var(--chamfer-xs));
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Network Log */
.netlog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.netlog-header .section-title {
  margin: 0;
}

.netlog-controls {
  display: flex;
  gap: var(--space-1);
  align-items: center;
}

.filter-btn {
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-tertiary);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.filter-btn:hover {
  color: var(--text-secondary);
}

.filter-btn.active {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.netlog-panes {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.netlog-list {
  max-height: 240px;
  overflow-y: auto;
  background: var(--bg-tertiary);
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.netlog-empty {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-align: center;
  padding: var(--space-6) 0;
}

.netlog-entry {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  cursor: pointer;
  font-size: var(--text-xs);
  transition: background var(--duration-fast) var(--ease-default);
}

.netlog-entry:hover {
  background: var(--bg-secondary);
}

.netlog-entry.selected {
  background: var(--accent-primary-subtle);
}

.netlog-time {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  min-width: 80px;
}

.netlog-endpoint {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.netlog-duration {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.badge-rest {
  background: var(--color-info, #3b82f6);
  color: var(--bg-primary);
  font-size: 9px;
  padding: 1px var(--space-1);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
}

.badge-ws {
  background: var(--color-success);
  color: var(--bg-primary);
  font-size: 9px;
  padding: 1px var(--space-1);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
}

.badge-sm {
  font-size: 9px;
  padding: 1px var(--space-1);
}

.netlog-detail {
  background: var(--bg-tertiary);
  padding: var(--space-3);
  max-height: 300px;
  overflow-y: auto;
}

.netlog-detail-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
}

.netlog-detail-section {
  margin-bottom: var(--space-3);
}

.netlog-detail-section .label-caps {
  display: block;
  margin-bottom: var(--space-1);
}

.netlog-detail-section .debug-json {
  margin-top: 0;
  max-height: 150px;
}
</style>
