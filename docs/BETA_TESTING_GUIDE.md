# Beta Testing Guide - esportendence

Welcome to the esportendence beta testing program! This guide will help you test our esports companion platform.

**Project:** esportendence (42 Belgium school project)
**Version:** Week 3 Beta (February 7, 2026)
**Access URL:** https://localhost:8443

---

## 1. Quick Start

### Prerequisites
- **Docker** installed on your machine
- **Docker Compose** installed
- **Modern web browser** (Chrome 100+, Firefox 100+, Edge 100+, or Safari 17+)

### Setup Instructions

1. Navigate to the project directory:
   ```bash
   cd /path/to/42-Transcendence
   ```

2. First-time setup (only needed once):
   ```bash
   make setup
   ```

3. Start the application:
   ```bash
   make up
   ```

4. Wait 30-60 seconds for all services to start

5. Open your browser and navigate to:
   - **Main app:** https://localhost:8443
   - **Database admin (optional):** https://localhost:5050

### SSL Certificate Warning

You'll see a security warning because we use a self-signed SSL certificate for local development. This is normal and safe for testing.

**To proceed:**
- **Chrome/Edge:** Click "Advanced" → "Proceed to localhost (unsafe)"
- **Firefox:** Click "Advanced" → "Accept the Risk and Continue"
- **Safari:** Click "Show Details" → "visit this website"

### Database Admin Access (Optional)

If you need to inspect the database:
- URL: https://localhost:5050
- Email: `admin@admin.com`
- Password: `admin`

### Stopping the Application

```bash
make down
```

---

## 2. Feature Status (as of Week 3, Feb 7 2026)

### ✅ Working Features

These features are stable and ready for testing:

- **User Registration** - Create an account with email and password
- **Email Verification** - Verify your email address to activate your account
- **Login / Logout** - Standard authentication flow
- **Two-Factor Authentication (2FA)** - Enable email-based 2FA for extra security
- **Google OAuth Login** - Sign in with your Google account
- **User Profile Editing** - Change your display name and upload an avatar
- **User Settings** - Configure language, theme, and timezone preferences
- **Theme Switching** - Toggle between Stellar (light/orange) and Dragon (dark/gold) themes
- **Account Deletion** - Permanently delete your account and all data

### 🚧 Work In Progress

These features exist but may have stability issues:

- **Friends System** - Add friends, send/accept friend requests, view friend list
- **Blocking System** - Block users to prevent interactions
- **Chat Rooms** - Create and join chat rooms
- **Real-time Messaging** - Send and receive messages via WebSocket
  - **Note:** Chat may be unstable; reconnections might be needed

### ❌ Not Yet Available

These features are planned but not implemented:

- Match history (external API integration with chess.com, etc.)
- Notification system
- Advanced user search
- Internationalization (i18n) - English only for now
- Password reset via email

---

## 3. Test Scenarios

### Scenario 1: Sign Up and Verify Email

**Goal:** Create a new account and complete email verification.

1. Navigate to https://localhost:8443
2. You should be redirected to the login/registration page
3. Click the **"Register"** or **"Sign Up"** tab/button
4. Fill in the registration form:
   - Display name (e.g., "BetaTester42")
   - Email address (use a real email you can access)
   - Password (minimum 8 characters)
5. Click **"Register"** or **"Create Account"**
6. You should see a message: "Verification email sent"
7. Check your email inbox for a verification email from esportendence
8. Click the verification link in the email
9. You should be redirected back to the app with a success message
10. Log in with your new credentials

**Expected Result:** Account created successfully, email verified, able to log in.

---

### Scenario 2: Login and Explore Profile Settings

**Goal:** Log in and customize your profile.

1. Navigate to https://localhost:8443
2. Log in with your credentials (from Scenario 1)
3. After successful login, you should see the main menu/dashboard
4. Navigate to the **"User"** or **"Profile"** section (look for menu navigation)
5. Explore the different tabs:
   - **Profile:** View and edit your display name and avatar
   - **Settings:** Change theme, language, timezone preferences
   - **Security:** Manage 2FA settings
6. Try changing your display name:
   - Click **"Edit"** or directly edit the display name field
   - Enter a new name
   - Click **"Save"** or **"Update"**
