import * as PIXI from 'pixi.js';
import { BattleState } from '../engine/battle-state';
import { BattleConfig } from '../engine/battle-config';
import { MeleeWeaponState } from '../engine/melee-weapon';
import { RangedWeaponState } from '../engine/ranged-weapon';
import { getMeleeWeaponGripPosition, getMeleeWeaponHitbox, getMeleeWeaponPosition, getMeleeWeaponSpriteRotation, getMeleeWeaponSpriteSize } from '../engine/melee-weapon';
import { getRangedWeaponPosition } from '../engine/ranged-weapon';
import { Vec2 } from '../engine/vector';
import { getCountry } from '../data/countries';
import { getBattleRules, getEffectiveArena } from '../engine/battle-rules';

import { deriveVisualEffects } from './visual-effects';
import { BattleRenderer } from './battle-renderer';

export class PixiBattleRenderer implements BattleRenderer {
  private app: PIXI.Application | null = null;
  private canvas: HTMLCanvasElement | null = null;

  // Lifecycle state flags to prevent async race conditions
  private isInitializing = false;
  private isInitialized = false;
  private destroyRequested = false;
  private isDestroyed = false;
  private initPromise: Promise<void> | null = null;

  // Scene Containers
  private rootContainer: PIXI.Container | null = null;
  private arenaContainer: PIXI.Container | null = null;
  private trailsGraphics: PIXI.Graphics | null = null;
  private particlesGraphics: PIXI.Graphics | null = null;
  private projectilesGraphics: PIXI.Container | null = null;
  private impactsGraphics: PIXI.Graphics | null = null;
  private fightersContainer: PIXI.Container | null = null;
  private uiContainer: PIXI.Container | null = null;
  private overlayContainer: PIXI.Container | null = null;

  // Dynamic visual effect states
  private damageNumbers: ReturnType<typeof deriveVisualEffects>['damageNumbers'] = [];
  private particles: ReturnType<typeof deriveVisualEffects>['particles'] = [];
  private hitImpacts: ReturnType<typeof deriveVisualEffects>['hitImpacts'] = [];

  // Texture cache for user uploaded images
  private textureCache = new Map<string, PIXI.Texture>();

  /**
   * Whether the renderer is fully initialized and safe to render with.
   */
  public get isReady(): boolean {
    return this.isInitialized && !this.destroyRequested && !this.isDestroyed && this.app !== null;
  }

  public async init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void> {
    // If destroy was already requested or completed, abort immediately
    if (this.destroyRequested || this.isDestroyed) {
      return;
    }

    // If already initialized, do not re-initialize
    if (this.isInitialized) {
      return;
    }

    // If currently initializing, return existing in-flight promise
    if (this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.canvas = canvas;

    this.initPromise = (async () => {
      const app = new PIXI.Application();
      this.app = app;

      try {
        await app.init({
          canvas,
          width,
          height,
          antialias: true,
          preference: 'webgl',
          preserveDrawingBuffer: true,
          resolution: 1,
          autoStart: false, // Manual frame-driven rendering for deterministic video and preview
          background: '#090d16',
        });
      } catch (err) {
        this.isInitializing = false;
        this.isDestroyed = true;
        this.app = null;
        this.canvas = null;
        if (!this.destroyRequested) throw err;
        return;
      }

      // If destroy was requested while app.init(...) was awaiting,
      // app.init() is now complete so it is finally safe to destroy the Pixi application!
      if (this.destroyRequested || this.isDestroyed) {
        this.cleanupApplication();
        return;
      }

      // Safe to attach scene graph now that initialization has completed and was not cancelled
      this.rootContainer = new PIXI.Container();
      app.stage.addChild(this.rootContainer);

      this.arenaContainer = new PIXI.Container();
      this.trailsGraphics = new PIXI.Graphics();
      this.particlesGraphics = new PIXI.Graphics();
      this.projectilesGraphics = new PIXI.Container();
      this.fightersContainer = new PIXI.Container();
      this.impactsGraphics = new PIXI.Graphics();
      this.uiContainer = new PIXI.Container();
      this.overlayContainer = new PIXI.Container();

      this.rootContainer.addChild(this.arenaContainer);
      this.rootContainer.addChild(this.trailsGraphics);
      this.rootContainer.addChild(this.particlesGraphics);
      this.rootContainer.addChild(this.projectilesGraphics);
      this.rootContainer.addChild(this.fightersContainer);
      this.rootContainer.addChild(this.impactsGraphics);
      this.rootContainer.addChild(this.uiContainer);
      this.rootContainer.addChild(this.overlayContainer);

      this.isInitializing = false;
      this.isInitialized = true;
    })();

    return this.initPromise;
  }

  public resize(width: number, height: number): void {
    if (!this.isReady || !this.app?.renderer) {
      return;
    }
    this.app.renderer.resize(width, height);
  }

  /**
   * Idempotently destroys the renderer and its PixiJS application.
   * If app.init() is currently in progress, defers destruction until app.init() completes.
   */
  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.destroyRequested = true;

    // If initialization is still in progress, do NOT destroy the app yet.
    // PixiJS v8 Application must never have destroy() called while init() is pending.
    // The post-await check in init() will safely invoke cleanupApplication() once init resolves.
    if (this.isInitializing) {
      return;
    }

    this.cleanupApplication();
  }

  private cleanupApplication(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isInitialized = false;
    this.isInitializing = false;
    this.isDestroyed = true;
    this.destroyRequested = true;

    if (this.rootContainer) {
      try {
        this.rootContainer.destroy({ children: true });
      } catch {
        // ignore
      }
      this.rootContainer = null;
    }
    this.arenaContainer = null;
    this.trailsGraphics = null;
    this.particlesGraphics = null;
    this.projectilesGraphics = null;
    this.impactsGraphics = null;
    this.fightersContainer = null;
    this.uiContainer = null;
    this.overlayContainer = null;

    if (this.app) {
      try {
        // removeView: false ensures we do NOT detach React's canvas element from the DOM
        this.app.destroy({ removeView: false }, { children: true, texture: false });
      } catch (e) {
        console.warn('Error during Pixi application destroy:', e);
      }
      this.app = null;
    }

    this.canvas = null;
    this.textureCache.clear();
    this.damageNumbers = [];
    this.particles = [];
    this.hitImpacts = [];
  }

