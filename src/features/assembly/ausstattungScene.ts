import {
  Box3, BufferAttribute, BufferGeometry, DoubleSide, Group, Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Shape, ShapeGeometry,
  Vector2, Vector3, type Material,
} from 'three';
import type { GableVariant } from '../../domain/fieldEquipment';
import type { EquipmentParts } from './glassSlidingScene';

/**
 * Aluminiumwand, 50×100 and Giebeldreieck from the owner's single profiles (3 Oct 2026, Models/Ausstatungen/Parcalar,
 * docs/Ausstatungen_Kurallar.md rules 4, 5, 8, 9). Sizes measured in prepare_models.py:
 * - F profile 100 × 2,0 × 2,9 cm: spine 1 mm at y = 0 over the full 2,9 cm depth, two arms of 2 cm up (+Y); the
 *   lamellas sit in the 1,6 cm channel between the arms (z 1,2–2,8 cm).
 * - Lamelle 99 × 15 × 1,6 cm, tongue up; stacked every 14,6 cm (Referans 1).
 * - 50×100: hollow 10 × 5 cm, modelled standing (length along Y).
 * - WD-55: 5,5 cm deep × 5,95 cm (glass rebate side up), length along Z.
 * Local frame of every builder (mm): X along the field, Y up, Z depth (0 = outer face side).
 */
const F_DEPTH_MM = 29;
const F_SPINE_MM = 1;
const F_CHANNEL_Z_MM = 12;
const LAMELLA_PITCH_MM = 146;
const WD55_DEPTH_MM = 55;
const WD55_FACE_MM = 45;

export type AusstattungMaterials = { frame: Material; fills: Record<Exclude<GableVariant, 'aluminium'>, Material> };

export function createAusstattungMaterials(frameHex: string): AusstattungMaterials {
  const fill = (color: number, opacity: number, roughness: number, transmission = 0) => new MeshPhysicalMaterial({
    color, transparent: true, opacity, roughness, metalness: 0, transmission, side: DoubleSide, depthWrite: false,
  });
  return {
    frame: new MeshStandardMaterial({ color: frameHex, metalness: 0.45, roughness: 0.5 }),
    fills: {
      glas_klar: fill(0xd3e4ee, 0.28, 0.05),
      glas_milch: fill(0xf2f4f3, 0.82, 0.6),
      glas_getoent: fill(0x3f474d, 0.55, 0.08),
      poly_opal: fill(0xf6f3ea, 0.86, 0.75),
      poly_klar: fill(0xdde8ee, 0.4, 0.25),
      poly_bronze: fill(0x4a4440, 0.62, 0.3),
    },
  };
}

/** Mapping of a part's own axes onto the local frame: the length axis to X, the rest as named. */
const AXES = {
  // 50×100 lying: length (part Y) → X, 5 cm (part Z) → Y, 10 cm (part X) → Z.
  beamLying: new Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1),
  // 50×100 standing: 5 cm (part Z) → X, length (part Y) → Y, 10 cm (part X) → −Z (moved back to z ≥ 0).
  beamStanding: new Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1),
  // WD-55 along X with the rebate side (part Y) up: length (part Z) → X, depth (part X) → −Z.
  wd55: new Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1),
} as const;

/** One part as geometry in the local frame (mm → m), moved so its bounds start at the origin. */
function partGeometries(parts: EquipmentParts, id: string, axes?: Matrix4): BufferGeometry[] {
  const source = parts.get(id);
  if (!source) return [];
  source.updateMatrixWorld(true);
  const pieces: BufferGeometry[] = [];
  source.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const geometry = (object.geometry as BufferGeometry).clone();
    geometry.applyMatrix4(object.matrixWorld);
    if (axes) geometry.applyMatrix4(axes);
    pieces.push(geometry);
  });
  const box = new Box3();
  for (const piece of pieces) { piece.computeBoundingBox(); box.union(piece.boundingBox!); }
  for (const piece of pieces) piece.translate(-box.min.x, -box.min.y, -box.min.z);
  return pieces;
}

/**
 * Keeps the part of a non-indexed triangle soup with `n·p ≤ c` (Sutherland–Hodgman per triangle); cut faces stay
 * open, which is invisible on the thin profiles. Used for the top lamella and the sloped Giebeldreieck edge.
 */
export function clipGeometry(geometry: BufferGeometry, normal: Vector3, constant: number): BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = source.getAttribute('position');
  const out: number[] = [];
  const point = (index: number) => new Vector3().fromBufferAttribute(position, index);
  for (let index = 0; index < position.count; index += 3) {
    const polygon = [point(index), point(index + 1), point(index + 2)];
    const kept: Vector3[] = [];
    for (let at = 0; at < 3; at += 1) {
      const a = polygon[at];
      const b = polygon[(at + 1) % 3];
      const da = normal.dot(a) - constant;
      const db = normal.dot(b) - constant;
      if (da <= 0) kept.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) kept.push(a.clone().lerp(b, da / (da - db)));
    }
    for (let at = 1; at + 1 < kept.length; at += 1) out.push(...kept[0].toArray(), ...kept[at].toArray(), ...kept[at + 1].toArray());
  }
  const result = new BufferGeometry();
  result.setAttribute('position', new BufferAttribute(new Float32Array(out), 3));
  result.computeVertexNormals();
  return result;
}

