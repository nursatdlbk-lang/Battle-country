import { BattleState } from '../engine/battle-state';
import { BattleConfig } from '../engine/battle-config';
import { getCountry } from '../data/countries';

interface FloatingDamage {
  text: string;
  x: number;
  y: number;
  startFrame: number;
  color: string;
  emphasis?: boolean;
}

interface VisualParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  startFrame: number;
  lifeFrames: number;
  color: number;
  size: number;
}

interface HitImpact {
  targetId: string;
  x: number;
  y: number;
  startFrame: number;
  lifeFrames: number;
  color: number;
}

/** Rebuild transient effects from event-time positions, independent of render order. */
export function deriveVisualEffects(history: readonly BattleState[], frame: number, config: BattleConfig) {
  const damageNumbers: FloatingDamage[] = [];
  const particles: VisualParticle[] = [];
  const hitImpacts: HitImpact[] = [];

  for (const state of history) {
    if (state.frame > frame) continue;
    for (const event of state.events) {
      if (event.type === 'hit') {
        const isUltimateImpact = state.events.some((candidate) => candidate.type === 'special_hit'
          && candidate.attackerId === event.attackerId && candidate.targetId === event.targetId);
        if (isUltimateImpact) continue;
        const target = state.fighters.find((fighter) => fighter.id === event.targetId);
        if (!target) continue;
        const color = event.weaponType === 'melee' ? 0xff4757 : 0xffa502;
        const impact = event.impact ?? target.pos;

        if (config.effects.damageNumbers) {
          damageNumbers.push({
            text: `-${event.damage.toFixed(0)}`,
            x: target.pos.x + Math.sin(state.frame * 4.3) * 15,
            y: target.pos.y - target.radius - 10,
            startFrame: state.frame,
            color: event.weaponType === 'melee' ? '#ff4757' : '#ffa502',
          });
        }

        if (config.effects.hitFlash) {
          hitImpacts.push({ targetId: target.id, x: impact.x, y: impact.y, startFrame: state.frame, lifeFrames: 36, color });
        }

        if (config.effects.particles) {
          // Fixed count, spacing, and phase make sparks stable after timeline seeks.
          for (let particle = 0; particle < 12; particle++) {
            const angle = (particle * Math.PI * 2) / 12 + state.frame * 0.5;
            const speed = 70 + (particle % 4) * 22;
            particles.push({
              x: impact.x,
              y: impact.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              startFrame: state.frame,
              lifeFrames: 22,
              color,
              size: 3 + (particle % 3),
            });
          }
        }
      } else if (event.type === 'special_hit') {
        const target = state.fighters.find((fighter) => fighter.id === event.targetId);
        const attacker = state.fighters.find((fighter) => fighter.id === event.attackerId);
        if (!target) continue;
        const country = getCountry(attacker?.countryId);
        const locale = config.presentation?.locale ?? 'ru';
        const abilityName = country?.ultimate[locale] ?? event.ability;
        const impact = event.impact ?? target.pos;
        damageNumbers.push({
          text: event.amount > 0 ? `⚡ ${abilityName}: -${event.amount.toFixed(0)}` : `🛡 ${abilityName}: БЛОК`,
          x: target.pos.x,
          y: target.pos.y - target.radius - 20,
          startFrame: state.frame,
          color: '#fde047',
          emphasis: true,
        });
        hitImpacts.push({ targetId: target.id, x: impact.x, y: impact.y, startFrame: state.frame, lifeFrames: 46, color: 0xfde047 });
        if (config.effects.particles) {
          for (let particle = 0; particle < 20; particle++) {
            const angle = (particle * Math.PI * 2) / 20 + state.frame * 0.23;
            particles.push({
              x: impact.x, y: impact.y,
              vx: Math.cos(angle) * (90 + (particle % 5) * 20),
              vy: Math.sin(angle) * (90 + (particle % 5) * 20),
              startFrame: state.frame, lifeFrames: 30, color: 0xfde047, size: 4 + (particle % 3),
            });
          }
        }
      } else if (event.type === 'shield_start') {
        const fighter = state.fighters.find((candidate) => candidate.id === event.fighterId);
        const country = getCountry(fighter?.countryId);
        const locale = config.presentation?.locale ?? 'ru';
        if (fighter) damageNumbers.push({ text: `🛡 ${country?.ultimate[locale] ?? 'ЩИТ'}: +${event.amount}`, x: fighter.pos.x, y: fighter.pos.y - fighter.radius - 20, startFrame: state.frame, color: '#67e8f9', emphasis: true });
      } else if (event.type === 'healing') {
        const fighter = state.fighters.find((candidate) => candidate.id === event.fighterId);
        if (fighter) damageNumbers.push({ text: `✚ +${event.amount.toFixed(0)} HP`, x: fighter.pos.x, y: fighter.pos.y - fighter.radius - 48, startFrame: state.frame, color: '#86efac', emphasis: true });
      } else if (event.type === 'wall_bounce' && config.effects.particles) {
        const fighter = state.fighters.find((candidate) => candidate.id === event.fighterId);
        if (!fighter) continue;
        for (let particle = 0; particle < 4; particle++) {
          const angle = particle * 1.57 + state.frame;
          particles.push({
            x: fighter.pos.x, y: fighter.pos.y,
            vx: Math.cos(angle) * 40, vy: Math.sin(angle) * 40,
            startFrame: state.frame, lifeFrames: 15, color: 0x57606f, size: 2,
          });
        }
      }
    }
  }

  return {
    damageNumbers: damageNumbers.filter((damage) => frame - damage.startFrame < (damage.emphasis ? 55 : 35)),
    particles: particles.filter((particle) => frame - particle.startFrame < particle.lifeFrames),
    hitImpacts: hitImpacts.filter((impact) => frame - impact.startFrame < impact.lifeFrames),
  };
}
