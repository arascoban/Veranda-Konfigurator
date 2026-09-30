import { z } from 'zod';
import { parseConfiguration, type ConfigurationV1 } from '../../domain/configuration';
import { buildQuoteFromApprovedPrices, type ApprovedPriceLine, type ApprovedPriceSheet, type QuoteResult } from '../../domain/pricing/quote';
import { buildGridQuote, type GridQuoteResult } from '../../domain/pricing/gridQuote';
import type { BasePriceTable } from '../../domain/pricing/basePriceGrid';

const requestSchema = z.object({
  configuration: z.unknown(),
  revision: z.number().int().nonnegative().safe(),
}).strict();

export type TrustedPriceAuthority = {
  resolve: (configuration: ConfigurationV1) => Promise<{
    sheet: ApprovedPriceSheet | null;
    lines: readonly ApprovedPriceLine[];
  }>;
};

export type QuoteServiceResponse =
  | { status: 'invalid_request' }
  | { status: 'error'; revision: number }
  | { status: 'result'; revision: number; quote: QuoteResult };

/** Server adapter: the request contains a configuration, never a client-supplied total. */
export async function respondToQuoteRequest(
  rawRequest: unknown,
  priceAuthority: TrustedPriceAuthority,
  now = new Date(),
): Promise<QuoteServiceResponse> {
  const request = requestSchema.safeParse(rawRequest);
  if (!request.success) return { status: 'invalid_request' };
  const parsed = parseConfiguration(request.data.configuration);
  if (!parsed.ok) return { status: 'invalid_request' };
  try {
    const approved = await priceAuthority.resolve(parsed.configuration);
    return {
      status: 'result',
      revision: request.data.revision,
      quote: buildQuoteFromApprovedPrices(parsed.configuration, approved.sheet, approved.lines, now),
    };
  } catch {
    return { status: 'error', revision: request.data.revision };
  }
}

export type TrustedGridPriceAuthority = {
  resolveTable: (configuration: ConfigurationV1) => Promise<BasePriceTable | null>;
};

/** Production tariff adapter: actual tables will be provided later, through trusted server storage. */
export async function respondToGridQuoteRequest(
  rawRequest: unknown,
  priceAuthority: TrustedGridPriceAuthority,
  now = new Date(),
): Promise<{ status: 'invalid_request' } | { status: 'error'; revision: number } |
  { status: 'result'; revision: number; result: GridQuoteResult }> {
  const request = requestSchema.safeParse(rawRequest);
  if (!request.success) return { status: 'invalid_request' };
  const parsed = parseConfiguration(request.data.configuration);
  if (!parsed.ok) return { status: 'invalid_request' };
  try {
    const table = await priceAuthority.resolveTable(structuredClone(parsed.configuration));
    return { status: 'result', revision: request.data.revision, result: buildGridQuote(parsed.configuration, table, now) };
  } catch {
    return { status: 'error', revision: request.data.revision };
  }
}
