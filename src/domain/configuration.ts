import { z } from 'zod';
import { attachmentReferences } from '../catalog/attachmentReference';
import { CATALOG_VERSION, DEFAULT_SLOPE_DEGREES, products, roofMaterials } from '../catalog/catalog';
import { createMinimumPostLayout } from './geometry/posts';
import { rearHeightForSlope } from './geometry/slope';

const nullableMillimetres = z.number().int().safe().nullable();

export const configurationV1Schema = z.object({
  schemaVersion: z.literal(1),
  catalogVersion: z.literal(CATALOG_VERSION),
  productId: z.enum(Object.keys(products) as [keyof typeof products, ...(keyof typeof products)[]]),
  roofMaterialId: z.enum(Object.keys(roofMaterials) as [keyof typeof roofMaterials, ...(keyof typeof roofMaterials)[]]),
  dimensionsMm: z.object({
    width: nullableMillimetres,
    depth: nullableMillimetres,
    rearHeight: nullableMillimetres,
    frontHeight: nullableMillimetres,
  }).strict(),
  /** null means calculate the smallest permitted number of equal roof bays. */
  roofBayCount: z.number().int().positive().safe().nullable(),
  /** Centers measured from the left end of the gutter, looking from inside. */
  postCenters: z.array(z.object({
    id: z.string().min(1),
    xMm: z.number().int().safe(),
  }).strict()).nullable(),
  /** No infill products have been confirmed for the first catalogue revision. */
  openingOptions: z.array(z.never()),
  /** Prime post cover style chosen by the customer; Premium has one post type. */
  postCapStyle: z.enum(['gerade', 'halb']).default('gerade'),
  /** End post carrying the drain pipe, as seen from the garden; widths above 8 m get a pipe on both ends. */
  drainSide: z.enum(['left', 'right']).default('left'),
}).strict();

export type ConfigurationV1 = z.infer<typeof configurationV1Schema>;

export type ParseConfigurationResult =
  | { ok: true; configuration: ConfigurationV1 }
  | { ok: false; reason: 'unsupported_version' | 'invalid'; details: string[] };

export function parseConfiguration(raw: unknown): ParseConfigurationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: 'invalid', details: ['not_an_object'] };
  }
  const candidate = raw as Record<string, unknown>;
  if (candidate.schemaVersion !== 1 || candidate.catalogVersion !== CATALOG_VERSION) {
    return { ok: false, reason: 'unsupported_version', details: ['version'] };
  }
  const parsed = configurationV1Schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'invalid',
      details: parsed.error.issues.map((issue) => issue.path.join('.') || 'configuration'),
    };
  }
  const ids = parsed.data.postCenters?.map((post) => post.id) ?? [];
  if (new Set(ids).size !== ids.length) {
    return { ok: false, reason: 'invalid', details: ['postCenters.duplicate_id'] };
  }
  return { ok: true, configuration: parsed.data };
}

export function createEmptyConfiguration(): ConfigurationV1 {
  return {
    schemaVersion: 1,
    catalogVersion: CATALOG_VERSION,
    productId: 'prime',
    roofMaterialId: 'glass',
    dimensionsMm: { width: null, depth: null, rearHeight: null, frontHeight: null },
    roofBayCount: null,
    postCenters: null,
    openingOptions: [],
    postCapStyle: 'gerade',
    drainSide: 'left',
  };
}

/** Start of a new draft (decided 30 Sep 2026): Prime, 500 × 300 cm, front height 230 cm, 8° slope. */
export function createDefaultConfiguration(): ConfigurationV1 {
  const configuration = createEmptyConfiguration();
  const width = 5000;
  const depth = 3000;
  const frontHeight = 2300;
  configuration.dimensionsMm = {
    width, depth, frontHeight,
    rearHeight: rearHeightForSlope(depth, frontHeight, DEFAULT_SLOPE_DEGREES, attachmentReferences[configuration.productId]),
  };
  configuration.postCenters = createMinimumPostLayout(configuration.productId, width);
  return configuration;
}
