import { describe, expect, it } from 'vitest';
import { createEmptyConfiguration } from '../../domain/configuration';
import { assemblyLayoutFromConfiguration, basisDeterminant, buildAssemblyLayout, type PartPlacement, type Vec3 } from './placements';
import { assemblySpecs } from './spec';

/** Scene-space bounding box of a placed part, from the measured local bounds. */
function bounds(placement: PartPlacement) {
  const part = assemblySpecs[placement.partId.startsWith('gutterCap') || placement.partId.startsWith('wallCap') || ['wallProfile', 'gutter', 'post', 'rafterMiddle', 'rafterSide', 'cover', 'panel'].includes(placement.partId) ? currentProduct : currentProduct].parts[placement.partId];
  const lo = part.boundsMinCm.map((v) => v * 10);
  const hi = part.boundsMaxCm.map((v) => v * 10);
  const min: number[] = [Infinity, Infinity, Infinity];
  const max: number[] = [-Infinity, -Infinity, -Infinity];
  for (const corner of [[lo[0], lo[1], lo[2]], [hi[0], lo[1], lo[2]], [lo[0], hi[1], lo[2]], [hi[0], hi[1], lo[2]],
    [lo[0], lo[1], hi[2]], [hi[0], lo[1], hi[2]], [lo[0], hi[1], hi[2]], [hi[0], hi[1], hi[2]]]) {
    const s = corner.map((v, i) => v * placement.scale[i]);
    const { x, y, z } = placement.basis;
    const p: Vec3 = [
      placement.originMm[0] + x[0] * s[0] + y[0] * s[1] + z[0] * s[2],
      placement.originMm[1] + x[1] * s[0] + y[1] * s[1] + z[1] * s[2],
      placement.originMm[2] + x[2] * s[0] + y[2] * s[1] + z[2] * s[2],
    ];
    for (let i = 0; i < 3; i += 1) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); }
  }
  return { min, max };
}
let currentProduct: 'prime' | 'premium' = 'prime';

