import './assets/main.css'
import { initTheme } from './composables/useTheme'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Initialize theme before mounting to prevent flash
initTheme()

createApp(App).use(router).mount('#app')
