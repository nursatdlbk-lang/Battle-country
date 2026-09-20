import React from 'react';
import { useStore, BattleStore } from '../store';

const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' },
  item: { display: 'flex', alignItems: 'center', cursor: 'pointer' },
  label: { marginLeft: '10px', fontWeight: 'bold' }
};

export function EffectsSettings() {
  const { effects, updateEffects } = useStore();

  const toggle = (key: keyof BattleStore['effects']) => {
    updateEffects({ [key]: !effects[key] });
  };

  const effectList: Array<{ key: keyof BattleStore['effects'], label: string }> = [
    { key: 'particles', label: 'Частицы' },
    { key: 'trails', label: 'Следы' },
    { key: 'glow', label: 'Свечение' },
    { key: 'hitFlash', label: 'Вспышка при попадании' },
    { key: 'cameraShake', label: 'Тряска камеры' },
    { key: 'criticalEffect', label: 'Критические эффекты' },
    { key: 'deathSlowMotion', label: 'Замедление при смерти' },
    { key: 'winnerAnimation', label: 'Анимация победителя' },
    { key: 'damageNumbers', label: 'Числа урона' }
  ];

  return (
    <div style={styles.grid}>
      {effectList.map(({ key, label }) => (
        <label key={key} style={styles.item}>
          <input
            type="checkbox"
            checked={effects[key]}
            onChange={() => toggle(key)}
            style={{ width: '18px', height: '18px', accentColor: '#e94560' }}
          />
          <span style={styles.label}>{label}</span>
        </label>
      ))}
    </div>
  );
}
