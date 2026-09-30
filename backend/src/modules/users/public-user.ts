import type { User } from './entities/user.entity';

/**
 * The part of a user that other players may see: who they are, nothing about how to reach or
 * impersonate them. Every read endpoint that embeds a user owned by somebody else (team rosters,
 * invitations, match rows, the looking-for-team board) maps it through `toPublicUser` instead of
 * returning the entity, so a relation added to a query later cannot leak `mail`, `role`, `status`,
 * `banUntil`, the 2FA flags or the OAuth names.
 *
 * Add a field here only when the UI needs it for other people, never for the current user's own
 * profile (that has its own endpoints).
 */
export interface PublicUser {
    id: number;
    username: string;
    avatarUrl: string | null;
}

type UserLike = Pick<User, 'id' | 'username'> & { avatarUrl?: string | null };

export function toPublicUser(user: UserLike): PublicUser {
    return { id: user.id, username: user.username, avatarUrl: user.avatarUrl ?? null };
}

/** For a relation that may be absent (not loaded) or null (deleted user): keeps it as it is. */
export function toPublicUserOrNil(user: UserLike | null | undefined): PublicUser | null | undefined {
    return user ? toPublicUser(user) : user;
}
