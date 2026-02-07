# Backend - esportendence

NestJS backend API for the esportendence esports companion platform.

## Quick Start

```bash
npm install
npm run start:dev    # Dev server with hot reload
npm run build        # Production build
npm run start:prod   # Run production build
```

## Modules

- **auth/** - JWT authentication, refresh tokens, email verification, 2FA, Google OAuth
- **users/** - User management, profiles, settings
- **friends/** - Friend requests, blocking system
- **chat/** - Real-time messaging (Socket.io), rooms, messages
- **mail/** - Email notifications via Nodemailer

## API Routes

All routes are prefixed with `/api/`:

- `/api/auth/*` - Login, register, refresh, 2FA, OAuth
- `/api/users/*` - Get/update user, profile, settings, delete account
- `/api/social/friends` - List, add, remove friends
- `/api/social/blocks` - List, add, remove blocks
- `/api/chat/rooms` - List, create rooms, mark read, leave
- `/api/chat/messages` - Send, edit, delete messages

## Database

PostgreSQL 15 with TypeORM. Main entities:

- User, UserProfile, UserSettings
- RefreshToken
- Friend, Block
- Chat, Message, ChatParticipant

## Testing

```bash
npm test              # All tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage
npm run test:e2e      # E2E tests
```

## Environment

Requires `.env` file (copied from root `.env` during `make setup`). See root `dotenv_example` for variables.

## Related Documentation

- [Backend Architecture](../docs/backend_architecture.md) - Complete API documentation
- [Type System Guide](../docs/TYPE_SYSTEM_GUIDE.md) - Shared type conventions
