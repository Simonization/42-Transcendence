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
| `MATCH_UPDATED` | `match:updated` | `match:<id>`, and `user:<id>` of the players | score, confirmation or status of one match. On the user room it is sent only when a result appears, changes or is undone, so the match history can refresh; `id` is still the match |
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

## Brackets and matches: who publishes what

Publishing for the match loop goes through one service,
`backend/src/modules/tournaments/services/bracket-publisher.service.ts` (`BracketPublisher`),
which each command calls once after its transaction commits (`matchChanged(matchId, reason,
events?)` or `tournamentChanged(tournamentId, reason, events?, extra?)`). `events` is what the
bracket engine collected during the command: the matches that became READY and whether the
tournament completed. The publisher also creates the chat of every match that became READY (see
"Match chat" below), before it tells the teams.

| Command | `match:<id>` (`MATCH_UPDATED`) | `tournament:<id>` | `team:<id>` (`TEAM_UPDATED`) | `user:<id>` (`MATCH_UPDATED`) |
|---|---|---|---|---|
| report | `score_reported` | `BRACKET_UPDATED` `score_reported` | both teams: `score_reported` | |
| confirm | `match_finished` | `BRACKET_UPDATED` `match_finished` | both teams: `match_finished` | players: `match_finished` |
| dispute | `match_disputed` | `BRACKET_UPDATED` `match_disputed` | both teams: `match_disputed` | |
| resolve (admin) | `match_resolved` | `BRACKET_UPDATED` `match_resolved` | both teams: `match_resolved` | players: `match_resolved` |
| undo (admin) | `match_undone` | `BRACKET_UPDATED` and `TOURNAMENT_UPDATED` `match_undone` | both teams: `match_undone` | players: `match_undone` |
| edit, `PATCH /matches/:id` (admin) | `match_edited` | `BRACKET_UPDATED` `match_edited` | both teams: `match_edited` | players: `match_edited` |
| start tournament | each match that is READY | `BRACKET_UPDATED` and `TOURNAMENT_UPDATED` `tournament_started` | teams of the READY matches: `tournament_started` | |
| seeding change | | `BRACKET_UPDATED` and `TOURNAMENT_UPDATED` `seeding_changed` | | |
| withdraw team | each settled match | `BRACKET_UPDATED` and `TOURNAMENT_UPDATED` `team_withdrawn` | the withdrawn team and the teams of the affected matches: `team_withdrawn` | players: `team_withdrawn` |
| edit, `PATCH /tournaments/:id` (admin) | | `TOURNAMENT_UPDATED` `tournament_edited` | | |
| delete, `DELETE /tournaments/:id` (admin) | | `TOURNAMENT_UPDATED` `tournament_deleted` | | |

Edit and delete go through `BracketPublisher.settingsChanged` (no bracket event). After a
`tournament_deleted` the refetch answers 404, which the tournament and bracket pages show as "not
found". Creating a tournament publishes nothing: nobody can be subscribed to its room yet.

On top of the row, any command whose result made another match READY (a winner advanced, a bye
resolved, the next phase started) also sends that match `match:updated` and its two teams
`team:updated`, with the command's reason. A command that completes the tournament also sends
`TOURNAMENT_UPDATED` with reason `tournament_completed`.

**Frontend.** `TournamentBracketsCard` joins `tournament:<id>` and refetches on `BRACKET_UPDATED`
and `TOURNAMENT_UPDATED`. `MyTournamentsTab` joins the room of every tournament it lists
(`useLiveChannels`, the multi-room variant of `useLiveChannel`) and refetches the list quietly.
`MatchHistoryCard` listens for `MATCH_UPDATED` on the user room (`useUserEvents`). All three
coalesce bursts and refetch after a reconnect. `TournamentDetailCard` (bracket tab) and
`TeamSetupCard` already listen on the tournament room for `TOURNAMENT_UPDATED`, which start,
seeding, withdrawal, completion and undo send; they do not need `BRACKET_UPDATED` unless they
start to draw the bracket themselves.

## Match chat

When a match becomes READY (both slots filled, also after a bye advances or a winner moves on),
`MatchChatService.ensureRoom` (chat module) creates one group chat, titled "<Team A> vs <Team B>",
whose participants are every member of both teams. The link is `matches.chat_room_id`
(nullable, FK to `chats` with `ON DELETE SET NULL`). Creation is idempotent: it locks the match
row, reuses the existing room (also after an undo puts the match back to READY) and does nothing
for WAITING, BYE, FINISHED or CANCELLED matches.

- Members are copied once, at creation. People who join or leave a team later are not synced.
  `POST /matches/:id/chat` (member of either team) returns `{ chatId }`, creating the room if the
  match was READY before chats existed and adding the caller if they are a team member but not a
  participant. The "Match chat" button on the bracket uses it, then opens
  `/menu/chat?openRoom=<chatId>`.
- The room is left as it is when the match finishes, so a result or dispute can still be
  discussed and the history stays readable. Members can leave it like any group chat.
- Creating the room is best effort: a failure is logged and never fails the command.

## Adding a new channel or event

1. Add the event name to `realtime.events.ts` and `frontend/src/types/realtime.ts`.
2. For a new room type, add it to `SUBSCRIBABLE_CHANNELS` and `roomName` (backend), to
   `LiveChannel` (frontend), and give `RealtimeAccessService.canJoin` a rule for it.
3. Publish from the command, subscribe from the page, add a test on each side.

## Where the match membership check lives

`RealtimeAccessService.isMatchParticipant` is the one place that knows how a match points at its
teams (today the explicit `team1_id` / `team2_id` slots, read through the `team1` and `team2`
relations). If that changes, change that method only.
