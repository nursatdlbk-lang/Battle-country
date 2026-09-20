// @ts-nocheck -- Vitest supplies Node types at runtime; the browser application does not import this file.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BASIC_ATTACK_TEMPLATES, COUNTRIES, ULTIMATE_TEMPLATES } from '../data/countries';

describe('country asset catalogue', () => {
  it('registers every declared normal and ultimate template', () => {
    expect(new Set(COUNTRIES.map((country) => country.basicAttackTemplate))).toEqual(new Set(BASIC_ATTACK_TEMPLATES));
    expect(new Set(COUNTRIES.map((country) => country.ultimateTemplate))).toEqual(new Set(ULTIMATE_TEMPLATES));
  });

  it('contains 96 decodable local assets', () => {
    for (const country of COUNTRIES) {
      const directory = join(process.cwd(), 'public', 'assets', 'countries', country.id);
      const svg = readFileSync(join(directory, 'flag.svg'));
      expect(svg.toString('utf8')).toMatch(/<svg[\s>]/);
      for (const filename of ['weapon.png', 'ultimate.png']) {
        const png = readFileSync(join(directory, filename));
        expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        expect(png.readUInt32BE(16)).toBeGreaterThan(0);
        expect(png.readUInt32BE(20)).toBeGreaterThan(0);
        expect(png[25]).toBe(6); // RGBA colour type with alpha channel
      }
    }
  });
});
