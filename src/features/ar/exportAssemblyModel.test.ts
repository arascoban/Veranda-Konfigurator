import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Box3, Group, Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createDefaultConfiguration } from '../../domain/configuration';
import { addToField, listFields } from '../../domain/fieldEquipment';
import type { PartLibrary } from '../assembly/assemblyScene';
import { buildArGroup, exportAssemblyModel } from './exportAssemblyModel';

beforeAll(() => {
  // GLTFLoader looks up `self` (browser global) for its image loader.
  vi.stubGlobal('self', globalThis);
  // Node has Blob but no FileReader; the GLB exporter uses FileReader for the binary chunk.
  vi.stubGlobal('FileReader', class {
    result: ArrayBuffer | null = null;
    onloadend: (() => void) | null = null;
    readAsArrayBuffer(blob: Blob) {
      void blob.arrayBuffer().then((buffer) => { this.result = buffer; this.onloadend?.(); });
    }
  });
});
afterAll(() => vi.unstubAllGlobals());

/** Reads the real web models from public/models instead of fetching them. */
function diskLibrary(): PartLibrary {
  const loader = new GLTFLoader();
  const cache = new Map<string, Promise<Group>>();
  return {
    load(path: string) {
      let pending = cache.get(path);
      if (!pending) {
        const bytes = readFileSync(resolve(__dirname, '../../../public', path));
        pending = loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '').then((gltf) => {
          gltf.scene.traverse((object) => { object.userData.sharedAsset = true; });
          return gltf.scene;
        });
        cache.set(path, pending);
      }
      return pending;
    },
    peek: () => null,
  } as unknown as PartLibrary;
}

describe('AR model of the real assembly', () => {
  it('stands on the floor at metre scale, centred, garden side to the viewer, with equipment and without aids', async () => {
    const base = createDefaultConfiguration();
    const configuration = addToField(base, listFields(base)[0].id, 'aluminiumwand')!;
    const root = (await buildArGroup(configuration, diskLibrary()))!;
    const box = new Box3().setFromObject(root);
    // 500 × 300 cm draft: footprint ≈ width × depth, floor at 0, height ≈ rear height + wall profile.
    expect(box.min.y).toBeCloseTo(0, 3);
    expect(box.max.x - box.min.x).toBeGreaterThan(4.9);
    expect(box.max.x - box.min.x).toBeLessThan(5.3);
    expect(box.max.z - box.min.z).toBeGreaterThan(2.9);
    expect(Math.abs((box.max.x + box.min.x) / 2)).toBeLessThan(0.01);
    expect(Math.abs((box.max.z + box.min.z) / 2)).toBeLessThan(0.01);
    expect(root.rotation.y).toBeCloseTo(Math.PI);
    let equipment = 0;
    let aids = 0;
    root.traverse((object) => {
      if (object.name === 'Ausstattung') equipment += object.children.length;
      if (object.userData.openingIndex !== undefined || object.userData.sideField || object.userData.ground || object.userData.selectionHalo) aids += 1;
    });
    expect(equipment).toBe(1);
    expect(aids).toBe(0);
  });

  it('exports a GLB that reimports, and refuses invalid or outdated drafts', async () => {
    const library = diskLibrary();
    const result = await exportAssemblyModel(createDefaultConfiguration(), 'glb', library);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    const gltf = await new GLTFLoader().parseAsync(await result.blob.arrayBuffer(), '');
    let meshes = 0;
    gltf.scene.traverse((object) => { if (object instanceof Mesh) meshes += 1; });
    expect(meshes).toBeGreaterThan(20);

    const invalid = createDefaultConfiguration();
    invalid.dimensionsMm.width = null;
    expect((await exportAssemblyModel(invalid, 'glb', library)).status).toBe('invalid_configuration');
    let revision = 1;
    const stale = exportAssemblyModel(createDefaultConfiguration(), 'glb', library, 1, () => revision);
    revision = 2;
    expect((await stale).status).toBe('stale');
  });
});
