import { createRouter, createWebHistory } from 'vue-router'
import { getAccessToken } from '../api'
import { useAuthStore } from '../stores/auth'
import { setActivePinia, createPinia } from 'pinia'
import { UserRole } from '../types'

declare module 'vue-router' {
  interface RouteMeta { requiredRole?: number }
}

// Ensure Pinia is available for router guards
let pinia: ReturnType<typeof createPinia> | null = null

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Auth routes (public)
    {
      path: '/auth',
      name: 'auth',
      component: () => import('../pages/auth/AuthPage.vue'),
    },
    {
      path: '/auth/verify-email',
      name: 'verify-email',
      component: () => import('../pages/auth/VerifyEmailPage.vue'),
    },
    {
      path: '/auth/2fa',
      name: 'two-factor',
      component: () => import('../pages/auth/TwoFactorPage.vue'),
    },
    {
      path: '/auth/callback',
      name: 'oauth-callback',
      component: () => import('../pages/auth/OAuthCallbackPage.vue'),
    },

    // Menu routes (authenticated)
    {
      path: '/menu',
      // Bare /menu has no matching child, so it used to render the layout with an empty
      // content pane. Redirect it to the default module instead.
      redirect: '/menu/user',
      component: () => import('../layouts/MenuLayout.vue'),
      children: [
        {
          path: 'user',
          name: 'user',
          component: () => import('../pages/menu/UserCard.vue'),
        },
        {
          path: 'friend',
          name: 'friend',
          component: () => import('../pages/menu/FriendCard.vue'),
        },
        {
          path: 'chat',
          name: 'chat',
          component: () => import('../pages/menu/ChatCard.vue'),
        },
        // Exposes request/response bodies and an access-token prefix, so dev builds only.
        ...(import.meta.env.DEV
          ? [{
              path: 'dev',
              name: 'dev',
              component: () => import('../pages/menu/DevCard.vue'),
            }]
          : []),
        {
          path: 'history',
          name: 'match-history',
          component: () => import('../pages/menu/MatchHistoryCard.vue'),
        },
        {
          // Optional id: without one the page has no tournament to show a bracket for.
          path: 'brackets/:id?',
          name: 'tournament-brackets',
          component: () => import('../pages/menu/TournamentBracketsCard.vue'),
        },
        {
          path: 'tournaments',
          name: 'tournaments',
          component: () => import('../pages/menu/TournamentsCard.vue'),
        },
        {
          path: 'tournaments/:id',
          name: 'tournament-detail',
          component: () => import('../pages/menu/TournamentDetailCard.vue'),
        },
        {
          path: 'tournaments/:id/team',
          name: 'team-setup',
          component: () => import('../pages/menu/TeamSetupCard.vue'),
        },
        {
          path: 'organizations',
          name: 'organizations',
          component: () => import('../pages/menu/OrganizationsCard.vue'),
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('../pages/menu/AdminCard.vue'),
          beforeEnter: () => {
            if (!pinia) {
              pinia = createPinia()
              setActivePinia(pinia)
            }

            const authStore = useAuthStore()
            return authStore.isAdmin ? true : '/menu/user'
          },
        },
        // Super-admin bootstrap form: dev builds only, and never a redirect target.
        ...(import.meta.env.DEV
          ? [{
              path: 'admin-register',
              name: 'admin-register',
              component: () => import('../pages/menu/AdminInviteTest.vue'),
            }]
          : []),
      ],
    },

    // Legal pages (public)
    { path: '/privacy', name: 'privacy', component: () => import('../pages/PrivacyPolicyPage.vue') },
    { path: '/terms', name: 'terms', component: () => import('../pages/TermsOfServicePage.vue') },

    // Legacy redirects
    { path: '/login', redirect: '/auth' },
    { path: '/login-success', redirect: '/auth/callback' },
    { path: '/verify-email', redirect: '/auth/verify-email' },
    { path: '/verify-2fa', redirect: '/auth/2fa' },
    { path: '/', name: 'landing', component: () => import('../pages/LandingPage.vue') },

    // Catch-all: keep last so a specific route always wins the match first.
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../pages/NotFoundPage.vue'),
    },
  ],
})

// Auth guard - validates tokens with server before allowing access
router.beforeEach(async (to) => {
  const publicPaths = ['/', '/auth', '/auth/verify-email', '/auth/2fa', '/auth/callback', '/privacy', '/terms']
  const isPublic = publicPaths.includes(to.path) || to.path.startsWith('/auth/') || to.name === 'not-found'

  // Public routes don't need authentication
  if (isPublic) {
    return true
  }

  // Protected routes require valid token
  const hasToken = !!getAccessToken()
  if (!hasToken) {
    return '/auth'
  }

  // Validate token with server via auth store
  // Initialize Pinia if needed (happens once at app startup)
  if (!pinia) {
    pinia = createPinia()
    setActivePinia(pinia)
  }

  const authStore = useAuthStore()
  const isAuthenticated = await authStore.checkAuth()

  // If authentication check failed, redirect to login
  if (!isAuthenticated) {
    return '/auth'
  }

  // Role-based access control
  const requiredRole = to.meta.requiredRole
  if (requiredRole !== undefined) {
    const userRole = authStore.user?.role ?? UserRole.USER
    if (userRole < requiredRole) return '/menu/user'
  }

  // Authentication valid, allow access
  return true
})

export default router