type Clip = { normal: Vector3; constant: number };

function meshesOf(geometries: BufferGeometry[], material: Material, transform: Matrix4, clip?: Clip | Clip[]): Mesh[] {
  const clips = clip ? (Array.isArray(clip) ? clip : [clip]) : [];
  return geometries.flatMap((geometry) => {
    let placed = geometry.clone().applyMatrix4(transform);
    for (const plane of clips) {
      placed = clipGeometry(placed, plane.normal, plane.constant);
      if (!placed.getAttribute('position').count) return [];
    }
    const mesh = new Mesh(placed, material);
    mesh.castShadow = true;
    mesh.raycast = () => undefined;
    return [mesh];
  });
}

/** Scale along the part's length (X) to `lengthMm`, then rotate about Z by `angle` and move to (x, y, z) mm. */
function along(geometries: BufferGeometry[], lengthMm: number, angle: number, xMm: number, yMm: number, zMm = 0): Matrix4 {
  const box = new Box3();
  for (const geometry of geometries) { geometry.computeBoundingBox(); box.union(geometry.boundingBox!); }
  const length = box.max.x - box.min.x || 1;
  return new Matrix4().makeTranslation(xMm / 1000, yMm / 1000, zMm / 1000)
    .multiply(new Matrix4().makeRotationZ(angle))
    .multiply(new Matrix4().makeScale(lengthMm / 1000 / length, 1, 1));
}

/** F profile with its arms pointing to the left of its run (inwards for a counter-clockwise outline). */
function fProfileRun(parts: EquipmentParts, material: Material, from: [number, number], to: [number, number], clip?: Clip | Clip[]): Mesh[] {
  const geometries = partGeometries(parts, 'fProfile');
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return meshesOf(geometries, material, along(geometries, length, Math.atan2(to[1] - from[1], to[0] - from[0]), from[0], from[1]), clip);
}

/** Lamellas stacked from `bottomMm`, `lengthMm` long from `xMm`, cut at the `clip` line (or the top). */
function lamellas(parts: EquipmentParts, material: Material, xMm: number, lengthMm: number, bottomMm: number, topMm: number, clip?: Clip): Mesh[] {
  const geometries = partGeometries(parts, 'lamella');
  const top = clip ?? { normal: new Vector3(0, 1, 0), constant: topMm / 1000 };
  const meshes: Mesh[] = [];
  for (let y = bottomMm; y < topMm; y += LAMELLA_PITCH_MM) {
    meshes.push(...meshesOf(geometries, material, along(geometries, lengthMm, 0, xMm, y, F_CHANNEL_Z_MM), top));
  }
  return meshes;
}

/**
 * Aluminiumwand (Referans 1/2): F profiles around (bottom, both ends, top) and 15 cm lamellas from the bottom
 * spine up; the top lamella is cut under the top profile. Depth 2,9 cm.
 */
export function buildAluminiumWall(parts: EquipmentParts, materials: AusstattungMaterials, options: { lengthMm: number; heightMm: number }): Group {
  const { lengthMm: length, heightMm: height } = options;
  const wall = new Group();
  wall.name = 'Aluminiumwand';
  const frame = materials.frame;
  wall.add(
    ...fProfileRun(parts, frame, [0, 0], [length, 0]),
    ...fProfileRun(parts, frame, [length, 0], [length, height]),
    ...fProfileRun(parts, frame, [length, height], [0, height]),
    ...fProfileRun(parts, frame, [0, height], [0, 0]),
    ...lamellas(parts, frame, F_SPINE_MM, length - 2 * F_SPINE_MM, F_SPINE_MM, height - F_SPINE_MM),
  );
  wall.userData.depthMm = F_DEPTH_MM;
  return wall;
}

/** 50×100 lying (5 cm high, 10 cm deep) along X over `lengthMm`. */
export function buildBeamLying(parts: EquipmentParts, material: Material, lengthMm: number): Group {
  const geometries = partGeometries(parts, 'beam50x100', AXES.beamLying);
  const group = new Group();
  group.name = '50×100';
  group.add(...meshesOf(geometries, material, along(geometries, lengthMm, 0, 0, 0)));
  return group;
}

