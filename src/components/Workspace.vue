<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { User } from '../types/auth'
import type { Language, LocaleMessages } from '../types/locale'
import {
  games,
  type Deck,
  type DeckMatchupPerformance,
  type DeckPerformance,
  type GameName,
  type Match,
  type MatchPhase,
  type MatchResult,
  type Opponent,
  type OpponentPerformance,
  type PhasePerformance,
  type Tournament,
  type TournamentScope,
  type TournamentScopePerformance,
  type WorkspaceView,
} from '../types/product'
import { productApi } from '../services/product'

const props = defineProps<{
  user: User
  messages: LocaleMessages
  locale: Language
  activeView: WorkspaceView
}>()

const emit = defineEmits<{
  navigate: [view: WorkspaceView]
}>()

const navigation: WorkspaceView[] = [
  'dashboard',
  'decks',
  'tournaments',
  'matches',
  'opponents',
  'analytics',
]
const phaseOptions: MatchPhase[] = ['SWISS', 'TOP_8', 'TOP_4', 'FINALS']
const resultOptions: MatchResult[] = ['win', 'draw', 'lose']
const scopeOptions: TournamentScope[] = ['LOCAL', 'QUALIFIER', 'MAJOR', 'PREMIER']

const decks = ref<Deck[]>([])
const selectedGameFilter = ref<'all' | GameName>(games[0])
const performanceGameFilter = ref<'all' | GameName>(games[0])
const analyticsGameFilter = ref<'all' | GameName>(games[0])
const selectedMatchupDeckUuid = ref('')
const deckGameSelectionTouched = ref(false)
const tournamentGameSelectionTouched = ref(false)
const deckFilterSelectionTouched = ref(false)
const performanceFilterSelectionTouched = ref(false)
const analyticsFilterSelectionTouched = ref(false)
const matchupDeckSelectionTouched = ref(false)
const tournaments = ref<Tournament[]>([])
const opponents = ref<Opponent[]>([])
const matches = ref<Match[]>([])
const registeredOpponentArchetypes = ref<Array<{ game: GameName; name: string }>>([])
const deckPerformance = ref<DeckPerformance[]>([])
const deckMatchupPerformance = ref<DeckMatchupPerformance[]>([])
const opponentPerformance = ref<OpponentPerformance[]>([])
const phasePerformance = ref<PhasePerformance[]>([])
const scopePerformance = ref<TournamentScopePerformance[]>([])
const selectedTournamentId = ref('')
const fromDate = ref('')
const toDate = ref('')
const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isSubmissionError = ref(false)
const matchListLoaded = ref(false)
const tournamentFlowStep = ref<'closed' | 'tournament' | 'round'>('closed')
const flowTournament = ref<Tournament | null>(null)
const flowRound = ref(1)
const flowPhase = ref<MatchPhase>('SWISS')
const showPhaseChoice = ref(false)
const quickOpponentName = ref('')
const selectedOpponentArchetype = ref('')
const newOpponentArchetype = ref('')
const newArchetypeOption = '__new_archetype__'
const selectedTournamentDeck = ref('')
const newTournamentDeckOption = '__new_tournament_deck__'
const now = new Date()
const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const deckDraft = reactive<{ name: string; game: GameName; decklist: string }>({
  name: '',
  game: games[0],
  decklist: '',
})
const flowDeckDraft = reactive({ name: '', decklist: '' })
const tournamentDraft = reactive<{
  name: string
  date: string
  game: GameName
  scope: TournamentScope
  deck_uuid: string
  is_official_circuit: boolean
}>({
  name: '',
  date: localToday,
  game: games[0],
  scope: 'LOCAL',
  deck_uuid: '',
  is_official_circuit: false,
})
const opponentDraft = reactive({ name: '' })
const matchDraft = reactive<{
  result: MatchResult
  round_number: number
  phase: MatchPhase
  opponent_uuid: string
}>({
  result: 'win',
  round_number: 1,
  phase: 'SWISS',
  opponent_uuid: '',
})

const activeTournament = computed(
  () => tournaments.value.find((tournament) => tournament.uuid === selectedTournamentId.value) ?? null,
)
const visibleDecks = computed(() =>
  selectedGameFilter.value === 'all'
    ? decks.value
    : decks.value.filter((deck) => deck.game === selectedGameFilter.value),
)
const tournamentDecks = computed(() =>
  decks.value.filter((deck) => deck.game === tournamentDraft.game),
)
const mostRegisteredGame = computed(() => {
  const counts = new Map<GameName, number>(games.map((game) => [game, 0]))
  for (const deck of decks.value) counts.set(deck.game, (counts.get(deck.game) ?? 0) + 1)
  return games.reduce((mostPopular, game) =>
    (counts.get(game) ?? 0) > (counts.get(mostPopular) ?? 0) ? game : mostPopular,
  games[0])
})
const visibleDeckPerformance = computed(() => {
  if (performanceGameFilter.value === 'all') return deckPerformance.value
  const deckIdsForGame = new Set(
    decks.value
      .filter((deck) => deck.game === performanceGameFilter.value)
      .map((deck) => deck.uuid),
  )
  return deckPerformance.value.filter((entry) => deckIdsForGame.has(entry.deck_uuid))
})
const deckMatchupGroups = computed(() => {
  const groups = new Map<string, { deck_uuid: string; deck_name: string; matchups: DeckMatchupPerformance[] }>()
  for (const matchup of deckMatchupPerformance.value) {
    let group = groups.get(matchup.deck_uuid)
    if (!group) {
      group = { deck_uuid: matchup.deck_uuid, deck_name: matchup.deck_name, matchups: [] }
      groups.set(matchup.deck_uuid, group)
    }
    group.matchups.push(matchup)
  }
  return [...groups.values()]
})
const selectedDeckMatchup = computed(() =>
  deckMatchupGroups.value.find((deck) => deck.deck_uuid === selectedMatchupDeckUuid.value) ?? null,
)
const currentTournamentGame = computed(() => (flowTournament.value ?? activeTournament.value)?.game ?? null)
const currentMatchPhase = computed(() => (
  tournamentFlowStep.value === 'round' ? flowPhase.value : matchDraft.phase
))
const isSwissPairing = computed(() => currentMatchPhase.value === 'SWISS')
const availableOpponents = computed(() => {
  if (!isSwissPairing.value || !selectedTournamentId.value) return opponents.value
  const alreadyPlayed = new Set(
    matches.value
      .filter((match) => match.tournament_uuid === selectedTournamentId.value)
      .map((match) => match.opponent_uuid),
  )
  return opponents.value.filter((opponent) => !alreadyPlayed.has(opponent.uuid))
})
const opponentArchetypeOptions = computed(() => {
  if (!currentTournamentGame.value) return []
  const uniqueArchetypes = new Map<string, string>()
  for (const archetype of registeredOpponentArchetypes.value) {
    if (archetype.game !== currentTournamentGame.value) continue
    const normalizedName = archetype.name.trim()
    const key = normalizedName.toLocaleLowerCase()
    if (normalizedName && !uniqueArchetypes.has(key)) uniqueArchetypes.set(key, normalizedName)
  }
  return [...uniqueArchetypes.values()].sort((left, right) => left.localeCompare(right, props.locale))
})
const resolvedOpponentArchetype = computed(() =>
  selectedOpponentArchetype.value !== newArchetypeOption
    ? selectedOpponentArchetype.value
    : opponentArchetypeOptions.value.find(
      (name) => name.toLocaleLowerCase() === newOpponentArchetype.value.trim().toLocaleLowerCase(),
    ) ?? newOpponentArchetype.value.trim(),
)
const hasValidOpponentArchetype = computed(() => resolvedOpponentArchetype.value.length > 0)
const totalMatches = computed(() => matches.value)
const dashboardMatchCount = ref(0)
const dashboardWinRate = computed(() => {
  const count = deckPerformance.value.reduce((total, item) => total + item.matches, 0)
  if (!count) return 0
  const wins = deckPerformance.value.reduce((total, item) => total + item.wins, 0)
  return (wins / count) * 100
})
const activeTitle = computed(() => props.messages.workspace.nav[props.activeView])
const deckGameLabels = computed(() => props.messages.games.list)

