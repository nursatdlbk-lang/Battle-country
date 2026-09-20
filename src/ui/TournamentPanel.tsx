import React, { useEffect, useMemo, useState } from 'react';
import { COUNTRIES, COUNTRY_IDS, getCountry } from '../data/countries';
import { deriveMatchSeed, seededShuffle } from '../engine/tournament';

export type BattleMode = 'tournament' | 'free';

export type CountryChoice = { code: string; name: string; flag: string };

// Kept locally so the creator remains usable while the optional data catalogue is
// being loaded by the application. Codes are stable IDs in saved tournament JSON.
const SEED_ORDER = [...COUNTRIES.map((item) => item.id)];
export const FALLBACK_COUNTRIES: CountryChoice[] = SEED_ORDER.map((id) => {
  const definition = getCountry(id)!;
  return { code: definition.id, name: definition.name.ru, flag: definition.assets.flag };
});

type BracketMatch = { id: string; round: number; index: number; a?: string; b?: string; winner?: string };
export type TournamentState = { version: 2; seed: number; participants: string[]; matches: BracketMatch[]; currentMatchId: string | null };
export type FightContext = { mode: BattleMode; matchId?: string; round?: number; matchNumber?: number; seed?: number; a: CountryChoice; b: CountryChoice };

const STORAGE_KEY = 'battle-video-generator:tournament:v1';
const ARCHIVE_STORAGE_KEY = 'battle-video-generator:tournament:archive:v1';
const roundLabel = (round: number) => ['1/16 финала', '1/8 финала', '1/4 финала', 'Полуфинал', 'Финал'][round] ?? `Раунд ${round + 1}`;
const country = (code?: string) => FALLBACK_COUNTRIES.find((item) => item.code === code);

const createSeededTournament = (seed = 42): TournamentState => {
  const shuffled = seededShuffle([...COUNTRY_IDS], seed);
  const matches: BracketMatch[] = [];
  for (let round = 0, count = 16; round < 5; round++, count /= 2) {
    for (let index = 0; index < count; index++) {
      matches.push({ id: `r${[32, 16, 8, 4, 2][round]}-m${String(index + 1).padStart(2, '0')}`, round, index,
        ...(round === 0 ? { a: shuffled[index * 2], b: shuffled[index * 2 + 1] } : {}),
      });
    }
  }
  return { version: 2, seed, participants: shuffled, matches, currentMatchId: matches[0].id };
};

const hydrate = (): TournamentState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeededTournament();
    const saved = JSON.parse(raw) as TournamentState;
    return saved.version === 2 && Array.isArray(saved.matches) && saved.matches.length === 31 ? saved : createSeededTournament();
  } catch { return createSeededTournament(); }
};

