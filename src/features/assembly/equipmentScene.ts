import {
  BoxGeometry, BufferGeometry, DoubleSide, MeshBasicMaterial, EdgesGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, Texture,
  type Material, type Object3D,
} from 'three';
import { frameColors } from '../../catalog/catalog';
import type { ConfigurationV1 } from '../../domain/configuration';
import {
  BEAM_DEPTH_MM, BEAM_MM, elementHeightsMm, GABLE_ROOM_MM, gswCheck, listFields, openingOf, postLineOf, sideClearMm, type FieldElement,
} from '../../domain/fieldEquipment';
import { drainPostIndices, postFrame, rafterUndersideAt } from './placements';
import { buildAluminiumWall, buildDrainExtension, buildLightWall, buildStaticCarrier, buildBeamLying, buildBeamStanding, buildGable, createAusstattungMaterials } from './ausstattungScene';
import type { GswLayout } from '../../domain/glassSlidingDoor';
import { buildGlassSlidingWall, createGswMaterials, hasGswParts, type EquipmentParts } from './glassSlidingScene';

type Point = [number, number, number];

/** Screen approximations; the real element models and materials are not supplied yet (schematic only). */
const elementLook = {
  glasschiebewand: { klar: { color: 0xd3e4ee, opacity: 0.35 }, getoent: { color: 0x3f474d, opacity: 0.6 } },
  seitenwand_licht: { color: 0xf4f6f5, opacity: 0.7 },
  senkrechtmarkise: { color: 0x8c8676, opacity: 0.88 },
  gable: { color: 0xd3e4ee, opacity: 0.35 },
} as const;

/** Glasschiebewand layout of each element of a field (null for other elements or when it does not fit). */
export function gswLayoutsFor(configuration: ConfigurationV1): (fieldId: string) => (GswLayout | null)[] {
  const fields = new Map(listFields(configuration).map((field) => [field.id, field]));
  return (fieldId) => {
    const field = fields.get(fieldId);
    const entry = configuration.fieldEquipment.find((item) => item.fieldId === fieldId);
    if (!field || !entry) return [];
    const heights = elementHeightsMm(field, entry);
    return entry.elements.map((element, index) => {
      if (element.type !== 'glasschiebewand') return null;
      const check = gswCheck(field, heights[index]);
      return check.ok ? check.layout : null;
    });
  };
}

/** What a 50×100 handle moves: the split of a field (rule 7) or a side divider (rule 2). */
export type BeamHandle = { kind: 'split'; fieldId: string } | { kind: 'divider'; side: 'left' | 'right'; index: number };
export const beamHandleKey = (handle: BeamHandle) => handle.kind === 'split' ? `split:${handle.fieldId}` : `divider:${handle.side}:${handle.index}`;

/**
 * Invisible box a little larger than a movable 50×100, in the builders' local frame. The viewer drags it like a
 * post and tints it blue on hover (owner, 3 Oct 2026). Never exported.
 */
function beamHandleMesh(handle: BeamHandle, lengthMm: number, heightMm: number): Mesh {
  const margin = 15;
  const geometry = new BoxGeometry((lengthMm + 2 * margin) / 1000, (heightMm + 2 * margin) / 1000, (BEAM_DEPTH_MM + 2 * margin) / 1000);
  geometry.translate(lengthMm / 2000, heightMm / 2000, BEAM_DEPTH_MM / 2000);
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ color: 0x2f9dff, transparent: true, opacity: 0, depthWrite: false }));
  mesh.userData.beamHandle = handle;
  mesh.userData.exportable = false;
  mesh.renderOrder = 3;
  return mesh;
}

const GABLE_INTO_RAFTER_MM = 15;
const DRAIN_OUTLET_BEHIND_DEPTH_MM = 69;

/** How far each element's outer face sits inside the end post's outer face on a side (Referans 1/2, mm). */
const SIDE_INSET_MM = { aluminiumwand: 10, glasschiebewand: 5, beam: 0, gable: 10 } as const;

