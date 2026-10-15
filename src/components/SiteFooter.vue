<script setup lang="ts">
import type { LocaleMessages } from '../types/locale'

defineProps<{ messages: LocaleMessages }>()
</script>

<template>
  <footer class="site-footer">
    <a class="brand footer-brand" href="#" :aria-label="messages.brand">
      <span class="brand-mark" aria-hidden="true"><span></span></span>
      <span>tcg<span class="brand-accent">stats</span></span>
    </a>
    <p>{{ messages.footer }}</p>
    <span class="footer-status"><i></i>{{ messages.footerStatus }}</span>
  </footer>
</template>