  /**
   * Loads or retrieves a cached texture from an image URL / SVG data.
   */
  public async getTexture(url: string): Promise<PIXI.Texture | null> {
    if (!url) return null;
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }
    try {
      const texture = await PIXI.Assets.load(url);
      this.textureCache.set(url, texture);
      return texture;
    } catch {
      return null;
    }
  }

  /** All render-time images are local public assets and are ready before frame zero. */
  public async preload(config: BattleConfig, resolveAsset: (url: string) => string = (url) => url): Promise<void> {
    const urls = config.fighters.flatMap((fighter) => {
      const country = getCountry(fighter.countryId);
      return country ? [country.assets.flag, country.assets.weapon, country.assets.ultimate, country.assets.projectile] : [];
    });
    await Promise.all([...new Set(urls)].map(async (url) => {
      const texture = await this.getTexture(resolveAsset(url));
      if (texture) this.textureCache.set(url, texture);
    }));
  }

  /**
   * Deterministically renders a single frame from the BattleState.
   * Both Live Preview and Remotion call this exact method.
   */
  public render(state: BattleState, config: BattleConfig, history: readonly BattleState[] = [state]): void {
    if (!this.isReady || !this.app || !this.rootContainer) return;

    const effects = deriveVisualEffects(history, state.frame, config);
    this.damageNumbers = effects.damageNumbers;
    this.particles = effects.particles;
    this.hitImpacts = effects.hitImpacts;

    // 1. Camera Shake calculation
    let shakeX = 0;
    let shakeY = 0;
    if (config.effects.cameraShake) {
      const recentHits = state.events.filter((e) => e.type === 'hit');
      const recentKO = state.events.some((e) => e.type === 'kill');
      let intensity = 0;
      if (recentKO) intensity = 12;
      else if (recentHits.length > 0) intensity = 4;

      if (intensity > 0) {
        // Deterministic pseudo-noise shake based on frame
        const angle = (state.frame * 23.456) % (Math.PI * 2);
        shakeX = Math.cos(angle) * intensity;
        shakeY = Math.sin(angle) * intensity;
      }
    }
    this.rootContainer.position.set(0, 0);
    const worldLayers: Array<PIXI.Container | PIXI.Graphics | null> = [
      this.arenaContainer, this.trailsGraphics, this.particlesGraphics, this.projectilesGraphics,
      this.fightersContainer, this.impactsGraphics,
    ];
    for (const layer of worldLayers) {
      if (!layer) continue;
      layer.pivot.set(0, 0);
      layer.position.set(shakeX, shakeY);
      layer.scale.set(1);
    }

    // 2. Render Arena Background & Grid
    this.drawArena(config, state);

    // 3. Render Trails
    this.drawTrails(state, config);

    // 4. Render Particles
    this.drawParticles(state.frame, config.fps);

    // 5. Render Projectiles
    this.drawProjectiles(state, config);

    // 6. Render Fighters & Weapons
    this.drawFighters(state, config);

    // 6.5 Draw impact rings above the countryballs, so a hit is readable.
    this.drawHitImpacts(state.frame);

    // 7. Render Damage Numbers & HUD Overlay
    this.drawUI(state, config);

    // 8. Render Winner Banner if battle finished
    this.drawWinnerBanner(state, config);

    // Trigger deterministic Pixi canvas render
    this.app.render();
  }

  private drawArena(config: BattleConfig, state: BattleState): void {
    if (!this.arenaContainer) return;
    for (const child of this.arenaContainer.removeChildren()) child.destroy({ children: true });

    const g = new PIXI.Graphics();
    const { x, y, width, height } = getEffectiveArena(config.arena, state.time, getBattleRules(config));

    // Arena background gradient/fill
    g.rect(x, y, width, height).fill({ color: 0x0c101c });

    // Cyberpunk grid pattern
    const gridSize = 60;
    g.beginPath();
    for (let gx = x; gx <= x + width; gx += gridSize) {
      g.moveTo(gx, y).lineTo(gx, y + height);
    }
    for (let gy = y; gy <= y + height; gy += gridSize) {
      g.moveTo(x, gy).lineTo(x + width, gy);
    }
    g.stroke({ width: 1, color: 0x1a233a, alpha: 0.4 });

    // Center circular arena ring
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    g.circle(centerX, centerY, Math.min(width, height) * 0.25).stroke({
      width: 2,
      color: 0x1f2e4d,
      alpha: 0.6,
    });
    g.circle(centerX, centerY, 8).fill({ color: 0x3b82f6, alpha: 0.5 });

    // Arena glowing border
    const isSuddenDeath = state.suddenDeathPhase > 0;
    const borderColor = isSuddenDeath ? 0xe74c3c : 0x00d2d3;
    const borderAlpha = isSuddenDeath
      ? 0.7 + Math.sin(state.frame * 0.15) * 0.3
      : 0.8;

    g.rect(x + 2, y + 2, width - 4, height - 4).stroke({
      width: 4,
      color: borderColor,
      alpha: borderAlpha,
    });

    // Corner accent brackets
    const bracketSize = 30;
    g.moveTo(x, y + bracketSize).lineTo(x, y).lineTo(x + bracketSize, y);
    g.moveTo(x + width - bracketSize, y).lineTo(x + width, y).lineTo(x + width, y + bracketSize);
    g.moveTo(x, y + height - bracketSize).lineTo(x, y + height).lineTo(x + bracketSize, y + height);
    g.moveTo(x + width - bracketSize, y + height).lineTo(x + width, y + height).lineTo(x + width, y + height - bracketSize);
    g.stroke({ width: 5, color: borderColor, alpha: 1.0 });

    this.arenaContainer.addChild(g);
  }

  private drawTrails(state: BattleState, config: BattleConfig): void {
    if (!this.trailsGraphics) return;
    this.trailsGraphics.clear();
    if (!config.effects.trails) return;

    // Melee weapon motion arc trail
    const fMelee = state.fighters.find((f) => f.type === 'melee' && f.alive);
    if (fMelee) {
      const mw = fMelee.weapon as MeleeWeaponState;
      const angle = mw.angle;
      const arcLength = 0.8; // arc length in radians
      const segments = 10;

      for (let i = 0; i < segments; i++) {
        const t0 = angle - (arcLength * i) / segments;
        const t1 = angle - (arcLength * (i + 1)) / segments;
        const p0x = fMelee.pos.x + Math.cos(t0) * config.melee.orbitRadius;
        const p0y = fMelee.pos.y + Math.sin(t0) * config.melee.orbitRadius;
        const p1x = fMelee.pos.x + Math.cos(t1) * config.melee.orbitRadius;
        const p1y = fMelee.pos.y + Math.sin(t1) * config.melee.orbitRadius;
        const alpha = (1 - i / segments) * 0.6;

        this.trailsGraphics
          .moveTo(p0x, p0y)
          .lineTo(p1x, p1y)
          .stroke({ width: config.melee.weaponRadius * 1.5, color: 0xff9f43, alpha });
      }
    }

    // Projectile motion trails
    for (const p of state.projectiles) {
      const len = 30;
      const speed = Math.max(1, Math.hypot(p.vel.x, p.vel.y));
      const backX = p.pos.x - (p.vel.x / speed) * len;
      const backY = p.pos.y - (p.vel.y / speed) * len;
      const owner = state.fighters.find((fighter) => fighter.id === p.ownerId);
      const country = getCountry(owner?.countryId);
      const color = country ? Number.parseInt(country.colors.primary.slice(1), 16) : 0x00d2d3;

      this.trailsGraphics
        .moveTo(p.pos.x, p.pos.y)
        .lineTo(backX, backY)
        .stroke({ width: p.visual === 'weapon' ? Math.max(2, p.radius * 0.8) : p.radius * 1.4, color, alpha: 0.55 });
    }
  }

  private drawParticles(frame: number, fps: number): void {
    if (!this.particlesGraphics) return;
    this.particlesGraphics.clear();

    for (const p of this.particles) {
      const age = frame - p.startFrame;
      const progress = age / p.lifeFrames;
      const currentX = p.x + (p.vx * age) / fps;
      const currentY = p.y + (p.vy * age) / fps;
      const currentAlpha = 1 - progress;
      const currentSize = p.size * (1 - progress * 0.5);

      this.particlesGraphics
        .circle(currentX, currentY, currentSize)
        .fill({ color: p.color, alpha: currentAlpha });
    }
  }

  private drawProjectiles(state: BattleState, config: BattleConfig): void {
    if (!this.projectilesGraphics) return;
    for (const child of this.projectilesGraphics.removeChildren()) child.destroy({ children: true });

    for (const p of state.projectiles) {
      const owner = state.fighters.find((fighter) => fighter.id === p.ownerId);
      const country = getCountry(owner?.countryId);
      const color = country ? Number.parseInt(country.colors.primary.slice(1), 16) : 0x48dbfb;
      const projectile = new PIXI.Container();
      projectile.position.set(p.pos.x, p.pos.y);
      projectile.rotation = Math.atan2(p.vel.y, p.vel.x);

      if (config.effects.glow) {
        const glow = new PIXI.Graphics().circle(0, 0, p.radius * 2.4).fill({ color, alpha: 0.28 });
        projectile.addChild(glow);
      }

      if (p.visual === 'weapon' && country) {
        const texture = this.textureCache.get(country.assets.projectile) ?? this.textureCache.get(country.assets.weapon);
        if (texture) {
          const sprite = new PIXI.Sprite(texture);
          sprite.anchor.set(0.5);
          const size = Math.max(34, p.radius * 5.5);
          const ratio = texture.width > 0 && texture.height > 0 ? texture.width / texture.height : 1;
          sprite.width = ratio >= 1 ? size : size * ratio;
          sprite.height = ratio >= 1 ? size / ratio : size;
          sprite.rotation = state.frame * 0.32 * (p.phase === 'returning' ? -1 : 1) - projectile.rotation;
          projectile.addChild(sprite);
        }
      } else if (p.visual === 'arrow') {
        const arrow = new PIXI.Graphics();
        arrow.moveTo(-p.radius * 2.8, 0).lineTo(p.radius * 2.1, 0).stroke({ width: Math.max(3, p.radius * 0.55), color: 0xf8fafc });
        arrow.moveTo(p.radius * 2.1, 0).lineTo(p.radius * 0.7, -p.radius).lineTo(p.radius * 0.7, p.radius).closePath().fill({ color });
        arrow.moveTo(-p.radius * 2.4, 0).lineTo(-p.radius * 1.4, -p.radius * 0.8)
          .moveTo(-p.radius * 2.4, 0).lineTo(-p.radius * 1.4, p.radius * 0.8).stroke({ width: 2, color });
        projectile.addChild(arrow);
      } else if (p.visual === 'bullet') {
        const bullet = new PIXI.Graphics();
        bullet.roundRect(-p.radius * 1.6, -p.radius * 0.65, p.radius * 3.2, p.radius * 1.3, p.radius * 0.6).fill({ color: 0xfbbf24 }).stroke({ width: 2, color: 0xffffff });
        projectile.addChild(bullet);
      } else if (p.visual === 'shuriken') {
        const star = new PIXI.Graphics();
        for (let point = 0; point < 8; point++) {
          const angle = (point * Math.PI) / 4;
          const radius = point % 2 === 0 ? p.radius * 2.2 : p.radius * 0.65;
          const x = Math.cos(angle) * radius; const y = Math.sin(angle) * radius;
          if (point === 0) star.moveTo(x, y); else star.lineTo(x, y);
        }
        star.closePath().fill({ color: 0xd1d5db }).stroke({ width: 2, color: 0x111827 });
        star.rotation = state.frame * 0.35 - projectile.rotation;
        projectile.addChild(star);
      } else {
        const core = new PIXI.Graphics();
        core.circle(0, 0, p.radius).fill({ color });
        core.circle(0, 0, p.radius * 0.45).fill({ color: 0xffffff });
        projectile.addChild(core);
      }
      this.projectilesGraphics.addChild(projectile);
    }
  }

  private drawFighters(state: BattleState, config: BattleConfig): void {
    if (!this.fightersContainer) return;
    for (const child of this.fightersContainer.removeChildren()) child.destroy({ children: true });

    this.drawAbilityObjects(state);

    for (const f of state.fighters) {
      if (!f.alive) continue;

      const fg = new PIXI.Graphics();
      const isMelee = f.type === 'melee';
      const baseColor = isMelee ? 0xee5253 : 0x0abde3;
      const glowColor = isMelee ? 0xff6b6b : 0x48dbfb;
      const country = getCountry(f.countryId);
      const stealthAlpha = f.stealthUntil > state.time ? 0.18 : 1;

      // History-derived impacts persist across several frames and survive seeks.
      const hitImpact = this.hitImpacts.find((impact) => impact.targetId === f.id);
      const isHit = hitImpact !== undefined;

      // Outer glow ring
      if (config.effects.glow) {
        fg.circle(f.pos.x, f.pos.y, f.radius + 6).fill({
          color: glowColor,
          alpha: 0.2,
        });
      }

      // Fighter circle body
      const fillColor = isHit && config.effects.hitFlash ? 0xffffff : baseColor;
      fg.circle(f.pos.x, f.pos.y, f.radius).fill({ color: fillColor });
      fg.circle(f.pos.x, f.pos.y, f.radius).stroke({
        width: 3,
        color: 0xffffff,
        alpha: 0.8,
      });

      // Countryball: local SVG flag clipped by a circular mask with programmatic eyes.
      if (country) {
        this.fightersContainer.addChild(fg);
        const flagTexture = this.textureCache.get(country.assets.flag);
        if (flagTexture) {
          const ball = new PIXI.Container();
          ball.position.set(f.pos.x, f.pos.y); ball.alpha = stealthAlpha;
          const flag = new PIXI.Sprite(flagTexture); flag.anchor.set(0.5); flag.width = f.radius * 1.9; flag.height = f.radius * 1.9;
          const mask = new PIXI.Graphics().circle(0, 0, f.radius * 0.95).fill({ color: 0xffffff });
          flag.mask = mask; ball.addChild(flag, mask); this.fightersContainer.addChild(ball);
        }
        if (isHit && config.effects.hitFlash) {
          const age = state.frame - hitImpact.startFrame;
          const alpha = (1 - age / hitImpact.lifeFrames) * 0.48;
          const reaction = new PIXI.Graphics().circle(f.pos.x, f.pos.y, f.radius * 0.95).fill({ color: 0xffffff, alpha });
          this.fightersContainer.addChild(reaction);
        }
        const eyes = new PIXI.Graphics();
        const lookingRight = f.vel.x >= 0; const eyeShift = lookingRight ? 2 : -2;
        eyes.ellipse(f.pos.x - f.radius * 0.32, f.pos.y - f.radius * 0.1, f.radius * 0.19, f.radius * 0.28).fill({ color: 0xffffff });
        eyes.ellipse(f.pos.x + f.radius * 0.32, f.pos.y - f.radius * 0.1, f.radius * 0.19, f.radius * 0.28).fill({ color: 0xffffff });
        eyes.circle(f.pos.x - f.radius * 0.32 + eyeShift, f.pos.y - f.radius * 0.06, f.radius * 0.07).fill({ color: 0x111827 });
        eyes.circle(f.pos.x + f.radius * 0.32 + eyeShift, f.pos.y - f.radius * 0.06, f.radius * 0.07).fill({ color: 0x111827 });
        eyes.alpha = stealthAlpha; this.fightersContainer.addChild(eyes);
      }

      // Letter indicator ('A' or 'B')
      const letter = isMelee ? 'A' : 'B';
      const textStyle = new PIXI.TextStyle({
        fontFamily: 'sans-serif',
        fontSize: f.radius * 0.9,
        fontWeight: 'bold',
        fill: '#ffffff',
      });
      const letterText = new PIXI.Text({ text: letter, style: textStyle });
      letterText.anchor.set(0.5);
      letterText.position.set(f.pos.x, f.pos.y);

      // Smooth circular HP ring
      const hpFraction = Math.max(0, f.hp / f.maxHp);
      const ringRadius = f.radius + 4;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + hpFraction * Math.PI * 2;

      fg.moveTo(f.pos.x, f.pos.y - ringRadius);
      fg.arc(f.pos.x, f.pos.y, ringRadius, startAngle, endAngle).stroke({
        width: 3,
        color: hpFraction > 0.3 ? 0x10b981 : 0xef4444,
        alpha: 0.9,
      });
      const chargeRequired = country?.ultimateSpec.chargeRequired ?? 100;
      const ultimateFraction = Math.max(0, Math.min(1, f.ultimateCharge / chargeRequired));
      fg.arc(f.pos.x, f.pos.y, f.radius + 9, startAngle, startAngle + ultimateFraction * Math.PI * 2).stroke({ width: 3, color: ultimateFraction >= 1 ? 0xfde047 : 0xa855f7, alpha: 0.95 });
      if (f.shield > 0) fg.circle(f.pos.x, f.pos.y, f.radius + 13).stroke({ width: 4, color: 0x67e8f9, alpha: 0.75 });
      if (f.ultimateStatus === 'casting') {
        const pulse = 0.72 + Math.sin(state.frame * 0.55) * 0.22;
        fg.circle(f.pos.x, f.pos.y, f.radius + 19).stroke({ width: 6, color: 0xfde047, alpha: pulse });
      }

      // Name & HP text above fighter
      const nameStyle = new PIXI.TextStyle({
        fontFamily: 'sans-serif',
        fontSize: Math.max(20, f.radius * 0.34),
        fill: '#ffffff',
      });
      const nameText = new PIXI.Text({
        text: `${f.name} (${Math.ceil(f.hp)})`,
        style: nameStyle,
      });
      nameText.anchor.set(0.5, 1);
      nameText.position.set(f.pos.x, Math.max(32, f.pos.y - f.radius - 10));

      if (!country) this.fightersContainer.addChild(fg);
      if (!country) this.fightersContainer.addChild(letterText);
      this.fightersContainer.addChild(nameText);

      // Render Weapons
      this.drawWeapon(f, config, fg, state);

      if (country && (f.ultimateStatus === 'casting' || state.events.some((event) => event.type === 'ultimate_cast' && event.fighterId === f.id))) {
        const texture = this.textureCache.get(country.assets.ultimate);
        if (texture) {
          const sprite = new PIXI.Sprite(texture); sprite.anchor.set(0.5); sprite.position.set(f.pos.x, f.pos.y - f.radius * 2.4);
          sprite.width = f.radius * 3; sprite.height = f.radius * 3; sprite.alpha = 0.9; this.fightersContainer.addChild(sprite);
        }
      }
    }
  }

  private drawHitImpacts(frame: number): void {
    if (!this.impactsGraphics) return;
    this.impactsGraphics.clear();
    for (const impact of this.hitImpacts) {
      const age = frame - impact.startFrame;
      const progress = age / impact.lifeFrames;
      const alpha = (1 - progress) * 0.9;
      const radius = 8 + age * 2.1;
      this.impactsGraphics.circle(impact.x, impact.y, radius).stroke({ width: 3 - progress, color: impact.color, alpha });
      this.impactsGraphics.circle(impact.x, impact.y, Math.max(2, 7 - age * 0.35)).fill({ color: 0xffffff, alpha: alpha * 0.65 });
      this.impactsGraphics.moveTo(impact.x - radius - 5, impact.y).lineTo(impact.x + radius + 5, impact.y)
        .moveTo(impact.x, impact.y - radius - 5).lineTo(impact.x, impact.y + radius + 5)
        .stroke({ width: 1.5, color: 0xffffff, alpha: alpha * 0.75 });
    }
  }

  private drawAbilityObjects(state: BattleState): void {
    if (!this.fightersContainer) return;
    for (const zone of state.zones) {
      const owner = state.fighters.find((fighter) => fighter.id === zone.ownerId);
      const country = getCountry(owner?.countryId); const graphics = new PIXI.Graphics();
      const zoneColor = country ? Number.parseInt(country.colors.primary.slice(1), 16) : 0xa855f7;
      const zoneRingColor = country ? Number.parseInt(country.colors.secondary.slice(1), 16) : 0xc084fc;
      graphics.circle(zone.pos.x, zone.pos.y, zone.radius).fill({ color: zoneColor, alpha: 0.1 }).stroke({ color: zoneRingColor, width: 5, alpha: 0.55 });
      this.fightersContainer.addChild(graphics);
      const pulse = 0.5 + Math.sin(state.frame * 0.16) * 0.22;
      const rings = new PIXI.Graphics().circle(zone.pos.x, zone.pos.y, zone.radius * (0.84 + pulse * 0.12)).stroke({ color: zoneColor, width: 2, alpha: 0.45 });
      this.fightersContainer.addChild(rings);
      const texture = country && this.textureCache.get(country.assets.ultimate);
      if (texture) { const sprite = new PIXI.Sprite(texture); sprite.anchor.set(0.5); sprite.position.set(zone.pos.x, zone.pos.y); sprite.width = zone.radius * 1.15; sprite.height = zone.radius * 1.15; sprite.alpha = 0.34; this.fightersContainer.addChild(sprite); }
    }
    for (const summon of state.summons) {
      const owner = state.fighters.find((fighter) => fighter.id === summon.ownerId); const country = getCountry(owner?.countryId);
      const texture = country && this.textureCache.get(country.assets.ultimate);
      const velocity = summon.vel ?? { x: 1, y: 0 };
      const angle = Math.atan2(velocity.y, velocity.x);
      const alivePulse = 1 + Math.sin(state.frame * 0.28 + summon.pos.x * 0.01) * 0.08;
      if (summon.phase === 'marker') {
        const targetPulse = 0.78 + Math.sin(state.frame * 0.34) * 0.18;
        const markerColor = country ? Number.parseInt(country.colors.primary.slice(1), 16) : 0xf97316;
        const markerAccent = country ? Number.parseInt(country.colors.secondary.slice(1), 16) : 0xfde047;
        const marker = new PIXI.Graphics();
        marker.circle(summon.pos.x, summon.pos.y, 38 * targetPulse).stroke({ color: markerColor, width: 4, alpha: 0.9 });
        marker.moveTo(summon.pos.x - 52, summon.pos.y).lineTo(summon.pos.x + 52, summon.pos.y).moveTo(summon.pos.x, summon.pos.y - 52).lineTo(summon.pos.x, summon.pos.y + 52).stroke({ color: markerAccent, width: 2, alpha: 0.72 });
        this.fightersContainer.addChild(marker);
      }
      if (texture) {
        const sprite = new PIXI.Sprite(texture); sprite.anchor.set(0.5); sprite.position.set(summon.pos.x, summon.pos.y);
        sprite.rotation = summon.phase === 'marker' ? state.frame * 0.025 : angle - Math.PI / 4;
        sprite.width = 155 * alivePulse; sprite.height = 155 * alivePulse; sprite.alpha = 0.82; this.fightersContainer.addChild(sprite);
        if (summon.phase !== 'marker') {
          const trail = new PIXI.Graphics();
          trail.moveTo(summon.pos.x - Math.cos(angle) * 72, summon.pos.y - Math.sin(angle) * 72).lineTo(summon.pos.x - Math.cos(angle) * 155, summon.pos.y - Math.sin(angle) * 155).stroke({ color: 0xfde68a, width: 7, alpha: 0.18 });
          this.fightersContainer.addChild(trail);
        }
      }
    }
    const caster = state.fighters.find((fighter) => fighter.ultimateStatus === 'casting');
    const casterCountry = getCountry(caster?.countryId);
    if (caster && casterCountry) {
      const telegraph = new PIXI.Graphics();
      const pattern = casterCountry.ultimatePattern;
      const target = state.fighters.find((fighter) => fighter.alive && fighter.id !== caster.id);
      const angle = caster.type === 'ranged'
        ? (caster.weapon as RangedWeaponState).angle
        : target ? Math.atan2(target.pos.y - caster.pos.y, target.pos.x - caster.pos.x) : Math.atan2(caster.vel.y, caster.vel.x);
      const primary = Number.parseInt(casterCountry.colors.primary.slice(1), 16);
      const secondary = Number.parseInt(casterCountry.colors.secondary.slice(1), 16);

      if (pattern === 'garuda_strike') {
        // Indonesia: Garuda's wings sweep open behind the caster before the dive.
        const spread = 0.85;
        for (const wing of [-1, 1]) {
          const wingAngle = angle + wing * spread;
          telegraph.moveTo(caster.pos.x, caster.pos.y)
            .quadraticCurveTo(
              caster.pos.x + Math.cos(wingAngle) * 90 - Math.sin(angle) * wing * 40,
              caster.pos.y + Math.sin(wingAngle) * 90 + Math.cos(angle) * wing * 40,
              caster.pos.x + Math.cos(wingAngle) * 170,
              caster.pos.y + Math.sin(wingAngle) * 170,
            )
            .stroke({ color: primary, width: 6, alpha: 0.65 });
        }
        telegraph.moveTo(caster.pos.x, caster.pos.y).lineTo(caster.pos.x + Math.cos(angle) * 220, caster.pos.y + Math.sin(angle) * 220).stroke({ color: secondary, width: 4, alpha: 0.7 });
      } else if (pattern === 'hwacha_rain') {
        // Korea: a fan of thin rocket-trail lines rising toward the target, echoing the multi-strike volley.
        const rocketCount = 5;
        for (let i = 0; i < rocketCount; i++) {
          const spreadAngle = angle - Math.PI / 2 + (i / (rocketCount - 1) - 0.5) * 0.9;
          const originX = caster.pos.x + (i - (rocketCount - 1) / 2) * 18;
          telegraph.moveTo(originX, caster.pos.y + 20)
            .lineTo(originX + Math.cos(spreadAngle) * 200, caster.pos.y + Math.sin(spreadAngle) * 200)
            .stroke({ color: i % 2 === 0 ? primary : secondary, width: 3, alpha: 0.6 });
        }
      } else if (pattern === 'frost_ring') {
        // Russia: a jagged ring of ice spikes instead of a plain circle.
        const radius = casterCountry.ultimateSpec.radius || 150;
        telegraph.circle(caster.pos.x, caster.pos.y, radius * 0.7).stroke({ color: secondary, width: 3, alpha: 0.55 });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const bx = caster.pos.x + Math.cos(a) * radius * 0.7, by = caster.pos.y + Math.sin(a) * radius * 0.7;
          telegraph.moveTo(bx, by).lineTo(bx + Math.cos(a) * 26, by + Math.sin(a) * 26).stroke({ color: primary, width: 4, alpha: 0.75 });
        }
      } else if (pattern === 'sabre_dash') {
        // Ukraine: two crossed sabre slashes forming an X down the dash line.
        for (const wing of [-1, 1]) {
          const a = angle + wing * 0.3;
          telegraph.moveTo(caster.pos.x - Math.cos(a) * 40, caster.pos.y - Math.sin(a) * 40)
            .lineTo(caster.pos.x + Math.cos(a) * 210, caster.pos.y + Math.sin(a) * 210)
            .stroke({ color: wing > 0 ? primary : secondary, width: 5, alpha: 0.65 });
        }
      } else if (pattern === 'aimed_burst') {
        // USA: a tight, precise double line — the aimed revolver volley.
        for (const offset of [-6, 6]) {
          telegraph.moveTo(caster.pos.x - Math.sin(angle) * offset, caster.pos.y + Math.cos(angle) * offset)
            .lineTo(caster.pos.x - Math.sin(angle) * offset + Math.cos(angle) * 230, caster.pos.y + Math.cos(angle) * offset + Math.sin(angle) * 230)
            .stroke({ color: primary, width: 3, alpha: 0.7 });
        }
      } else if (pattern === 'aurora_guard') {
        // Canada: rippling aurora ribbons layered across the shield.
        const radius = casterCountry.ultimateSpec.radius || 150;
        for (let band = 0; band < 3; band++) {
          const bandRadius = radius * (0.5 + band * 0.18);
          telegraph.moveTo(caster.pos.x - bandRadius, caster.pos.y);
          for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            const wave = Math.sin(t * Math.PI * 3 + state.frame * 0.15 + band) * 14;
            telegraph.lineTo(caster.pos.x - bandRadius + t * bandRadius * 2, caster.pos.y + wave - bandRadius * 0.15);
          }
          telegraph.stroke({ color: band % 2 === 0 ? primary : secondary, width: 3, alpha: 0.55 });
        }
      } else if (pattern === 'sun_strike' || pattern === 'southern_cross') {
        // Mexico's sun-stone / Australia's Southern Cross: radiant burst at the strike point.
        const spot = target ? target.pos : caster.pos;
        const rays = pattern === 'southern_cross' ? 5 : 10;
        for (let i = 0; i < rays; i++) {
          const a = (i / rays) * Math.PI * 2 + state.frame * 0.05;
          telegraph.moveTo(spot.x, spot.y).lineTo(spot.x + Math.cos(a) * 60, spot.y + Math.sin(a) * 60).stroke({ color: i % 2 === 0 ? primary : secondary, width: 3, alpha: 0.65 });
        }
        telegraph.circle(spot.x, spot.y, 22).stroke({ color: primary, width: 3, alpha: 0.8 });
      } else if (pattern === 'carnival_arc') {
        // Brazil: scattered confetti dots along the throw arc instead of a solid line.
        for (let i = 0; i < 14; i++) {
          const t = i / 13;
          const a = angle - 0.5 + t * 1.0;
          const dist = 60 + t * 170;
          telegraph.circle(caster.pos.x + Math.cos(a) * dist, caster.pos.y + Math.sin(a) * dist, 3.5).fill({ color: i % 2 === 0 ? primary : secondary, alpha: 0.75 });
        }
      } else if (pattern === 'bola_charge') {
        // Argentina: a twisted double-helix rope spiralling toward the target.
        for (let i = 0; i <= 24; i++) {
          const t = i / 24, dist = t * 210;
          const wobble = Math.sin(t * Math.PI * 5) * 16;
          const px = caster.pos.x + Math.cos(angle) * dist - Math.sin(angle) * wobble;
          const py = caster.pos.y + Math.sin(angle) * dist + Math.cos(angle) * wobble;
          telegraph.circle(px, py, 2.4).fill({ color: t < 0.5 ? primary : secondary, alpha: 0.7 });
        }
      } else if (pattern === 'excalibur_wave') {
        // UK: the wave outline forms a long sword blade silhouette.
        const len = 220, halfW = 16;
        const tip = { x: caster.pos.x + Math.cos(angle) * len, y: caster.pos.y + Math.sin(angle) * len };
        const perp = { x: -Math.sin(angle), y: Math.cos(angle) };
        telegraph.moveTo(caster.pos.x + perp.x * halfW, caster.pos.y + perp.y * halfW)
          .lineTo(tip.x, tip.y)
          .lineTo(caster.pos.x - perp.x * halfW, caster.pos.y - perp.y * halfW)
          .stroke({ color: secondary, width: 3, alpha: 0.65 });
        telegraph.moveTo(caster.pos.x, caster.pos.y).lineTo(tip.x, tip.y).stroke({ color: primary, width: 2, alpha: 0.8 });
      } else if (pattern === 'armada_broadside') {
        // France & Spain: parallel musket-line volleys — France tight (3), Spain wide (5).
        const lines = casterCountry.id === 'fr' ? 3 : 5;
        const spacing = casterCountry.id === 'fr' ? 10 : 18;
        for (let i = 0; i < lines; i++) {
          const offset = (i - (lines - 1) / 2) * spacing;
          const ox = caster.pos.x - Math.sin(angle) * offset, oy = caster.pos.y + Math.cos(angle) * offset;
          telegraph.moveTo(ox, oy).lineTo(ox + Math.cos(angle) * 230, oy + Math.sin(angle) * 230).stroke({ color: i % 2 === 0 ? primary : secondary, width: 3, alpha: 0.6 });
        }
      } else if (pattern === 'clockwork_overdrive') {
        // Germany: a spinning gear ring around the boosted fighter.
        const r = 46;
        telegraph.circle(caster.pos.x, caster.pos.y, r).stroke({ color: primary, width: 4, alpha: 0.7 });
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + state.frame * 0.08;
          const bx = caster.pos.x + Math.cos(a) * r, by = caster.pos.y + Math.sin(a) * r;
          telegraph.moveTo(bx, by).lineTo(bx + Math.cos(a) * 14, by + Math.sin(a) * 14).stroke({ color: secondary, width: 4, alpha: 0.75 });
        }
      } else if (pattern === 'legion_lunge') {
        // Italy: a Roman shield-wall of tick marks flanking the lunge line.
        telegraph.moveTo(caster.pos.x, caster.pos.y).lineTo(caster.pos.x + Math.cos(angle) * 210, caster.pos.y + Math.sin(angle) * 210).stroke({ color: primary, width: 4, alpha: 0.6 });
        const perp = { x: -Math.sin(angle), y: Math.cos(angle) };
        for (let i = 1; i <= 5; i++) {
          const dist = i * 38;
          const cx = caster.pos.x + Math.cos(angle) * dist, cy = caster.pos.y + Math.sin(angle) * dist;
          telegraph.moveTo(cx - perp.x * 14, cy - perp.y * 14).lineTo(cx + perp.x * 14, cy + perp.y * 14).stroke({ color: secondary, width: 3, alpha: 0.5 });
        }
      } else if (pattern === 'aegis_bulwark') {
        // Greece: concentric hexagonal hoplite-shield rings.
        for (let ring = 0; ring < 3; ring++) {
          const r = 34 + ring * 22;
          telegraph.poly(Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
            return { x: caster.pos.x + Math.cos(a) * r, y: caster.pos.y + Math.sin(a) * r };
          })).stroke({ color: ring % 2 === 0 ? primary : secondary, width: 3, alpha: 0.6 });
        }
      } else if (pattern === 'bombard_salvo') {
        // Turkey: one heavy arc with a large cannonball glowing at its end.
        telegraph.arc(caster.pos.x, caster.pos.y, 160, angle - 0.4, angle + 0.4).stroke({ color: secondary, width: 5, alpha: 0.6 });
        const bx = caster.pos.x + Math.cos(angle) * 190, by = caster.pos.y + Math.sin(angle) * 190;
        telegraph.circle(bx, by, 12).fill({ color: primary, alpha: 0.7 });
      } else if (pattern === 'time_sands') {
        // Egypt: a swirling spiral of sand particles around the caster.
        for (let i = 0; i < 26; i++) {
          const t = i / 26, a = t * Math.PI * 6 + state.frame * 0.1, r = 18 + t * 60;
          telegraph.circle(caster.pos.x + Math.cos(a) * r, caster.pos.y + Math.sin(a) * r, 2.2).fill({ color: t < 0.5 ? primary : secondary, alpha: 0.65 });
        }
      } else if (pattern === 'atlas_storm') {
        // Morocco: the widest storm fan of all the barrage patterns.
        for (let i = 0; i < 9; i++) {
          const a = angle - 0.7 + (i / 8) * 1.4;
          telegraph.moveTo(caster.pos.x, caster.pos.y).lineTo(caster.pos.x + Math.cos(a) * 220, caster.pos.y + Math.sin(a) * 220).stroke({ color: i % 2 === 0 ? primary : secondary, width: 2.5, alpha: 0.5 });
        }
      } else if (pattern === 'power_rhythm') {
        // Nigeria: pulsing drum-beat rings radiating outward from the caster.
        for (let ring = 0; ring < 3; ring++) {
          const r = 30 + ring * 26 + Math.sin(state.frame * 0.25 - ring) * 6;
          telegraph.circle(caster.pos.x, caster.pos.y, r).stroke({ color: ring % 2 === 0 ? primary : secondary, width: 3, alpha: 0.55 });
        }
      } else if (pattern === 'diamond_prism') {
        // South Africa: a rotating diamond outline with refracted color flashes.
        const r = 50, rot = state.frame * 0.06;
        telegraph.poly([0, 1, 2, 3].map((i) => {
          const a = rot + (i / 4) * Math.PI * 2;
          return { x: caster.pos.x + Math.cos(a) * r, y: caster.pos.y + Math.sin(a) * r * 1.4 };
        })).stroke({ color: primary, width: 3, alpha: 0.7 });
        telegraph.poly([0, 1, 2, 3].map((i) => {
          const a = rot + Math.PI / 4 + (i / 4) * Math.PI * 2;
          return { x: caster.pos.x + Math.cos(a) * r * 0.6, y: caster.pos.y + Math.sin(a) * r * 0.85 };
        })).stroke({ color: secondary, width: 2, alpha: 0.6 });
      } else if (pattern === 'mirage_decoy') {
        // Saudi Arabia: a shimmering, dashed heat-haze ring before the teleport.
        const r = 40 + Math.sin(state.frame * 0.3) * 6;
        for (let i = 0; i < 16; i += 2) {
          const a0 = (i / 16) * Math.PI * 2, a1 = ((i + 1) / 16) * Math.PI * 2;
          telegraph.arc(caster.pos.x, caster.pos.y, r, a0, a1).stroke({ color: i % 4 === 0 ? primary : secondary, width: 3, alpha: 0.55 });
        }
      } else if (pattern === 'returning_fan') {
        // India: a fanned mandala of chakram rings.
        for (let i = 0; i < 8; i++) {
          const a = angle - 0.6 + (i / 7) * 1.2;
          telegraph.circle(caster.pos.x + Math.cos(a) * 90, caster.pos.y + Math.sin(a) * 90, 10).stroke({ color: i % 2 === 0 ? primary : secondary, width: 2.5, alpha: 0.6 });
        }
      } else if (pattern === 'shaheen_dive') {
        // Pakistan: a single narrow falcon-wing swoop (Shaheen), tighter than Garuda's twin wings.
        const wingAngle = angle + 0.55;
        telegraph.moveTo(caster.pos.x, caster.pos.y)
          .quadraticCurveTo(caster.pos.x + Math.cos(wingAngle) * 80, caster.pos.y + Math.sin(wingAngle) * 80, caster.pos.x + Math.cos(wingAngle) * 150, caster.pos.y + Math.sin(wingAngle) * 150)
          .stroke({ color: primary, width: 5, alpha: 0.65 });
        telegraph.moveTo(caster.pos.x, caster.pos.y).lineTo(caster.pos.x + Math.cos(angle) * 230, caster.pos.y + Math.sin(angle) * 230).stroke({ color: secondary, width: 4, alpha: 0.75 });
      } else if (pattern === 'dragon_sweep') {
        // China: a long serpentine dragon-body curve sweeping across.
        telegraph.moveTo(caster.pos.x, caster.pos.y);
        for (let i = 1; i <= 24; i++) {
          const t = i / 24, dist = t * 230;
          const wobble = Math.sin(t * Math.PI * 3) * 30 * (1 - t * 0.4);
          telegraph.lineTo(caster.pos.x + Math.cos(angle) * dist - Math.sin(angle) * wobble, caster.pos.y + Math.sin(angle) * dist + Math.cos(angle) * wobble);
        }
        telegraph.stroke({ color: primary, width: 5, alpha: 0.65 });
      } else if (pattern === 'ninja_shadow') {
        // Japan: scattering shuriken crosses fading into the vanish.
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const dist = 45;
          const sx = caster.pos.x + Math.cos(a) * dist, sy = caster.pos.y + Math.sin(a) * dist;
          telegraph.moveTo(sx - 8, sy - 8).lineTo(sx + 8, sy + 8).moveTo(sx + 8, sy - 8).lineTo(sx - 8, sy + 8).stroke({ color: i % 2 === 0 ? primary : secondary, width: 2.5, alpha: 0.55 });
        }
      } else if (pattern === 'monsoon_cross') {
        // Thailand: a cross-shaped burst of monsoon rain lines.
        for (const dir of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
          telegraph.moveTo(caster.pos.x, caster.pos.y).lineTo(caster.pos.x + dir.x * 150, caster.pos.y + dir.y * 150).stroke({ color: dir.x !== 0 ? primary : secondary, width: 4, alpha: 0.55 });
        }
      } else if (pattern === 'magic_crossbow') {
        // Vietnam: converging crossbow bolt lines drawing in toward the firing point.
        for (let i = 0; i < 5; i++) {
          const a = angle - 0.4 + (i / 4) * 0.8;
          telegraph.moveTo(caster.pos.x + Math.cos(a) * 190, caster.pos.y + Math.sin(a) * 190).lineTo(caster.pos.x, caster.pos.y).stroke({ color: i % 2 === 0 ? primary : secondary, width: 2.5, alpha: 0.55 });
        }
      } else if (pattern === 'ghost_cavalry') {
        // Mongolia: a dashed hoofprint arc trailing behind the archer volley.
        for (let i = 0; i < 10; i += 2) {
          const a0 = angle - 0.7 + (i / 10) * 1.4, a1 = angle - 0.7 + ((i + 1) / 10) * 1.4;
          telegraph.arc(caster.pos.x, caster.pos.y, 130, a0, a1).stroke({ color: i % 4 === 0 ? primary : secondary, width: 4, alpha: 0.55 });
        }
      } else if (pattern === 'aotearoa_gust') {
        // New Zealand: curling silver-fern fronds spiralling outward.
        for (const side of [-1, 1]) {
          telegraph.moveTo(caster.pos.x, caster.pos.y);
          for (let i = 1; i <= 18; i++) {
            const t = i / 18, a = angle + side * t * 1.6, r = t * 140;
            telegraph.lineTo(caster.pos.x + Math.cos(a) * r, caster.pos.y + Math.sin(a) * r);
          }
          telegraph.stroke({ color: side > 0 ? primary : secondary, width: 3, alpha: 0.55 });
        }
      } else if (pattern === 'fjord_charge') {
        // Norway: a longship's triangular prow wedge leading the charge.
        const tip = { x: caster.pos.x + Math.cos(angle) * 200, y: caster.pos.y + Math.sin(angle) * 200 };
        const perp = { x: -Math.sin(angle), y: Math.cos(angle) };
        telegraph.moveTo(caster.pos.x + perp.x * 30, caster.pos.y + perp.y * 30)
          .lineTo(tip.x, tip.y)
          .lineTo(caster.pos.x - perp.x * 30, caster.pos.y - perp.y * 30)
          .stroke({ color: primary, width: 4, alpha: 0.65 });
      } else if (casterCountry.ultimateTemplate === 'zone' || casterCountry.ultimateTemplate === 'shield') {
        const radius = casterCountry.ultimateSpec.radius || 150;
        telegraph.circle(caster.pos.x, caster.pos.y, radius * (0.72 + Math.sin(state.frame * 0.2) * 0.08)).stroke({ color: secondary, width: 4, alpha: 0.7 });
        telegraph.circle(caster.pos.x, caster.pos.y, radius * 0.45).stroke({ color: primary, width: 2, alpha: 0.6 });
      } else if (casterCountry.ultimateTemplate === 'dash' || casterCountry.ultimateTemplate === 'summon' || pattern === 'eagle_dive') {
        telegraph.moveTo(caster.pos.x, caster.pos.y).lineTo(caster.pos.x + Math.cos(angle) * 210, caster.pos.y + Math.sin(angle) * 210).stroke({ color: primary, width: 5, alpha: 0.6 });
      } else {
        telegraph.moveTo(caster.pos.x, caster.pos.y).lineTo(caster.pos.x + Math.cos(angle) * 240, caster.pos.y + Math.sin(angle) * 240).stroke({ color: secondary, width: 4, alpha: 0.65 });
        if (casterCountry.ultimateTemplate === 'barrage') {
          telegraph.arc(caster.pos.x, caster.pos.y, 150, angle - 0.55, angle + 0.55).stroke({ color: primary, width: 3, alpha: 0.6 });
        }
      }
      this.fightersContainer.addChild(telegraph);
    }
  }

  private drawWeapon(
    fighter: BattleState['fighters'][0],
    config: BattleConfig,
    fg: PIXI.Graphics,
    state: BattleState,
  ): void {
    const country = getCountry(fighter.countryId);
    if (fighter.type === 'melee') {
      const mw = fighter.weapon as MeleeWeaponState;
      const hitbox = getMeleeWeaponHitbox(mw, fighter.pos, fighter.radius, config.melee, country?.weaponHitbox);
      const { center: weaponPos, start, end, radius } = hitbox;

      // Orbit tether line
      const grip = getMeleeWeaponGripPosition(mw, fighter.pos, fighter.radius, config.melee, country?.weaponHitbox);
      if (!country || country.basicAttackTemplate === 'tethered_weapon') {
        fg.moveTo(fighter.pos.x, fighter.pos.y)
          .lineTo(grip.x, grip.y)
          .stroke({ width: 1.5, color: 0xff9f43, alpha: 0.4 });
      }

      // Country sprites are the visible weapon. Keep the technical capsule
      // invisible beneath them; only the fallback weapon renders it directly.
      if (!country) {
        fg.moveTo(start.x, start.y)
          .lineTo(end.x, end.y)
          .stroke({ width: radius * 2, color: 0xff9f43, alpha: 0.85 });
        fg.circle(start.x, start.y, radius).fill({ color: 0xff9f43, alpha: 0.85 });
        fg.circle(end.x, end.y, radius).fill({ color: 0xff9f43, alpha: 0.85 });
        fg.moveTo(start.x, start.y)
          .lineTo(end.x, end.y)
          .stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
      }
    } else {
      const rw = fighter.weapon as RangedWeaponState;
      const weaponPos = getRangedWeaponPosition(rw, fighter.pos, config.ranged);
      const r = config.ranged.weaponRadius;

      // The technical turret is only a fallback for custom fighters. Country
      // weapons are their own visible firing point (boomerang, bow, revolver…).
      if (!country) {
        fg.moveTo(fighter.pos.x, fighter.pos.y)
          .lineTo(weaponPos.x, weaponPos.y)
          .stroke({ width: 1.5, color: 0x9b59b6, alpha: 0.4 });
        fg.circle(weaponPos.x, weaponPos.y, r).fill({ color: 0x9b59b6 });
        fg.circle(weaponPos.x, weaponPos.y, r).stroke({ width: 2, color: 0xffffff });
        const barrelLen = r * 1.5;
        const muzzleX = weaponPos.x + Math.cos(rw.angle) * barrelLen;
        const muzzleY = weaponPos.y + Math.sin(rw.angle) * barrelLen;
        fg.moveTo(weaponPos.x, weaponPos.y).lineTo(muzzleX, muzzleY).stroke({ width: 4, color: 0xffffff });
      }
    }

    const weaponIsInFlight = country?.basicAttackTemplate === 'returning_projectile'
      && state.projectiles.some((projectile) => projectile.ownerId === fighter.id && projectile.kind === 'returning');
    if (weaponIsInFlight) return;
    const texture = country && this.textureCache.get(country.assets.weapon);
    if (texture && this.fightersContainer) {
      const sprite = new PIXI.Sprite(texture); sprite.anchor.set(0.5);
      const basePosition = fighter.type === 'melee'
        ? getMeleeWeaponPosition(fighter.weapon as MeleeWeaponState, fighter.pos, config.melee)
        : getRangedWeaponPosition(fighter.weapon as RangedWeaponState, fighter.pos, config.ranged);
      const position = { x: basePosition.x, y: basePosition.y };
      const spawnThisFrame = state.events.some((event) => event.type === 'projectile_spawn' && event.ownerId === fighter.id && event.frame === state.frame);
      const recoil = fighter.type === 'ranged' && spawnThisFrame ? -Math.min(9, fighter.radius * 0.24) : 0;
      if (fighter.type === 'ranged' && recoil) {
        position.x += Math.cos(fighter.weapon.angle) * recoil;
        position.y += Math.sin(fighter.weapon.angle) * recoil;
        if (country?.id === 'us') {
          const flash = new PIXI.Graphics().circle(position.x + Math.cos(fighter.weapon.angle) * fighter.radius * 1.35, position.y + Math.sin(fighter.weapon.angle) * fighter.radius * 1.35, fighter.radius * 0.42).fill({ color: 0xfef08a, alpha: 0.9 });
          this.fightersContainer.addChild(flash);
        }
      }
      sprite.position.set(position.x, position.y);
      sprite.rotation = fighter.type === 'melee'
        ? getMeleeWeaponSpriteRotation(fighter.weapon as MeleeWeaponState, country?.weaponHitbox)
        : fighter.weapon.angle + (country?.rangedWeaponRotationOffset ?? 0);
      const size = fighter.type === 'melee' ? getMeleeWeaponSpriteSize(fighter.radius) : Math.max(62, fighter.radius * 2.7); sprite.width = size; sprite.height = size;
      this.fightersContainer.addChild(sprite);
    }
  }

  private drawUI(state: BattleState, config: BattleConfig): void {
    if (!this.uiContainer) return;
    for (const child of this.uiContainer.removeChildren()) child.destroy({ children: true });

    // Floating Damage Numbers
    for (const d of this.damageNumbers) {
      const age = state.frame - d.startFrame;
      const floatY = d.y - age * 1.2;
      const lifetime = d.emphasis ? 55 : 35;
      const alpha = 1 - age / lifetime;
      const scale = 1 + Math.sin((age / lifetime) * Math.PI) * (d.emphasis ? 0.42 : 0.3);

      const style = new PIXI.TextStyle({
        fontFamily: 'sans-serif',
        fontSize: d.emphasis ? 25 : 18,
        fontWeight: 'bold',
        fill: d.color,
        stroke: { color: '#000000', width: 3 },
      });
      const numText = new PIXI.Text({ text: d.text, style });
      numText.anchor.set(0.5);
      numText.scale.set(scale);
      const halfWidth = numText.width / 2;
      const halfHeight = numText.height / 2;
      const safeX = Math.max(halfWidth + 8, Math.min(config.arena.width - halfWidth - 8, d.x));
      const safeY = Math.max(halfHeight + 8, Math.min(config.arena.height - halfHeight - 8, floatY));
      numText.position.set(safeX, safeY);
      numText.alpha = alpha;
      this.uiContainer.addChild(numText);
    }

    // Top HUD Bar (Timer & Sudden Death Banner)
    const hud = new PIXI.Graphics();
    const { width, height } = config.arena;
    hud.rect(width / 2 - 120, 10, 240, 44).fill({ color: 0x000000, alpha: 0.6 });
    hud.rect(width / 2 - 120, 10, 240, 44).stroke({ width: 1.5, color: 0x334155 });

    const minutes = Math.floor(state.time / 60);
    const seconds = Math.floor(state.time % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const timerStyle = new PIXI.TextStyle({
      fontFamily: 'monospace',
      fontSize: Math.max(22, Math.min(config.arena.width, config.arena.height) * 0.035),
      fontWeight: 'bold',
      fill: state.suddenDeathPhase > 0 ? '#ef4444' : '#f8fafc',
    });
    const timerText = new PIXI.Text({ text: timeStr, style: timerStyle });
    timerText.anchor.set(0.5);
    timerText.position.set(width / 2, 32);

    this.uiContainer.addChild(hud);
    this.uiContainer.addChild(timerText);

    if (state.suddenDeathPhase > 0) {
      const sdStyle = new PIXI.TextStyle({
        fontFamily: 'sans-serif',
        fontSize: 12,
        fontWeight: 'bold',
        fill: '#ef4444',
      });
      const sdText = new PIXI.Text({
        text: `УСИЛЕНИЕ БОЯ · ЭТАП ${state.suddenDeathPhase}`,
        style: sdStyle,
      });
      sdText.anchor.set(0.5);
      sdText.position.set(width / 2, 66);
      this.uiContainer.addChild(sdText);
    }

    const castingUltimate = state.fighters.find((fighter) => fighter.ultimateTemplate && fighter.ultimateStatus === 'casting');
    const castEvent = state.events.find((event) => event.type === 'ultimate_cast');
    const activeUltimate = castingUltimate ?? (castEvent ? state.fighters.find((fighter) => fighter.id === castEvent.fighterId) : undefined);
    const activeCountry = getCountry(activeUltimate?.countryId);
    if (activeUltimate && activeCountry && config.presentation?.showUltimateNames !== false) {
      const locale = config.presentation?.locale ?? 'ru';
      const cinema = new PIXI.Graphics();
      cinema.rect(0, 0, width, Math.max(52, height * 0.1)).fill({ color: 0x020617, alpha: castingUltimate ? 0.78 : 0.48 });
      cinema.rect(0, height - Math.max(52, height * 0.1), width, Math.max(52, height * 0.1)).fill({ color: 0x020617, alpha: castingUltimate ? 0.78 : 0.48 });
      this.uiContainer.addChild(cinema);
      const title = castingUltimate ? `⚡ ${activeCountry.name[locale]} · ${activeCountry.ultimate[locale]}` : `💥 ${activeCountry.ultimate[locale]}!`;
      const ultimateText = new PIXI.Text({ text: title, style: new PIXI.TextStyle({ fontFamily: 'sans-serif', fontSize: Math.max(24, width * 0.03), fontWeight: '900', fill: '#fde047', stroke: { color: '#111827', width: 6 } }) });
      ultimateText.anchor.set(0.5); ultimateText.position.set(width / 2, Math.max(78, height * 0.15)); this.uiContainer.addChild(ultimateText);
      if (castingUltimate) {
        const subtitle = new PIXI.Text({ text: 'ЗАМЕДЛЕНИЕ · ПОДГОТОВКА', style: new PIXI.TextStyle({ fontFamily: 'sans-serif', fontSize: Math.max(13, width * 0.014), fontWeight: 'bold', fill: '#f8fafc', stroke: { color: '#111827', width: 4 }, letterSpacing: 1.5 }) });
        subtitle.anchor.set(0.5); subtitle.position.set(width / 2, height - Math.max(25, height * 0.05)); this.uiContainer.addChild(subtitle);
      }
    }
  }

  private drawWinnerBanner(state: BattleState, config: BattleConfig): void {
    if (!this.overlayContainer) return;
    for (const child of this.overlayContainer.removeChildren()) child.destroy({ children: true });
    if (!state.finished) return;

    const { width, height } = config.arena;
    const g = new PIXI.Graphics();

    // Dim background overlay
    g.rect(0, 0, width, height).fill({ color: 0x000000, alpha: 0.55 });

    // Golden victory banner
    const bannerW = Math.min(480, width - 32);
    const bannerH = 140;
    const bx = width / 2 - bannerW / 2;
    const by = height / 2 - bannerH / 2;

    g.roundRect(bx, by, bannerW, bannerH, 16).fill({ color: 0x111827 });
    g.roundRect(bx, by, bannerW, bannerH, 16).stroke({
      width: 3,
      color: 0xf59e0b,
    });

    const winnerFighter = state.fighters.find((f) => f.id === state.winner);
    const winTitle = winnerFighter
      ? `${winnerFighter.name.toUpperCase()} ПОБЕЖДАЕТ!`
      : 'НИЧЬЯ!';

    const titleStyle = new PIXI.TextStyle({
      fontFamily: 'sans-serif',
      fontSize: 32,
      fontWeight: '900',
      fill: '#f59e0b',
      dropShadow: { color: '#000000', distance: 3 },
    });
    const titleText = new PIXI.Text({ text: winTitle, style: titleStyle });
    if (titleText.width > bannerW - 32) titleText.scale.set((bannerW - 32) / titleText.width);
    titleText.anchor.set(0.5);
    titleText.position.set(width / 2, height / 2 - 15);

    const subStyle = new PIXI.TextStyle({
      fontFamily: 'sans-serif',
      fontSize: 16,
      fill: '#94a3b8',
    });
    const subText = new PIXI.Text({
      text: `Бой завершён за ${state.time.toFixed(1)} с`,
      style: subStyle,
    });
    subText.anchor.set(0.5);
    subText.position.set(width / 2, height / 2 + 28);

    this.overlayContainer.addChild(g);
    this.overlayContainer.addChild(titleText);
    this.overlayContainer.addChild(subText);
  }
}