7. Try uploading an avatar (if available):
   - Click **"Upload Avatar"** or similar button
   - Select an image file (JPG, PNG recommended)
   - Save the changes
8. Try changing the theme:
   - Go to **Settings** tab
   - Select a different theme (Stellar or Dragon)
   - Observe the color scheme change

**Expected Result:** Profile updates saved successfully, theme changes apply immediately.

---

### Scenario 3: Enable/Disable Two-Factor Authentication

**Goal:** Secure your account with 2FA and test the verification flow.

1. Log in to your account
2. Navigate to the **User** section → **Security** tab
3. Find the **"Two-Factor Authentication"** or **"2FA"** section
4. Click **"Enable 2FA"** or toggle the 2FA switch to ON
5. You should see a confirmation message
6. **Log out** of your account (find logout button in menu)
7. Attempt to **log in again** with your email and password
8. After entering credentials, you should be prompted for a 2FA code
9. Check your email for the 2FA verification code
10. Enter the code in the app
11. You should successfully log in
12. To disable 2FA:
    - Go back to **User** → **Security** → **2FA**
    - Click **"Disable 2FA"** or toggle OFF
    - Confirm the action

**Expected Result:** 2FA enables successfully, login requires email verification code, 2FA can be disabled.

---

### Scenario 4: Add a Friend and Send a Chat Message

**Goal:** Test the social features (friends and chat).

**Note:** This feature is work-in-progress and may have bugs.

1. Log in with your main account (Account A)
2. Open a second browser (or incognito window) and create/login with a second account (Account B)
3. **From Account A:**
   - Navigate to **Friends** or **Social** section
   - Click **"Add Friend"** or similar button
   - Enter Account B's display name or email
   - Send the friend request
4. **From Account B:**
   - Navigate to **Friends** section
   - Look for **"Friend Requests"** or **"Pending Requests"** tab
   - You should see a request from Account A
   - Click **"Accept"**
5. **From Account A:**
   - Verify Account B now appears in your friend list
6. **Testing Chat:**
   - Navigate to **Chat** section (from either account)
   - Look for an option to create a new chat or start a conversation
   - If chat rooms exist, join or create a room
   - Type a message and press Enter or click Send
   - Check if the message appears in the conversation
7. **From Account B:**
   - Navigate to **Chat** section
   - Join the same chat room (if needed)
   - Verify you can see Account A's message
   - Send a reply

**Expected Result:** Friend request sent and accepted successfully. Chat messages send and receive in real-time.

**Known Issues:** WebSocket chat may disconnect or show delays. Refresh the page if messages don't appear.

---

### Scenario 5: Switch Themes

**Goal:** Test theme switching across the application.

1. Log in to your account
2. Navigate to **User** → **Settings**
3. Find the **"Theme"** setting
4. Note the current theme:
   - **Stellar** = Light theme with orange accents
   - **Dragon** = Dark theme with gold accents
5. Click the theme toggle or select a different theme from the dropdown
6. Observe the immediate color change:
   - Background colors should change
   - Text colors should adjust for readability
   - Accent colors should update (orange vs gold)
7. Navigate to different sections of the app (Profile, Friends, Chat)
8. Verify the theme applies consistently across all pages
9. Switch back to the original theme
10. Verify the change persists after:
    - Navigating to different pages
    - Refreshing the browser
    - Logging out and logging back in

**Expected Result:** Theme changes apply instantly, persist across navigation and sessions.

**Known Issue:** Auth pages (login/register) always use a dark theme regardless of your setting.

---

## 4. Known Issues & Limitations

Please be aware of these current limitations:

### Design & UX
- **Desktop-only design** - The interface is not optimized for mobile or tablet devices
- **Auth pages use dark theme** - Login and registration pages ignore your theme preference and always use dark colors
- **No error notifications** - Error messages may appear in console instead of user-friendly toasts/alerts

### Chat & WebSocket
- **Chat disconnections** - The WebSocket connection may drop unexpectedly
  - **Workaround:** Refresh the page to reconnect
- **Message delays** - Real-time messages may experience lag or fail to send
- **Chat stability** - This feature is still under development and may have bugs

### Authentication
- **Auth guard is basic** - You might briefly see protected pages before being redirected to login
- **Token validation is client-side** - The app checks if a token exists in localStorage, not if it's valid

