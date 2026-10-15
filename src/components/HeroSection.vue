<script setup lang="ts">
import type { LocaleMessages } from '../types/locale'
import PerformanceDashboard from './PerformanceDashboard.vue'

defineProps<{ messages: LocaleMessages }>()
const emit = defineEmits<{ signup: [] }>()
</script>

<template>
  <section class="hero-section">
    <div class="hero-copy">
      <div class="eyebrow"><span class="eyebrow-dot"></span>{{ messages.hero.eyebrow }}</div>
      <h1>{{ messages.hero.title }} <span>{{ messages.hero.titleAccent }}</span></h1>
      <p class="hero-description">{{ messages.hero.description }}</p>
      <div class="hero-actions">
        <button class="button button-primary" type="button" @click="emit('signup')">
          {{ messages.hero.primaryCta }} <span aria-hidden="true">↗</span>
        </button>
        <a class="text-link" href="#how-it-works">{{ messages.hero.secondaryCta }} <span aria-hidden="true">↓</span></a>
      </div>
      <p class="hero-note"><span aria-hidden="true">✦</span>{{ messages.hero.note }}</p>
    </div>
    <PerformanceDashboard :messages="messages.dashboard" />
  </section>
</template>
