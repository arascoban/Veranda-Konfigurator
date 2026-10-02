import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, type Object3D } from 'three';

/**
 * Invisible pick planes for the fields that take equipment: one per gap between posts on the garden face
 * (`openingIndex`, inside-left order) and one per side between the wall and the end post (`sideField`,
 * garden view: the garden-left side lies at the inside x = W end). The viewer tints them on hover/selection.
 */
export function createFieldPickPlanes(postCentersM: readonly number[], depthM: number, frontHeightM: number): Object3D[] {
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
  if (sorted.length >= 2) {
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
