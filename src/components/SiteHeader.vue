<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { User } from '../types/auth'
import type { Language, LocaleMessages } from '../types/locale'

defineProps<{
  user: User | null
  locale: Language
  messages: LocaleMessages
}>()

const emit = defineEmits<{
  'update:locale': [language: Language]
  login: []
  signup: []
  logout: []
}>()

const isUserMenuOpen = ref(false)

function handleWindowClick(event: MouseEvent): void {
  const target = event.target
  if (target instanceof Element && !target.closest('.user-menu')) {
    isUserMenuOpen.value = false
  }
}

function handleWindowKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') isUserMenuOpen.value = false
}

onMounted(() => {
  window.addEventListener('click', handleWindowClick)
  window.addEventListener('keydown', handleWindowKeydown)
})

onUnmounted(() => {
  window.removeEventListener('click', handleWindowClick)
  window.removeEventListener('keydown', handleWindowKeydown)
})
</script>

<template>
  <header class="site-header">
    <a class="brand" href="#" :aria-label="messages.brand">
      <span class="brand-mark" aria-hidden="true"><span></span></span>
      <span>tcg<span class="brand-accent">stats</span></span>
    </a>

    <nav class="main-nav" :aria-label="messages.navigationLabel">
      <a href="#how-it-works">{{ messages.nav.howItWorks }}</a>
      <a href="#games">{{ messages.nav.games }}</a>
    </nav>

    <div class="header-actions">
      <label class="language-picker">
        <span class="sr-only">{{ messages.languageLabel }}</span>
        <select
          :value="locale"
          :aria-label="messages.languageLabel"
          @change="emit('update:locale', ($event.target as HTMLSelectElement).value as Language)"
        >
          <option value="pt">PT</option>
          <option value="es">ES</option>
          <option value="en">EN</option>
        </select>
      </label>

      <div v-if="user" class="user-menu">
        <button
          class="user-menu-trigger"
          type="button"
          :aria-expanded="isUserMenuOpen"
          aria-haspopup="true"
          @click="isUserMenuOpen = !isUserMenuOpen"
        >
          <span class="user-avatar" aria-hidden="true">{{ user.name.charAt(0).toUpperCase() }}</span>
          <span class="user-menu-name">{{ user.name }}</span>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
        </button>
        <div v-if="isUserMenuOpen" class="user-dropdown" role="menu">
          <p class="dropdown-heading">{{ messages.menu.account }}</p>
          <button type="button" role="menuitem" disabled>{{ messages.menu.profile }}</button>
          <button type="button" role="menuitem" disabled>{{ messages.menu.decks }}</button>
          <button type="button" role="menuitem" disabled>{{ messages.menu.tournaments }}</button>
          <button type="button" role="menuitem" disabled>{{ messages.menu.performance }}</button>
          <div class="dropdown-divider"></div>
          <button
            class="logout-button"
            type="button"
            role="menuitem"
            @click="isUserMenuOpen = false; emit('logout')"
          >
            {{ messages.menu.logout }}
          </button>
        </div>
      </div>
      <template v-else>
        <button class="button button-quiet header-login" type="button" @click="emit('login')">
          {{ messages.nav.login }}
        </button>
        <button class="button button-small button-primary" type="button" @click="emit('signup')">
          {{ messages.nav.signup }}
        </button>
      </template>
    </div>
  </header>
</template>
