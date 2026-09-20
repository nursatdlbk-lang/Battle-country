import React from 'react';
import { useStore } from '../store';

const styles = {
  row: { display: 'flex', alignItems: 'center', marginBottom: '8px' },
  label: { width: '180px', fontWeight: 'bold', fontSize: '14px' },
  input: { flex: 1, maxWidth: '100px', padding: '6px', backgroundColor: '#16213e', border: '1px solid #0f3460', color: '#eaeaea', borderRadius: '4px' },
  preview: { width: '30px', height: '30px', objectFit: 'contain' as const, marginLeft: '10px', backgroundColor: '#0f0f0f', border: '1px solid #0f3460' }
};

export function RangedWeaponSettings() {
  const { fighterB, updateFighterBWeapon } = useStore();
  const w = fighterB.weapon;

  const handleUpload = (field: 'sprite' | 'projectileSprite') => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      updateFighterBWeapon({ [field]: URL.createObjectURL(e.target.files[0]) });
    }
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#e94560' }}>Оружие дальнего боя</h3>

      <div style={styles.row}>
        <div style={styles.label}>Спрайт оружия</div>
        <input type="file" accept="image/*" onChange={handleUpload('sprite')} style={{ color: '#eaeaea', fontSize: '12px', width: '150px' }} />
        {w.sprite && <img src={w.sprite} alt="Предпросмотр оружия" style={styles.preview} />}
      </div>

      <div style={styles.row}>
        <div style={styles.label}>Спрайт снаряда</div>
        <input type="file" accept="image/*" onChange={handleUpload('projectileSprite')} style={{ color: '#eaeaea', fontSize: '12px', width: '150px' }} />
        {w.projectileSprite && <img src={w.projectileSprite} alt="Предпросмотр снаряда" style={styles.preview} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
        <div style={styles.row}>
          <div style={styles.label}>Базовый урон</div>
          <input style={styles.input} type="number" value={w.baseDamage} onChange={e => updateFighterBWeapon({ baseDamage: Number(e.target.value) })} />
        </div>
        <div style={styles.row}>
          <div style={styles.label}>Рост урона</div>
          <input style={styles.input} type="number" step="0.1" value={w.damageGrowthPerHit} onChange={e => updateFighterBWeapon({ damageGrowthPerHit: Number(e.target.value) })} />
        </div>
        <div style={styles.row}>
          <div style={styles.label}>Перезарядка (с)</div>
          <input style={styles.input} type="number" step="0.1" value={w.cooldown} onChange={e => updateFighterBWeapon({ cooldown: Number(e.target.value) })} />
        </div>
        <div style={styles.row}>
          <div style={styles.label}>Скорость вращения</div>
          <input style={styles.input} type="number" step="0.1" value={w.rotationSpeed} onChange={e => updateFighterBWeapon({ rotationSpeed: Number(e.target.value) })} />
        </div>
        <div style={styles.row}>
          <div style={styles.label}>Скорость снаряда</div>
          <input style={styles.input} type="number" value={w.projectileSpeed} onChange={e => updateFighterBWeapon({ projectileSpeed: Number(e.target.value) })} />
        </div>
        <div style={styles.row}>
          <div style={styles.label}>Радиус снаряда</div>
          <input style={styles.input} type="number" value={w.projectileRadius} onChange={e => updateFighterBWeapon({ projectileRadius: Number(e.target.value) })} />
        </div>
        <div style={styles.row}>
          <div style={styles.label}>Начальное количество</div>
          <input style={styles.input} type="number" value={w.initialProjectileCount} onChange={e => updateFighterBWeapon({ initialProjectileCount: Number(e.target.value) })} />
        </div>
        <div style={styles.row}>
          <div style={styles.label}>Рост за удар</div>
          <input style={styles.input} type="number" step="0.1" value={w.projectileGrowthPerHit} onChange={e => updateFighterBWeapon({ projectileGrowthPerHit: Number(e.target.value) })} />
        </div>
        <div style={styles.row}>
          <div style={styles.label}>Максимум снарядов</div>
          <input style={styles.input} type="number" value={w.maxProjectileCount} onChange={e => updateFighterBWeapon({ maxProjectileCount: Number(e.target.value) })} />
        </div>
      </div>
    </div>
  );
}
