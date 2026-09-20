import type { MeleeWeaponHitboxProfile } from '../engine/melee-weapon';

/** Stable 32-country roster. Its order is part of deterministic tournament serialization. */
export const COUNTRY_IDS = [
  'kz', 'ru', 'ua', 'us', 'ca', 'mx', 'br', 'ar', 'gb', 'fr', 'de', 'it', 'es', 'gr', 'tr', 'eg',
  'ma', 'ng', 'za', 'sa', 'in', 'pk', 'cn', 'jp', 'kr', 'th', 'id', 'vn', 'mn', 'au', 'nz', 'no',
] as const;

export type CountryId = (typeof COUNTRY_IDS)[number];
export type BasicAttackTemplate = 'orbiting_blade' | 'thrust' | 'shooter' | 'returning_projectile' | 'tethered_weapon';
export type UltimateTemplate = 'wave' | 'dash' | 'zone' | 'barrage' | 'shield' | 'boost' | 'summon' | 'stealth' | 'decoy' | 'delayed_strike';
export type UltimatePattern = 'eagle_dive' | 'frost_ring' | 'sabre_dash' | 'aimed_burst' | 'aurora_guard' | 'sun_strike' | 'carnival_arc' | 'bola_charge' | 'excalibur_wave' | 'clockwork_overdrive' | 'legion_lunge' | 'armada_broadside' | 'aegis_bulwark' | 'bombard_salvo' | 'time_sands' | 'atlas_storm' | 'power_rhythm' | 'diamond_prism' | 'mirage_decoy' | 'returning_fan' | 'shaheen_dive' | 'dragon_sweep' | 'ninja_shadow' | 'hwacha_rain' | 'monsoon_cross' | 'garuda_strike' | 'magic_crossbow' | 'ghost_cavalry' | 'southern_cross' | 'aotearoa_gust' | 'fjord_charge';
export type RuntimeAttackKind = 'melee' | 'ranged';
export type ProjectileStyle = 'energy' | 'bullet' | 'arrow' | 'weapon' | 'shuriken' | 'star';
export interface UltimateSpec {
  readonly windupSeconds: number;
  readonly damage: number;
  readonly duration: number;
  readonly radius: number;
  readonly projectileCount: number;
  readonly shield: number;
  readonly healing: number;
  readonly speedMultiplier: number;
  readonly interval: number;
  readonly delay: number;
  readonly chargeRequired: number;
  readonly chargePerDamage: number;
  readonly lockoutSeconds: number;
}
export interface LocalizedName { readonly ru: string; readonly en: string; }
export interface CountryDefinition {
  readonly id: CountryId; readonly iso: string; readonly name: LocalizedName;
  readonly weapon: LocalizedName; readonly ultimate: LocalizedName;
  readonly assets: { readonly flag: string; readonly fighter: string; readonly weapon: string; readonly ultimate: string; readonly projectile: string };
  readonly colors: { readonly primary: string; readonly secondary: string; readonly accent: string };
  /** Collision profile for the country weapon art before its shared sprite rotation. */
  readonly weaponHitbox: MeleeWeaponHitboxProfile;
  readonly basicAttackTemplate: BasicAttackTemplate; readonly ultimateTemplate: UltimateTemplate;
  readonly ultimatePattern: UltimatePattern;
  readonly projectileStyle: ProjectileStyle;
  readonly weaponSpinDirection: 1 | -1;
  readonly rangedWeaponRotationOffset: number;
  readonly ultimateSpec: UltimateSpec;
  readonly stats: { readonly hp: number; readonly speed: number; readonly damageScale: number };
}

const assets = (id: CountryId, projectileStyle: ProjectileStyle) => ({
  flag: `/assets/countries/${id}/flag.svg`,
  fighter: `/assets/countries/${id}/flag.svg`,
  weapon: `/assets/countries/${id}/weapon.png`,
  ultimate: `/assets/countries/${id}/ultimate.png`,
  projectile: projectileStyle === 'weapon' ? `/assets/countries/${id}/weapon.png` : '/assets/projectiles/projectile.svg',
});
const weaponProfile = (
  gripAnchor: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
  bladeWidthFraction = 0.11,
  damageSegments = [{ start, end }],
): MeleeWeaponHitboxProfile => ({ gripAnchor, damageSegments, bladeWidthFraction, hitTolerance: 2 });

