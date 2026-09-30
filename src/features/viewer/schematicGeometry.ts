import {
  BoxGeometry, BufferGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, PlaneGeometry,
  GridHelper, Group, Mesh, MeshBasicMaterial,
} from 'three';
import type { ConfigurationV1 } from '../../domain/configuration';
import type { PreviewDimensions } from './previewGeometry';

export function disposeSchematicGroup(group: Group): void {
  group.traverse((object) => {
    if (!('geometry' in object && 'material' in object)) return;
    const drawable = object as Mesh;
    drawable.geometry.dispose();
    for (const material of Array.isArray(drawable.material) ? drawable.material : [drawable.material]) {
      material.dispose();
    }
  });
}

/** Temporary schematic only. Profile dimensions and roof attachment offsets are not implied. */
export function createSchematicGroup(
  dimensions: PreviewDimensions,
  roofMaterialId: ConfigurationV1['roofMaterialId'],
  options: { includeGroundGuide?: boolean; includePostControls?: boolean } = {},
): Group {
  const group = new Group();
  group.userData.previewOnly = true;
  const { widthM, depthM, rearHeightM, frontHeightM, postCentersM } = dimensions;

  const roofGeometry = new BufferGeometry();
  roofGeometry.setAttribute('position', new Float32BufferAttribute([
    0, rearHeightM, 0,
    widthM, rearHeightM, 0,
    widthM, frontHeightM, depthM,
    0, frontHeightM, depthM,
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
  for (const [height, depth] of [[rearHeightM, 0], [frontHeightM, depthM]]) {
    const beam = new Mesh(new BoxGeometry(widthM, 0.025, 0.025), guideMaterial.clone());
    beam.position.set(widthM / 2, height, depth);
    group.add(beam);
  }
  postCentersM.forEach((centerM, index) => {
    const post = new Mesh(new CylinderGeometry(0.018, 0.018, frontHeightM, 8), guideMaterial.clone());
    post.position.set(centerM, frontHeightM / 2, depthM);
    post.userData.postIndex = index;
    post.userData.postVisual = true;
    group.add(post);
    if (options.includePostControls) {
    const hitArea = new Mesh(new CylinderGeometry(0.12, 0.12, frontHeightM, 12),
      new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hitArea.position.copy(post.position);
    hitArea.userData.postIndex = index;
    group.add(hitArea);
    const halo = new Mesh(new CylinderGeometry(0.11, 0.11, 0.01, 24),
      new MeshBasicMaterial({ color: 0x34424a, transparent: true, opacity: 0.55 }));
    halo.position.set(centerM, 0.01, depthM);
    halo.userData.postIndex = index;
    halo.userData.selectionHalo = true;
    halo.visible = false;
    group.add(halo);
    }
  });
  if (options.includePostControls) {
    for (let index = 0; index < postCentersM.length - 1; index += 1) {
      const left = postCentersM[index];
      const right = postCentersM[index + 1];
      const field = new Mesh(new PlaneGeometry(right - left, frontHeightM),
        new MeshBasicMaterial({ color: 0x34424a, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
      field.position.set((left + right) / 2, frontHeightM / 2, depthM - 0.003);
      field.userData.openingIndex = index;
      group.add(field);
    }
  }
  guideMaterial.dispose();

  if (options.includeGroundGuide) {
    const grid = new GridHelper(Math.max(widthM, depthM) + 2, 12, 0xa4b0b7, 0xd8e0e4);
    grid.position.set(widthM / 2, -0.025, depthM / 2);
    grid.userData.exportable = false;
    group.add(grid);
  }
  return group;
}
