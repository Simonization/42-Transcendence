/**
 * Deleted accounts.
 *
 * The backend keeps a deleted account as a tombstone so that the messages, rosters and match
 * history it is part of stay whole, and serialises it with `isDeleted: true`, an empty username
 * and no avatar. The UI shows it as "Deleted user" with the neutral avatar, never as a link or
 * a profile to open. This is not the banned state: a banned user keeps their name.
 */

export interface MaybeDeletedUser {
  username?: string | null
  isDeleted?: boolean | null
}

export function isDeletedUser(user: MaybeDeletedUser | null | undefined): boolean {
  return !!user?.isDeleted
}

/** The name to show for `user`: its username, or the translated "Deleted user". */
export function userLabel(
  user: MaybeDeletedUser | null | undefined,
  t: (key: string) => string,
  fallback = '',
): string {
  if (isDeletedUser(user)) return t('user.deletedUser')
  return user?.username || fallback
}
