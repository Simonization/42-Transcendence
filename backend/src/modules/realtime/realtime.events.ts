/**
 * Event names pushed to clients. Mirrored in frontend/src/types/realtime.ts: keep the two in
 * step. Payloads stay minimal (ids and a `reason`) because clients refetch the resource
 * through the normal REST endpoints rather than trusting a pushed copy.
 */
export const RealtimeEvents = {
    /** A team's roster, status or name changed. Room: team:<id>. */
    TEAM_UPDATED: 'team:updated',
    /** A tournament's settings, status or registrations changed. Room: tournament:<id>. */
    TOURNAMENT_UPDATED: 'tournament:updated',
    /** The bracket moved (started, match finished, team advanced). Room: tournament:<id>. */
    BRACKET_UPDATED: 'bracket:updated',
    /** One match changed (score reported, confirmed, status). Room: match:<id>. */
    MATCH_UPDATED: 'match:updated',
    /** The user was invited to a team. Room: user:<id>. */
    INVITATION_RECEIVED: 'invitation:received',
} as const;

export type RealtimeEventName = (typeof RealtimeEvents)[keyof typeof RealtimeEvents];

/** Payload shape shared by all events: which resource, and why it changed. */
export interface RealtimePayload {
    /** Id of the resource the event is about (team, tournament, match, invitation...). */
    id?: number;
    /** Short machine-readable cause, e.g. 'member_joined', 'match_finished'. */
    reason?: string;
    [key: string]: unknown;
}

/** Rooms a client can ask to join with the `subscribe` message. */
export const SUBSCRIBABLE_CHANNELS = ['tournament', 'match', 'team'] as const;
export type SubscribableChannel = (typeof SUBSCRIBABLE_CHANNELS)[number];

export const roomName = {
    user: (id: number) => `user:${id}`,
    team: (id: number) => `team:${id}`,
    tournament: (id: number) => `tournament:${id}`,
    match: (id: number) => `match:${id}`,
};