/**
 * Ausstattung layer (V2). Real models where the parts are loaded (3 Oct 2026): Glasschiebewand, Aluminiumwand,
 * the 50×100 between two elements, under the Giebeldreieck and between side parts, and the Giebeldreieck itself.
 * Seitenwand lichtdurchlässig from WD-55 windows (4 Oct 2026). Senkrechtmarkise stays schematic until its model is built (translucent panel
 * framed in the frame colour), as does everything while the parts are still loading. Front elements sit centred on
 * the post depth between the post faces; side elements run from the wall to the end post, flush towards its outer
 * face. Not a product model; never picked.
 */
export function createEquipmentGroup(configuration: ConfigurationV1, parts?: EquipmentParts | null): Group {
  const group = new Group();
  group.name = 'Ausstattung';
  group.userData.equipment = true;
  const { width, depth, rearHeight, frontHeight } = configuration.dimensionsMm;
  const posts = configuration.postCenters;
  if ((!configuration.fieldEquipment.length && !configuration.sideLayouts.length && !configuration.postInsetMm) || width === null || depth === null
    || rearHeight === null || frontHeight === null || !posts?.length) return group;
  // Post faces measured on the product model (Prime 11 × 11 cm, Premium 13 × 13,5 cm).
  const posted = postFrame(configuration.productId);
  // Middle of the post depth, where front elements stand.
  const line = postLineOf(configuration)!;
  const frontZ = (line.frontZ + line.backZ) / 2;
  const frameHex = frameColors[configuration.frameColor].hex;
  const frame = new LineBasicMaterial({ color: frameHex });
  const materials = new Map<string, MeshStandardMaterial>();
  const material = (key: string, color: number | string, opacity: number) => {
    let found = materials.get(key);
    if (!found) {
      found = new MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: 0.5, metalness: 0.05, side: DoubleSide, depthWrite: opacity >= 0.9 });
      materials.set(key, found);
    }
    return found;
  };
  const gswMaterials = createGswMaterials(frameHex);
  const profileMaterials = createAusstattungMaterials(frameHex);
  const profiles = parts && ['beam50x100', 'fProfile', 'lamella', 'wd55'].every((id) => parts.has(id)) ? parts : null;
  const layoutsFor = gswLayoutsFor(configuration);
  const lookFor = (element: FieldElement) => {
    switch (element.type) {
      case 'glasschiebewand': { const look = elementLook.glasschiebewand[element.glassTone ?? 'klar']; return material(`gsw-${element.glassTone ?? 'klar'}`, look.color, look.opacity); }
      case 'aluminiumwand': return material('alu', frameHex, 0.96);
      case 'seitenwand_licht': return material('licht', elementLook.seitenwand_licht.color, elementLook.seitenwand_licht.opacity);
      case 'senkrechtmarkise': return material('markise', elementLook.senkrechtmarkise.color, elementLook.senkrechtmarkise.opacity);
    }
  };
  const addPolygon = (points: Point[], fill: Material) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(points.flat().map((value) => value / 1000), 3));
    geometry.setIndex(points.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2]);
    geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, fill);
    mesh.raycast = () => undefined;
    mesh.renderOrder = 2;
    const outline = new LineSegments(new EdgesGeometry(geometry), frame);
    outline.raycast = () => undefined;
    mesh.add(outline);
    group.add(mesh);
  };
  const sidePostX = (side: 'left' | 'right') => side === 'left' ? posts[posts.length - 1].xMm : posts[0].xMm;
  /**
   * Puts a builder's local frame (X along the field, Y up, Z depth) into the scene. Front: from the left post face,
   * centred on the post depth. Side: local X runs from `startMm` (measured from the wall) to the garden; the
   * outer face sits `insetMm` inside the end post's outer face.
   */
  const place = (object: Object3D, field: { kind: 'front' | 'side'; side?: 'left' | 'right'; insideIndex?: number }, startMm: number, baseMm: number, depthMm: number, insetMm: number) => {
    if (field.kind === 'front') {
      object.position.set((posts[field.insideIndex!].xMm + posted.alongPlusMm + startMm) / 1000, baseMm / 1000, (frontZ - depthMm / 2) / 1000);
    } else {
      // rotation.y = π/2: local X → −Z (garden), local Z → +X.
      object.rotation.y = Math.PI / 2;
      const x = field.side === 'left' ? sidePostX('left') + posted.alongPlusMm - insetMm - depthMm : sidePostX('right') - posted.alongMinusMm + insetMm;
      object.position.set(x / 1000, baseMm / 1000, -startMm / 1000);
    }
    group.add(object);
  };

  for (const field of listFields(configuration)) {
    const entry = configuration.fieldEquipment.find((item) => item.fieldId === field.id);
    if (!entry) continue;
    const start = field.startMm ?? 0;
    // Corner points of a band from height y0 to y1 in this field's plane (schematic stand-ins).
    let band: (y0: number, y1: number) => Point[];
    if (field.kind === 'front') {
      const index = field.insideIndex!;
      const x0 = posts[index].xMm + posted.alongPlusMm;
      const x1 = posts[index + 1].xMm - posted.alongMinusMm;
      band = (y0, y1) => [[x0, y0, frontZ], [x1, y0, frontZ], [x1, y1, frontZ], [x0, y1, frontZ]];
    } else {
      const x = sidePostX(field.side!);
      band = (y0, y1) => [[x, y0, -start], [x, y0, -(start + field.widthMm)], [x, y1, -(start + field.widthMm)], [x, y1, -start]];
    }
    const heights = elementHeightsMm(field, entry);
    const layouts = layoutsFor(field.id);
    let base = 0;
    entry.elements.forEach((element, index) => {
      const height = heights[index];
      const layout = layouts[index];
      if (element.type === 'glasschiebewand' && layout && hasGswParts(parts, layout)) {
        // Customer's left from outside: front → garden-left (inside max X); right side → garden end (local max X);
        // left side → wall end (local X = 0).
        const wall = buildGlassSlidingWall(parts, gswMaterials, { lengthMm: field.widthMm, heightMm: height, layout, element,
          opening: openingOf(element, field), leftIsLocalMax: !(field.kind === 'side' && field.side === 'left') });
        place(wall, field, start, base, wall.userData.depthMm as number, SIDE_INSET_MM.glasschiebewand);
      } else if (element.type === 'aluminiumwand' && profiles) {
        const wall = buildAluminiumWall(profiles, profileMaterials, { lengthMm: field.widthMm, heightMm: height });
        place(wall, field, start, base, wall.userData.depthMm as number, SIDE_INSET_MM.aluminiumwand);
      } else if (element.type === 'seitenwand_licht' && profiles) {
        const wall = buildLightWall(profiles, profileMaterials, { lengthMm: field.widthMm, heightMm: height, filling: element.filling ?? 'glas_klar' });
        place(wall, field, start, base, wall.userData.depthMm as number, SIDE_INSET_MM.aluminiumwand);
      } else {
        addPolygon(band(base, base + height), lookFor(element));
      }
      base += height;
      // Rule 5: a 50×100 lies between two stacked elements (Referans 2).
      if (index === 0 && entry.elements.length === 2) {
        if (profiles) place(buildBeamLying(profiles, profileMaterials.frame, field.widthMm), field, start, base, BEAM_DEPTH_MM, SIDE_INSET_MM.beam);
        place(beamHandleMesh({ kind: 'split', fieldId: field.id }, field.widthMm, BEAM_MM), field, start, base, BEAM_DEPTH_MM, SIDE_INSET_MM.beam);
        base += BEAM_MM;
      }
    });
  }

  // Posts moved in (4 Oct 2026): the static carrier over the whole width and the extra drain pipe from the gutter
  // outlet to every drain post.
  if (line.carrier && parts?.has('staticCarrier') && parts.has('staticCarrierCap') && parts.has('drainExtension')) {
    const carrier = buildStaticCarrier(parts, profileMaterials.frame, width);
    carrier.position.set(0, line.carrier.bottomMm / 1000, line.carrier.frontZ / 1000);
    group.add(carrier);
    const pipeMaterial = material('drain-pipe', 0x9aa1a6, 1);
    pipeMaterial.metalness = 0.6;
    // Gutter outlet 6,9 cm behind the depth line (Referans 3); the pipe ends at the post's garden face.
    const outletZ = -depth + DRAIN_OUTLET_BEHIND_DEPTH_MM;
    for (const index of drainPostIndices(width, configuration.drainSide, posts.length)) {
      const pipe = buildDrainExtension(parts, pipeMaterial, Math.max(50, line.frontZ - outletZ));
      pipe.position.set((posts[index].xMm - (pipe.userData.widthMm as number) / 2) / 1000, (line.postTopMm - (pipe.userData.heightMm as number)) / 1000, outletZ / 1000);
      group.add(pipe);
    }
  }

  // Per side: the 50×100 under the Giebeldreieck (rule 4), the standing 50×100 between parts (rule 2) and the gable.
  const sideClear = sideClearMm(configuration);
  const sideHeight = frontHeight - GABLE_ROOM_MM - BEAM_MM;
  // Giebeldreieck up to the side rafter's underside and 1,5 cm into it: on site the joint is sealed with silicone,
  // in the model no gap may show between rafter and triangle (owner, 3 Oct 2026).
  const roofAt = (fromWallMm: number) => rafterUndersideAt(configuration.productId, depth, rearHeight, frontHeight, fromWallMm) + GABLE_INTO_RAFTER_MM;
  for (const layout of configuration.sideLayouts) {
    const field = { kind: 'side' as const, side: layout.side };
    layout.dividersMm.forEach((centre, index) => {
      if (profiles) place(buildBeamStanding(profiles, profileMaterials.frame, sideHeight), field, centre - BEAM_MM / 2, 0, BEAM_DEPTH_MM, SIDE_INSET_MM.beam);
      place(beamHandleMesh({ kind: 'divider', side: layout.side, index }, BEAM_MM, sideHeight), field, centre - BEAM_MM / 2, 0, BEAM_DEPTH_MM, SIDE_INSET_MM.beam);
    });
    if (!layout.gable) continue;
    const bottom = sideHeight + BEAM_MM;
    if (profiles) {
      place(buildBeamLying(profiles, profileMaterials.frame, sideClear), field, 0, sideHeight, BEAM_DEPTH_MM, SIDE_INSET_MM.beam);
      const gable = buildGable(profiles, profileMaterials, { lengthMm: sideClear, bottomMm: 0, topAtWallMm: roofAt(0) - bottom, topAtPostMm: roofAt(sideClear) - bottom, variant: layout.gable });
      place(gable, field, 0, bottom, gable.userData.depthMm as number, SIDE_INSET_MM.gable);
    } else {
      const x = sidePostX(layout.side);
      addPolygon([[x, bottom, 0], [x, bottom, -sideClear], [x, roofAt(sideClear), -sideClear], [x, roofAt(0), 0]],
        material('gable', elementLook.gable.color, elementLook.gable.opacity));
    }
  }
  return group;
}

export function disposeEquipmentGroup(group: Group): void {
  const materials = new Set<Material>();
  group.traverse((object) => {
    if (!('geometry' in object && 'material' in object)) return;
    const drawable = object as Mesh;
    // Profile geometry belongs to the part library cache.
    if (!object.userData.sharedAsset) drawable.geometry.dispose();
    for (const item of Array.isArray(drawable.material) ? drawable.material : [drawable.material]) materials.add(item);
  });
  for (const item of materials) {
    for (const value of Object.values(item)) if (value instanceof Texture) value.dispose();
    item.dispose();
  }
}
