import { MAX_WIDTH_MM, roofMaterials, type ProductId, type RoofMaterialId } from '../../catalog/catalog';
import type { ConfigurationV1 } from '../configuration';

/** Price brackets only; these minima are not physical product size limits. */
export type PriceBasis = { widthMm: number; depthMm: number };

export function selectPriceBasis(widthMm: number, depthMm: number): PriceBasis | null {
  if (![widthMm, depthMm].every((value) => Number.isSafeInteger(value) && value > 0)) return null;
  const width = Math.max(3000, Math.ceil(widthMm / 1000) * 1000);
  const depth = Math.max(2000, Math.ceil(depthMm / 500) * 500);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(depth)) return null;
  return { widthMm: width, depthMm: depth };
}

export type BasePriceTable = {
  productId: ProductId;
  roofMaterialId: RoofMaterialId;
  catalogVersion: ConfigurationV1['catalogVersion'];
  priceVersion: string;
  currency: string;
  scopeDe: string;
  validUntilIso: string;
  cells: ReadonlyArray<PriceBasis & { amountMinor: number }>;
};

export type BasePriceResult =
  | { status: 'invalid_dimensions' }
  | { status: 'missing_dimensions' }
  | { status: 'missing_data'; basis: PriceBasis; reason: 'price_table' | 'price_cell' | 'expired_table' }
  | { status: 'invalid_table'; reason: 'wrong_product_material_or_catalog' | 'metadata' | 'cells' }
  | {
    status: 'base_price_available'; basis: PriceBasis; amountMinor: number;
    priceVersion: string; currency: string; scopeDe: string; validUntilIso: string;
  };

/** Exact cell lookup: never interpolate or borrow a price from another product/material. */
export function lookupBasePrice(
  configuration: ConfigurationV1,
  table: BasePriceTable | null,
  now = new Date(),
): BasePriceResult {
  const { width, depth } = configuration.dimensionsMm;
  if (width === null || depth === null) return { status: 'missing_dimensions' };
  const basis = selectPriceBasis(width, depth);
  if (!basis || width > MAX_WIDTH_MM || depth > roofMaterials[configuration.roofMaterialId].maxDepthMm) {
    return { status: 'invalid_dimensions' };
  }
  if (!table) return { status: 'missing_data', basis, reason: 'price_table' };
  if (table.productId !== configuration.productId || table.roofMaterialId !== configuration.roofMaterialId ||
    table.catalogVersion !== configuration.catalogVersion) {
    return { status: 'invalid_table', reason: 'wrong_product_material_or_catalog' };
  }
  const expiry = Date.parse(table.validUntilIso);
  if (!table.priceVersion.trim() || !table.currency.trim() || !table.scopeDe.trim() || !Number.isFinite(expiry) || !Number.isFinite(now.getTime())) {
    return { status: 'invalid_table', reason: 'metadata' };
  }
  if (expiry <= now.getTime()) return { status: 'missing_data', basis, reason: 'expired_table' };
  const seen = new Set<string>();
  for (const cell of table.cells) {
    const bracket = selectPriceBasis(cell.widthMm, cell.depthMm);
    const key = `${cell.widthMm}:${cell.depthMm}`;
    if (!bracket || bracket.widthMm !== cell.widthMm || bracket.depthMm !== cell.depthMm || seen.has(key) ||
      !Number.isSafeInteger(cell.amountMinor) || cell.amountMinor < 0) {
      return { status: 'invalid_table', reason: 'cells' };
    }
    seen.add(key);
  }
  const cell = table.cells.find((entry) => entry.widthMm === basis.widthMm && entry.depthMm === basis.depthMm);
  if (!cell) return { status: 'missing_data', basis, reason: 'price_cell' };
  return {
    status: 'base_price_available', basis, amountMinor: cell.amountMinor,
    priceVersion: table.priceVersion, currency: table.currency, scopeDe: table.scopeDe,
    validUntilIso: table.validUntilIso,
  };
}
