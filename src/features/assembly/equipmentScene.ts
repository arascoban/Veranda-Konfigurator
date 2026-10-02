import {
  BufferGeometry, DoubleSide, EdgesGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, Texture,
  type Material,
} from 'three';
import { frameColors, postSections, postWidthMm } from '../../catalog/catalog';
import type { ConfigurationV1 } from '../../domain/configuration';
import { listFields, type FieldElement } from '../../domain/fieldEquipment';

type Point = [number, number, number];

/** Screen approximations; the real element models and materials are not supplied yet (schematic only). */
const elementLook = {
  glasschiebewand: { klar: { color: 0xd3e4ee, opacity: 0.35 }, getoent: { color: 0x3f474d, opacity: 0.6 }, satiniert: { color: 0xeef1f0, opacity: 0.85 } },
  seitenwand_licht: { color: 0xf4f6f5, opacity: 0.7 },
  senkrechtmarkise: { color: 0x8c8676, opacity: 0.88 },
  gable: { color: 0xd3e4ee, opacity: 0.35 },
} as const;

/**
 * Schematic Ausstattung layer (V2): one translucent panel per element in its field, framed in the frame
 * colour, with the split line where a field holds two elements. Front fields sit in the post centre plane
 * between the post faces, sides between the wall and the end post. Not a product model; never picked.
 */
export function createEquipmentGroup(configuration: ConfigurationV1): Group {
  const group = new Group();
  group.name = 'Ausstattung';
  group.userData.equipment = true;
  const { width, depth, rearHeight, frontHeight } = configuration.dimensionsMm;
  const posts = configuration.postCenters;
  if (!configuration.fieldEquipment.length || width === null || depth === null || rearHeight === null || frontHeight === null || !posts?.length) return group;
  const toward = postSections[configuration.productId].towardsGardenMm;
  const half = postWidthMm(configuration.productId) / 2;
  const frontZ = -(depth - toward / 2);
  const sideBackZ = -(depth - toward);
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

  for (const field of listFields(configuration)) {
    const entry = configuration.fieldEquipment.find((item) => item.fieldId === field.id);
    if (!entry) continue;
    // Corner points of a band from height y0 to y1 in this field's plane.
    let band: (y0: number, y1: number) => Point[];
    if (field.kind === 'front') {
      const index = field.insideIndex!;
      const x0 = posts[index].xMm + half;
      const x1 = posts[index + 1].xMm - half;
      band = (y0, y1) => [[x0, y0, frontZ], [x1, y0, frontZ], [x1, y1, frontZ], [x0, y1, frontZ]];
    } else {
      const x = field.side === 'left' ? posts[posts.length - 1].xMm : posts[0].xMm;
      band = (y0, y1) => [[x, y0, 0], [x, y0, sideBackZ], [x, y1, sideBackZ], [x, y1, 0]];
      if (entry.gable && rearHeight > frontHeight) {
        // Between the side top, the wall profile and the roof line above the end post.
        const roofAtPost = frontHeight + (rearHeight - frontHeight) * (toward / depth);
        addPolygon([[x, frontHeight, 0], [x, frontHeight, sideBackZ], [x, roofAtPost, sideBackZ], [x, rearHeight, 0]],
          material('gable', elementLook.gable.color, elementLook.gable.opacity));
      }
    }
    if (entry.elements.length === 1) addPolygon(band(0, frontHeight), lookFor(entry.elements[0]));
    else if (entry.elements.length === 2) {
      const lower = entry.lowerHeightMm ?? frontHeight / 2;
      addPolygon(band(0, lower), lookFor(entry.elements[0]));
      addPolygon(band(lower, frontHeight), lookFor(entry.elements[1]));
    }
  }
  return group;
}

export function disposeEquipmentGroup(group: Group): void {
  const materials = new Set<Material>();
  group.traverse((object) => {
    if (!('geometry' in object && 'material' in object)) return;
    const drawable = object as Mesh;
    drawable.geometry.dispose();
    for (const item of Array.isArray(drawable.material) ? drawable.material : [drawable.material]) materials.add(item);
  });
  for (const item of materials) {
    for (const value of Object.values(item)) if (value instanceof Texture) value.dispose();
    item.dispose();
  }
}
