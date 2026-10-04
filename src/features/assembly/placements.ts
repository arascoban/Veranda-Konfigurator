import { DRAIN_BOTH_SIDES_ABOVE_MM, roofMaterials, type FrameColorId, type ProductId, type RoofFinishId, type RoofMaterialId } from '../../catalog/catalog';
import type { AwningType } from '../../domain/awning';
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
  /** Post axis (x, mm) for post placements; the holder/hit area/marker sit here. */
  postCentreMm?: number;
  bayIndex?: number;
};

export type AssemblyLayout = {
  productId: ProductId;
  roofMaterialId: RoofMaterialId;
  frameColor: FrameColorId;
  widthMm: number;
  depthMm: number;
  rearHeightMm: number;
  frontHeightMm: number;
  slopeDegrees: number;
  rafterLengthMm: number;
  bayCount: number;
  /** Cap (clear) width of every bay, left to right. */
  capWidthsMm: number[];
  /** Tone of every bay, left to right. */
  roofFinishes: RoofFinishId[];
  /** Placeholder awning slabs until the real awning models arrive (1 Oct 2026). */
  awnings: AwningSlab[];
  /** Rafter underside line at the wall end plus the roof directions, for things laid onto the roof plane. */
  roofPlane: { rearMm: Vec3; d: Vec3; nrm: Vec3; lengthMm: number; rafterHeightMm: number };
  placements: PartPlacement[];
  /** Side fields for the pick planes (whole side or its 50×100 parts), from the wall; set from the configuration. */
  sideFields?: SideFieldSpan[];
};

/** `topStartMm` / `topEndMm`: rafter underside above the part's start and end, so the pick area covers the triangle too. */
export type SideFieldSpan = { fieldId: string; side: 'left' | 'right'; outerXMm: number; startMm: number; widthMm: number; heightMm: number; topStartMm: number; topEndMm: number };

/** A simple box standing in for an awning: `xMm` from the inside-left end, running `depthMm` down the roof from the wall (null = rafter cover length). */
export type AwningSlab = { type: AwningType; xMm: number; widthMm: number; depthMm: number | null };

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
  frameColor?: FrameColorId;
  widthMm: number;
  depthMm: number;
  rearHeightMm: number;
  frontHeightMm: number;
  bayCount: number;
  /** Optional unequal bays (awning side fields); defaults to `bayCount` equal bays. */
  capWidthsMm?: readonly number[];
  roofFinishes?: readonly RoofFinishId[];
  awnings?: readonly AwningSlab[];
  postCentersMm: readonly number[];
};

/** Rafter underside line from the garden end to the wall end (mm, scene z and y). */
function rafterUndersideEnds(productId: ProductId, D: number, Hr: number, Hf: number) {
  const spec = assemblySpecs[productId];
  return {
    front: { z: -D + spec.rafterFront.zFromPostFaceMm, y: Hf + spec.attachmentOffsets.frontConnectionAboveGutterUndersideMm },
    rear: { z: -spec.rafterRear.zFromWallFaceMm, y: Hr + spec.attachmentOffsets.rearConnectionAboveWallUndersideMm },
  };
}

/** Height of the rafter underside at `fromWallMm` from the wall (mm); the Giebeldreieck reaches up to it. */
export function rafterUndersideAt(productId: ProductId, D: number, Hr: number, Hf: number, fromWallMm: number): number {
  const { front, rear } = rafterUndersideEnds(productId, D, Hr, Hf);
  return rear.y + (rear.y - front.y) / (rear.z - front.z) * (-fromWallMm - rear.z);
}

/** Pure placement of all parts; the viewer only loads GLBs and applies these transforms. */
export function buildAssemblyLayout(input: AssemblyInput): AssemblyLayout {
  const spec = assemblySpecs[input.productId];
  const { widthMm: W, depthMm: D, rearHeightMm: Hr, frontHeightMm: Hf, bayCount: n } = input;
  const t = n + 1;
  const caps = input.capWidthsMm && input.capWidthsMm.length === n
    ? [...input.capWidthsMm]
    : Array.from({ length: n }, () => (W - spec.supportWidthMm * t) / n);
  const allowance = roofMaterials[input.roofMaterialId].panelAllowanceMm;
  // Left edge of support i / bay i: prefix sums over the (possibly unequal) bays.
  const supportLeft = (i: number) => caps.slice(0, i).reduce((sum, cap) => sum + cap + spec.supportWidthMm, 0);
  const bayLeft = (i: number) => supportLeft(i) + spec.supportWidthMm;
  const c = (i: number) => caps[i];

  const { front, rear } = rafterUndersideEnds(input.productId, D, Hr, Hf);
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
    productId: input.productId, roofMaterialId: input.roofMaterialId, frameColor: input.frameColor ?? 'ral7016', widthMm: W, depthMm: D,
    rearHeightMm: Hr, frontHeightMm: Hf, slopeDegrees, rafterLengthMm: length, bayCount: n, capWidthsMm: caps,
    roofFinishes: input.roofFinishes && input.roofFinishes.length === n ? [...input.roofFinishes] : Array.from({ length: n }, () => 'vsg_klar' as RoofFinishId),
    awnings: [...(input.awnings ?? [])],
    roofPlane: { rearMm: [0, rear.y, rear.z], d, nrm, lengthMm: length, rafterHeightMm: spec.rafterHeightMm },
    placements,
  };
}

