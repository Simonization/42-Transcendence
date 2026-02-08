<script setup lang="ts">
import { computed } from 'vue'

const stats = computed(() => ({
  activeTournaments: 3,
  totalParticipants: 148,
  matchesToday: 12,
  pendingRegistrations: 7,
}))

const recentActivity = [
  { id: '1', event: 'Spring Championship registered', time: '2 hours ago', icon: '🏆' },
  { id: '2', event: 'New user signup', time: '4 hours ago', icon: '👤' },
  { id: '3', event: 'Match result submitted', time: '6 hours ago', icon: '📊' },
  { id: '4', event: 'Team registration completed', time: '1 day ago', icon: '👥' },
  { id: '5', event: 'Tournament bracket generated', time: '2 days ago', icon: '🏅' },
]
</script>

<template>
  <div class="dashboard-content">
    <h2 class="section-title">DASHBOARD OVERVIEW</h2>

    <!-- Stats Cards Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-info">
          <span class="stat-label">Active Tournaments</span>
          <span class="stat-value">{{ stats.activeTournaments }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <span class="stat-label">Total Participants</span>
          <span class="stat-value">{{ stats.totalParticipants }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <span class="stat-label">Matches Today</span>
          <span class="stat-value">{{ stats.matchesToday }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-info">
          <span class="stat-label">Pending Registrations</span>
          <span class="stat-value">{{ stats.pendingRegistrations }}</span>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <h3 class="quick-actions-title">QUICK ACTIONS</h3>
      <div class="action-buttons">
        <button class="action-btn action-btn-disabled">
          <span class="action-icon">➕</span>
          <span class="action-label">Create Tournament</span>
          <span class="v2-badge-small">V2.0</span>
        </button>
        <button class="action-btn action-btn-disabled">
          <span class="action-icon">👥</span>
          <span class="action-label">Manage Users</span>
          <span class="v2-badge-small">V2.0</span>
        </button>
        <button class="action-btn action-btn-disabled">
          <span class="action-icon">📈</span>
          <span class="action-label">View Reports</span>
          <span class="v2-badge-small">V2.0</span>
        </button>
      </div>
    </div>

    <!-- Recent Activity Feed -->
    <div class="activity-feed">
      <h3 class="activity-feed-title">RECENT ACTIVITY</h3>
      <ul class="activity-list">
        <li v-for="activity in recentActivity" :key="activity.id" class="activity-item">
          <span class="activity-icon">{{ activity.icon }}</span>
          <div class="activity-content">
            <span class="activity-event">{{ activity.event }}</span>
            <span class="activity-time">{{ activity.time }}</span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.section-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  padding-bottom: var(--space-3);
  border-bottom: var(--hud-border) solid var(--glass-border);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  transition: all var(--duration-fast) var(--ease-default);
}

.stat-card:hover {
  background: var(--bg-selected);
  border-color: var(--accent-primary-subtle);
}

.stat-icon {
  font-size: var(--text-4xl);
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stat-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.stat-value {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
  letter-spacing: var(--tracking-wide);
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.quick-actions-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  text-transform: uppercase;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.action-btn:hover:not(:disabled) {
  background: var(--bg-selected);
  border-color: var(--accent-primary-subtle);
}

.action-btn-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-icon {
  font-size: var(--text-2xl);
}

.action-label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--text-secondary);
  text-align: center;
}

.v2-badge-small {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  background: linear-gradient(135deg, var(--color-warning), var(--color-info));
  color: white;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  margin-top: var(--space-1);
}

.activity-feed {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.activity-feed-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  text-transform: uppercase;
}

.activity-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.activity-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  border-left: 3px solid var(--accent-primary);
}

.activity-icon {
  font-size: var(--text-2xl);
  flex-shrink: 0;
}

.activity-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  min-width: 0;
}

.activity-event {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.activity-time {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}
</style>
