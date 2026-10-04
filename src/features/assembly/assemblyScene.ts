import {
  BoxGeometry, CylinderGeometry, DoubleSide, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, ShadowMaterial, Vector3, type Material,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { frameColors, roofFinishes, type FrameColorId, type RoofFinishId, type RoofMaterialId } from '../../catalog/catalog';
import { millimetresToMetres } from '../../domain/units';
import { basisDeterminant, type AssemblyLayout, type AwningSlab, type PartPlacement } from './placements';
import { assemblySpecs, type PartRole } from './spec';
import { createSelectionMarker } from './annotations';
import { createFieldPickPlanes } from './fieldPlanes';

/** Selection colour of a post in the model (edge outline + tint). */
export const SELECTION_BLUE = 0x2f9dff;

/** Loads each GLB once; clones share geometry, so clones are flagged `sharedAsset` and never dispose it. */
export class PartLibrary {
  private readonly cache = new Map<string, Promise<Group>>();
  /** Parts that have finished loading, for synchronous reuse without a schematic flash. */
  private readonly ready = new Map<string, Group>();
  private readonly loader = new GLTFLoader();

  constructor(private readonly baseUrl: string) {}

  load(glbPath: string): Promise<Group> {
    const url = this.baseUrl + glbPath;
    let pending = this.cache.get(url);
    if (!pending) {
      pending = this.loader.loadAsync(url).then((gltf) => {
        gltf.scene.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          object.userData.sharedAsset = true;
          // Split rafter pieces come without normals; lit materials need them.
          if (!object.geometry.attributes.normal) object.geometry.computeVertexNormals();
        });
        this.ready.set(url, gltf.scene);
        return gltf.scene;
      });
      pending.catch(() => this.cache.delete(url));
      this.cache.set(url, pending);
    }
    return pending;
  }

  /** The loaded part, or null while it is still loading or was never requested. */
  peek(glbPath: string): Group | null {
    return this.ready.get(this.baseUrl + glbPath) ?? null;
  }
}

/** Every part of the layout, synchronously, when all of them are already loaded; otherwise null. */
export function peekLayoutParts(layout: AssemblyLayout, library: PartLibrary): Map<string, Group> | null {
  const spec = assemblySpecs[layout.productId];
  const parts = new Map<string, Group>();
  for (const id of new Set(layout.placements.map((placement) => placement.partId))) {
    const group = library.peek(spec.parts[id].glb);
    if (!group) return null;
    parts.set(id, group);
  }
  return parts;
}

/** Warms the cache for a product the customer has not chosen yet; failures are ignored and change nothing. */
export function preloadProductParts(productId: keyof typeof assemblySpecs, library: PartLibrary): void {
  for (const part of Object.values(assemblySpecs[productId].parts)) library.load(part.glb).catch(() => undefined);
}

export async function loadLayoutParts(layout: AssemblyLayout, library: PartLibrary): Promise<Map<string, Group>> {
  const spec = assemblySpecs[layout.productId];
  const ids = [...new Set(layout.placements.map((placement) => placement.partId))];
  const groups = await Promise.all(ids.map((id) => library.load(spec.parts[id].glb)));
  return new Map(ids.map((id, index) => [id, groups[index]]));
}

/**
 * Placeholder finishes: the product colour catalogue has not been supplied, so aluminium is shown as
 * neutral metal, seals as dark rubber and the roof as glass or milky polycarbonate.
 */
