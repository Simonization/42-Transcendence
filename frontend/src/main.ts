import '@fontsource-variable/orbitron'
import '@fontsource-variable/exo-2'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import './assets/main.css'
import { initThemeBeforeMount } from './stores/theme'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'

// Initialize theme before mounting to prevent flash
initThemeBeforeMount()

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.use(router)
app.mount('#app')
