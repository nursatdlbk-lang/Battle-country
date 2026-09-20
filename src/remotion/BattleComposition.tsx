import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useDelayRender, useVideoConfig } from 'remotion';
import { BattleConfig } from '../engine/battle-config';
import { buildBattleTimeline } from '../renderer/timeline-cache';
import { PixiBattleRenderer } from '../renderer/pixi-battle-renderer';
import { renderBattleFrame } from '../renderer/battle-renderer';
import { BattleAudio } from './BattleAudio';
import { createBattleSurface } from '../renderer/battle-surface';
import { getCountry } from '../data/countries';

export type BattleVideoProps = BattleConfig & { locale?: 'ru' | 'en'; tournament?: { round?: number; matchNumber?: number } };
export const INTRO_SECONDS = 1.5;
export const OUTRO_SECONDS = 2.5;

export const BattleComposition: React.FC<BattleVideoProps> = (config) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const introFrames = Math.round(INTRO_SECONDS * fps);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const surfaceHostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PixiBattleRenderer | null>(null);
  const initializationRef = useRef<Promise<void>>(Promise.resolve());
  const timeline = useMemo(() => buildBattleTimeline(config), [config]);
  const battleFrame = Math.max(0, Math.min(timeline.totalFrames - 1, frame - introFrames));
  const introOpacity = interpolate(frame, [introFrames - 10, introFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const outroStart = introFrames + timeline.totalFrames;
  const outroOpacity = interpolate(frame, [outroStart, outroStart + Math.round(fps * 0.35)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const isRu = (config.locale ?? config.presentation?.locale) !== 'en';
  const countryA = getCountry(config.fighters[0]?.countryId);
  const countryB = getCountry(config.fighters[1]?.countryId);
  const staticAsset = (path: string) => staticFile(path.replace(/^\//, ''));
  const winner = timeline.getStateAt(timeline.totalFrames - 1).winner;
  const winnerCountry = winner === 'A' ? countryA : winner === 'B' ? countryB : undefined;
  const winnerName = winner === 'A' ? config.fighters[0]?.name : winner === 'B' ? config.fighters[1]?.name : undefined;

  useLayoutEffect(() => {
    const host = surfaceHostRef.current;
    if (!host) return;
    const surface = createBattleSurface(host, { width: '100%', height: '100%' });
    const renderer = new PixiBattleRenderer(); rendererRef.current = renderer;
    initializationRef.current = renderer.init(surface.canvas, width, height).then(() => renderer.preload(config, (path) => staticFile(path.replace(/^\//, ''))));
    return () => { renderer.destroy(); surface.dispose(); if (rendererRef.current === renderer) rendererRef.current = null; };
  }, [width, height, config]);

  useLayoutEffect(() => {
    const handle = delayRender(`Pixi battle frame ${battleFrame}`); const renderer = rendererRef.current!; let cancelled = false;
    initializationRef.current.then(() => { if (cancelled) return; if (!renderer.isReady) throw new Error('Pixi renderer failed to initialize'); renderBattleFrame(renderer, timeline, battleFrame, config); continueRender(handle); }).catch((error: unknown) => { if (!cancelled) cancelRender(error); });
    return () => { cancelled = true; continueRender(handle); };
  }, [battleFrame, config, timeline, width, height, delayRender, continueRender, cancelRender]);

  const titleSize = Math.min(width, height);
  return <AbsoluteFill style={{ backgroundColor: '#090d16', overflow: 'hidden' }}>
    <div ref={surfaceHostRef} style={{ position: 'absolute', inset: 0 }} />
    <BattleAudio config={config} timeline={timeline} offsetFrames={introFrames} />
    <AbsoluteFill style={{ opacity: introOpacity, background: 'radial-gradient(circle at 50% 35%, #243b72, #090d16 66%)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: 'Arial, sans-serif', color: '#fff', padding: '8%' }}>
      <div><div style={{ color: '#8ec5ff', fontSize: titleSize * 0.055, fontWeight: 800, letterSpacing: 5 }}>COUNTRY BATTLE</div><div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 35, marginTop: 40 }}>{countryA && <Img src={staticAsset(countryA.assets.flag)} style={{ width: titleSize * 0.2, height: titleSize * 0.2, borderRadius: '50%', objectFit: 'cover', border: '8px solid white' }} />}<b style={{ color: '#e94560', fontSize: titleSize * 0.08 }}>VS</b>{countryB && <Img src={staticAsset(countryB.assets.flag)} style={{ width: titleSize * 0.2, height: titleSize * 0.2, borderRadius: '50%', objectFit: 'cover', border: '8px solid white' }} />}</div><div style={{ fontSize: titleSize * 0.09, fontWeight: 900, marginTop: 28 }}>{config.fighters[0]?.name} <span style={{ color: '#e94560' }}>VS</span> {config.fighters[1]?.name}</div><div style={{ marginTop: 22, fontSize: titleSize * 0.035, color: '#cbd5e1' }}>{config.tournament?.round !== undefined ? `${isRu ? 'Плей-офф' : 'Playoffs'} · ${isRu ? 'раунд' : 'round'} ${config.tournament.round} · ${isRu ? 'матч' : 'match'} ${config.tournament.matchNumber ?? ''}` : isRu ? 'Свободный бой' : 'Free battle'}</div></div>
    </AbsoluteFill>
    <AbsoluteFill style={{ opacity: outroOpacity, background: 'linear-gradient(180deg, rgba(9,13,22,.72), #090d16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', textAlign: 'center', color: '#fff', padding: '8%' }}>
      <div><div style={{ color: '#f8d36a', fontSize: titleSize * 0.05, fontWeight: 800, letterSpacing: 4 }}>{isRu ? 'ПОБЕДИТЕЛЬ' : 'WINNER'}</div>{winnerCountry && <Img src={staticAsset(winnerCountry.assets.flag)} style={{ width: titleSize * 0.28, height: titleSize * 0.28, borderRadius: '50%', objectFit: 'cover', border: '10px solid #f8d36a', margin: '45px auto 0' }} />}<div style={{ fontSize: titleSize * 0.13, fontWeight: 900, marginTop: 22 }}>{winnerName ?? (isRu ? 'Финальный KO' : 'Final KO')}</div>{config.tournament?.round !== undefined && <div style={{ marginTop: 30, color: '#cbd5e1', fontSize: titleSize * 0.035 }}>{isRu ? 'Победитель перенесён в следующий раунд' : 'Winner advanced to the next round'}</div>}</div>
    </AbsoluteFill>
  </AbsoluteFill>;
};
