<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { tournamentsApi } from '../../api/tournaments'
import { TeamStatus, TournamentStatus } from '../../types'
import type { BackendTournament } from '../../types'

const emit = defineEmits<{
  (e: 'navigate-tab', tab: string): void
}>()

const { t } = useI18n()

const tournaments = ref<BackendTournament[]>([])

onMounted(async () => {
  // Stats simply read zero if this fails; the tabs themselves report their own errors.
  tournaments.value = await tournamentsApi.getAll().catch(() => [])
})

const allTeams = computed(() => tournaments.value.flatMap(tr => tr.teams ?? []))

const stats = computed(() => ({
  activeTournaments: tournaments.value.filter(
    tr =>
      tr.status === TournamentStatus.REGISTRATION_OPEN ||
      tr.status === TournamentStatus.ONGOING,
  ).length,
  totalParticipants: allTeams.value.reduce((n, team) => n + (team.members?.length ?? 0), 0),
  pendingRegistrations: allTeams.value.filter(team => team.status === TeamStatus.DRAFT).length,
}))
</script>

<template>
  <div class="dashboard-content">
    <h2 class="section-title">{{ t('admin.dashboardOverview') }}</h2>

    <!-- Stats Cards Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-info">
          <span class="stat-label">{{ t('admin.activeTournaments') }}</span>
          <span class="stat-value">{{ stats.activeTournaments }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <span class="stat-label">{{ t('admin.totalParticipants') }}</span>
          <span class="stat-value">{{ stats.totalParticipants }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-info">
          <span class="stat-label">{{ t('admin.pendingRegistrations') }}</span>
          <span class="stat-value">{{ stats.pendingRegistrations }}</span>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <h3 class="quick-actions-title">{{ t('admin.quickActions') }}</h3>
      <div class="action-buttons">
        <button class="action-btn action-btn-disabled">
          <span class="action-icon">➕</span>
          <span class="action-label">{{ t('admin.createTournament') }}</span>
          <span class="v2-badge-small">V2.0</span>
        </button>
        <button class="action-btn" @click="emit('navigate-tab', 'users')">
          <span class="action-icon">👥</span>
          <span class="action-label">{{ t('admin.manageUsers') }}</span>
        </button>
        <button class="action-btn action-btn-disabled">
          <span class="action-icon">📈</span>
          <span class="action-label">{{ t('admin.viewReports') }}</span>
          <span class="v2-badge-small">V2.0</span>
        </button>
      </div>
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








</style>
