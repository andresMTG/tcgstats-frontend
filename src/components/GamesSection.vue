<script setup lang="ts">
import type { LocaleMessages } from '../types/locale'

defineProps<{ messages: LocaleMessages }>()
</script>

<template>
  <section id="games" class="games-section">
    <p class="section-overline">{{ messages.games.overline }}</p>
    <div class="game-list">
      <span v-for="game in messages.games.list" :key="game">{{ game }}</span>
    </div>
  </section>
</template>
