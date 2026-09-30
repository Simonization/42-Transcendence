# Realtime

Teams, tournaments, brackets and matches update live over the same Socket.IO connection that
carries chat. The server pushes a small "this changed" event; the client refetches through the
normal REST endpoints. Nothing pushed is trusted as data.

```
command (REST)  ->  RealtimeService.toX(id, event, { id, reason })
                        -> Socket.IO room  ->  browser  ->  useLiveChannel handler  ->  refetch
```

## One socket

A browser holds exactly one socket, opened by `frontend/src/services/socket.ts` (the only place
that calls `io()`). Chat, notifications and realtime events all use it. On the server,
`ChatGateway` and `RealtimeGateway` are two gateways on the same default namespace, so a client
connects once and both see it. Do not open another connection from a page or a store; use the
service or the composables below.

## Rooms

| Room | Who joins | How |
|---|---|---|
| `user:<id>` | the user's own sockets | automatic on authenticated connect |
| `tournament:<id>` | any logged-in user (tournaments and brackets are readable by all) | `subscribe` |
| `team:<id>` | members of the team | `subscribe`, refused otherwise |
| `match:<id>` | members of either team, or admins | `subscribe`, refused otherwise |

Clients join with the `subscribe` message and leave with `unsubscribe`, both
`{ channel: 'tournament' | 'match' | 'team', id }`. The server validates the shape (positive
integer id, known channel) and answers with an ack `{ ok: true }` or
`{ ok: false, error: 'invalid_request' | 'unauthorized' | 'forbidden' }`. A refused join simply
means no events arrive; there is no error dialog to handle. You will normally not send these
by hand, `useLiveChannel` does it.

Server rooms do not survive a reconnect. The shared socket service re-sends every active
subscription on each (re)connect.

## Events

Defined once in `backend/src/modules/realtime/realtime.events.ts` and mirrored in
`frontend/src/types/realtime.ts`. Add new names to both.

| Constant | Name | Room | Meaning |
|---|---|---|---|
| `TEAM_UPDATED` | `team:updated` | `team:<id>` | roster, status or name changed |
| `TOURNAMENT_UPDATED` | `tournament:updated` | `tournament:<id>` | settings, status or registrations changed |
| `BRACKET_UPDATED` | `bracket:updated` | `tournament:<id>` | bracket moved: started, match finished, team advanced |
| `MATCH_UPDATED` | `match:updated` | `match:<id>` | score, confirmation or status of one match |
| `INVITATION_RECEIVED` | `invitation:received` | `user:<id>` | a team invitation or join request concerning the user changed (received, answered, withdrawn), or they were removed from a team |

Payload: `{ id, reason }` and nothing else that matters. `id` is the id of the resource the
event is about (the tournament for `bracket:updated`, the team for `team:updated`, and so on);
`reason` is a short machine-readable cause such as `member_joined` or `match_finished`. Always
send `id`: the client uses it to ignore events about a different resource.

## Publishing from a command

`RealtimeModule` is global, so inject the service without importing any module:

```ts
import { RealtimeService, RealtimeEvents } from '../../realtime';

constructor(private readonly realtime: RealtimeService /* ...existing deps */) {}

// after the transaction has committed, so a client that refetches sees the new state
this.realtime.toTournament(tournamentId, RealtimeEvents.BRACKET_UPDATED, { id: tournamentId, reason: 'match_finished' });
this.realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, { id: teamId, reason: 'member_joined' });
this.realtime.toMatch(matchId, RealtimeEvents.MATCH_UPDATED, { id: matchId, reason: 'score_reported' });
this.realtime.toUser(inviteeId, RealtimeEvents.INVITATION_RECEIVED, { id: invitationId, reason: 'invited' });
```

Rules of thumb:

- Publish after the commit, never before or inside a transaction that can still roll back.
- One change often concerns several audiences. A finished match moves the bracket
  (`toTournament`), changes the match (`toMatch`) and may change two teams' status (`toTeam`).
  Send each; they are cheap.
- Publishing never throws and does nothing if the socket layer is not up, so a broken socket
  cannot fail the command. Do not wrap it in try/catch.
- Keep payloads minimal. If you feel like adding data, add an endpoint or a `reason` instead.

## Subscribing from a page

```ts
import { useLiveChannel } from '@/composables/useLiveChannel'
import { RealtimeEvents } from '@/types/realtime'

useLiveChannel('tournament', tournamentId, {   // id: number, string, ref or getter
  [RealtimeEvents.BRACKET_UPDATED]: () => loadBracket(),
  [RealtimeEvents.TOURNAMENT_UPDATED]: () => loadTournament(),
}, {
  onResync: () => { loadTournament(); loadBracket() },   // optional, see below
})
```

