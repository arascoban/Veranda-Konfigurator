import { DRAIN_BOTH_SIDES_ABOVE_MM, roofMaterials, type ProductId, type RoofMaterialId } from '../../catalog/catalog';
import type { ConfigurationV1 } from '../../domain/configuration';
import { evaluateConfiguration } from '../../domain/evaluateConfiguration';
import { assemblySpecs, type MeasuredPart, type PartRole, type ProductAssemblySpec } from './spec';

export type Vec3 = readonly [number, number, number];

/** One placed part. `basis` columns are the scene directions of the part's local X, Y and Z axes. */
export type PartPlacement = {
  partId: string;
  role: PartRole;
  /** Scene position (mm) of the part's local origin. */
  originMm: Vec3;
  basis: { x: Vec3; y: Vec3; z: Vec3 };
  /** Per local axis; only the extrusion axis ever differs from 1. */
  scale: Vec3;
  /** Set on posts so the viewer can attach editing controls. */
  postIndex?: number;
  bayIndex?: number;
};

export type AssemblyLayout = {
  productId: ProductId;
  roofMaterialId: RoofMaterialId;
  widthMm: number;
  depthMm: number;
  rearHeightMm: number;
  frontHeightMm: number;
  slopeDegrees: number;
  rafterLengthMm: number;
  bayCount: number;
  capWidthMm: number;
  placements: PartPlacement[];
};

