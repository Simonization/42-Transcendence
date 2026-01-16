*This project has been created for 42 Belgium by Ahmet, Louis, Nicolas, Simon.*

## Description
esportendence: A tournament organizer for esports competitions...

## Team Information
| Member | Role(s) | Responsibilities |
|--------|---------|------------------|
| Nicolas | Product Owner, Developer | Product vision, Docker/DevOps, ... |
| Simon | Project Manager, Developer | Coordination, Frontend, Database... |
| Ahmet | Technical Lead, Developer | Architecture, Backend, Code review... |
| Louis | Developer | Backend features, ... |

## Project Management
- **Communication:** Whatsapp
- **Task tracking:** Google Sheet
- **Meetings:** Every Friday at 14h, in person
- **Branch strategy:** feature branches → PR → main

## Technical Stack
| Layer | Technology | Justification |
|-------|------------|---------------|
| Frontend | Vue 3? + Tailwind? | [...] |
| Backend | Django? + DRF? + Channels? | [...] |
| Database | PostgreSQL? | [...] |
| Containerization | Docker Compose? | [...] |

## Database Schema
(to add: diagram or description once we have one)

(to be refined & confirmed:)
## Modules

| Module | Category | Type | Points | Owner(s) | Status |
|--------|----------|------|--------|----------|--------|
| Frontend framework (Vue 3) | Web | Minor | 1 | Simon | 🔴 |
| Backend framework (Django) | Web | Minor | 1 | Ahmet, Louis | 🔴 |
| Real-time WebSockets | Web | Major | 2 | Ahmet | 🔴 |
| User interaction | Web | Major | 2 | All | 🔴 |
| ORM (Django ORM) | Web | Minor | 1 | Simon | 🔴 |
| Notification system | Web | Minor | 1 | Louis | 🔴 |
| Custom design system | Web | Minor | 1 | Simon | 🔴 |
| Advanced search | Web | Minor | 1 | Louis | 🔴 |
| I18n (EN/FR/TR) | Accessibility | Minor | 1 | Simon | 🔴 |
| Standard user auth | User Mgmt | Major | 2 | Louis | 🔴 |
| OAuth 2.0 (Riot) | User Mgmt | Minor | 1 | Ahmet | 🔴 |
| Advanced permissions | User Mgmt | Major | 2 | Nicolas | 🔴 |
| Organization system | User Mgmt | Major | 2 | Nicolas | 🔴 |
| 2FA | User Mgmt | Minor | 1 | Louis | 🔴 |
| Advanced chat features | Gaming/UX | Minor | 1 | Ahmet | 🔴 |
| **TOTAL** | | | **20** | | |

### Module Dependencies
- Advanced chat features → requires User interaction (chat) first
- All modules verified for compatibility ✓

(to be confirmed:)
### Modules NOT Selected (with reason)
- **WCAG 2.1 AA Accessibility:** Disproportionate effort for 2 points
- **SSR:** Nuxt.js complexity overhead not justified for 1 point
- **Match history:** Requires hosted game (to discuss with corrector or bocal)
- **Tournament system module:** Requires hosted game (to discuss with corrector or bocal)
- **Additional browsers:** May add in Week 6 if time permits

## Features List
(to add while implementing)

## Individual Contributions
Each person can update their section weekly

### Ahmet
- Week 1: ...
- Week 2: ...
- Week 3: ...
- Week 4: ...
- Week 5: ...
- Week 6: ...

### Louis
- Week 1: ...
- Week 2: ...
- Week 3: ...
- Week 4: ...
- Week 5: ...
- Week 6: ...

### Nicolas
- Week 1: ...
- Week 2: ...
- Week 3: ...
- Week 4: ...
- Week 5: ...
- Week 6: ...

### Simon
- Week 1: ...
- Week 2: ...
- Week 3: ...
- Week 4: ...
- Week 5: ...
- Week 6: ...


## Instructions
### Prerequisites
- Docker and Docker Compose
- (versions)

### Installation
```bash
git clone ...
cp .env.example .env
docker-compose up --build
```

### Access
- Frontend: https://localhost:8443
- API docs: https://localhost:8443/api/docs

## Resources
- (Links to docs, tutorials)
- **AI Usage:**
  - used to develop product dashboard in Google Sheet

# 42-Transcendence
