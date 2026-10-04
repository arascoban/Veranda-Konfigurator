import type { ConfigurationV1 } from '../../domain/configuration';
import { assemblySpecs } from './spec';
import { listFields, postLineOf, sideClearMm } from '../../domain/fieldEquipment';
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
  /** Smaller text for short lines (side parts). */
  labelHeightM?: number;
};

/** Field (opening) names as the customer sees them from the garden: "Feld 1" is the garden-left field (same numbering as "Vorne · Feld 1" in the Feld section). */
export function fieldName(index: number, fieldCount: number): string {
  return `Feld ${fieldCount - index}`;
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
  // Ground lines step outwards from the structure: fields/side depth at 35 cm, overall width/depth at 110 cm. Every
  // label lies on the far side of its own line (labels are about 50 cm across), so no text crosses a line and none
  // lies under the structure or its side walls (owner, 3 Oct 2026).
  const gap = 350;
  const outer = 1100;
  const labelGap = 330;
  const behindPost = sideClearMm(configuration);
  // A side divided by 50×100 profiles shows the clear width of every part instead of the side's whole clear depth,
  // on the same line and with smaller text.
  const sideParts = listFields(configuration).filter((field) => field.kind === 'side' && field.partIndex);
  const divided = (side: 'left' | 'right') => sideParts.some((field) => field.side === side);
  const lines: DimensionLine[] = [
    { id: 'width', label: `Breite (B)\n${cm(W)}`, fromMm: [0, 0, -D - outer], toMm: [W, 0, -D - outer], tick: [0, 0, 1], plane: 'ground', labelOffsetMm: [0, 0, -labelGap] },
    { id: 'depth', label: `Tiefe (A)\n${cm(D)}`, fromMm: [W + outer, 0, 0], toMm: [W + outer, 0, -D], tick: [-1, 0, 0], plane: 'ground', labelOffsetMm: [labelGap, 0, 0] },
    // Both rear heights stand on the garden-left side (x = W end). Seen from the garden, "Höhe hinten" reads to
    // the right of its line (towards the structure) and "Gesamthöhe" to the left of its line (outwards), so the
    // two labels never overlap (user request 30 Sep 2026).
    { id: 'rearHeight', label: `Höhe hinten (D)\n${cm(Hr)}`, fromMm: [W + 1500, 0, 0], toMm: [W + 1500, Hr, 0], tick: [-1, 0, 0], plane: 'wall', labelOffsetMm: [-700, 0, 0] },
    { id: 'totalHeight', label: `Gesamthöhe (C)\n${cm(Hr + spec.wallProfileHeightMm)}`, fromMm: [W + 1800, 0, 0], toMm: [W + 1800, Hr + spec.wallProfileHeightMm, 0], tick: [1, 0, 0], plane: 'wall', labelOffsetMm: [700, 0, 0] },
    // In front of the post row, clear of the right side's depth line and its part labels.
    { id: 'frontHeight', label: `Durchgangshöhe (E)\n${cm(Hf)}`, fromMm: [-outer, 0, -D - gap], toMm: [-outer, Hf, -D - gap], tick: [1, 0, 0], plane: 'wall', labelOffsetMm: [-560, 0, 0] },
  ];
  if (!divided('left')) lines.push({ id: 'depthLeft', label: `Tiefe links\n${cm(behindPost)}`, fromMm: [W + gap, 0, 0], toMm: [W + gap, 0, -behindPost], tick: [-1, 0, 0], plane: 'ground', labelOffsetMm: [labelGap, 0, 0] });
  if (!divided('right')) lines.push({ id: 'depthRight', label: `Tiefe rechts\n${cm(behindPost)}`, fromMm: [-gap, 0, 0], toMm: [-gap, 0, -behindPost], tick: [1, 0, 0], plane: 'ground', labelOffsetMm: [-labelGap, 0, 0] });
  // Posts moved in: from the depth line to the posts' garden face, on the right-hand side in front of its depth line.
  const line = postLineOf(configuration);
  if (line?.carrier) {
    lines.push({ id: 'postInset', label: `Einzug\n${cm(line.frontZ + D)}`, fromMm: [-gap, 0, -D], toMm: [-gap, 0, line.frontZ], tick: [1, 0, 0], plane: 'ground', labelOffsetMm: [-labelGap, 0, 0], labelHeightM: 0.17 });
  }
  // Front fields: the same clear widths as the Feld section (measured post faces).
  const fronts = listFields(configuration).filter((field) => field.kind === 'front');
  const posts = configuration.postCenters ?? [];
  for (const field of fronts) {
    const left = posts[field.insideIndex!];
    const right = posts[field.insideIndex! + 1];
    const start = (left.xMm + right.xMm) / 2 - field.widthMm / 2;
    lines.push({
      id: `field-${left.id}-${right.id}`, label: `${fieldName(field.insideIndex!, fronts.length)}\n${cm(field.widthMm)}`,
      fromMm: [start, 0, -D - gap], toMm: [start + field.widthMm, 0, -D - gap], tick: [0, 0, 1], plane: 'ground', labelOffsetMm: [0, 0, -labelGap],
    });
  }
  for (const part of sideParts) {
    const x = part.side === 'left' ? W + gap : -gap;
    const start = part.startMm ?? 0;
    lines.push({
      id: `side-${part.id}`, label: `Teil ${part.partIndex}\n${cm(part.widthMm)}`,
      fromMm: [x, 0, -start], toMm: [x, 0, -(start + part.widthMm)], tick: [part.side === 'left' ? -1 : 1, 0, 0], plane: 'ground',
      labelOffsetMm: [part.side === 'left' ? 250 : -250, 0, 0], labelHeightM: 0.17,
    });
  }
  return [...lines, ...extraLines];
}
