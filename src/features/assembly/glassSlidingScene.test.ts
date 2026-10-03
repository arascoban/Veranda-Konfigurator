import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Box3, Mesh, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { glassSlidingLayout } from '../../domain/glassSlidingDoor';
import { buildGlassSlidingWall, createGswMaterials, gswPartPath, leafTracks, type EquipmentParts } from './glassSlidingScene';

beforeAll(() => { vi.stubGlobal('self', globalThis); });

async function loadParts(ids: string[]): Promise<EquipmentParts> {
  const loader = new GLTFLoader();
  const entries = await Promise.all(ids.map(async (id) => {
    const bytes = readFileSync(resolve(__dirname, '../../../public', gswPartPath(id)));
    const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    return [id, gltf.scene] as [string, Group];
  }));
  return new Map(entries);
}

describe('Glasschiebewand from the single profiles', () => {
  it('fills the clear width and height with rails, U profiles and the table\'s leaves', async () => {
    // Default draft, front field: 233,5 cm clear → 3 leaves of 90 cm on the 3-rail profile.
    const layout = glassSlidingLayout(2335)!;
    expect(layout).toMatchObject({ leaves: 3, railProfile: 3, glassWidthMm: 900 });
    const parts = await loadParts(['rail3Top', 'rail3Bottom', 'rail3Side', 'glassLeaf']);
    const wall = buildGlassSlidingWall(parts, createGswMaterials('#383E42'), {
      lengthMm: 2335, heightMm: 2300, layout, element: { type: 'glasschiebewand', glassTone: 'klar', openingDirection: 'mittig' }, leavesFromGardenLeft: false,
    });
    wall.updateMatrixWorld(true);
    const box = new Box3().setFromObject(wall);
    const size = box.getSize(new Vector3());
    expect(size.x).toBeCloseTo(2.335, 3);
    expect(size.y).toBeCloseTo(2.3, 3);
    // Depth of the 3-rail profile (6,7 cm, U profile 6,9 cm).
    expect(size.z).toBeLessThan(0.075);
    const panes: Box3[] = [];
    wall.traverse((object) => { if (object instanceof Mesh && object.geometry.boundingBox && object.scale.y !== 1) panes.push(new Box3().setFromObject(object)); });
    expect(panes).toHaveLength(3);
    for (const pane of panes) {
      // Glass from 7,8 cm to 2,2 cm under the top.
      expect(pane.min.y).toBeCloseTo(0.078, 3);
      expect(pane.max.y).toBeCloseTo(2.278, 3);
    }
    // Leaves between the U profiles: first starts at 2 cm, last ends at clear width − 2 cm.
    const xs = panes.map((pane) => pane.min.x).sort((a, b) => a - b);
    expect(xs[0]).toBeGreaterThan(0.02);
    expect(Math.max(...panes.map((pane) => pane.max.x))).toBeLessThan(2.315 + 0.001);
  });

  it('never puts neighbouring leaves on the same track', () => {
    for (const opening of ['links', 'rechts', 'mittig'] as const) {
      for (let leaves = 2; leaves <= 6; leaves += 1) {
        const tracks = leafTracks(leaves, opening);
        expect(new Set(tracks).size).toBe(leaves);
        expect(Math.max(...tracks)).toBeLessThan(Math.max(3, leaves));
      }
    }
  });
});