export const TournamentPanel: React.FC<{ onFightChange: (fight: FightContext) => void; terminalWinner?: 'A' | 'B' | null }> = ({ onFightChange, terminalWinner }) => {
  const [mode, setMode] = useState<BattleMode>('tournament');
  const [tournament, setTournament] = useState<TournamentState>(hydrate);
  const [freeA, setFreeA] = useState('kz');
  const [freeB, setFreeB] = useState('jp');
  const [seedInput, setSeedInput] = useState(42);
  const [shuffleNotice, setShuffleNotice] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament)); }, [tournament]);
  const active = useMemo(() => tournament.matches.find((match) => match.id === tournament.currentMatchId), [tournament]);
  const activeFight = active && country(active.a) && country(active.b)
    ? { mode: 'tournament' as const, matchId: active.id, round: active.round, matchNumber: active.index + 1, seed: deriveMatchSeed(tournament.seed, active.id), a: country(active.a)!, b: country(active.b)! }
    : undefined;
  const freeFight = { mode: 'free' as const, a: country(freeA)!, b: country(freeB)! };

  useEffect(() => { onFightChange(mode === 'tournament' && activeFight ? activeFight : freeFight); }, [mode, activeFight?.matchId, activeFight?.seed, freeA, freeB]); // eslint-disable-line react-hooks/exhaustive-deps

  const setWinner = (winnerSide: 'A' | 'B') => {
    if (!active || !active.a || !active.b || active.winner) return;
    const winner = winnerSide === 'A' ? active.a : active.b;
    setTournament((previous) => {
      const matches = previous.matches.map((match) => ({ ...match }));
      const match = matches.find((item) => item.id === active.id)!;
      match.winner = winner;
      const next = matches.find((item) => item.round === match.round + 1 && item.index === Math.floor(match.index / 2));
      if (next) (match.index % 2 === 0 ? next.a = winner : next.b = winner);
      return { ...previous, matches };
    });
  };
  useEffect(() => {
    if (mode === 'tournament' && terminalWinner) setWinner(terminalWinner);
  }, [terminalWinner, mode, active?.id]); // A completed match is intentionally not advanced here.
  const nextMatch = () => {
    const next = tournament.matches.find((match) => !match.winner && match.a && match.b);
    if (next) setTournament((previous) => ({ ...previous, currentMatchId: next.id }));
  };
  const undo = () => setTournament((previous) => {
    const completed = previous.matches.filter((match) => match.winner);
    const last = completed[completed.length - 1];
    if (!last) return previous;
    const matches = previous.matches.map((match) => ({ ...match }));
    const reverted = matches.find((match) => match.id === last.id)!;
    reverted.winner = undefined;
    const downstream = matches.find((match) => match.round === reverted.round + 1 && match.index === Math.floor(reverted.index / 2));
    if (downstream) {
      if (reverted.index % 2 === 0) downstream.a = undefined; else downstream.b = undefined;
      downstream.winner = undefined;
    }
    return { ...previous, matches, currentMatchId: reverted.id };
  });
  const download = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(tournament, null, 2)], { type: 'application/json' }));
    link.download = 'battle-tournament.json'; link.click(); URL.revokeObjectURL(link.href);
  };
  const importJson = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)) as TournamentState; if (parsed.version === 2 && parsed.matches?.length === 31) setTournament(parsed); } catch { /* invalid file is ignored */ } };
    reader.readAsText(file);
  };
  const startFreshTournament = (seed: number, action: 'shuffle' | 'new') => {
    const completedMatches = tournament.matches.filter((match) => match.winner).length;
    if (completedMatches) {
      try {
        const archive = JSON.parse(localStorage.getItem(ARCHIVE_STORAGE_KEY) ?? '[]') as TournamentState[];
        localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify([...archive, tournament]));
      } catch {
        localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify([tournament]));
      }
    }
    setSeedInput(seed);
    setTournament(createSeededTournament(seed));
    setShuffleNotice(completedMatches
      ? `Новая сетка создана (seed ${seed}). ${completedMatches} завершённых матчей сохранены в локальном архиве.`
      : action === 'shuffle' ? `Страны перемешаны по новому сохранённому seed ${seed}.` : `Новая сетка создана по сохранённому seed ${seed}.`);
  };
  const shuffleBracket = () => {
    const candidate = Math.floor(Math.random() * 0x100000000) >>> 0;
    const seed = candidate === tournament.seed ? (candidate + 1) >>> 0 : candidate;
    startFreshTournament(seed, 'shuffle');
  };

  const countryText = (item: CountryChoice) => <><img src={item.flag} alt="" style={{ width: 15, verticalAlign: 'middle', marginRight: 4 }} />{item.name}</>;
  const select = (value: string, setValue: (code: string) => void, label: string) => <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#cbd5e1' }}>{label}<select value={value} onChange={(event) => setValue(event.target.value)} style={selectStyle}>{FALLBACK_COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>;
  return <section style={{ background: '#121826', border: '1px solid #26334b', borderRadius: 8, padding: 14, color: '#eaeaea' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 6 }}>{(['tournament', 'free'] as const).map((item) => <button key={item} onClick={() => setMode(item)} style={{ ...buttonStyle, background: mode === item ? '#e94560' : '#26334b' }}>{item === 'tournament' ? 'Плей-офф' : 'Свободный бой'}</button>)}</div>
      {mode === 'tournament' && <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><label style={{ fontSize: 11, color: '#94a3b8' }}>Seed <input aria-label="Seed турнира" type="number" value={seedInput} onChange={(e) => setSeedInput(Number(e.target.value) || 0)} style={{ ...selectStyle, minWidth: 90, width: 90 }} /></label><button onClick={() => startFreshTournament(seedInput, 'new')} title="Создаёт новую сетку; записанные результаты будут сохранены в локальном архиве." style={buttonStyle}>Новый турнир</button><button type="button" onClick={shuffleBracket} title="Создаёт новую сетку с новым seed; записанные результаты будут сохранены в локальном архиве." style={{ ...buttonStyle, background: '#8b5cf6' }}>⇄ Перемешать 32 страны</button><button onClick={undo} style={buttonStyle}>↶ Отменить последний</button><button onClick={download} style={buttonStyle}>⇩ JSON</button><label style={{ ...buttonStyle, cursor: 'pointer' }}>⇧ Импорт<input hidden type="file" accept="application/json" onChange={(e) => importJson(e.target.files?.[0])} /></label></div>}
    </div>
    {mode === 'free' ? <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>{select(freeA, setFreeA, 'Страна A')}{select(freeB, setFreeB, 'Страна B')}</div> : <>
      {activeFight ? <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><strong>{roundLabel(activeFight.round!)} · матч {activeFight.matchNumber} · seed {activeFight.seed}</strong><span style={{ fontSize: 16 }}>{countryText(activeFight.a)} <b style={{ color: '#e94560' }}>VS</b> {countryText(activeFight.b)}</span>{active?.winner && <><span style={{ color: '#34d399' }}>Победитель записан — текущий матч сохранён на экране.</span><button onClick={nextMatch} style={{ ...buttonStyle, background: '#10b981' }}>Следующий матч →</button></>}</div> : <p style={{ margin: '12px 0 0', color: '#94a3b8' }}>Турнир завершён или следующий матч ожидает результатов.</p>}
      <div style={{ marginTop: 10, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>{[0, 1, 2, 3, 4].map((round) => <div key={round} style={{ minWidth: 126 }}><small style={{ color: '#94a3b8' }}>{roundLabel(round)}</small>{tournament.matches.filter((match) => match.round === round).map((match) => <div key={match.id} style={{ marginTop: 5, padding: 5, borderRadius: 4, background: match.id === active?.id ? '#273553' : '#182132', fontSize: 11 }}>{country(match.a)?.name ?? '—'} vs {country(match.b)?.name ?? '—'} {match.winner && <span style={{ color: '#34d399' }}>✓</span>}</div>)}</div>)}</div>
      {shuffleNotice && <p role="status" style={{ margin: '8px 0 0', color: '#c4b5fd', fontSize: 12 }}>{shuffleNotice}</p>}
    </>}
    <div aria-live="polite" style={{ display: 'none' }}>{active?.winner}</div>
  </section>;
};

const buttonStyle: React.CSSProperties = { border: 0, borderRadius: 5, padding: '7px 10px', background: '#26334b', color: '#fff', fontWeight: 700, fontSize: 12 };
const selectStyle: React.CSSProperties = { minWidth: 180, padding: 7, color: '#fff', background: '#182132', border: '1px solid #34445e', borderRadius: 4 };
