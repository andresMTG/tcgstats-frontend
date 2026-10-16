<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import AuthDialog from './components/AuthDialog.vue'
import ClosingSection from './components/ClosingSection.vue'
import FeaturesSection from './components/FeaturesSection.vue'
import GamesSection from './components/GamesSection.vue'
import HeroSection from './components/HeroSection.vue'
import SiteFooter from './components/SiteFooter.vue'
import SiteHeader from './components/SiteHeader.vue'
import Workspace from './components/Workspace.vue'
import { useAuth } from './composables/useAuth'
import { useLocale } from './composables/useLocale'
import type { AuthModalMode, LoginCredentials } from './types/auth'
import type { WorkspaceView } from './types/product'

const { locale, messages, storageError } = useLocale()
const workspaceViews: WorkspaceView[] = [
  'dashboard',
  'decks',
  'tournaments',
  'matches',
  'opponents',
  'analytics',
]
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
const activeView = ref<WorkspaceView>(readWorkspaceView() ?? 'dashboard')

watch([currentUser, activeView, messages], ([user, view]) => {
  document.title = user
    ? `${messages.value.workspace.nav[view]} — ${messages.value.brand}`
    : messages.value.pageTitle
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    user ? messages.value.workspace.subtitle : messages.value.pageDescription,
  )
}, { immediate: true })

function readWorkspaceView(): WorkspaceView | null {
  const candidate = window.location.hash.slice('#app/'.length)
  return window.location.hash.startsWith('#app/') && workspaceViews.includes(candidate as WorkspaceView)
    ? candidate as WorkspaceView
    : null
}

function handleAuthModeChange(mode: AuthModalMode): void {
  if (mode) openAuthModal(mode)
  else modalMode.value = null
}

function navigateTo(view: WorkspaceView): void {
  activeView.value = view
  const nextHash = `#app/${view}`
  if (window.location.hash !== nextHash) window.location.hash = nextHash
}

function handleHashChange(): void {
  const view = readWorkspaceView()
  if (view) activeView.value = view
}

async function handleLogin(credentials: LoginCredentials): Promise<void> {
  await submitLogin(credentials)
  if (currentUser.value) navigateTo('dashboard')
}

async function handleLogout(): Promise<void> {
  await logout()
  if (!currentUser.value) {
    activeView.value = 'dashboard'
    window.location.hash = '#home'
  }
}

onMounted(async () => {
  window.addEventListener('hashchange', handleHashChange)
  await restoreSession()
  if (currentUser.value && !readWorkspaceView()) navigateTo('dashboard')
  if (!currentUser.value && readWorkspaceView()) {
    window.location.hash = '#home'
    openAuthModal('login')
  }
})

onUnmounted(() => window.removeEventListener('hashchange', handleHashChange))
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
      @logout="handleLogout"
    />

    <Workspace
      v-if="currentUser"
      :user="currentUser"
      :messages="messages"
      :locale="locale"
      :active-view="activeView"
      @navigate="navigateTo"
    />
    <template v-else>
      <main>
        <HeroSection :messages="messages" @signup="openAuthModal('signup')" />
        <GamesSection :messages="messages" />
        <FeaturesSection :messages="messages" />
        <ClosingSection :messages="messages" @signup="openAuthModal('signup')" />
      </main>

      <SiteFooter :messages="messages" />
    </template>

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
      @login="handleLogin"
      @login-after-signup="continueToLogin"
    />
  </div>
</template>
