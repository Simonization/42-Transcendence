<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authApi } from '../../api/auth'
import { usersApi } from '../../api/users'
import { getAccessToken, clearTokens } from '../../api'
import { requiresTwoFactor } from '../../types'
import { useFormValidation } from '../../composables/useFormValidation'
import { useErrorHandler } from '../../composables/useErrorHandler'
import MessageAlert from '../../components/common/MessageAlert.vue'
import ShaderButton from '../../components/hud/ShaderButton.vue'

const REDIRECT_DELAY = 800

const router = useRouter()

const isLogin = ref(true)
const username = ref('')
const email = ref('')
const password = ref('')
const isLoading = ref(false)

const { t } = useI18n()
const { validate, errors, isValid } = useFormValidation()
const { message, messageType, handleError, handleSuccess, clearMessage } = useErrorHandler()

onMounted(async () => {
  const token = getAccessToken()
  if (!token) return
  try {
    await usersApi.getMe()
    router.push('/menu')
  } catch {
    clearTokens()
  }
})

const login = async () => {
  isLoading.value = true
  clearMessage()

  // Validate inputs
  const usernameValid = validate(username.value, ['required'], 'username')
  const passwordValid = validate(password.value, ['required'], 'password')

  if (!usernameValid || !passwordValid) {
    isLoading.value = false
    return
  }

  try {
    const response = await authApi.login({
      username: username.value,
      password: password.value,
    })

    if (requiresTwoFactor(response)) {
      handleSuccess(t('auth.credentialsValid'))
      setTimeout(() => {
        router.push(`/auth/2fa?userId=${response.userId}`)
      }, REDIRECT_DELAY)
    } else {
      handleSuccess(t('auth.welcome', { username: response.user.username }))
      router.push('/menu')
    }
  } catch (error) {
    handleError(error, t('auth.networkError'))
  } finally {
    isLoading.value = false
  }
}

const register = async () => {
  isLoading.value = true
  clearMessage()

  // Validate inputs
  const usernameValid = validate(username.value, ['required', 'username', 'sanitize'], 'username')
  const emailValid = validate(email.value, ['required', 'email', 'sanitize'], 'email')
  const passwordValid = validate(password.value, ['required', 'password', 'sanitize'], 'password')

  if (!usernameValid || !emailValid || !passwordValid) {
    isLoading.value = false
    return
  }

  try {
    await authApi.register({
      username: username.value,
      mail: email.value,
      password: password.value,
    })
    handleSuccess(t('auth.registrationSuccess'))
    username.value = ''
    email.value = ''
    password.value = ''
  } catch (error) {
    handleError(error, t('auth.networkError'))
  } finally {
    isLoading.value = false
  }
}

const toggleMode = () => {
  isLogin.value = !isLogin.value
  message.value = ''
  username.value = ''
  email.value = ''
  password.value = ''
}

