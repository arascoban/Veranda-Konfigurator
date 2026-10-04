/**
 * Glasschiebewand sizes (docs/Masse.md, owner rules of 3 Oct 2026). The field's clear width (front: face to face
 * of the posts; side: wall to the back face of the post) picks the number of rails and the standard glass width
 * (90, 98 or 103 cm). Range ends are inclusive and belong to the smaller glass (owner decision 3 Oct 2026:
 * 262 cm → 3 rails, 90 cm glass). Leaves overlap at least 4 cm; there is no upper overlap limit.
 * "2 rails" is sold as the 3-rail profile with one leaf left out.
 */
export const GSW_MIN_WIDTH_MM = 1200;
export const GSW_MIN_HEIGHT_MM = 1000;
/** docs/Masse.md and Ausstatungen_Kurallar.md rule 11 (4 Oct 2026). */
export const GSW_MAX_HEIGHT_MM = 2400;
export const GSW_MIN_OVERLAP_MM = 40;
export const GSW_GLASS_WIDTHS_MM = [900, 980, 1030] as const;
/** U profile at each end of the field (measured from the owner's U_Profil models: 2.0 cm); leaves run between them. */
export const GSW_SIDE_PROFILE_MM = 20;
export type GswGlassWidthMm = typeof GSW_GLASS_WIDTHS_MM[number];
export type GswRailProfile = 3 | 4 | 5 | 6;

/** [leaves, upper limit for 90 / 98 / 103 cm glass] in mm, straight from docs/Masse.md. */
const SIZE_TABLE: readonly { leaves: 2 | 3 | 4 | 5 | 6; maxMm: readonly [number, number, number] }[] = [
  { leaves: 2, maxMm: [1760, 1920, 2020] },
  { leaves: 3, maxMm: [2620, 2860, 3040] },
  { leaves: 4, maxMm: [3480, 3800, 4000] },
  { leaves: 5, maxMm: [4340, 4740, 4980] },
  { leaves: 6, maxMm: [5200, 5680, 5960] },
];
export const GSW_MAX_WIDTH_MM = SIZE_TABLE[SIZE_TABLE.length - 1].maxMm[2];

export type GswLayout = {
  /** Glass leaves in the field. */
  leaves: number;
  /** Rail profile used (2 leaves run in the 3-rail profile). */
  railProfile: GswRailProfile;
  glassWidthMm: GswGlassWidthMm;
  /** Overlap between neighbouring leaves between the U profiles (≥ 40 mm at every table limit; smallest 45 mm at 304 cm). */
  overlapMm: number;
};

export type GswCheck = { ok: true; layout: GswLayout } | { ok: false; reason: 'too_narrow' | 'too_wide' | 'too_low' | 'too_high' };

/** Rails and glass for a clear width; null outside 120–596 cm. */
export function glassSlidingLayout(clearWidthMm: number): GswLayout | null {
  if (!Number.isFinite(clearWidthMm) || clearWidthMm < GSW_MIN_WIDTH_MM || clearWidthMm > GSW_MAX_WIDTH_MM) return null;
  for (const row of SIZE_TABLE) {
    const index = row.maxMm.findIndex((max) => clearWidthMm <= max);
    if (index < 0) continue;
    const glassWidthMm = GSW_GLASS_WIDTHS_MM[index];
    return {
      leaves: row.leaves,
      railProfile: row.leaves === 2 ? 3 : row.leaves,
      glassWidthMm,
      overlapMm: Math.round((row.leaves * glassWidthMm - (clearWidthMm - 2 * GSW_SIDE_PROFILE_MM)) / (row.leaves - 1)),
    } as GswLayout;
  }
  return null;
}

/** Width and height check for a Glasschiebewand of the given clear width and height. */
export function checkGlassSliding(clearWidthMm: number, heightMm: number): GswCheck {
  if (clearWidthMm < GSW_MIN_WIDTH_MM) return { ok: false, reason: 'too_narrow' };
  if (clearWidthMm > GSW_MAX_WIDTH_MM) return { ok: false, reason: 'too_wide' };
  if (heightMm < GSW_MIN_HEIGHT_MM) return { ok: false, reason: 'too_low' };
  if (heightMm > GSW_MAX_HEIGHT_MM) return { ok: false, reason: 'too_high' };
  const layout = glassSlidingLayout(clearWidthMm);
  return layout ? { ok: true, layout } : { ok: false, reason: 'too_wide' };
}
