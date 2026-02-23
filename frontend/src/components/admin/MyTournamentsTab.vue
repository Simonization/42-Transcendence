<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const mockMyTournaments: any[] = [] // Empty for empty state
</script>

<template>
  <div class="my-tournaments-content">
    <h2 class="section-title">{{ t('admin.myTournaments') }}</h2>

    <div v-if="mockMyTournaments.length === 0" class="empty-state">
      <div class="empty-state-icon">🏆</div>
      <h3 class="empty-state-title">{{ t('admin.noTournamentsCreated') }}</h3>
      <p class="empty-state-text">{{ t('admin.noTournamentsHint') }}</p>
      <button class="empty-state-cta" disabled aria-disabled="true" :aria-label="t('admin.createFirst')">
        {{ t('admin.createFirst') }}
      </button>
    </div>

    <div v-else class="tournaments-table">
      <table class="table">
        <caption class="visually-hidden">Tournaments you have created with name, game, status, participant count, and actions</caption>
        <thead>
          <tr>
            <th>{{ t('admin.name') }}</th>
            <th>{{ t('admin.game') }}</th>
            <th>{{ t('admin.statusCol') }}</th>
            <th>{{ t('admin.participantsCol') }}</th>
            <th>{{ t('admin.actionsCol') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tournament in mockMyTournaments" :key="tournament.id">
            <td>{{ tournament.name }}</td>
            <td>{{ tournament.game }}</td>
            <td>{{ tournament.status }}</td>
            <td>{{ tournament.participants }}</td>
            <td>
              <button class="action-link">{{ t('admin.editAction') }}</button>
              <button class="action-link">{{ t('common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
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

.my-tournaments-content {
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
</style>