const handleGoogleLogin = () => {
  authApi.googleLogin()
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-panel">
      <div class="auth-header">
        <h1 class="auth-title">ESPORTENDENCE</h1>
        <p class="auth-subtitle">{{ isLogin ? $t('auth.signIn') : $t('auth.createAccount') }}</p>
      </div>

      <form @submit.prevent="isLogin ? login() : register()" class="auth-form">
        <div class="field">
          <label class="field-label" for="username">{{ $t('auth.username') }}</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="field-input"
            :class="{ 'field-input-error': errors.username }"
            :placeholder="$t('auth.enterUsername')"
            required
            autocomplete="username"
            @blur="validate(username, ['required'], 'username')"
            :aria-invalid="!!errors.username"
            :aria-describedby="errors.username ? 'username-error' : undefined"
          />
          <span v-if="errors.username" id="username-error" class="field-error">{{ errors.username }}</span>
        </div>

        <div v-if="!isLogin" class="field">
          <label class="field-label" for="email">{{ $t('auth.email') }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="field-input"
            :class="{ 'field-input-error': errors.email }"
            :placeholder="$t('auth.enterEmail')"
            required
            autocomplete="email"
            @blur="validate(email, ['required', 'email', 'sanitize'], 'email')"
            :aria-invalid="!!errors.email"
            :aria-describedby="errors.email ? 'email-error' : undefined"
          />
          <span v-if="errors.email" id="email-error" class="field-error">{{ errors.email }}</span>
        </div>

        <div class="field">
          <label class="field-label" for="password">{{ $t('auth.password') }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="field-input"
            :class="{ 'field-input-error': errors.password }"
            :placeholder="isLogin ? $t('auth.enterPassword') : $t('auth.minChars')"
            required
            autocomplete="current-password"
            @blur="isLogin ? validate(password, ['required'], 'password') : validate(password, ['required', 'password', 'sanitize'], 'password')"
            :aria-invalid="!!errors.password"
            :aria-describedby="errors.password ? 'password-error' : undefined"
          />
          <span v-if="errors.password" id="password-error" class="field-error">{{ errors.password }}</span>
        </div>

        <ShaderButton
          type="submit"
          :shader="true"
          size="lg"
          :disabled="isLoading"
          class="auth-shader-btn"
        >
          {{ isLoading ? $t('common.loadingDots') : (isLogin ? $t('auth.login') : $t('auth.register')) }}
        </ShaderButton>
      </form>

      <div class="auth-divider">
        <span class="auth-divider-text">{{ $t('common.or') }}</span>
      </div>

      <button @click="handleGoogleLogin" class="auth-btn auth-btn-google">
        {{ $t('auth.signInWithGoogle') }}
      </button>

      <p class="auth-toggle">
        {{ isLogin ? $t('auth.noAccount') : $t('auth.alreadyRegistered') }}
        <a @click="toggleMode" class="auth-toggle-link">
          {{ isLogin ? $t('auth.register') : $t('auth.login') }}
        </a>
      </p>

      <MessageAlert :message="message" :type="messageType" :show="!!message" />
    </div>
  </div>
</template>

<style scoped>
.auth-panel {
  padding: var(--space-10) var(--space-8);
}

.auth-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.auth-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  margin: 0 0 var(--space-2) 0;
}

.auth-subtitle {
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-widest);
  color: var(--text-secondary);
  text-transform: uppercase;
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  letter-spacing: var(--tracking-widest);
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.field-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  clip-path: polygon(var(--chamfer-xs) 0, 100% 0, 100% 100%, 0 100%, 0 var(--chamfer-xs));
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-default),
              box-shadow var(--duration-fast) var(--ease-default);
}

.field-input::placeholder {
  color: var(--text-secondary);
}

.field-input:focus-visible {
  border-color: rgba(100, 120, 200, 0.5);
  box-shadow: 0 0 12px rgba(100, 120, 200, 0.1);
}

.field-input-error {
  border-color: var(--color-error);
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.1);
}

.field-error {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-error);
  margin-top: var(--space-1);
  padding: 0 var(--space-2);
}

.auth-btn {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  margin-top: var(--space-2);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--bg-primary);
  background: var(--text-primary);
  border: 1px solid transparent;
  clip-path: polygon(var(--chamfer-sm) 0, 100% 0, 100% calc(100% - var(--chamfer-sm)), calc(100% - var(--chamfer-sm)) 100%, 0 100%, 0 var(--chamfer-sm));
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.auth-btn:hover:not(:disabled) {
  background: var(--bg-secondary);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
}

.auth-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.auth-shader-btn {
  width: 100%;
  margin-top: var(--space-2);
}

.auth-btn-google {
  background: transparent;
  color: var(--text-tertiary);
  border: 1px solid rgba(255, 255, 255, 0.12);
  margin-top: 0;
}

.auth-btn-google:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: none;
}

.auth-divider {
  display: flex;
  align-items: center;
  margin: var(--space-6) 0;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.auth-divider-text {
  padding: 0 var(--space-4);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
}

.auth-toggle {
  text-align: center;
  margin-top: var(--space-6);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.auth-toggle-link {
  color: var(--text-primary);
  cursor: pointer;
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-wider);
  margin-left: var(--space-1);
  text-decoration: none;
  transition: opacity var(--duration-fast) var(--ease-default);
}

.auth-toggle-link:hover {
  opacity: 0.7;
}
</style>
