<script setup lang="ts">
/**
 * Esports Links Card
 * Grid of external links to esports games, platforms, and streaming sites
 */

const links = [
  { name: 'Counter-Strike', url: 'https://www.counter-strike.net/', icon: '🎯' },
  { name: 'Chess.com', url: 'https://www.chess.com/', icon: '♟️' },
  { name: 'League of Legends', url: 'https://www.leagueoflegends.com/', icon: '⚔️' },
  { name: 'Dota 2', url: 'https://www.dota2.com/', icon: '🎮' },
  { name: 'World of Warcraft', url: 'https://worldofwarcraft.blizzard.com/', icon: '🐉' },
  { name: 'RuneScape', url: 'https://www.runescape.com/', icon: '🗡️' },
  { name: 'StarCraft', url: 'https://starcraft2.blizzard.com/', icon: '🌌' },
  { name: 'Steam', url: 'https://store.steampowered.com/', icon: '🎮' },
  { name: 'Twitch', url: 'https://www.twitch.tv/', icon: '📺' },
  { name: 'HLTV', url: 'https://www.hltv.org/', icon: '🏆' },
  { name: 'Liquipedia', url: 'https://liquipedia.net/', icon: '📊' },
]
</script>

<template>
  <section class="esports-card clip-card" aria-label="Esports and streaming links">
    <header class="card-header">
      <h2 class="card-title">{{ $t('landing.esportsLinks') }}</h2>
      <span class="hud-serial">{{ links.length }} {{ $t('common.results', { count: links.length }) }}</span>
    </header>

    <ul class="links-list">
      <li v-for="link in links" :key="link.name" class="link-item">
        <a
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="link-anchor clip-btn"
        >
          <span class="link-icon" aria-hidden="true">{{ link.icon }}</span>
          <span class="link-name">{{ link.name }}</span>
          <span class="link-arrow" aria-hidden="true">→</span>
        </a>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.esports-card {
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

.links-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.link-anchor {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  text-decoration: none;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid transparent;
  transition: all var(--duration-fast) var(--ease-default);
}

.link-anchor:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  background: var(--bg-selected);
  box-shadow: 0 0 12px var(--accent-primary-subtle);
}

.link-anchor:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.link-icon {
  font-size: var(--text-lg);
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.link-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-wide);
  flex: 1;
}

.link-arrow {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  transition: transform var(--duration-fast) var(--ease-default);
}

.link-anchor:hover .link-arrow {
  transform: translateX(4px);
  color: var(--accent-primary);
}
</style>