export function createFinishMaterials(roofMaterialId: RoofMaterialId, frameColor: FrameColorId = 'ral7016') {
  const frame = frameColors[frameColor];
  return {
    aluminium: frameColor === 'ral9001'
      ? new MeshStandardMaterial({ color: frame.hex, metalness: 0.15, roughness: 0.5 })
      : new MeshStandardMaterial({ color: frame.hex, metalness: 0.45, roughness: 0.48 }),
    rubber: new MeshStandardMaterial({ color: 0x2b2f33, metalness: 0, roughness: 0.9 }),
    // Drain pipe and its fittings: grey so they stand out from the anthracite post (user request 30 Sep 2026).
    pipe: new MeshStandardMaterial({ color: 0x9aa3a8, metalness: 0.55, roughness: 0.4 }),
    roof: roofMaterialId === 'glass'
      ? new MeshPhysicalMaterial({ color: 0xa9c4d3, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0, side: DoubleSide, depthWrite: false })
      : new MeshPhysicalMaterial({ color: 0xe6ebee, transparent: true, opacity: 0.8, roughness: 0.6, metalness: 0, side: DoubleSide, depthWrite: false }),
    // Awning placeholder (simple slab + cassette) until the real models arrive.
    awningFabric: new MeshStandardMaterial({ color: 0x8d9296, metalness: 0, roughness: 0.85, side: DoubleSide }),
    awningCassette: new MeshStandardMaterial({ color: 0x383e42, metalness: 0.4, roughness: 0.5 }),
  };
}

/** One material per roof tone (screen approximation of the reference photos); cached per group. */
export function createRoofFinishMaterial(finish: RoofFinishId): MeshPhysicalMaterial {
  const tone = roofFinishes[finish];
  const opaque = tone.opacity >= 0.9;
  return new MeshPhysicalMaterial({
    color: tone.hex, transparent: true, opacity: tone.opacity, side: DoubleSide, depthWrite: opaque,
    roughness: tone.family === 'glass' ? (opaque ? 0.35 : 0.05) : 0.55, metalness: 0,
  });
}

function finishFor(role: PartRole, sourceName: string, finishes: ReturnType<typeof createFinishMaterials>): Material {
  if (role === 'panel') return finishes.roof;
  if (/Material2|Charcoal|Gummi|Rubber/i.test(sourceName)) return finishes.rubber;
  if (/Pewter|Obsidian|Rohr|Pipe/i.test(sourceName)) return finishes.pipe;
  return finishes.aluminium;
}

function applyPlacement(object: Object3D, placement: PartPlacement, offsetMm: readonly [number, number, number] = [0, 0, 0]): void {
  const { x, y, z } = placement.basis;
  // A quaternion cannot hold a mirror: a left-handed basis (the mirrored side rafter) is expressed as the
  // proper rotation with the local z axis flipped plus a negative z scale, which three.js renders correctly.
  const mirrored = basisDeterminant(placement.basis) < 0;
  const zAxis = mirrored ? new Vector3(-z[0], -z[1], -z[2]) : new Vector3(...z);
  object.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(new Vector3(...x), new Vector3(...y), zAxis));
  object.scale.set(placement.scale[0], placement.scale[1], mirrored ? -placement.scale[2] : placement.scale[2]);
  object.position.set(
    millimetresToMetres(placement.originMm[0] - offsetMm[0]),
    millimetresToMetres(placement.originMm[1] - offsetMm[1]),
    millimetresToMetres(placement.originMm[2] - offsetMm[2]),
  );
}

/**
 * Editing helpers for one post, positioned relative to the post centre: an invisible hit cylinder plus
 * the ground marker (ring and flat move arrows) shown while the post is selected.
 */