/** 50×100 standing (5 cm wide along X, 10 cm deep) from the floor up to `heightMm`. */
export function buildBeamStanding(parts: EquipmentParts, material: Material, heightMm: number): Group {
  const geometries = partGeometries(parts, 'beam50x100', AXES.beamStanding);
  const box = new Box3();
  for (const geometry of geometries) { geometry.computeBoundingBox(); box.union(geometry.boundingBox!); }
  const group = new Group();
  group.name = '50×100 Teilung';
  group.add(...meshesOf(geometries, material, new Matrix4().makeScale(1, heightMm / 1000 / (box.max.y - box.min.y), 1)));
  return group;
}

/**
 * Giebeldreieck over a side: the outline runs from the wall (x = 0) to the end post (x = lengthMm), from `bottomMm`
 * (top of the 50×100) up to the roof line `topAtWallMm` → `topAtPostMm`. Aluminium: F profiles and lamellas cut to
 * the slope (Referans 2); glass or polycarbonate: WD-55 frame with the filling.
 */
export function buildGable(parts: EquipmentParts, materials: AusstattungMaterials, options: {
  lengthMm: number; bottomMm: number; topAtWallMm: number; topAtPostMm: number; variant: GableVariant;
}): Group {
  const { lengthMm: length, bottomMm: bottom, topAtWallMm: wallTop, topAtPostMm: postTop } = options;
  const gable = new Group();
  gable.name = `Giebeldreieck ${options.variant}`;
  const outline: [number, number][] = [[0, bottom], [length, bottom], [length, postTop], [0, wallTop]];
  // Keep everything under the roof line: y + s·x ≤ wallTop (metres).
  const slope = (wallTop - postTop) / length;
  const norm = Math.hypot(slope, 1);
  const underRoof = (insetMm: number) => ({ normal: new Vector3(slope / norm, 1 / norm, 0), constant: (wallTop - insetMm * norm) / 1000 / norm });
  // The sloped member's depth tilts past the wall and post ends: cut it to the side length.
  const withinSide: Clip[] = [{ normal: new Vector3(-1, 0, 0), constant: 0 }, { normal: new Vector3(1, 0, 0), constant: length / 1000 }];
  if (options.variant === 'aluminium') {
    const frame = materials.frame;
    gable.add(
      ...fProfileRun(parts, frame, outline[0], outline[1]),
      ...fProfileRun(parts, frame, outline[1], [length, postTop + 50], underRoof(0)),
      ...fProfileRun(parts, frame, outline[2], outline[3], withinSide),
      ...fProfileRun(parts, frame, [0, wallTop + 50], outline[0], underRoof(0)),
      ...lamellas(parts, frame, F_SPINE_MM, length - 2 * F_SPINE_MM, bottom + F_SPINE_MM, Math.max(wallTop, postTop), underRoof(F_SPINE_MM)),
    );
    gable.userData.depthMm = F_DEPTH_MM;
    return gable;
  }
  const geometries = partGeometries(parts, 'wd55', AXES.wd55);
  for (let index = 0; index < outline.length; index += 1) {
    const from = outline[index];
    const to = outline[(index + 1) % outline.length];
    const run = Math.hypot(to[0] - from[0], to[1] - from[1]);
    gable.add(...meshesOf(geometries, materials.frame, along(geometries, run, Math.atan2(to[1] - from[1], to[0] - from[0]), from[0], from[1]), withinSide));
  }
  // Filling inside the profiles' face, in the middle of the depth.
  const inner = insetPolygon(outline, WD55_FACE_MM);
  const shape = new Shape(inner.map(([x, y]) => new Vector2(x / 1000, y / 1000)));
  const filling = new Mesh(new ShapeGeometry(shape), materials.fills[options.variant]);
  filling.position.z = WD55_DEPTH_MM / 2000;
  filling.raycast = () => undefined;
  filling.renderOrder = 2;
  gable.add(filling);
  gable.userData.depthMm = WD55_DEPTH_MM;
  return gable;
}

/** Counter-clockwise convex polygon moved inwards by `insetMm` on every edge. */
export function insetPolygon(points: readonly [number, number][], insetMm: number): [number, number][] {
  const count = points.length;
  const lines = points.map((from, index) => {
    const to = points[(index + 1) % count];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const normal: [number, number] = [-(to[1] - from[1]) / length, (to[0] - from[0]) / length];
    return { point: [from[0] + normal[0] * insetMm, from[1] + normal[1] * insetMm] as [number, number], direction: [to[0] - from[0], to[1] - from[1]] as [number, number] };
  });
  return lines.map((line, index) => {
    const previous = lines[(index + count - 1) % count];
    const cross = previous.direction[0] * line.direction[1] - previous.direction[1] * line.direction[0];
    const t = ((line.point[0] - previous.point[0]) * line.direction[1] - (line.point[1] - previous.point[1]) * line.direction[0]) / cross;
    return [previous.point[0] + previous.direction[0] * t, previous.point[1] + previous.direction[1] * t];
  });
}
