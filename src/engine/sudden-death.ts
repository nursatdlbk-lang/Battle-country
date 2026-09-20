export interface SuddenDeathThreshold {
  time: number;
  speedMultiplier: number;
  damageMultiplier: number;
}

export interface SuddenDeathConfig {
  thresholds: SuddenDeathThreshold[];
}

export interface SuddenDeathMultipliers {
  speed: number;
  damage: number;
  phase: number;
}

export function getCurrentMultipliers(elapsedTime: number, config: SuddenDeathConfig): SuddenDeathMultipliers {
  let speed = 1.0;
  let damage = 1.0;
  let phase = 0;

  for (let i = 0; i < config.thresholds.length; i++) {
    const threshold = config.thresholds[i];
    if (elapsedTime >= threshold.time) {
      speed = threshold.speedMultiplier;
      damage = threshold.damageMultiplier;
      phase = i + 1;
    } else {
      break;
    }
  }

  return { speed, damage, phase };
}
