import type { ProductId } from '../../catalog/catalog';

/** Web-ready GLB metadata will be populated only after asset preparation. */
export type PartAsset = {
  productId: ProductId;
  partId: string;
  assetVersion: string;
  glbUrl: string;
  sourceSizeMm: readonly [number, number, number];
  mountAnchorMm: readonly [number, number, number];
};

export type ProductPartManifest = Readonly<Record<ProductId, readonly PartAsset[]>>;

export const productPartManifest: ProductPartManifest = {
  prime: [],
  premium: [],
};
