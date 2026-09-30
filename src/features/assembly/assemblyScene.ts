import {
  CylinderGeometry, DoubleSide, GridHelper, Group, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial,
  MeshStandardMaterial, Object3D, PlaneGeometry, Vector3, type Material,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { RoofMaterialId } from '../../catalog/catalog';
import { millimetresToMetres } from '../../domain/units';
import type { AssemblyLayout, PartPlacement } from './placements';
import { assemblySpecs, type PartRole } from './spec';

/** Loads each GLB once; clones share geometry, so clones are flagged `sharedAsset` and never dispose it. */
export class PartLibrary {
  private readonly cache = new Map<string, Promise<Group>>();
  private readonly loader = new GLTFLoader();

  constructor(private readonly baseUrl: string) {}

  load(glbPath: string): Promise<Group> {
    const url = this.baseUrl + glbPath;
    let pending = this.cache.get(url);
    if (!pending) {
      pending = this.loader.loadAsync(url).then((gltf) => {
        gltf.scene.traverse((object) => {
          if (object instanceof Mesh) object.userData.sharedAsset = true;
        });
        return gltf.scene;
      });
      pending.catch(() => this.cache.delete(url));
      this.cache.set(url, pending);
    }
    return pending;
  }
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
export function createFinishMaterials(roofMaterialId: RoofMaterialId) {
  return {
    aluminium: new MeshStandardMaterial({ color: 0xb9bec2, metalness: 0.55, roughness: 0.42 }),
    rubber: new MeshStandardMaterial({ color: 0x2b2f33, metalness: 0, roughness: 0.9 }),
    roof: roofMaterialId === 'glass'
      ? new MeshPhysicalMaterial({ color: 0xa9c4d3, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0, side: DoubleSide, depthWrite: false })
      : new MeshPhysicalMaterial({ color: 0xe6ebee, transparent: true, opacity: 0.8, roughness: 0.6, metalness: 0, side: DoubleSide, depthWrite: false }),
  };
}

function finishFor(role: PartRole, sourceName: string, finishes: ReturnType<typeof createFinishMaterials>): Material {
  if (role === 'panel') return finishes.roof;
  if (/Material2|Charcoal|Gummi|Rubber/i.test(sourceName)) return finishes.rubber;
  return finishes.aluminium;
}

function applyPlacement(object: Object3D, placement: PartPlacement, offsetMm: readonly [number, number, number] = [0, 0, 0]): void {
  const { x, y, z } = placement.basis;
  object.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(new Vector3(...x), new Vector3(...y), new Vector3(...z)));
  object.scale.set(placement.scale[0], placement.scale[1], placement.scale[2]);
  object.position.set(
    millimetresToMetres(placement.originMm[0] - offsetMm[0]),
    millimetresToMetres(placement.originMm[1] - offsetMm[1]),
    millimetresToMetres(placement.originMm[2] - offsetMm[2]),
  );
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
  const finishes = createFinishMaterials(layout.roofMaterialId);
  const spec = assemblySpecs[layout.productId];
  const widthM = millimetresToMetres(layout.widthMm);
  const depthM = millimetresToMetres(layout.depthMm);
  const frontHeightM = millimetresToMetres(layout.frontHeightMm);
  const postCentersM: number[] = [];

  for (const placement of layout.placements) {
    const source = parts.get(placement.partId);
    if (!source) continue;
    const clone = source.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const sourceName = Array.isArray(object.material) ? object.material.map((m) => m.name).join(' ') : object.material.name;
      object.material = finishFor(placement.role, sourceName, finishes);
      object.userData.sharedAsset = true;
      object.userData.role = placement.role;
      if (placement.postIndex !== undefined) {
        object.userData.postIndex = placement.postIndex;
        object.userData.postVisual = true;
      }
    });
    if (placement.postIndex !== undefined) {
      // Posts live in a movable group whose x is the post centre, as in the schematic.
      const centreMm = placement.originMm[0] + spec.postSectionMm.alongGutter / 2;
      const holder = new Group();
      holder.position.set(millimetresToMetres(centreMm), 0, 0);
      holder.userData.postIndex = placement.postIndex;
      holder.userData.postMovable = true;
      applyPlacement(clone, placement, [centreMm, 0, 0]);
      holder.add(clone);
      if (options.includePostControls) {
        const hitArea = new Mesh(new CylinderGeometry(0.14, 0.14, frontHeightM, 12),
          new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
        hitArea.position.set(0, frontHeightM / 2, -depthM + millimetresToMetres(spec.postSectionMm.towardsGarden) / 2);
        hitArea.userData.postIndex = placement.postIndex;
        holder.add(hitArea);
        const halo = new Mesh(new CylinderGeometry(0.16, 0.16, 0.01, 24),
          new MeshBasicMaterial({ color: 0x34424a, transparent: true, opacity: 0.55 }));
        halo.position.set(0, 0.01, -depthM + millimetresToMetres(spec.postSectionMm.towardsGarden) / 2);
        halo.userData.postIndex = placement.postIndex;
        halo.userData.selectionHalo = true;
        halo.visible = false;
        holder.add(halo);
      }
      postCentersM.push(millimetresToMetres(centreMm));
      group.add(holder);
    } else {
      applyPlacement(clone, placement);
      group.add(clone);
    }
  }

  if (options.includePostControls) {
    const sorted = [...postCentersM].sort((a, b) => a - b);
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const left = sorted[index];
      const right = sorted[index + 1];
      const field = new Mesh(new PlaneGeometry(right - left, frontHeightM),
        new MeshBasicMaterial({ color: 0x34424a, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
      field.position.set((left + right) / 2, frontHeightM / 2, -depthM + 0.003);
      field.userData.openingIndex = index;
      group.add(field);
    }
  }
  if (options.includeGroundGuide) {
    const grid = new GridHelper(Math.max(widthM, depthM) + 2, 12, 0xa4b0b7, 0xd8e0e4);
    grid.position.set(widthM / 2, -0.025, -depthM / 2);
    grid.userData.exportable = false;
    group.add(grid);
    // Pale terrace footprint, visible from above only so views from below stay clear.
    const slab = new Mesh(new PlaneGeometry(widthM + 0.6, depthM + 0.6), new MeshStandardMaterial({ color: 0xe3e8ea, roughness: 1 }));
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(widthM / 2, -0.02, -depthM / 2);
    slab.userData.exportable = false;
    group.add(slab);
  }
  return group;
}
