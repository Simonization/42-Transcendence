<script setup lang="ts">
/**
 * Tournaments Card
 * Displays upcoming tournament listings
 */

// TODO: Replace with admin API when backend tournament endpoints exist
const tournaments = [
  {
    name: '42 BDE Chess Tournament',
    location: '42 Brussels Chill Zone',
    date: 'Thursday 2 April 2026',
    url: 'https://tutors.42belgium.be/events',
    tag: 'CHESS',
  },
  {
    name: '42 BDE LOL Tournament',
    location: '42 Brussels Chill Zone',
    date: 'Thursday 7 May 2026',
    url: 'https://discord.com',
    tag: 'LOL',
  },
  {
    name: '42 BDE PingPong Tournament',
    location: 'BeCentral 4th Floor',
    date: 'Thursday 4 June 2026',
    url: 'https://tutors.42belgium.be/events',
    tag: 'PONG',
  },
]
</script>

<template>
  <section class="tournaments-card clip-card" aria-label="Upcoming tournaments">
    <header class="card-header">
      <h2 class="card-title">TOURNAMENTS</h2>
      <span class="hud-serial">{{ tournaments.length }} UPCOMING</span>
    </header>

    <ol class="tournament-list">
      <li
        v-for="(tournament, index) in tournaments"
        :key="tournament.name"
        class="tournament-item"
        :class="{ 'tournament-item--bordered': index > 0 }"
      >
        <div class="tournament-header">
          <span class="tournament-tag clip-badge">{{ tournament.tag }}</span>
          <h3 class="tournament-name">{{ tournament.name }}</h3>
        </div>
        <div class="tournament-details">
          <span class="tournament-date">{{ tournament.date }}</span>
          <span class="tournament-location">{{ tournament.location }}</span>
        </div>
        <a
          :href="tournament.url"
          target="_blank"
          rel="noopener noreferrer"
          class="tournament-register clip-btn"
        >
          REGISTER
        </a>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.tournaments-card {
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--border-subtle);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: var(--space-4);
  border-bottom: var(--hud-border) solid var(--border-subtle);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  margin: 0;
  color: var(--text-primary);
}

.hud-serial {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.tournament-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.tournament-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5) 0;
}

.tournament-item:first-child {
  padding-top: 0;
}

.tournament-item:last-child {
  padding-bottom: 0;
}

.tournament-item--bordered {
  border-top: var(--hud-border) solid var(--border-subtle);
}

.tournament-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.tournament-tag {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  padding: var(--space-1) var(--space-2);
  background: var(--accent-primary);
  color: var(--text-on-accent);
}

.tournament-name {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  margin: 0;
  color: var(--accent-primary);
}

.tournament-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.tournament-date {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-primary);
  letter-spacing: var(--tracking-wide);
}

.tournament-location {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.tournament-register {
  align-self: flex-start;
  display: inline-block;
  padding: var(--space-2) var(--space-5);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-decoration: none;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  transition: all var(--duration-fast) var(--ease-default);
}

.tournament-register:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-primary-subtle);
}

.tournament-register:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
</style>
