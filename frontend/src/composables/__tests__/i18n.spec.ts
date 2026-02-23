/**
 * i18n Tests
 * Validates locale files, switching, fallback, and interpolation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { i18n } from '@/i18n'
import en from '@/i18n/locales/en.json'
import fr from '@/i18n/locales/fr.json'
import tr from '@/i18n/locales/tr.json'

describe('i18n', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
  })

  describe('locale files exist and have matching keys', () => {
    it('all 3 locales have the same top-level keys', () => {
      const enKeys = Object.keys(en).sort()
      const frKeys = Object.keys(fr).sort()
      const trKeys = Object.keys(tr).sort()

      expect(frKeys).toEqual(enKeys)
      expect(trKeys).toEqual(enKeys)
    })

    it('all nested keys in FR match EN', () => {
      for (const section of Object.keys(en)) {
        const enSection = (en as Record<string, Record<string, string>>)[section]
        const frSection = (fr as Record<string, Record<string, string>>)[section]
        const enSubKeys = Object.keys(enSection).sort()
        const frSubKeys = Object.keys(frSection).sort()

        expect(frSubKeys, `FR missing keys in "${section}"`).toEqual(enSubKeys)
      }
    })

    it('all nested keys in TR match EN', () => {
      for (const section of Object.keys(en)) {
        const enSection = (en as Record<string, Record<string, string>>)[section]
        const trSection = (tr as Record<string, Record<string, string>>)[section]
        const enSubKeys = Object.keys(enSection).sort()
        const trSubKeys = Object.keys(trSection).sort()

        expect(trSubKeys, `TR missing keys in "${section}"`).toEqual(enSubKeys)
      }
    })
  })

  describe('locale switching', () => {
    it('returns English text by default', () => {
      expect(i18n.global.t('common.save')).toBe('SAVE')
    })

    it('returns French text after switching to fr', () => {
      i18n.global.locale.value = 'fr'
      const result = i18n.global.t('common.save')
      expect(result).not.toBe('SAVE')
      expect(result.length).toBeGreaterThan(0)
    })

    it('returns Turkish text after switching to tr', () => {
      i18n.global.locale.value = 'tr'
      const result = i18n.global.t('common.save')
      expect(result).not.toBe('SAVE')
      expect(result.length).toBeGreaterThan(0)
    })

    it('switching locale changes all translations', () => {
      const enAuth = i18n.global.t('auth.signIn')

      i18n.global.locale.value = 'fr'
      const frAuth = i18n.global.t('auth.signIn')

      i18n.global.locale.value = 'tr'
      const trAuth = i18n.global.t('auth.signIn')

      // All three should be different
      expect(new Set([enAuth, frAuth, trAuth]).size).toBe(3)
    })
  })

  describe('fallback to EN', () => {
    it('falls back to English for missing keys', () => {
      i18n.global.locale.value = 'fr'
      // Access a key that exists — should return French
      const frSave = i18n.global.t('common.save')
      expect(frSave.length).toBeGreaterThan(0)

      // The fallback locale is 'en', so if we set locale to a non-existent locale
      // it should fall back
      i18n.global.locale.value = 'ja' as any
      const fallback = i18n.global.t('common.save')
      expect(fallback).toBe('SAVE')
    })
  })

  describe('interpolation', () => {
    it('interpolates named parameters in EN', () => {
      const result = i18n.global.t('auth.welcome', { username: 'TestUser' })
      expect(result).toContain('TestUser')
    })

    it('interpolates named parameters in FR', () => {
      i18n.global.locale.value = 'fr'
      const result = i18n.global.t('auth.welcome', { username: 'TestUser' })
      expect(result).toContain('TestUser')
    })

    it('interpolates named parameters in TR', () => {
      i18n.global.locale.value = 'tr'
      const result = i18n.global.t('auth.welcome', { username: 'TestUser' })
      expect(result).toContain('TestUser')
    })

    it('interpolates count parameters', () => {
      const result = i18n.global.t('common.results', { count: 42 })
      expect(result).toContain('42')
    })

    it('interpolates validation parameters', () => {
      const result = i18n.global.t('validation.minLength', { min: 8 })
      expect(result).toContain('8')
    })
  })

  describe('no empty values', () => {
    it('EN has no empty string values', () => {
      for (const [section, entries] of Object.entries(en)) {
        for (const [key, value] of Object.entries(entries as Record<string, string>)) {
          expect(value, `en.${section}.${key} is empty`).not.toBe('')
        }
      }
    })

    it('FR has no empty string values', () => {
      for (const [section, entries] of Object.entries(fr)) {
        for (const [key, value] of Object.entries(entries as Record<string, string>)) {
          expect(value, `fr.${section}.${key} is empty`).not.toBe('')
        }
      }
    })

    it('TR has no empty string values', () => {
      for (const [section, entries] of Object.entries(tr)) {
        for (const [key, value] of Object.entries(entries as Record<string, string>)) {
          expect(value, `tr.${section}.${key} is empty`).not.toBe('')
        }
      }
    })
  })
})
