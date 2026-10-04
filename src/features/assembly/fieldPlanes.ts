import type { SideFieldSpan } from './placements';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial, PlaneGeometry, type Object3D } from 'three';

/**
 * Invisible pick planes for the fields that take equipment: one per gap between posts on the garden face
 * (`openingIndex`, inside-left order) and one per side between the wall and the end post (`sideField`,
 * garden view: the garden-left side lies at the inside x = W end). The viewer tints them on hover/selection.
 */
export function createFieldPickPlanes(postCentersM: readonly number[], depthM: number, frontHeightM: number, sideFields?: readonly SideFieldSpan[],
  front: { frontZM: number; heightM: number } = { frontZM: -depthM + 0.003, heightM: frontHeightM },
  rearFields: readonly { fieldId: string; xMm: number; widthMm: number; heightMm: number }[] = []): Object3D[] {
  const sorted = [...postCentersM].sort((a, b) => a - b);
  const material = () => new MeshBasicMaterial({ color: 0x2f9dff, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide });
  const planes: Object3D[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const left = sorted[index];
    const right = sorted[index + 1];
    // Just in front of the posts' garden faces, up to the gutter or the static carrier.
    const field = new Mesh(new PlaneGeometry(right - left, front.heightM), material());
    field.position.set((left + right) / 2, front.heightM / 2, front.frontZM);
    field.userData.openingIndex = index;
    field.userData.exportable = false;
    planes.push(field);
  }
  if (sorted.length >= 2 && sideFields?.length) {
    // Side parts (3 Oct 2026): one area per part of a side divided by 50×100 profiles, from the ground up to the
    // rafter underside, so the blue covers the triangle under the roof as well (a trapezoid, owner request).
    for (const span of sideFields) {
      const x = span.outerXMm / 1000;
      const z0 = -span.startMm / 1000;
      const z1 = -(span.startMm + span.widthMm) / 1000;
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([
        x, 0, z0, x, 0, z1, x, span.topEndMm / 1000, z1, x, span.topStartMm / 1000, z0,
      ], 3));
      geometry.setIndex([0, 1, 2, 0, 2, 3]);
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      const field = new Mesh(geometry, material());
      field.userData.sideField = span.side;
      field.userData.fieldId = span.fieldId;
      field.userData.exportable = false;
      planes.push(field);
    }
  } else if (sorted.length >= 2) {
    for (const [side, x, offset] of [['right', sorted[0], -0.003], ['left', sorted[sorted.length - 1], 0.003]] as const) {
      const field = new Mesh(new PlaneGeometry(depthM, frontHeightM), material());
      field.rotation.y = Math.PI / 2;
      field.position.set(x + offset, frontHeightM / 2, -depthM / 2);
      field.userData.sideField = side;
      field.userData.exportable = false;
      planes.push(field);
    }
  }
  // Rear fields of a free-standing roof, just behind the legs.
  for (const span of rearFields) {
    const field = new Mesh(new PlaneGeometry(span.widthMm / 1000, span.heightMm / 1000), material());
    field.position.set((span.xMm + span.widthMm / 2) / 1000, span.heightMm / 2000, 0.003);
    field.userData.fieldId = span.fieldId;
    field.userData.exportable = false;
    planes.push(field);
  }
  return planes;
}