describe('assembly placements (provisional reference offsets)', () => {
  it('places the Prime parts of a 530 × 320 glass roof without mirroring any part', () => {
    currentProduct = 'prime';
    const layout = buildAssemblyLayout({
      productId: 'prime', roofMaterialId: 'glass', postCapStyle: 'gerade', drainSide: 'left', widthMm: 5300, depthMm: 3200, rearHeightMm: 2700, frontHeightMm: 2400,
      bayCount: 6, postCentersMm: [55, 2650, 5245],
    });
    expect(layout.bayCount).toBe(6);
    expect(layout.capWidthsMm[0]).toBeCloseTo((5300 - 55 * 7) / 6, 6);
    // rise 277 mm over 3112 mm run → 5.09°
    expect(layout.slopeDegrees).toBeCloseTo(Math.atan2(277, 3112) * 180 / Math.PI, 6);
    for (const placement of layout.placements) expect(basisDeterminant(placement.basis)).toBeCloseTo(1, 9);
    const byRole = (role: string) => layout.placements.filter((placement) => placement.role === role);
    // Three slices per post; the drain sits on the garden-left end post only (width ≤ 8 m), i.e. the x = W end.
    expect(byRole('post')).toHaveLength(9);
    expect([...new Set(byRole('post').map((placement) => placement.partId.replace(/(Bottom|Mid|Top)$/, '')))]).toEqual(['post', 'postRohr']);
    expect(byRole('post').filter((placement) => placement.postIndex === 2).map((placement) => placement.partId)).toEqual(['postRohrBottom', 'postRohrMid', 'postRohrTop']);
    expect(byRole('rafter')).toHaveLength(7);
    expect(byRole('panel')).toHaveLength(6);
    expect(byRole('cover')).toHaveLength(12);
    expect(byRole('gutterCap')).toHaveLength(2);
    expect(byRole('wallCap')).toHaveLength(2);

    const gutter = bounds(byRole('gutter')[0]);
    expect(gutter.min[0]).toBeCloseTo(0, 6);
    expect(gutter.max[0]).toBeCloseTo(5300, 6);
    expect(gutter.min[1]).toBeCloseTo(2400, 6);
    expect(gutter.min[2]).toBeCloseTo(-3226, 6);

    const wall = bounds(byRole('wallProfile')[0]);
    expect(wall.min[0]).toBeCloseTo(0, 6);
    expect(wall.max[0]).toBeCloseTo(5300, 6);
    expect(wall.min[1]).toBeCloseTo(2700, 6);
    expect(wall.max[2]).toBeCloseTo(0, 6);
    expect(wall.min[2]).toBeCloseTo(-70.07, 1);

    const middlePost = byRole('post').filter((placement) => placement.postIndex === 1).map(bounds);
    expect(middlePost[0].min[0]).toBeCloseTo(2650 - 55, 6);
    expect(middlePost[0].min[2]).toBeCloseTo(-3200, 6);
    expect(middlePost[0].max[1]).toBeCloseTo(250, 6);        // fixed bottom slice
    expect(middlePost[1].min[1]).toBeCloseTo(250, 6);        // stretched middle
    expect(middlePost[1].max[1]).toBeCloseTo(2415 - 250, 6);
    expect(middlePost[2].max[1]).toBeCloseTo(2415, 6);       // fixed top slice

    const [rightCap, leftCap] = byRole('gutterCap').map(bounds);
    expect(leftCap.max[0]).toBeCloseTo(0, 6);
    expect(rightCap.min[0]).toBeCloseTo(5300, 6);
    expect(leftCap.min[2]).toBeCloseTo(-3226, 1);

    const rafters = byRole('rafter').map(bounds);
    expect(rafters[0].min[0]).toBeCloseTo(2, 6); // side rafters stay inside the gutter caps
    expect(rafters[6].max[0]).toBeCloseTo(5298, 6);
    expect(rafters[3].min[0]).toBeCloseTo(3 * (layout.capWidthsMm[0] + 55), 6);
    expect(rafters[3].min[2]).toBeCloseTo(-3200 + 53 - 98 * Math.sin(layout.slopeDegrees * Math.PI / 180), 0);
    expect(rafters[3].max[2]).toBeCloseTo(-35, 0);
    expect(rafters[3].min[1]).toBeCloseTo(2431, 0);

    const panel = bounds(byRole('panel')[0]);
    expect(panel.max[0] - panel.min[0]).toBeCloseTo(layout.capWidthsMm[0] + 32, 6);
    expect(panel.min[0]).toBeCloseTo(55 - 16, 6);
  });

  it('places the Premium parts with the turned reference caps at the gutter ends', () => {
    currentProduct = 'premium';
    const layout = buildAssemblyLayout({
      productId: 'premium', roofMaterialId: 'polycarbonate', postCapStyle: 'gerade', drainSide: 'right', widthMm: 6000, depthMm: 3000, rearHeightMm: 2900, frontHeightMm: 2300,
      bayCount: 6, postCentersMm: [65, 5935],
    });
    // Only the right side rafter is the mirrored component; both grooves face the glass.
    for (const placement of layout.placements) {
      const mirrored = placement.partId.startsWith('rafterSide') && placement.originMm[0] > 3000;
      expect(basisDeterminant(placement.basis)).toBeCloseTo(mirrored ? -1 : 1, 9);
    }
    const byRole = (role: string) => layout.placements.filter((placement) => placement.role === role);
    expect(byRole('post').map((placement) => placement.partId)).toEqual(['postRohrBottom', 'postRohrMid', 'postRohrTop', 'postBottom', 'postMid', 'postTop']);
    const post = bounds(byRole('post')[0]);
    expect(post.min[0]).toBeCloseTo(0, 6);
    expect(post.max[0]).toBeCloseTo(130, 6);
    // The drain outlet protrudes towards the garden (beyond the post face at −D); the plain post ends at −D.
    expect(post.min[2]).toBeLessThan(-3000);
    const plain = bounds(byRole('post')[4]);
    expect(plain.min[2]).toBeCloseTo(-3000, 6);
    expect(plain.max[2]).toBeCloseTo(-3000 + 135, 6);
    expect(bounds(byRole('post')[5]).max[1]).toBeCloseTo(2316, 6);
    const gutter = bounds(byRole('gutter')[0]);
    expect(gutter.min[0]).toBeCloseTo(0, 6);
    expect(gutter.max[0]).toBeCloseTo(6000, 6);
    expect(gutter.min[1]).toBeCloseTo(2300, 6);
    expect(gutter.min[2]).toBeCloseTo(-3032, 6);
    const [left, right] = byRole('gutterCap').map(bounds);
    expect(left.min[0]).toBeGreaterThan(-3);
    expect(left.max[0]).toBeLessThan(10);
    expect(right.max[0]).toBeGreaterThan(5997);
    expect(right.min[0]).toBeLessThan(6000);
    expect(left.min[1]).toBeCloseTo(2300 + 2174.89 - 2184, 1);
    expect(left.min[2]).toBeCloseTo(-3032 - 0.3 , 0);
    const wall = bounds(byRole('wallProfile')[0]);
    expect(wall.min[0]).toBeCloseTo(0, 6);
    expect(wall.max[0]).toBeCloseTo(6000, 6);
    expect(wall.min[1]).toBeCloseTo(2900, 6);
    expect(wall.max[2]).toBeCloseTo(0, 6);
    const bodies = layout.placements.filter((placement) => placement.partId === 'rafterMiddleBody').map(bounds);
    expect(bodies).toHaveLength(5);
    const sin = Math.sin(layout.slopeDegrees * Math.PI / 180);
    expect(bodies[0].min[2]).toBeCloseTo(-3000 + 132 - 100 * sin, 0);
    expect(bodies[0].max[2]).toBeCloseTo(-18, 0);
    const overhangs = layout.placements.filter((placement) => placement.partId === 'rafterMiddleTopFront').map(bounds);
    // The 5 cm overhang keeps its size and reaches over the gutter, in front of the body.
    expect(overhangs[0].min[2]).toBeLessThan(bodies[0].min[2]);
    expect(overhangs[0].max[2] - overhangs[0].min[2]).toBeLessThan(120);
    const panel = bounds(byRole('panel')[0]);
    expect(panel.max[0] - panel.min[0]).toBeCloseTo(layout.capWidthsMm[0] + 35, 6);
    // Panel spans the rafter cover incl. overhangs (5 cm at the gutter, 2 cm at the wall).
    const cover = layout.placements.filter((placement) => placement.partId.startsWith('rafterMiddleTop')).map(bounds);
    expect(panel.min[2]).toBeCloseTo(Math.min(...cover.map((b) => b.min[2])), -1);
    expect(panel.max[2]).toBeCloseTo(Math.max(...cover.map((b) => b.max[2])), -1);
  });

  it('builds a layout only from complete, rule-valid configurations', () => {
    const configuration = createEmptyConfiguration();
    expect(assemblyLayoutFromConfiguration(configuration)).toBeNull();
    configuration.dimensionsMm = { width: 5000, depth: 3000, rearHeight: 2700, frontHeight: 2400 };
    configuration.postCenters = [{ id: 'l', xMm: 55 }, { id: 'm', xMm: 2500 }, { id: 'r', xMm: 4945 }];
    expect(assemblyLayoutFromConfiguration(configuration)?.bayCount).toBe(6);
    configuration.postCenters = [{ id: 'l', xMm: 55 }, { id: 'm', xMm: 2500 }, { id: 'r', xMm: 4946 }];
    expect(assemblyLayoutFromConfiguration(configuration)).toBeNull();
  });
});
