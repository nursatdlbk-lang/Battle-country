import React from 'react';
import { useStore, BattleStore } from '../store';

const styles = {
  row: { display: 'flex', alignItems: 'center', marginBottom: '12px' },
  label: { width: '150px', fontWeight: 'bold' },
  input: { flex: 1, maxWidth: '200px' },
  sliderRow: { display: 'flex', alignItems: 'center', marginBottom: '15px' },
  slider: { flex: 1, maxWidth: '300px', accentColor: '#e94560', marginRight: '15px' }
};

export function AudioSettings() {
  const { audio, updateAudio } = useStore();

  const handleUpload = (key: keyof BattleStore['audio']) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      updateAudio({ [key]: URL.createObjectURL(e.target.files[0]) } as any);
    }
  };

  return (
    <div>
      <div style={styles.sliderRow}>
        <div style={styles.label}>Громкость музыки</div>
        <input type="range" min="0" max="1" step="0.05" value={audio.musicVolume} onChange={e => updateAudio({ musicVolume: Number(e.target.value) })} style={styles.slider} />
        <span>{Math.round(audio.musicVolume * 100)}%</span>
      </div>

      <div style={styles.sliderRow}>
        <div style={styles.label}>Громкость эффектов</div>
        <input type="range" min="0" max="1" step="0.05" value={audio.sfxVolume} onChange={e => updateAudio({ sfxVolume: Number(e.target.value) })} style={styles.slider} />
        <span>{Math.round(audio.sfxVolume * 100)}%</span>
      </div>

      <hr style={{ borderColor: '#0f3460', margin: '20px 0' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <div style={styles.row}>
            <div style={styles.label}>Музыкальная дорожка</div>
            <input type="file" accept="audio/*" onChange={handleUpload('music')} style={{ color: '#eaeaea' }} />
          </div>
          <div style={styles.row}>
            <div style={styles.label}>Удар ближнего боя</div>
            <input type="file" accept="audio/*" onChange={handleUpload('meleeHit')} style={{ color: '#eaeaea' }} />
          </div>
          <div style={styles.row}>
            <div style={styles.label}>Нокаут</div>
            <input type="file" accept="audio/*" onChange={handleUpload('ko')} style={{ color: '#eaeaea' }} />
          </div>
        </div>
        <div>
          <div style={styles.row}>
            <div style={styles.label}>Выстрел снарядом</div>
            <input type="file" accept="audio/*" onChange={handleUpload('projectileShot')} style={{ color: '#eaeaea' }} />
          </div>
          <div style={styles.row}>
            <div style={styles.label}>Попадание снаряда</div>
            <input type="file" accept="audio/*" onChange={handleUpload('projectileImpact')} style={{ color: '#eaeaea' }} />
          </div>
          <div style={styles.row}>
            <div style={styles.label}>Победитель</div>
            <input type="file" accept="audio/*" onChange={handleUpload('winner')} style={{ color: '#eaeaea' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
