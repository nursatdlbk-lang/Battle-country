import React, { useCallback, useState } from 'react';
import { GeneralSettings } from './panels/GeneralSettings';
import { FighterSettings } from './panels/FighterSettings';
import { MeleeWeaponSettings } from './panels/MeleeWeaponSettings';
import { RangedWeaponSettings } from './panels/RangedWeaponSettings';
import { SuddenDeathSettings } from './panels/SuddenDeathSettings';
import { EffectsSettings } from './panels/EffectsSettings';
import { AudioSettings } from './panels/AudioSettings';
import { CountryAbilityCatalogue } from './panels/CountryAbilityCatalogue';
import { TrainingGround } from './TrainingGround';
import { BattlePreview } from './BattlePreview';
import { RenderVideoModal } from './RenderVideoModal';
import { FightContext, TournamentPanel } from './TournamentPanel';
import { useStore } from './store';

const theme = {
  bg: '#0a0d14',
  panelBg: '#121826',
  activeTab: '#e94560',
  text: '#eaeaea',
  border: '#1f293d',
};

const tabs = [
  { id: 'General', label: 'Основное' },
  { id: 'Fighter A (Melee)', label: 'Боец A (ближний бой)' },
  { id: 'Fighter B (Ranged)', label: 'Боец B (дальний бой)' },
  { id: 'Sudden Death', label: 'Усиление боя' },
  { id: 'Effects', label: 'Эффекты' },
  { id: 'Audio', label: 'Звук' },
  { id: 'Country Catalogue', label: 'Каталог стран' },
];

export function BattleCreator() {
  const [activeTab, setActiveTab] = useState('General');
  const [page, setPage] = useState<'settings' | 'battle' | 'training'>('settings');
  const [showRenderModal, setShowRenderModal] = useState(false);
  const [fight, setFight] = useState<FightContext | null>(null);
  const [terminalWinner, setTerminalWinner] = useState<'A' | 'B' | null>(null);
  const updateFighterA = useStore((state) => state.updateFighterA);
  const updateFighterB = useStore((state) => state.updateFighterB);
  const setSeed = useStore((state) => state.setSeed);
  const setBattleMode = useStore((state) => state.setBattleMode);
  const handleFightChange = useCallback((nextFight: FightContext) => {
    setFight(nextFight);
    setTerminalWinner(null);
    setBattleMode(nextFight.mode);
    updateFighterA({ name: nextFight.a.name, countryId: nextFight.a.code });
    updateFighterB({ name: nextFight.b.name, countryId: nextFight.b.code });
    if (nextFight.seed !== undefined) setSeed(nextFight.seed);
  }, [setBattleMode, setSeed, updateFighterA, updateFighterB]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflowX: 'hidden',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          backgroundColor: '#0e1320',
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e94560 0%, #3b82f6 100%)',
            }}
          />
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px' }}>
            Country Battle <span style={{ fontSize: '12px', fontWeight: 400, color: '#94a3b8' }}>v2 · 32 страны · детерминированный плей-офф</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {page !== 'settings' && <button
            onClick={() => setPage('settings')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#26334b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Настройки
          </button>}
          {page !== 'training' && <button
            onClick={() => setPage('training')}
            style={{
              padding: '8px 16px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >🏋️ Тренировочное поле</button>}
          {page === 'battle' && <button
            onClick={() => setShowRenderModal(true)}
            style={{
              padding: '8px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >🎬 Экспорт видео</button>}
        </div>
      </div>

      {page === 'settings' && <>
      {/* Tabs bar */}
      <div role="tablist" aria-label="Настройки боя" style={{ display: 'flex', flexWrap: 'wrap', borderBottom: `2px solid ${theme.border}`, backgroundColor: theme.panelBg }}>
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              borderBottom: activeTab === tab.id ? `3px solid ${theme.activeTab}` : '3px solid transparent',
              color: activeTab === tab.id ? theme.activeTab : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings page: choose the fight and edit every configuration before opening the arena. */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '12px 24px', backgroundColor: '#0e1320', borderBottom: `1px solid ${theme.border}` }}>
          <TournamentPanel onFightChange={handleFightChange} terminalWinner={terminalWinner} />
        </div>
        {/* Settings panels drawer */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: theme.panelBg,
            borderBottom: `1px solid ${theme.border}`,
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {activeTab === 'General' && <GeneralSettings />}
          {activeTab === 'Fighter A (Melee)' && (
            <div style={{ display: 'flex', gap: '40px' }}>
              <div style={{ flex: 1 }}><FighterSettings fighter="A" /></div>
              <div style={{ flex: 1 }}><MeleeWeaponSettings /></div>
            </div>
          )}
          {activeTab === 'Fighter B (Ranged)' && (
            <div style={{ display: 'flex', gap: '40px' }}>
              <div style={{ flex: 1 }}><FighterSettings fighter="B" /></div>
              <div style={{ flex: 1 }}><RangedWeaponSettings /></div>
            </div>
          )}
          {activeTab === 'Sudden Death' && <SuddenDeathSettings />}
          {activeTab === 'Effects' && <EffectsSettings />}
          {activeTab === 'Audio' && <AudioSettings />}
          {activeTab === 'Country Catalogue' && <CountryAbilityCatalogue />}
        </div>
        <div style={{ padding: '16px 24px', backgroundColor: '#0e1320', borderTop: `1px solid ${theme.border}` }}>
          <button type="button" onClick={() => setPage('battle')} style={{ padding: '10px 18px', backgroundColor: theme.activeTab, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>
            Продолжить к бою →
          </button>
          <span style={{ marginLeft: 12, color: '#94a3b8', fontSize: 13 }}>Откроется отдельная страница предпросмотра и запуска.</span>
        </div>
      </div>
      </>}

      {page === 'battle' && <div style={{ flex: 1, display: 'flex', padding: '16px 24px', gap: '20px', minHeight: 0 }}>
        <BattlePreview onOpenRenderModal={() => setShowRenderModal(true)} onTerminalWinner={setTerminalWinner} />
      </div>}

      {page === 'training' && <div style={{ flex: 1, padding: '16px 24px', minHeight: 0 }}>
        <TrainingGround />
      </div>}

      {/* Render Video & Remotion Player Modal */}
      {showRenderModal && <RenderVideoModal onClose={() => setShowRenderModal(false)} fight={fight ?? undefined} />}
    </div>
  );
}
