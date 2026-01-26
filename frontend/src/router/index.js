import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../components/LoginPage.vue'
import VerifyEmail from '../pages/VerifyEmail.vue'
import TwoFactorVerify from '../pages/TwoFactorVerify.vue'

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginPage
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

export default router
