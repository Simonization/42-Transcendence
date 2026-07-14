import { ref, type Ref } from 'vue'

export interface LogEntry {
  id: number
  timestamp: number
  type: 'rest' | 'ws'
  method: string
  endpoint: string
  status?: number
  duration?: number
  requestBody?: unknown
  responseBody?: unknown
  direction?: 'in' | 'out'
}

const logs: Ref<LogEntry[]> = ref([])
const selectedLog: Ref<LogEntry | null> = ref(null)
const filter: Ref<'all' | 'rest' | 'ws'> = ref('all')
let nextId = 1

const MAX_ENTRIES = 50

function truncate(data: unknown): unknown {
  try {
    const json = JSON.stringify(data)
    if (json && json.length > 2000) {
      return json.slice(0, 2000) + '\n... [DATA TRUNCATED: TOO LARGE TO DISPLAY]'
    }
    return data
  } catch (e) {
    return '[Unserializable Data]'
  }
}

function addRestLog(entry: Omit<LogEntry, 'id' | 'timestamp' | 'type'>): void {
  logs.value.push({
    ...entry,
    id: nextId++,
    timestamp: Date.now(),
    type: 'rest',
    responseBody: entry.responseBody ? truncate(entry.responseBody) : undefined,
    requestBody: entry.requestBody ? truncate(entry.requestBody) : undefined,
  })
  if (logs.value.length > MAX_ENTRIES) logs.value.shift()
}

function addWsLog(entry: Omit<LogEntry, 'id' | 'timestamp' | 'type'>): void {
  logs.value.push({
    ...entry,
    id: nextId++,
    timestamp: Date.now(),
    type: 'ws',
    responseBody: entry.responseBody ? truncate(entry.responseBody) : undefined,
  })
  if (logs.value.length > MAX_ENTRIES) logs.value.shift()
}

function clearLogs(): void {
  logs.value = []
  selectedLog.value = null
}

export function useApiLogger() {
  return {
    logs,
    selectedLog,
    filter,
    addRestLog,
    addWsLog,
    clearLogs,
  }
}
