<script setup lang="ts">
/**
 * Create Tournament Tab
 * Admin form to create a new tournament with game selection and phase configuration
 */

import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { gamesApi } from '../../api/games'
import { tournamentsApi } from '../../api/tournaments'
import { useNotificationsStore } from '../../stores/notifications'
import { PhaseType } from '../../types'
import type { BackendGame, CreateTournamentDto } from '../../types'

const { t } = useI18n()
const notifications = useNotificationsStore()

const games = ref<BackendGame[]>([])
const isLoadingGames = ref(false)
const isSubmitting = ref(false)

// Add-game inline form
const showAddGame = ref(false)
const newGameName = ref('')
const newGameTeamCount = ref(2)
const newGameTeamSize = ref(1)
const isCreatingGame = ref(false)
const canCreateGame = computed(() => newGameName.value.trim().length >= 2)

const handleAddGame = async () => {
  if (!canCreateGame.value) return
  isCreatingGame.value = true
  try {
    const created = await gamesApi.create({
      name: newGameName.value.trim(),
      team_count: newGameTeamCount.value,
      team_size: newGameTeamSize.value,
    })
    games.value.push(created)
    selectedGameId.value = created.id
    newGameName.value = ''
    newGameTeamCount.value = 2
    newGameTeamSize.value = 1
    showAddGame.value = false
    notifications.success(t('teams.gameAdded'), 3000)
  } catch {
    notifications.error(t('teams.addGameFailed'), 4000)
  } finally {
    isCreatingGame.value = false
  }
}

// Form fields
const name = ref('')
const description = ref('')
const maxParticipants = ref(16)
const selectedGameId = ref<number | null>(null)
const phaseType = ref<PhaseType>(PhaseType.SINGLE_ELIMINATION)

const selectedGame = computed(() =>
  games.value.find(g => g.id === selectedGameId.value) ?? null
)

const teamInfo = computed(() => {
  if (!selectedGame.value) return null
  const g = selectedGame.value
  return {
    teamCount: g.teamCount ?? 2,
    teamSize: g.teamSize ?? 1,
    label: g.teamSize === 1
      ? `${g.teamCount} ${t('teams.players')}`
      : `${g.teamCount} ${t('teams.teams')} × ${g.teamSize} ${t('teams.players')}`,
  }
})

const canSubmit = computed(() =>
  name.value.trim().length >= 3 &&
  selectedGameId.value !== null &&
  maxParticipants.value >= 2
)

onMounted(async () => {
  isLoadingGames.value = true
  try {
    games.value = await gamesApi.getAll()
  } catch {
    notifications.error(t('teams.loadGamesFailed'), 3000)
  } finally {
    isLoadingGames.value = false
  }
})