### Browser & Security
- **Self-signed SSL certificate** - Browser will show security warnings on every visit
- **HTTPS required** - The app must be accessed via https:// (not http://)

### Language & Localization
- **English only** - No internationalization support yet
- **Hardcoded text** - UI labels cannot be changed

### Performance
- **First load may be slow** - Docker services take 30-60 seconds to fully start
- **Database queries** - Some operations may be slower than expected

---

## 5. Supported Browsers

### Recommended Browser
- **Google Chrome 100+** (best testing experience)

### Supported Browsers
- **Mozilla Firefox 100+**
- **Microsoft Edge 100+**
- **Safari 17+** (macOS/iOS)

### Not Supported
- **Mobile browsers** (design is desktop-only)
- **Internet Explorer** (any version)
- **Older browser versions** (before 2022)

### Browser Recommendations
- Use the latest version of your browser
- Enable JavaScript (required)
- Allow cookies (required for authentication)
- Disable browser extensions that block scripts or cookies during testing

---

## 6. Bug Report Template

Please use this template when reporting bugs:

```markdown
## Bug Report

### Summary
[One-line description of the issue]

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [Continue with each step...]

### Expected Behavior
[What you expected to happen]

### Actual Behavior
[What actually happened]

### Environment
- **Browser:** [e.g., Chrome 120, Firefox 115]
- **OS:** [e.g., Windows 11, macOS 14, Ubuntu 22.04]
- **Screen Resolution:** [e.g., 1920x1080]
- **Date/Time of Issue:** [e.g., 2026-02-07 14:30 CET]

### Screenshots
[Attach screenshots if applicable]

### Console Errors
[Open browser DevTools (F12) → Console tab, copy any red error messages]

### Additional Context
[Any other relevant information, workarounds you found, etc.]
```

### Where to Submit Bug Reports
[Add your preferred method: GitHub Issues, email, bug tracker, etc.]

---

## 7. Architecture Overview (for Technical Testers)

If you're familiar with web development, here's the technical stack:

### Frontend
- **Framework:** Vue 3 (Composition API)
- **Build Tool:** Vite
- **Language:** TypeScript
- **Router:** Vue Router 4
- **State Management:** Composables (singleton pattern)
- **Styling:** CSS custom properties (design tokens), theme system

### Backend
- **Framework:** NestJS (Node.js)
- **Language:** TypeScript
- **Database ORM:** TypeORM
- **Database:** PostgreSQL 15
- **Authentication:** JWT tokens + Passport.js
- **OAuth Provider:** Google OAuth 2.0
- **Email:** Nodemailer (SMTP)

### Real-time Communication
- **Library:** Socket.io (WebSocket-based)
- **Events:** Chat messages, friend requests, notifications

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Reverse Proxy:** Nginx (SSL termination, routing)
- **SSL:** Self-signed certificates (local development)

### API Structure
All backend API endpoints are prefixed with `/api/`:
- `/api/auth/*` - Authentication (login, register, 2FA, OAuth)
- `/api/users/*` - User management (profile, settings, account)
- `/api/social/*` - Friends and blocking
- `/api/chat/*` - Chat rooms and messages

### Documentation
For detailed technical documentation, see:
- `/docs/backend_architecture.md` - Complete API reference
- `/frontend/docs/` - Frontend architecture, components, modules

### Development Tools
- **Database Admin:** pgAdmin at https://localhost:5050
- **Browser DevTools:** F12 (inspect network requests, console errors)
- **Docker Logs:** `docker-compose logs -f [service]` (backend, frontend, nginx, db)

---

## Tips for Effective Testing

1. **Test in multiple browsers** - Try Chrome, Firefox, and Edge if possible
2. **Clear your cache** - If you see strange behavior, try clearing browser cache (Ctrl+Shift+Delete)
3. **Check the browser console** - Press F12 and look for red error messages
4. **Test edge cases** - Try invalid inputs, special characters, very long text
5. **Test the happy path first** - Follow the scenarios above before exploring edge cases
6. **Document everything** - Take screenshots, note exact steps that caused issues
7. **Be patient** - This is beta software; bugs are expected and appreciated!

---

## Thank You!

Your feedback is invaluable to making esportendence better. Happy testing!

**Questions or Issues?**
Contact the development team or submit a bug report using the template above.
