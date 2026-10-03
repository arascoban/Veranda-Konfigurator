import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Box3, Mesh, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildAluminiumWall, buildBeamLying, buildBeamStanding, buildGable, createAusstattungMaterials, insetPolygon } from './ausstattungScene';
import { equipmentPartPath, type EquipmentParts } from './glassSlidingScene';
import { createEquipmentGroup } from './equipmentScene';
import { addToField, divideSide, listFields, setGable, splitHorizontally } from '../../domain/fieldEquipment';
import { createDefaultConfiguration } from '../../domain/configuration';

beforeAll(() => { vi.stubGlobal('self', globalThis); });

async function loadParts(): Promise<EquipmentParts> {
  const loader = new GLTFLoader();
  const ids = ['beam50x100', 'fProfile', 'lamella', 'wd55'];
  const entries = await Promise.all(ids.map(async (id) => {
    const bytes = readFileSync(resolve(__dirname, '../../../public', equipmentPartPath(id)));
    const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    return [id, gltf.scene] as [string, Group];
  }));
  return new Map(entries);
}

const sizeOf = (group: Group) => { group.updateMatrixWorld(true); return new Box3().setFromObject(group).getSize(new Vector3()); };

describe('Ausstattung profiles', () => {
  it('builds the Aluminiumwand from F profiles and 15 cm lamellas, 2,9 cm deep', async () => {
    const parts = await loadParts();
    const wall = buildAluminiumWall(parts, createAusstattungMaterials('#383E42'), { lengthMm: 2335, heightMm: 1000 });
    const size = sizeOf(wall);
    expect(size.x).toBeCloseTo(2.335, 3);
    expect(size.y).toBeCloseTo(1.0, 3);
    expect(size.z).toBeCloseTo(0.029, 3);
    // 4 frame profiles + ceil(998 / 146) = 7 lamellas.
    const meshes: Mesh[] = [];
    wall.traverse((object) => { if (object instanceof Mesh) meshes.push(object); });
    expect(meshes).toHaveLength(4 + 7);
  });

  it('lays the 50×100 5 cm high and 10 cm deep, or stands it 5 cm wide', async () => {
    const parts = await loadParts();
    const material = createAusstattungMaterials('#383E42').frame;
    const lying = sizeOf(buildBeamLying(parts, material, 2335));
    expect([lying.x, lying.y, lying.z].map((value) => +value.toFixed(3))).toEqual([2.335, 0.05, 0.1]);
    const standing = sizeOf(buildBeamStanding(parts, material, 2095));
    expect([standing.x, standing.y, standing.z].map((value) => +value.toFixed(3))).toEqual([0.05, 2.095, 0.1]);
  });

  it('cuts the aluminium Giebeldreieck to the roof line and frames glass in WD-55', async () => {
    const parts = await loadParts();
    const materials = createAusstattungMaterials('#383E42');
    const options = { lengthMm: 2865, bottomMm: 0, topAtWallMm: 560, topAtPostMm: 175 };
    for (const variant of ['aluminium', 'glas_klar'] as const) {
      const gable = buildGable(parts, materials, { ...options, variant });
      gable.updateMatrixWorld(true);
      // Every vertex stays under the sloped roof line (1 mm tolerance) and inside the side length.
      gable.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        const position = object.geometry.getAttribute('position');
        for (let index = 0; index < position.count; index += 1) {
          const point = new Vector3().fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld).multiplyScalar(1000);
          const roof = options.topAtWallMm - (options.topAtWallMm - options.topAtPostMm) * point.x / options.lengthMm;
          if (variant === 'aluminium') expect(point.y).toBeLessThanOrEqual(roof + 1);
          expect(point.x).toBeGreaterThanOrEqual(-1);
          expect(point.x).toBeLessThanOrEqual(options.lengthMm + 1);
        }
      });
      expect(gable.userData.depthMm).toBe(variant === 'aluminium' ? 29 : 55);
    }
  });

  it('insets a convex outline evenly', () => {
    expect(insetPolygon([[0, 0], [100, 0], [100, 100], [0, 100]], 10).map((point) => point.map((value) => Math.round(value)))).toEqual([[10, 10], [90, 10], [90, 90], [10, 90]]);
  });

  it('places beams, dividers and the gable of a Referans 2 like layout, with drag handles', async () => {
    const parts = await loadParts();
    let configuration = createDefaultConfiguration();
    const front = listFields(configuration)[0].id;
    configuration = splitHorizontally(addToField(configuration, front, 'glasschiebewand')!, front)!;
    configuration = setGable(divideSide(addToField(configuration, 'side:left', 'aluminiumwand')!, 'left', 2)!, 'left', 'glas_milch');
    const group = createEquipmentGroup(configuration, parts);
    const handles: unknown[] = [];
    const names: string[] = [];
    group.traverse((object) => { if (object.userData.beamHandle) handles.push(object.userData.beamHandle); if (object.name) names.push(object.name); });
    expect(handles).toEqual([{ kind: 'split', fieldId: front }, { kind: 'divider', side: 'left', index: 0 }]);
    expect(names.filter((name) => name === 'Aluminiumwand')).toHaveLength(3);
    expect(names).toContain('50×100 Teilung');
    expect(names).toContain('Giebeldreieck glas_milch');
  });
});
