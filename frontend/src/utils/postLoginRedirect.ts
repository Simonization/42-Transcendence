/**
 * Remembers where a logged-out visitor was headed (an invite link) so the login flow can send
 * them back after signing in. Only `/join/...` paths are accepted, so this can never become an
 * open redirect.
 */

const KEY = 'post_login_redirect'

function isAllowedTarget(path: string): boolean {
  return path.startsWith('/join/') && !path.startsWith('//')
}

export function savePendingRedirect(path: string): void {
  if (!isAllowedTarget(path)) return
  try {
    sessionStorage.setItem(KEY, path)
  } catch {
    // Storage can be blocked (private mode); the visitor just lands on the menu instead.
  }
}

/** Returns the remembered target once (clearing it), or `fallback` when there is none. */
export function consumePendingRedirect(fallback: string): string {
  try {
    const path = sessionStorage.getItem(KEY)
    if (path) {
      sessionStorage.removeItem(KEY)
      if (isAllowedTarget(path)) return path
    }
  } catch {
    // ignore
  }
  return fallback
}
