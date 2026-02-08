# ✅ CORRECTED: Backend Team Communication - Week 4 Integration

**Date**: 2026-02-08
**To**: Ahmet, Louis, Nicolas (Backend Team)
**Subject**: Week 4 Module Specifications & Integration Details

---

## Overview

Frontend is production-ready and waiting for backend APIs. Detailed specifications for your Week 4 modules are now available. See correct file references below.

---

## For Everyone: Start Here

1. **Frontend Status Overview**:
   - Read: `/home/slang/42-Transcendence/FRONTEND_READY.md`
   - Contains: Week 4 deliverables, API integration points, current test coverage

2. **Backend Architecture Context**:
   - Read: `/docs/backend_architecture.md`
   - Contains: General backend structure, authentication flow, entity models

3. **Detailed Week 4 Specifications**:
   - Read: `/home/slang/42-Transcendence/BACKEND_INTEGRATION_GUIDE.md` ← **NEW - All specs are here**
   - Contains: All API endpoints, WebSocket events, data structures, integration checklists

---

## Individual Assignments

### Ahmet - Chat/WebSocket Module

**Read these files in order**:
1. `/home/slang/42-Transcendence/BACKEND_INTEGRATION_GUIDE.md` - **Section 1: CHAT & WEBSOCKET**
   - 8 REST endpoints (rooms + messages)
   - 5+ Socket.io events
   - Data structures
   - Integration checklist

2. `/docs/backend_architecture.md` - Section 5: CHAT MODULE ENDPOINTS
   - General architecture context
   - Entity definitions

**What to implement**:
- ✅ GET /api/chat/rooms
- ✅ POST /api/chat/rooms
- ✅ PATCH /api/chat/rooms/:id/read
- ✅ DELETE /api/chat/rooms/:id/leave
- ✅ GET /api/chat/messages
- ✅ POST /api/chat/messages
- ✅ PATCH /api/chat/messages/:id
- ✅ DELETE /api/chat/messages/:id
- ✅ Socket.io: connection, room:join, message:send, room:leave events

---

### Louis - Notifications Module

**Read these files in order**:
1. `/home/slang/42-Transcendence/BACKEND_INTEGRATION_GUIDE.md` - **Section 2: NOTIFICATIONS**
   - WebSocket event handler pattern
   - When to send notifications (8 scenarios)
   - Frontend API usage examples
   - Integration checklist

2. `/docs/backend_architecture.md` - General backend structure
   - (Notifications not in main architecture yet - this is new work)

**What to implement**:
- ✅ Socket.io event: notification:new
- ✅ Notification sender: Send on friend request received
- ✅ Notification sender: Send on friend request accepted
- ✅ Notification sender: Send on friend removed
- ✅ Notification sender: Send on user blocked/unblocked
- ✅ Notification sender: Send on tournament registration
- ✅ Notification sender: Send on match history updated
- ✅ Send via existing Socket.io connection (no new endpoint needed)

---

### Nicolas - Match History Module

**Read these files in order**:
1. `/home/slang/42-Transcendence/BACKEND_INTEGRATION_GUIDE.md` - **Section 3: MATCH HISTORY**
   - 2 REST endpoints (GET + POST)
   - Optional chess.com API integration
   - Data structures
   - Pagination specs
   - Integration checklist

2. `/docs/backend_architecture.md` - General backend structure
   - (Match history not in main architecture yet - this is new work)

**What to implement**:
- ✅ GET /api/match-history (with filters & pagination)
- ✅ POST /api/match-history (record new match)
- ✅ Optional: Integrate chess.com API (see specs in integration guide)
- ✅ ELO calculation and change tracking
- ✅ Support for multiple game types

---

## Complete API Reference

All 14 endpoints specified in:
👉 `/home/slang/42-Transcendence/BACKEND_INTEGRATION_GUIDE.md` - API Summary Table

---

## Quality Assurance

**Evaluation Criteria** (from Corrector.md):
- Notification system (1 point) - Planned W4
- Match history chess.com integration (1 point) - Planned W4
- Real-time WebSocket features (2 points) - Planned W4

**Frontend Testing**:
- 381/410 tests passing (92.9%)
- 0 build errors
- Production-ready components
- Ready for your APIs

---

## Integration Testing

Once you implement the endpoints:

1. **Manual Testing**:
   - Start app: https://localhost:8443
   - Test Chat: Send message via WebSocket, verify real-time delivery
   - Test Notifications: Trigger action, see toast appear
   - Test Match History: View matches, verify filters & pagination

2. **Automated Testing**:
   ```bash
   npm test  # from backend directory
   npm test  # from frontend directory
   ```

---

## Questions?

- **Chat/WebSocket questions**: See BACKEND_INTEGRATION_GUIDE.md Section 1
- **Notifications questions**: See BACKEND_INTEGRATION_GUIDE.md Section 2
- **Match History questions**: See BACKEND_INTEGRATION_GUIDE.md Section 3
- **General architecture**: See /docs/backend_architecture.md
- **Frontend status**: See FRONTEND_READY.md
- **Evaluation criteria**: See Corrector.md

---

## File Summary

| File | Purpose | Who Should Read |
|------|---------|-----------------|
| FRONTEND_READY.md | Frontend status overview | Everyone |
| BACKEND_INTEGRATION_GUIDE.md | Week 4 detailed specs | Ahmet, Louis, Nicolas |
| /docs/backend_architecture.md | Architecture context | Everyone |
| Corrector.md | Evaluation criteria | Everyone (reference) |
| CLAUDE.md | Project overview | Reference only |

---

**Ready to start? Begin with BACKEND_INTEGRATION_GUIDE.md!**

---

**Corrected Communication**: 2026-02-08
**Previous Communication**: Contained incorrect file references (notifications & match history not in backend_architecture.md)
**Status**: ✅ All specs now documented in dedicated integration guide