watch(currentTournamentGame, () => {
  selectedOpponentArchetype.value = ''
  newOpponentArchetype.value = ''
})

watch(() => tournamentDraft.game, () => {
  if (selectedTournamentDeck.value === newTournamentDeckOption) {
    selectedTournamentDeck.value = ''
    tournamentDraft.deck_uuid = ''
  } else if (!tournamentDecks.value.some((deck) => deck.uuid === selectedTournamentDeck.value)) {
    selectedTournamentDeck.value = ''
    tournamentDraft.deck_uuid = ''
  }
  flowDeckDraft.name = ''
  flowDeckDraft.decklist = ''
})

watch([availableOpponents, () => matchDraft.opponent_uuid], ([eligibleOpponents, selectedOpponentId]) => {
  if (selectedOpponentId && !eligibleOpponents.some((opponent) => opponent.uuid === selectedOpponentId)) {
    matchDraft.opponent_uuid = ''
  }
})

function gameLabel(game: GameName): string {
  return deckGameLabels.value[games.indexOf(game)] ?? game
}

function applyPopularGameDefaults(): void {
  const game = mostRegisteredGame.value
  if (!deckGameSelectionTouched.value) deckDraft.game = game
  if (!tournamentGameSelectionTouched.value) tournamentDraft.game = game
  if (!deckFilterSelectionTouched.value) selectedGameFilter.value = game
  if (!performanceFilterSelectionTouched.value) performanceGameFilter.value = game
  if (!analyticsFilterSelectionTouched.value) analyticsGameFilter.value = game
}

function markDeckGameSelection(): void {
  deckGameSelectionTouched.value = true
}

function markTournamentGameSelection(): void {
  tournamentGameSelectionTouched.value = true
}

function markDeckFilterSelection(): void {
  deckFilterSelectionTouched.value = true
}

function markPerformanceFilterSelection(): void {
  performanceFilterSelectionTouched.value = true
}

function markAnalyticsFilterSelection(): void {
  analyticsFilterSelectionTouched.value = true
}

function updateMatchupDeckSelection(): void {
  const currentSelectionExists = deckMatchupGroups.value.some(
    (deck) => deck.deck_uuid === selectedMatchupDeckUuid.value,
  )
  if (matchupDeckSelectionTouched.value && currentSelectionExists) return

  const mostPlayedDeck = deckMatchupGroups.value.reduce<(typeof deckMatchupGroups.value)[number] | null>(
    (mostPlayed, deck) => {
      const matches = deck.matchups.reduce((total, matchup) => total + matchup.matches, 0)
      const mostPlayedMatches = mostPlayed?.matchups.reduce((total, matchup) => total + matchup.matches, 0) ?? -1
      return matches > mostPlayedMatches ? deck : mostPlayed
    },
    null,
  )
  selectedMatchupDeckUuid.value = mostPlayedDeck?.deck_uuid ?? ''
}

function markMatchupDeckSelection(): void {
  matchupDeckSelectionTouched.value = true
}

