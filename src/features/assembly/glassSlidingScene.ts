import { Box3, DoubleSide, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Vector3, type Material } from 'three';
import type { ConfigurationV1 } from '../../domain/configuration';
import type { FieldElement, OpeningDirection } from '../../domain/fieldEquipment';
import { GSW_SIDE_PROFILE_MM, type GswLayout } from '../../domain/glassSlidingDoor';
import type { PartLibrary } from './assemblyScene';

/**
 * Glasschiebewand from the owner's single profiles (3 Oct 2026, docs/Masse.md): Unterschiene and Obere Schiene
 * stretched to the field's clear width, a U profile at each end stretched to the height, and the glass leaves
 * (90 cm source leaf scaled to 90/98/103 cm) on their tracks. Only the glass grows with the height; the leaf's
 * bottom carriage keeps its size. Local frame (mm): X along the field, Y up, Z depth (0 = first track side).
 */
export const GSW_RAIL_PROFILES = [3, 4, 5, 6] as const;
const railPart = (rails: number, piece: 'Top' | 'Bottom' | 'Side') => `rail${rails}${piece}`;
export const gswPartPath = (partId: string) => `models/glasschiebewand/${partId}.glb`;

/** Measured from the models (prepare_models.py): glass from 7.8 cm, top 2.2 cm below the rail top; tracks 2.2 cm apart, first at 0.6 cm. */
const GLASS_BOTTOM_MM = 78;
const GLASS_TOP_INSET_MM = 22;
const TOP_RAIL_HEIGHT_MM = 100;
const FIRST_TRACK_MM = 6;
const TRACK_PITCH_MM = 22;
/** Edge strip of `glassLeafEdge`: starts on the carriage (9,3 cm) and ends 8,4 cm under the glass top (Referans 1). */
const STRIP_BOTTOM_MM = 93;
const STRIP_TOP_BELOW_GLASS_MM = 84;

export type EquipmentParts = Map<string, Group>;

function neededPartIds(configuration: ConfigurationV1, layoutFor: (fieldId: string) => (GswLayout | null)[]): string[] {
  const ids = new Set<string>();
  for (const entry of configuration.fieldEquipment) {
    for (const layout of layoutFor(entry.fieldId)) {
      if (!layout) continue;
      for (const piece of ['Top', 'Bottom', 'Side'] as const) ids.add(railPart(layout.railProfile, piece));
      ids.add('glassLeaf');
      ids.add('glassLeafEdge');
    }
  }
  return [...ids];
}

/** Parts already in the library cache, or null if something is still missing. */
export function peekEquipmentParts(configuration: ConfigurationV1, library: PartLibrary, layoutFor: (fieldId: string) => (GswLayout | null)[]): EquipmentParts | null {
  const parts: EquipmentParts = new Map();
  for (const id of neededPartIds(configuration, layoutFor)) {
    const group = library.peek(gswPartPath(id));
    if (!group) return null;
    parts.set(id, group);
  }
  return parts;
}

export async function loadEquipmentParts(configuration: ConfigurationV1, library: PartLibrary, layoutFor: (fieldId: string) => (GswLayout | null)[]): Promise<EquipmentParts> {
  const ids = neededPartIds(configuration, layoutFor);
  const groups = await Promise.all(ids.map((id) => library.load(gswPartPath(id))));
  return new Map(ids.map((id, index) => [id, groups[index]]));
}

export function hasGswParts(parts: EquipmentParts | null | undefined, layout: GswLayout): parts is EquipmentParts {
  return Boolean(parts && parts.has('glassLeaf') && parts.has('glassLeafEdge') && ['Top', 'Bottom', 'Side'].every((piece) => parts.has(railPart(layout.railProfile, piece as 'Top'))));
}

/** Track of each leaf, leaves counted from the customer's left. Neighbours never share a track. */
export function leafTracks(leaves: number, opening: OpeningDirection): number[] {
  return Array.from({ length: leaves }, (_, index) => opening === 'links' ? index : leaves - 1 - index);
}

/**
 * Which edge of each leaf (counted from the customer's left) carries the edge strip (owner, 3 Oct 2026): the edge
 * facing the neighbour it overlaps. Opening to the left: every leaf but the right-most has it on its right edge;
 * opening to the right: mirrored, every leaf but the left-most on its left edge.
 */
export function leafStrips(leaves: number, opening: OpeningDirection): ('left' | 'right' | null)[] {
  return Array.from({ length: leaves }, (_, index) => opening === 'links'
    ? index < leaves - 1 ? 'right' : null
    : index > 0 ? 'left' : null);
}

export type GswMaterials = { frame: Material; metal: Material; glass: Record<'klar' | 'getoent', Material> };

export function createGswMaterials(frameHex: string): GswMaterials {
  const glass = (color: number, opacity: number, roughness: number) => new MeshPhysicalMaterial({
    color, transparent: true, opacity, roughness, metalness: 0, side: DoubleSide, depthWrite: false,
  });
  return {
    frame: new MeshStandardMaterial({ color: frameHex, metalness: 0.45, roughness: 0.48 }),
    metal: new MeshStandardMaterial({ color: 0xc4c9cd, metalness: 0.7, roughness: 0.35 }),
    glass: { klar: glass(0xd3e4ee, 0.28, 0.05), getoent: glass(0x3f474d, 0.55, 0.08) },
  };
}

