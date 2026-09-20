import React from 'react';
import { COUNTRY_ABILITY_CATALOGUE } from '../../data/country-ability-catalogue';

export function CountryAbilityCatalogue() {
  return <section aria-label="Каталог способностей стран">
    <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>Каталог 32 стран</h2>
    <p style={{ margin: '0 0 12px', color: '#94a3b8', fontSize: 12 }}>Обычная атака и точный эффект ульты из текущих правил боя.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 8 }}>
      {COUNTRY_ABILITY_CATALOGUE.map((item) => <article key={item.id} style={{ padding: 10, background: '#182132', border: '1px solid #26334b', borderRadius: 6 }}>
        <strong>{item.name.ru} <span style={{ color: '#94a3b8', fontWeight: 400 }}>· {item.name.en}</span></strong>
        <div style={{ marginTop: 5, fontSize: 12 }}><b>Обычная атака:</b> {item.basicAttack.ru} <span style={{ color: '#94a3b8' }}>({item.basicAttack.en})</span></div>
        <div style={{ marginTop: 4, fontSize: 12 }}><b>Ульта — {item.ultimate.name.ru}:</b> {item.ultimate.effect.ru}</div>
      </article>)}
    </div>
  </section>;
}
