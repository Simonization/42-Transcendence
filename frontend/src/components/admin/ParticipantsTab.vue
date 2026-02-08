<script setup lang="ts">
const mockParticipants = [
  { id: '1', username: 'admin_user', role: 'Admin', status: 'active' },
  { id: '2', username: 'moderator_01', role: 'Moderator', status: 'active' },
  { id: '3', username: 'player_alpha', role: 'Player', status: 'active' },
  { id: '4', username: 'player_beta', role: 'Player', status: 'inactive' },
]
</script>

<template>
  <div class="participants-content">
    <h2 class="section-title">PARTICIPANTS MANAGEMENT</h2>

    <div class="v2-overlay">
      <div class="v2-banner">
        <span class="v2-banner-icon">🚀</span>
        <span class="v2-banner-text">Coming Soon - V2.0</span>
        <span class="v2-banner-desc">Advanced participant management features coming in V2.0</span>
      </div>

      <div class="participants-preview">
        <!-- Search Bar -->
        <div class="search-container">
          <label for="participant-search-preview" class="visually-hidden">Search participants</label>
          <input
            id="participant-search-preview"
            type="text"
            class="search-input-preview"
            placeholder="Search participants..."
            disabled
            aria-label="Search participants (disabled preview)"
          />
          <span class="search-icon-preview" aria-hidden="true">🔍</span>
        </div>

        <!-- Participants Table -->
        <table class="table table-preview">
          <caption class="visually-hidden">Participant management preview with username, role, status, and actions (feature coming in V2.0)</caption>
          <thead>
            <tr>
              <th>USERNAME</th>
              <th>ROLE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="participant in mockParticipants" :key="participant.id" class="table-row-preview">
              <td>{{ participant.username }}</td>
              <td>{{ participant.role }}</td>
              <td>{{ participant.status }}</td>
              <td>
                <button class="action-link-preview" disabled aria-disabled="true">Edit</button>
                <button class="action-link-preview" disabled aria-disabled="true">Ban</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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

.participants-content {
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

.table-preview {
  opacity: 0.7;
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
</style>
