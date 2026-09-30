import type { DemoGlbExport } from '../../features/ar/exportDemoGlb';

export type PublishedArAsset = {
  kind: 'schematic_demo';
  revision: number;
  publicModelUrl: string;
};

/** Implement on a trusted server when model storage and public HTTPS access exist. */
export type ArAssetPublisher = (input: {
  blob: Blob;
  revision: number;
  kind: 'schematic_demo';
}) => Promise<{ publicModelUrl: string }>;

export type PublishArResult =
  | { status: 'unavailable' }
  | { status: 'stale' }
  | { status: 'invalid_public_url' }
  | { status: 'ready'; asset: PublishedArAsset };

export async function publishArAsset(
  exportResult: DemoGlbExport,
  getCurrentRevision: () => number,
  publisher: ArAssetPublisher | null,
): Promise<PublishArResult> {
  if (exportResult.status !== 'ready') return { status: 'unavailable' };
  if (exportResult.revision !== getCurrentRevision()) return { status: 'stale' };
  if (!publisher) return { status: 'unavailable' };
  const response = await publisher({
    blob: exportResult.blob,
    revision: exportResult.revision,
    kind: exportResult.kind,
  });
  if (exportResult.revision !== getCurrentRevision()) return { status: 'stale' };
  try {
    const url = new URL(response.publicModelUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return { status: 'invalid_public_url' };
  } catch {
    return { status: 'invalid_public_url' };
  }
  return {
    status: 'ready',
    asset: {
      kind: exportResult.kind,
      revision: exportResult.revision,
      publicModelUrl: response.publicModelUrl,
    },
  };
}

export function modelViewerArOptions(asset: PublishedArAsset, currentRevision: number, iosSrc?: string) {
  if (asset.revision !== currentRevision) return null;
  if (iosSrc) {
    try {
      const url = new URL(iosSrc);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
    } catch {
      return null;
    }
  }
  return {
    src: asset.publicModelUrl,
    ar: true,
    arModes: 'webxr scene-viewer quick-look',
    arScale: 'fixed',
    iosSrc: iosSrc ?? null,
  } as const;
}
