<script setup lang="ts">
import type { LocaleMessages } from '../types/locale'

defineProps<{ messages: LocaleMessages }>()
const emit = defineEmits<{ signup: [] }>()
</script>

<template>
  <section class="closing-section">
    <div>
      <p class="section-overline">{{ messages.closing.overline }}</p>
      <h2>{{ messages.closing.title }}</h2>
      <p>{{ messages.closing.description }}</p>
    </div>
    <button class="button button-primary" type="button" @click="emit('signup')">
      {{ messages.closing.cta }} <span aria-hidden="true">↗</span>
    </button>
  </section>
</template>
