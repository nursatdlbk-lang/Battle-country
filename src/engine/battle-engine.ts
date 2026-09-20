import { BattleConfig } from './battle-config';
import { BattleState } from './battle-state';
import { createRng, nextRange } from './rng';
import { vec2, add, scale, distance, fromAngle, normalize, sub, angle as vectorAngle, angleDelta, clamp } from './vector';
import { createFighter, FighterState } from './fighter';
import { createHitRegistry, checkAndRegisterHit, makeHitKey } from './hit-registry';
import { createStatistics, updateStatistics } from './statistics';
import { BattleEvent } from './events';
import { getCurrentMultipliers } from './sudden-death';
import { resolveWallBounce, resolveElasticCollision } from './physics';
import {
  updateMeleeWeapon,
  getMeleeWeaponHitboxes,
  getMeleeWeaponDamage,
  MeleeWeaponState,
} from './melee-weapon';
import {
  updateRangedWeapon,
  getRangedWeaponPosition,
  getRangedWeaponDamage,
  getProjectileCount,
  RangedWeaponState,
} from './ranged-weapon';
import { forceReturnAtWall, isCaughtByOwner, spawnProjectiles, updateProjectile, isOutOfBounds, Projectile } from './projectile';
import { applyDamage } from './damage';
import { capsuleVsCircle, circleVsCircle } from './collision';
import { BattleContext } from './controller';
import { getBattleRules, getEffectiveArena, getRuleMultipliers } from './battle-rules';
import { getCountry } from '../data/countries';

const INITIAL_POSITION_ATTEMPTS = 100;
const FALLBACK_GRID_STEPS = 48;

function hasStatus(fighter: FighterState, kind: string, time: number): boolean {
  return fighter.statuses.some((status) => status.kind === kind && status.until > time);
}

/** Applies V2 defenses before preserving the V1 damage contract. */
function applyFighterDamage(fighter: FighterState, rawDamage: number, multiplier: number, time: number) {
  const scaled = Math.max(0, rawDamage * multiplier);
  if (hasStatus(fighter, 'invulnerable', time)) {
    return { hp: fighter.hp, shield: fighter.shield, actualDamage: 0, isDead: false, absorbed: scaled };
  }
  const absorbed = Math.min(fighter.shield, scaled);
  const damageRes = applyDamage(fighter.hp, scaled - absorbed, 1);
  return { hp: damageRes.newHp, shield: fighter.shield - absorbed, actualDamage: damageRes.actualDamage, isDead: damageRes.isDead, absorbed };
}

function cloneFighter(fighter: FighterState): FighterState {
  return {
    ...fighter,
    pos: { ...fighter.pos },
    vel: { ...fighter.vel },
    weapon: { ...fighter.weapon },
    statuses: fighter.statuses.map((status) => ({ ...status })),
  };
}

function assertSpawnConfiguration(config: BattleConfig): void {
  if (!Number.isFinite(config.fps) || config.fps <= 0) {
    throw new RangeError('Battle configuration requires a finite fps greater than zero.');
  }

  const { arena } = config;
  if (!Number.isFinite(arena.width) || !Number.isFinite(arena.height) || arena.width <= 0 || arena.height <= 0) {
    throw new RangeError('Battle configuration requires an arena with positive finite width and height.');
  }

  for (const fighter of config.fighters) {
    if (!Number.isFinite(fighter.radius) || fighter.radius <= 0) {
      throw new RangeError(`Fighter "${fighter.id}" requires a finite radius greater than zero.`);
    }
    if (fighter.radius * 2 > arena.width || fighter.radius * 2 > arena.height) {
      throw new RangeError(`Fighter "${fighter.id}" cannot fit inside the configured arena.`);
    }
  }
}

interface PlacedCircle {
  readonly pos: { x: number; y: number };
  readonly radius: number;
}

function isNonOverlapping(position: { x: number; y: number }, radius: number, fighters: readonly PlacedCircle[]): boolean {
  return fighters.every((existing) => distance(position, existing.pos) >= radius + existing.radius);
}

function findFallbackPosition(config: BattleConfig, radius: number, fighters: readonly PlacedCircle[]) {
  const minX = config.arena.x + radius;
  const maxX = config.arena.x + config.arena.width - radius;
  const minY = config.arena.y + radius;
  const maxY = config.arena.y + config.arena.height - radius;

  for (let yIndex = 0; yIndex <= FALLBACK_GRID_STEPS; yIndex++) {
    const y = yIndex === FALLBACK_GRID_STEPS
      ? maxY
      : minY + ((maxY - minY) * yIndex) / FALLBACK_GRID_STEPS;
    for (let xIndex = 0; xIndex <= FALLBACK_GRID_STEPS; xIndex++) {
      const x = xIndex === FALLBACK_GRID_STEPS
        ? maxX
        : minX + ((maxX - minX) * xIndex) / FALLBACK_GRID_STEPS;
      const position = vec2(x, y);
      if (isNonOverlapping(position, radius, fighters)) return position;
    }
  }

  return null;
}

function findFallbackLayout(config: BattleConfig): ReturnType<typeof vec2>[] | null {
  const placed: PlacedCircle[] = [];
  const positions: ReturnType<typeof vec2>[] = [];

  for (const fighterConfig of config.fighters) {
    const position = findFallbackPosition(config, fighterConfig.radius, placed);
    if (!position) return null;
    positions.push(position);
    placed.push({ pos: position, radius: fighterConfig.radius });
  }

  return positions;
}

