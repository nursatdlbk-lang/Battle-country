import React from 'react';
import { useStore } from './store';

export interface BattleStatistics {
  fighterA: { hp: number; maxHp: number; hits: number; currentDamage: number; totalDamage: number; };
  fighterB: { hp: number; maxHp: number; hits: number; currentDamage: number; totalDamage: number; projectiles: number; };
  elapsedTime: number;
  winner: 'A' | 'B' | null;
}

interface Props {
  stats: BattleStatistics;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function StatisticsOverlay({ stats }: Props) {
  const { fighterA, fighterB } = useStore();

  const renderFighterStat = (name: string, data: any, color: string, isRanged = false) => {
    const hpPercent = Math.max(0, (data.hp / data.maxHp) * 100);
    return (
      <div style={{ backgroundColor: '#1a1a2e', padding: '12px', borderRadius: '8px', border: `1px solid ${color}`, marginBottom: '10px' }}>
        <h3 style={{ margin: '0 0 8px 0', color }}>{name}</h3>
        
        <div style={{ width: '100%', height: '16px', backgroundColor: '#0f0f0f', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ width: `${hpPercent}%`, height: '100%', backgroundColor: color, transition: 'width 0.2s' }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: '14px', marginBottom: '8px' }}>{Math.ceil(data.hp)} / {data.maxHp} здоровья</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '14px' }}>
          <div>Удары: <span style={{ fontWeight: 'bold' }}>{data.hits}</span></div>
          <div>Урон за удар: <span style={{ fontWeight: 'bold' }}>{data.currentDamage.toFixed(1)}</span></div>
          <div>Всего урона: <span style={{ fontWeight: 'bold' }}>{Math.floor(data.totalDamage)}</span></div>
          {isRanged && <div>Снаряды: <span style={{ fontWeight: 'bold' }}>{data.projectiles}</span></div>}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: 'min(100%, 300px)', flex: '0 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: '#e94560' }}>
        {formatTime(stats.elapsedTime)}
      </div>

      {stats.winner && (
        <div style={{ backgroundColor: '#e94560', color: 'white', padding: '10px', textAlign: 'center', fontWeight: 'bold', borderRadius: '8px', marginBottom: '12px' }}>
          Победитель: {stats.winner === 'A' ? fighterA.name : fighterB.name}
        </div>
      )}

      {renderFighterStat(fighterA.name, stats.fighterA, '#4facf7')}
      {renderFighterStat(fighterB.name, stats.fighterB, '#f74f4f', true)}
    </div>
  );
}
