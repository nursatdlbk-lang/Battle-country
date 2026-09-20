export type HitKey = string; // `${attackerId}:${targetId}:${weaponId}`

export interface HitRegistryState {
  readonly activeContacts: ReadonlyMap<string, boolean>;
}

export function createHitRegistry(): HitRegistryState {
  return { activeContacts: new Map<string, boolean>() };
}

export function makeHitKey(attackerId: string, targetId: string, weaponId: string): HitKey {
  return `${attackerId}:${targetId}:${weaponId}`;
}

export function checkAndRegisterHit(
  registry: HitRegistryState,
  key: HitKey,
  isOverlapping: boolean
): { registry: HitRegistryState; hitOccurred: boolean; } {
  const wasOverlapping = registry.activeContacts.get(key) ?? false;
  
  if (isOverlapping && !wasOverlapping) {
    const newMap = new Map(registry.activeContacts);
    newMap.set(key, true);
    return { registry: { activeContacts: newMap }, hitOccurred: true };
  } else if (!isOverlapping && wasOverlapping) {
    const newMap = new Map(registry.activeContacts);
    newMap.delete(key);
    return { registry: { activeContacts: newMap }, hitOccurred: false };
  }
  
  return { registry, hitOccurred: false };
}
