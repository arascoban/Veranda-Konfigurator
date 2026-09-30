import type { DemoGlbExport } from '../../features/ar/exportDemoGlb';

export type ArAsset = {
  revision: number;
  kind: 'schematic_demo';
  localPreviewUrl: string;
  /** Blob URLs are browser-local and must never be used in a QR code or native Scene Viewer. */
  publicModelUrl: null;
  dispose: () => void;
};

export function createLocalArAsset(exportResult: DemoGlbExport, currentRevision: number): ArAsset | null {
  if (exportResult.status !== 'ready' || exportResult.revision !== currentRevision) return null;
  const localPreviewUrl = URL.createObjectURL(exportResult.blob);
  return {
    revision: exportResult.revision,
    kind: exportResult.kind,
    localPreviewUrl,
    publicModelUrl: null,
    dispose: () => URL.revokeObjectURL(localPreviewUrl),
  };
}

export function isArAssetCurrent(asset: ArAsset, currentRevision: number): boolean {
  return asset.revision === currentRevision;
}
