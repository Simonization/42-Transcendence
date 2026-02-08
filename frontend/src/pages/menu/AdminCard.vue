<script setup lang="ts">
/**
 * Admin Control Panel - Minimal Viable Admin Interface
 * Displays tournament management dashboard with V2.0 indicators for future features
 */

import { ref } from 'vue'
import DashboardTab from '../../components/admin/DashboardTab.vue'
import CreateTournamentTab from '../../components/admin/CreateTournamentTab.vue'
import MyTournamentsTab from '../../components/admin/MyTournamentsTab.vue'
import ParticipantsTab from '../../components/admin/ParticipantsTab.vue'

type AdminTab = 'dashboard' | 'create' | 'tournaments' | 'participants'

const activeTab = ref<AdminTab>('dashboard')

const tabs: Array<{ id: AdminTab; label: string; icon: string }> = [
  { id: 'dashboard', label: 'DASHBOARD', icon: '📊' },
  { id: 'create', label: 'CREATE', icon: '➕' },
  { id: 'tournaments', label: 'TOURNAMENTS', icon: '🏆' },
  { id: 'participants', label: 'PARTICIPANTS', icon: '👥' },
]
</script>

<template>
  <div class="admin-panel">
    <!-- Admin Header -->
    <header class="admin-header glass-header">
      <div class="admin-header-content">
        <h1 class="admin-title">ADMIN CONTROL PANEL</h1>
        <span class="admin-subtitle">Tournament Management System</span>
      </div>
      <span class="admin-badge v2-badge">BETA</span>
    </header>

    <!-- Tab Navigation -->
    <nav class="admin-tabs glass-panel">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ 'tab-btn-active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Tab Content -->
    <main class="admin-content">
      <DashboardTab v-show="activeTab === 'dashboard'" class="tab-pane glass-panel" />
      <CreateTournamentTab v-show="activeTab === 'create'" class="tab-pane glass-panel" />
      <MyTournamentsTab v-show="activeTab === 'tournaments'" class="tab-pane glass-panel" />
      <ParticipantsTab v-show="activeTab === 'participants'" class="tab-pane glass-panel" />
    </main>
  </div>
</template>

<style scoped>
/* Visually Hidden */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.admin-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* Header */
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 50;
}

.admin-header-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.admin-title {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.admin-subtitle {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

/* Tabs */
.admin-tabs {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow-x: auto;
  scrollbar-width: none;
}

.admin-tabs::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid transparent;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.tab-btn-active {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  background: var(--bg-selected);
}

.tab-icon {
  font-size: var(--text-lg);
}

/* Content */
.admin-content {
  display: flex;
  flex-direction: column;
}

.tab-pane {
  padding: var(--space-6);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  animation: fade-in 200ms ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

/* Dashboard Tab */
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

/* Quick Actions */
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

/* Activity Feed */
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

/* V2.0 Overlay */
.v2-overlay {
  position: relative;
  opacity: 0.6;
  pointer-events: none;
}

.v2-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-8);
  background: var(--bg-tertiary);
  border: var(--hud-border) dashed var(--accent-primary);
  text-align: center;
  margin-bottom: var(--space-6);
}

.v2-banner-icon {
  font-size: var(--text-4xl);
}

.v2-banner-text {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--accent-primary);
}

.v2-banner-desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* Wizard Preview */
.wizard-preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.wizard-steps-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.wizard-step-preview {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--border-subtle);
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--accent-primary);
  color: white;
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.step-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.step-title-preview {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

.step-description-preview {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

/* Mockup */
.mockup-header {
  padding: var(--space-3);
  background: var(--accent-primary);
  color: white;
  font-weight: var(--font-bold);
  text-align: center;
}

.mockup-content {
  padding: var(--space-4);
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.mockup-field {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  padding: var(--space-2);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
}

.mockup-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: var(--hud-border) solid var(--border-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  text-align: center;
  background: var(--bg-tertiary);
  border: var(--hud-border) dashed var(--border-subtle);
}

.empty-state-icon {
  font-size: var(--text-6xl);
  margin-bottom: var(--space-4);
}

.empty-state-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.empty-state-text {
  margin: var(--space-2) 0 var(--space-4) 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.empty-state-cta {
  padding: var(--space-3) var(--space-6);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  cursor: not-allowed;
  opacity: 0.5;
}

/* Tables */
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.table thead {
  background: var(--bg-tertiary);
  border-bottom: var(--hud-border) solid var(--border-subtle);
}

.table th {
  padding: var(--space-3);
  text-align: left;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.table td {
  padding: var(--space-3);
  border-bottom: var(--hud-border) solid var(--border-subtle);
  color: var(--text-secondary);
}

.table tbody tr:hover {
  background: var(--bg-selected);
}

.table-preview {
  opacity: 0.7;
}

.table-row-preview {
  pointer-events: none;
}

.action-link {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  color: var(--accent-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  margin-right: var(--space-1);
  transition: all var(--duration-fast) var(--ease-default);
}

.action-link:hover {
  background: var(--bg-selected);
}

.action-link-preview {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  background: transparent;
  border: var(--hud-border) solid var(--border-subtle);
  cursor: not-allowed;
  margin-right: var(--space-1);
}

/* Participants Preview */
.participants-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.search-container {
  position: relative;
}

.search-input-preview {
  width: 100%;
  padding: var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: not-allowed;
  opacity: 0.7;
}

.search-icon-preview {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

/* Badges */
.admin-badge {
  padding: var(--space-2) var(--space-4);
  background: var(--accent-primary);
  color: white;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
}

.v2-badge {
  background: linear-gradient(135deg, var(--color-warning), var(--color-info));
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

/* Responsive */
@media (max-width: 768px) {
  .admin-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .admin-tabs {
    overflow-x: auto;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .wizard-preview {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    grid-template-columns: repeat(2, 1fr);
  }

  .tab-pane {
    padding: var(--space-4);
  }
}

@media (max-width: 480px) {
  .admin-title {
    font-size: var(--text-lg);
  }

  .section-title {
    font-size: var(--text-base);
  }

  .stat-value {
    font-size: var(--text-2xl);
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }

  .v2-banner {
    padding: var(--space-6);
  }
}
</style>
