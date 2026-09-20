import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useStore, getBattleConfigFromStore, getArenaResizeLimits } from './store';
import { StatisticsOverlay, BattleStatistics } from './StatisticsOverlay';
import { PixiBattleRenderer } from '../renderer/pixi-battle-renderer';
import { AudioManager } from '../renderer/audio-manager';
import { buildBattleTimeline } from '../renderer/timeline-cache';
import { renderBattleFrame, getVideoDuration } from '../renderer/battle-renderer';
import { BattleState } from '../engine/battle-state';
import { MeleeWeaponState, getMeleeWeaponDamage } from '../engine/melee-weapon';
import { RangedWeaponState, getRangedWeaponDamage, getProjectileCount } from '../engine/ranged-weapon';
import { createBattleSurface } from '../renderer/battle-surface';
import { getArenaPreviewHeight, ResizableArena } from './ResizableArena';

const buttonStyle: React.CSSProperties = {
  padding: '10px 18px',
  backgroundColor: '#e94560',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '14px',
  transition: 'background-color 0.2s',
};

interface Props {
  onOpenRenderModal?: () => void;
  onTerminalWinner?: (winner: 'A' | 'B') => void;
}

export function BattlePreview({ onOpenRenderModal, onTerminalWinner }: Props) {
  const store = useStore();
  const {
    aspectRatio,
    isPlaying,
    setPlaying,
    randomizeSeed,
    seed,
  } = store;

  const surfaceHostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<PixiBattleRenderer | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const animFrameIdRef = useRef<number | null>(null);


  // Active battle config derived from store
  const config = useMemo(() => getBattleConfigFromStore(store), [
    store.seed,
    store.aspectRatio,
    store.arenaSize,
    store.customArena,
    store.fps,
    store.maxDuration,
    store.simulationMode,
    store.fighterA,
    store.fighterB,
    store.suddenDeath,
    store.effects,
    store.audio,
  ]);

  const { width: w, height: h } = config.arena;
  const resizeLimits = getArenaResizeLimits(store);
  const timeline = useMemo(() => buildBattleTimeline(config), [config]);
  const playbackFrameRef = useRef(0);
  const configRef = useRef(config);
  const timelineRef = useRef(timeline);
  configRef.current = config;
  timelineRef.current = timeline;
  const [renderError, setRenderError] = useState<string | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }));
  const arenaPreviewHeight = getArenaPreviewHeight(store.previewHeight, viewport.width, viewport.height);

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Battle Simulation State
  const [battleState, setBattleState] = useState<BattleState>(() => timeline.getStateAt(0));
  const stateRef = useRef<BattleState>(battleState);
  stateRef.current = battleState;

  useEffect(() => {
    if (battleState.winner === 'A' || battleState.winner === 'B') onTerminalWinner?.(battleState.winner);
  }, [battleState.winner, onTerminalWinner]);

  // Initialize AudioManager
  useEffect(() => {
    const audio = new AudioManager();
    audio.setVolumes(store.audio.musicVolume, store.audio.sfxVolume);
    if (store.audio.music) audio.setMusic(store.audio.music);
    audioManagerRef.current = audio;

    return () => {
      audio.dispose();
    };
  }, []);

  // Update audio volume when store changes
  useEffect(() => {
    audioManagerRef.current?.setVolumes(store.audio.musicVolume, store.audio.sfxVolume);
    audioManagerRef.current?.setMusic(store.audio.music);
    for (const type of ['meleeHit', 'projectileShot', 'projectileImpact', 'ko', 'winner'] as const) {
      audioManagerRef.current?.setCustomSfx(type, store.audio[type]);
    }
  }, [store.audio]);

  // Initialize Pixi Renderer
  useEffect(() => {
    const host = surfaceHostRef.current;
    if (!host) return;

    let cancelled = false;
    const surface = createBattleSurface(host, {
      width: '100%',
      height: '100%',
      display: 'block',
      aspectRatio: `${w} / ${h}`,
      objectFit: 'fill',
      borderRadius: '4px',
      boxShadow: '0 0 25px rgba(0, 0, 0, 0.7)',
    });
    const renderer = new PixiBattleRenderer();
    rendererRef.current = renderer;

    async function start() {
      await renderer.init(surface.canvas, w, h);
      await renderer.preload(configRef.current);

      if (cancelled) {
        renderer.destroy();
        return;
      }

      renderBattleFrame(renderer, timelineRef.current, playbackFrameRef.current, configRef.current);
    }

    setRenderError(null);
    start().catch((error: unknown) => {
      if (!cancelled) setRenderError(String(error));
    });

    return () => {
      cancelled = true;
      renderer.destroy();
      surface.dispose();
      if (rendererRef.current === renderer) {
        rendererRef.current = null;
      }
    };
  }, [w, h, store.fighterA.countryId, store.fighterB.countryId]);

  // Restart battle when seed or core fighter setup changes
  const handleRestart = useCallback(() => {
    const fresh = timeline.getStateAt(0);
    playbackFrameRef.current = 0;
    audioManagerRef.current?.stopMusic();
    audioManagerRef.current?.stopSfx();
    setBattleState(fresh);
    stateRef.current = fresh;
    if (rendererRef.current?.isReady) {
      renderBattleFrame(rendererRef.current, timeline, 0, config);
    }
  }, [config, timeline]);

  useEffect(() => {
    handleRestart();
  }, [handleRestart]);

  // Wall-clock time selects integer frames; every state and event comes from the shared timeline.
  useEffect(() => {
    if (!isPlaying) {
      audioManagerRef.current?.pauseMusic();
      return;
    }
    audioManagerRef.current?.playMusic();
    let lastTime = performance.now();
    const fixedDt = 1000 / config.fps;
    let accumulator = 0;
    const endFrame = getVideoDuration(timeline, config.fps) - 1;
    const loop = (currentTime: number) => {
      accumulator += Math.min(currentTime - lastTime, 100);
      lastTime = currentTime;
      let stepped = false;
      while (accumulator >= fixedDt && playbackFrameRef.current < endFrame) {
        playbackFrameRef.current++;
        for (const event of timeline.getEventsAt(playbackFrameRef.current)) {
          audioManagerRef.current?.handleEvent(event);
        }
        accumulator -= fixedDt;
        stepped = true;
      }
      if (stepped) {
        const state = timeline.getStateAt(playbackFrameRef.current);
        stateRef.current = state;
        setBattleState(state);
        if (rendererRef.current?.isReady) {
          try {
            renderBattleFrame(rendererRef.current, timeline, playbackFrameRef.current, config);
          } catch (error: unknown) {
            setRenderError(String(error));
            setPlaying(false);
            return;
          }
        }
      }
      if (playbackFrameRef.current >= endFrame) setPlaying(false);
      else animFrameIdRef.current = requestAnimationFrame(loop);
    };
    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameIdRef.current !== null) cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    };
  }, [isPlaying, config, timeline, setPlaying]);

  // Convert BattleState statistics into UI overlay stats
  const uiStats: BattleStatistics = useMemo(() => {
    const s = battleState.statistics;
    const fA = battleState.fighters.find((f) => f.id === 'A') || battleState.fighters[0];
    const fB = battleState.fighters.find((f) => f.id === 'B') || battleState.fighters[1];

    const statsA = (fA && s.fighters[fA.id]) || { hitsDone: 0, damageDone: 0 };
    const statsB = (fB && s.fighters[fB.id]) || { hitsDone: 0, damageDone: 0 };

    const dmgA = fA ? getMeleeWeaponDamage(fA.weapon as MeleeWeaponState, config.melee) : 20;
    const dmgB = fB ? getRangedWeaponDamage(fB.weapon as RangedWeaponState, config.ranged) : 15;
    const projB = fB ? getProjectileCount(fB.weapon as RangedWeaponState, config.ranged) : 1;

    let winLetter: 'A' | 'B' | null = null;
    if (battleState.winner === 'A') winLetter = 'A';
    else if (battleState.winner === 'B') winLetter = 'B';

    return {
      fighterA: {
        hp: fA ? fA.hp : 1000,
        maxHp: fA ? fA.maxHp : 1000,
        hits: statsA.hitsDone,
        currentDamage: dmgA,
        totalDamage: statsA.damageDone,
      },
      fighterB: {
        hp: fB ? fB.hp : 1000,
        maxHp: fB ? fB.maxHp : 1000,
        hits: statsB.hitsDone,
        currentDamage: dmgB,
        totalDamage: statsB.damageDone,
        projectiles: projB,
      },
      elapsedTime: battleState.time,
      winner: winLetter,
    };
  }, [battleState, config]);

  return (
    <div style={{ display: 'flex', flex: 1, flexWrap: 'wrap', alignItems: 'flex-start', alignContent: 'flex-start', gap: '20px', minWidth: 0 }}>
      <div style={{ flex: '1 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <ResizableArena
          width={w}
          height={h}
          previewHeight={arenaPreviewHeight}
          {...resizeLimits}
          onResizeStart={() => setPlaying(false)}
          onResize={store.setCustomArenaDimensions}
        >
          <div ref={surfaceHostRef} style={{ width: '100%', height: '100%' }} />
        </ResizableArena>

        {renderError && <p role="alert" style={{ color: '#ff6b6b' }}>{renderError}</p>}

        {/* Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            width: '100%',
            marginTop: '16px',
            padding: '12px 20px',
            backgroundColor: '#16213e',
            borderRadius: '8px',
            border: '1px solid #0f3460',
          }}
        >
          <button
            style={buttonStyle}
            onClick={() => setPlaying(!isPlaying)}
          >
            {isPlaying ? '⏸ Пауза' : '▶ Начать'}
          </button>
          <button
            style={{ ...buttonStyle, backgroundColor: '#0f3460' }}
            onClick={handleRestart}
          >
            🔄 Заново
          </button>
          <button
            style={{ ...buttonStyle, backgroundColor: '#0f3460' }}
            onClick={randomizeSeed}
          >
            🎲 Новый код
          </button>
          <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>
            Код боя: <b>{seed}</b> | Кадр: <b>{battleState.frame}</b>
          </span>
          <button
            style={{ ...buttonStyle, backgroundColor: '#10b981', marginLeft: 'auto' }}
            onClick={onOpenRenderModal}
          >
            🎬 Экспорт видео
          </button>
        </div>
      </div>

      <StatisticsOverlay stats={uiStats} />
    </div>
  );
}
