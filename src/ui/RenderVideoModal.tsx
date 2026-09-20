import React, { useState, useMemo } from 'react';
import { getVideoDuration } from '../renderer/battle-renderer';
import { Player } from '@remotion/player';
import { BattleComposition } from '../remotion/BattleComposition';
import { INTRO_SECONDS, OUTRO_SECONDS } from '../remotion/BattleComposition';
import { useStore, getBattleConfigFromStore } from './store';
import { buildBattleTimeline } from '../renderer/timeline-cache';
import { FightContext } from './TournamentPanel';

interface Props {
  onClose: () => void;
  fight?: FightContext;
}

export const RenderVideoModal: React.FC<Props> = ({ onClose, fight }) => {
  const store = useStore();
  const config = useMemo(() => getBattleConfigFromStore(store), [store]);

  const { width: w, height: h } = config.arena;
  const timeline = useMemo(() => buildBattleTimeline(config), [config]);

  const durationInFrames = Math.round((INTRO_SECONDS + OUTRO_SECONDS) * config.fps) + getVideoDuration(timeline, config.fps);
  const [copied, setCopied] = useState(false);
  const [locale, setLocale] = useState<'ru' | 'en'>('ru');
  const roundCode = [32, 16, 8, 4, 2][fight?.round ?? 0] ?? 32;
  const prefix = fight?.mode === 'tournament' ? `r${roundCode}-m${String(fight.matchNumber ?? 1).padStart(2, '0')}-${fight.a.code}-vs-${fight.b.code}` : `${fight?.a.code ?? 'a'}-vs-${fight?.b.code ?? 'b'}`;
  const filename = `${prefix}-seed-${config.seed}`;
  const videoProps = { ...config, presentation: { ...(config.presentation ?? { showCountryNames: true, showUltimateNames: true }), locale }, locale, tournament: fight?.mode === 'tournament' ? { id: fight.matchId, seed: fight.seed, round: (fight.round ?? 0) + 1, matchNumber: fight.matchNumber } : undefined };
  const cliCommand = `npx remotion render BattleVideo ${filename}.mp4 --props="${filename}.json"`;

  const handleDownloadConfig = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(videoProps, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${filename}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyCli = () => {
    navigator.clipboard?.writeText(cliCommand).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '900px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          backgroundColor: '#16213e',
          borderRadius: '12px',
          border: '2px solid #0f3460',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.9)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #0f3460',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', color: '#e94560' }}>
            🎬 Экспорт и предпросмотр видео
          </h2>
          <button
            aria-label="Закрыть"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '24px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#cbd5e1' }}>
            Проверьте видео перед сохранением. Оно использует те же настройки боя, графику и звуки, что и основной предпросмотр.
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button onClick={() => setLocale('ru')} style={{ padding: '7px 12px', border: 0, borderRadius: 5, color: '#fff', background: locale === 'ru' ? '#e94560' : '#0f3460' }}>RU</button>
            <button onClick={() => setLocale('en')} style={{ padding: '7px 12px', border: 0, borderRadius: 5, color: '#fff', background: locale === 'en' ? '#e94560' : '#0f3460' }}>EN</button>
          </div>

          {/* Remotion Player Container */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: '#040711',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
            }}
          >
            <Player
              component={BattleComposition}
              inputProps={videoProps}
              durationInFrames={durationInFrames}
              compositionWidth={w}
              compositionHeight={h}
              fps={config.fps}
              style={{
                width: '100%',
                maxHeight: '420px',
                aspectRatio: `${w} / ${h}`,
              }}
              controls
              autoPlay={false}
              loop
            />
          </div>

          {/* Video Metadata Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              backgroundColor: '#1a1a2e',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px',
            }}
          >
            <div>
              <span style={{ color: '#94a3b8' }}>Разрешение:</span>
              <div style={{ fontWeight: 'bold', color: '#fff' }}>{w} × {h}</div>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Частота кадров:</span>
              <div style={{ fontWeight: 'bold', color: '#fff' }}>{config.fps} кадров/с</div>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Всего кадров:</span>
              <div style={{ fontWeight: 'bold', color: '#fff' }}>{durationInFrames}</div>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Длительность:</span>
              <div style={{ fontWeight: 'bold', color: '#fff' }}>{(durationInFrames / config.fps).toFixed(1)} с</div>
            </div>
          </div>

          {/* Export & Render Instructions */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>Команда для сохранения MP4:</h4>
            <div
              style={{
                backgroundColor: '#090d16',
                padding: '12px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#38bdf8',
                wordBreak: 'break-all',
                border: '1px solid #1e293b',
              }}
            >
              {cliCommand}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleDownloadConfig}
              style={{
                padding: '10px 18px',
                backgroundColor: '#0f3460',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              📥 Скачать настройки JSON
            </button>
            <button
              onClick={handleCopyCli}
              style={{
                padding: '10px 18px',
                backgroundColor: copied ? '#10b981' : '#e94560',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              {copied ? '✓ Команда скопирована' : '📋 Скопировать команду'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
