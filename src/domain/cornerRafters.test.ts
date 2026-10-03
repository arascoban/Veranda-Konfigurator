import { describe, expect, it } from 'vitest';
import { ROOF_SUPPORT_WIDTH_MM } from '../catalog/catalog';
import { createDefaultConfiguration, type ConfigurationV1 } from './configuration';
import { cornerRafterPitches } from './cornerRafters';
import { evaluateConfiguration } from './evaluateConfiguration';
import { addToField } from './fieldEquipment';

/** Default draft (500 cm Prime) with the garden-left end post moved inwards by `insetMm` (outer face to gutter end). */
function withLeftInset(insetMm: number, equipped: boolean): ConfigurationV1 {
  const base = createDefaultConfiguration();
  const posts = base.postCenters!.map((post) => ({ ...post }));
  posts[posts.length - 1].xMm = 5000 - insetMm - 55;
  const moved = { ...base, postCenters: posts };
  return equipped ? addToField(moved, 'side:left', 'glasschiebewand')! : moved;
}

describe('corner rafter follows an inset end post (3 Oct 2026)', () => {
  it('adds a rafter over the post and a narrow outer bay only when that side has equipment', () => {
    const plain = evaluateConfiguration(withLeftInset(300, false)).roof!;
    expect(plain.postSideFields).toBeUndefined();
    const equipped = withLeftInset(300, true);
    expect(cornerRafterPitches(equipped)).toEqual({ leftMm: 300 });
    const roof = evaluateConfiguration(equipped).roof!;
    expect(roof.valid).toBe(true);
    expect(roof.bayCount).toBe(plain.bayCount + 1);
    expect(roof.supportCount).toBe(plain.supportCount + 1);
    // Garden-left is the x = W end: the last bay is the narrow one, the rest equal.
    expect(roof.capWidthsMm[roof.capWidthsMm.length - 1]).toBe(300 - ROOF_SUPPORT_WIDTH_MM);
    const rest = roof.capWidthsMm.slice(0, -1);
    expect(new Set(rest.map((cap) => cap.toFixed(3))).size).toBe(1);
    // Total width is unchanged.
    const total = roof.capWidthsMm.reduce((sum, cap) => sum + cap, 0) + roof.supportCount * ROOF_SUPPORT_WIDTH_MM;
    expect(total).toBeCloseTo(5000, 6);
  });

  it('keeps the plain layout for a post that is only slightly inset', () => {
    expect(cornerRafterPitches(withLeftInset(60, true))).toBeNull();
  });

  it('lets the customer still add up to two bays on top of the new minimum', () => {
    const equipped = withLeftInset(300, true);
    const roof = evaluateConfiguration(equipped).roof!;
    const more = evaluateConfiguration({ ...equipped, roofBayCount: roof.minimumBayCount! + 2 });
    expect(more.roof!.bayCount).toBe(roof.minimumBayCount! + 2);
    expect(more.issues.some((issue) => issue.code === 'roof_bays_above_limit')).toBe(false);
    const tooMany = evaluateConfiguration({ ...equipped, roofBayCount: roof.minimumBayCount! + 3 });
    expect(tooMany.issues.some((issue) => issue.code === 'roof_bays_above_limit')).toBe(true);
  });
});
