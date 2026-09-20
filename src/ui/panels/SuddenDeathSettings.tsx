import React from 'react';
import { useStore } from '../store';

const styles = {
  headerRow: { display: 'grid', gridTemplateColumns: '100px 120px 120px 80px', gap: '10px', marginBottom: '10px', fontWeight: 'bold' },
  row: { display: 'grid', gridTemplateColumns: '100px 120px 120px 80px', gap: '10px', marginBottom: '10px' },
  input: { width: '100%', padding: '8px', backgroundColor: '#16213e', border: '1px solid #0f3460', color: '#eaeaea', borderRadius: '4px', boxSizing: 'border-box' as const },
  button: { padding: '8px', backgroundColor: '#e94560', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  removeBtn: { padding: '8px', backgroundColor: '#4a1520', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};

export function SuddenDeathSettings() {
  const { suddenDeath, updateSuddenDeath } = useStore();
  const { thresholds } = suddenDeath;

  const handleUpdate = (index: number, field: string, value: number) => {
    const newThresh = [...thresholds];
    newThresh[index] = { ...newThresh[index], [field]: value };
    updateSuddenDeath(newThresh.sort((a, b) => a.time - b.time));
  };

  const addThreshold = () => {
    const lastTime = thresholds.length > 0 ? thresholds[thresholds.length - 1].time : 0;
    updateSuddenDeath([...thresholds, { time: lastTime + 15, speedMultiplier: 1.0, damageMultiplier: 1.0 }]);
  };

  const removeThreshold = (index: number) => {
    const newThresh = [...thresholds];
    newThresh.splice(index, 1);
    updateSuddenDeath(newThresh);
  };

  return (
    <div>
      <div style={styles.headerRow}>
        <div>Время (с)</div>
        <div>Множитель скорости</div>
        <div>Множитель урона</div>
        <div></div>
      </div>
      
      {thresholds.map((t, i) => (
        <div key={i} style={styles.row}>
          <input style={styles.input} type="number" value={t.time} onChange={e => handleUpdate(i, 'time', Number(e.target.value))} />
          <input style={styles.input} type="number" step="0.1" value={t.speedMultiplier} onChange={e => handleUpdate(i, 'speedMultiplier', Number(e.target.value))} />
          <input style={styles.input} type="number" step="0.1" value={t.damageMultiplier} onChange={e => handleUpdate(i, 'damageMultiplier', Number(e.target.value))} />
          <button style={styles.removeBtn} onClick={() => removeThreshold(i)}>Удалить</button>
        </div>
      ))}
      
      <button style={{ ...styles.button, marginTop: '10px' }} onClick={addThreshold}>+ Добавить порог</button>
    </div>
  );
}
