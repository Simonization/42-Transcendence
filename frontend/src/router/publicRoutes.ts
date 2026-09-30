/**
 * Routes a logged-out visitor may open. The router guard and its tests share this one rule.
 *
 * - `/t/:id`: the shareable, read-only bracket;
 * - `/join/:code`: a team invite link (the page itself sends them to /auth and back);
 * - the not-found catch-all, so a typo does not bounce a visitor to /auth.
 */

const PUBLIC_PATHS = ['/', '/auth', '/auth/verify-email', '/auth/2fa', '/auth/callback', '/privacy', '/terms']

export function isPublicRoute(to: { path: string; name?: unknown }): boolean {
  return (
    PUBLIC_PATHS.includes(to.path) ||
    to.path.startsWith('/auth/') ||
    to.path.startsWith('/join/') ||
    to.path.startsWith('/t/') ||
    to.name === 'not-found'
  )
}
