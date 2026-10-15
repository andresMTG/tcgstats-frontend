<script setup lang="ts">
import type { LocaleMessages } from '../types/locale'

defineProps<{ messages: LocaleMessages }>()

const featureIcons = ['◫', '⌁', '◎']
</script>

<template>
  <section id="how-it-works" class="features-section">
    <div class="section-heading">
      <div>
        <p class="section-overline">{{ messages.features.overline }}</p>
        <h2>{{ messages.features.title }} <span>{{ messages.features.titleAccent }}</span></h2>
      </div>
      <p>{{ messages.features.description }}</p>
    </div>
    <div class="feature-grid">
      <article v-for="(feature, index) in messages.features.cards" :key="feature.title" class="feature-card">
        <div class="feature-topline">
          <span class="feature-number">0{{ index + 1 }}</span>
          <span class="feature-icon" aria-hidden="true">{{ featureIcons[index] }}</span>
        </div>
        <h3>{{ feature.title }}</h3>
        <p>{{ feature.description }}</p>
      </article>
    </div>
  </section>
</template>
