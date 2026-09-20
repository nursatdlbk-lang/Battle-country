/** Even dimensions are supported by H.264's default pixel format. */
export function clampArenaDimension(value: number, min = 240, max = 4096): number {
  const lower = Math.ceil(min / 2) * 2;
  const upper = Math.max(lower, Math.floor(max / 2) * 2);
  return Math.max(lower, Math.min(upper, Math.round((Number.isFinite(value) ? value : lower) / 2) * 2));
}
