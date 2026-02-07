import { createRouter, createWebHistory } from 'vue-router'

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
        {
          path: 'dev',
          name: 'dev',
          component: () => import('../pages/menu/DevCard.vue'),
        },
      ],
    },

    // Legacy redirects
    { path: '/login', redirect: '/auth' },
    { path: '/login-success', redirect: '/auth/callback' },
    { path: '/verify-email', redirect: '/auth/verify-email' },
    { path: '/verify-2fa', redirect: '/auth/2fa' },
    { path: '/', name: 'landing', component: () => import('../pages/LandingPage.vue') },
  ],
})

// Auth guard
router.beforeEach((to) => {
  const publicPaths = ['/', '/auth', '/auth/verify-email', '/auth/2fa', '/auth/callback']
  const isPublic = publicPaths.includes(to.path) || to.path.startsWith('/auth/')
  const hasToken = !!localStorage.getItem('accessToken')

  if (!isPublic && !hasToken) {
    return '/auth'
  }
})

export default router