- Joins `tournament:<id>` when the component sets up, leaves on unmount, and moves to the new
  room when `tournamentId` changes. An invalid id (`null`, `0`, not a number) joins nothing.
- Handlers only run for events whose `id` equals the current id.
- Two components watching the same room share one server-side join.
- `onResync` runs after the socket comes back from a drop, because events sent while offline are
  gone. Use it to refetch everything the page shows. It does not run on the first connect.

Events addressed to the user (no room to join):

```ts
import { useUserEvents } from '@/composables/useUserEvents'

useUserEvents({
  [RealtimeEvents.INVITATION_RECEIVED]: () => refreshInvitations(),
})
```

For anything else on the socket, `onSocketEvent(event, handler)` from
`frontend/src/services/socket.ts` returns a remover and keeps working across reconnects and
logout/login.

## Teams: who publishes what

All publishing happens in the command classes under `backend/src/modules/teams/commands/`, after
the transaction commits. `reason` is the value sent in the payload. Rows marked "user" go to each
person named, with the invitation (or team, for `kicked`) id as `id`. Regenerating the join code
publishes nothing: the code is never sent over the socket.

| Command | `team:<id>` (`TEAM_UPDATED`) | `user:<id>` (`INVITATION_RECEIVED`) | `tournament:<id>` (`TOURNAMENT_UPDATED`) |
|---|---|---|---|
| create team | | | `team_created` |
| invite player | `invitation_sent` | invitee: `invited` | |
| accept invitation | `member_joined` | inviter: `invitation_accepted` | `looking_for_team_changed` |
| decline invitation | `invitation_declined` | inviter: `invitation_declined` | |
| cancel invitation | `invitation_cancelled` | invitee: `invitation_cancelled` (invites only, not requests) | |
| request to join | | captain and each admin: `join_request` | |
| accept join request | `member_joined` | requester: `request_accepted` | `looking_for_team_changed` |
| decline join request | `request_declined` | requester: `request_declined` | |
| join by code | `member_joined` | | `looking_for_team_changed` |
| kick | `member_kicked` | kicked user: `kicked` | |
| leave | `member_left` | | `team_unlocked` (only if the team was locked) |
| lock | `team_locked` | | `team_locked` |
| unlock | `team_unlocked` | | `team_unlocked` |
| delete team | `team_deleted` | | `team_deleted` |
| rename | `team_renamed` | | `team_renamed` |
| promote / demote admin | `admin_granted` / `admin_revoked` | | |
| transfer captaincy | `captain_transferred` | | |
| flag / unflag looking for team | | | `looking_for_team_changed` |

Joining a team (accept invitation, accept request, join by code) also pulls the user out of their
other DRAFT teams in that tournament. Each of those teams gets `team:updated` (`member_left`, or
`team_deleted` when the user was alone in it, which also sends `tournament:updated`).

**Team room membership.** `team:<id>` is authorised once, at `subscribe` time
(`RealtimeAccessService.isTeamMember`), so two things keep it honest:

- A user who has just joined is not in the room yet. The page must subscribe *after* it knows the
  team id. `TeamSetupCard` passes a getter (`() => myTeam.value?.id`) to `useLiveChannel`, so
  the room is joined as soon as the refetch after joining reports the team, and left when they
  are removed.
- A user who leaves or is kicked would otherwise stay in the room until they reload.
  `RealtimeService.leaveTeamRoom(userId, teamId)` removes all their sockets from it; the leave,
  kick and "pulled out of another draft team" paths call it.

**Frontend.** `TeamSetupCard` listens on `team:<my team>`, `tournament:<id>` and the user events
and refetches team, invitations, join requests and availability. `TournamentDetailCard` listens on
`tournament:<id>` (refetch tournament, team state and looking-for-team board) and on the user
events (refetch my team state). Both resync after a reconnect. There is no extra toast: the
notifications module already sends a bell notification for invitations, join requests and their
answers, so the pages only refetch. `useCoalescedRefresh` collapses bursts of events into at most
one extra fetch.

## Adding a new channel or event

1. Add the event name to `realtime.events.ts` and `frontend/src/types/realtime.ts`.
2. For a new room type, add it to `SUBSCRIBABLE_CHANNELS` and `roomName` (backend), to
   `LiveChannel` (frontend), and give `RealtimeAccessService.canJoin` a rule for it.
3. Publish from the command, subscribe from the page, add a test on each side.

## Where the match membership check lives

`RealtimeAccessService.isMatchParticipant` is the one place that knows how a match points at its
teams (currently the `match_teams` join table). If `Match` moves to explicit `team1_id` /
`team2_id` columns, change that method only.
