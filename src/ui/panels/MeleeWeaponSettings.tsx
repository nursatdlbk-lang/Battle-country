import React from 'react';
import { useStore } from '../store';

const styles = {
  row: { display: 'flex', alignItems: 'center', marginBottom: '12px' },
  label: { width: '180px', fontWeight: 'bold' },
  input: { flex: 1, maxWidth: '150px', padding: '8px', backgroundColor: '#16213e', border: '1px solid #0f3460', color: '#eaeaea', borderRadius: '4px' },
  preview: { width: '40px', height: '40px', objectFit: 'contain' as const, marginLeft: '10px', backgroundColor: '#0f0f0f', border: '1px solid #0f3460' }
};

export function MeleeWeaponSettings() {
  const { fighterA, updateFighterAWeapon } = useStore();
  const w = fighterA.weapon;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      updateFighterAWeapon({ sprite: URL.createObjectURL(e.target.files[0]) });
    }
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#e94560' }}>Оружие ближнего боя</h3>

      <div style={styles.row}>
        <div style={styles.label}>Спрайт оружия</div>
        <input type="file" accept="image/*" onChange={handleFileUpload} style={{ color: '#eaeaea' }} />
        {w.sprite && <img src={w.sprite} alt="Предпросмотр оружия" style={styles.preview} />}
      </div>

      <div style={styles.row}>
        <div style={styles.label}>Базовый урон</div>
        <input style={styles.input} type="number" value={w.baseDamage} onChange={e => updateFighterAWeapon({ baseDamage: Number(e.target.value) })} />
      </div>

      <div style={styles.row}>
        <div style={styles.label}>Рост урона за удар</div>
        <input style={styles.input} type="number" step="0.1" value={w.damageGrowthPerHit} onChange={e => updateFighterAWeapon({ damageGrowthPerHit: Number(e.target.value) })} />
      </div>

      <div style={styles.row}>
        <div style={styles.label}>Радиус вращения</div>
        <input style={styles.input} type="number" value={w.orbitRadius} onChange={e => updateFighterAWeapon({ orbitRadius: Number(e.target.value) })} />
      </div>

      <div style={styles.row}>
        <div style={styles.label}>Скорость вращения</div>
        <input style={styles.input} type="number" step="0.1" value={w.rotationSpeed} onChange={e => updateFighterAWeapon({ rotationSpeed: Number(e.target.value) })} />
      </div>

      <div style={styles.row}>
        <div style={styles.label}>Радиус оружия</div>
        <input style={styles.input} type="number" value={w.weaponRadius} onChange={e => updateFighterAWeapon({ weaponRadius: Number(e.target.value) })} />
      </div>
    </div>
  );
}