const DEFAULT_COUNTRY_WEAPON_HITBOX = weaponProfile(
  { x: -0.34, y: 0.34 }, { x: -0.12, y: 0.12 }, { x: 0.46, y: -0.46 },
);

// The generated source art is not consistently mirrored. These profiles were
// measured from each melee PNG: grip points toward the countryball and only a
// painted blade/head/point is declared as damaging (never the sprite pivot).
const COUNTRY_WEAPON_HITBOX_OVERRIDES: Partial<Record<CountryId, MeleeWeaponHitboxProfile>> = {
  kz: weaponProfile({ x: 0.36, y: -0.34 }, { x: 0.13, y: -0.12 }, { x: -0.47, y: 0.39 }),
  ru: weaponProfile({ x: -0.25, y: 0.43 }, { x: 0.03, y: -0.06 }, { x: 0.43, y: -0.43 }, 0.18),
  ua: weaponProfile({ x: -0.40, y: 0.25 }, { x: -0.10, y: 0.06 }, { x: 0.46, y: -0.45 }),
  ca: weaponProfile({ x: 0.40, y: 0.40 }, { x: 0.02, y: -0.06 }, { x: -0.42, y: -0.27 }, 0.20),
  mx: weaponProfile({ x: -0.38, y: 0.34 }, { x: -0.08, y: 0.03 }, { x: 0.42, y: -0.40 }, 0.18),
  de: weaponProfile({ x: 0.34, y: -0.34 }, { x: 0.07, y: -0.07 }, { x: -0.47, y: 0.47 }, 0.14),
  ar: weaponProfile(
    { x: 0.39, y: 0.25 }, { x: -0.26, y: -0.25 }, { x: -0.32, y: -0.25 }, 0.25,
    [
      { start: { x: -0.27, y: -0.25 }, end: { x: -0.34, y: -0.25 } },
      { start: { x: -0.26, y: 0.14 }, end: { x: -0.33, y: 0.15 } },
    ],
  ),
  fr: weaponProfile({ x: 0.38, y: -0.38 }, { x: 0.08, y: -0.08 }, { x: -0.47, y: 0.47 }, 0.08),
  it: weaponProfile({ x: 0.38, y: -0.33 }, { x: 0.10, y: -0.08 }, { x: -0.45, y: 0.46 }, 0.15),
  es: weaponProfile({ x: 0.38, y: -0.36 }, { x: 0.08, y: -0.06 }, { x: -0.46, y: 0.46 }, 0.10),
  gr: weaponProfile({ x: -0.43, y: 0.43 }, { x: 0.10, y: -0.10 }, { x: 0.48, y: -0.48 }, 0.09),
  tr: weaponProfile({ x: -0.36, y: -0.36 }, { x: -0.08, y: -0.06 }, { x: 0.45, y: 0.43 }, 0.14),
  eg: weaponProfile({ x: -0.38, y: 0.38 }, { x: -0.10, y: 0.10 }, { x: 0.45, y: -0.45 }, 0.16),
  ma: weaponProfile({ x: -0.38, y: 0.38 }, { x: -0.11, y: 0.10 }, { x: 0.47, y: -0.47 }, 0.10),
  ng: weaponProfile({ x: -0.38, y: 0.38 }, { x: -0.10, y: 0.10 }, { x: 0.47, y: -0.46 }, 0.13),
  za: weaponProfile({ x: 0.42, y: 0.40 }, { x: 0.00, y: -0.03 }, { x: -0.47, y: -0.47 }, 0.12),
  sa: weaponProfile({ x: -0.40, y: 0.39 }, { x: -0.10, y: 0.10 }, { x: 0.47, y: -0.47 }, 0.13),
  pk: weaponProfile({ x: -0.42, y: 0.40 }, { x: -0.12, y: 0.10 }, { x: 0.48, y: -0.47 }, 0.11),
  cn: weaponProfile({ x: -0.43, y: 0.43 }, { x: 0.08, y: -0.08 }, { x: 0.45, y: -0.47 }, 0.18),
  jp: weaponProfile({ x: -0.38, y: 0.38 }, { x: -0.08, y: 0.08 }, { x: 0.47, y: -0.47 }, 0.10),
  kr: weaponProfile({ x: -0.40, y: 0.39 }, { x: -0.08, y: 0.08 }, { x: 0.47, y: -0.47 }, 0.11),
  th: weaponProfile(
    { x: 0, y: 0.38 }, { x: -0.08, y: 0.04 }, { x: -0.46, y: -0.46 }, 0.10,
    [
      { start: { x: -0.08, y: 0.04 }, end: { x: -0.46, y: -0.46 } },
      { start: { x: 0.08, y: 0.04 }, end: { x: 0.46, y: -0.46 } },
    ],
  ),
  id: weaponProfile({ x: 0.32, y: -0.30 }, { x: 0.08, y: -0.05 }, { x: -0.40, y: 0.47 }, 0.16),
  vn: weaponProfile({ x: -0.37, y: 0.40 }, { x: 0.05, y: -0.05 }, { x: 0.43, y: -0.45 }, 0.12),
  nz: weaponProfile({ x: -0.35, y: 0.37 }, { x: -0.03, y: 0.02 }, { x: 0.47, y: -0.42 }, 0.19),
  no: weaponProfile({ x: -0.40, y: 0.42 }, { x: -0.05, y: -0.08 }, { x: 0.44, y: -0.36 }, 0.25),
};

