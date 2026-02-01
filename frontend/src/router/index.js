import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../pages/Dashboard.vue' 
import LoginPage from '../components/LoginPage.vue'
import LoginSuccess from '../pages/LoginSuccess.vue'
import VerifyEmail from '../pages/VerifyEmail.vue'
import TwoFactorVerify from '../pages/TwoFactorVerify.vue'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: Dashboard,
  },
  {
    path: '/login',
    name: 'login',
    component: LoginPage
  },
  {
    path: '/login-success', 
    name: 'LoginSuccess',
    component: LoginSuccess
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: VerifyEmail
  },
  {
    path: '/verify-2fa',
    name: 'verify-2fa',
    component: TwoFactorVerify
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Optional Guard, if there is no Token, Do not enter to the Dashboard..
router.beforeEach((to, from, next) => {
  const publicPages = ['/login', '/login-success', '/verify-email', '/verify-2fa'];
  const authRequired = !publicPages.includes(to.path);
  const loggedIn = localStorage.getItem('accessToken');

  if (authRequired && !loggedIn) {
    next('/login');
  } else {
    next();
  }
});

export default router