export function createPostControls(postIndex: number, frontHeightM: number, zCentre: number, alongGutterM = 0.13): Object3D[] {
  const hitArea = new Mesh(new CylinderGeometry(0.14, 0.14, frontHeightM, 12),
    new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hitArea.position.set(0, frontHeightM / 2, zCentre);
  hitArea.userData.postIndex = postIndex;
  return [hitArea, createSelectionMarker(postIndex, zCentre, alongGutterM / 2)];
}

/** Whole floor as a plain light-grey canvas (#CBD0CC, user choice 30 Sep 2026), visible from above only. */
export function createGround(widthM: number, depthM: number): Mesh {
  const ground = new Mesh(new PlaneGeometry(200, 200), new MeshBasicMaterial({ color: 0xcbd0cc }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(widthM / 2, -0.005, -depthM / 2);
  ground.userData.exportable = false;
  ground.userData.ground = true;
  // Shadow catcher: only draws where shadows fall, so the plain canvas stays plain in low quality.
  // It lies in the ground plane itself and wins the depth test through polygon offset; a millimetre lift
  // z-fights with the canvas at typical viewing distances (CLAUDE-K03-007).
  const shadows = new Mesh(new PlaneGeometry(200, 200), new ShadowMaterial({
    opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  }));
  shadows.receiveShadow = true;
  shadows.userData.exportable = false;
  ground.add(shadows);
  return ground;
}

/** Builds the product model from loaded parts. Editing helpers mirror the schematic so the viewer code is shared. */
export function createAssemblyGroup(
  layout: AssemblyLayout,
  parts: Map<string, Group>,
  options: { includeGroundGuide?: boolean; includePostControls?: boolean } = {},
): Group {
  const group = new Group();
  group.name = `Produktmodell ${layout.productId} — Montagebezüge vorläufig`;
  group.userData.productModel = true;
  const finishes = createFinishMaterials(layout.roofMaterialId, layout.frameColor);
  const roofTones = new Map<RoofFinishId, MeshPhysicalMaterial>();
  const roofToneMaterial = (finish: RoofFinishId) => {
    let material = roofTones.get(finish);
    if (!material) { material = createRoofFinishMaterial(finish); roofTones.set(finish, material); }
    return material;
  };
  const spec = assemblySpecs[layout.productId];
  const widthM = millimetresToMetres(layout.widthMm);
  const depthM = millimetresToMetres(layout.depthMm);
  const frontHeightM = millimetresToMetres(layout.frontHeightMm);
  const postCentersM: number[] = [];
  const controlsAdded = new Set<number>();

  for (const placement of layout.placements) {
    const source = parts.get(placement.partId);
    if (!source) continue;
    const clone = source.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const sourceName = Array.isArray(object.material) ? object.material.map((m) => m.name).join(' ') : object.material.name;
      object.material = finishFor(placement.role, sourceName, finishes);
      if (placement.role === 'panel' && placement.bayIndex !== undefined) {
        // Each roof field carries its own tone and can be selected in the model (Dach section).
        object.material = roofToneMaterial(layout.roofFinishes[placement.bayIndex] ?? layout.roofFinishes[0]);
        object.userData.roofFieldIndex = placement.bayIndex;
        object.userData.roofFieldVisual = true;
        const outline = new LineSegments(new EdgesGeometry(object.geometry, 20),
          new LineBasicMaterial({ color: SELECTION_BLUE, depthTest: false, transparent: true, opacity: 0.95 }));
        outline.renderOrder = 10;
        outline.visible = false;
        outline.userData.roofFieldHalo = true;
        outline.userData.roofFieldIndex = placement.bayIndex;
        outline.userData.exportable = false;
        outline.raycast = () => undefined;
        object.add(outline);
      }
      // Shadows only appear when the renderer's shadow map is on (high quality).
      object.castShadow = true;
      object.receiveShadow = placement.role !== 'panel';
      object.userData.sharedAsset = true;
      object.userData.role = placement.role;
      if (placement.postIndex !== undefined) {
        object.userData.postIndex = placement.postIndex;
        object.userData.postVisual = true;
        // Bright blue edge outline, shown only while this post is selected.
        const outline = new LineSegments(new EdgesGeometry(object.geometry, 20),
          new LineBasicMaterial({ color: SELECTION_BLUE, depthTest: false, transparent: true, opacity: 0.95 }));
        outline.renderOrder = 10;
        outline.visible = false;
        outline.userData.selectionHalo = true;
        outline.userData.postIndex = placement.postIndex;
        outline.userData.exportable = false;
        outline.raycast = () => undefined;
        object.add(outline);
      }
    });
    if (placement.postIndex !== undefined) {
      // Posts live in a movable group whose x is the post centre, as in the schematic.
      const centreMm = placement.postCentreMm ?? placement.originMm[0] + spec.postSectionMm.alongGutter / 2;
      const holder = new Group();
      holder.position.set(millimetresToMetres(centreMm), 0, 0);
      holder.userData.postIndex = placement.postIndex;
      holder.userData.postMovable = true;
      applyPlacement(clone, placement, [centreMm, 0, 0]);
      holder.add(clone);
      if (options.includePostControls && !controlsAdded.has(placement.postIndex)) {
        controlsAdded.add(placement.postIndex);
        // Controls stand at the real post line (moved in with the static carrier when chosen).
        const line = layout.postLine;
        holder.add(...createPostControls(placement.postIndex, frontHeightM, millimetresToMetres((line.frontZ + line.backZ) / 2), millimetresToMetres(spec.postSectionMm.alongGutter)));
      }
      // Posts come in three slices; register each post centre once.
      if (!postCentersM.includes(millimetresToMetres(centreMm))) postCentersM.push(millimetresToMetres(centreMm));
      group.add(holder);
    } else {
      applyPlacement(clone, placement);
      group.add(clone);
    }
  }

  if (options.includePostControls) {
    const line = layout.postLine;
    group.add(...createFieldPickPlanes(postCentersM, depthM, frontHeightM, layout.sideFields,
      { frontZM: millimetresToMetres(line.frontZ) - 0.003, heightM: millimetresToMetres(line.carrier?.bottomMm ?? layout.frontHeightMm) }));
  }
  for (const slab of layout.awnings) group.add(createAwningPlaceholder(layout, slab, finishes));
  if (options.includeGroundGuide) {
    group.add(createGround(widthM, depthM));
  }
  return group;
}

/**
 * Placeholder awning: a thin fabric slab lying on the roof plane from the wall downwards plus a cassette at
 * the wall. Aufglas sits above the glazing, Unterglas below the rafters. Replaced once the models arrive.
 */
function createAwningPlaceholder(layout: AssemblyLayout, slab: AwningSlab, finishes: ReturnType<typeof createFinishMaterials>): Group {
  const { rearMm, d, nrm, rafterHeightMm, lengthMm } = layout.roofPlane;
  // Aufglas: as long as the rafter cover; Unterglas: from the post back to the wall, measured along the roof.
  const depthMm = slab.depthMm === null ? lengthMm : slab.depthMm * (lengthMm / Math.max(1, layout.depthMm));
  const holder = new Group();
  holder.userData.awning = true;
  holder.userData.exportable = false;
  const liftMm = slab.type === 'aufglas' ? rafterHeightMm + 70 : -110;
  const basis = new Matrix4().makeBasis(new Vector3(1, 0, 0), new Vector3(...nrm), new Vector3(...d));
  const place = (mesh: Mesh, alongMm: number, acrossMm: number, upMm: number) => {
    const origin = new Vector3(slab.xMm + acrossMm, rearMm[1], rearMm[2])
      .add(new Vector3(...d).multiplyScalar(alongMm))
      .add(new Vector3(...nrm).multiplyScalar(upMm));
    mesh.position.copy(origin.multiplyScalar(0.001));
    mesh.quaternion.setFromRotationMatrix(basis);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    holder.add(mesh);
  };
  // 2 cm shorter than the span so two neighbouring awnings read as two bodies.
  const widthM = (slab.widthMm - 20) / 1000;
  const fabric = new Mesh(new BoxGeometry(widthM, 0.03, depthMm / 1000), finishes.awningFabric);
  place(fabric, -depthMm / 2, slab.widthMm / 2, liftMm);
  const cassette = new Mesh(new BoxGeometry(widthM, 0.15, 0.17), finishes.awningCassette);
  place(cassette, 40, slab.widthMm / 2, liftMm + (slab.type === 'aufglas' ? 60 : -40));
  return holder;
}
