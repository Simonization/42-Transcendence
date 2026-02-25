# Briefing A — Polish & Demo Prep

## What this option is about

Option A means: stop building new features, and instead make sure everything we already built looks clean, works reliably, and is easy to demonstrate to the corrector.

---

## What I would do

### 1. Commit + push the uncommitted teams work
Right now you have ~15 changed/new files sitting uncommitted (teams API, games API, rewritten registration modal, team invitations panel, etc.). This needs to be committed and pushed to `simon/frontend` so it's safe.

**Time: 2 minutes.**

### 2. Add tests for new composables
`useTeams.ts` was just created but has no unit tests. I'd write tests covering:
- `createTeam()` success and error paths
- `invitePlayer()` and `lockTeam()`
- `fetchMyInvitations()`, `acceptInvitation()`, `declineInvitation()`

**Time: ~20 minutes.**

### 3. TypeScript strictness pass
Run `npx tsc --noEmit` and fix any type errors. Make sure there are no sneaky `any` types or missing imports that could cause runtime crashes during demo.

**Time: ~15 minutes depending on how many issues.**

### 4. Error UX / graceful degradation
When the backend is down (which it might be during correction if Docker has issues), the app currently just silently fails. I would add:
- A small banner or toast when API calls fail repeatedly ("Connection lost")
- Empty-state messages in tournament lists, team panels, etc. instead of blank screens

**Time: ~30 minutes.**

### 5. Demo script document
Write a markdown file that walks you through: "Open the app → here's how to show auth → here's how to show chat → here's how to show tournaments → etc." One section per corrector point, with screenshots or descriptions of what the corrector should see.

**Time: ~20 minutes.**

### 6. Privacy/ToS pages review
These already exist and are routed (`/privacy`, `/terms`). I'd quickly check they render correctly and the links from footer/signup page work.

**Time: 5 minutes.**

---

## Is this necessary NOW, or can it wait?

### Can wait until next week:
- **Demo script** — You can write this Sunday night or even Monday morning. It's just a document.
- **Privacy/ToS review** — Already working, quick check anytime.
- **TypeScript strictness** — Nice-to-have, not blocking anything.

### Better to do now:
- **Commit + push** — Yes, do this NOW. Uncommitted work = risk of losing it.
- **Tests for useTeams** — Better to write while the code is fresh. But honestly, the corrector won't run your tests. They check if your app works.
- **Error UX** — This is the most impactful polish item. If the backend hiccups during demo and the screen just goes blank, that looks bad. A friendly "loading..." or "couldn't connect" message makes the difference.

### Verdict

**Most of Option A can wait until Saturday/Sunday polish day.** The only thing that's urgent is committing your work and maybe the error UX. The rest is "nice to have" that you can squeeze in during the final weekend.

Don't spend Thursday on polish when you could be building things that earn points or unblocking backend integration.
