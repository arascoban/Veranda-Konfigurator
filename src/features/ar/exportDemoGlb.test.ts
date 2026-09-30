import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createEmptyConfiguration } from '../../domain/configuration';
import { exportDemoGlb } from './exportDemoGlb';

beforeAll(() => {
  // Node has Blob but no FileReader; the exporter uses FileReader for binary GLB assembly.
  vi.stubGlobal('FileReader', class {
    result: ArrayBuffer | null = null;
    onloadend: (() => void) | null = null;
    readAsArrayBuffer(blob: Blob) {
      void blob.arrayBuffer().then((buffer) => {
        this.result = buffer;
        this.onloadend?.();
      });
    }
  });
});
afterAll(() => vi.unstubAllGlobals());

function exampleConfiguration() {
  const configuration = createEmptyConfiguration();
  configuration.dimensionsMm = { width: 5000, depth: 3000, rearHeight: 2700, frontHeight: 2400 };
  configuration.postCenters = [{ id: 'left', xMm: 500 }, { id: 'right', xMm: 4500 }];
  return configuration;
}

describe('schematic AR GLB export', () => {
  it('reimports at the selected metre scale without scene ground', async () => {
    const configuration = exampleConfiguration();
    const result = await exportDemoGlb(configuration, 4, () => 4);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.kind).toBe('schematic_demo');
    const glb = await result.blob.arrayBuffer();
    const loaded = await new GLTFLoader().parseAsync(glb, '');
    const bounds = new Box3().setFromObject(loaded.scene);
    expect(bounds.min.x).toBeCloseTo(0, 5);
    expect(bounds.max.x).toBeCloseTo(5, 5);
    // The schematic wall beam is 2.5 cm thick around z=0.
    // Wall face at z = 0, garden towards negative Z.
    expect(bounds.max.z).toBeCloseTo(0.0125, 5);
    // Posts end at the nominal depth; only the 25 mm gutter guide beam extends past it.
    expect(bounds.min.z).toBeCloseTo(-3.0125, 4);
    expect(bounds.min.y).toBeCloseTo(0, 5);
    expect(bounds.max.y).toBeCloseTo(2.7125, 4);
    const guideLines: string[] = [];
    loaded.scene.traverse((object) => { if (object.type === 'LineSegments') guideLines.push(object.type); });
    expect(guideLines).toHaveLength(0);
    expect(loaded.scene.children[0].userData).toMatchObject({
      productId: 'prime', roofMaterialId: 'glass', revision: 4,
      dimensionsMm: configuration.dimensionsMm,
      postCenters: configuration.postCenters,
    });
  });

  it('rejects an outdated revision after asynchronous export', async () => {
    const configuration = exampleConfiguration();
    let revisionReads = 0;
    const result = await exportDemoGlb(configuration, 8, () => ++revisionReads === 1 ? 8 : 9);
    expect(revisionReads).toBe(2);
    expect(result).toEqual({ status: 'stale' });
  });

  it('does not export invalid dimensions', async () => {
    const configuration = exampleConfiguration();
    configuration.dimensionsMm.width = 13000;
    expect(await exportDemoGlb(configuration, 0, () => 0)).toEqual({ status: 'invalid_configuration' });
    configuration.dimensionsMm.width = 5000;
    configuration.postCenters = null;
    expect(await exportDemoGlb(configuration, 0, () => 0)).toEqual({ status: 'invalid_configuration' });
  });
});