function getWeaponHitboxProfile(id: CountryId): MeleeWeaponHitboxProfile {
  return COUNTRY_WEAPON_HITBOX_OVERRIDES[id] ?? DEFAULT_COUNTRY_WEAPON_HITBOX;
}

const DEFAULT_ULTIMATE_SPECS: Readonly<Record<UltimateTemplate, UltimateSpec>> = {
  wave: { windupSeconds: 0.55, damage: 82, duration: 0, radius: 0, projectileCount: 0, shield: 0, healing: 0, speedMultiplier: 1, interval: 0, delay: 0, chargeRequired: 100, chargePerDamage: 0.22, lockoutSeconds: 4 },
  dash: { windupSeconds: 0.55, damage: 72, duration: 0.85, radius: 0, projectileCount: 0, shield: 0, healing: 0, speedMultiplier: 3, interval: 0, delay: 0, chargeRequired: 100, chargePerDamage: 0.2, lockoutSeconds: 3.5 },
  zone: { windupSeconds: 0.55, damage: 28, duration: 5, radius: 180, projectileCount: 0, shield: 0, healing: 0, speedMultiplier: 1, interval: 0, delay: 0, chargeRequired: 100, chargePerDamage: 0.18, lockoutSeconds: 5 },
  barrage: { windupSeconds: 0.55, damage: 26, duration: 0, radius: 0, projectileCount: 6, shield: 0, healing: 0, speedMultiplier: 1, interval: 0, delay: 0, chargeRequired: 100, chargePerDamage: 0.24, lockoutSeconds: 4 },
  shield: { windupSeconds: 0.55, damage: 0, duration: 1.8, radius: 0, projectileCount: 0, shield: 160, healing: 70, speedMultiplier: 1, interval: 0, delay: 0, chargeRequired: 100, chargePerDamage: 0.16, lockoutSeconds: 5.5 },
  boost: { windupSeconds: 0.55, damage: 0, duration: 2, radius: 0, projectileCount: 0, shield: 80, healing: 0, speedMultiplier: 1.6, interval: 0, delay: 0, chargeRequired: 100, chargePerDamage: 0.2, lockoutSeconds: 4.5 },
  summon: { windupSeconds: 0.55, damage: 42, duration: 5, radius: 0, projectileCount: 0, shield: 0, healing: 0, speedMultiplier: 1, interval: 1.35, delay: 0, chargeRequired: 100, chargePerDamage: 0.2, lockoutSeconds: 5 },
  stealth: { windupSeconds: 0.55, damage: 22, duration: 1.6, radius: 0, projectileCount: 8, shield: 0, healing: 0, speedMultiplier: 1, interval: 0, delay: 0, chargeRequired: 100, chargePerDamage: 0.25, lockoutSeconds: 4.2 },
  decoy: { windupSeconds: 0.55, damage: 0, duration: 2.5, radius: 0, projectileCount: 0, shield: 120, healing: 0, speedMultiplier: 1, interval: 0, delay: 0, chargeRequired: 100, chargePerDamage: 0.15, lockoutSeconds: 5 },
  delayed_strike: { windupSeconds: 0.55, damage: 104, duration: 1, radius: 160, projectileCount: 0, shield: 0, healing: 0, speedMultiplier: 1, interval: 0, delay: 0.8, chargeRequired: 100, chargePerDamage: 0.21, lockoutSeconds: 4.8 },
};