type Derived = {
  c: (i: number) => number; n: number; bayLeft: (i: number) => number; supportLeft: (i: number) => number;
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
    // Local z (−110..0) → scene x, local x max = garden face → −D. The post is three slices: the bottom
    // 25 cm (drain outlet) and top 25 cm (cover) keep their size, only the middle slice is stretched.
    const faceX = postFaceX(partId, bounds);
    const heightMm = Hf + spec.postIntoGutterMm;
    const at = (yMm: number): Vec3 => [xc - spec.postSectionMm.alongGutter / 2, yMm, -D];
    const extra = { postIndex: index, postCentreMm: xc };
    out.push(placeAt(`${partId}Bottom`, 'post', postTowardsGarden, [1, 1, 1], [faceX, 0, bounds.min[2]], at(0), extra));
    out.push(placeAt(`${partId}Mid`, 'post', postTowardsGarden, [1, Math.max(0.01, (heightMm - 500) / 500), 1], [faceX, 250, bounds.min[2]], at(250), extra));
    out.push(placeAt(`${partId}Top`, 'post', postTowardsGarden, [1, 1, 1], [faceX, 750, bounds.min[2]], at(heightMm - 250), extra));
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
  // Side rafters stay inside the gutter caps (user correction 30 Sep 2026): their outer lip (local x = −2 mm)
  // sits 2 mm inside the gutter end.
  const sideInset = 4;
  for (let i = 0; i <= n; i += 1) {
    if (i === 0) out.push(placeAt('rafterSide', 'rafter', towardsGarden, rafterScale, [0, 0, 0], [sideInset, rear.y, rear.z]));
    else if (i === n) out.push(placeAt('rafterSide', 'rafter', towardsWall, rafterScale, [0, 0, 0], [W - sideInset, front.y, front.z]));
    else out.push(placeAt('rafterMiddle', 'rafter', towardsWall, rafterScale, [0, 0, 0], [supportLeft(i) + spec.supportWidthMm, front.y, front.z]));
  }

  for (let i = 0; i < n; i += 1) {
    const xL = bayLeft(i);
    const cw = c(i);
    out.push(placeAt('cover', 'cover', alongX, [1, 1, cw / 1000], [0, 0, 0],
      [xL, Hf + spec.coverAtGutter.aboveGutterUndersideMm, -D + spec.coverAtGutter.zFromPostFaceMm], { bayIndex: i }));
    out.push(placeAt('cover', 'cover', alongXBack, [1, 1, cw / 1000], [0, 0, 0],
      [xL + cw, Hr + spec.coverAtWall.aboveWallUndersideMm, -spec.coverAtWall.zFromWallFaceMm], { bayIndex: i }));
    const lift = spec.rafterHeightMm - spec.panelBelowRafterTopMm;
    out.push(placeAt('panel', 'panel', { x: X, y: nrm, z: d }, [(cw + allowance) / 1000, 1, length / 1000], [0, 0, 0],
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
    // Three slices: fixed bottom (outlet) and top (fittings), stretched middle.
    const heightMm = Hf + spec.postIntoGutterMm;
    const localX = bounds.min[0] + spec.postSectionMm.alongGutter;
    const at = (yMm: number): Vec3 => [xc - spec.postSectionMm.alongGutter / 2, yMm, -D];
    const extra = { postIndex: index, postCentreMm: xc };
    out.push(placeAt(`${partId}Bottom`, 'post', turned, [1, 1, 1], [localX, 0, 0], at(0), extra));
    out.push(placeAt(`${partId}Mid`, 'post', turned, [1, Math.max(0.01, (heightMm - 500) / 500), 1], [localX, 250, 0], at(250), extra));
    out.push(placeAt(`${partId}Top`, 'post', turned, [1, 1, 1], [localX, 750, 0], at(heightMm - 250), extra));
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
  const upMirrored = { x: d, y: nrm, z: X };       // one side rafter is the mirrored component, as in the reference
  // The side rafter has its seal/groove on the local z = 0 side only; that side must face the glass.
  // Left (x = 0): local z runs towards −X, so the groove at z ≈ 0 lies at x = sideWidth (inside).
  // Right (x = W): mirrored, local z runs towards +X, groove at x = W − sideWidth (inside).
  const sideWidth = mmBounds(spec.parts.rafterSideTop).max[2];
  for (let i = 0; i <= n; i += 1) {
    const kind = i === 0 || i === n ? 'rafterSide' : 'rafterMiddle';
    const basis = i === n ? upMirrored : up;
    const x = i === 0 ? sideWidth : i === n ? W - sideWidth : supportLeft(i) + spec.supportWidthMm;
    const at: Vec3 = [x, front.y, front.z];
    out.push(placeAt(`${kind}Body`, 'rafter', basis, bodyScale, [0, rafterBody.min[1], 0], at));
    out.push(placeAt(`${kind}Top`, 'rafter', basis, bodyScale, [0, rafterBody.min[1], 0], at));
    out.push(placeAt(`${kind}TopFront`, 'rafter', basis, [1, 1, 1], [0, rafterBody.min[1], 0], at));
    out.push(placeAt(`${kind}TopRear`, 'rafter', basis, [1, 1, 1], [1000, rafterBody.min[1], 0], [x, rear.y, rear.z]));
  }

  for (let i = 0; i < n; i += 1) {
    const xL = bayLeft(i);
    const cw = c(i);
    out.push(placeAt('cover', 'cover', identity, [cw / 1000, 1, 1], [cover.min[0], cover.min[1], cover.min[2]],
      [xL, Hf + spec.coverAtGutter.aboveGutterUndersideMm, -D + spec.coverAtGutter.zFromPostFaceMm], { bayIndex: i }));
    out.push(placeAt('cover', 'cover', turned, [cw / 1000, 1, 1], [cover.min[0], cover.min[1], cover.min[2]],
      [xL + cw, Hr + spec.coverAtWall.aboveWallUndersideMm, -spec.coverAtWall.zFromWallFaceMm], { bayIndex: i }));
    // The roof panel is always as long as the rafter cover: 5 cm beyond the body at the gutter, 2 cm at the wall.
    const lift = spec.rafterHeightMm - spec.panelBelowRafterTopMm;
    const overFront = rafterBody.min[0] - mmBounds(spec.parts.rafterMiddleTopFront).min[0];
    const overRear = mmBounds(spec.parts.rafterMiddleTopRear).max[0] - rafterBody.max[0];
    const rearEnd: Vec3 = [xL - allowance / 2, rear.y + nrm[1] * lift + d[1] * overRear, rear.z + nrm[2] * lift + d[2] * overRear];
    out.push(placeAt('panel', 'panel', { x: X, y: nrm, z: d }, [(cw + allowance) / 1000, 1, (length + overFront + overRear) / 1000], [0, 0, 0],
      rearEnd, { bayIndex: i }));
  }
  return out;
}

/** Scene bounds (mm) of one placed part, from its measured local bounds. */
export function placementBoundsMm(productId: ProductId, placement: PartPlacement): { min: Vec3; max: Vec3 } {
  const bounds = mmBounds(assemblySpecs[productId].parts[placement.partId as keyof ProductAssemblySpec['parts']]);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const cx of [bounds.min[0], bounds.max[0]]) for (const cy of [bounds.min[1], bounds.max[1]]) for (const cz of [bounds.min[2], bounds.max[2]]) {
    const local = [cx * placement.scale[0], cy * placement.scale[1], cz * placement.scale[2]];
    for (let axis = 0; axis < 3; axis += 1) {
      const value = placement.originMm[axis] + placement.basis.x[axis] * local[0] + placement.basis.y[axis] * local[1] + placement.basis.z[axis] * local[2];
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }
  return { min: min as unknown as Vec3, max: max as unknown as Vec3 };
}

/**
 * Where the posts really stand, measured from the placed models (3 Oct 2026, owner: equipment must fit every
 * product, also future ones, without per-model numbers). Relative to the depth line z = −D and the post axis:
 * the garden face lies `frontBeyondDepthMm` in front of −D, the back face `backFromDepthMm` behind it; the post
 * reaches `alongMinusMm` / `alongPlusMm` either side of its axis. Prime 2,5 cm / 11 cm, Premium 0 / 13,5 cm.
 */
export type PostFrame = { frontBeyondDepthMm: number; backFromDepthMm: number; alongMinusMm: number; alongPlusMm: number };
const postFrames = new Map<ProductId, PostFrame>();

export function postFrame(productId: ProductId): PostFrame {
  const cached = postFrames.get(productId);
  if (cached) return cached;
  const D = 3000;
  const layout = buildAssemblyLayout({
    productId, roofMaterialId: 'glass', widthMm: 5000, depthMm: D, rearHeightMm: 2720, frontHeightMm: 2300, bayCount: 6,
    postCentersMm: [1000, 4000], drainSide: 'left', postCapStyle: 'gerade',
  } as AssemblyInput);
  let minZ = Infinity, maxZ = -Infinity, minX = Infinity, maxX = -Infinity;
  // The plain post (index 0 here: the drain pipe sits on the other end) without the drain outlet.
  for (const placement of layout.placements.filter((item) => item.role === 'post' && item.postIndex === 0)) {
    const bounds = placementBoundsMm(productId, placement);
    minZ = Math.min(minZ, bounds.min[2]); maxZ = Math.max(maxZ, bounds.max[2]);
    minX = Math.min(minX, bounds.min[0]); maxX = Math.max(maxX, bounds.max[0]);
  }
  const frame = {
    frontBeyondDepthMm: Math.round(-D - minZ), backFromDepthMm: Math.round(maxZ + D),
    alongMinusMm: Math.round(1000 - minX), alongPlusMm: Math.round(maxX - 1000),
  };
  postFrames.set(productId, frame);
  return frame;
}
