import type { SideFieldSpan } from './placements';
import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, type Object3D } from 'three';

/**
 * Invisible pick planes for the fields that take equipment: one per gap between posts on the garden face
 * (`openingIndex`, inside-left order) and one per side between the wall and the end post (`sideField`,
 * garden view: the garden-left side lies at the inside x = W end). The viewer tints them on hover/selection.
 */
export function createFieldPickPlanes(postCentersM: readonly number[], depthM: number, frontHeightM: number, sideFields?: readonly SideFieldSpan[]): Object3D[] {
  const sorted = [...postCentersM].sort((a, b) => a - b);
  const material = () => new MeshBasicMaterial({ color: 0x2f9dff, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide });
  const planes: Object3D[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const left = sorted[index];
    const right = sorted[index + 1];
    const field = new Mesh(new PlaneGeometry(right - left, frontHeightM), material());
    field.position.set((left + right) / 2, frontHeightM / 2, -depthM + 0.003);
    field.userData.openingIndex = index;
    field.userData.exportable = false;
    planes.push(field);
  }
  if (sorted.length >= 2 && sideFields?.length) {
    // Side parts (3 Oct 2026): one plane per part of a side divided by 50×100 profiles, up to the side field height.
    for (const span of sideFields) {
      const field = new Mesh(new PlaneGeometry(span.widthMm / 1000, span.heightMm / 1000), material());
      field.rotation.y = Math.PI / 2;
      const x = span.side === 'right' ? sorted[0] - 0.003 : sorted[sorted.length - 1] + 0.003;
      field.position.set(x, span.heightMm / 2000, -(span.startMm + span.widthMm / 2) / 1000);
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
  return planes;
}
