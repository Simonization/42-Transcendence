# Contrat API Backend — Message pour Nicolas

> Date : 2026-02-25 (UPDATED after reviewing backend_nico commits)

## STATUS: J'ai analysé ta branche backend_nico en détail

Nice work on the Games + Tournaments + Teams + Invitations system! I'm ready to wire the frontend to it. But I have **blockers** — see section 7 below.

---

## 1. Match History — CHANGEMENT CASSANT

Ta nouvelle entité Match sur backend_nico supprime game_type et userMatches et ajoute phase/teams/status. Le frontend s'attend actuellement à :

```
GET /api/matches/my-history → BackendMatch[]
GET /api/matches/history/:userId → BackendMatch[]
```

Le frontend attend cette structure :

```json
{
  "id": 1,
  "game_type": 1,
  "created_at": "2026-02-25T...",
  "userMatches": [
    { "userId": 1, "result": "WIN", "user": { "id": 1, "username": "simon" } },
    { "userId": 2, "result": "LOSS", "user": { "id": 2, "username": "john" } }
  ]
}
```

Deux options :
- **Option A (la plus simple)** : Ajoute un transform dans ton controller qui mappe la nouvelle entité vers l'ancienne structure pour ces deux endpoints. Le frontend n'aura pas besoin de changements.
- **Option B** : Dis-moi la structure exacte que tes endpoints renvoient, et j'adapterai les types + le transformer côté frontend. Envoie-moi juste un exemple de réponse JSON.

## 2. Tournaments — C'est bon, le frontend est déjà wired

Le frontend appelle déjà :

| Méthode | URL                  | Status |
|---------|----------------------|--------|
| GET     | /tournaments         | ✅ Wired (advanced search + browse) |
| GET     | /tournaments/:id     | ✅ Wired (detail page) |
| POST    | /tournaments         | ✅ Wired (creation flow) |
| PATCH   | /tournaments/:id     | ✅ Wired |
| DELETE  | /tournaments/:id     | ✅ Wired |

**Question importante** : Est-ce que `GET /tournaments` retourne les phases **avec la relation game** ? J'ai besoin de `phase.game.teamSize` et `phase.game.teamCount` pour savoir combien de joueurs par équipe. Si le game n'est pas eager-loaded, je n'ai pas l'info.

## 3. Games — Je vais créer games.ts côté frontend

Tes endpoints sont clean :

| Méthode | URL           | Frontend usage |
|---------|---------------|----------------|
| GET     | /games        | Game selector dans la création de tournoi |
| GET     | /games/:id    | Détails du jeu (teamCount, teamSize) |

Je vais créer `frontend/src/api/games.ts` pour les appeler.

## 4. Teams — C'est le gros morceau pour demain

J'ai vu tes endpoints :

| Méthode | URL                               | Ce que je comprends |
|---------|------------------------------------|---------------------|
| POST    | /teams                             | Crée équipe (captain = current user) |
| PATCH   | /teams/:id/invite                  | Captain invite un joueur |
| PATCH   | /teams/:id/kick                    | Captain vire un joueur |
| PATCH   | /teams/:id/lock                    | Lock l'équipe quand elle est pleine |
| GET     | /teams/invitations/my              | Mes invitations en attente |
| PATCH   | /teams/invitations/:id/accept      | Accepter une invitation |
| PATCH   | /teams/invitations/:id/decline     | Refuser une invitation |

**Ce que je vais builder côté frontend :**
1. Quand un user clique "Register" sur un tournoi :
   - Si `game.teamSize === 1` → créer une équipe solo + auto-lock
   - Si `game.teamSize > 1` → montrer la draft d'équipe, inviter des amis
2. Notification d'invitation → accept/decline inline
3. Écran "My Team" avec statut DRAFT → LOCKED

## 5. Chat REST — Critique pour la démo

