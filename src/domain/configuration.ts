import { z } from 'zod';
import { CATALOG_VERSION, products, roofMaterials } from '../catalog/catalog';

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
  };
}
