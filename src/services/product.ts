import { ApiError } from './auth'
import type {
  Deck,
  DeckMatchupPerformance,
  DeckPerformance,
  Match,
  MatchPhase,
  MatchRecord,
  MatchResult,
  Opponent,
  OpponentPerformance,
  PhasePerformance,
  Tournament,
  TournamentScope,
  TournamentScopePerformance,
  GameName,
} from '../types/product'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

type CreateDeckInput = { name: string; game: GameName; decklist: string }
type CreateTournamentInput = {
  name: string
  date: string
  game: GameName
  scope: TournamentScope
  is_official_circuit: boolean
  deck_uuid?: string
}
type CreateMatchInput = {
  result: MatchResult
  round_number: number
  phase: MatchPhase
  opposing_deck_archetype: string
  tournament_uuid: string
  opponent_uuid: string
}
type UpdateMatchInput = CreateMatchInput
type DateRange = { from?: string; to?: string; game?: GameName }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string'
}

function isDeck(value: unknown): value is Deck {
  return isRecord(value) && hasString(value, 'uuid') && hasString(value, 'name') &&
    hasString(value, 'game') && hasString(value, 'decklist')
}

function isTournament(value: unknown): value is Tournament {
  return isRecord(value) && hasString(value, 'uuid') && hasString(value, 'name') &&
    hasString(value, 'date') && hasString(value, 'game') && hasString(value, 'scope') &&
    typeof value.is_official_circuit === 'boolean' &&
    (typeof value.deck_uuid === 'string' || value.deck_uuid === null)
}

function isOpponent(value: unknown): value is Opponent {
  return isRecord(value) && hasString(value, 'uuid') && hasString(value, 'name')
}

function isMatch(value: unknown): value is Match {
  return isRecord(value) && hasString(value, 'uuid') && hasString(value, 'result') &&
    typeof value.round_number === 'number' && hasString(value, 'phase') &&
    hasString(value, 'opposing_deck_archetype') && hasString(value, 'tournament_uuid') &&
    hasString(value, 'opponent_uuid')
}

function isMatchRecord(value: unknown): value is MatchRecord {
  return isRecord(value) && typeof value.matches === 'number' && typeof value.wins === 'number' &&
    typeof value.draws === 'number' && typeof value.losses === 'number' &&
    typeof value.win_rate === 'number'
}

function isDeckPerformance(value: unknown): value is DeckPerformance {
  return isMatchRecord(value) && hasString(value, 'deck_uuid') && hasString(value, 'deck_name')
}

function isDeckMatchupPerformance(value: unknown): value is DeckMatchupPerformance {
  return isMatchRecord(value) && hasString(value, 'deck_uuid') && hasString(value, 'deck_name') &&
    hasString(value, 'opponent_deck_archetype')
}

function isOpponentPerformance(value: unknown): value is OpponentPerformance {
  return isMatchRecord(value) && hasString(value, 'opponent_uuid') && hasString(value, 'opponent_name')
}

function isPhasePerformance(value: unknown): value is PhasePerformance {
  return isMatchRecord(value) && hasString(value, 'phase')
}

function isTournamentScopePerformance(value: unknown): value is TournamentScopePerformance {
  return isMatchRecord(value) && hasString(value, 'scope')
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    const message = (await response.text()).trim() || `Request failed (${response.status}).`
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined
  return await response.json()
}

async function getList<T>(path: string, isItem: (value: unknown) => value is T): Promise<T[]> {
  const data: unknown = await request(path)
  if (data === null) return []
  if (!Array.isArray(data) || !data.every(isItem)) {
    throw new Error('The server returned data in an unexpected format.')
  }
  return data
}

async function post<T>(path: string, body: object, isItem: (value: unknown) => value is T): Promise<T> {
  const data = await request(path, { method: 'POST', body: JSON.stringify(body) })
  if (!isItem(data)) throw new Error('The server returned data in an unexpected format.')
  return data
}

async function put<T>(path: string, body: object, isItem: (value: unknown) => value is T): Promise<T> {
  const data = await request(path, { method: 'PUT', body: JSON.stringify(body) })
  if (!isItem(data)) throw new Error('The server returned data in an unexpected format.')
  return data
}

async function remove(path: string): Promise<void> {
  await request(path, { method: 'DELETE' })
}

function dateQuery(range: DateRange): string {
  const query = new URLSearchParams()
  if (range.from) query.set('from', range.from)
  if (range.to) query.set('to', range.to)
  if (range.game) query.set('game', range.game)
  const suffix = query.toString()
  return suffix ? `?${suffix}` : ''
}

export const productApi = {
  listDecks: () => getList('/decks', isDeck),
  createDeck: (input: CreateDeckInput) => post('/decks', input, isDeck),
  updateDeck: (id: string, input: CreateDeckInput) => put(`/decks/${encodeURIComponent(id)}`, input, isDeck),
  deleteDeck: (id: string) => remove(`/decks/${encodeURIComponent(id)}`),
  listTournaments: () => getList('/tournaments', isTournament),
  createTournament: (input: CreateTournamentInput) => post('/tournaments', input, isTournament),
  updateTournament: (id: string, input: CreateTournamentInput) =>
    put(`/tournaments/${encodeURIComponent(id)}`, input, isTournament),
  deleteTournament: (id: string) => remove(`/tournaments/${encodeURIComponent(id)}`),
  listOpponents: () => getList('/opponents', isOpponent),
  createOpponent: (name: string) => post('/opponents', { name }, isOpponent),
  updateOpponent: (id: string, name: string) => put(`/opponents/${encodeURIComponent(id)}`, { name }, isOpponent),
  deleteOpponent: (id: string) => remove(`/opponents/${encodeURIComponent(id)}`),
  listTournamentMatches: (tournamentId: string) =>
    getList(`/tournaments/${encodeURIComponent(tournamentId)}/matches`, isMatch),
  createMatch: (input: CreateMatchInput) => post('/matches', input, isMatch),
  updateMatch: (id: string, input: UpdateMatchInput) => put(`/matches/${encodeURIComponent(id)}`, input, isMatch),
  deleteMatch: (id: string) => remove(`/matches/${encodeURIComponent(id)}`),
  deckPerformance: (range: DateRange) =>
    getList(`/analytics/decks${dateQuery(range)}`, isDeckPerformance),
  deckMatchupPerformance: (range: DateRange) =>
    getList(`/analytics/deck-matchups${dateQuery(range)}`, isDeckMatchupPerformance),
  opponentPerformance: (range: DateRange) =>
    getList(`/analytics/opponents${dateQuery(range)}`, isOpponentPerformance),
  phasePerformance: (range: DateRange) =>
    getList(`/analytics/phases${dateQuery(range)}`, isPhasePerformance),
  tournamentScopePerformance: (range: DateRange) =>
    getList(`/analytics/tournament-scopes${dateQuery(range)}`, isTournamentScopePerformance),
}