/**
 * One Glasschiebewand, `lengthMm` × `heightMm`, in the local frame. `leftIsLocalMax`: whether the customer's left,
 * looking at this face from outside, lies at the local max-X end (so "links/rechts" read as the customer sees it).
 */
export function buildGlassSlidingWall(parts: EquipmentParts, materials: GswMaterials, options: {
  lengthMm: number; heightMm: number; layout: GswLayout; element: FieldElement; opening: OpeningDirection; leftIsLocalMax: boolean;
}): Group {
  const { lengthMm, heightMm, layout, element } = options;
  const wall = new Group();
  wall.name = `Glasschiebewand ${layout.leaves} Flügel`;
  const glassMaterial = materials.glass[element.glassTone ?? 'klar'];
  // Clones share the cached geometry (sharedAsset) and get the frame colour, metal or glass by source material.
  const clonePart = (id: string) => {
    const source = parts.get(id)!;
    const copy = source.clone(true);
    copy.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const name = (Array.isArray(object.material) ? object.material[0] : object.material)?.name ?? '';
      object.material = /glass/i.test(name) ? glassMaterial : /silver/i.test(name) ? materials.metal : materials.frame;
      object.userData.sharedAsset = true;
      object.raycast = () => undefined;
      object.castShadow = true;
    });
    return copy;
  };
  const size = (id: string) => new Box3().setFromObject(parts.get(id)!).getSize(new Vector3()).multiplyScalar(1000);

  // Rails: Unterschiene on the floor, Obere Schiene under the top, both over the whole clear width.
  const bottom = clonePart(railPart(layout.railProfile, 'Bottom'));
  bottom.scale.x = lengthMm / size(railPart(layout.railProfile, 'Bottom')).x;
  const top = clonePart(railPart(layout.railProfile, 'Top'));
  top.scale.x = lengthMm / size(railPart(layout.railProfile, 'Top')).x;
  top.position.y = (heightMm - TOP_RAIL_HEIGHT_MM) / 1000;
  wall.add(bottom, top);
  // U profiles against the posts (or wall), full height.
  const sideSize = size(railPart(layout.railProfile, 'Side'));
  for (const x of [0, lengthMm - sideSize.x]) {
    const side = clonePart(railPart(layout.railProfile, 'Side'));
    side.scale.y = heightMm / sideSize.y;
    side.position.x = x / 1000;
    wall.add(side);
  }
  // Leaves between the U profiles, evenly spread; overlap follows from the table (≥ 4 cm).
  const leafSize = size('glassLeaf');
  const span = lengthMm - 2 * GSW_SIDE_PROFILE_MM;
  const step = layout.leaves > 1 ? (span - layout.glassWidthMm) / (layout.leaves - 1) : 0;
  const tracks = leafTracks(layout.leaves, options.opening);
  const strips = leafStrips(layout.leaves, options.opening);
  const glassTop = heightMm - GLASS_TOP_INSET_MM;
  for (let index = 0; index < layout.leaves; index += 1) {
    const fromLeft = options.leftIsLocalMax ? layout.leaves - 1 - index : index;
    const strip = strips[fromLeft];
    const leaf = clonePart(strip ? 'glassLeafEdge' : 'glassLeaf');
    leaf.scale.x = layout.glassWidthMm / leafSize.x;
    leaf.position.x = (GSW_SIDE_PROFILE_MM + index * step) / 1000;
    leaf.position.z = (FIRST_TRACK_MM + TRACK_PITCH_MM * tracks[fromLeft]) / 1000;
    // The model's strip sits on the local min-X edge; the customer's right edge is local min-X when left is max-X.
    const stripAtLocalMin = strip === (options.leftIsLocalMax ? 'right' : 'left');
    leaf.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.geometry.computeBoundingBox();
      const box = object.geometry.boundingBox!;
      const heightOf = (box.max.y - box.min.y) * 1000;
      if (object.material === glassMaterial) {
        // Only the glass pane grows with the height; the carriage at the bottom keeps its size.
        const scale = (glassTop - GLASS_BOTTOM_MM) / heightOf;
        object.scale.y = scale;
        object.position.y = (GLASS_BOTTOM_MM / 1000) * (1 - scale);
      } else if (heightOf > 500) {
        // Edge strip: same gap to the glass top at every height; moved to the other edge when needed.
        const scale = (glassTop - STRIP_TOP_BELOW_GLASS_MM - STRIP_BOTTOM_MM) / heightOf;
        object.scale.y = scale;
        object.position.y = (STRIP_BOTTOM_MM / 1000) * (1 - scale);
        if (!stripAtLocalMin) object.position.x = leafSize.x / 1000 - box.max.x - box.min.x;
      }
    });
    wall.add(leaf);
  }
  wall.userData.depthMm = size(railPart(layout.railProfile, 'Top')).z;
  return wall;
}
