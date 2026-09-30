import { postSections, postWidthMm } from '../../catalog/catalog';
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
  /** Where the label lies: flat on the ground or parallel to the wall (heights). */
  plane: 'ground' | 'wall';
  /** Optional label shift from the line midpoint (mm) to keep neighbouring labels apart. */
  labelOffsetMm?: Vec3;
};

/** Field (opening) names as the customer sees them from the garden: "Front 1" is the garden-left field. */
export function fieldName(index: number, fieldCount: number): string {
  return `Front ${fieldCount - index}`;
}

const numberDe = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
/** Second label line: the value in centimetres. */
function cm(mm: number): string {
  return `${numberDe.format(mm / 10)} cm`;
}

export function buildDimensionLines(configuration: ConfigurationV1, extraLines: DimensionLine[] = []): DimensionLine[] {
  const { width: W, depth: D, rearHeight: Hr, frontHeight: Hf } = configuration.dimensionsMm;
  if (W === null || D === null || Hr === null || Hf === null) return [];
  const spec = assemblySpecs[configuration.productId];
  const gap = 350;           // distance of the main lines from the structure
  // Depth behind the posts: from the post's wall-facing side to the wall, on the garden-left (x = W) and garden-right end.
  const behindPost = D - postSections[configuration.productId].towardsGardenMm;
  const lines: DimensionLine[] = [
    { id: 'width', label: `Breite (B)\n${cm(W)}`, fromMm: [0, 0, -D - gap - 450], toMm: [W, 0, -D - gap - 450], tick: [0, 0, 1], plane: 'ground' },
    { id: 'depth', label: `Tiefe (A)\n${cm(D)}`, fromMm: [W + gap + 350, 0, 0], toMm: [W + gap + 350, 0, -D], tick: [-1, 0, 0], plane: 'ground', labelOffsetMm: [200, 0, 0] },
    { id: 'depthLeft', label: `Tiefe links\n${cm(behindPost)}`, fromMm: [W + gap, 0, 0], toMm: [W + gap, 0, -behindPost], tick: [-1, 0, 0], plane: 'ground', labelOffsetMm: [-200, 0, 0] },
    { id: 'depthRight', label: `Tiefe rechts\n${cm(behindPost)}`, fromMm: [-gap, 0, 0], toMm: [-gap, 0, -behindPost], tick: [1, 0, 0], plane: 'ground', labelOffsetMm: [200, 0, 0] },
    // Both rear heights stand on the garden-left side (x = W end). Seen from the garden, "Höhe hinten" reads to
    // the right of its line (towards the structure) and "Gesamthöhe" to the left of its line (outwards), so the
    // two labels never overlap (user request 30 Sep 2026).
    { id: 'rearHeight', label: `Höhe hinten (D)\n${cm(Hr)}`, fromMm: [W + 1250, 0, 0], toMm: [W + 1250, Hr, 0], tick: [-1, 0, 0], plane: 'wall', labelOffsetMm: [-700, 0, 0] },
    { id: 'totalHeight', label: `Gesamthöhe (C)\n${cm(Hr + spec.wallProfileHeightMm)}`, fromMm: [W + 1550, 0, 0], toMm: [W + 1550, Hr + spec.wallProfileHeightMm, 0], tick: [1, 0, 0], plane: 'wall', labelOffsetMm: [700, 0, 0] },
    { id: 'frontHeight', label: `Durchgangshöhe (E)\n${cm(Hf)}`, fromMm: [-gap, 0, -D], toMm: [-gap, Hf, -D], tick: [1, 0, 0], plane: 'wall', labelOffsetMm: [-560, 0, 0] },
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
      label: `${fieldName(index, fieldCount)}\n${cm(right - left)}`,
      fromMm: [left, 0, -D - gap], toMm: [right, 0, -D - gap], tick: [0, 0, 1], plane: 'ground',
    });
  }
  return [...lines, ...extraLines];
}
