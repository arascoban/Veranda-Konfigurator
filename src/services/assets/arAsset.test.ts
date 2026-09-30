import { describe, expect, it, vi } from 'vitest';
import { createEmptyConfiguration } from '../../domain/configuration';
import { createLocalArAsset, isArAssetCurrent } from './arAsset';

describe('local-only AR asset', () => {
  it('never offers a local blob URL as a shareable model URL and invalidates edits', () => {
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:local-demo', revokeObjectURL: revoke });
    try {
      const configuration = createEmptyConfiguration();
      const result = { status: 'ready' as const, revision: 2, configuration,
        blob: new Blob(), kind: 'schematic_demo' as const };
      const asset = createLocalArAsset(result, 2)!;
      expect(asset.localPreviewUrl).toBe('blob:local-demo');
      expect(asset.publicModelUrl).toBeNull();
      expect(isArAssetCurrent(asset, 2)).toBe(true);
      expect(isArAssetCurrent(asset, 3)).toBe(false);
      expect(createLocalArAsset(result, 3)).toBeNull();
      asset.dispose();
      expect(revoke).toHaveBeenCalledWith('blob:local-demo');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