Voici les endpoints chat que le frontend appelle (vérifie s'ils correspondent à ce qui existe dans le ChatModule) :

| Méthode | URL                                            | Body                                 | Réponse                                   |
|---------|------------------------------------------------|--------------------------------------|-------------------------------------------|
| GET     | /chat/rooms?limit=50                           | —                                    | ChatRoom[] avec participants, lastMessage |
| POST    | /chat/rooms                                    | { userIds: [2, 3], title?: "Group" } | ChatRoom                                  |
| GET     | /chat/rooms/:chatId/messages?limit=20&offset=0 | —                                    | Message[]                                 |
| POST    | /chat/messages                                 | { chatId: 1, content: "hello" }      | Message                                   |

ChatRoom doit inclure :
- id, type (0=DM, 1=Group), title, participants: [{ id, username }], lastMessage, isUnread

Message doit inclure :
- id, chatId, senderId, content, createdAt, editedAt, deletedAt, sender: { id, username }

Ahmet dit que GET /chat/rooms renvoie 404 — c'est peut-être un problème de montage du module. Tu peux vérifier si ChatModule est correctement importé dans app.module.ts avec le bon préfixe de controller ?

## 6. Friends — Existant mais à tester

| Méthode | URL                           | Body                 | Réponse  |
|---------|-------------------------------|----------------------|----------|
| GET     | /social/friends?myId={userId} | —                    | Friend[] |
| POST    | /social/friends               | { friendId: number } | Friend   |
| DELETE  | /social/friends               | { friendId: number } | void     |

Structure Friend :

```json
{
  "id": 1,
  "username": "john",
  "profile": { "displayName": "John", "avatarUrl": null, "bio": null },
  "status": 0,
  "since": "2026-02-25T..."
}
```

Le frontend a besoin du status pour distinguer les demandes en attente des amis acceptés. Quand quelqu'un accepte une demande d'ami, le status doit passer de 0 → 1.

---

## 7. BLOCKERS — J'ai besoin de réponses pour avancer

### 🔴 CRITIQUE (bloquant pour demain)

**B1. TeamsModule est-il dans app.module.ts ?**
J'ai vu que tu as créé le module, mais est-ce qu'il est importé dans app.module ? Si non, le frontend ne pourra pas appeler `/teams/*`.

**B2. Qu'est-ce que `POST /teams` retourne exactement ?**
J'ai besoin du JSON exact. Est-ce que ça retourne le team avec le captain et les members ? Genre :
```json
{ "id": 1, "name": "Dragons", "status": "DRAFT", "captain_id": 5, "captain": { "id": 5, "username": "simon" }, "members": [{ "id": 5, "username": "simon" }] }
```

**B3. Flow de registration : qui crée la team ?**
Quand un user s'inscrit à un tournoi, est-ce que :
- (A) Le frontend appelle `POST /teams { name, tournament_id }` et c'est tout ? Pas besoin d'un endpoint `/tournaments/:id/register` séparé ?
- (B) Ou bien il y a un endpoint spécifique pour lier team → tournament ?

**B4. Comment changer d'équipe ?**
C'est ta propre question : "quand tu es inscrit et quelqu'un te demande de rejoindre son équipe, comment changer ?"
→ Il faut un `DELETE /teams/:id/leave` ou `PATCH /teams/:id/leave`. Est-ce que ça existe ? Sinon, il faut le créer.

**B5. Relation Game dans GET /tournaments**
Est-ce que `GET /tournaments` retourne `phases[].game` avec `teamSize` et `teamCount` ? Sinon j'ai pas l'info pour savoir si c'est solo ou team.

### 🟡 BUG (à fixer avant la démo)

**B6. Match-Team entity mismatch**
`Match.teams` est un `@OneToMany(() => Team, team => team.match)` mais `Team` n'a PAS de propriété `match`. Ça va crash quand on query les matches. Il faut soit :
- Ajouter `@ManyToOne(() => Match) match: Match` dans team.entity
- Ou changer la relation dans match.entity

**B7. Match.userMatches pas défini**
`UserMatch` fait `@ManyToOne(() => Match, match => match.userMatches)` mais `Match` n'a pas `userMatches`. Même problème.

### 🟢 NICE TO HAVE (vendredi)

**B8. Match auto-generation**
Quand est-ce que les matches seront auto-générés ? Pour le bracket display, même des matches vides (WAITING) suffisent. Un simple algo single-elimination serait top.

**B9. Status transitions**
Qui passe le tournoi de REGISTRATION_OPEN → ONGOING → COMPLETED ? Admin ? Automatique quand tous les teams sont locked ?

## 8. Endpoints admin (si t'as le temps, vendredi)

| Méthode | URL                             | But                                              |
|---------|---------------------------------|--------------------------------------------------|
| GET     | /users?page=1&limit=20&q=search | Liste paginée des utilisateurs pour le panel admin |
| PATCH   | /users/:id                      | Admin : modifier username, status, role, avatarUrl |
| GET     | /users/search?q=...             | Recherche d'utilisateurs pour le module de recherche |

Ahmet a aussi demandé les deux premiers — donc celui qui s'y met en premier.
