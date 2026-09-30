import { describe, expect, it, vi } from 'vitest';
import { createEmptyConfiguration } from '../../domain/configuration';
import { modelViewerArOptions, publishArAsset } from './publishArAsset';

const readyExport = {
  status: 'ready' as const,
  revision: 3,
  configuration: createEmptyConfiguration(),
  blob: new Blob(['glb'], { type: 'model/gltf-binary' }),
  kind: 'schematic_demo' as const,
};

describe('public AR asset handoff', () => {
  it('does not promote a local-only asset to a phone-ready URL', async () => {
    expect(await publishArAsset(readyExport, () => 3, null)).toEqual({ status: 'unavailable' });
    const localPublisher = vi.fn(async () => ({ publicModelUrl: 'blob:local-file' }));
    expect(await publishArAsset(readyExport, () => 3, localPublisher)).toEqual({ status: 'invalid_public_url' });
  });

  it('discards a published link when configuration changes during upload', async () => {
    let revisionReads = 0;
    const publisher = vi.fn(async () => ({ publicModelUrl: 'https://models.example.test/demo.glb' }));
    const result = await publishArAsset(readyExport, () => ++revisionReads === 1 ? 3 : 4, publisher);
    expect(publisher).toHaveBeenCalledOnce();
    expect(result).toEqual({ status: 'stale' });
  });

  it('only builds current model-viewer options from a public HTTPS asset', async () => {
    const result = await publishArAsset(readyExport, () => 3,
      async () => ({ publicModelUrl: 'https://models.example.test/demo.glb' }));
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(modelViewerArOptions(result.asset, 4)).toBeNull();
    expect(modelViewerArOptions(result.asset, 3)).toMatchObject({
      src: 'https://models.example.test/demo.glb',
      arModes: 'webxr scene-viewer quick-look',
      iosSrc: null,
    });
  });
});
