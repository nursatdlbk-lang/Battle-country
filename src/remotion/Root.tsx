import React from 'react';
import { getVideoDuration } from '../renderer/battle-renderer';
import { Composition } from 'remotion';
import { BattleComposition } from './BattleComposition';
import { INTRO_SECONDS, OUTRO_SECONDS } from './BattleComposition';
import { BattleConfigSchema, BattleConfig } from '../engine/battle-config';
import { buildBattleTimeline } from '../renderer/timeline-cache';

const defaultBattleConfig: BattleConfig = {
  version: 2,
  seed: 42,
  fps: 60,
  maxDuration: 120,
  simulationMode: 'auto',
  arena: { x: 0, y: 0, width: 1080, height: 1920 },
  fighters: [
    { id: 'A', name: 'Казахстан', countryId: 'kz', radius: 56, mass: 1, hp: 1000, speed: 200, type: 'melee' },
    { id: 'B', name: 'Япония', countryId: 'jp', radius: 56, mass: 1, hp: 1000, speed: 200, type: 'melee' },
  ],
  melee: {
    baseDamage: 20,
    damageGrowthPerHit: 2,
    orbitRadius: 50,
    rotationSpeed: 3,
    weaponRadius: 15,
  },
  ranged: {
    baseDamage: 15,
    damageGrowthPerHit: 1.5,
    orbitRadius: 40,
    rotationSpeed: 2,
    weaponRadius: 12,
    cooldown: 0.8,
    projectileSpeed: 400,
    projectileRadius: 8,
    initialProjectileCount: 1,
    projectileGrowthPerHit: 1,
    maxProjectileCount: 4,
  },
  suddenDeath: {
    thresholds: [
      { time: 60, speedMultiplier: 1.3, damageMultiplier: 1.5 },
      { time: 75, speedMultiplier: 1.5, damageMultiplier: 2.0 },
    ],
  },
  effects: {
    particles: true,
    trails: true,
    glow: true,
    hitFlash: true,
    cameraShake: true,
    criticalEffect: true,
    deathSlowMotion: true,
    winnerAnimation: true,
    damageNumbers: true,
  },
  audio: {
    musicVolume: 0.7,
    sfxVolume: 0.7,
  },
  presentation: { locale: 'ru', showCountryNames: true, showUltimateNames: true },
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Dynamic composition adapting to arena width, height, and battle duration */}
      <Composition
        id="BattleVideo"
        component={BattleComposition}
        durationInFrames={64 * 60}
        fps={60}
        width={1080}
        height={1920}
        schema={BattleConfigSchema}
        defaultProps={defaultBattleConfig}
        calculateMetadata={async ({ props }) => {
          const w = props.arena?.width || 1080;
          const h = props.arena?.height || 1920;
          const fps = props.fps || 60;
          const timeline = buildBattleTimeline(props);
          const endFrames = getVideoDuration(timeline, fps);

          return {
            durationInFrames: Math.max(fps * 4, Math.round(INTRO_SECONDS * fps) + endFrames + Math.round(OUTRO_SECONDS * fps)),
            width: w,
            height: h,
            fps,
            defaultOutName: `battle-${props.fighters[0]?.countryId ?? 'a'}-vs-${props.fighters[1]?.countryId ?? 'b'}-seed-${props.seed}.mp4`,
          };
        }}
      />
    </>
  );
};
