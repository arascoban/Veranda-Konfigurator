import { products, roofMaterials } from '../../../catalog/catalog';
import { parseConfiguration, type ConfigurationV1 } from '../../../domain/configuration';
import { evaluateConfiguration } from '../../../domain/evaluateConfiguration';
import type { QuoteResult } from '../../../domain/pricing/quote';

export type PdfPrice =
  | { status: 'unavailable'; reason: 'missing' | 'stale' | 'invalid' }
  | {
    status: 'ready';
    amountMinor: number;
    currency: string;
    scopeDe: string;
    priceVersion: string;
    validUntilIso: string;
    lines: Extract<QuoteResult, { status: 'ready' }>['lines'];
  };

export type PdfDocumentSnapshot = {
  /** Display as a draft number, not an order or binding quotation number. */
  documentId: string;
  createdAtIso: string;
  revision: number;
  configuration: ConfigurationV1;
  productNameDe: string;
  roofMaterialNameDe: string;
  price: PdfPrice;
  engineeringReviewRequired: true;
  /** The current scene is a schematic test model, not approved product imagery. */
  imageStatus: 'schematic_demo_only';
};

export type PdfSnapshotResult =
  | { status: 'invalid_configuration' | 'invalid_document_metadata' | 'stale' }
  | { status: 'ready'; snapshot: PdfDocumentSnapshot };

export function buildPdfDocumentSnapshot(input: {
  configuration: unknown;
  revision: number;
  currentRevision: number;
  documentId: string;
  createdAt: Date;
  quote: { revision: number; result: QuoteResult } | null;
}): PdfSnapshotResult {
  if (input.revision !== input.currentRevision) return { status: 'stale' };
  if (!input.documentId.trim() || !Number.isFinite(input.createdAt.getTime())) {
    return { status: 'invalid_document_metadata' };
  }
  const parsed = parseConfiguration(input.configuration);
  if (!parsed.ok || evaluateConfiguration(parsed.configuration).status === 'invalid') {
    return { status: 'invalid_configuration' };
  }
  const configuration = structuredClone(parsed.configuration);
  const quoted = input.quote;
  let price: PdfPrice = { status: 'unavailable', reason: 'missing' };
  if (quoted && quoted.revision !== input.revision) {
    price = { status: 'unavailable', reason: 'stale' };
  } else if (quoted?.result.status === 'ready') {
    const result = quoted.result;
    if (result.productId === configuration.productId && result.roofMaterialId === configuration.roofMaterialId &&
      result.catalogVersion === configuration.catalogVersion) {
      price = {
        status: 'ready', amountMinor: result.amountMinor, currency: result.currency,
        scopeDe: result.scopeDe, priceVersion: result.priceVersion,
        validUntilIso: result.validUntilIso, lines: structuredClone(result.lines),
      };
    } else {
      price = { status: 'unavailable', reason: 'invalid' };
    }
  } else if (quoted?.result.status === 'invalid_configuration' || quoted?.result.status === 'invalid_price_data') {
    price = { status: 'unavailable', reason: 'invalid' };
  }

  return {
    status: 'ready',
    snapshot: {
      documentId: input.documentId.trim(), createdAtIso: input.createdAt.toISOString(),
      revision: input.revision, configuration,
      productNameDe: products[configuration.productId].name,
      roofMaterialNameDe: roofMaterials[configuration.roofMaterialId].nameDe,
      price, engineeringReviewRequired: true, imageStatus: 'schematic_demo_only',
    },
  };
}
