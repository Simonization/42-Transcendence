<script setup lang="ts">
/**
 * Create Tournament Tab
 * Admin form to create a tournament with up to 2 configurable phases and a scheduled start date.
 */

import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { gamesApi } from '../../api/games'
import { tournamentsApi } from '../../api/tournaments'
import { useNotificationsStore } from '../../stores/notifications'
import { PhaseType } from '../../types'
import type { BackendGame, CreateTournamentDto, CreatePhaseDto } from '../../types'

const emit = defineEmits<{ 'tournament-created': [] }>()

const { t } = useI18n()
const notifications = useNotificationsStore()

// ─── Games ─────────────────────────────────────────────────────────────────

const games = ref<BackendGame[]>([])
const isLoadingGames = ref(false)

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
    // Auto-select the new game on all phases that have none selected
    phases.value.forEach(p => { if (!p.game_id) p.game_id = created.id })
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

onMounted(async () => {
  isLoadingGames.value = true
  try {
    const result = await gamesApi.getAll()
    games.value = result
    // If no games exist, open the add-game form immediately
    if (result.length === 0) showAddGame.value = true
  } catch {
    games.value = []
    showAddGame.value = true
  } finally {
    isLoadingGames.value = false
  }
})

// ─── Phase helpers ──────────────────────────────────────────────────────────

interface PhaseForm {
  type: PhaseType
  game_id: number | null
  teams_limit_start: number
  teams_limit_end: number
  swiss_rounds: number
  group_size: number
  group_winners_count: number
}

function makePhase(order: number): PhaseForm {
  return {
    type: PhaseType.SINGLE_ELIMINATION,
    game_id: null,
    teams_limit_start: order === 1 ? 16 : 8,
    teams_limit_end: order === 1 ? 8 : 1,
    swiss_rounds: 3,
    group_size: 4,
    group_winners_count: 2,
  }
}

const PHASE_TYPES: { value: PhaseType; label: string }[] = [
  { value: PhaseType.SINGLE_ELIMINATION, label: 'Single Elim.' },
  { value: PhaseType.DOUBLE_ELIMINATION, label: 'Double Elim.' },
  { value: PhaseType.ROUND_ROBIN, label: 'Round Robin' },
  { value: PhaseType.SWISS, label: 'Swiss' },
  { value: PhaseType.GROUP_STAGE, label: 'Group Stage' },
]

function needsSwissRounds(type: PhaseType) { return type === PhaseType.SWISS }
function needsGroupFields(type: PhaseType) { return type === PhaseType.GROUP_STAGE }

// ─── Form state ─────────────────────────────────────────────────────────────

const name = ref('')
const description = ref('')
const maxParticipants = ref(16)
const scheduledAt = ref('')
const twoPhases = ref(false)
const isSubmitting = ref(false)
// Only show validation errors after first submit attempt
const hasAttemptedSubmit = ref(false)

const phases = ref<PhaseForm[]>([makePhase(1)])

function toggleSecondPhase() {
  twoPhases.value = !twoPhases.value
  if (twoPhases.value) {
    const p2 = makePhase(2)
    p2.teams_limit_start = phases.value[0].teams_limit_end
    // Inherit same game as phase 1 if already selected
    if (phases.value[0].game_id) p2.game_id = phases.value[0].game_id
    phases.value.push(p2)
  } else {
    phases.value = [phases.value[0]]
  }
}

