import { describe, expect, it } from 'vitest';
import {
  audioCueEvents,
  cueForBattleEvent,
  DEFAULT_AUDIO_ASSET_PATHS,
  musicAudioSource,
  previewAudioSource,
} from '../audio/battle-audio-cues';

describe('battle audio cues', () => {
  it('maps every audible event to one deterministic cue', () => {
    expect(cueForBattleEvent({ type: 'hit', weaponType: 'melee', frame: 4, time: 0, attackerId: 'a', targetId: 'b', damage: 2 })).toBe('meleeHit');
    expect(cueForBattleEvent({ type: 'hit', weaponType: 'projectile', frame: 5, time: 0, attackerId: 'a', targetId: 'b', damage: 2 })).toBe('projectileImpact');
    expect(cueForBattleEvent({ type: 'projectile_spawn', frame: 6, time: 0, ownerId: 'a', count: 1 })).toBe('projectileShot');
    expect(cueForBattleEvent({ type: 'winner', frame: 7, time: 0, winnerId: 'a' })).toBe('winner');
    expect(cueForBattleEvent({ type: 'ultimate_ready', fighterId: 'a', frame: 8, time: 0 })).toBe('ultimateReady');
    expect(cueForBattleEvent({ type: 'ultimate_cast', fighterId: 'a', template: 'wave', frame: 9, time: 0 })).toBe('ultimateCast');
  });

  it('does not replay projectile impact on its destroy event', () => {
    const cues = audioCueEvents([
      { type: 'hit', weaponType: 'projectile', frame: 10, time: 0, attackerId: 'a', targetId: 'b', damage: 2 },
      { type: 'projectile_destroy', frame: 10, time: 0, reason: 'hit' },
    ]);
    expect(cues.map(({ cue }) => cue)).toEqual(['projectileImpact']);
  });

  it('uses the same custom URL first and built-in preview source otherwise', () => {
    expect(previewAudioSource('ko', { ko: 'blob:custom-ko' })).toBe('blob:custom-ko');
    expect(previewAudioSource('ko')).toBe(DEFAULT_AUDIO_ASSET_PATHS.ko);
    expect(musicAudioSource({ music: 'blob:music' }, 'legacy.mp3')).toBe('blob:music');
    expect(musicAudioSource({}, 'legacy.mp3')).toBe('legacy.mp3');
  });
});
