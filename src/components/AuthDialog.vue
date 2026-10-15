<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { LoginCredentials, SignupCredentials, AuthModalMode } from '../types/auth'
import type { LocaleMessages } from '../types/locale'

const props = defineProps<{
  mode: AuthModalMode
  messages: LocaleMessages
  error: string
  submitting: boolean
  registrationComplete: boolean
}>()

const emit = defineEmits<{
  'update:mode': [mode: AuthModalMode]
  signup: [credentials: SignupCredentials]
  login: [credentials: LoginCredentials]
  'login-after-signup': []
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const signupForm = ref<SignupCredentials>({ name: '', email: '', password: '' })
const loginForm = ref<LoginCredentials>({ email: '', password: '' })

watch(() => props.mode, async (mode) => {
  await nextTick()
  if (!dialog.value) return
  if (mode && !dialog.value.open) dialog.value.showModal()
  else if (!mode && dialog.value.open) dialog.value.close()
})

function closeDialog(): void {
  emit('update:mode', null)
}

function submitSignup(): void {
  emit('signup', { ...signupForm.value })
}

function submitLogin(): void {
  emit('login', { ...loginForm.value })
}

function loginAfterSignup(): void {
  loginForm.value = { email: signupForm.value.email, password: '' }
  emit('login-after-signup')
  signupForm.value = { name: '', email: '', password: '' }
}
</script>

<template>
  <dialog ref="dialog" class="auth-dialog" @cancel.prevent="closeDialog" @click.self="closeDialog">
    <div class="dialog-content">
      <button class="dialog-close" type="button" :aria-label="messages.auth.close" @click="closeDialog">×</button>
      <div class="dialog-brand brand-mark" aria-hidden="true"><span></span></div>

      <template v-if="registrationComplete">
        <p class="section-overline">{{ messages.auth.signupSuccessEyebrow }}</p>
        <h2>{{ messages.auth.signupSuccessTitle }}</h2>
        <p class="dialog-description">{{ messages.auth.signupSuccessDescription }}</p>
        <button class="button button-primary dialog-submit" type="button" @click="loginAfterSignup">
          {{ messages.auth.goToLogin }}
        </button>
      </template>

      <template v-else-if="mode === 'signup'">
        <p class="section-overline">{{ messages.auth.signupEyebrow }}</p>
        <h2>{{ messages.auth.signupTitle }}</h2>
        <p class="dialog-description">{{ messages.auth.signupDescription }}</p>
        <form class="auth-form" @submit.prevent="submitSignup">
          <label>
            <span>{{ messages.auth.nameLabel }}</span>
            <input v-model="signupForm.name" autocomplete="name" required :placeholder="messages.auth.namePlaceholder" />
          </label>
          <label>
            <span>{{ messages.auth.emailLabel }}</span>
            <input v-model="signupForm.email" autocomplete="email" type="email" required :placeholder="messages.auth.emailPlaceholder" />
          </label>
          <label>
            <span>{{ messages.auth.passwordLabel }}</span>
            <input
              v-model="signupForm.password"
              autocomplete="new-password"
              type="password"
              minlength="8"
              required
              :placeholder="messages.auth.passwordPlaceholder"
            />
          </label>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <button class="button button-primary dialog-submit" type="submit" :disabled="submitting">
            {{ submitting ? messages.auth.working : messages.auth.createAccount }}
          </button>
        </form>
        <p class="dialog-switch">
          {{ messages.auth.haveAccount }}
          <button type="button" @click="emit('update:mode', 'login')">{{ messages.auth.loginLink }}</button>
        </p>
      </template>

      <template v-else>
        <p class="section-overline">{{ messages.auth.loginEyebrow }}</p>
        <h2>{{ messages.auth.loginTitle }}</h2>
        <p class="dialog-description">{{ messages.auth.loginDescription }}</p>
        <form class="auth-form" @submit.prevent="submitLogin">
          <label>
            <span>{{ messages.auth.emailLabel }}</span>
            <input v-model="loginForm.email" autocomplete="email" type="email" required :placeholder="messages.auth.emailPlaceholder" />
          </label>
          <label>
            <span>{{ messages.auth.passwordLabel }}</span>
            <input
              v-model="loginForm.password"
              autocomplete="current-password"
              type="password"
              required
              :placeholder="messages.auth.passwordPlaceholder"
            />
          </label>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <button class="button button-primary dialog-submit" type="submit" :disabled="submitting">
            {{ submitting ? messages.auth.working : messages.auth.loginSubmit }}
          </button>
        </form>
        <p class="dialog-switch">
          {{ messages.auth.noAccount }}
          <button type="button" @click="emit('update:mode', 'signup')">{{ messages.auth.signupLink }}</button>
        </p>
      </template>
    </div>
  </dialog>
</template>
