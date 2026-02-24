<!-- Test Component for Notifications System -->
<!-- generated with copilot -->
<!-- need to remove before push-->
<template>
  <div class="notification-tester">
    <div class="ws-status">
      <div :class="['status-indicator', { connected: wsConnected }]"></div>
      <span>{{ wsConnected ? 'WebSocket connected' : 'WebSocket disconnected' }}</span>
    </div>

    <div class="test-form">
      <label>User ID:</label>
      <input 
        v-model.number="targetUserId" 
        type="number" 
        placeholder="Enter user ID"
        min="1"
      />
      <button @click="sendTestNotification" :disabled="sending || !wsConnected">
        {{ sending ? 'Sending...' : 'Test sended!' }}
      </button>
      <button @click="loadNotificationsFromDb" :disabled="loadingDb" class="load-btn">
        {{ loadingDb ? 'Loading...' : 'Load from DB' }}
      </button>
    </div>

    <!-- Event Log -->
    <div class="events">
      <h3>Events ({{ events.length }})</h3>
      <button @click="events = []" class="clear-btn">Clear notifs</button>
      <div class="event-list">
        <div v-for="(event, idx) in events" :key="idx" :class="['event', event.type]">
          <span class="time">{{ event.time }}</span>
          <span class="message">{{ event.message }}</span>
        </div>
      </div>
    </div>

    <!-- Notifications from DB -->
    <div class="db-notifs">
      <h3>Your Notifications ({{ notificationsFromDb.length }})</h3>
      <div class="notif-list">
        <div v-if="notificationsFromDb.length === 0" class="empty">No notifications</div>
        <div v-for="notif in notificationsFromDb" :key="notif.id" class="notif-item">
          <div class="notif-header">
            <span class="type">{{ notif.type }}</span>
            <span class="title">{{ notif.title || 'No title' }}</span>
            <span class="read" v-if="notif.readAt">✓ read</span>
          </div>
          <div class="notif-body">{{ notif.body }}</div>
          <div class="notif-footer">
            <span class="time">{{ new Date(notif.createdAt).toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useChat } from '@/composables/useChat';
import { notificationsApi } from '@/api/notifications';

const { user } = useAuth();
const { socket, wsConnected, connectSocket } = useChat();

const targetUserId = ref(user.value?.id || 1);
const sending = ref(false);
const events = ref<Array<{ time: string; message: string; type: string }>>([]);
const notificationsFromDb = ref<any[]>([]);
const loadingDb = ref(false);

const addEvent = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const time = new Date().toLocaleTimeString();
  events.value.unshift({ time, message, type });
  if (events.value.length > 50) events.value.pop();
};

const sendTestNotification = async () => {
  if (!targetUserId.value) {
    addEvent('Need user id', 'error');
    return;
  }

  sending.value = true;
  try {
    await notificationsApi.sendNotification({
      userId: targetUserId.value,
      type: 'info',
      title: 'test notif',
      body: `Test message sent to ${targetUserId.value}`,
    });
    addEvent(`notif sent to ${targetUserId.value}`, 'success');
  } catch (error: any) {
    addEvent(`error: ${error.message}`, 'error');
  } finally {
    sending.value = false;
  }
};

const loadNotificationsFromDb = async () => {
  loadingDb.value = true;
  try {
    const response = await notificationsApi.getNotifications({ limit: 20 });
    notificationsFromDb.value = response.notifications;
    addEvent(`Loaded ${response.notifications.length} notifs from DB`, 'success');
  } catch (error: any) {
    addEvent(`Error loading notifs: ${error.message}`, 'error');
  } finally {
    loadingDb.value = false;
  }
};

onMounted(() => {
  // Connect socket if needed
  if (!wsConnected.value) {
    connectSocket();
    addEvent('Websocket connection..', 'info');
  }

  // Load notifications from DB
  loadNotificationsFromDb();

  // Wait for socket connection
  setTimeout(() => {
    if (socket.value?.connected) {
      // Listen for notifications
      socket.value.on('notification', (data: any) => {
        addEvent(`new notif: ${data.body}`, 'success');
      });
      addEvent('websocket ready', 'success');
    } else {
      addEvent('websocket not ready', 'error');
    }
  }, 1000);
});

onUnmounted(() => {
  if (socket.value) {
    socket.value.off('notification');
  }
});
</script>

<style scoped>
.notification-tester {
  max-width: 800px;
  margin: 20px auto;
  padding: 30px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

h2 {
  margin-bottom: 30px;
  text-align: center;
}

.ws-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-bottom: 30px;
  font-weight: bold;
}

.status-indicator {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #dc3545;
  box-shadow: 0 0 10px rgba(220, 53, 69, 0.5);
  transition: all 0.3s ease;
}

.status-indicator.connected {
  background: #28a745;
  box-shadow: 0 0 20px rgba(40, 167, 69, 0.8);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.test-form {
  display: flex;
  gap: 15px;
  align-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-bottom: 30px;
}

.test-form label {
  font-weight: bold;
  white-space: nowrap;
}

.test-form input {
  flex: 1;
  padding: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 16px;
  transition: border-color 0.3s;
}

.test-form input:focus {
  outline: none;
  border-color: #007bff;
}

.test-form button {
  padding: 12px 30px;
  border: none;
  border-radius: 6px;
  background: #007bff;
  color: white;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.test-form button:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
}

.test-form button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.load-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  background: #6c757d;
  color: white;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.load-btn:hover:not(:disabled) {
  background: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
}

/* Events */
.events {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.events h3 {
  margin-bottom: 15px;
  display: inline-block;
}

.clear-btn {
  float: right;
  padding: 5px 15px;
  border: none;
  border-radius: 4px;
  background: rgba(220, 53, 69, 0.8);
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.clear-btn:hover {
  background: rgba(220, 53, 69, 1);
}

.event-list {
  max-height: 400px;
  overflow-y: auto;
  margin-top: 15px;
}

.event {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  display: flex;
  gap: 15px;
  border-left: 4px solid #6c757d;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
}

.event:hover {
  background: rgba(255, 255, 255, 0.1);
}

.event.success {
  border-left-color: #28a745;
  background: rgba(40, 167, 69, 0.1);
}

.event.error {
  border-left-color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
}

.event.info {
  border-left-color: #17a2b8;
  background: rgba(23, 162, 184, 0.1);
}

.event .time {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9em;
  min-width: 80px;
  font-family: monospace;
}

.event .message {
  flex: 1;
}

/* DB Notifications */
.db-notifs {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 20px;
}

.db-notifs h3 {
  margin-bottom: 15px;
}

.notif-list {
  max-height: 500px;
  overflow-y: auto;
}

.empty {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-style: italic;
}

.notif-item {
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-left: 4px solid #007bff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notif-header {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.notif-header .type {
  padding: 2px 10px;
  border-radius: 12px;
  background: rgba(0, 123, 255, 0.3);
  font-size: 12px;
  font-weight: bold;
  color: #64b5f6;
  text-transform: uppercase;
}

.notif-header .title {
  font-weight: bold;
  color: #e0e0e0;
}

.notif-header .read {
  color: #4caf50;
  font-size: 12px;
  font-weight: bold;
}

.notif-body {
  color: #bdbdbd;
  padding-left: 10px;
  border-left: 2px solid rgba(255, 255, 255, 0.2);
}

.notif-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #666;
}
</style>