export function createBattle(config: BattleConfig): BattleState {
  assertSpawnConfiguration(config);
  let rng = createRng(config.seed);

  const fighters: FighterState[] = [];
  let fallbackLayout: ReturnType<typeof vec2>[] | null = null;
  for (let i = 0; i < config.fighters.length; i++) {
    const fConf = config.fighters[i];
    let startPosition = fallbackLayout?.[i] ?? null;
    let attempts = 0;

    // Deterministically pick non-overlapping initial positions inside the arena
    while (!startPosition && attempts < INITIAL_POSITION_ATTEMPTS) {
      let valX: number;
      let valY: number;
      [valX, rng] = nextRange(
        rng,
        config.arena.x + fConf.radius,
        config.arena.x + config.arena.width - fConf.radius,
      );
      [valY, rng] = nextRange(
        rng,
        config.arena.y + fConf.radius,
        config.arena.y + config.arena.height - fConf.radius,
      );
      const candidate = vec2(valX, valY);
      if (isNonOverlapping(candidate, fConf.radius, fighters)) startPosition = candidate;
      attempts++;
    }

    if (!startPosition) {
      fallbackLayout = findFallbackLayout(config);
      if (fallbackLayout) {
        for (let index = 0; index < fighters.length; index++) {
          fighters[index] = { ...fighters[index], pos: fallbackLayout[index] };
        }
        startPosition = fallbackLayout[i];
      }
    }
    if (!startPosition) {
      throw new RangeError(
        `Unable to place fighter "${fConf.id}" without overlap in the configured arena; enlarge the arena or reduce fighter radii.`,
      );
    }

    // Deterministic initial movement angle and speed
    let initAngle: number;
    [initAngle, rng] = nextRange(rng, 0, Math.PI * 2);

    const startVel = scale(fromAngle(initAngle), fConf.speed);

    const weaponConf = fConf.type === 'melee' ? config.melee : config.ranged;
    const f = createFighter(fConf, startPosition, startVel, weaponConf);
    fighters.push(f);
  }

  return {
    frame: 0,
    time: 0,
    dt: 1 / config.fps,
    fighters,
    projectiles: [],
    events: [],
    rng,
    hitRegistry: createHitRegistry(),
    statistics: createStatistics(fighters.map((f) => f.id)),
    winner: null,
    finished: false,
    suddenDeathPhase: 0,
    nextProjectileId: 1,
    zones: [],
    summons: [],
    nextEffectId: 1,
  };
}