function getProjectileStyle(id: CountryId, template: BasicAttackTemplate): ProjectileStyle {
  if (template === 'returning_projectile') return 'weapon';
  if (id === 'gb' || id === 'mn') return 'arrow';
  if (id === 'us') return 'bullet';
  return 'energy';
}

/** Asymmetric axe heads lead the orbit with their sharpened edge. */
function getWeaponSpinDirection(id: CountryId): 1 | -1 {
  return id === 'ca' || id === 'no' || id === 'kz' ? -1 : 1;
}

const ULTIMATE_PATTERNS: Readonly<Record<CountryId, UltimatePattern>> = {
  kz: 'eagle_dive', ru: 'frost_ring', ua: 'sabre_dash', us: 'aimed_burst', ca: 'aurora_guard', mx: 'sun_strike', br: 'carnival_arc', ar: 'bola_charge',
  gb: 'excalibur_wave', fr: 'armada_broadside', de: 'clockwork_overdrive', it: 'legion_lunge', es: 'armada_broadside', gr: 'aegis_bulwark', tr: 'bombard_salvo', eg: 'time_sands',
  ma: 'atlas_storm', ng: 'power_rhythm', za: 'diamond_prism', sa: 'mirage_decoy', in: 'returning_fan', pk: 'shaheen_dive', cn: 'dragon_sweep', jp: 'ninja_shadow',
  kr: 'hwacha_rain', th: 'monsoon_cross', id: 'garuda_strike', vn: 'magic_crossbow', mn: 'ghost_cavalry', au: 'southern_cross', nz: 'aotearoa_gust', no: 'fjord_charge',
};

