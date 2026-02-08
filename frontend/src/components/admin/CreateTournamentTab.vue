<script setup lang="ts">
const createTournamentSteps = [
  { number: 1, title: 'Basic Info', description: 'Tournament name, game, format' },
  { number: 2, title: 'Registration', description: 'Solo/team, max participants' },
  { number: 3, title: 'Rules & Schedule', description: 'Match format, check-in window' },
  { number: 4, title: 'Bracket Config', description: 'Seeding, tiebreakers' },
  { number: 5, title: 'Review & Publish', description: 'Final review and launch' },
]
</script>

<template>
  <div class="create-tournament-content">
    <h2 class="section-title">CREATE TOURNAMENT</h2>

    <div class="v2-overlay">
      <div class="v2-banner">
        <span class="v2-banner-icon">🚀</span>
        <span class="v2-banner-text">Coming Soon - V2.0</span>
        <span class="v2-banner-desc">Full tournament creation wizard will be available in V2.0</span>
      </div>

      <div class="wizard-preview">
        <div class="wizard-steps-container">
          <div v-for="step in createTournamentSteps" :key="step.number" class="wizard-step-preview">
            <div class="step-number">{{ step.number }}</div>
            <div class="step-details">
              <h4 class="step-title-preview">{{ step.title }}</h4>
              <p class="step-description-preview">{{ step.description }}</p>
            </div>
          </div>
        </div>

        <div class="wizard-mockup">
          <div class="mockup-header">Tournament Creation - Step 1</div>
          <div class="mockup-content">
            <div class="mockup-field">Tournament Name: [_________________]</div>
            <div class="mockup-field">Game: [dropdown]</div>
            <div class="mockup-field">Format: [radio options]</div>
            <div class="mockup-footer">[Cancel] [Next →]</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

@media (max-width: 768px) {
  .wizard-preview {
    grid-template-columns: 1fr;
  }
}
</style>
