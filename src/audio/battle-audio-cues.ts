import { BattleEvent } from '../engine/events';

/** Sound names are deliberately shared by the live preview and Remotion export. */
export type BattleAudioCue =
  | 'meleeHit'
  | 'projectileShot'
  | 'projectileImpact'
  | 'wallBounce'
  | 'ultimateReady'
  | 'ultimateCast'
  | 'ko'
  | 'winner';

export type AudioBattleEvent = BattleEvent;

/** Public paths work in Vite; BattleAudio converts these to Remotion staticFile URLs. */
export const DEFAULT_AUDIO_ASSET_PATHS: Readonly<Record<BattleAudioCue, string>> = {
  meleeHit: '/assets/sounds/melee_hit.wav',
  projectileShot: '/assets/sounds/projectile_shot.wav',
  projectileImpact: '/assets/sounds/projectile_impact.wav',
  wallBounce: '/assets/sounds/wall_bounce.wav',
  ultimateReady: '/assets/sounds/projectile_shot.wav',
  ultimateCast: '/assets/sounds/ko.wav',
  ko: '/assets/sounds/ko.wav',
  winner: '/assets/sounds/winner.wav',
};

export const AUDIO_CUE_DURATIONS_SECONDS: Readonly<Record<BattleAudioCue, number>> = {
  meleeHit: 0.16,
  projectileShot: 0.12,
  projectileImpact: 0.16,
  wallBounce: 0.1,
  ultimateReady: 0.12,
  ultimateCast: 0.45,
  ko: 0.45,
  winner: 0.9,
};

export interface BattleAudioUrls {
  readonly music?: string;
  readonly meleeHit?: string;
  readonly projectileShot?: string;
  readonly projectileImpact?: string;
  readonly ko?: string;
  readonly winner?: string;
  readonly ultimateReady?: string;
  readonly ultimateCast?: string;
}

/**
 * Each audible simulation moment has exactly one cue. In particular, a
 * projectile impact is represented by its hit event, never by its following
 * projectile_destroy event.
 */
export function cueForBattleEvent(event: AudioBattleEvent): BattleAudioCue | null {
  switch (event.type) {
    case 'hit':
      return event.weaponType === 'melee' ? 'meleeHit' : 'projectileImpact';
    case 'projectile_spawn':
      return 'projectileShot';
    case 'wall_bounce':
      return 'wallBounce';
    case 'kill':
      return 'ko';
    case 'winner':
      return 'winner';
    case 'ultimate_ready':
      return 'ultimateReady';
    case 'ultimate_windup':
      return 'ultimateReady';
    case 'ultimate_cast':
      return 'ultimateCast';
    case 'projectile_destroy':
    case 'damage':
    case 'sudden_death_phase':
    case 'fighter_collision':
    case 'shield_absorb':
    case 'zone_spawn':
    case 'summon_spawn':
    case 'time_limit_ko':
    case 'shield_start':
    case 'healing':
    case 'invisibility_start':
    case 'invisibility_end':
    case 'dash_start':
    case 'special_hit':
    case 'ultimate_end':
      return null;
  }
}

export function audioCueEvents(events: readonly AudioBattleEvent[]): Array<{
  readonly event: AudioBattleEvent;
  readonly cue: BattleAudioCue;
}> {
  return events.flatMap((event) => {
    const cue = cueForBattleEvent(event);
    return cue ? [{ event, cue }] : [];
  });
}

export function customAudioUrl(cue: BattleAudioCue, audio?: BattleAudioUrls): string | null {
  const url = cue === 'wallBounce' ? undefined : audio?.[cue];
  return url && url.trim() ? url : null;
}

export function previewAudioSource(cue: BattleAudioCue, audio?: BattleAudioUrls): string {
  return customAudioUrl(cue, audio) ?? DEFAULT_AUDIO_ASSET_PATHS[cue];
}

export function musicAudioSource(audio?: BattleAudioUrls, legacyMusicUrl?: string): string | null {
  const music = audio?.music;
  if (music && music.trim()) return music;
  return legacyMusicUrl && legacyMusicUrl.trim() ? legacyMusicUrl : null;
}
