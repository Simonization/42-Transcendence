/**
 * Vue I18n Configuration
 * Provides internationalization with EN, FR, TR locales
 */

import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'
import tr from './locales/tr.json'

/**
 * Resolve initial locale from localStorage or browser preference
 */
function resolveLocale(): string {
  const stored = localStorage.getItem('locale')
  if (stored && ['en', 'fr', 'tr'].includes(stored)) return stored

  const browserLang = navigator.language.split('-')[0]
  if (['en', 'fr', 'tr'].includes(browserLang)) return browserLang

  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: resolveLocale(),
  fallbackLocale: 'en',
  messages: { en, fr, tr },
})

export default i18n