function syncPhaseLink() {
  if (phases.value.length >= 2) {
    phases.value[1].teams_limit_start = phases.value[0].teams_limit_end
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

const phaseErrors = computed<string[]>(() => {
  const errors: string[] = []
  for (let i = 0; i < phases.value.length; i++) {
    const p = phases.value[i]
    if (!p.game_id) errors.push(t('admin.phaseGameRequired', { n: i + 1 }))
    if (p.teams_limit_start < 2) errors.push(t('admin.phaseTeamsLimitStartMin', { n: i + 1 }))
    if (p.teams_limit_end < 1) errors.push(t('admin.phaseTeamsLimitEndMin', { n: i + 1 }))
    if (p.teams_limit_end >= p.teams_limit_start)
      errors.push(t('admin.phaseTeamsLimitEndLtStart', { n: i + 1 }))
    if (needsSwissRounds(p.type) && p.swiss_rounds < 1)
      errors.push(t('admin.phaseSwissRoundsRequired', { n: i + 1 }))
    if (needsGroupFields(p.type) && (p.group_size < 2 || p.group_winners_count < 1))
      errors.push(t('admin.phaseGroupFieldsRequired', { n: i + 1 }))
  }
  if (phases.value.length === 2) {
    if (phases.value[0].teams_limit_end !== phases.value[1].teams_limit_start)
      errors.push(t('admin.phaseChainMismatch'))
  }
  return errors
})

const canSubmit = computed(() =>
  name.value.trim().length >= 3 &&
  maxParticipants.value >= 2 &&
  phaseErrors.value.length === 0
)

// ─── Submit ─────────────────────────────────────────────────────────────────

const handleSubmit = async () => {
  hasAttemptedSubmit.value = true
  if (!canSubmit.value) return
  isSubmitting.value = true

  const dtoPhases: CreatePhaseDto[] = phases.value.map((p, i) => {
    const base: CreatePhaseDto = {
      order: i + 1,
      type: p.type,
      game_id: p.game_id!,
      teams_limit_start: p.teams_limit_start,
      teams_limit_end: p.teams_limit_end,
    }
    if (needsSwissRounds(p.type)) base.swiss_rounds = p.swiss_rounds
    if (needsGroupFields(p.type)) {
      base.group_size = p.group_size
      base.group_winners_count = p.group_winners_count
    }
    return base
  })

  const dto: CreateTournamentDto = {
    name: name.value.trim(),
    description: description.value.trim() || undefined,
    max_participants: maxParticipants.value,
    phases: dtoPhases,
  }
  if (scheduledAt.value) {
    dto.scheduled_at = new Date(scheduledAt.value).toISOString()
  }

  try {
    await tournamentsApi.create(dto)
    notifications.success(t('teams.tournamentCreated'), 4000)
    // Reset form cleanly — also reset submit attempt flag so no stale errors show
    name.value = ''
    description.value = ''
    maxParticipants.value = 16
    scheduledAt.value = ''
    twoPhases.value = false
    phases.value = [makePhase(1)]
    hasAttemptedSubmit.value = false
    // Notify parent to refresh tournaments list and switch tab
    emit('tournament-created')
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

      <!-- ── Basic info ── -->
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

      <div class="form-row">
        <div class="form-group">
          <label for="t-max" class="form-label">{{ t('tournament.maxPlayers') }}</label>
          <input
            id="t-max"
            v-model.number="maxParticipants"
            type="number"
            class="form-input form-input-narrow"
            min="2"
            max="1024"
          />
        </div>

        <div class="form-group">
          <label for="t-scheduled" class="form-label">{{ t('admin.scheduledAt') }}</label>
          <input
            id="t-scheduled"
            v-model="scheduledAt"
            type="datetime-local"
            class="form-input form-input-datetime"
          />
        </div>
      </div>

      <!-- ── Phases ── -->
      <div class="phases-section">
        <div class="phases-header">
          <span class="form-label">{{ t('admin.phases') }}</span>
          <button type="button" class="toggle-phase-btn" @click="toggleSecondPhase">
            {{ twoPhases ? t('admin.removePhase2') : t('admin.addPhase2') }}
          </button>
        </div>

        <div class="phases-grid" :class="{ 'phases-grid-2': twoPhases }">
          <div v-for="(phase, idx) in phases" :key="idx" class="phase-card">

            <div class="phase-card-header">
              <span class="phase-number">{{ t('admin.phase') }} {{ idx + 1 }}</span>
              <span v-if="idx === 0 && twoPhases" class="phase-tag">{{ t('admin.phaseQualifier') }}</span>
              <span v-if="idx === 1" class="phase-tag phase-tag-final">{{ t('admin.phaseFinal') }}</span>
            </div>

            <!-- Format -->
            <div class="form-group">
              <label class="form-label-sm">{{ t('tournament.format') }}</label>
              <div class="format-options">
                <label
                  v-for="pt in PHASE_TYPES"
                  :key="pt.value"
                  class="format-option"
                  :class="{ 'format-selected': phase.type === pt.value }"
                >
                  <input
                    type="radio"
                    :name="`phase-type-${idx}`"
                    :value="pt.value"
                    v-model="phase.type"
                    class="visually-hidden"
                  />
                  <span>{{ pt.label }}</span>
                </label>
              </div>
            </div>

            <!-- Game -->
            <div class="form-group">
              <label class="form-label-sm">{{ t('tournament.game') }} *</label>

              <div v-if="isLoadingGames" class="loading-text">{{ t('common.loading') }}</div>
              <template v-else>
                <div v-if="games.length === 0" class="empty-games-hint">
                  {{ t('teams.noGamesAvailable') }}
                </div>
                <div v-else class="game-grid">
                  <label
                    v-for="game in games"
                    :key="game.id"
                    class="game-card"
                    :class="{ 'game-card-selected': phase.game_id === game.id }"
                  >
                    <input
                      type="radio"
                      :name="`phase-game-${idx}`"
                      :value="game.id"
                      v-model="phase.game_id"
                      class="visually-hidden"
                    />
                    <span class="game-name">{{ game.name }}</span>
                    <span class="game-info">
                      {{ game.teamSize === 1 ? `${game.teamCount ?? 2}P` : `${game.teamCount ?? 2}×${game.teamSize}` }}
                    </span>
                  </label>
                </div>

                <!-- Add game toggle (phase 0 only) -->
                <template v-if="idx === 0">
                  <button type="button" class="add-game-toggle" @click="showAddGame = !showAddGame">
                    {{ showAddGame ? '−' : '+' }} {{ t('teams.addGame') }}
                  </button>
                  <div v-if="showAddGame" class="add-game-form">
                    <div class="add-game-row">
                      <input
                        v-model="newGameName"
                        type="text"
                        class="form-input add-game-name-input"
                        :placeholder="t('teams.gameNamePlaceholder')"
                        maxlength="50"
                        @keydown.enter.prevent="handleAddGame"
                      />
                      <input v-model.number="newGameTeamCount" type="number" class="form-input add-game-num" :title="t('teams.teamCount')" min="2" max="32" />
                      <input v-model.number="newGameTeamSize" type="number" class="form-input add-game-num" :title="t('teams.teamSize')" min="1" max="16" />
                      <button
                        type="button"
                        class="add-game-submit"
                        :disabled="!canCreateGame || isCreatingGame"
                        @click="handleAddGame"
                      >
                        {{ isCreatingGame ? '…' : t('teams.addGame') }}
                      </button>
                    </div>
                  </div>
                </template>
              </template>
            </div>

            <!-- Teams limits -->
            <div class="form-row-sm">
              <div class="form-group">
                <label class="form-label-sm">{{ t('admin.teamsLimitStart') }}</label>
                <input
                  v-model.number="phase.teams_limit_start"
                  type="number"
                  class="form-input form-input-narrow"
                  min="2"
                  max="1024"
                  :disabled="idx === 1 && twoPhases"
                  @input="idx === 0 ? syncPhaseLink() : void 0"
                />
              </div>
              <div class="form-group">
                <label class="form-label-sm">{{ t('admin.teamsLimitEnd') }}</label>
                <input
                  v-model.number="phase.teams_limit_end"
                  type="number"
                  class="form-input form-input-narrow"
                  min="1"
                  @input="syncPhaseLink()"
                />
              </div>
            </div>

            <!-- Swiss rounds -->
            <div v-if="needsSwissRounds(phase.type)" class="form-group">
              <label class="form-label-sm">{{ t('admin.swissRounds') }}</label>
              <input v-model.number="phase.swiss_rounds" type="number" class="form-input form-input-narrow" min="1" max="20" />
            </div>

            <!-- Group Stage fields -->
            <template v-if="needsGroupFields(phase.type)">
              <div class="form-row-sm">
                <div class="form-group">
                  <label class="form-label-sm">{{ t('admin.groupSize') }}</label>
                  <input v-model.number="phase.group_size" type="number" class="form-input form-input-narrow" min="2" max="32" />
                </div>
                <div class="form-group">
                  <label class="form-label-sm">{{ t('admin.groupWinnersCount') }}</label>
                  <input v-model.number="phase.group_winners_count" type="number" class="form-input form-input-narrow" min="1" />
                </div>
              </div>
            </template>

          </div>
        </div>

        <!-- Phase chain indicator -->
        <div v-if="twoPhases" class="chain-info">
          <span class="chain-label">{{ t('admin.phase') }} 1</span>
          <span class="chain-sep">→ {{ phases[0].teams_limit_end }} {{ t('admin.teamsAdvance') }} →</span>
          <span class="chain-label">{{ t('admin.phase') }} 2</span>
        </div>
      </div>

      <!-- ── Validation errors (only after first submit attempt) ── -->
      <ul v-if="hasAttemptedSubmit && phaseErrors.length" class="error-list">
        <li v-for="(err, i) in phaseErrors" :key="i" class="error-item">{{ err }}</li>
      </ul>

      <!-- ── Submit ── -->
      <button
        type="submit"
        class="submit-btn"
        :disabled="isSubmitting"
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.form-row-sm {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.form-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-primary);
  text-transform: uppercase;
}

.form-label-sm {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
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
.form-input:disabled { opacity: 0.5; cursor: not-allowed; }

.form-textarea { resize: vertical; min-height: 60px; }
.form-input-narrow { max-width: 120px; }
.form-input-datetime { max-width: 260px; color-scheme: dark; }

.loading-text,
.empty-games-hint {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  padding: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

/* ── Phases ── */
.phases-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.phases-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle-phase-btn {
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--accent-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-default);
}
.toggle-phase-btn:hover { background: var(--bg-selected); }

.phases-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}
.phases-grid-2 { grid-template-columns: 1fr 1fr; }

.phase-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--border-subtle);
}

.phase-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: var(--hud-border) solid var(--border-subtle);
}

