import { CountryId } from '../data/countries';
import { createRng, nextInt } from './rng';

export interface TournamentMatch { readonly id: string; readonly round: number; readonly slot: number; readonly a: CountryId | null; readonly b: CountryId | null; readonly winner: CountryId | null; }
export interface TournamentState { readonly version: 1; readonly seed: number; readonly entrants: readonly CountryId[]; readonly matches: readonly TournamentMatch[]; readonly cursor: number; }
export interface TournamentSnapshot { readonly state: TournamentState; readonly history: readonly TournamentState[]; }

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items]; let rng = createRng(seed);
  for (let i = result.length - 1; i > 0; i--) { let chosen: number; [chosen, rng] = nextInt(rng, 0, i); [result[i], result[chosen]] = [result[chosen], result[i]]; }
  return result;
}

/** Stable FNV-1a derivation keeps every match independent from playback and language. */
export function deriveMatchSeed(tournamentSeed: number, matchId: string): number {
  return [...matchId].reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0, tournamentSeed >>> 0);
}

export function createTournament(entrants: readonly CountryId[], seed: number): TournamentState {
  if (entrants.length !== 32) throw new RangeError('A country tournament requires exactly 32 entrants.');
  if (new Set(entrants).size !== entrants.length) throw new RangeError('Tournament entrants must be unique.');
  const shuffled = seededShuffle(entrants, seed);
  const matches: TournamentMatch[] = [];
  let index = 0;
  for (let round = 1, count = 16; count >= 1; round++, count /= 2) for (let slot = 0; slot < count; slot++) {
    matches.push({ id: `r${round}m${slot + 1}`, round, slot, a: round === 1 ? shuffled[index++] : null, b: round === 1 ? shuffled[index++] : null, winner: null });
  }
  return { version: 1, seed, entrants: shuffled, matches, cursor: 0 };
}

export function advanceTournament(state: TournamentState, winner: CountryId): TournamentState {
  const current = state.matches[state.cursor];
  if (!current) throw new RangeError('Tournament is complete.');
  if (winner !== current.a && winner !== current.b) throw new RangeError('Winner must be one of the current match entrants.');
  const matches = state.matches.map((match, i) => i === state.cursor ? { ...match, winner } : match);
  const nextIndex = state.cursor + 1;
  const parentIndex = parentMatchIndex(current.round, current.slot);
  if (parentIndex !== null) { const parent = matches[parentIndex]; matches[parentIndex] = current.slot % 2 === 0 ? { ...parent, a: winner } : { ...parent, b: winner }; }
  return { ...state, matches, cursor: nextIndex };
}

function parentMatchIndex(round: number, slot: number): number | null {
  if (round >= 5) return null;
  const beforeCurrentRound = [0, 16, 24, 28, 30][round - 1];
  const nextRoundStart = [16, 24, 28, 30][round - 1];
  void beforeCurrentRound;
  return nextRoundStart + Math.floor(slot / 2);
}

export function snapshotTournament(state: TournamentState, history: readonly TournamentState[] = []): TournamentSnapshot { return { state, history: [...history, state] }; }
export function undoTournament(snapshot: TournamentSnapshot): TournamentSnapshot {
  if (snapshot.history.length < 2) return snapshot;
  const history = snapshot.history.slice(0, -1); return { state: history[history.length - 1], history };
}
export function serializeTournament(state: TournamentState): string { return JSON.stringify(state); }
export function deserializeTournament(serialized: string): TournamentState {
  const parsed = JSON.parse(serialized) as TournamentState;
  if (parsed.version !== 1 || !Array.isArray(parsed.matches) || parsed.matches.length !== 31) throw new TypeError('Invalid tournament serialization.');
  return parsed;
}
