import { describe, expect, it } from 'vitest';
import { COUNTRIES, COUNTRY_IDS } from '../data/countries';
import { COUNTRY_ABILITY_CATALOGUE } from '../data/country-ability-catalogue';

describe('country ability catalogue', () => {
  it('documents every roster country exactly once', () => {
    expect(COUNTRY_ABILITY_CATALOGUE).toHaveLength(32);
    expect(new Set(COUNTRY_ABILITY_CATALOGUE.map((item) => item.id)).size).toBe(32);
    expect(COUNTRY_ABILITY_CATALOGUE.map((item) => item.id).sort()).toEqual([...COUNTRY_IDS].sort());
  });

  it('keeps displayed country, weapon and ultimate names aligned with gameplay data', () => {
    for (const item of COUNTRY_ABILITY_CATALOGUE) {
      const definition = COUNTRIES.find((country) => country.id === item.id);
      expect(definition).toBeDefined();
      expect(item.name).toEqual(definition!.name);
      expect(item.basicAttack).toEqual(definition!.weapon);
      expect(item.ultimate.name).toEqual(definition!.ultimate);
      expect(item.ultimate.effect.ru.trim().length).toBeGreaterThan(20);
      expect(item.ultimate.effect.en.trim().length).toBeGreaterThan(20);
    }
  });

  it('gives every country explicit projectile and ultimate presentation metadata', () => {
    for (const country of COUNTRIES) {
      expect(['energy', 'bullet', 'arrow', 'weapon', 'shuriken', 'star']).toContain(country.projectileStyle);
      expect(country.ultimateSpec.windupSeconds).toBeGreaterThan(0);
      expect(Number.isFinite(country.ultimateSpec.damage)).toBe(true);
      expect(country.ultimateSpec.chargeRequired).toBeGreaterThan(0);
      expect(country.ultimateSpec.chargePerDamage).toBeGreaterThan(0);
      expect(country.ultimateSpec.lockoutSeconds).toBeGreaterThanOrEqual(0);
    }
    expect(new Set(COUNTRIES.map((country) => country.ultimatePattern)).size).toBeGreaterThanOrEqual(28);
    expect(new Set(COUNTRIES.map((country) => country.ultimateSpec.chargeRequired)).size).toBeGreaterThanOrEqual(20);
    expect(COUNTRIES.find((country) => country.id === 'kz')?.weaponSpinDirection).toBe(-1);
    expect(COUNTRIES.find((country) => country.id === 'us')?.rangedWeaponRotationOffset).toBe(0);
    expect(COUNTRIES.find((country) => country.id === 'au')).toMatchObject({
      projectileStyle: 'weapon',
      assets: { projectile: '/assets/countries/au/weapon.png' },
      ultimateTemplate: 'delayed_strike',
    });
    expect(COUNTRIES.filter((country) => country.ultimateTemplate === 'zone' || country.ultimateTemplate === 'summon')).toHaveLength(2);
  });
});