.phase-number {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wide);
  color: var(--accent-primary);
}

.phase-tag {
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
}
.phase-tag-final {
  color: var(--color-warning);
  border-color: var(--color-warning);
}

/* Game grid */
.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: var(--space-2);
}
.game-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  text-align: center;
}
.game-card:hover { border-color: var(--accent-primary); background: var(--bg-hover); }
.game-card-selected {
  border-color: var(--accent-primary);
  background: var(--bg-selected);
  box-shadow: 0 0 10px var(--accent-primary-subtle);
}
.game-name {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}
.game-info {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

/* Format options */
.format-options {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}
.format-option {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}
.format-option:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
.format-selected {
  border-color: var(--accent-primary);
  background: var(--bg-selected);
  color: var(--accent-primary);
}

/* Chain indicator */
.chain-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--accent-primary-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}
.chain-label { font-weight: var(--font-bold); color: var(--accent-primary); }
.chain-sep { color: var(--text-secondary); }

/* Errors */
.error-list {
  margin: 0;
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-6);
  background: rgba(220, 38, 38, 0.08);
  border: var(--hud-border) solid var(--color-error);
  list-style: disc;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.error-item {
  font-size: var(--text-xs);
  color: var(--color-error);
  font-family: var(--font-mono);
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
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Add game */
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
  transition: color var(--duration-fast), border-color var(--duration-fast);
}
.add-game-toggle:hover { color: var(--accent-primary); border-color: var(--accent-primary); }
.add-game-form { margin-top: var(--space-2); }
.add-game-row { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
.add-game-name-input { flex: 1; min-width: 0; }
.add-game-num { width: 56px; text-align: center; padding: var(--space-2); }
.add-game-submit {
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--accent-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--duration-fast);
}
.add-game-submit:not(:disabled):hover { background: var(--bg-selected); }
.add-game-submit:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 768px) {
  .phases-grid-2 { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .game-grid { grid-template-columns: repeat(2, 1fr); }
  .format-options { flex-direction: column; }
}
</style>
