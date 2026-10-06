import type { User } from './entities/user.entity';

/**
 * The part of a user that other players may see: who they are, nothing about how to reach or
 * impersonate them. Every read endpoint that embeds a user owned by somebody else (team rosters,
 * invitations, match rows, the looking-for-team board) maps it through `toPublicUser` instead of
 * returning the entity, so a relation added to a query later cannot leak `mail`, `role`, `status`,
 * `banUntil`, the 2FA flags or the OAuth names.
 *
 * A deleted account (tombstone) keeps its id, so rows that point at it still line up, but has no
 * identity: empty username, no avatar, `isDeleted: true`. The frontend renders it as "Deleted
 * user", not as a link. This is not the banned state, which keeps the identity.
 *
 * Add a field here only when the UI needs it for other people, never for the current user's own
 * profile (that has its own endpoints).
 */
export interface PublicUser {
    id: number;
    username: string;
    avatarUrl: string | null;
    isDeleted: boolean;
}

type UserLike = Pick<User, 'id' | 'username'> & { avatarUrl?: string | null; deletedAt?: Date | null };

export const isDeletedUser = (user: { deletedAt?: Date | null } | null | undefined): boolean => !!user?.deletedAt;

export function toPublicUser(user: UserLike): PublicUser {
    if (isDeletedUser(user)) return { id: user.id, username: '', avatarUrl: null, isDeleted: true };
    return { id: user.id, username: user.username, avatarUrl: user.avatarUrl ?? null, isDeleted: false };
}

/** For a relation that may be absent (not loaded) or null (deleted user): keeps it as it is. */
export function toPublicUserOrNil(user: UserLike | null | undefined): PublicUser | null | undefined {
    return user ? toPublicUser(user) : user;
}
