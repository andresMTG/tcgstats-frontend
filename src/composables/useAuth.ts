import { ref } from 'vue'
import type { AuthModalMode, LoginCredentials, SignupCredentials, User } from '../types/auth'
import type { LocaleMessages } from '../types/locale'
import { ApiError, createAccount, getCurrentUser, login, logoutSession, refreshSession } from '../services/auth'

const storedSessionKey = 'tcgstats-auth-session'

function hasStoredSession(): boolean {
  try {
    return localStorage.getItem(storedSessionKey) === 'true'
  } catch (error) {
    console.warn('Unable to read the authentication session marker.', error)
    return false
  }
}

function setStoredSession(isPresent: boolean): void {
  try {
    if (isPresent) localStorage.setItem(storedSessionKey, 'true')
    else localStorage.removeItem(storedSessionKey)
  } catch (error) {
    console.warn('Unable to update the authentication session marker.', error)
  }
}

export function useAuth(getMessages: () => LocaleMessages) {
  const currentUser = ref<User | null>(null)
  const isCheckingSession = ref(false)
  const isSubmitting = ref(false)
  const authError = ref('')
  const modalMode = ref<AuthModalMode>(null)
  const registrationComplete = ref(false)

  async function restoreSession(): Promise<void> {
    if (!hasStoredSession()) return
    isCheckingSession.value = true
    try {
      try {
        currentUser.value = await getCurrentUser(getMessages().auth.loadUserError)
        return
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error
      }

      if (!await refreshSession(getMessages().auth.refreshError)) {
        setStoredSession(false)
        return
      }
      currentUser.value = await getCurrentUser(getMessages().auth.loadUserError)
    } catch (error) {
      authError.value = error instanceof Error ? error.message : getMessages().auth.loadUserError
    } finally {
      isCheckingSession.value = false
    }
  }

  function openAuthModal(mode: Exclude<AuthModalMode, null>): void {
    authError.value = ''
    registrationComplete.value = false
    modalMode.value = mode
  }

  function continueToLogin(): void {
    openAuthModal('login')
  }

  async function submitSignup(credentials: SignupCredentials): Promise<void> {
    isSubmitting.value = true
    authError.value = ''
    try {
      await createAccount(credentials, getMessages().auth.signupError)
      registrationComplete.value = true
    } catch (error) {
      authError.value = error instanceof Error ? error.message : getMessages().auth.signupError
    } finally {
      isSubmitting.value = false
    }
  }

  async function submitLogin(credentials: LoginCredentials): Promise<void> {
    isSubmitting.value = true
    authError.value = ''
    try {
      currentUser.value = await login(credentials, getMessages().auth.loginError)
      setStoredSession(true)
      modalMode.value = null
    } catch (error) {
      authError.value = error instanceof Error ? error.message : getMessages().auth.loginError
    } finally {
      isSubmitting.value = false
    }
  }

  async function logout(): Promise<void> {
    authError.value = ''
    try {
      await logoutSession(getMessages().auth.logoutError)
      currentUser.value = null
      setStoredSession(false)
    } catch (error) {
      if (error instanceof ApiError) {
        currentUser.value = null
        setStoredSession(false)
      }
      authError.value = error instanceof Error ? error.message : getMessages().auth.logoutError
    }
  }

  return {
    authError,
    currentUser,
    isCheckingSession,
    isSubmitting,
    logout,
    modalMode,
    openAuthModal,
    registrationComplete,
    restoreSession,
    submitLogin,
    submitSignup,
    continueToLogin,
  }
}
