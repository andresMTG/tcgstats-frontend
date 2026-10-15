<script setup lang="ts">
import { onMounted } from 'vue'
import AuthDialog from './components/AuthDialog.vue'
import ClosingSection from './components/ClosingSection.vue'
import FeaturesSection from './components/FeaturesSection.vue'
import GamesSection from './components/GamesSection.vue'
import HeroSection from './components/HeroSection.vue'
import SiteFooter from './components/SiteFooter.vue'
import SiteHeader from './components/SiteHeader.vue'
import { useAuth } from './composables/useAuth'
import { useLocale } from './composables/useLocale'
import type { AuthModalMode } from './types/auth'

const { locale, messages, storageError } = useLocale()
const {
  authError,
  currentUser,
  isCheckingSession,
  isSubmitting,
  modalMode,
  registrationComplete,
  logout,
  openAuthModal,
  restoreSession,
  submitLogin,
  submitSignup,
  continueToLogin,
} = useAuth(() => messages.value)

function handleAuthModeChange(mode: AuthModalMode): void {
  if (mode) openAuthModal(mode)
  else modalMode.value = null
}

onMounted(restoreSession)
</script>

<template>
  <div class="site-shell">
    <SiteHeader
      :user="currentUser"
      :locale="locale"
      :messages="messages"
      @update:locale="locale = $event"
      @login="openAuthModal('login')"
      @signup="openAuthModal('signup')"
      @logout="logout"
    />

    <main>
      <HeroSection :messages="messages" @signup="openAuthModal('signup')" />
      <GamesSection :messages="messages" />
      <FeaturesSection :messages="messages" />
      <ClosingSection :messages="messages" @signup="openAuthModal('signup')" />
    </main>

    <SiteFooter :messages="messages" />

    <p v-if="storageError" class="feedback-banner" role="status">{{ storageError }}</p>
    <p v-if="authError && !modalMode" class="feedback-banner feedback-error" role="alert">{{ authError }}</p>
    <p v-if="isCheckingSession" class="sr-only" role="status">{{ messages.auth.checkingSession }}</p>

    <AuthDialog
      :mode="modalMode"
      :messages="messages"
      :error="authError"
      :submitting="isSubmitting"
      :registration-complete="registrationComplete"
      @update:mode="handleAuthModeChange"
      @signup="submitSignup"
      @login="submitLogin"
      @login-after-signup="continueToLogin"
    />
  </div>
</template>