function decklistHref(decklist: string): string | null {
  try {
    const url = new URL(decklist.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : props.messages.workspace.loadError
}

async function loadReferenceData(): Promise<void> {
  const [deckList, tournamentList, opponentList] = await Promise.all([
    productApi.listDecks(),
    productApi.listTournaments(),
    productApi.listOpponents(),
  ])
  decks.value = deckList
  applyPopularGameDefaults()
  tournaments.value = tournamentList
  opponents.value = opponentList

  if (!selectedTournamentId.value && tournamentList.length) {
    selectedTournamentId.value = tournamentList[0].uuid
  }
  if (!matchDraft.opponent_uuid && opponentList.length) {
    matchDraft.opponent_uuid = opponentList[0].uuid
  }
}

async function loadAnalytics(): Promise<void> {
  const range = {
    from: fromDate.value || undefined,
    to: toDate.value || undefined,
    game: analyticsGameFilter.value === 'all' ? undefined : analyticsGameFilter.value,
  }
  const [byDeck, byDeckMatchups, byOpponent, byPhase, byScope] = await Promise.all([
    productApi.deckPerformance(range),
    productApi.deckMatchupPerformance(range),
    productApi.opponentPerformance(range),
    productApi.phasePerformance(range),
    productApi.tournamentScopePerformance(range),
  ])
  deckPerformance.value = byDeck
  deckMatchupPerformance.value = byDeckMatchups
  updateMatchupDeckSelection()
  opponentPerformance.value = byOpponent
  phasePerformance.value = byPhase
  scopePerformance.value = byScope
}

async function loadTournamentMatches(): Promise<void> {
  if (!selectedTournamentId.value) {
    matches.value = []
    matchListLoaded.value = true
    return
  }
  matches.value = await productApi.listTournamentMatches(selectedTournamentId.value)
  const game = activeTournament.value?.game
  if (game) {
    for (const match of matches.value) addRegisteredOpponentArchetype(game, match.opposing_deck_archetype)
  }
  matchListLoaded.value = true
}

async function loadDashboardMatches(): Promise<void> {
  const matchGroups = await Promise.all(
    tournaments.value.map((tournament) => productApi.listTournamentMatches(tournament.uuid)),
  )
  dashboardMatchCount.value = matchGroups.reduce((count, group) => count + group.length, 0)
  registeredOpponentArchetypes.value = tournaments.value.flatMap((tournament, index) =>
    matchGroups[index].map((match) => ({ game: tournament.game, name: match.opposing_deck_archetype.trim() })),
  ).filter((archetype) => archetype.name.length > 0)
}

function addRegisteredOpponentArchetype(game: GameName, name: string): void {
  const normalizedName = name.trim()
  if (!normalizedName) return
  const exists = registeredOpponentArchetypes.value.some(
    (archetype) => archetype.game === game && archetype.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
  )
  if (!exists) registeredOpponentArchetypes.value.push({ game, name: normalizedName })
}

async function runLoad(task: () => Promise<void>): Promise<void> {
  errorMessage.value = ''
  successMessage.value = ''
  isSubmissionError.value = false
  isLoading.value = true
  try {
    await task()
  } catch (error) {
    errorMessage.value = errorText(error)
  } finally {
    isLoading.value = false
  }
}

async function loadInitialData(): Promise<void> {
  await runLoad(async () => {
    await loadReferenceData()
    await Promise.all([
      loadAnalytics(),
      loadDashboardMatches(),
      ...(props.activeView === 'matches' ? [loadTournamentMatches()] : []),
    ])
  })
}

async function refreshData(): Promise<void> {
  await runLoad(async () => {
    if (props.activeView === 'analytics') {
      await loadAnalytics()
      return
    }
    if (props.activeView === 'matches') {
      await loadTournamentMatches()
      return
    }
    if (props.activeView === 'dashboard') {
      await loadReferenceData()
      await Promise.all([loadAnalytics(), loadDashboardMatches()])
      return
    }
    await loadReferenceData()
  })
}

async function runCreate(task: () => Promise<void>, successText?: string): Promise<void> {
  errorMessage.value = ''
  successMessage.value = ''
  isSubmissionError.value = false
  isSubmitting.value = true
  try {
    await task()
    successMessage.value = successText ?? props.messages.workspace.createSuccess
  } catch (error) {
    errorMessage.value = errorText(error)
    isSubmissionError.value = true
  } finally {
    isSubmitting.value = false
  }
}

function createDeck(): void {
  void runCreate(async () => {
    const created = await productApi.createDeck({ ...deckDraft })
    decks.value.unshift(created)
    applyPopularGameDefaults()
    deckDraft.name = ''
    deckDraft.decklist = ''
  })
}

function createTournament(): void {
  void runCreate(async () => {
    const created = await productApi.createTournament({
      name: tournamentDraft.name,
      date: `${tournamentDraft.date}T00:00:00Z`,
      game: tournamentDraft.game,
      scope: tournamentDraft.scope,
      is_official_circuit: tournamentDraft.is_official_circuit,
      ...(tournamentDraft.deck_uuid ? { deck_uuid: tournamentDraft.deck_uuid } : {}),
    })
    tournaments.value.unshift(created)
    selectedTournamentId.value = created.uuid
    tournamentDraft.name = ''
    tournamentDraft.is_official_circuit = false
    tournamentDraft.date = localToday
    matchListLoaded.value = false
  })
}

function startTournamentFlow(): void {
  errorMessage.value = ''
  successMessage.value = ''
  tournamentDraft.name = ''
  tournamentDraft.date = localToday
  tournamentGameSelectionTouched.value = false
  tournamentDraft.game = mostRegisteredGame.value
  tournamentDraft.scope = 'LOCAL'
  tournamentDraft.deck_uuid = ''
  selectedTournamentDeck.value = ''
  flowDeckDraft.name = ''
  flowDeckDraft.decklist = ''
  tournamentDraft.is_official_circuit = false
  tournamentFlowStep.value = 'tournament'
}

function handleTournamentDeckSelection(): void {
  tournamentDraft.deck_uuid = selectedTournamentDeck.value === newTournamentDeckOption
    ? ''
    : selectedTournamentDeck.value
}

function createTournamentFlowDeck(): void {
  void runCreate(async () => {
    const created = await productApi.createDeck({
      name: flowDeckDraft.name.trim(),
      game: tournamentDraft.game,
      decklist: flowDeckDraft.decklist.trim(),
    })
    decks.value.unshift(created)
    applyPopularGameDefaults()
    tournamentDraft.deck_uuid = created.uuid
    selectedTournamentDeck.value = created.uuid
    flowDeckDraft.name = ''
    flowDeckDraft.decklist = ''
  })
}

function cancelTournamentSetup(): void {
  tournamentFlowStep.value = 'closed'
  errorMessage.value = ''
}

function startFlowRound(tournament: Tournament): void {
  flowTournament.value = tournament
  selectedTournamentId.value = tournament.uuid
  matches.value = []
  flowRound.value = 1
  flowPhase.value = 'SWISS'
  showPhaseChoice.value = false
  quickOpponentName.value = ''
  matchDraft.result = 'win'
  matchDraft.opponent_uuid = ''
  selectedOpponentArchetype.value = ''
  newOpponentArchetype.value = ''
  matchListLoaded.value = false
  tournamentFlowStep.value = 'round'
}

function createTournamentAndStartFlow(): void {
  void runCreate(async () => {
    const created = await productApi.createTournament({
      name: tournamentDraft.name,
      date: `${tournamentDraft.date}T00:00:00Z`,
      game: tournamentDraft.game,
      scope: tournamentDraft.scope,
      is_official_circuit: tournamentDraft.is_official_circuit,
      ...(tournamentDraft.deck_uuid ? { deck_uuid: tournamentDraft.deck_uuid } : {}),
    })
    tournaments.value.unshift(created)
    startFlowRound(created)
  }, '')
}

function createFlowOpponent(): void {
  void runCreate(async () => {
    const created = await productApi.createOpponent(quickOpponentName.value.trim())
    opponents.value.unshift(created)
    matchDraft.opponent_uuid = created.uuid
    quickOpponentName.value = ''
  })
}

async function saveFlowRound(nextPhase: MatchPhase | null): Promise<void> {
  const tournament = flowTournament.value
  const archetypeName = resolvedOpponentArchetype.value
  if (!tournament || !matchDraft.opponent_uuid || !archetypeName) return

  errorMessage.value = ''
  successMessage.value = ''
  isSubmissionError.value = false
  isSubmitting.value = true
  try {
    const created = await productApi.createMatch({
      result: matchDraft.result,
      round_number: flowRound.value,
      phase: flowPhase.value,
      opposing_deck_archetype: archetypeName,
      tournament_uuid: tournament.uuid,
      opponent_uuid: matchDraft.opponent_uuid,
    })
    if (selectedTournamentId.value === tournament.uuid) matches.value.unshift(created)
    addRegisteredOpponentArchetype(tournament.game, archetypeName)
    selectedOpponentArchetype.value = ''
    newOpponentArchetype.value = ''
    matchDraft.opponent_uuid = ''
    matchDraft.result = 'win'
    matchListLoaded.value = false

    if (nextPhase === null) {
      tournamentFlowStep.value = 'closed'
      flowTournament.value = null
      showPhaseChoice.value = false
      successMessage.value = props.messages.workspace.flow.finished
      isLoading.value = true
      try {
        await Promise.all([loadAnalytics(), loadDashboardMatches()])
      } catch (error) {
        errorMessage.value = errorText(error)
      } finally {
        isLoading.value = false
      }
      return
    }

    flowRound.value += 1
    flowPhase.value = nextPhase
    showPhaseChoice.value = false
  } catch (error) {
    errorMessage.value = errorText(error)
    isSubmissionError.value = true
  } finally {
    isSubmitting.value = false
  }
}

function advanceSwiss(): void {
  void saveFlowRound('SWISS')
}

function handleNextSwissPhase(): void {
  if (flowTournament.value?.scope === 'LOCAL') {
    advanceSwiss()
    return
  }
  showPhaseChoice.value = !showPhaseChoice.value
}

function enterKnockout(): void {
  void saveFlowRound('TOP_8')
}

function advanceKnockout(): void {
  const nextPhase = flowPhase.value === 'TOP_8' ? 'TOP_4' : 'FINALS'
  void saveFlowRound(nextPhase)
}

function finishTournamentFlow(): void {
  void saveFlowRound(null)
}

function createOpponent(): void {
  void runCreate(async () => {
    const created = await productApi.createOpponent(opponentDraft.name)
    opponents.value.unshift(created)
    matchDraft.opponent_uuid = created.uuid
    opponentDraft.name = ''
  })
}

function createMatch(): void {
  const tournamentId = selectedTournamentId.value
  const archetypeName = resolvedOpponentArchetype.value
  if (!tournamentId || !archetypeName) return
  void runCreate(async () => {
    const tournament = activeTournament.value
    const created = await productApi.createMatch({
      result: matchDraft.result,
      round_number: Number(matchDraft.round_number),
      phase: matchDraft.phase,
      opposing_deck_archetype: archetypeName,
      tournament_uuid: tournamentId,
      opponent_uuid: matchDraft.opponent_uuid,
    })
    if (selectedTournamentId.value === tournamentId) matches.value.unshift(created)
    if (tournament) addRegisteredOpponentArchetype(tournament.game, archetypeName)
    matchDraft.round_number += 1
    selectedOpponentArchetype.value = ''
    newOpponentArchetype.value = ''
  })
}

function handleTournamentChange(): void {
  matchListLoaded.value = false
  void runLoad(loadTournamentMatches)
}

function openTournamentMatches(tournamentId: string): void {
  selectedTournamentId.value = tournamentId
  emit('navigate', 'matches')
  matchListLoaded.value = false
}

function submitDateRange(): void {
  isSubmissionError.value = false
  if (fromDate.value && toDate.value && fromDate.value > toDate.value) {
    errorMessage.value = props.messages.workspace.analytics.invalidRange
    return
  }
  void runLoad(loadAnalytics)
}

function rateLabel(value: number): string {
  return `${value.toFixed(1)}%`
}

function opponentName(uuid: string): string {
  return opponents.value.find((opponent) => opponent.uuid === uuid)?.name ?? '—'
}

function resultLabel(result: MatchResult): string {
  return props.messages.workspace.results[result]
}

function phaseLabel(phase: MatchPhase): string {
  return props.messages.workspace.phases[phase]
}

function scopeLabel(scope: TournamentScope): string {
  return props.messages.workspace.scopes[scope]
}

watch(
  () => props.activeView,
  (view) => {
    errorMessage.value = ''
    successMessage.value = ''
    if (view === 'analytics') void runLoad(loadAnalytics)
    else if (view === 'matches' && !matchListLoaded.value) void runLoad(loadTournamentMatches)
    else if (view === 'dashboard') void runLoad(async () => {
      await Promise.all([loadAnalytics(), loadDashboardMatches()])
    })
  },
)

onMounted(loadInitialData)
</script>

<template>
  <main class="workspace-shell">
    <aside class="workspace-sidebar">
      <div class="workspace-profile">
        <span class="workspace-avatar" aria-hidden="true">{{ user.name.charAt(0).toUpperCase() }}</span>
        <span class="workspace-profile-copy">
          <strong>{{ user.name }}</strong>
          <small>{{ user.email }}</small>
        </span>
      </div>

      <p class="workspace-nav-label">{{ messages.workspace.overview }}</p>
      <nav class="workspace-nav" :aria-label="messages.navigationLabel">
        <button
          v-for="view in navigation"
          :key="view"
          type="button"
          :class="{ 'is-active': activeView === view }"
          :aria-current="activeView === view ? 'page' : undefined"
          @click="emit('navigate', view)"
        >
          <span class="workspace-nav-icon" aria-hidden="true">{{ ['dashboard', 'decks', 'tournaments', 'matches', 'opponents', 'analytics'].indexOf(view) + 1 }}</span>
          {{ messages.workspace.nav[view] }}
        </button>
      </nav>

      <div class="workspace-sidebar-footer">
        <span class="brand-mark" aria-hidden="true"><span></span></span>
        <span>tcg<span class="brand-accent">stats</span></span>
      </div>
    </aside>

    <section class="workspace-content" aria-live="polite">
      <header class="workspace-page-header">
        <div>
          <p class="workspace-eyebrow">{{ activeView === 'dashboard' ? (tournamentFlowStep === 'closed' ? messages.workspace.overview : messages.workspace.flow.start) : messages.workspace.nav[activeView] }}</p>
          <h1 v-if="activeView === 'dashboard' && tournamentFlowStep === 'round'">{{ flowTournament?.name }} · {{ messages.workspace.flow.round.replace('{number}', String(flowRound)) }}</h1>
          <h1 v-else-if="activeView === 'dashboard' && tournamentFlowStep === 'tournament'">{{ messages.workspace.flow.start }}</h1>
          <h1 v-else-if="activeView === 'dashboard'">{{ messages.workspace.welcome.replace('{name}', user.name) }}</h1>
          <h1 v-else>{{ activeTitle }}</h1>
          <p class="workspace-subtitle">{{ activeView === 'analytics' ? messages.workspace.analytics.description : (activeView === 'dashboard' && tournamentFlowStep !== 'closed' ? messages.workspace.flow.startDescription : messages.workspace.subtitle) }}</p>
        </div>
        <span class="workspace-date">{{ new Date().toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) }}</span>
      </header>

      <p v-if="errorMessage" class="workspace-feedback workspace-feedback-error" role="alert">
        {{ errorMessage }}
        <button v-if="!isSubmissionError" type="button" @click="refreshData">{{ messages.workspace.retry }}</button>
      </p>
      <p v-if="successMessage" class="workspace-feedback workspace-feedback-success" role="status">{{ successMessage }}</p>
      <p v-if="isLoading" class="workspace-loading" role="status">{{ messages.workspace.loading }}</p>

      <template v-if="activeView === 'dashboard'">
        <template v-if="tournamentFlowStep === 'tournament'">
          <section class="workspace-panel tournament-flow-panel">
            <div class="workspace-panel-heading">
              <div>
                <p class="workspace-eyebrow">{{ messages.workspace.flow.start }}</p>
                <h2>{{ messages.workspace.flow.startDescription }}</h2>
              </div>
              <button class="workspace-text-button" type="button" @click="cancelTournamentSetup">
                {{ messages.workspace.flow.cancelSetup }}
              </button>
            </div>
            <form class="workspace-form tournament-setup-form" @submit.prevent="createTournamentAndStartFlow">
              <label>{{ messages.workspace.fields.name }}<input v-model.trim="tournamentDraft.name" required maxlength="255" autocomplete="off"></label>
              <div class="workspace-form-grid">
                <label>{{ messages.workspace.fields.date }}<input v-model="tournamentDraft.date" type="date" required></label>
                <label>{{ messages.workspace.fields.game }}
                  <select v-model="tournamentDraft.game" required @change="markTournamentGameSelection">
                    <option v-for="game in games" :key="game" :value="game">{{ gameLabel(game) }}</option>
                  </select>
                </label>
              </div>
              <div class="workspace-form-grid">
                <label>{{ messages.workspace.fields.scope }}
                  <select v-model="tournamentDraft.scope" required>
                    <option v-for="scope in scopeOptions" :key="scope" :value="scope">{{ scopeLabel(scope) }}</option>
                  </select>
                </label>
                <label>{{ messages.workspace.fields.deck }}
                  <select v-model="selectedTournamentDeck" @change="handleTournamentDeckSelection">
                    <option value="">{{ messages.workspace.chooseDeck }}</option>
                    <option v-for="deck in tournamentDecks" :key="deck.uuid" :value="deck.uuid">{{ deck.name }}</option>
                    <option :value="newTournamentDeckOption">{{ messages.workspace.flow.registerNewDeck }}</option>
                  </select>
                </label>
              </div>
              <div v-if="selectedTournamentDeck === newTournamentDeckOption" class="quick-opponent-box tournament-inline-deck">
                <p>{{ messages.workspace.flow.newDeckDescription.replace('{game}', gameLabel(tournamentDraft.game)) }}</p>
                <label>{{ messages.workspace.fields.name }}
                  <input v-model.trim="flowDeckDraft.name" required maxlength="255" autocomplete="off">
                </label>
                <label>{{ messages.workspace.fields.decklist }}
                  <textarea v-model.trim="flowDeckDraft.decklist" required maxlength="500" rows="3"></textarea>
                  <small>{{ messages.workspace.decklistHint }}</small>
                </label>
                <button
                  class="button button-secondary button-small"
                  type="button"
                  :disabled="isSubmitting || !flowDeckDraft.name.trim() || !flowDeckDraft.decklist.trim()"
                  @click="createTournamentFlowDeck"
                >
                  {{ isSubmitting ? messages.workspace.actions.saving : messages.workspace.flow.saveNewDeck }}
                </button>
              </div>
              <label class="workspace-checkbox"><input v-model="tournamentDraft.is_official_circuit" type="checkbox"><span>{{ messages.workspace.officialCircuit }}</span></label>
              <div class="tournament-flow-actions">
                <button class="button button-primary" type="submit" :disabled="isSubmitting || selectedTournamentDeck === newTournamentDeckOption">
                  {{ isSubmitting ? messages.workspace.actions.saving : messages.workspace.flow.createFirstTournament }}
                </button>
              </div>
            </form>
          </section>
        </template>

        <template v-else-if="tournamentFlowStep === 'round' && flowTournament">
          <section class="workspace-panel tournament-flow-panel">
            <div class="tournament-flow-heading">
              <div>
                <p class="workspace-eyebrow">{{ flowTournament.name }}</p>
                <h2>{{ messages.workspace.flow.round.replace('{number}', String(flowRound)) }}</h2>
                <p>{{ messages.workspace.flow.roundDescription }}</p>
              </div>
              <span class="tournament-phase-badge">{{ messages.workspace.phases[flowPhase] }}</span>
            </div>

            <form class="workspace-form tournament-round-form" @submit.prevent="showPhaseChoice = true">
              <label>{{ messages.workspace.fields.opponent }}
                <select v-model="matchDraft.opponent_uuid" required>
                  <option value="" disabled>{{ isSwissPairing && opponents.length && !availableOpponents.length ? messages.workspace.noSwissOpponents : messages.workspace.chooseOpponent }}</option>
                  <option v-for="opponent in availableOpponents" :key="opponent.uuid" :value="opponent.uuid">{{ opponent.name }}</option>
                </select>
              </label>
              <div class="quick-opponent-box">
                <p>{{ messages.workspace.flow.quickOpponent }}</p>
                <div class="quick-opponent-controls">
                  <input v-model.trim="quickOpponentName" maxlength="255" :placeholder="messages.workspace.fields.opponent" :aria-label="messages.workspace.fields.opponent">
                  <button class="button button-secondary button-small" type="button" :disabled="isSubmitting || !quickOpponentName" @click="createFlowOpponent">
                    {{ messages.workspace.flow.createOpponent }}
                  </button>
                </div>
              </div>
              <label>{{ messages.workspace.flow.opponentDeck }}
                <select v-model="selectedOpponentArchetype" required>
                  <option value="" disabled>{{ messages.workspace.flow.chooseOpponentArchetype }}</option>
                  <option v-for="archetype in opponentArchetypeOptions" :key="archetype" :value="archetype">{{ archetype }}</option>
                  <option :value="newArchetypeOption">{{ messages.workspace.flow.registerNewArchetype }}</option>
                </select>
              </label>
              <label v-if="selectedOpponentArchetype === newArchetypeOption">{{ messages.workspace.flow.newOpponentArchetype }}
                <input v-model.trim="newOpponentArchetype" required maxlength="255" :placeholder="messages.workspace.flow.opponentDeckPlaceholder">
              </label>
              <fieldset class="match-result-fieldset">
                <legend>{{ messages.workspace.fields.result }}</legend>
                <label v-for="result in resultOptions" :key="result" class="match-result-option" :class="{ 'is-selected': matchDraft.result === result, [`result-${result}`]: true }">
                  <input v-model="matchDraft.result" type="radio" name="tournament-flow-result" :value="result">
                  <span>{{ messages.workspace.results[result] }}</span>
                </label>
              </fieldset>
            </form>

            <div v-if="showPhaseChoice && flowPhase === 'SWISS' && flowTournament.scope !== 'LOCAL'" class="phase-choice-panel">
              <p>{{ messages.workspace.flow.chooseNextFormat }}</p>
              <div class="phase-choice-actions">
                <button class="button button-secondary" type="button" :disabled="isSubmitting || !matchDraft.opponent_uuid || !hasValidOpponentArchetype" @click="advanceSwiss">
                  {{ messages.workspace.flow.continueSwiss }}
                </button>
                <button class="button button-primary" type="button" :disabled="isSubmitting || !matchDraft.opponent_uuid || !hasValidOpponentArchetype" @click="enterKnockout">
                  {{ messages.workspace.flow.startKnockout }}
                </button>
              </div>
            </div>

            <div class="tournament-flow-actions">
              <button
                v-if="flowPhase === 'SWISS'"
                class="button button-secondary"
                type="button"
                :disabled="isSubmitting || (flowTournament.scope === 'LOCAL' && (!matchDraft.opponent_uuid || !hasValidOpponentArchetype))"
                @click="handleNextSwissPhase"
              >
                {{ messages.workspace.flow.nextPhase }}
              </button>
              <button
                v-else-if="flowPhase !== 'FINALS'"
                class="button button-secondary"
                type="button"
                :disabled="isSubmitting || !matchDraft.opponent_uuid || !hasValidOpponentArchetype"
                @click="advanceKnockout"
              >
                {{ messages.workspace.flow.nextPhase }}
              </button>
              <button
                class="button button-primary"
                type="button"
                :disabled="isSubmitting || !matchDraft.opponent_uuid || !hasValidOpponentArchetype"
                @click="finishTournamentFlow"
              >
                {{ isSubmitting ? messages.workspace.actions.saving : messages.workspace.flow.finish }}
              </button>
            </div>
          </section>
          <section class="workspace-panel tournament-flow-history">
            <div class="workspace-panel-heading">
              <div><p class="workspace-eyebrow">{{ messages.workspace.tournamentMatches }}</p><h2>{{ matches.length }}</h2></div>
            </div>
            <ul v-if="matches.length" class="workspace-card-list match-list">
              <li v-for="match in matches" :key="match.uuid" class="workspace-record-card">
                <span class="match-result-mark" :class="`result-${match.result}`">{{ match.result.charAt(0).toUpperCase() }}</span>
                <div class="record-main">
                  <strong>{{ messages.workspace.fields.round }} {{ match.round_number }} · {{ messages.workspace.phases[match.phase] }}</strong>
                  <small>{{ opponentName(match.opponent_uuid) }} · {{ match.opposing_deck_archetype }}</small>
                </div>
                <span class="match-result-label" :class="`result-${match.result}`">{{ messages.workspace.results[match.result] }}</span>
              </li>
            </ul>
            <p v-else class="workspace-empty">{{ messages.workspace.noMatches }}</p>
          </section>
        </template>

        <template v-else>
        <section class="workspace-stat-grid" :aria-label="messages.workspace.overview">
          <article class="workspace-stat-card">
            <span class="workspace-stat-icon">◈</span>
            <p>{{ messages.workspace.stats.decks }}</p>
            <strong>{{ decks.length }}</strong>
          </article>
          <article class="workspace-stat-card">
            <span class="workspace-stat-icon">◎</span>
            <p>{{ messages.workspace.stats.tournaments }}</p>
            <strong>{{ tournaments.length }}</strong>
          </article>
          <article class="workspace-stat-card">
            <span class="workspace-stat-icon">↗</span>
            <p>{{ messages.workspace.stats.matches }}</p>
            <strong>{{ dashboardMatchCount }}</strong>
          </article>
          <article class="workspace-stat-card">
            <span class="workspace-stat-icon">%</span>
            <p>{{ messages.workspace.stats.winRate }}</p>
            <strong>{{ rateLabel(dashboardWinRate) }}</strong>
          </article>
        </section>

        <section class="workspace-quick-actions">
          <div>
            <p class="workspace-eyebrow">{{ messages.workspace.quickActions }}</p>
            <h2>{{ messages.workspace.subtitle }}</h2>
          </div>
          <div class="workspace-action-row">
            <button class="button button-primary button-small dashboard-start-tournament" type="button" @click="startTournamentFlow">
              {{ messages.workspace.flow.start }} <span>↗</span>
            </button>
            <button class="button button-secondary button-small" type="button" @click="emit('navigate', 'decks')">
              {{ messages.workspace.addDeck }} <span>+</span>
            </button>
            <button class="button button-secondary button-small" type="button" @click="emit('navigate', 'tournaments')">
              {{ messages.workspace.addTournament }} <span>+</span>
            </button>
            <button class="button button-secondary button-small" type="button" @click="emit('navigate', 'matches')">
              {{ messages.workspace.recordMatch }} <span>+</span>
            </button>
          </div>
        </section>

        <section class="workspace-panel">
          <div class="workspace-panel-heading">
            <div>
              <p class="workspace-eyebrow">{{ messages.workspace.performance }}</p>
              <h2>{{ messages.workspace.nav.analytics }}</h2>
            </div>
            <label class="workspace-filter performance-game-filter">
              {{ messages.workspace.performanceGame }}
              <select v-model="performanceGameFilter" @change="markPerformanceFilterSelection">
                <option value="all">{{ messages.workspace.allGames }}</option>
                <option v-for="game in games" :key="game" :value="game">{{ gameLabel(game) }}</option>
              </select>
            </label>
            <button class="workspace-text-button" type="button" @click="emit('navigate', 'analytics')">
              {{ messages.workspace.nav.analytics }} <span aria-hidden="true">→</span>
            </button>
          </div>
          <p v-if="!visibleDeckPerformance.length" class="workspace-empty">
            {{ performanceGameFilter === 'all' ? messages.workspace.noPerformance : messages.workspace.noGamePerformance }}
          </p>
          <div v-else class="performance-list">
            <div v-for="entry in visibleDeckPerformance" :key="entry.deck_uuid" class="performance-row">
              <div class="performance-row-title">
                <strong>{{ entry.deck_name }}</strong>
                <span>{{ entry.matches }} {{ messages.workspace.analytics.matches }}</span>
              </div>
              <div class="performance-track" aria-hidden="true"><span :style="{ width: `${Math.min(entry.win_rate, 100)}%` }"></span></div>
              <strong class="performance-rate">{{ rateLabel(entry.win_rate) }}</strong>
            </div>
          </div>
        </section>
        </template>
      </template>

      <template v-else-if="activeView === 'decks'">
        <div class="workspace-columns">
          <section class="workspace-panel workspace-form-panel">
            <div class="workspace-panel-heading">
              <div><p class="workspace-eyebrow">{{ messages.workspace.addDeck }}</p><h2>{{ messages.workspace.actions.saveDeck }}</h2></div>
            </div>
            <form class="workspace-form" @submit.prevent="createDeck">
              <label>{{ messages.workspace.fields.name }}<input v-model.trim="deckDraft.name" required maxlength="255" autocomplete="off"></label>
              <label>{{ messages.workspace.fields.game }}
                <select v-model="deckDraft.game" required @change="markDeckGameSelection">
                  <option v-for="game in games" :key="game" :value="game">{{ gameLabel(game) }}</option>
                </select>
              </label>
              <label>{{ messages.workspace.fields.decklist }}
                <textarea v-model.trim="deckDraft.decklist" required maxlength="500" rows="3"></textarea>
                <small>{{ messages.workspace.decklistHint }}</small>
              </label>
              <button class="button button-primary" type="submit" :disabled="isSubmitting">
                {{ isSubmitting ? messages.workspace.actions.saving : messages.workspace.actions.saveDeck }}
              </button>
            </form>
          </section>

          <section class="workspace-panel">
            <div class="workspace-panel-heading workspace-list-heading">
              <div><p class="workspace-eyebrow">{{ messages.workspace.stats.decks }}</p><h2>{{ decks.length }}</h2></div>
              <label class="workspace-filter">{{ messages.workspace.fields.game }}
                <select v-model="selectedGameFilter" @change="markDeckFilterSelection">
                  <option value="all">{{ messages.workspace.allGames }}</option>
                  <option v-for="game in games" :key="game" :value="game">{{ gameLabel(game) }}</option>
                </select>
              </label>
            </div>
            <p v-if="!visibleDecks.length" class="workspace-empty">{{ messages.workspace.noDecks }}</p>
            <ul v-else class="workspace-card-list">
              <li v-for="deck in visibleDecks" :key="deck.uuid">
                <details class="workspace-record-card workspace-deck-card">
                  <summary>
                    <span class="record-mark" aria-hidden="true">◈</span>
                    <span class="workspace-deck-summary">
                      <strong>{{ deck.name }}</strong>
                      <small>{{ gameLabel(deck.game) }}</small>
                    </span>
                    <span class="workspace-deck-expand" aria-hidden="true"></span>
                  </summary>
                  <div class="workspace-deck-details">
                    <p>{{ messages.workspace.fields.decklist }}</p>
                    <a
                      v-if="decklistHref(deck.decklist)"
                      class="workspace-deck-link"
                      :href="decklistHref(deck.decklist)!"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ messages.workspace.openDecklist }} <span aria-hidden="true">↗</span>
                    </a>
                    <pre v-else>{{ deck.decklist }}</pre>
                  </div>
                </details>
              </li>
            </ul>
          </section>
        </div>
      </template>

      <template v-else-if="activeView === 'tournaments'">
        <div class="workspace-columns">
          <section class="workspace-panel workspace-form-panel">
            <div class="workspace-panel-heading">
              <div><p class="workspace-eyebrow">{{ messages.workspace.addTournament }}</p><h2>{{ messages.workspace.actions.saveTournament }}</h2></div>
            </div>
            <form class="workspace-form" @submit.prevent="createTournament">
              <label>{{ messages.workspace.fields.name }}<input v-model.trim="tournamentDraft.name" required maxlength="255" autocomplete="off"></label>
              <div class="workspace-form-grid">
                <label>{{ messages.workspace.fields.date }}<input v-model="tournamentDraft.date" type="date" required></label>
                <label>{{ messages.workspace.fields.game }}
                  <select v-model="tournamentDraft.game" required @change="markTournamentGameSelection">
                    <option v-for="game in games" :key="game" :value="game">{{ gameLabel(game) }}</option>
                  </select>
                </label>
              </div>
              <label>{{ messages.workspace.fields.scope }}
                <select v-model="tournamentDraft.scope" required>
                  <option v-for="scope in scopeOptions" :key="scope" :value="scope">{{ scopeLabel(scope) }}</option>
                </select>
              </label>
              <label>{{ messages.workspace.fields.deck }}
                <select v-model="tournamentDraft.deck_uuid">
                  <option value="">{{ messages.workspace.chooseDeck }}</option>
                  <option v-for="deck in tournamentDecks" :key="deck.uuid" :value="deck.uuid">{{ deck.name }}</option>
                </select>
              </label>
              <label class="workspace-checkbox"><input v-model="tournamentDraft.is_official_circuit" type="checkbox"><span>{{ messages.workspace.officialCircuit }}</span></label>
              <button class="button button-primary" type="submit" :disabled="isSubmitting">
                {{ isSubmitting ? messages.workspace.actions.saving : messages.workspace.actions.saveTournament }}
              </button>
            </form>
          </section>

          <section class="workspace-panel">
            <div class="workspace-panel-heading"><div><p class="workspace-eyebrow">{{ messages.workspace.stats.tournaments }}</p><h2>{{ tournaments.length }}</h2></div></div>
            <p v-if="!tournaments.length" class="workspace-empty">{{ messages.workspace.noTournaments }}</p>
            <ul v-else class="workspace-card-list">
              <li v-for="tournament in tournaments" :key="tournament.uuid" class="workspace-record-card workspace-tournament-card">
                <span class="record-mark">◎</span>
                <div class="record-main">
                  <strong>{{ tournament.name }}</strong>
                  <small>{{ new Date(`${tournament.date.slice(0, 10)}T00:00:00`).toLocaleDateString(locale) }} · {{ gameLabel(tournament.game) }}</small>
                  <small>{{ scopeLabel(tournament.scope) }}<template v-if="tournament.is_official_circuit"> · {{ messages.workspace.officialCircuit }}</template></small>
                </div>
                <button class="workspace-text-button" type="button" @click="openTournamentMatches(tournament.uuid)">
                  {{ messages.workspace.actions.viewMatches }} <span aria-hidden="true">→</span>
                </button>
              </li>
            </ul>
          </section>
        </div>
      </template>

      <template v-else-if="activeView === 'matches'">
        <section class="workspace-panel workspace-match-toolbar">
          <label class="workspace-filter">{{ messages.workspace.fields.name }}
            <select v-model="selectedTournamentId" @change="handleTournamentChange">
              <option value="">{{ messages.workspace.chooseTournament }}</option>
              <option v-for="tournament in tournaments" :key="tournament.uuid" :value="tournament.uuid">{{ tournament.name }}</option>
            </select>
          </label>
          <p>{{ messages.workspace.matchHistoryHint }}</p>
        </section>

        <div v-if="!tournaments.length" class="workspace-empty-state">
          <span aria-hidden="true">◎</span><p>{{ messages.workspace.noTournamentsForMatches }}</p>
          <button class="button button-primary button-small" type="button" @click="emit('navigate', 'tournaments')">{{ messages.workspace.addTournament }}</button>
        </div>
        <div v-else class="workspace-columns">
          <section class="workspace-panel workspace-form-panel">
            <div class="workspace-panel-heading">
              <div><p class="workspace-eyebrow">{{ activeTournament?.name ?? messages.workspace.chooseTournament }}</p><h2>{{ messages.workspace.recordMatch }}</h2></div>
            </div>
            <form class="workspace-form" @submit.prevent="createMatch">
              <label>{{ messages.workspace.fields.opponent }}
                <select v-model="matchDraft.opponent_uuid" required>
                  <option value="" disabled>{{ isSwissPairing && opponents.length && !availableOpponents.length ? messages.workspace.noSwissOpponents : messages.workspace.chooseOpponent }}</option>
                  <option v-for="opponent in availableOpponents" :key="opponent.uuid" :value="opponent.uuid">{{ opponent.name }}</option>
                </select>
              </label>
              <p v-if="!opponents.length" class="workspace-inline-hint">
                {{ messages.workspace.noOpponents }}
                <button class="workspace-text-button" type="button" @click="emit('navigate', 'opponents')">{{ messages.workspace.actions.addOpponent }}</button>
              </p>
              <div class="workspace-form-grid">
                <label>{{ messages.workspace.fields.result }}
                  <select v-model="matchDraft.result" required>
                    <option v-for="result in resultOptions" :key="result" :value="result">{{ resultLabel(result) }}</option>
                  </select>
                </label>
                <label>{{ messages.workspace.fields.round }}<input v-model.number="matchDraft.round_number" type="number" min="1" required></label>
              </div>
              <label>{{ messages.workspace.fields.phase }}
                <select v-model="matchDraft.phase" required>
                  <option v-for="phase in phaseOptions" :key="phase" :value="phase">{{ phaseLabel(phase) }}</option>
                </select>
              </label>
              <label>{{ messages.workspace.fields.opposingDeck }}
                <select v-model="selectedOpponentArchetype" required>
                  <option value="" disabled>{{ messages.workspace.flow.chooseOpponentArchetype }}</option>
                  <option v-for="archetype in opponentArchetypeOptions" :key="archetype" :value="archetype">{{ archetype }}</option>
                  <option :value="newArchetypeOption">{{ messages.workspace.flow.registerNewArchetype }}</option>
                </select>
              </label>
              <label v-if="selectedOpponentArchetype === newArchetypeOption">{{ messages.workspace.flow.newOpponentArchetype }}
                <input v-model.trim="newOpponentArchetype" required maxlength="255" :placeholder="messages.workspace.flow.opponentDeckPlaceholder">
              </label>
              <button class="button button-primary" type="submit" :disabled="isSubmitting || !selectedTournamentId || !opponents.length">
                {{ isSubmitting ? messages.workspace.actions.saving : messages.workspace.actions.saveMatch }}
              </button>
            </form>
          </section>

          <section class="workspace-panel">
            <div class="workspace-panel-heading"><div><p class="workspace-eyebrow">{{ messages.workspace.tournamentMatches }}</p><h2>{{ totalMatches.length }}</h2></div></div>
            <p v-if="!totalMatches.length && matchListLoaded" class="workspace-empty">{{ messages.workspace.noMatches }}</p>
            <ul v-else class="workspace-card-list match-list">
              <li v-for="match in totalMatches" :key="match.uuid" class="workspace-record-card">
                <span class="match-result-mark" :class="`result-${match.result}`">{{ resultLabel(match.result).charAt(0) }}</span>
                <div class="record-main">
                  <strong>{{ messages.workspace.fields.round }} {{ match.round_number }} · {{ phaseLabel(match.phase) }}</strong>
                  <small>{{ opponentName(match.opponent_uuid) }} · {{ match.opposing_deck_archetype }}</small>
                </div>
                <span class="match-result-label" :class="`result-${match.result}`">{{ resultLabel(match.result) }}</span>
              </li>
            </ul>
          </section>
        </div>
      </template>

      <template v-else-if="activeView === 'opponents'">
        <div class="workspace-columns">
          <section class="workspace-panel workspace-form-panel">
            <div class="workspace-panel-heading">
              <div><p class="workspace-eyebrow">{{ messages.workspace.actions.addOpponent }}</p><h2>{{ messages.workspace.actions.saveOpponent }}</h2></div>
            </div>
            <form class="workspace-form" @submit.prevent="createOpponent">
              <label>{{ messages.workspace.fields.name }}<input v-model.trim="opponentDraft.name" required maxlength="255" autocomplete="off"></label>
              <button class="button button-primary" type="submit" :disabled="isSubmitting">
                {{ isSubmitting ? messages.workspace.actions.saving : messages.workspace.actions.saveOpponent }}
              </button>
            </form>
          </section>

          <section class="workspace-panel">
            <div class="workspace-panel-heading"><div><p class="workspace-eyebrow">{{ messages.workspace.nav.opponents }}</p><h2>{{ opponents.length }}</h2></div></div>
            <p v-if="!opponents.length" class="workspace-empty">{{ messages.workspace.noOpponents }}</p>
            <ul v-else class="workspace-card-list">
              <li v-for="opponent in opponents" :key="opponent.uuid" class="workspace-record-card">
                <span class="workspace-opponent-avatar" aria-hidden="true">{{ opponent.name.charAt(0).toUpperCase() }}</span>
                <div><strong>{{ opponent.name }}</strong><small>{{ messages.workspace.nav.opponents }}</small></div>
              </li>
            </ul>
          </section>
        </div>
      </template>

      <template v-else-if="activeView === 'analytics'">
        <form class="workspace-panel workspace-date-filter" @submit.prevent="submitDateRange">
          <label>{{ messages.workspace.analytics.from }}<input v-model="fromDate" type="date"></label>
          <label>{{ messages.workspace.analytics.to }}<input v-model="toDate" type="date"></label>
          <label>{{ messages.workspace.analytics.gameFilter }}
            <select v-model="analyticsGameFilter" @change="markAnalyticsFilterSelection">
              <option value="all">{{ messages.workspace.allGames }}</option>
              <option v-for="game in games" :key="game" :value="game">{{ gameLabel(game) }}</option>
            </select>
          </label>
          <button class="button button-primary button-small" type="submit" :disabled="isLoading">{{ messages.workspace.analytics.apply }}</button>
        </form>
        <section class="workspace-panel deck-matchup-chart-section">
          <div class="workspace-panel-heading">
            <div>
              <p class="workspace-eyebrow">{{ messages.workspace.analytics.matchups }}</p>
              <h2>{{ messages.workspace.analytics.matchups }}</h2>
            </div>
            <label v-if="deckMatchupGroups.length" class="workspace-filter deck-matchup-filter">
              {{ messages.workspace.fields.deck }}
              <select v-model="selectedMatchupDeckUuid" @change="markMatchupDeckSelection">
                <option v-for="deck in deckMatchupGroups" :key="deck.deck_uuid" :value="deck.deck_uuid">
                  {{ deck.deck_name }}
                </option>
              </select>
            </label>
          </div>
          <p v-if="!deckMatchupGroups.length" class="workspace-empty">{{ messages.workspace.analytics.noMatchups }}</p>
          <div v-else-if="selectedDeckMatchup" class="deck-matchup-chart">
            <article class="deck-matchup-card">
              <div
                v-for="matchup in selectedDeckMatchup.matchups"
                :key="`${selectedDeckMatchup.deck_uuid}-${matchup.opponent_deck_archetype}`"
                class="deck-matchup-row"
              >
                <div class="deck-matchup-label">
                  <strong>{{ matchup.opponent_deck_archetype }}</strong>
                  <span>{{ matchup.matches }} {{ messages.workspace.analytics.matches }}</span>
                  <b>{{ rateLabel(matchup.win_rate) }}</b>
                </div>
                <div
                  class="deck-matchup-track"
                  role="img"
                  :aria-label="`${matchup.opponent_deck_archetype}: ${rateLabel(matchup.win_rate)}`"
                >
                  <span :style="{ width: `${Math.min(Math.max(matchup.win_rate, 0), 100)}%` }"></span>
                </div>
              </div>
            </article>
          </div>
        </section>
        <div class="workspace-analytics-grid">
          <section class="workspace-panel analytics-table-panel">
            <div class="workspace-panel-heading"><div><p class="workspace-eyebrow">{{ messages.workspace.analytics.decks }}</p><h2>{{ messages.workspace.analytics.decks }}</h2></div></div>
            <div class="workspace-table-wrap">
              <table><thead><tr><th>{{ messages.workspace.fields.name }}</th><th>{{ messages.workspace.analytics.matches }}</th><th>{{ messages.workspace.analytics.wins }}</th><th>{{ messages.workspace.analytics.winRate }}</th></tr></thead>
                <tbody><tr v-for="entry in deckPerformance" :key="entry.deck_uuid"><td :data-label="messages.workspace.fields.name">{{ entry.deck_name }}</td><td :data-label="messages.workspace.analytics.matches">{{ entry.matches }}</td><td :data-label="messages.workspace.analytics.wins">{{ entry.wins }}</td><td :data-label="messages.workspace.analytics.winRate">{{ rateLabel(entry.win_rate) }}</td></tr></tbody>
              </table>
              <p v-if="!deckPerformance.length" class="workspace-empty">{{ messages.workspace.noPerformance }}</p>
            </div>
          </section>

          <section class="workspace-panel analytics-table-panel">
            <div class="workspace-panel-heading"><div><p class="workspace-eyebrow">{{ messages.workspace.analytics.opponents }}</p><h2>{{ messages.workspace.analytics.opponents }}</h2></div></div>
            <div class="workspace-table-wrap">
              <table><thead><tr><th>{{ messages.workspace.fields.opponent }}</th><th>{{ messages.workspace.analytics.matches }}</th><th>{{ messages.workspace.analytics.wins }}</th><th>{{ messages.workspace.analytics.winRate }}</th></tr></thead>
                <tbody><tr v-for="entry in opponentPerformance" :key="entry.opponent_uuid"><td :data-label="messages.workspace.fields.opponent">{{ entry.opponent_name }}</td><td :data-label="messages.workspace.analytics.matches">{{ entry.matches }}</td><td :data-label="messages.workspace.analytics.wins">{{ entry.wins }}</td><td :data-label="messages.workspace.analytics.winRate">{{ rateLabel(entry.win_rate) }}</td></tr></tbody>
              </table>
              <p v-if="!opponentPerformance.length" class="workspace-empty">{{ messages.workspace.noPerformance }}</p>
            </div>
          </section>

          <section class="workspace-panel analytics-table-panel">
            <div class="workspace-panel-heading"><div><p class="workspace-eyebrow">{{ messages.workspace.analytics.phases }}</p><h2>{{ messages.workspace.analytics.phases }}</h2></div></div>
            <div class="workspace-table-wrap">
              <table><thead><tr><th>{{ messages.workspace.fields.phase }}</th><th>{{ messages.workspace.analytics.matches }}</th><th>{{ messages.workspace.analytics.wins }}</th><th>{{ messages.workspace.analytics.draws }}</th><th>{{ messages.workspace.analytics.losses }}</th><th>{{ messages.workspace.analytics.winRate }}</th></tr></thead>
                <tbody><tr v-for="entry in phasePerformance" :key="entry.phase"><td :data-label="messages.workspace.fields.phase">{{ phaseLabel(entry.phase) }}</td><td :data-label="messages.workspace.analytics.matches">{{ entry.matches }}</td><td :data-label="messages.workspace.analytics.wins">{{ entry.wins }}</td><td :data-label="messages.workspace.analytics.draws">{{ entry.draws }}</td><td :data-label="messages.workspace.analytics.losses">{{ entry.losses }}</td><td :data-label="messages.workspace.analytics.winRate">{{ rateLabel(entry.win_rate) }}</td></tr></tbody>
              </table>
              <p v-if="!phasePerformance.length" class="workspace-empty">{{ messages.workspace.noPerformance }}</p>
            </div>
          </section>

          <section class="workspace-panel analytics-table-panel">
            <div class="workspace-panel-heading"><div><p class="workspace-eyebrow">{{ messages.workspace.analytics.scopes }}</p><h2>{{ messages.workspace.analytics.scopes }}</h2></div></div>
            <div class="workspace-table-wrap">
              <table><thead><tr><th>{{ messages.workspace.fields.scope }}</th><th>{{ messages.workspace.analytics.matches }}</th><th>{{ messages.workspace.analytics.wins }}</th><th>{{ messages.workspace.analytics.draws }}</th><th>{{ messages.workspace.analytics.losses }}</th><th>{{ messages.workspace.analytics.winRate }}</th></tr></thead>
                <tbody><tr v-for="entry in scopePerformance" :key="entry.scope"><td :data-label="messages.workspace.fields.scope">{{ scopeLabel(entry.scope) }}</td><td :data-label="messages.workspace.analytics.matches">{{ entry.matches }}</td><td :data-label="messages.workspace.analytics.wins">{{ entry.wins }}</td><td :data-label="messages.workspace.analytics.draws">{{ entry.draws }}</td><td :data-label="messages.workspace.analytics.losses">{{ entry.losses }}</td><td :data-label="messages.workspace.analytics.winRate">{{ rateLabel(entry.win_rate) }}</td></tr></tbody>
              </table>
              <p v-if="!scopePerformance.length" class="workspace-empty">{{ messages.workspace.noPerformance }}</p>
            </div>
          </section>
        </div>
      </template>
    </section>
  </main>
</template>
