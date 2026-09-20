// @vitest-environment jsdom
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import { COUNTRY_IDS } from '../data/countries';
import { TournamentPanel, TournamentState } from '../ui/TournamentPanel';

const STORAGE_KEY = 'battle-video-generator:tournament:v1';

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('tournament bracket controls', () => {
  it('reshuffles all 32 countries into a fresh deterministic bracket and stores its seed', async () => {
    await act(async () => root.render(React.createElement(TournamentPanel, { onFightChange: vi.fn() })));
    const before = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as TournamentState;
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const shuffle = [...host.querySelectorAll('button')].find((button) => button.textContent?.includes('Перемешать 32 страны'))!;
    await act(async () => shuffle.click());

    const after = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as TournamentState;
    expect(after.seed).toBe(0x40000000);
    expect(after.seed).not.toBe(before.seed);
    expect(after.matches).toHaveLength(31);
    expect(after.participants).toHaveLength(32);
    expect(new Set(after.participants)).toEqual(new Set(COUNTRY_IDS));
    expect(after.matches.filter((match) => match.round === 0).flatMap((match) => [match.a, match.b])).toEqual(after.participants);
    expect(after.matches.every((match) => match.winner === undefined)).toBe(true);
    expect(host.textContent).toContain('Страны перемешаны по новому сохранённому seed');
  });
});
