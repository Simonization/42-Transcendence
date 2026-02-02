<script setup>
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

onMounted(() => {
  const { accessToken, refreshToken } = route.query;

  if (accessToken) {
    console.log("Registering Token...");
    
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    
    router.push('/'); 
  } else {
    console.error("No token found!");
    router.push('/login?error=oauth_failed');
  }
});
</script>

<template>
  <div class="loading-container">
    <h2>Logging in...</h2>
    <p>Redirecting...Please Wait...</p>
  </div>
</template>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: #333;
}
</style>