import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../components/LoginPage.vue'
import VerifyEmail from '../pages/VerifyEmail.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
