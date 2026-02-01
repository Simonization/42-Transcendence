<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

import BackendCard from '../components/dashboard/BackendCard.vue'
import ChatCard from '../components/dashboard/ChatCard.vue'
import TwoFactorCard from '../components/dashboard/TwoFactorCard.vue'
import ProfileCard from '../components/dashboard/ProfileCard.vue'

const router = useRouter()
const { logout, checkAuth } = useAuth()
const user = ref(null) 

onMounted(async () => {
  const isValid = await checkAuth()
  if (!isValid) {
    router.push('/login')
  } else {
    await fetchUserProfile()
  }
})

const fetchUserProfile = async () => {
  const token = localStorage.getItem('accessToken')
  try {
    const res = await fetch('/api/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      user.value = await res.json()
    }
  } catch (e) {
    console.error('User fetch error', e)
  }
}
</script>

<template>
  <div class="wrapper">
    <div class="header-actions">
      <button @click="logout" class="logout-btn">Logout</button>
    </div>

    <div class="cards-container">
      <ProfileCard v-if="user" :user="user" />
      <BackendCard />
      <ChatCard />
      <TwoFactorCard />
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 2rem;
  overflow: hidden;
}

.header-actions {
  position: absolute;
  top: 1rem;
  right: 2rem;
  z-index: 100;
}

.cards-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 2rem;
  width: 100%;
  height: 100%;
  padding-top: 3rem;
  overflow-x: auto;
}

.logout-btn {
  background-color: #ff6b6b;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s;
}
.logout-btn:hover { transform: translateY(-2px); }
</style>