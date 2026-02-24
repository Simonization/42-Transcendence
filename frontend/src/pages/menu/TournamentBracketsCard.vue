<script setup lang="ts">
/**
 * Tournament Brackets Page
 * Displays the tournament bracket visualization for the current/selected tournament
 */

import BracketVisualization from '../../components/tournaments/BracketVisualization.vue'
import { getMockBracket } from '../../data/mockBracket'

// Use tournament ID '1' as the default for the standalone bracket view
const bracket = getMockBracket('1')
</script>

<template>
  <div class="card card-page glass-panel">
    <div class="card-header">
      <h2 class="card-title">{{ $t('tournament.brackets') }}</h2>
      <span class="hud-serial">MODULE::ACTIVE</span>
    </div>

    <div class="card-body">
      <BracketVisualization v-if="bracket" :bracket="bracket" tournament-name="Spring Championship 2026" />
    </div>
  </div>
</template>

<style scoped>
.card-page {
  width: 100%;
  max-width: 1200px;
}

.card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: var(--hud-border) solid var(--border-subtle);
}

.card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  margin: 0;
}

.hud-serial {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.card-body {
  padding: var(--space-6);
}
</style>
