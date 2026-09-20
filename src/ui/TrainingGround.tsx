import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BattleConfig, BattleConfigSchema } from '../engine/battle-config';
import { createBattle, stepBattle } from '../engine/battle-engine';
import { BattleState } from '../engine/battle-state';
import { PixiBattleRenderer } from '../renderer/pixi-battle-renderer';
import { createBattleSurface } from '../renderer/battle-surface';
import { COUNTRIES, getCountry, runtimeAttackKind } from '../data/countries';
import { COUNTRY_ABILITY_CATALOGUE } from '../data/country-ability-catalogue';

const HISTORY_LENGTH = 35;
const TRAINEE_ID = 'trainee';
const SPARRING_ID = 'sparring';
const DUMMY_HP = 50000;

function buildTrainingConfig(traineeCountryId: string, opponentCountryId: string, seed: number): BattleConfig {
  const trainee = getCountry(traineeCountryId);
  const opponent = getCountry(opponentCountryId);
  return BattleConfigSchema.parse({
    version: 2,
    seed,
    fps: 60,
    maxDuration: 3600,
    arena: { x: 0, y: 0, width: 720, height: 720 },
    fighters: [
      {
        id: TRAINEE_ID, name: trainee?.name.ru ?? traineeCountryId, countryId: traineeCountryId,
        attackTemplate: trainee?.basicAttackTemplate,
        type: trainee ? runtimeAttackKind(trainee.basicAttackTemplate) : 'melee',
        radius: 64, mass: 1, hp: DUMMY_HP, speed: 240,
      },
      {
        id: SPARRING_ID, name: opponent?.name.ru ?? opponentCountryId, countryId: opponentCountryId,
        attackTemplate: opponent?.basicAttackTemplate,
        type: opponent ? runtimeAttackKind(opponent.basicAttackTemplate) : 'ranged',
        radius: 64, mass: 1, hp: DUMMY_HP, speed: 240,
      },
    ],
    melee: { baseDamage: 18, damageGrowthPerHit: 1.5, orbitRadius: 104, rotationSpeed: 3, weaponRadius: 26 },
    ranged: {
      baseDamage: 16, damageGrowthPerHit: 1.25, orbitRadius: 100, rotationSpeed: 2.4, weaponRadius: 24,
      cooldown: 0.8, projectileSpeed: 420, projectileRadius: 12, initialProjectileCount: 1,
      projectileGrowthPerHit: 0.25, maxProjectileCount: 4,
    },
    suddenDeath: { thresholds: [] },
    effects: { particles: true, trails: true, glow: true, hitFlash: true, cameraShake: true, criticalEffect: true, deathSlowMotion: true, winnerAnimation: true, damageNumbers: true },
    audio: { musicVolume: 0, sfxVolume: 0.45 },
    presentation: { locale: 'ru', showCountryNames: true, showUltimateNames: true },
    battleRules: {
      // A training dummy never wants the arena to shrink, speed up, or force
      // a sudden-death KO mid-demonstration — those only make sense for a
      // timed tournament match.
      accelerateAt: 1e9, accelerationMultiplier: 1, escalationAt: 1e9, shrinkPerSecond: 0,
      minimumArenaScale: 1, damageRampPerSecond: 0, healDisabledAt: 1e9, deterministicKoAt: 1e9,
      ultimateChargePerSecond: 4, ultimateDamageDealtFactor: 0.18, ultimateDamageReceivedFactor: 0.12,
      ultimateThreshold: 100, ultimateLockout: 4,
    },
  });
}

/** Force-arms the trainee's ultimate so it fires almost immediately, regardless of combat charge. */
function armUltimate(state: BattleState, fighterId: string): BattleState {
  return {
    ...state,
    fighters: state.fighters.map((fighter) => {
      if (fighter.id !== fighterId || !fighter.alive) return fighter;
      const country = getCountry(fighter.countryId);
      const required = country?.ultimateSpec.chargeRequired ?? 100;
      return { ...fighter, ultimateCharge: required, ultimateLockoutUntil: 0 };
    }),
  };
}

/** Keeps both fighters topped up so a long review session never ends in a KO. */
function keepAlive(state: BattleState): BattleState {
  return {
    ...state,
    fighters: state.fighters.map((fighter) => (
      fighter.hp < fighter.maxHp * 0.3 ? { ...fighter, hp: fighter.maxHp, alive: true } : fighter
    )),
  };
}

const cardStyle: React.CSSProperties = {
  padding: '8px 6px', borderRadius: 8, border: '1px solid #26334b', background: '#182132',
  color: '#eaeaea', cursor: 'pointer', fontSize: 11, textAlign: 'center', lineHeight: 1.3,
};

