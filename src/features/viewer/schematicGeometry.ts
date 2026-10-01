import {
  BoxGeometry, BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Texture, type Material,
} from 'three';
import type { ConfigurationV1 } from '../../domain/configuration';
import { createGround, createPostControls } from '../assembly/assemblyScene';
import type { PreviewDimensions } from './previewGeometry';

/** Disposes helper geometry; meshes cloned from the shared part library keep their geometry. */
/**
 * Frees everything a scene group owns: geometries created for this group and every material it uses,
 * each once. Geometry flagged `sharedAsset` belongs to the part library cache and is kept; its materials
 * were created for this assembly and are disposed with it (ASTRA-GP-07).
 */
export function disposeSchematicGroup(group: Group): void {
  const materials = new Set<Material>();
  group.traverse((object) => {
    if (!('geometry' in object && 'material' in object)) return;
    const drawable = object as Mesh;
    if (!object.userData.sharedAsset) drawable.geometry.dispose();
    for (const material of Array.isArray(drawable.material) ? drawable.material : [drawable.material]) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
    material.dispose();
  }
}

/** Temporary schematic only. Profile dimensions and roof attachment offsets are not implied. */
export function createSchematicGroup(
  dimensions: PreviewDimensions,
  roofMaterialId: ConfigurationV1['roofMaterialId'],
  options: { includeGroundGuide?: boolean; includePostControls?: boolean } = {},
): Group {
  const group = new Group();
  group.userData.previewOnly = true;
  const { widthM, depthM, rearHeightM, frontHeightM, postCentersM, postSectionM } = dimensions;

  const roofGeometry = new BufferGeometry();
  // Scene frame: wall face at z = 0, garden towards negative Z, X left → right as seen from inside.
  roofGeometry.setAttribute('position', new Float32BufferAttribute([
    0, rearHeightM, 0,
    widthM, rearHeightM, 0,
    widthM, frontHeightM, -depthM,
    0, frontHeightM, -depthM,
  ], 3));
  roofGeometry.setIndex([0, 1, 2, 0, 2, 3]);
  roofGeometry.computeVertexNormals();
  const roofMaterial = new MeshBasicMaterial({
    color: roofMaterialId === 'glass' ? 0x8fb6c9 : 0xd4dce0,
    transparent: true,
    opacity: 0.48,
    side: DoubleSide,
    depthWrite: false,
  });
  group.add(new Mesh(roofGeometry, roofMaterial));

  const guideMaterial = new MeshBasicMaterial({ color: 0x68747d });
  for (const [height, depth] of [[rearHeightM, 0], [frontHeightM, -depthM]]) {
    const beam = new Mesh(new BoxGeometry(widthM, 0.025, 0.025), guideMaterial.clone());
    beam.position.set(widthM / 2, height, depth);
    group.add(beam);
  }
  postCentersM.forEach((centerM, index) => {
    // Post box with the confirmed cross-section; its garden-facing side ends at the nominal depth.
    // Like the product model, each post lives in a movable holder whose x is the post centre.
    const holder = new Group();
    holder.position.set(centerM, 0, 0);
    holder.userData.postIndex = index;
    holder.userData.postMovable = true;
    const post = new Mesh(new BoxGeometry(postSectionM.alongGutterM, frontHeightM, postSectionM.towardsGardenM), guideMaterial.clone());
    post.position.set(0, frontHeightM / 2, -depthM + postSectionM.towardsGardenM / 2);
    post.userData.postIndex = index;
    post.userData.postVisual = true;
    holder.add(post);
    if (options.includePostControls) holder.add(...createPostControls(index, frontHeightM, depthM, postSectionM.towardsGardenM));
    group.add(holder);
  });
  if (options.includePostControls) {
    for (let index = 0; index < postCentersM.length - 1; index += 1) {
      const left = postCentersM[index];
      const right = postCentersM[index + 1];
      const field = new Mesh(new PlaneGeometry(right - left, frontHeightM),
        new MeshBasicMaterial({ color: 0x34424a, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
      field.position.set((left + right) / 2, frontHeightM / 2, -depthM + 0.003);
      field.userData.openingIndex = index;
      group.add(field);
    }
  }
  guideMaterial.dispose();

  if (options.includeGroundGuide) {
    group.add(createGround(widthM, depthM));
  }
  return group;
}
