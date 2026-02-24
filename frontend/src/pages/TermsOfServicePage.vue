<script setup lang="ts">
import { useThemeStore } from '../stores/theme'
import ThemeToggle from '../components/ThemeToggle.vue'

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
        <h1 class="legal-title">{{ $t('legal.termsTitle') }}</h1>
      </div>
      <div class="legal-header-actions">
        <ThemeToggle />
      </div>
    </header>

    <main class="legal-main">
      <article class="legal-content glass-panel">
        <p class="legal-updated">{{ $t('legal.lastUpdated') }}: 2026-02-24</p>

        <section class="legal-section">
          <h2>Acceptance of Terms</h2>
          <p>By creating an account or using the esportendence platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform.</p>
        </section>

        <section class="legal-section">
          <h2>Eligibility</h2>
          <p>You must be at least 16 years of age to use this platform. By registering, you represent that you meet this age requirement. Users under 18 should have parental consent before creating an account.</p>
        </section>

        <section class="legal-section">
          <h2>User Accounts</h2>
          <ul>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must provide accurate information during registration.</li>
            <li>Each person may only maintain one account.</li>
            <li>You must not share your account with others.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>User Conduct</h2>
          <p>You agree to conduct yourself in a manner that is respectful to other users. The following behaviors are prohibited:</p>
          <ul>
            <li><strong>Harassment</strong> &mdash; bullying, threatening, or intimidating other users in chat or during tournaments.</li>
            <li><strong>Cheating</strong> &mdash; using unauthorized tools, exploits, or any form of unfair advantage in tournaments.</li>
            <li><strong>Impersonation</strong> &mdash; pretending to be another user, administrator, or staff member.</li>
            <li><strong>Spam</strong> &mdash; sending unsolicited messages, advertisements, or disruptive content.</li>
            <li><strong>Hate speech</strong> &mdash; content that promotes discrimination based on race, gender, religion, or other protected characteristics.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>Tournament Rules</h2>
          <ul>
            <li>By registering for a tournament, you agree to follow the specific rules set by the tournament organizer.</li>
            <li>You must check in on time for scheduled matches. Failure to check in may result in disqualification.</li>
            <li>Tournament formats (single elimination, double elimination, round robin) are determined by the organizer and cannot be changed after registration.</li>
            <li>Disputes should be reported through the platform rather than handled outside of it.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>Content Policy</h2>
          <p>User-generated content, including chat messages, profile information, and team names, must comply with our conduct rules. We reserve the right to remove any content that violates these terms. You retain ownership of content you create but grant us a license to display it on the platform.</p>
        </section>

        <section class="legal-section">
          <h2>Account Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms. Grounds for termination include:</p>
          <ul>
            <li>Repeated violations of user conduct rules.</li>
            <li>Cheating or match-fixing in tournaments.</li>
            <li>Harassment or abuse of other users.</li>
            <li>Creating multiple accounts to circumvent bans.</li>
          </ul>
          <p>You may delete your own account at any time from the User settings page. Account deletion is permanent and cannot be reversed.</p>
        </section>

        <section class="legal-section">
          <h2>Disclaimers &amp; Limitation of Liability</h2>
          <p>The platform is provided "as is" without warranties of any kind. This is a school project developed at 42 Brussels and is not a commercial service. We are not liable for any damages arising from your use of the platform, including but not limited to loss of data, tournament disputes, or service interruptions.</p>
        </section>

        <section class="legal-section">
          <h2>Governing Law</h2>
          <p>These terms are governed by the laws of Belgium. Any disputes arising from these terms or your use of the platform shall be subject to the jurisdiction of the courts of Brussels, Belgium.</p>
        </section>
      </article>
    </main>

    <footer class="legal-footer glass-footer">
      <span class="hud-serial">ESP-2026 // TOURNAMENT PLATFORM v3.0</span>
      <nav class="footer-links" aria-label="Legal">
        <RouterLink to="/privacy" class="footer-link">{{ $t('legal.privacy') }}</RouterLink>
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
