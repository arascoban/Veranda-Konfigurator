import { parseConfiguration, type ConfigurationV1 } from '../configuration';
import { evaluateConfiguration } from '../evaluateConfiguration';
import { minimumRoofBayCount } from '../geometry/roof';
import { lookupBasePrice, type BasePriceResult, type BasePriceTable } from './basePriceGrid';
import { buildQuoteFromApprovedPrices, type QuoteResult } from './quote';

export type GridQuoteResult = { basePrice: BasePriceResult | null; quote: QuoteResult };

/** Server-side bridge from the size table to the quote; optional surcharges are never assumed free. */
export function buildGridQuote(configuration: ConfigurationV1, table: BasePriceTable | null, now = new Date()): GridQuoteResult {
  const parsed = parseConfiguration(configuration);
  if (!parsed.ok) return { basePrice: null, quote: { status: 'invalid_configuration', issueCodes: parsed.details } };
  const config = parsed.configuration;
  const evaluation = evaluateConfiguration(config);
  const invalid = evaluation.issues.filter((issue) => issue.kind === 'invalid');
  if (invalid.length) return {
    basePrice: null, quote: { status: 'invalid_configuration', issueCodes: invalid.map((issue) => issue.code) },
  };
  const missingFields = evaluation.issues.filter((issue) => issue.kind === 'missing').map((issue) => issue.field);
  const basePrice = lookupBasePrice(config, table, now);
  if (missingFields.length) return { basePrice, quote: { status: 'missing_data', missingLineIds: [], missingFields } };
  if (basePrice.status === 'invalid_table') return { basePrice, quote: { status: 'invalid_price_data', reason: basePrice.reason } };
  if (basePrice.status !== 'base_price_available' || !table) return {
    basePrice, quote: { status: 'missing_data', missingLineIds: [basePrice.status === 'missing_data' ? basePrice.reason : 'base_price'] },
  };

  const minimumBays = minimumRoofBayCount(config.dimensionsMm.width!, config.roofMaterialId);
  const extraBays = config.roofBayCount !== null && minimumBays !== null && config.roofBayCount > minimumBays;
  const quote = buildQuoteFromApprovedPrices(config, {
    productId: table.productId, roofMaterialId: table.roofMaterialId, catalogVersion: table.catalogVersion,
    priceVersion: table.priceVersion, currency: table.currency, scopeDe: table.scopeDe,
    validUntilIso: table.validUntilIso,
    requiredLineIds: extraBays ? ['base', 'extra_roof_bays'] : ['base'],
  }, [{
    id: 'base', labelDe: 'Grundpreis Überdachung', quantity: 1,
    unitAmountMinor: basePrice.amountMinor, currency: basePrice.currency, priceBasis: basePrice.basis,
  }], now);
  return { basePrice, quote };
}
