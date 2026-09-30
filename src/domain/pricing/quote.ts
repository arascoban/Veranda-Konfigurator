import type { ProductId, RoofMaterialId } from '../../catalog/catalog';
import { parseConfiguration, type ConfigurationV1 } from '../configuration';
import { evaluateConfiguration } from '../evaluateConfiguration';
import type { PriceBasis } from './basePriceGrid';

/** Only a trusted server-side catalogue may supply these values. No actual tariff exists yet. */
export type ApprovedPriceSheet = {
  productId: ProductId;
  roofMaterialId: RoofMaterialId;
  catalogVersion: ConfigurationV1['catalogVersion'];
  priceVersion: string;
  currency: string;
  scopeDe: string;
  validUntilIso: string;
  requiredLineIds: readonly string[];
};

export type ApprovedPriceLine = {
  id: string;
  labelDe: string;
  quantity: number;
  unitAmountMinor: number;
  currency: string;
  priceBasis?: PriceBasis;
};

export type QuoteResult =
  | { status: 'invalid_configuration'; issueCodes: string[] }
  | { status: 'missing_data'; missingLineIds: string[]; missingFields?: string[] }
  | { status: 'invalid_price_data'; reason: string }
  | {
    status: 'ready';
    productId: ProductId;
    roofMaterialId: RoofMaterialId;
    catalogVersion: ConfigurationV1['catalogVersion'];
    priceVersion: string;
    currency: string;
    scopeDe: string;
    validUntilIso: string;
    engineeringReviewRequired: boolean;
    lines: Array<ApprovedPriceLine & { lineAmountMinor: number }>;
    amountMinor: number;
  };

export function buildQuoteFromApprovedPrices(
  configuration: ConfigurationV1,
  sheet: ApprovedPriceSheet | null,
  approvedLines: readonly ApprovedPriceLine[],
  now = new Date(),
): QuoteResult {
  const parsed = parseConfiguration(configuration);
  if (!parsed.ok) return { status: 'invalid_configuration', issueCodes: parsed.details };
  const evaluation = evaluateConfiguration(parsed.configuration);
  const invalid = evaluation.issues.filter((issue) => issue.kind === 'invalid').map((issue) => issue.code);
  if (invalid.length > 0) return { status: 'invalid_configuration', issueCodes: invalid };
  const missingFields = evaluation.issues.filter((issue) => issue.kind === 'missing').map((issue) => issue.field);
  if (missingFields.length > 0) return { status: 'missing_data', missingLineIds: [], missingFields };
  if (!sheet) return { status: 'missing_data', missingLineIds: ['approved_price_sheet'] };
  if (sheet.productId !== configuration.productId || sheet.roofMaterialId !== configuration.roofMaterialId ||
    sheet.catalogVersion !== configuration.catalogVersion) {
    return { status: 'invalid_price_data', reason: 'wrong_product_material_or_catalog' };
  }
  const required = sheet.requiredLineIds;
  if (required.length === 0 || new Set(required).size !== required.length || required.some((id) => !id)) {
    return { status: 'invalid_price_data', reason: 'invalid_required_lines' };
  }
  if (!sheet.priceVersion.trim() || !sheet.currency.trim() || !sheet.scopeDe.trim() ||
    !Number.isFinite(Date.parse(sheet.validUntilIso)) || !Number.isFinite(now.getTime())) {
    return { status: 'invalid_price_data', reason: 'incomplete_price_metadata' };
  }
  if (Date.parse(sheet.validUntilIso) <= now.getTime()) {
    return { status: 'missing_data', missingLineIds: ['current_price_sheet'] };
  }
  if (new Set(approvedLines.map((line) => line.id)).size !== approvedLines.length ||
    approvedLines.some((line) => !required.includes(line.id))) {
    return { status: 'invalid_price_data', reason: 'unexpected_or_duplicate_line' };
  }
  const missingLineIds = required.filter((id) => !approvedLines.some((line) => line.id === id));
  if (missingLineIds.length > 0) return { status: 'missing_data', missingLineIds };
  let amountMinor = 0;
  const lines: Array<ApprovedPriceLine & { lineAmountMinor: number }> = [];
  for (const line of approvedLines) {
    const lineAmountMinor = line.quantity * line.unitAmountMinor;
    if (!line.labelDe || line.currency !== sheet.currency || !Number.isSafeInteger(line.quantity) || line.quantity <= 0 ||
      !Number.isSafeInteger(line.unitAmountMinor) || line.unitAmountMinor < 0 || !Number.isSafeInteger(lineAmountMinor)) {
      return { status: 'invalid_price_data', reason: 'invalid_line_amount_or_currency' };
    }
    amountMinor += lineAmountMinor;
    if (!Number.isSafeInteger(amountMinor)) return { status: 'invalid_price_data', reason: 'total_overflow' };
    lines.push({ ...line, lineAmountMinor });
  }
  return {
    status: 'ready', productId: configuration.productId, roofMaterialId: configuration.roofMaterialId, catalogVersion: configuration.catalogVersion,
    priceVersion: sheet.priceVersion, currency: sheet.currency, scopeDe: sheet.scopeDe,
    validUntilIso: sheet.validUntilIso, engineeringReviewRequired: true, lines, amountMinor,
  };
}
