import React, { useEffect, useRef, useState } from 'react';
import { getArenaDimensions, getArenaResizeLimits, useStore } from '../store';

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 };
const label: React.CSSProperties = { width: 185, fontWeight: 600 };
const input: React.CSSProperties = { width: 220, maxWidth: '100%', padding: 8, backgroundColor: '#16213e', border: '1px solid #0f3460', color: '#eaeaea', borderRadius: 4 };

export function GeneralSettings() {
  const store = useStore();
  const dimensions = getArenaDimensions(store);
  const limits = getArenaResizeLimits(store);
  const [width, setWidth] = useState(String(dimensions.width));
  const [height, setHeight] = useState(String(dimensions.height));
  const draftsRef = useRef({ width: String(dimensions.width), height: String(dimensions.height) });
  useEffect(() => {
    setWidth(String(dimensions.width));
    setHeight(String(dimensions.height));
    draftsRef.current = { width: String(dimensions.width), height: String(dimensions.height) };
  }, [dimensions.width, dimensions.height]);
  const applyDimensions = (event?: React.SyntheticEvent) => {
    event?.preventDefault();
    store.setCustomArenaDimensions(Number(draftsRef.current.width), Number(draftsRef.current.height));
    const applied = getArenaDimensions(useStore.getState());
    setWidth(String(applied.width));
    setHeight(String(applied.height));
    draftsRef.current = { width: String(applied.width), height: String(applied.height) };
  };
  const updateRange = (dimension: 'width' | 'height', value: string) => {
    draftsRef.current = { ...draftsRef.current, [dimension]: value };
    if (dimension === 'width') setWidth(value);
    else setHeight(value);
  };
  const commitRange = () => applyDimensions();
  return (
    <div>
      <div style={row}>
        <label htmlFor="arena-size" style={label}>Размер поля</label>
        <select id="arena-size" style={input} value={store.arenaSize} onChange={e => store.setArenaSize(e.target.value as typeof store.arenaSize)}>
          <option value="small">Маленькое</option>
          <option value="medium">Среднее</option>
          <option value="large">Большое</option>
          <option value="square">Квадрат · 720 × 720</option>
          <option value="custom">Свой размер</option>
        </select>
        <span>{dimensions.width} × {dimensions.height} пикселей</span>
      </div>
      <form onSubmit={applyDimensions} style={row}>
        <label htmlFor="physical-arena-width-range" style={label}>Ширина физического поля</label>
        <input
          id="physical-arena-width-range"
          type="range"
          min={limits.minWidth}
          max={limits.maxDimension}
          step="2"
          value={width}
          onInput={e => updateRange('width', e.currentTarget.value)}
          onPointerUp={commitRange}
          onBlur={commitRange}
          onKeyUp={event => {
            if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') commitRange();
          }}
        />
        <output>{width} пикселей</output>
      </form>
      <form onSubmit={applyDimensions} style={row}>
        <label htmlFor="physical-arena-height-range" style={label}>Высота физического поля</label>
        <input
          id="physical-arena-height-range"
          type="range"
          min={limits.minHeight}
          max={limits.maxDimension}
          step="2"
          value={height}
          onInput={e => updateRange('height', e.currentTarget.value)}
          onPointerUp={commitRange}
          onBlur={commitRange}
          onKeyUp={event => {
            if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') commitRange();
          }}
        />
        <output>{height} пикселей</output>
      </form>
      <form onSubmit={applyDimensions} style={row}>
        <label htmlFor="arena-width" style={label}>Размер числами</label>
        <input id="arena-width" style={{ ...input, width: 110 }} type="number" required min={limits.minWidth} max={limits.maxDimension} value={width} onChange={e => updateRange('width', e.target.value)} />
        <span>×</span>
        <label htmlFor="arena-height">Высота</label>
        <input id="arena-height" style={{ ...input, width: 110 }} type="number" required min={limits.minHeight} max={limits.maxDimension} value={height} onChange={e => updateRange('height', e.target.value)} />
        <button type="submit" style={{ ...input, width: 'auto', cursor: 'pointer' }}>Применить размер</button>
      </form>
      <p style={{ color: '#94a3b8', marginBottom: 14 }}>Это реальные размеры поля для боя и видео. Радиус и скорость шаров сохраняются; в меньшем поле отскоки от стен и встречи происходят чаще. Тяните за правый нижний угол или задайте размеры числами. После изменения бой начнётся заново.</p>
      {store.battleMode === 'tournament' && <p role="status" style={{ color: '#f8d36a', marginBottom: 14 }}>Плей-офф сохраняет стандартные параметры бойцов, но использует выбранный здесь физический размер поля и размер экспорта.</p>}
      {store.arenaSize !== 'custom' && store.arenaSize !== 'square' && <div style={row}>
        <label htmlFor="orientation" style={label}>Ориентация</label>
        <select id="orientation" style={input} value={store.aspectRatio} onChange={e => store.setAspectRatio(e.target.value as typeof store.aspectRatio)}>
          <option value="1920x1080">Горизонтальная · 16:9</option>
          <option value="1080x1920">Вертикальная · 9:16</option>
        </select>
      </div>}
      <div style={row}>
        <label htmlFor="fps" style={label}>Частота кадров</label>
        <select id="fps" style={input} value={store.fps} onChange={e => store.setFps(Number(e.target.value))}>
          <option value="30">30 кадров/с</option><option value="60">60 кадров/с</option>
        </select>
      </div>
      <div style={row}>
        <label htmlFor="seed" style={label}>Код боя (seed)</label>
        <input id="seed" style={input} type="number" value={store.seed} onChange={e => store.setSeed(Number(e.target.value))} />
        <button onClick={store.randomizeSeed} style={{ ...input, width: 'auto', backgroundColor: '#e94560', cursor: 'pointer' }}>Случайный код</button>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 14 }}>Код боя задаёт начальные позиции и направления движения. Размер поля от него не зависит.</p>
      <div style={row}>
        <label htmlFor="duration" style={label}>Длительность, с</label>
        <input id="duration" style={input} type="number" min="1" max="600" value={store.maxDuration} onChange={e => store.setMaxDuration(Math.max(1, Math.min(600, Number(e.target.value))))} />
      </div>
      <div style={row}>
        <label htmlFor="battle-mode" style={label}>Режим боя</label>
        <select id="battle-mode" style={input} value={store.simulationMode} onChange={e => store.setSimulationMode(e.target.value as typeof store.simulationMode)}>
          <option value="auto">Автоматический</option>
          <option value="forceA">Победа бойца A</option>
          <option value="forceB">Победа бойца B</option>
        </select>
      </div>
    </div>
  );
}
