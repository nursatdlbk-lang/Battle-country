import React from 'react';
import { useStore } from '../store';

const styles = {
  row: { display: 'flex', alignItems: 'center', marginBottom: '12px' },
  label: { width: '150px', fontWeight: 'bold' },
  input: { flex: 1, maxWidth: '200px', padding: '8px', backgroundColor: '#16213e', border: '1px solid #0f3460', color: '#eaeaea', borderRadius: '4px' },
  preview: { width: '50px', height: '50px', objectFit: 'contain' as const, marginLeft: '10px', backgroundColor: '#0f0f0f', border: '1px solid #0f3460' }
};

export function FighterSettings({ fighter }: { fighter: 'A' | 'B' }) {
  const store = useStore();
  const data = fighter === 'A' ? store.fighterA : store.fighterB;
  const update = fighter === 'A' ? store.updateFighterA : store.updateFighterB;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      update({ sprite: url });
    }
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#e94560' }}>Основные параметры бойца {fighter}</h3>
      
      <div style={styles.row}>
        <div style={styles.label}>Имя</div>
        <input style={styles.input} type="text" value={data.name} onChange={e => update({ name: e.target.value })} />
      </div>

      <div style={styles.row}>
        <div style={styles.label}>Спрайт</div>
        <input type="file" accept="image/*" onChange={handleFileUpload} style={{ color: '#eaeaea' }} />
        {data.sprite && <img src={data.sprite} alt="Предпросмотр спрайта" style={styles.preview} />}
      </div>

      <div style={styles.row}>
        <div style={styles.label}>Здоровье</div>
        <input style={styles.input} type="number" value={data.hp} onChange={e => update({ hp: Number(e.target.value) })} />
      </div>

      <div style={styles.row}>
        <div style={styles.label}>Радиус</div>
        <input style={styles.input} type="number" value={data.radius} onChange={e => update({ radius: Number(e.target.value) })} />
      </div>

      <div style={styles.row}>
        <div style={styles.label}>Скорость</div>
        <input style={styles.input} type="number" value={data.speed} onChange={e => update({ speed: Number(e.target.value) })} />
      </div>

      <div style={styles.row}>
        <div style={styles.label}>Масса</div>
        <input style={styles.input} type="number" step="0.1" value={data.mass} onChange={e => update({ mass: Number(e.target.value) })} />
      </div>
    </div>
  );
}