export function TrainingGround() {
  const [traineeId, setTraineeId] = useState(COUNTRIES[0].id);
  const [opponentId, setOpponentId] = useState(COUNTRIES[1].id);
  const [autoLoop, setAutoLoop] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [frame, setFrame] = useState(0);

  const surfaceHostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<PixiBattleRenderer | null>(null);
  const stateRef = useRef<BattleState | null>(null);
  const historyRef = useRef<BattleState[]>([]);
  const configRef = useRef<BattleConfig | null>(null);
  const animRef = useRef<number | null>(null);
  const seedRef = useRef(1);

  const trainee = getCountry(traineeId);
  const opponent = getCountry(opponentId);
  const catalogueEntry = useMemo(() => COUNTRY_ABILITY_CATALOGUE.find((item) => item.id === traineeId), [traineeId]);

  const resetBattle = useCallback(() => {
    seedRef.current += 1;
    const config = buildTrainingConfig(traineeId, opponentId, seedRef.current);
    configRef.current = config;
    let fresh = createBattle(config);
    fresh = armUltimate(fresh, TRAINEE_ID);
    stateRef.current = fresh;
    historyRef.current = [fresh];
    setFrame(0);
    if (rendererRef.current?.isReady) rendererRef.current.render(fresh, config, historyRef.current);
  }, [traineeId, opponentId]);

  // (Re)build the battle whenever the trainee or sparring partner changes.
  useEffect(() => { resetBattle(); }, [resetBattle]);

  // Mount the Pixi renderer once.
  useEffect(() => {
    const host = surfaceHostRef.current;
    if (!host) return;
    let cancelled = false;
    const surface = createBattleSurface(host, {
      width: '100%', height: '100%', display: 'block', aspectRatio: '1 / 1',
      borderRadius: '4px', boxShadow: '0 0 25px rgba(0, 0, 0, 0.7)',
    });
    const renderer = new PixiBattleRenderer();
    rendererRef.current = renderer;

    (async () => {
      await renderer.init(surface.canvas, 720, 720);
      if (!configRef.current) configRef.current = buildTrainingConfig(traineeId, opponentId, seedRef.current);
      await renderer.preload(configRef.current);
      if (cancelled) { renderer.destroy(); return; }
      if (stateRef.current) renderer.render(stateRef.current, configRef.current, historyRef.current);
    })();

    return () => {
      cancelled = true;
      renderer.destroy();
      surface.dispose();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live simulation loop.
  useEffect(() => {
    if (!isPlaying) return;
    let lastTime = performance.now();
    let accumulator = 0;
    const loop = (currentTime: number) => {
      const config = configRef.current;
      if (!config) { animRef.current = requestAnimationFrame(loop); return; }
      const fixedDt = 1000 / config.fps;
      accumulator += Math.min(currentTime - lastTime, 100);
      lastTime = currentTime;
      while (accumulator >= fixedDt) {
        let next = stepBattle(stateRef.current!, config);
        next = keepAlive(next);
        const trainee = next.fighters.find((fighter) => fighter.id === TRAINEE_ID);
        if (autoLoop && trainee && trainee.ultimateStatus === 'idle' && trainee.ultimateCharge < (getCountry(trainee.countryId)?.ultimateSpec.chargeRequired ?? 100)) {
          next = armUltimate(next, TRAINEE_ID);
        }
        stateRef.current = next;
        historyRef.current = [...historyRef.current, next].slice(-HISTORY_LENGTH);
        accumulator -= fixedDt;
      }
      setFrame(stateRef.current!.frame);
      if (rendererRef.current?.isReady) rendererRef.current.render(stateRef.current!, config, historyRef.current);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current !== null) cancelAnimationFrame(animRef.current); };
  }, [isPlaying, autoLoop]);

  const triggerUltimateNow = useCallback(() => {
    if (stateRef.current) stateRef.current = armUltimate(stateRef.current, TRAINEE_ID);
  }, []);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, minWidth: 0 }}>
      <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div ref={surfaceHostRef} style={{ width: '100%', aspectRatio: '1 / 1' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%', maxWidth: 520, marginTop: 14, padding: '12px 16px', background: '#16213e', border: '1px solid #0f3460', borderRadius: 8 }}>
          <button onClick={() => setIsPlaying((p) => !p)} style={{ padding: '8px 14px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
            {isPlaying ? '⏸ Пауза' : '▶ Играть'}
          </button>
          <button onClick={resetBattle} style={{ padding: '8px 14px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
            🔄 Заново
          </button>
          <button onClick={triggerUltimateNow} style={{ padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
            ⚡ Ульта сейчас
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
            <input type="checkbox" checked={autoLoop} onChange={(e) => setAutoLoop(e.target.checked)} />
            Повторять автоматически
          </label>
          <span style={{ width: '100%', fontSize: 11, color: '#5b6b85' }}>Кадр: {frame}</span>
        </div>

        {catalogueEntry && <div style={{ width: '100%', maxWidth: 520, marginTop: 12, padding: '12px 16px', background: '#182132', border: '1px solid #26334b', borderRadius: 8, fontSize: 13 }}>
          <div><b>{catalogueEntry.name.ru}</b> <span style={{ color: '#94a3b8' }}>· {catalogueEntry.name.en}</span></div>
          <div style={{ marginTop: 4, color: '#94a3b8' }}>Обычная атака: {catalogueEntry.basicAttack.ru}</div>
          <div style={{ marginTop: 4 }}><b>{catalogueEntry.ultimate.name.ru}:</b> {catalogueEntry.ultimate.effect.ru}</div>
        </div>}
      </div>

      <div style={{ flex: '1 1 320px', minWidth: 260 }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Тренируемая страна (ульта форсируется сразу)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 6, maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
          {COUNTRIES.map((country) => (
            <button key={country.id} onClick={() => setTraineeId(country.id)}
              style={{ ...cardStyle, borderColor: traineeId === country.id ? '#e94560' : '#26334b', background: traineeId === country.id ? '#2a1620' : '#182132' }}>
              {country.name.ru}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Спарринг-партнёр</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
          {COUNTRIES.filter((country) => country.id !== traineeId).map((country) => (
            <button key={country.id} onClick={() => setOpponentId(country.id)}
              style={{ ...cardStyle, borderColor: opponentId === country.id ? '#3b82f6' : '#26334b', background: opponentId === country.id ? '#122036' : '#182132' }}>
              {country.name.ru}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