const handleSubmit = async () => {
  if (!canSubmit.value || !selectedGameId.value) return
  isSubmitting.value = true

  const dto: CreateTournamentDto = {
    name: name.value.trim(),
    description: description.value.trim() || undefined,
    max_participants: maxParticipants.value,
    phases: [{
      order: 1,
      type: phaseType.value,
      game_id: selectedGameId.value,
    }],
  }

  try {
    await tournamentsApi.create(dto)
    notifications.success(t('teams.tournamentCreated'), 4000)
    // Reset form
    name.value = ''
    description.value = ''
    maxParticipants.value = 16
    selectedGameId.value = null
    phaseType.value = PhaseType.SINGLE_ELIMINATION
  } catch {
    notifications.error(t('teams.tournamentCreateFailed'), 4000)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="create-tournament-content">
    <h2 class="section-title">{{ t('admin.createTournamentTitle') }}</h2>

    <form class="tournament-form" @submit.prevent="handleSubmit">
      <!-- Name -->
      <div class="form-group">
        <label for="t-name" class="form-label">{{ t('tournament.name') }} *</label>
        <input
          id="t-name"
          v-model="name"
          type="text"
          class="form-input"
          :placeholder="t('tournament.namePlaceholder')"
          maxlength="100"
          minlength="3"
          required
        />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="t-desc" class="form-label">{{ t('tournament.description') }}</label>
        <textarea
          id="t-desc"
          v-model="description"
          class="form-input form-textarea"
          :placeholder="t('tournament.descriptionPlaceholder')"
          rows="3"
        ></textarea>
      </div>

      <!-- Game Selector -->
      <div class="form-group">
        <label class="form-label">{{ t('tournament.game') }} *</label>
        <div v-if="isLoadingGames" class="loading-text">{{ t('common.loading') }}</div>
        <template v-else>
          <div v-if="games.length === 0" class="empty-text">{{ t('teams.noGamesAvailable') }}</div>
          <div v-else class="game-grid">
            <label
              v-for="game in games"
              :key="game.id"
              class="game-card"
              :class="{ 'game-card-selected': selectedGameId === game.id }"
            >
              <input
                type="radio"
                name="game"
                :value="game.id"
                v-model="selectedGameId"
                class="visually-hidden"
              />
              <span class="game-name">{{ game.name }}</span>
              <span class="game-info">
                {{ game.teamSize === 1
                  ? `${game.teamCount ?? 2}P`
                  : `${game.teamCount ?? 2}×${game.teamSize}` }}
              </span>
            </label>
          </div>
          <!-- Add Game toggle (only when games exist) -->
          <button
            v-if="games.length > 0"
            type="button"
            class="add-game-toggle"
            @click="showAddGame = !showAddGame"
          >{{ showAddGame ? '−' : '+' }} {{ t('teams.addGame') }}</button>
          <!-- Add Game inline form (auto-open when empty) -->
          <div v-if="showAddGame || games.length === 0" class="add-game-form">
            <div class="add-game-row">
              <input
                v-model="newGameName"
                type="text"
                class="form-input add-game-name-input"
                :placeholder="t('teams.gameNamePlaceholder')"
                maxlength="50"
                @keydown.enter.prevent="handleAddGame"
              />
              <input
                v-model.number="newGameTeamCount"
                type="number"
                class="form-input add-game-num"
                :title="t('teams.teamCount')"
                min="2"
                max="32"
              />
              <input
                v-model.number="newGameTeamSize"
                type="number"
                class="form-input add-game-num"
                :title="t('teams.teamSize')"
                min="1"
                max="16"
              />
              <button
                type="button"
                class="add-game-submit"
                :disabled="!canCreateGame || isCreatingGame"
                @click="handleAddGame"
              >{{ isCreatingGame ? '…' : t('teams.addGame') }}</button>
            </div>
          </div>
        </template>
        <!-- Team info -->
        <div v-if="teamInfo" class="team-info-banner">
          {{ teamInfo.label }}
        </div>
      </div>

      <!-- Max Participants -->
      <div class="form-group">
        <label for="t-max" class="form-label">{{ t('tournament.maxPlayers') }}</label>
        <input
          id="t-max"
          v-model.number="maxParticipants"
          type="number"
          class="form-input form-input-narrow"
          min="2"
          max="256"
        />
      </div>

      <!-- Phase Type -->
      <div class="form-group">
        <label class="form-label">{{ t('tournament.format') }}</label>
        <div class="format-options">
          <label class="format-option" :class="{ 'format-selected': phaseType === PhaseType.SINGLE_ELIMINATION }">
            <input type="radio" v-model="phaseType" :value="PhaseType.SINGLE_ELIMINATION" class="visually-hidden" />
            <span>Single Elimination</span>
          </label>
          <label class="format-option" :class="{ 'format-selected': phaseType === PhaseType.DOUBLE_ELIMINATION }">
            <input type="radio" v-model="phaseType" :value="PhaseType.DOUBLE_ELIMINATION" class="visually-hidden" />
            <span>Double Elimination</span>
          </label>
          <label class="format-option" :class="{ 'format-selected': phaseType === PhaseType.ROUND_ROBIN }">
            <input type="radio" v-model="phaseType" :value="PhaseType.ROUND_ROBIN" class="visually-hidden" />
            <span>Round Robin</span>
          </label>
        </div>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        class="submit-btn"
        :disabled="!canSubmit || isSubmitting"
      >
        {{ isSubmitting ? t('registration.submitting') : t('admin.createTournamentTitle') }}
      </button>
    </form>
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

.create-tournament-content {
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

.tournament-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-primary);
  text-transform: uppercase;
}

.form-input {
  padding: var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-primary);
  transition: border-color var(--duration-fast) var(--ease-default);
}

.form-input::placeholder { color: var(--text-tertiary); }
.form-input:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 0;
  border-color: var(--accent-primary);
}

.form-textarea { resize: vertical; min-height: 60px; }
.form-input-narrow { max-width: 120px; }

.loading-text,
.empty-text {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  padding: var(--space-3);
}

/* Game Grid */
.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-2);
}

.game-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  text-align: center;
}

.game-card:hover {
  border-color: var(--accent-primary);
  background: var(--bg-hover);
}

.game-card-selected {
  border-color: var(--accent-primary);
  background: var(--bg-selected);
  box-shadow: 0 0 12px var(--accent-primary-subtle);
}

.game-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.game-info {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.team-info-banner {
  padding: var(--space-2) var(--space-3);
  background: var(--bg-selected);
  border: var(--hud-border) solid var(--accent-primary-subtle);
  font-size: var(--text-sm);
  color: var(--accent-primary);
  font-family: var(--font-mono);
  letter-spacing: var(--tracking-wider);
}

/* Format Options */
.format-options {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.format-option {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.format-option:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.format-selected {
  border-color: var(--accent-primary);
  background: var(--bg-selected);
  color: var(--accent-primary);
}

/* Submit */
.submit-btn {
  align-self: flex-start;
  padding: var(--space-3) var(--space-8);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.submit-btn:not(:disabled):hover {
  background: var(--bg-selected);
  color: var(--accent-primary);
  box-shadow: 0 0 12px var(--accent-primary-subtle);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Add Game */
.add-game-toggle {
  margin-top: var(--space-2);
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-subtle);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-default), border-color var(--duration-fast) var(--ease-default);
}
.add-game-toggle:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.add-game-form {
  margin-top: var(--space-2);
}

.add-game-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.add-game-name-input {
  flex: 1;
  min-width: 0;
}

.add-game-num {
  width: 56px;
  text-align: center;
  padding: var(--space-3) var(--space-2);
}

.add-game-submit {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--accent-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--duration-fast) var(--ease-default);
}
.add-game-submit:not(:disabled):hover {
  background: var(--bg-selected);
}
.add-game-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .game-grid { grid-template-columns: repeat(2, 1fr); }
  .format-options { flex-direction: column; }
  .add-game-row { flex-wrap: wrap; }
  .add-game-name-input { width: 100%; }
}
</style>
