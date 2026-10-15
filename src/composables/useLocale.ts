import { computed, ref, watch } from 'vue'
import en from '../locales/en.json'
import es from '../locales/es.json'
import pt from '../locales/pt.json'
import type { Language, LocaleMessages } from '../types/locale'

const supportedLanguages: Language[] = ['pt', 'es', 'en']
const messagesByLanguage: Record<Language, LocaleMessages> = { en, es, pt }
const languagePreferenceKey = 'tcgstats-language'

function isLanguage(value: string): value is Language {
  return supportedLanguages.includes(value as Language)
}

function detectBrowserLanguage(): Language {
  const browserLanguage = navigator.language.toLowerCase()
  if (browserLanguage.startsWith('pt')) return 'pt'
  if (browserLanguage.startsWith('es')) return 'es'
  return 'en'
}

function getInitialLanguage(storageError: ReturnType<typeof ref<string>>): Language {
  try {
    const savedLanguage = localStorage.getItem(languagePreferenceKey)
    if (savedLanguage && isLanguage(savedLanguage)) return savedLanguage
  } catch {
    storageError.value = messagesByLanguage.pt.languagePreferenceError
  }

  return detectBrowserLanguage()
}

export function useLocale() {
  const storageError = ref('')
  const language = ref<Language>(getInitialLanguage(storageError))
  const messages = computed(() => messagesByLanguage[language.value])

  watch(language, (selectedLanguage) => {
    document.documentElement.lang = selectedLanguage
    document.title = messagesByLanguage[selectedLanguage].pageTitle
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      messagesByLanguage[selectedLanguage].pageDescription,
    )

    try {
      localStorage.setItem(languagePreferenceKey, selectedLanguage)
      storageError.value = ''
    } catch {
      storageError.value = messagesByLanguage[selectedLanguage].languagePreferenceError
    }
  })

  document.documentElement.lang = language.value
  document.title = messages.value.pageTitle
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    messages.value.pageDescription,
  )
  if (storageError.value) {
    storageError.value = messages.value.languagePreferenceError
  }

  return { locale: language, messages, storageError }
}
