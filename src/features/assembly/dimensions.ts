import { postWidthMm } from '../../catalog/catalog';
import type { ConfigurationV1 } from '../../domain/configuration';
import { assemblySpecs } from './spec';
import type { Vec3 } from './placements';

/**
 * One dimension line in the assembly frame (mm). `offset` is where the line is drawn relative to the
 * measured edge; `tick` is the direction of the end ticks. Future parts (walls, glass, awnings) add their
 * own lines through `extraLines` so the "Bemaßungen" layer stays consistent.
 */
export type DimensionLine = {
  id: string;
  label: string;
  fromMm: Vec3;
  toMm: Vec3;
  tick: Vec3;
};

/** Field (opening) names as the customer sees them from the garden: "Front 1" is the garden-left field. */
export function fieldName(index: number, fieldCount: number): string {
  return `Front ${fieldCount - index}`;
}

const numberDe = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function metres(mm: number): string {
  return `${numberDe.format(mm / 1000)} m`;
}

export function buildDimensionLines(configuration: ConfigurationV1, extraLines: DimensionLine[] = []): DimensionLine[] {
  const { width: W, depth: D, rearHeight: Hr, frontHeight: Hf } = configuration.dimensionsMm;
  if (W === null || D === null || Hr === null || Hf === null) return [];
  const spec = assemblySpecs[configuration.productId];
  const gap = 350;           // distance of the main lines from the structure
  const lines: DimensionLine[] = [
    { id: 'width', label: `Breite (B) ${metres(W)}`, fromMm: [0, 0, -D - gap - 450], toMm: [W, 0, -D - gap - 450], tick: [0, 0, 1] },
    { id: 'depth', label: `Tiefe (A) ${metres(D)}`, fromMm: [W + gap, 0, 0], toMm: [W + gap, 0, -D], tick: [-1, 0, 0] },
    { id: 'rearHeight', label: `Höhe hinten (D) ${metres(Hr)}`, fromMm: [W + gap, 0, 0], toMm: [W + gap, Hr, 0], tick: [-1, 0, 0] },
    { id: 'totalHeight', label: `Gesamthöhe (C) ${metres(Hr + spec.wallProfileHeightMm)}`, fromMm: [-gap - 250, 0, 0], toMm: [-gap - 250, Hr + spec.wallProfileHeightMm, 0], tick: [1, 0, 0] },
    { id: 'frontHeight', label: `Durchgangshöhe (E) ${metres(Hf)}`, fromMm: [-gap, 0, -D], toMm: [-gap, Hf, -D], tick: [1, 0, 0] },
  ];
  const posts = configuration.postCenters ?? [];
  const postWidth = postWidthMm(configuration.productId);
  const fieldCount = Math.max(0, posts.length - 1);
  for (let index = 0; index < fieldCount; index += 1) {
    // Clear width between the facing sides of two posts (lichte Weite), decided 30 Sep 2026.
    const left = posts[index].xMm + postWidth / 2;
    const right = posts[index + 1].xMm - postWidth / 2;
    lines.push({
      id: `field-${posts[index].id}-${posts[index + 1].id}`,
      label: `Breite ${fieldName(index, fieldCount)} ${metres(right - left)}`,
      fromMm: [left, 0, -D - gap], toMm: [right, 0, -D - gap], tick: [0, 0, 1],
    });
  }
  return [...lines, ...extraLines];
}
