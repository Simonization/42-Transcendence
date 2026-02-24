<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useThemeStore } from '../stores/theme'
import ThemeToggle from '../components/ThemeToggle.vue'

const router = useRouter()
const themeStore = useThemeStore()
const { theme } = themeStore
</script>

<template>
  <div class="legal-page" :data-theme="theme">
    <div class="legal-background">
      <div class="bg-pattern"></div>
      <div class="bg-gradient"></div>
    </div>

    <header class="legal-header glass-header">
      <div class="legal-header-left">
        <RouterLink to="/" class="back-link">&larr; {{ $t('legal.backToHome') }}</RouterLink>
        <h1 class="legal-title">{{ $t('legal.privacyTitle') }}</h1>
      </div>
      <div class="legal-header-actions">
        <ThemeToggle />
      </div>
    </header>

    <main class="legal-main">
      <article class="legal-content glass-panel">
        <p class="legal-updated">{{ $t('legal.lastUpdated') }}: 2026-02-24</p>

        <section class="legal-section">
          <h2>Information We Collect</h2>
          <p>We collect information you provide directly when creating your account, including your username, email address, and password. When you use our platform, we also collect usage data such as match history, tournament participation, and chat messages.</p>
          <p>If you connect third-party services (such as chess.com for match history), we receive data from those APIs as authorized by you. We do not access more data than necessary for the features you use.</p>
        </section>

        <section class="legal-section">
          <h2>How We Use Your Information</h2>
          <ul>
            <li><strong>Account management</strong> &mdash; to create and maintain your account, authenticate your identity, and manage your profile.</li>
            <li><strong>Matchmaking &amp; tournaments</strong> &mdash; to register you in tournaments, track match results, and display leaderboards.</li>
            <li><strong>Communication</strong> &mdash; to enable real-time chat, friend requests, and notification delivery.</li>
            <li><strong>Platform improvement</strong> &mdash; to analyze usage patterns and improve our services.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>Data Sharing</h2>
          <p>We do not sell your personal information to third parties. Your data may be shared in the following circumstances:</p>
          <ul>
            <li><strong>Third-party APIs</strong> &mdash; when you opt in to features that require external services (e.g., chess.com match import).</li>
            <li><strong>Legal requirements</strong> &mdash; when required by law, regulation, or legal process.</li>
            <li><strong>Platform safety</strong> &mdash; to enforce our Terms of Service and protect users from abuse.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>Data Security</h2>
          <p>We implement industry-standard security measures to protect your data:</p>
          <ul>
            <li>Passwords are hashed using secure algorithms and never stored in plain text.</li>
            <li>All connections are encrypted via HTTPS/WSS.</li>
            <li>Authentication tokens (JWT) are used for session management with automatic expiration.</li>
            <li>Two-factor authentication (2FA) is available for additional account security.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>Cookies &amp; Local Storage</h2>
          <p>We use browser local storage to maintain your session:</p>
          <ul>
            <li><strong>JWT tokens</strong> &mdash; for authentication (automatically cleared on logout).</li>
            <li><strong>Theme preferences</strong> &mdash; to remember your selected visual theme.</li>
            <li><strong>Language preference</strong> &mdash; to display the interface in your chosen language.</li>
          </ul>
          <p>We do not use third-party tracking cookies or analytics services.</p>
        </section>

        <section class="legal-section">
          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access</strong> your personal data through your profile settings.</li>
            <li><strong>Delete</strong> your account and all associated data at any time from the User settings page.</li>
            <li><strong>Export</strong> your data upon request.</li>
            <li><strong>Modify</strong> your profile information, display name, and bio.</li>
            <li><strong>Block</strong> other users to prevent unwanted communication.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>Contact Information</h2>
          <p>This platform is developed as a school project at 42 Brussels. For questions or concerns about your data, please contact the development team through the platform's support channels.</p>
        </section>
      </article>
    </main>

    <footer class="legal-footer glass-footer">
      <span class="hud-serial">ESP-2026 // TOURNAMENT PLATFORM v3.0</span>
      <nav class="footer-links" aria-label="Legal">
        <RouterLink to="/terms" class="footer-link">{{ $t('legal.terms') }}</RouterLink>
      </nav>
    </footer>
  </div>
</template>

<style scoped>
.legal-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  position: relative;
}

.legal-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.bg-pattern {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23ffffff' fill-opacity='0.03'/%3E%3C/svg%3E");
  background-size: 60px 60px;
  opacity: 0.15;
}

.bg-gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 30%, var(--accent-primary-glow) 0%, transparent 50%);
  opacity: 0.2;
}

.legal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-8);
  position: relative;
  z-index: 10;
}

.legal-header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 120px;
  height: var(--hud-border-thick);
  background: var(--accent-primary);
  opacity: 0.5;
}

.legal-header-left {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
}

.legal-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.back-link {
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  text-decoration: none;
  color: var(--accent-primary);
  transition: opacity var(--duration-fast) var(--ease-default);
}

.back-link:hover {
  opacity: 0.7;
}

.legal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  margin: 0;
  color: var(--text-primary);
}

.legal-main {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: var(--space-8);
  position: relative;
  z-index: 1;
}

.legal-content {
  width: 100%;
  max-width: 800px;
  padding: var(--space-8);
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--backdrop-blur-medium);
  backdrop-filter: var(--backdrop-blur-medium);
  border: 1px solid var(--glass-border);
}

.legal-updated {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  margin: 0 0 var(--space-6) 0;
}

.legal-section {
  margin-bottom: var(--space-6);
}

.legal-section h2 {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--accent-primary);
  margin: 0 0 var(--space-3) 0;
}

.legal-section p {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
  margin: 0 0 var(--space-3) 0;
}

.legal-section ul {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-3) 0;
}

.legal-section li {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
  padding: var(--space-1) 0;
  padding-left: var(--space-4);
  position: relative;
}

.legal-section li::before {
  content: '\25C6';
  position: absolute;
  left: 0;
  color: var(--accent-primary);
  font-size: 8px;
  top: 6px;
}

.legal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-8);
  position: relative;
  z-index: 10;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.footer-link {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-default);
}

.footer-link:hover {
  color: var(--accent-primary);
}

.hud-serial {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}
</style>