const ULTIMATE_PROFILES: Readonly<Record<CountryId, Pick<UltimateSpec, 'chargeRequired' | 'chargePerDamage' | 'lockoutSeconds'>>> = {
  kz: { chargeRequired: 92, chargePerDamage: 0.24, lockoutSeconds: 4.8 }, ru: { chargeRequired: 112, chargePerDamage: 0.18, lockoutSeconds: 5.2 }, ua: { chargeRequired: 96, chargePerDamage: 0.23, lockoutSeconds: 3.6 }, us: { chargeRequired: 108, chargePerDamage: 0.27, lockoutSeconds: 4.1 },
  ca: { chargeRequired: 118, chargePerDamage: 0.16, lockoutSeconds: 5.8 }, mx: { chargeRequired: 104, chargePerDamage: 0.21, lockoutSeconds: 4.9 }, br: { chargeRequired: 100, chargePerDamage: 0.25, lockoutSeconds: 4.2 }, ar: { chargeRequired: 94, chargePerDamage: 0.22, lockoutSeconds: 3.9 },
  gb: { chargeRequired: 106, chargePerDamage: 0.26, lockoutSeconds: 4.5 }, fr: { chargeRequired: 98, chargePerDamage: 0.24, lockoutSeconds: 3.8 }, de: { chargeRequired: 110, chargePerDamage: 0.17, lockoutSeconds: 5.1 }, it: { chargeRequired: 97, chargePerDamage: 0.23, lockoutSeconds: 3.7 },
  es: { chargeRequired: 103, chargePerDamage: 0.22, lockoutSeconds: 4.4 }, gr: { chargeRequired: 116, chargePerDamage: 0.15, lockoutSeconds: 5.6 }, tr: { chargeRequired: 109, chargePerDamage: 0.2, lockoutSeconds: 4.7 }, eg: { chargeRequired: 101, chargePerDamage: 0.19, lockoutSeconds: 4.6 },
  ma: { chargeRequired: 105, chargePerDamage: 0.25, lockoutSeconds: 4.3 }, ng: { chargeRequired: 90, chargePerDamage: 0.2, lockoutSeconds: 3.5 }, za: { chargeRequired: 114, chargePerDamage: 0.14, lockoutSeconds: 5.4 }, sa: { chargeRequired: 107, chargePerDamage: 0.18, lockoutSeconds: 4.8 },
  in: { chargeRequired: 99, chargePerDamage: 0.28, lockoutSeconds: 4.0 }, pk: { chargeRequired: 95, chargePerDamage: 0.24, lockoutSeconds: 3.8 }, cn: { chargeRequired: 111, chargePerDamage: 0.21, lockoutSeconds: 4.9 }, jp: { chargeRequired: 102, chargePerDamage: 0.27, lockoutSeconds: 4.1 },
  kr: { chargeRequired: 109, chargePerDamage: 0.23, lockoutSeconds: 4.6 }, th: { chargeRequired: 93, chargePerDamage: 0.2, lockoutSeconds: 3.9 }, id: { chargeRequired: 97, chargePerDamage: 0.26, lockoutSeconds: 3.7 }, vn: { chargeRequired: 101, chargePerDamage: 0.25, lockoutSeconds: 4.2 },
  mn: { chargeRequired: 106, chargePerDamage: 0.29, lockoutSeconds: 4.4 }, au: { chargeRequired: 115, chargePerDamage: 0.3, lockoutSeconds: 5.0 }, nz: { chargeRequired: 100, chargePerDamage: 0.19, lockoutSeconds: 4.5 }, no: { chargeRequired: 108, chargePerDamage: 0.2, lockoutSeconds: 4.7 },
};

const country = (
  id: CountryId, ru: string, en: string, weaponRu: string, weaponEn: string,
  ultimateRu: string, ultimateEn: string, primary: string, secondary: string,
  basicAttackTemplate: BasicAttackTemplate, ultimateTemplate: UltimateTemplate,
  ultimateOverrides: Partial<UltimateSpec> = {},
): CountryDefinition => {
  const projectileStyle = getProjectileStyle(id, basicAttackTemplate);
  return {
    id, iso: id.toUpperCase(), name: { ru, en }, weapon: { ru: weaponRu, en: weaponEn },
    ultimate: { ru: ultimateRu, en: ultimateEn }, assets: assets(id, projectileStyle),
    colors: { primary, secondary, accent: '#ffffff' }, weaponHitbox: getWeaponHitboxProfile(id),
    basicAttackTemplate, ultimateTemplate, ultimatePattern: ULTIMATE_PATTERNS[id], projectileStyle, weaponSpinDirection: getWeaponSpinDirection(id),
    rangedWeaponRotationOffset: id === 'us' ? 0 : Math.PI / 2,
    ultimateSpec: { ...DEFAULT_ULTIMATE_SPECS[ultimateTemplate], ...ULTIMATE_PROFILES[id], ...ultimateOverrides },
    stats: { hp: 1000, speed: 200, damageScale: 1 },
  };
};