const X: Vec3 = [1, 0, 0];
const Y: Vec3 = [0, 1, 0];
const Z: Vec3 = [0, 0, 1];
const neg = (v: Vec3): Vec3 => [-v[0], -v[1], -v[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function basisDeterminant(basis: PartPlacement['basis']): number {
  return dot(basis.x, cross(basis.y, basis.z));
}

/**
 * Which end posts carry a drain pipe: the chosen side as seen from the garden (the customer's view of
 * the model), both above 8 m width. Garden-left is the x = W end of the inside-left-based axis.
 */
export function drainPostIndices(widthMm: number, drainSide: 'left' | 'right', postCount: number): Set<number> {
  const indices = new Set<number>();
  if (postCount === 0) return indices;
  if (widthMm > DRAIN_BOTH_SIDES_ABOVE_MM || drainSide === 'left') indices.add(postCount - 1);
  if (widthMm > DRAIN_BOTH_SIDES_ABOVE_MM || drainSide === 'right') indices.add(0);
  return indices;
}

function mmBounds(part: MeasuredPart): { min: Vec3; max: Vec3 } {
  return {
    min: [part.boundsMinCm[0] * 10, part.boundsMinCm[1] * 10, part.boundsMinCm[2] * 10],
    max: [part.boundsMaxCm[0] * 10, part.boundsMaxCm[1] * 10, part.boundsMaxCm[2] * 10],
  };
}

/** Origin such that the scaled local point lands on the scene point under the given basis. */
function placeAt(partId: string, role: PartRole, basis: PartPlacement['basis'], scale: Vec3,
  localMm: Vec3, sceneMm: Vec3, extra: Partial<PartPlacement> = {}): PartPlacement {
  const scaled: Vec3 = [localMm[0] * scale[0], localMm[1] * scale[1], localMm[2] * scale[2]];
  const world: Vec3 = [
    basis.x[0] * scaled[0] + basis.y[0] * scaled[1] + basis.z[0] * scaled[2],
    basis.x[1] * scaled[0] + basis.y[1] * scaled[1] + basis.z[1] * scaled[2],
    basis.x[2] * scaled[0] + basis.y[2] * scaled[1] + basis.z[2] * scaled[2],
  ];
  return { partId, role, basis, scale, originMm: [sceneMm[0] - world[0], sceneMm[1] - world[1], sceneMm[2] - world[2]], ...extra };
}

export type AssemblyInput = {
  productId: ProductId;
  roofMaterialId: RoofMaterialId;
  postCapStyle: 'gerade' | 'halb';
  drainSide: 'left' | 'right';
  widthMm: number;
  depthMm: number;
  rearHeightMm: number;
  frontHeightMm: number;
  bayCount: number;
  postCentersMm: readonly number[];
};

/** Pure placement of all parts; the viewer only loads GLBs and applies these transforms. */
export function buildAssemblyLayout(input: AssemblyInput): AssemblyLayout {
  const spec = assemblySpecs[input.productId];
  const { widthMm: W, depthMm: D, rearHeightMm: Hr, frontHeightMm: Hf, bayCount: n } = input;
  const t = n + 1;
  const c = (W - spec.supportWidthMm * t) / n;
  const allowance = roofMaterials[input.roofMaterialId].panelAllowanceMm;
  const bayLeft = (i: number) => i * (c + spec.supportWidthMm) + spec.supportWidthMm;
  const supportLeft = (i: number) => i * (c + spec.supportWidthMm);

  // Rafter underside line from the garden end to the wall end.
  const front = { z: -D + spec.rafterFront.zFromPostFaceMm, y: Hf + spec.attachmentOffsets.frontConnectionAboveGutterUndersideMm };
  const rear = { z: -spec.rafterRear.zFromWallFaceMm, y: Hr + spec.attachmentOffsets.rearConnectionAboveWallUndersideMm };
  const run = rear.z - front.z;
  const rise = rear.y - front.y;
  const length = Math.hypot(run, rise);
  const d: Vec3 = [0, rise / length, run / length];       // along the rafter, towards the wall
  const nrm: Vec3 = [0, run / length, -rise / length];     // perpendicular to the roof, upwards
  const slopeDegrees = Math.atan2(rise, run) * 180 / Math.PI;

  const placements = input.productId === 'prime'
    ? primePlacements(spec, input, { c, n, bayLeft, supportLeft, front, rear, length, d, nrm, allowance })
    : premiumPlacements(spec, input, { c, n, bayLeft, supportLeft, front, rear, length, d, nrm, allowance });

  return {
    productId: input.productId, roofMaterialId: input.roofMaterialId, widthMm: W, depthMm: D,
    rearHeightMm: Hr, frontHeightMm: Hf, slopeDegrees, rafterLengthMm: length, bayCount: n, capWidthMm: c, placements,
  };
}

type Derived = {
  c: number; n: number; bayLeft: (i: number) => number; supportLeft: (i: number) => number;
  front: { z: number; y: number }; rear: { z: number; y: number }; length: number; d: Vec3; nrm: Vec3; allowance: number;
};

/** Garden-facing local x of a Prime post part: the body's front face, ignoring the protruding drain outlet. */
function postFaceX(partId: string, bounds: { min: Vec3; max: Vec3 }): number {
  return partId === 'postRohr' ? 110 : partId === 'postRohrHalb' ? 135 : bounds.max[0];
}

/** Prime parts are 1 m extrusions along local −Z with the cross-section at the origin. */
function primePlacements(spec: ProductAssemblySpec, input: AssemblyInput, g: Derived): PartPlacement[] {
  const { widthMm: W, depthMm: D, rearHeightMm: Hr, frontHeightMm: Hf } = input;
  const { c, n, bayLeft, supportLeft, front, rear, length, d, nrm, allowance } = g;
  const out: PartPlacement[] = [];
  const identity = { x: X, y: Y, z: Z };
  const alongX = { x: Z, y: Y, z: neg(X) };          // local −Z → +X, local +X → +Z (towards the wall)
  const alongXBack = { x: neg(Z), y: Y, z: X };      // rotated 180° about Y
  // Post files (Gerade/Halb/Rohr) are modelled with the garden-facing side along local +X and the
  // post body along local −Z; the body height is 1 m. Local +X → scene −Z puts the drain outlet towards the garden.
  const postTowardsGarden = { x: neg(Z), y: Y, z: X };
  const drains = drainPostIndices(W, input.drainSide, input.postCentersMm.length);
  input.postCentersMm.forEach((xc, index) => {
    const partId = drains.has(index)
      ? (input.postCapStyle === 'halb' ? 'postRohrHalb' : 'postRohr')
      : (input.postCapStyle === 'halb' ? 'postHalb' : 'post');
    const bounds = mmBounds(spec.parts[partId]);
    // Local z (−110..0) → scene x, local x max = garden face → −D. Scale the 1 m body (local y) to the post height.
    out.push(placeAt(partId, 'post', postTowardsGarden, [1, (Hf + spec.postIntoGutterMm) / 1000, 1],
      [postFaceX(partId, bounds), 0, bounds.min[2]], [xc - spec.postSectionMm.alongGutter / 2, 0, -D], { postIndex: index }));
  });

  const gutterFrontZ = -D - spec.gutterBeyondPostMm;
  out.push(placeAt('gutter', 'gutter', alongX, [1, 1, W / 1000], [0, 0, 0], [0, Hf, gutterFrontZ]));
  // The single cap part is a plate at the far end of its 1 m extrusion. Both caps keep the gutter's
  // orientation (the profile outline is asymmetric front/back); only the plate position differs.
  out.push(placeAt('gutterCap', 'gutterCap', alongX, [1, 1, 1], [0, 0, -1000], [W, Hf, gutterFrontZ]));
  out.push(placeAt('gutterCap', 'gutterCap', alongX, [1, 1, 1], [0, 0, -1000], [-1, Hf, gutterFrontZ]));

  const wall = mmBounds(spec.parts.wallProfile);
  out.push(placeAt('wallProfile', 'wallProfile', alongXBack, [1, 1, W / (wall.max[2] - wall.min[2])], [0, 0, wall.max[2]], [W, Hr, 0]));
  out.push(placeAt('wallCap', 'wallCap', alongXBack, [1, 1, 1], [0, 0, -1000], [W, Hr, 0]));
  out.push(placeAt('wallCap', 'wallCap', alongX, [1, 1, 1], [0, 0, -1000], [0, Hr, -spec.wallProfileDepthMm]));

  const rafterScale: Vec3 = [1, 1, length / 1000];
  const towardsWall = { x: neg(X), y: nrm, z: neg(d) };   // extrudes from the garden end up to the wall
  const towardsGarden = { x: X, y: nrm, z: d };           // extrudes from the wall end down to the garden
  for (let i = 0; i <= n; i += 1) {
    if (i === 0) out.push(placeAt('rafterSide', 'rafter', towardsGarden, rafterScale, [0, 0, 0], [0, rear.y, rear.z]));
    else if (i === n) out.push(placeAt('rafterSide', 'rafter', towardsWall, rafterScale, [0, 0, 0], [W, front.y, front.z]));
    else out.push(placeAt('rafterMiddle', 'rafter', towardsWall, rafterScale, [0, 0, 0], [supportLeft(i) + spec.supportWidthMm, front.y, front.z]));
  }

  for (let i = 0; i < n; i += 1) {
    const xL = bayLeft(i);
    out.push(placeAt('cover', 'cover', alongX, [1, 1, c / 1000], [0, 0, 0],
      [xL, Hf + spec.coverAtGutter.aboveGutterUndersideMm, -D + spec.coverAtGutter.zFromPostFaceMm], { bayIndex: i }));
    out.push(placeAt('cover', 'cover', alongXBack, [1, 1, c / 1000], [0, 0, 0],
      [xL + c, Hr + spec.coverAtWall.aboveWallUndersideMm, -spec.coverAtWall.zFromWallFaceMm], { bayIndex: i }));
    const lift = spec.rafterHeightMm - spec.panelBelowRafterTopMm;
    out.push(placeAt('panel', 'panel', { x: X, y: nrm, z: d }, [(c + allowance) / 1000, 1, length / 1000], [0, 0, 0],
      [xL - allowance / 2, rear.y + nrm[1] * lift, rear.z + nrm[2] * lift], { bayIndex: i }));
  }
  return out;
}

/**
 * Premium parts are 1 m extrusions along local +X. The reference assembly is turned 180° about Y
 * relative to the scene frame (its left end lies at +X), so reference-placed caps use that basis.
 */
function premiumPlacements(spec: ProductAssemblySpec, input: AssemblyInput, g: Derived): PartPlacement[] {
  const { widthMm: W, depthMm: D, rearHeightMm: Hr, frontHeightMm: Hf } = input;
  const { c, n, bayLeft, supportLeft, front, rear, length, d, nrm, allowance } = g;
  const out: PartPlacement[] = [];
  const identity = { x: X, y: Y, z: Z };
  const turned = { x: neg(X), y: Y, z: neg(Z) };
  const gutter = mmBounds(spec.parts.gutter);
  const wall = mmBounds(spec.parts.wallProfile);
  const cover = mmBounds(spec.parts.cover);
  const rafterBody = mmBounds(spec.parts.rafterMiddleBody);

  const drains = drainPostIndices(W, input.drainSide, input.postCentersMm.length);
  input.postCentersMm.forEach((xc, index) => {
    const partId = drains.has(index) ? 'postRohr' : 'post';
    const bounds = mmBounds(spec.parts[partId]);
    // Body x 0..130, z −135..0 with the garden face at z = 0; turned 180° like the reference assembly.
    out.push(placeAt(partId, 'post', turned, [1, (Hf + spec.postIntoGutterMm) / 1000, 1],
      [bounds.min[0] + spec.postSectionMm.alongGutter, 0, 0], [xc - spec.postSectionMm.alongGutter / 2, 0, -D], { postIndex: index }));
  });

  const gutterFrontZ = -D - spec.gutterBeyondPostMm;
  out.push(placeAt('gutter', 'gutter', identity, [W / 1000, 1, 1], [gutter.min[0], gutter.min[1], gutter.min[2]], [0, Hf, gutterFrontZ]));
  // Caps were repaired in the coordinates of the 500 × 300 reference (MODEL-001); map that frame onto the placed gutter.
  const refGutterLeftX = 5002.18;
  const refGutterBottomY = 2184;
  const refGutterFrontZ = -25.03;
  out.push(placeAt('gutterCapLeft', 'gutterCap', turned, [1, 1, 1], [refGutterLeftX, refGutterBottomY, refGutterFrontZ], [0, Hf, gutterFrontZ]));
  out.push(placeAt('gutterCapRight', 'gutterCap', turned, [1, 1, 1], [refGutterLeftX - 5000, refGutterBottomY, refGutterFrontZ], [W, Hf, gutterFrontZ]));

  out.push(placeAt('wallProfile', 'wallProfile', turned, [W / (wall.max[0] - wall.min[0]), 1, 1], [wall.min[0], wall.min[1], wall.min[2]], [W, Hr, 0]));
  // Cap files: Links sleeves the +X end of the 1 m profile, Rechts the x = 0 end. Their wall face lies at
  // local z = min (outline match, 30 Sep 2026) and their tops align with the profile top.
  const capL = mmBounds(spec.parts.wallCapLeft);
  const capR = mmBounds(spec.parts.wallCapRight);
  const capTopOffset = (capL.max[1] - wall.max[1]);
  out.push(placeAt('wallCapLeft', 'wallCap', turned, [1, 1, 1], [wall.min[0] + 1000, wall.min[1] + capTopOffset, capL.min[2]], [0, Hr, 0]));
  out.push(placeAt('wallCapRight', 'wallCap', turned, [1, 1, 1], [wall.min[0], wall.min[1] + capTopOffset, capR.min[2]], [W, Hr, 0]));

  // Premium rafters: the 1 m body is stretched between gutter and wall; the top strip, cover and seals
  // are split into a stretched middle piece and fixed 5 cm (gutter) / 2 cm (wall) overhangs.
  const bodyScale: Vec3 = [length / (rafterBody.max[0] - rafterBody.min[0]), 1, 1];
  const up = { x: d, y: nrm, z: neg(X) };          // local +X runs from the garden end to the wall
  const upMirrored = { x: d, y: nrm, z: X };       // the left side rafter is the mirrored component, as in the reference
  for (let i = 0; i <= n; i += 1) {
    const kind = i === 0 || i === n ? 'rafterSide' : 'rafterMiddle';
    const basis = i === 0 ? upMirrored : up;
    const x = i === 0 ? 0 : i === n ? W : supportLeft(i) + spec.supportWidthMm;
    const at: Vec3 = [x, front.y, front.z];
    out.push(placeAt(`${kind}Body`, 'rafter', basis, bodyScale, [0, rafterBody.min[1], 0], at));
    out.push(placeAt(`${kind}Top`, 'rafter', basis, bodyScale, [0, rafterBody.min[1], 0], at));
    out.push(placeAt(`${kind}TopFront`, 'rafter', basis, [1, 1, 1], [0, rafterBody.min[1], 0], at));
    out.push(placeAt(`${kind}TopRear`, 'rafter', basis, [1, 1, 1], [1000, rafterBody.min[1], 0], [x, rear.y, rear.z]));
  }

  for (let i = 0; i < n; i += 1) {
    const xL = bayLeft(i);
    out.push(placeAt('cover', 'cover', identity, [c / 1000, 1, 1], [cover.min[0], cover.min[1], cover.min[2]],
      [xL, Hf + spec.coverAtGutter.aboveGutterUndersideMm, -D + spec.coverAtGutter.zFromPostFaceMm], { bayIndex: i }));
    out.push(placeAt('cover', 'cover', turned, [c / 1000, 1, 1], [cover.min[0], cover.min[1], cover.min[2]],
      [xL + c, Hr + spec.coverAtWall.aboveWallUndersideMm, -spec.coverAtWall.zFromWallFaceMm], { bayIndex: i }));
    const lift = spec.rafterHeightMm - spec.panelBelowRafterTopMm;
    out.push(placeAt('panel', 'panel', { x: X, y: nrm, z: d }, [(c + allowance) / 1000, 1, length / 1000], [0, 0, 0],
      [xL - allowance / 2, rear.y + nrm[1] * lift, rear.z + nrm[2] * lift], { bayIndex: i }));
  }
  return out;
}

/** Layout for a complete, rule-valid configuration; null otherwise. */
export function assemblyLayoutFromConfiguration(configuration: ConfigurationV1): AssemblyLayout | null {
  const { width, depth, rearHeight, frontHeight } = configuration.dimensionsMm;
  if (width === null || depth === null || rearHeight === null || frontHeight === null || !configuration.postCenters?.length) return null;
  const evaluation = evaluateConfiguration(configuration);
  // An out-of-range slope is still drawn so the customer sees what the message describes.
  const blocking = evaluation.issues.some((issue) => issue.kind === 'invalid' && issue.code !== 'roof_slope_outside_5_to_12_degrees');
  if (!evaluation.roof?.valid || blocking) return null;
  return buildAssemblyLayout({
    productId: configuration.productId, roofMaterialId: configuration.roofMaterialId,
    postCapStyle: configuration.postCapStyle, drainSide: configuration.drainSide,
    widthMm: width, depthMm: depth, rearHeightMm: rearHeight, frontHeightMm: frontHeight,
    bayCount: evaluation.roof.bayCount, postCentersMm: configuration.postCenters.map((post) => post.xMm),
  });
}
