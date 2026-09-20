import {
  AudioBattleEvent,
  BattleAudioCue,
  BattleAudioUrls,
  cueForBattleEvent,
  previewAudioSource,
} from '../audio/battle-audio-cues';

/** Browser-side counterpart to BattleAudio for preview playback. */
export class AudioManager {
  private musicAudio: HTMLAudioElement | null = null;
  private musicUrl: string | null = null;
  private readonly customUrls: { [K in Exclude<BattleAudioCue, 'wallBounce'>]?: string } = {};
  private readonly activeSfx = new Set<HTMLAudioElement>();
  private musicVolume = 0.7;
  private sfxVolume = 0.7;

  public setVolumes(music: number, sfx: number): void {
    this.musicVolume = clampVolume(music);
    this.sfxVolume = clampVolume(sfx);
    if (this.musicAudio) this.musicAudio.volume = this.musicVolume;
  }

  public setMusic(url: string): void {
    if (!url) {
      this.stopMusic();
      this.musicAudio = null;
      this.musicUrl = null;
      return;
    }
    if (typeof window === 'undefined') return;
    if (!this.musicAudio) {
      this.musicAudio = new Audio(url);
      this.musicAudio.loop = true;
      this.musicUrl = url;
    } else if (this.musicUrl !== url) {
      this.musicAudio.src = url;
      this.musicUrl = url;
    }
    this.musicAudio.volume = this.musicVolume;
  }

  public playMusic(): void { this.musicAudio?.play().catch(() => {}); }
  public pauseMusic(): void { this.musicAudio?.pause(); }

  public stopMusic(): void {
    if (!this.musicAudio) return;
    this.musicAudio.pause();
    this.musicAudio.currentTime = 0;
  }

  public stopSfx(): void {
    for (const audio of this.activeSfx) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.activeSfx.clear();
  }

  public dispose(): void {
    this.stopMusic();
    this.stopSfx();
    this.musicAudio = null;
    this.musicUrl = null;
  }

  public setCustomSfx(type: Exclude<BattleAudioCue, 'wallBounce'>, url: string): void {
    if (url) this.customUrls[type] = url;
    else delete this.customUrls[type];
  }

  /** Dispatches exactly one sound cue per deterministic battle event. */
  public handleEvent(event: AudioBattleEvent): void {
    const cue = cueForBattleEvent(event);
    if (cue) this.playCue(cue);
  }

  public playMeleeHit(): void { this.playCue('meleeHit'); }
  public playProjectileShot(): void { this.playCue('projectileShot'); }
  public playProjectileImpact(): void { this.playCue('projectileImpact'); }
  public playWallBounce(): void { this.playCue('wallBounce'); }
  public playKO(): void { this.playCue('ko'); }
  public playWinner(): void { this.playCue('winner'); }

  private playCue(cue: BattleAudioCue): void {
    if (this.sfxVolume <= 0 || typeof window === 'undefined') return;
    const audio = new Audio(previewAudioSource(cue, this.customUrls));
    this.activeSfx.add(audio);
    const release = () => this.activeSfx.delete(audio);
    audio.addEventListener('ended', release, { once: true });
    audio.addEventListener('error', release, { once: true });
    audio.volume = this.sfxVolume;
    audio.play().catch(() => {});
  }
}

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}
