<script setup lang="ts">
/**
 * Esports Links Card
 * External directory of esports games, platforms, and reference sites.
 *
 * Rendered as an indexed readout rather than an icon grid: there is no honest single-stroke
 * glyph for "RuneScape", and the eleven brand emoji this used to carry were the loudest
 * colour on the landing page. The index and the class column carry the information instead.
 * See ../../DESIGN.md.
 */

import HudIcon from '../hud/HudIcon.vue'

type LinkClass = 'GAME' | 'PLATFORM' | 'MEDIA' | 'DATA'

const links: Array<{ name: string; url: string; class: LinkClass }> = [
  { name: 'Counter-Strike', url: 'https://www.counter-strike.net/', class: 'GAME' },
  { name: 'Chess.com', url: 'https://www.chess.com/', class: 'GAME' },
  { name: 'League of Legends', url: 'https://www.leagueoflegends.com/', class: 'GAME' },
  { name: 'Dota 2', url: 'https://www.dota2.com/', class: 'GAME' },
  { name: 'World of Warcraft', url: 'https://worldofwarcraft.blizzard.com/', class: 'GAME' },
  { name: 'RuneScape', url: 'https://www.runescape.com/', class: 'GAME' },
  { name: 'StarCraft', url: 'https://starcraft2.blizzard.com/', class: 'GAME' },
  { name: 'Steam', url: 'https://store.steampowered.com/', class: 'PLATFORM' },
  { name: 'Twitch', url: 'https://www.twitch.tv/', class: 'MEDIA' },
  { name: 'HLTV', url: 'https://www.hltv.org/', class: 'DATA' },
  { name: 'Liquipedia', url: 'https://liquipedia.net/', class: 'DATA' },
]

const index = (i: number) => String(i + 1).padStart(2, '0')
</script>

<template>
  <section class="esports-card clip-card" aria-label="Esports and streaming links">
    <header class="card-header">
      <h2 class="card-title">{{ $t('landing.esportsLinks') }}</h2>
      <span class="hud-serial">{{ links.length }} {{ $t('common.results', { count: links.length }) }}</span>
    </header>

    <ul class="links-list">
      <li v-for="(link, i) in links" :key="link.name" class="link-item">
        <a
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="link-anchor clip-btn"
        >
          <span class="link-index num" aria-hidden="true">{{ index(i) }}</span>
          <span class="link-name">{{ link.name }}</span>
          <span class="link-class">{{ link.class }}</span>
          <HudIcon name="link" :size="14" class="link-mark" />
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
}

.link-anchor:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.link-index {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  flex: none;
}

.link-name {
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-class {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  color: var(--text-tertiary);
  flex: none;
}

.link-mark {
  color: var(--text-tertiary);
  flex: none;
}

.link-anchor:hover .link-class,
.link-anchor:hover .link-index,
.link-anchor:hover .link-mark {
  color: var(--accent-primary);
}
</style>
