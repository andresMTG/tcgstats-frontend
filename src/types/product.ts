export const games = [
  'magic the gathering',
  'pokemon',
  'flesh and blood',
  'yugioh',
  'digimon',
  'one piece',
  'lorcana',
] as const

export type GameName = (typeof games)[number]
export type TournamentScope = 'LOCAL' | 'QUALIFIER' | 'MAJOR' | 'PREMIER'
export type MatchResult = 'win' | 'draw' | 'lose'
export type MatchPhase = 'SWISS' | 'TOP_8' | 'TOP_4' | 'FINALS'

export type Deck = {
  uuid: string
  name: string
  game: GameName
  decklist: string
}

export type Tournament = {
  uuid: string
  name: string
  date: string
  game: GameName
  scope: TournamentScope
  is_official_circuit: boolean
  deck_uuid: string | null
}

export type Opponent = {
  uuid: string
  name: string
}

export type Match = {
  uuid: string
  result: MatchResult
  round_number: number
  phase: MatchPhase
  opposing_deck_archetype: string
  tournament_uuid: string
  opponent_uuid: string
}

export type MatchRecord = {
  matches: number
  wins: number
  draws: number
  losses: number
  win_rate: number
}

export type DeckPerformance = MatchRecord & {
  deck_uuid: string
  deck_name: string
}

export type DeckMatchupPerformance = MatchRecord & {
  deck_uuid: string
  deck_name: string
  opponent_deck_archetype: string
}

export type OpponentPerformance = MatchRecord & {
  opponent_uuid: string
  opponent_name: string
}

export type PhasePerformance = MatchRecord & { phase: MatchPhase }
export type TournamentScopePerformance = MatchRecord & { scope: TournamentScope }

export type WorkspaceView = 'dashboard' | 'decks' | 'tournaments' | 'matches' | 'opponents' | 'analytics'
