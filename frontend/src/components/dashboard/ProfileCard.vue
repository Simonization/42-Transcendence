<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  user: any
}>()

const initials = computed(() => {
  if (props.user?.firstName && props.user?.lastName) {
    return `${props.user.firstName[0]}${props.user.lastName[0]}`.toUpperCase()
  }
  return props.user?.username?.slice(0, 2).toUpperCase() || '??'
})

const displayName = computed(() => {
  if (props.user?.firstName) {
    return `${props.user.firstName} ${props.user.lastName || ''}`
  }
  return props.user?.username
})
</script>

<template>
  <div class="card profile-card">
    <div class="header">
      <div class="avatar-container">
        <img 
          v-if="user?.avatarUrl" 
          :src="user.avatarUrl" 
          alt="Avatar" 
          class="avatar-img"
        />
        <div v-else class="avatar-placeholder">
          {{ initials }}
        </div>
        <span class="status-indicator online"></span>
      </div>
      
      <h2 class="display-name">{{ displayName }}</h2>
      <p class="role-badge">Member</p>
    </div>

    <div class="divider"></div>

    <div class="info-section">
      <div class="info-item">
        <span class="label">USERNAME</span>
        <span class="value">@{{ user?.username }}</span>
      </div>
      
      <div class="info-item">
        <span class="label">EMAIL</span>
        <span class="value">{{ user?.mail }}</span>
      </div>
      
      <div class="info-item">
        <span class="label">STATUS</span>
        <span class="value success">Active & Verified</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-card {
  background-color: #2c2c2c;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  width: 100%;
  max-width: 350px; 
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: white;
  flex-shrink: 0;
}

.avatar-container {
  position: relative;
  width: 100px;
  height: 100px;
  margin-bottom: 1rem;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #42b883;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2.5rem;
  font-weight: bold;
  color: white;
  border: 3px solid #42b883;
}

.status-indicator {
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 18px;
  height: 18px;
  background-color: #42b883;
  border: 3px solid #2c2c2c;
  border-radius: 50%;
}

.display-name {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.role-badge {
  background-color: #3a3a3a;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  color: #a1a1aa;
  margin-top: 5px;
  display: inline-block;
}

.divider {
  width: 100%;
  height: 1px;
  background-color: #444;
  margin: 10px 0;
}

.info-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.label {
  color: #a1a1aa;
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 1px;
}

.value {
  color: white;
  font-weight: 500;
}

.value.success {
  color: #42b883;
}
</style>