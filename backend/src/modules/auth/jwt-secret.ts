/**
 * Single source for the signing secret.
 *
 * Two of the three call sites previously fell back to a literal default while the third had no
 * fallback at all. That combination is worse than either: a deployment missing JWT_SECRET
 * accepted REST tokens signed with a secret published in this repository, while every socket
 * handshake failed verification — so the app looked partly working rather than misconfigured.
 */
export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error(
            'JWT_SECRET is not set. Refusing to start rather than fall back to a known default.',
        );
    }
    return secret;
}
