// @ts-nocheck -- intentionally executed only by `npm run balance`.
import { describe, expect, it } from 'vitest';
import { COUNTRIES, runtimeAttackKind } from '../data/countries';
import { BattleConfigSchema } from '../engine/battle-config';
import { simulateBattle } from '../engine/battle-engine';
import { deriveMatchSeed } from '../engine/tournament';

const runningBalance = process.env.npm_lifecycle_event === 'balance';
const seedsPerSlot = Number(process.env.BALANCE_SEEDS || 200);

describe.skipIf(!runningBalance)('full country balance audit', () => {
  it(`runs ${seedsPerSlot} seeds for all 496 pairs in both slots`, () => {
    const wins = Object.fromEntries(COUNTRIES.map((country) => [country.id, 0]));
    const games = Object.fromEntries(COUNTRIES.map((country) => [country.id, 0]));
    let slotAWins = 0; let total = 0;
    for (let left = 0; left < COUNTRIES.length; left++) for (let right = left + 1; right < COUNTRIES.length; right++) {
      let firstWins = 0; const pairGames = seedsPerSlot * 2;
      for (let swap = 0; swap < 2; swap++) for (let seedIndex = 0; seedIndex < seedsPerSlot; seedIndex++) {
        const a = COUNTRIES[swap ? right : left]; const b = COUNTRIES[swap ? left : right];
        const seed = deriveMatchSeed(seedIndex, `${a.id}-vs-${b.id}`);
        const config = BattleConfigSchema.parse({
          version: 2, seed, fps: 60, maxDuration: 120, arena: { x: 0, y: 0, width: 1080, height: 1920 },
          fighters: [
            { id: 'A', name: a.name.en, countryId: a.id, attackTemplate: a.basicAttackTemplate, radius: 64, mass: 1, hp: 1000, speed: 240, type: runtimeAttackKind(a.basicAttackTemplate) },
            { id: 'B', name: b.name.en, countryId: b.id, attackTemplate: b.basicAttackTemplate, radius: 64, mass: 1, hp: 1000, speed: 240, type: runtimeAttackKind(b.basicAttackTemplate) },
          ],
          melee: { baseDamage: 18, damageGrowthPerHit: 1.5, orbitRadius: 104, rotationSpeed: 3, weaponRadius: 26 },
          ranged: { baseDamage: 16, damageGrowthPerHit: 1.25, orbitRadius: 100, rotationSpeed: 2.4, weaponRadius: 24, cooldown: 0.8, projectileSpeed: 420, projectileRadius: 12, initialProjectileCount: 1, projectileGrowthPerHit: 0.25, maxProjectileCount: 4 },
          suddenDeath: { thresholds: [] }, effects: {}, audio: {}, simulationMode: 'auto',
        });
        const result = simulateBattle(config, config.fps * config.maxDuration);
        const winner = result.winner === 'A' ? a.id : b.id;
        wins[winner]++; games[a.id]++; games[b.id]++; total++;
        if (result.winner === 'A') slotAWins++;
        if (winner === COUNTRIES[left].id) firstWins++;
      }
      const matchupRate = (100 * firstWins) / pairGames;
      expect(matchupRate, `${COUNTRIES[left].id}-${COUNTRIES[right].id}`).toBeGreaterThanOrEqual(35);
      expect(matchupRate, `${COUNTRIES[left].id}-${COUNTRIES[right].id}`).toBeLessThanOrEqual(65);
    }
    for (const country of COUNTRIES) {
      const rate = (100 * wins[country.id]) / games[country.id];
      expect(rate, country.id).toBeGreaterThanOrEqual(47); expect(rate, country.id).toBeLessThanOrEqual(53);
    }
    expect(Math.abs((100 * slotAWins) / total - 50)).toBeLessThanOrEqual(1);
  }, 43_200_000);
});
