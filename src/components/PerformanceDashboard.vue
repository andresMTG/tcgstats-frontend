<script setup lang="ts">
import type { LocaleMessages } from '../types/locale'

defineProps<{ messages: LocaleMessages['dashboard'] }>()
</script>

<template>
  <div class="dashboard-visual" :aria-label="messages.visualDescription">
    <div class="visual-glow"></div>
    <div class="dashboard-card">
      <div class="dashboard-topline">
        <span class="dashboard-kicker">{{ messages.kicker }}</span>
        <span class="live-tag"><span></span>{{ messages.label }}</span>
      </div>
      <div class="dashboard-title-row">
        <div>
          <p class="dashboard-overline">{{ messages.overview }}</p>
          <h2>{{ messages.title }}</h2>
        </div>
        <span class="dashboard-period">{{ messages.period }}</span>
      </div>
      <div class="chart-area" aria-hidden="true">
        <div class="chart-y-axis"><span>+</span><span>+</span><span>+</span><span>+</span></div>
        <div class="chart-grid">
          <div class="chart-bars">
            <i style="--bar-height: 34%"></i><i style="--bar-height: 51%"></i>
            <i style="--bar-height: 43%"></i><i style="--bar-height: 68%"></i>
            <i style="--bar-height: 56%"></i><i style="--bar-height: 78%"></i>
            <i style="--bar-height: 65%"></i><i style="--bar-height: 93%"></i>
            <i style="--bar-height: 74%"></i><i style="--bar-height: 100%"></i>
            <i style="--bar-height: 82%"></i><i style="--bar-height: 95%"></i>
          </div>
          <div class="chart-x-axis"><span>01</span><span>06</span><span>12</span><span>18</span></div>
        </div>
      </div>
      <div class="dashboard-bottom">
        <span><i class="legend-dot"></i>{{ messages.legend }}</span>
        <span>{{ messages.sample }}</span>
      </div>
    </div>
    <div class="floating-card floating-top">
      <span class="floating-icon">↗</span>
      <span>{{ messages.insight }}</span>
    </div>
    <div class="floating-card floating-bottom">
      <span class="deck-symbol" aria-hidden="true">◈</span>
      <span>{{ messages.deckSignal }}</span>
    </div>
  </div>
</template>