export const COUNTRIES: readonly CountryDefinition[] = [
  country('kz', 'Казахстан', 'Kazakhstan', 'Вращающаяся степная шашка', 'Spinning Steppe Shashka', 'Степной беркут', 'Steppe Golden Eagle', '#00afca', '#f9d616', 'orbiting_blade', 'summon'),
  country('ru', 'Россия', 'Russia', 'Бердыш', 'Bardiche', 'Морозный круг', 'Frost Circle', '#d52b1e', '#0039a6', 'orbiting_blade', 'zone'),
  country('ua', 'Украина', 'Ukraine', 'Казацкая сабля', 'Cossack Sabre', 'Казацкий вихрь', 'Cossack Whirlwind', '#005bbb', '#ffd500', 'orbiting_blade', 'dash'),
  country('us', 'США', 'United States', 'Прицельный револьвер', 'Aimed Revolver', 'Залп фронтира', 'Frontier Barrage', '#3c3b6e', '#b22234', 'shooter', 'barrage', { projectileCount: 12, damage: 22 }),
  country('ca', 'Канада', 'Canada', 'Лесорубный топор', 'Lumberjack Axe', 'Северное сияние', 'Northern Lights', '#d80621', '#ffffff', 'orbiting_blade', 'shield'),
  country('mx', 'Мексика', 'Mexico', 'Макуауитль', 'Macuahuitl', 'Солнечный камень', 'Sun Stone', '#006847', '#ce1126', 'orbiting_blade', 'delayed_strike', { damage: 110, radius: 175 }),
  country('br', 'Бразилия', 'Brazil', 'Возвращающийся энергомяч', 'Returning Energy Ball', 'Карнавальный каскад', 'Carnival Cascade', '#009c3b', '#ffdf00', 'returning_projectile', 'barrage'),
  country('ar', 'Аргентина', 'Argentina', 'Болас', 'Bolas', 'Рывок пампасов', 'Pampas Charge', '#74acdf', '#ffffff', 'tethered_weapon', 'dash'),
  country('gb', 'Великобритания', 'United Kingdom', 'Английский длинный лук', 'English Longbow', 'Экскалибур', 'Excalibur', '#012169', '#c8102e', 'shooter', 'wave'),
  country('fr', 'Франция', 'France', 'Рапира', 'Rapier', 'Три мушкетёра', 'Three Musketeers', '#0055a4', '#ef4135', 'thrust', 'barrage', { projectileCount: 3, damage: 34 }),
  country('de', 'Германия', 'Germany', 'Цвайхендер', 'Zweihander', 'Заводной форсаж', 'Clockwork Overdrive', '#1d1d1b', '#dd0000', 'orbiting_blade', 'boost'),
  country('it', 'Италия', 'Italy', 'Римский гладиус', 'Roman Gladius', 'Легион', 'Legion', '#009246', '#ce2b37', 'thrust', 'dash', { damage: 88, duration: 0.65, speedMultiplier: 2.4 }),
  country('es', 'Испания', 'Spain', 'Толедский клинок', 'Toledo Blade', 'Залп Армады', 'Armada Barrage', '#aa151b', '#f1bf00', 'orbiting_blade', 'barrage', { projectileCount: 5, damage: 28 }),
  country('gr', 'Греция', 'Greece', 'Копьё-дори', 'Dory Spear', 'Эгида Олимпа', 'Aegis of Olympus', '#0d5eaf', '#ffffff', 'thrust', 'shield'),
  country('tr', 'Турция', 'Turkey', 'Ятаган', 'Yatagan', 'Великая бомбарда', 'Great Bombard', '#e30a17', '#ffffff', 'orbiting_blade', 'barrage', { projectileCount: 3, damage: 45 }),
  country('eg', 'Египет', 'Egypt', 'Хопеш', 'Khopesh', 'Пески времени', 'Sands of Time', '#ce1126', '#c09300', 'orbiting_blade', 'boost'),
  country('ma', 'Марокко', 'Morocco', 'Сабля нимча', 'Nimcha Sabre', 'Буря Атласа', 'Atlas Storm', '#c1272d', '#006233', 'orbiting_blade', 'barrage', { projectileCount: 4, damage: 32 }),
  country('ng', 'Нигерия', 'Nigeria', 'Меч ида', 'Ida Sword', 'Ритм силы', 'Rhythm of Power', '#008751', '#ffffff', 'orbiting_blade', 'wave'),
  country('za', 'Южная Африка', 'South Africa', 'Копьё ассегай', 'Assegai Spear', 'Алмазная призма', 'Diamond Prism', '#007a4d', '#de3831', 'thrust', 'shield'),
  country('sa', 'Саудовская Аравия', 'Saudi Arabia', 'Арабский саиф', 'Arabian Saif', 'Пустынный мираж', 'Desert Mirage', '#006c35', '#ffffff', 'orbiting_blade', 'decoy'),
  country('in', 'Индия', 'India', 'Возвращающийся чакрам', 'Returning Chakram', 'Мандала чакрамов', 'Chakram Mandala', '#ff9933', '#138808', 'returning_projectile', 'barrage', { projectileCount: 8, damage: 24 }),
  country('pk', 'Пакистан', 'Pakistan', 'Талвар', 'Talwar', 'Полёт шахина', 'Shaheen Flight', '#01411c', '#ffffff', 'thrust', 'dash'),
  country('cn', 'Китай', 'China', 'Гуаньдао', 'Guandao', 'Небесный дракон', 'Celestial Dragon', '#de2910', '#ffde00', 'orbiting_blade', 'wave', { damage: 96 }),
  country('jp', 'Япония', 'Japan', 'Вращающаяся катана', 'Spinning Katana', 'Тень ниндзя', 'Ninja Shadow', '#bc002d', '#ffffff', 'orbiting_blade', 'stealth'),
  country('kr', 'Южная Корея', 'South Korea', 'Меч хвандо', 'Hwando Sword', 'Хвача', 'Hwacha', '#cd2e3a', '#0047a0', 'orbiting_blade', 'delayed_strike', { projectileCount: 5, damage: 30, delay: 0.55 }),
  country('th', 'Таиланд', 'Thailand', 'Парные мечи дааб', 'Twin Daab Swords', 'Муссон', 'Monsoon', '#a51931', '#2d2a4a', 'orbiting_blade', 'wave', { damage: 76 }),
  country('id', 'Индонезия', 'Indonesia', 'Крис', 'Kris', 'Шторм Гаруды', 'Garuda Storm', '#ce1126', '#ffffff', 'thrust', 'dash', { damage: 80, duration: 0.7, speedMultiplier: 2.7 }),
  country('vn', 'Вьетнам', 'Vietnam', 'Бамбуковое копьё', 'Bamboo Spear', 'Волшебный арбалет', 'Magic Crossbow', '#da251d', '#ffff00', 'thrust', 'barrage', { projectileCount: 5, damage: 30 }),
  country('mn', 'Монголия', 'Mongolia', 'Составной лук', 'Composite Bow', 'Призрачная конница', 'Ghost Cavalry', '#c4272f', '#015197', 'shooter', 'barrage', { projectileCount: 7, damage: 25 }),
  country('au', 'Австралия', 'Australia', 'Возвращающийся бумеранг', 'Returning Boomerang', 'Южный Крест', 'Southern Cross', '#012169', '#ffcd00', 'returning_projectile', 'delayed_strike', { damage: 104, radius: 170 }),
  country('nz', 'Новая Зеландия', 'New Zealand', 'Клинок серебряного папоротника', 'Silver Fern Blade', 'Ветер Аотеароа', 'Wind of Aotearoa', '#00247d', '#cc142b', 'orbiting_blade', 'wave'),
  country('no', 'Норвегия', 'Norway', 'Топор викинга', 'Viking Axe', 'Корабль фьордов', 'Fjord Ship', '#ba0c2f', '#00205b', 'orbiting_blade', 'dash'),
] as const;

export const COUNTRY_BY_ID: Readonly<Record<CountryId, CountryDefinition>> = Object.freeze(Object.fromEntries(COUNTRIES.map((item) => [item.id, item])) as Record<CountryId, CountryDefinition>);
export const ULTIMATE_TEMPLATES: readonly UltimateTemplate[] = ['wave', 'dash', 'zone', 'barrage', 'shield', 'boost', 'summon', 'stealth', 'decoy', 'delayed_strike'];
export const BASIC_ATTACK_TEMPLATES: readonly BasicAttackTemplate[] = ['orbiting_blade', 'thrust', 'shooter', 'returning_projectile', 'tethered_weapon'];
export function runtimeAttackKind(template: BasicAttackTemplate): RuntimeAttackKind { return template === 'shooter' || template === 'returning_projectile' ? 'ranged' : 'melee'; }
export function getCountry(id: string | undefined): CountryDefinition | undefined { return id && Object.prototype.hasOwnProperty.call(COUNTRY_BY_ID, id) ? COUNTRY_BY_ID[id as CountryId] : undefined; }