export function stepBattle(state: BattleState, config: BattleConfig): BattleState {
  if (state.finished) return state;

  assertSpawnConfiguration(config);
  const dt = 1 / config.fps;
  const resultingFrame = state.frame + 1;
  const newTime = (state.frame + 1) / config.fps;
  const newEvents: BattleEvent[] = [];
  // Only confirmed basic-attack damage fills the ultimate meter. Keeping this
  // separate from generic damage events prevents an ultimate from recharging
  // itself through zones, summons, or delayed strikes.
  const basicDamageDealt = new Map<string, number>();
  let rng = state.rng;
  const rules = getBattleRules(config);
  const ruleMultipliers = getRuleMultipliers(newTime, rules);
  const effectiveArena = getEffectiveArena(config.arena, newTime, rules);
  const cinematicScale = state.fighters.some((fighter) => hasStatus(fighter, 'ultimate_windup', state.time)) ? 0.2 : 1;
  const motionDt = dt * cinematicScale;
  for (const fighter of state.fighters) {
    if (fighter.stealthUntil > state.time && fighter.stealthUntil <= newTime) {
      newEvents.push({ type: 'invisibility_end', frame: resultingFrame, time: newTime, fighterId: fighter.id });
      newEvents.push({ type: 'ultimate_end', frame: resultingFrame, time: newTime, fighterId: fighter.id });
    }
  }

  // 1. Sudden Death
  const sd = getCurrentMultipliers(newTime, config.suddenDeath);
  let speedScaleFactor = 1.0;
  if (sd.phase > state.suddenDeathPhase) {
    const prevSd = getCurrentMultipliers(state.time, config.suddenDeath);
    speedScaleFactor = prevSd.speed > 0 ? sd.speed / prevSd.speed : 1.0;

    newEvents.push({
      type: 'sudden_death_phase',
      frame: resultingFrame,
      time: newTime,
      phase: sd.phase,
      speedMultiplier: sd.speed,
      damageMultiplier: sd.damage,
    });
  }
  if (state.time < rules.accelerateAt && newTime >= rules.accelerateAt) {
    speedScaleFactor *= rules.accelerationMultiplier;
  }

  // 2. Controller Update (Pluggable AI)
  const battleContext: BattleContext = {
    arena: { ...effectiveArena },
    fighters: state.fighters.map(cloneFighter),
    time: state.time,
    frame: state.frame,
  };

  let updatedFighters = state.fighters.map((f) => {
    let fighter = cloneFighter(f);
    if (!fighter.alive) return fighter;
    for (const status of fighter.statuses) {
      if (status.until > state.time && status.until <= newTime && status.kind === 'dash_speed') {
        const multiplier = getCountry(fighter.countryId)?.ultimateSpec.speedMultiplier ?? 1;
        if (multiplier > 0) fighter = { ...fighter, vel: scale(fighter.vel, 1 / multiplier) };
      }
      if (status.until > state.time && status.until <= newTime && status.kind === 'boost_speed') {
        const multiplier = getCountry(fighter.countryId)?.ultimateSpec.speedMultiplier ?? 1;
        if (multiplier > 0) fighter = { ...fighter, vel: scale(fighter.vel, 1 / multiplier) };
      }
    }
    const statuses = fighter.statuses.filter((status) => status.until > newTime);
    const isCasting = statuses.some((status) => status.kind === 'ultimate_windup');
    const chargeRequired = getCountry(fighter.countryId)?.ultimateSpec.chargeRequired ?? rules.ultimateThreshold;
    fighter = {
      ...fighter,
      statuses,
      ultimateStatus: isCasting ? 'casting' : fighter.ultimateLockoutUntil > newTime ? 'locked' : fighter.ultimateCharge >= chargeRequired ? 'ready' : 'idle',
    };
    fighter.controller.update(fighter, battleContext, motionDt);

    // Apply sudden death speed increase to current velocity if phase changed
    if (speedScaleFactor !== 1.0) {
      fighter = {
        ...fighter,
        vel: scale(fighter.vel, speedScaleFactor),
      };
    }
    return fighter;
  });

  // 3. Physical Ballistic Movement Integration: pos = pos + vel * dt
  updatedFighters = updatedFighters.map((f) => {
    if (!f.alive) return f;
    return {
      ...f,
      pos: add(f.pos, scale(f.vel, motionDt)),
    };
  });

  // 4. Wall Collisions (Elastic Bounce)
  updatedFighters = updatedFighters.map((f) => {
    if (!f.alive) return f;
    const { body, bounced } = resolveWallBounce(
      { pos: f.pos, vel: f.vel, mass: f.mass, radius: f.radius },
      effectiveArena,
      1.0,
    );
    if (bounced) {
      newEvents.push({
        type: 'wall_bounce',
        frame: resultingFrame,
        time: newTime,
        fighterId: f.id,
      });
    }
    return {
      ...f,
      pos: body.pos,
      vel: body.vel,
    };
  });

  // 5. Fighter-Fighter Elastic Collision
  for (let i = 0; i < updatedFighters.length; i++) {
    for (let j = i + 1; j < updatedFighters.length; j++) {
      const f1 = updatedFighters[i];
      const f2 = updatedFighters[j];
      if (!f1.alive || !f2.alive) continue;

      const res = resolveElasticCollision(
        { pos: f1.pos, vel: f1.vel, mass: f1.mass, radius: f1.radius },
        { pos: f2.pos, vel: f2.vel, mass: f2.mass, radius: f2.radius },
        1.0,
      );

      if (res.collided) {
        newEvents.push({
          type: 'fighter_collision',
          frame: resultingFrame,
          time: newTime,
          fighterAId: f1.id,
          fighterBId: f2.id,
        });
        updatedFighters[i] = { ...f1, pos: res.a.pos, vel: res.a.vel };
        updatedFighters[j] = { ...f2, pos: res.b.pos, vel: res.b.vel };
      }
    }
  }

  let nextProjectileId = state.nextProjectileId;
  let newProjectiles: Projectile[] = [...state.projectiles];
  if (state.time < rules.accelerateAt && newTime >= rules.accelerateAt) {
    newProjectiles = newProjectiles.map((projectile) => ({ ...projectile, vel: scale(projectile.vel, rules.accelerationMultiplier) }));
  }
  let hitRegistry = state.hitRegistry;

  // The stealth template has a visible invulnerability window before its eight projectiles release.
  for (const previous of state.fighters) {
    const release = previous.statuses.find((status) => status.kind === 'shuriken_release');
    if (!release || release.until > newTime) continue;
    const caster = updatedFighters.find((fighter) => fighter.id === previous.id);
    if (!caster?.alive) continue;
    const country = getCountry(caster.countryId);
    const spawnedResult = spawnProjectiles(caster.pos, 0, country?.ultimateSpec.projectileCount ?? 8, Math.max(500, config.ranged.projectileSpeed), config.ranged.projectileRadius, country?.ultimateSpec.damage ?? 22, caster.id, nextProjectileId, {
      source: 'ultimate', ability: 'stealth', visual: 'shuriken',
    });
    nextProjectileId = spawnedResult.nextId;
    newProjectiles.push(...spawnedResult.projectiles);
    newEvents.push({ type: 'projectile_spawn', frame: resultingFrame, time: newTime, ownerId: caster.id, count: 8 });
  }

  // 6. Weapons & Attacks Update
  updatedFighters = updatedFighters.map((f) => {
    if (!f.alive) return f;

    if (f.type === 'melee') {
      const weaponState = f.weapon as MeleeWeaponState;
      const spinDirection = getCountry(f.countryId)?.weaponSpinDirection ?? 1;
      const updatedWeapon = updateMeleeWeapon(weaponState, motionDt * ruleMultipliers.speed * spinDirection, config.melee);
      return { ...f, weapon: updatedWeapon };
    } else {
      const weaponState = f.weapon as RangedWeaponState;
      const country = getCountry(f.countryId);
      const isReturning = country?.basicAttackTemplate === 'returning_projectile';
      const returningWeaponInFlight = isReturning && newProjectiles.some((projectile) => (
        projectile.ownerId === f.id && projectile.kind === 'returning'
      ));
      const target = updatedFighters.find((candidate) => candidate.alive && candidate.id !== f.id);
      const targetAngle = target ? vectorAngle(sub(target.pos, f.pos)) : weaponState.angle;
      const aimed = country?.basicAttackTemplate === 'shooter' || isReturning;
      const updated = updateRangedWeapon(
        weaponState,
        motionDt * ruleMultipliers.speed,
        config.ranged,
      );
      // Guns, bows, chakrams and boomerangs turn to face their opponent instead of
      // orbiting freely like a melee blade — but they turn at a limited rate rather
      // than snapping onto the target instantly, so a fast or nearby opponent can
      // actually dodge outside the cone instead of always eating a guaranteed hit.
      // A held returning weapon stays ready at zero cooldown while its previous
      // throw is still in flight.
      const turnRate = country?.id === 'us' ? 6.0 : isReturning ? 2.6 : 3.4; // rad/s
      const maxTurnStep = turnRate * motionDt * ruleMultipliers.speed;
      const trackedAngle = aimed
        ? updated.weapon.angle + clamp(angleDelta(updated.weapon.angle, targetAngle), -maxTurnStep, maxTurnStep)
        : updated.weapon.angle;
      const updatedWeapon = {
        ...updated.weapon,
        angle: trackedAngle,
        cooldownTimer: returningWeaponInFlight ? 0 : updated.weapon.cooldownTimer,
      };
      const shouldFire = updated.shouldFire && !returningWeaponInFlight;

      if (shouldFire) {
        const weaponPos = getRangedWeaponPosition(updatedWeapon, f.pos, config.ranged);
        // A physical returning weapon is unique: it cannot duplicate itself
        // as the ranged hit-upgrade grows.
        const count = isReturning ? 1 : getProjectileCount(updatedWeapon, config.ranged);
        const damage = getRangedWeaponDamage(updatedWeapon, config.ranged);
        // Even a weapon that is currently on-target isn't a laser: real aim has
        // a little error, so the actual shot gets a small random deviation from
        // the tracked angle. Revolvers are precise (aimed_burst is meant to feel
        // deadly); bows, bolas and returning throws drift more.
        let fireAngle = updatedWeapon.angle;
        if (aimed) {
          const jitterRange = country?.id === 'us' ? 0.045 : isReturning ? 0.16 : 0.13;
          const [jitter, jitteredRng] = nextRange(rng, -jitterRange, jitterRange);
          rng = jitteredRng;
          fireAngle += jitter;
        }

        const { projectiles: spawned, nextId } = spawnProjectiles(
          weaponPos,
          fireAngle,
          count,
          config.ranged.projectileSpeed * ruleMultipliers.speed,
          config.ranged.projectileRadius,
          damage,
          f.id,
          nextProjectileId,
          {
            kind: isReturning ? 'returning' : 'linear',
            returnAfter: isReturning ? 0.65 : undefined,
            source: 'basic',
            ability: country?.basicAttackTemplate ?? 'basic',
            visual: country?.projectileStyle ?? 'energy',
            pattern: isReturning || country?.basicAttackTemplate === 'shooter' ? 'spread' : 'radial',
            spreadRadians: country?.id === 'us' ? 0.08 : 0.2,
          },
        );
        nextProjectileId = nextId;
        newProjectiles.push(...spawned);

        newEvents.push({
          type: 'projectile_spawn',
          frame: resultingFrame,
          time: newTime,
          ownerId: f.id,
          count,
        });
      }

      return { ...f, weapon: updatedWeapon };
    }
  });

  // 7. Update Projectiles
  newProjectiles = newProjectiles.map((p) => {
    const owner = updatedFighters.find((fighter) => fighter.id === p.ownerId);
    return updateProjectile(p, motionDt, owner?.pos);
  });

  // 8. Hit Detection — Melee
  const meleeFighters = updatedFighters.filter((f) => f.alive && f.type === 'melee');
  for (const attacker of meleeFighters) {
    const weaponHitboxes = getMeleeWeaponHitboxes(
      attacker.weapon as MeleeWeaponState,
      attacker.pos,
      attacker.radius,
      config.melee,
      getCountry(attacker.countryId)?.weaponHitbox,
    );

    for (let j = 0; j < updatedFighters.length; j++) {
      const target = updatedFighters[j];
      if (!target.alive || target.id === attacker.id) continue;

      // A country weapon may have two painted striking edges (for example,
      // Thailand's paired swords). Never test an orbit hub or fighter body.
      const coll = weaponHitboxes
        .map((hitbox) => capsuleVsCircle(hitbox.start, hitbox.end, hitbox.radius, target.pos, target.radius))
        .find((candidate) => candidate.colliding) ?? weaponHitboxes
          .map((hitbox) => capsuleVsCircle(hitbox.start, hitbox.end, hitbox.radius, target.pos, target.radius))[0];
      const hitKey = makeHitKey(attacker.id, target.id, 'melee');
      const { registry, hitOccurred } = checkAndRegisterHit(
        hitRegistry,
        hitKey,
        coll.colliding,
      );
      hitRegistry = registry;

      if (hitOccurred) {
        const damage = getMeleeWeaponDamage(
          attacker.weapon as MeleeWeaponState,
          config.melee,
        );
        const damageRes = applyFighterDamage(target, damage, sd.damage * ruleMultipliers.damage, newTime);
        if (damageRes.actualDamage > 0) {
          basicDamageDealt.set(attacker.id, (basicDamageDealt.get(attacker.id) ?? 0) + damageRes.actualDamage);
        }

        let finalHp = damageRes.hp;
        let isDead = damageRes.isDead;

        // Support forced winner simulation mode
        if (config.simulationMode === 'forceA' && target.id === config.fighters[0]?.id) {
          finalHp = Math.max(1, finalHp);
          isDead = false;
        } else if (
          config.simulationMode === 'forceB' &&
          target.id === config.fighters[1]?.id
        ) {
          finalHp = Math.max(1, finalHp);
          isDead = false;
        }

        newEvents.push({
          type: 'hit',
          frame: resultingFrame,
          time: newTime,
          attackerId: attacker.id,
          targetId: target.id,
          weaponType: 'melee',
          damage,
          impact: coll.contactPoint,
        });
        newEvents.push({
          type: 'damage',
          frame: resultingFrame,
          time: newTime,
          attackerId: attacker.id,
          targetId: target.id,
          amount: damageRes.actualDamage,
          remainingHp: finalHp,
        });

        if (damageRes.absorbed > 0) newEvents.push({ type: 'shield_absorb', frame: resultingFrame, time: newTime, fighterId: target.id, amount: damageRes.absorbed, remainingShield: damageRes.shield });

        updatedFighters[j] = { ...target, hp: finalHp, shield: damageRes.shield, alive: !isDead };
        if (isDead) {
          newEvents.push({
            type: 'kill',
            frame: resultingFrame,
            time: newTime,
            killerId: attacker.id,
            victimId: target.id,
          });
        }

        // Weapon upgrade on confirmed hit
        const attackerIdx = updatedFighters.findIndex((f) => f.id === attacker.id);
        if (attackerIdx !== -1) {
          const currentAttacker = updatedFighters[attackerIdx];
          const mw = currentAttacker.weapon as MeleeWeaponState;
          updatedFighters[attackerIdx] = {
            ...currentAttacker,
            weapon: { ...mw, hitCount: mw.hitCount + 1 },
          };
        }
      }
    }
  }

  // 9. Hit Detection — Projectiles
  const projectilesToRemove = new Set<string>();

  for (let i = 0; i < newProjectiles.length; i++) {
    const p = newProjectiles[i];
    const owner = updatedFighters.find((fighter) => fighter.id === p.ownerId);

    if (owner && isCaughtByOwner(p, owner.pos, owner.radius)) {
      projectilesToRemove.add(p.id);
      newEvents.push({ type: 'projectile_destroy', frame: resultingFrame, time: newTime, reason: 'returned' });
      continue;
    }

    // Projectile collides with arena wall
    if (isOutOfBounds(p, config.arena)) {
      if (p.kind === 'returning') {
        newProjectiles[i] = forceReturnAtWall(p);
        continue;
      }
      projectilesToRemove.add(p.id);
      newEvents.push({
        type: 'projectile_destroy',
        frame: resultingFrame,
        time: newTime,
        reason: 'wall',
      });
      continue;
    }

    // Projectile collides with opposing fighter
    for (let j = 0; j < updatedFighters.length; j++) {
      const target = updatedFighters[j];
      if (!target.alive || target.id === p.ownerId) continue;
      if (p.hitTargetIds?.includes(target.id)) continue;

      const coll = circleVsCircle(p.pos, p.radius, target.pos, target.radius);
      if (coll.colliding) {
        if (p.kind === 'returning') {
          newProjectiles[i] = forceReturnAtWall({ ...p, hitTargetIds: [...(p.hitTargetIds ?? []), target.id] });
        } else {
          projectilesToRemove.add(p.id);
        }

        const damageRes = applyFighterDamage(target, p.damage, sd.damage * ruleMultipliers.damage, newTime);
        if (p.source !== 'ultimate' && damageRes.actualDamage > 0) {
          basicDamageDealt.set(p.ownerId, (basicDamageDealt.get(p.ownerId) ?? 0) + damageRes.actualDamage);
        }

        let finalHp = damageRes.hp;
        let isDead = damageRes.isDead;

        if (config.simulationMode === 'forceA' && target.id === config.fighters[0]?.id) {
          finalHp = Math.max(1, finalHp);
          isDead = false;
        } else if (
          config.simulationMode === 'forceB' &&
          target.id === config.fighters[1]?.id
        ) {
          finalHp = Math.max(1, finalHp);
          isDead = false;
        }

        newEvents.push({
          type: 'hit',
          frame: resultingFrame,
          time: newTime,
          attackerId: p.ownerId,
          targetId: target.id,
          weaponType: 'projectile',
          damage: p.damage,
          impact: { ...p.pos },
        });
        newEvents.push({
          type: 'damage',
          frame: resultingFrame,
          time: newTime,
          attackerId: p.ownerId,
          targetId: target.id,
          amount: damageRes.actualDamage,
          remainingHp: finalHp,
        });
        if (damageRes.absorbed > 0) newEvents.push({ type: 'shield_absorb', frame: resultingFrame, time: newTime, fighterId: target.id, amount: damageRes.absorbed, remainingShield: damageRes.shield });
        if (p.source === 'ultimate') {
          newEvents.push({ type: 'special_hit', frame: resultingFrame, time: newTime, attackerId: p.ownerId, targetId: target.id, ability: p.ability ?? 'barrage', amount: damageRes.actualDamage, impact: { ...p.pos } });
        }
        if (p.kind !== 'returning') {
          newEvents.push({
            type: 'projectile_destroy',
            frame: resultingFrame,
            time: newTime,
            reason: 'hit',
          });
        }

        updatedFighters[j] = { ...target, hp: finalHp, shield: damageRes.shield, alive: !isDead };
        if (isDead) {
          newEvents.push({
            type: 'kill',
            frame: resultingFrame,
            time: newTime,
            killerId: p.ownerId,
            victimId: target.id,
          });
        }

        // Upgrade ranged weapon
        const attackerIdx = updatedFighters.findIndex((f) => f.id === p.ownerId);
        if (attackerIdx !== -1) {
          const attacker = updatedFighters[attackerIdx];
          const rw = attacker.weapon as RangedWeaponState;
          updatedFighters[attackerIdx] = {
            ...attacker,
            weapon: { ...rw, hitCount: rw.hitCount + 1 },
          };
        }

        break;
      }
    }
  }

  newProjectiles = newProjectiles.filter((p) => !projectilesToRemove.has(p.id));

  // 10. Persistent country effects and ultimate charge. These use no ambient randomness.
  let zones = state.zones.filter((zone) => zone.expiresAt > newTime);
  let summons = state.summons.filter((summon) => summon.expiresAt > newTime);
  let nextEffectId = state.nextEffectId;

  const applyAbilityDamage = (attackerId: string, targetId: string, amount: number, ability: string, impact?: { x: number; y: number }): void => {
    const index = updatedFighters.findIndex((fighter) => fighter.id === targetId && fighter.alive);
    if (index < 0) return;
    const target = updatedFighters[index];
    const result = applyFighterDamage(target, amount, sd.damage * ruleMultipliers.damage, newTime);
    updatedFighters[index] = { ...target, hp: result.hp, shield: result.shield, alive: !result.isDead };
    newEvents.push({ type: 'damage', frame: resultingFrame, time: newTime, attackerId, targetId, amount: result.actualDamage, remainingHp: result.hp });
    newEvents.push({ type: 'special_hit', frame: resultingFrame, time: newTime, attackerId, targetId, ability, amount: result.actualDamage, impact: impact ?? { ...target.pos } });
    if (result.absorbed > 0) newEvents.push({ type: 'shield_absorb', frame: resultingFrame, time: newTime, fighterId: targetId, amount: result.absorbed, remainingShield: result.shield });
    if (result.isDead) newEvents.push({ type: 'kill', frame: resultingFrame, time: newTime, killerId: attackerId, victimId: targetId });
  };

  zones = zones.map((zone) => {
    if (zone.nextDamageAt > newTime) return zone;
    for (const target of updatedFighters) {
      if (target.alive && target.id !== zone.ownerId && circleVsCircle(zone.pos, zone.radius, target.pos, target.radius).colliding) {
        applyAbilityDamage(zone.ownerId, target.id, zone.damagePerSecond * zone.interval, zone.ability);
      }
    }
    return { ...zone, nextDamageAt: newTime + zone.interval };
  });
  const oneShotSummons = new Set<string>();
  summons = summons.map((summon) => {
    const target = updatedFighters.find((fighter) => fighter.alive && fighter.id !== summon.ownerId);
    if (summon.phase === 'approach' || summon.phase === 'returning') {
      const owner = updatedFighters.find((fighter) => fighter.id === summon.ownerId);
      if (!owner || !target) return summon;
      const destination = summon.phase === 'returning' ? owner.pos : target.pos;
      const remaining = distance(summon.pos, destination);
      const speed = summon.speed ?? 520;
      const travel = speed * motionDt;
      const velocity = remaining > 0 ? scale(normalize(sub(destination, summon.pos)), speed) : vec2(0, 0);
      const nextPos = remaining <= travel ? { ...destination } : add(summon.pos, scale(velocity, motionDt));
      const attackRange = summon.attackRange ?? target.radius + 24;

      if (summon.phase === 'approach' && distance(nextPos, target.pos) <= attackRange && summon.nextAttackAt <= newTime) {
        applyAbilityDamage(summon.ownerId, target.id, summon.damage, summon.ability, target.pos);
        return { ...summon, pos: nextPos, vel: velocity, targetId: target.id, phase: 'returning' as const, nextAttackAt: newTime + summon.interval };
      }
      if (summon.phase === 'returning' && distance(nextPos, owner.pos) <= owner.radius + 28) {
        return { ...summon, pos: nextPos, vel: velocity, targetId: target.id, phase: 'approach' as const };
      }
      return { ...summon, pos: nextPos, vel: velocity, targetId: target.id };
    }

    if (summon.nextAttackAt > newTime) return summon;
    if (target) applyAbilityDamage(summon.ownerId, target.id, summon.damage, summon.ability, target.pos);
    if (summon.oneShot) oneShotSummons.add(summon.id);
    return { ...summon, nextAttackAt: newTime + summon.interval };
  }).filter((summon) => !oneShotSummons.has(summon.id));

  const dealt = new Map<string, number>();
  for (const event of newEvents) {
    if (event.type === 'damage' && event.attackerId) {
      dealt.set(event.attackerId, (dealt.get(event.attackerId) ?? 0) + event.amount);
    }
  }

  updatedFighters = updatedFighters.map((fighter) => {
    if (!fighter.alive || !fighter.ultimateTemplate || newTime < fighter.ultimateLockoutUntil) return fighter;
    const country = getCountry(fighter.countryId);
    const threshold = country?.ultimateSpec.chargeRequired ?? rules.ultimateThreshold;
    const chargePerDamage = country?.ultimateSpec.chargePerDamage ?? rules.ultimateDamageDealtFactor;
    const charge = Math.min(threshold, fighter.ultimateCharge
      + chargePerDamage * (basicDamageDealt.get(fighter.id) ?? 0));
    const ready = charge >= threshold && newTime >= fighter.ultimateLockoutUntil;
    if (ready && fighter.ultimateCharge < threshold) newEvents.push({ type: 'ultimate_ready', frame: resultingFrame, time: newTime, fighterId: fighter.id });
    return { ...fighter, ultimateCharge: charge, ultimateStatus: fighter.ultimateStatus === 'casting' ? 'casting' : ready ? 'ready' : fighter.ultimateStatus };
  });

  for (let index = 0; index < updatedFighters.length; index++) {
    const fighter = updatedFighters[index];
    const chargeRequired = getCountry(fighter.countryId)?.ultimateSpec.chargeRequired ?? rules.ultimateThreshold;
    if (!fighter.alive || fighter.ultimateCharge < chargeRequired || newTime < fighter.ultimateLockoutUntil || !fighter.ultimateTemplate) continue;
    const country = getCountry(fighter.countryId);
    const spec = country?.ultimateSpec;
    const previous = state.fighters.find((candidate) => candidate.id === fighter.id);
    const previousWindup = previous?.statuses.find((status) => status.kind === 'ultimate_windup');
    if (!previousWindup) {
      const until = newTime + (spec?.windupSeconds ?? 0.55);
      updatedFighters[index] = { ...fighter, ultimateStatus: 'casting', statuses: [...fighter.statuses, { kind: 'ultimate_windup' as const, until }] };
      newEvents.push({ type: 'ultimate_windup', frame: resultingFrame, time: newTime, fighterId: fighter.id, template: fighter.ultimateTemplate, until });
      continue;
    }
    if (previousWindup.until > newTime) continue;

    const lockoutUntil = newTime + (spec?.duration ?? 0) + (spec?.lockoutSeconds ?? rules.ultimateLockout);
    let cast = { ...fighter, ultimateCharge: 0, ultimateLockoutUntil: lockoutUntil, ultimateStatus: 'locked' as const, statuses: [...fighter.statuses, { kind: 'ultimate_lockout' as const, until: lockoutUntil }] };
    newEvents.push({ type: 'ultimate_cast', frame: resultingFrame, time: newTime, fighterId: fighter.id, template: fighter.ultimateTemplate });
    if (fighter.ultimateTemplate === 'wave') {
      const target = updatedFighters.find((candidate) => candidate.alive && candidate.id !== fighter.id);
      if (target) applyAbilityDamage(fighter.id, target.id, spec?.damage ?? 82, country?.ultimatePattern ?? 'wave');
    } else if (fighter.ultimateTemplate === 'shield') {
      const healed = ruleMultipliers.healingEnabled ? Math.min(spec?.healing ?? 70, cast.maxHp - cast.hp) : 0;
      const shield = spec?.shield ?? 160;
      cast = { ...cast, hp: cast.hp + healed, shield: cast.shield + shield };
      newEvents.push({ type: 'shield_start', frame: resultingFrame, time: newTime, fighterId: fighter.id, amount: shield });
      if (healed > 0) newEvents.push({ type: 'healing', frame: resultingFrame, time: newTime, fighterId: fighter.id, amount: healed });
    } else if (fighter.ultimateTemplate === 'zone') {
      const zoneId = `zone_${nextEffectId++}`;
      zones = [...zones, { id: zoneId, ownerId: fighter.id, pos: { ...fighter.pos }, radius: spec?.radius ?? 180, damagePerSecond: spec?.damage ?? 28, expiresAt: newTime + (spec?.duration ?? 5), ability: 'zone', interval: 0.5, nextDamageAt: newTime }];
      newEvents.push({ type: 'zone_spawn', frame: resultingFrame, time: newTime, ownerId: fighter.id, zoneId });
    } else if (fighter.ultimateTemplate === 'summon') {
      const summonId = `summon_${nextEffectId++}`;
      const target = updatedFighters.find((candidate) => candidate.alive && candidate.id !== fighter.id);
      const start = { x: fighter.pos.x, y: fighter.pos.y - fighter.radius * 1.7 };
      const initialVelocity = target ? scale(normalize(sub(target.pos, start)), 540) : vec2(0, -540);
      summons = [...summons, {
        id: summonId, ownerId: fighter.id, pos: start, vel: initialVelocity, targetId: target?.id,
        phase: 'approach', speed: 540, attackRange: (target?.radius ?? 30) + 30,
        expiresAt: newTime + (spec?.duration ?? 5), damage: spec?.damage ?? 42,
        interval: spec?.interval ?? 1.35, nextAttackAt: newTime + 0.18,
        ability: country?.ultimatePattern ?? 'summon',
      }];
      newEvents.push({ type: 'summon_spawn', frame: resultingFrame, time: newTime, ownerId: fighter.id, summonId });
    } else if (fighter.ultimateTemplate === 'barrage') {
      const count = spec?.projectileCount ?? 6;
      const target = updatedFighters.find((candidate) => candidate.alive && candidate.id !== fighter.id);
      const aimAngle = target ? vectorAngle(sub(target.pos, fighter.pos)) : vectorAngle(fighter.vel);
      const ultimatePattern = country?.ultimatePattern ?? 'aimed_burst';
      const spreadByPattern: Partial<Record<string, number>> = {
        aimed_burst: 0.24, carnival_arc: 1.15, armada_broadside: 0.9,
        bombard_salvo: 0.38, atlas_storm: 1.35, returning_fan: 0.82,
        magic_crossbow: 0.52, ghost_cavalry: 0.68,
      };
      const visual = fighter.countryId === 'mn' || fighter.countryId === 'vn'
        ? 'arrow'
        : fighter.countryId === 'us' ? 'bullet' : country?.projectileStyle ?? 'energy';
      const isReturningVolley = ultimatePattern === 'returning_fan' || ultimatePattern === 'carnival_arc';
      const spawned = spawnProjectiles(
        fighter.pos, aimAngle, count,
        Math.max(500, config.ranged.projectileSpeed * ruleMultipliers.speed),
        config.ranged.projectileRadius * (ultimatePattern === 'bombard_salvo' ? 1.65 : 1),
        spec?.damage ?? 26, fighter.id, nextProjectileId,
        {
          source: 'ultimate', ability: ultimatePattern, visual,
          pattern: 'spread', spreadRadians: spreadByPattern[ultimatePattern] ?? 0.6,
          kind: isReturningVolley ? 'returning' : 'linear',
          returnAfter: isReturningVolley ? 0.9 : undefined,
        },
      );
      nextProjectileId = spawned.nextId; newProjectiles.push(...spawned.projectiles);
      newEvents.push({ type: 'projectile_spawn', frame: resultingFrame, time: newTime, ownerId: fighter.id, count });
    } else if (fighter.ultimateTemplate === 'dash') {
      const target = updatedFighters.find((candidate) => candidate.alive && candidate.id !== fighter.id);
      const until = newTime + (spec?.duration ?? 0.85);
      const speedMultiplier = spec?.speedMultiplier ?? 3;
      cast = { ...cast, vel: scale(cast.vel, speedMultiplier), statuses: [...cast.statuses, { kind: 'invulnerable' as const, until }, { kind: 'dash_speed' as const, until }] };
      newEvents.push({ type: 'dash_start', frame: resultingFrame, time: newTime, fighterId: fighter.id, until });
      if (target) applyAbilityDamage(fighter.id, target.id, spec?.damage ?? 72, country?.ultimatePattern ?? 'dash');
    } else if (fighter.ultimateTemplate === 'boost') {
      const until = newTime + (spec?.duration ?? 2);
      const shield = spec?.shield ?? 80;
      cast = { ...cast, vel: scale(cast.vel, spec?.speedMultiplier ?? 1.6), shield: cast.shield + shield, statuses: [...cast.statuses, { kind: 'boost_speed' as const, until }] };
      if (shield > 0) newEvents.push({ type: 'shield_start', frame: resultingFrame, time: newTime, fighterId: fighter.id, amount: shield });
    } else if (fighter.ultimateTemplate === 'decoy') {
      const shield = spec?.shield ?? 120;
      cast = {
        ...cast,
        pos: {
          x: effectiveArena.x + effectiveArena.width - (fighter.pos.x - effectiveArena.x),
          y: effectiveArena.y + effectiveArena.height - (fighter.pos.y - effectiveArena.y),
        },
        shield: cast.shield + shield,
      };
      newEvents.push({ type: 'shield_start', frame: resultingFrame, time: newTime, fighterId: fighter.id, amount: shield });
    } else if (fighter.ultimateTemplate === 'delayed_strike') {
      const target = updatedFighters.find((candidate) => candidate.alive && candidate.id !== fighter.id);
      const anchor = target ? { ...target.pos } : { ...fighter.pos };
      const delay = spec?.delay ?? 0.8;
      // A pattern can request a volley of several strike markers instead of one
      // (e.g. Korea's Hwacha rocket barrage) via ultimateSpec.projectileCount.
      const strikeCount = Math.max(1, spec?.projectileCount ?? 1);
      const spreadStep = 70;
      for (let strikeIndex = 0; strikeIndex < strikeCount; strikeIndex++) {
        const summonId = `summon_${nextEffectId++}`;
        const offset = strikeCount > 1 ? (strikeIndex - (strikeCount - 1) / 2) * spreadStep : 0;
        const strikeDelay = delay + strikeIndex * (strikeCount > 1 ? 0.12 : 0);
        const strikePos = { x: anchor.x + offset, y: anchor.y };
        summons = [...summons, { id: summonId, ownerId: fighter.id, pos: strikePos, phase: 'marker', expiresAt: newTime + strikeDelay + 0.5, damage: spec?.damage ?? 104, interval: 999, nextAttackAt: newTime + strikeDelay, ability: country?.ultimatePattern ?? 'delayed_strike', oneShot: true }];
        newEvents.push({ type: 'summon_spawn', frame: resultingFrame, time: newTime, ownerId: fighter.id, summonId });
      }
    } else if (fighter.ultimateTemplate === 'stealth') {
      const until = newTime + (spec?.duration ?? 1.6);
      cast = { ...cast, stealthUntil: until, statuses: [...cast.statuses, { kind: 'stealth', until }, { kind: 'invulnerable', until }, { kind: 'shuriken_release', until }] };
      newEvents.push({ type: 'invisibility_start', frame: resultingFrame, time: newTime, fighterId: fighter.id, until });
    }
    updatedFighters[index] = cast;
  }

  // 11. Win Condition & Finished State
  const aliveFighters = updatedFighters.filter((f) => f.alive);
  let winner: string | null = state.winner;
  let finished: boolean = state.finished;

  if (aliveFighters.length <= 1) {
    finished = true;
    winner = aliveFighters.length === 1 ? aliveFighters[0].id : null;
  } else if (newTime >= Math.min(config.maxDuration, rules.deterministicKoAt)) {
    finished = true;
    // Tie breaker based on highest HP, then stable roster order (never a random draw at 120s).
    if (updatedFighters[0].hp > updatedFighters[1].hp) {
      winner = updatedFighters[0].id;
    } else if (updatedFighters[1].hp > updatedFighters[0].hp) {
      winner = updatedFighters[1].id;
    } else {
      const damageA = (state.statistics.fighters[updatedFighters[0].id]?.damageDone ?? 0) + (dealt.get(updatedFighters[0].id) ?? 0);
      const damageB = (state.statistics.fighters[updatedFighters[1].id]?.damageDone ?? 0) + (dealt.get(updatedFighters[1].id) ?? 0);
      if (damageA !== damageB) winner = damageA > damageB ? updatedFighters[0].id : updatedFighters[1].id;
      else winner = updatedFighters[Math.abs(config.seed) % updatedFighters.length].id;
    }
    newEvents.push({ type: 'time_limit_ko', frame: resultingFrame, time: newTime, winnerId: winner });
  }

  if (finished && !state.finished) {
    newEvents.push({ type: 'winner', frame: resultingFrame, time: newTime, winnerId: winner });
  }

  const newState: BattleState = {
    frame: resultingFrame,
    time: newTime,
    dt,
    fighters: updatedFighters,
    projectiles: newProjectiles,
    events: newEvents,
    rng,
    hitRegistry,
    statistics: updateStatistics(state.statistics, newEvents, {
      fighters: updatedFighters,
      time: newTime,
      meleeConfig: config.melee,
      rangedConfig: config.ranged,
    }),
    winner,
    finished,
    suddenDeathPhase: sd.phase,
    nextProjectileId,
    zones,
    summons,
    nextEffectId,
  };

  return newState;
}

export function simulateBattle(config: BattleConfig, frameCount: number): BattleState {
  let state = createBattle(config);
  for (let i = 0; i < frameCount; i++) {
    state = stepBattle(state, config);
    if (state.finished) break;
  }
  return state;
}

export function getStateAtFrame(config: BattleConfig, targetFrame: number): BattleState {
  let state = createBattle(config);
  while (state.frame < targetFrame && !state.finished) {
    state = stepBattle(state, config);
  }
  return state;
}
