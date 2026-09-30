import { describe, it, expect, beforeEach } from 'vitest'
import { consumePendingRedirect, savePendingRedirect } from '../postLoginRedirect'

describe('postLoginRedirect', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('returns the fallback when nothing was saved', () => {
    expect(consumePendingRedirect('/menu')).toBe('/menu')
  })

  it('returns a saved invite link once, then the fallback', () => {
    savePendingRedirect('/join/abcDEF2345')
    expect(consumePendingRedirect('/menu')).toBe('/join/abcDEF2345')
    expect(consumePendingRedirect('/menu')).toBe('/menu')
  })

  it('never stores anything that is not an invite link (no open redirect)', () => {
    savePendingRedirect('https://evil.example/join/x')
    savePendingRedirect('//evil.example')
    savePendingRedirect('/menu/admin')
    expect(consumePendingRedirect('/menu')).toBe('/menu')
  })

  it('ignores a tampered stored value', () => {
    sessionStorage.setItem('post_login_redirect', 'https://evil.example')
    expect(consumePendingRedirect('/menu')).toBe('/menu')
    expect(sessionStorage.getItem('post_login_redirect')).toBeNull()
  })
})
