import { LED_PER_METRE_MAX } from '../catalog/catalog';

/** LEDs per rafter: one per metre of depth, rounded at the half metre (349 cm → 3, 350 cm → 4; confirmed 1 Oct 2026). */
export function maxLedPerRafter(depthMm: number | null): number {
  if (depthMm === null || depthMm <= 0) return 0;
  return Math.floor(depthMm / 1000 + 0.5) * LED_PER_METRE_MAX;
}

/** Corner (side) rafters never carry LEDs. */
export function ledRafterCount(supportCount: number): number {
  return Math.max(0, supportCount - 2);
}
