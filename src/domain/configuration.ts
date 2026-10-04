import { z } from 'zod';
import { attachmentReferences } from '../catalog/attachmentReference';
import { CATALOG_VERSION, DEFAULT_SLOPE_DEGREES, products, roofFinishes, roofMaterials } from '../catalog/catalog';

const roofFinishIds = Object.keys(roofFinishes) as [keyof typeof roofFinishes, ...(keyof typeof roofFinishes)[]];
import { createMinimumPostLayout } from './geometry/posts';
import { fieldEquipmentSchema, sideLayoutSchema } from './fieldEquipment';
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
  /** Aluminium colour of the whole frame; seals and glazing are unaffected. */
  frameColor: z.enum(['ral7016', 'ral9001']).default('ral7016'),
  /** Tone for the whole roof (its family must equal roofMaterialId); fields may override within the family. */
  roofFinish: z.enum(roofFinishIds).default('vsg_klar'),
  /** Per roof field (inside-left index) tone override; null or missing entries use roofFinish. */
  roofFieldFinishes: z.array(z.enum(roofFinishIds).nullable()).default([]),
  /** Aufglas/Unterglas awning (glass roofs only); widths only for two awnings, depth along the rafters. */
  awning: z.object({
    type: z.enum(['aufglas', 'unterglas']),
    count: z.union([z.literal(1), z.literal(2)]),
    widthsMm: z.tuple([z.number().int().safe(), z.number().int().safe()]).nullable(),
    /** Motor side as seen from the garden. */
    motorSide: z.enum(['left', 'right']).default('left'),
    /** Fabric id from the catalogue (placeholders until the real swatches arrive). */
    fabricId: z.string().min(1).default('stoff-1'),
  }).strict().nullable().default(null),
  /** LED strips per rafter (corner rafters excluded); 0 = none. */
  ledPerRafter: z.number().int().min(0).safe().default(0),
  /** Switchable or dimmable LED control (different prices). */
  ledControl: z.enum(['schaltbar', 'dimmbar']).default('schaltbar'),
  /** Ausstattung per front/side field (V2, 2 Oct 2026); older drafts open without equipment. */
  fieldEquipment: z.array(fieldEquipmentSchema).default([]),
  /**
   * Posts moved in towards the wall (4 Oct 2026, owner): 0 = at the gutter, up to 100 cm with a static carrier
   * (StatikTrage) under the rafters and an extra drain pipe.
   */
  postInsetMm: z.number().int().min(0).max(1000).default(0),
  /**
   * Freistehend (4 Oct 2026): no wall; an A profile carries the wall profile on 50×100 legs. The overall depth stays,
   * the roof moves forward by the A profile and the legs take 5 cm of the side fields (Ausstatungen_Kurallar.md).
   */
  freestanding: z.boolean().default(false),
  /** Centres of the rear 50×100 legs from the inside-left end (Prime post rules); null when not free-standing. */
  rearPostCenters: z.array(z.object({ id: z.string().min(1), xMm: z.number().int().safe() }).strict()).nullable().default(null),
  /** Giebeldreieck and 50×100 division per side (3 Oct 2026); missing sides are open and undivided. */
  sideLayouts: z.array(sideLayoutSchema).max(2).default([]),
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
  const parsed = configurationV1Schema.safeParse(migrateGables(candidate));
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

/**
 * Drafts saved before 3 Oct 2026 kept `gable: true` on the side field; it becomes the side's Giebeldreieck. Those
 * drafts showed a clear glass triangle, so they open with "Glas Klar".
 */
function migrateGables(candidate: Record<string, unknown>): Record<string, unknown> {
  const entries = candidate.fieldEquipment;
  if (!Array.isArray(entries) || !entries.some((entry) => entry && typeof entry === 'object' && 'gable' in entry)) return candidate;
  const sideLayouts = Array.isArray(candidate.sideLayouts) ? [...candidate.sideLayouts] : [];
  const fieldEquipment = entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || !('gable' in entry)) return [entry];
    const { gable, ...rest } = entry as Record<string, unknown>;
    const side = /^side:(left|right)$/.exec(String(rest.fieldId))?.[1];
    if (gable === true && side && !sideLayouts.some((layout) => layout?.side === side)) sideLayouts.push({ side, gable: 'glas_klar', dividersMm: [] });
    return Array.isArray(rest.elements) && rest.elements.length === 0 ? [] : [rest];
  });
  return { ...candidate, fieldEquipment, sideLayouts };
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
    frameColor: 'ral7016',
    roofFinish: 'vsg_klar',
    roofFieldFinishes: [],
    awning: null,
    ledPerRafter: 0,
    ledControl: 'schaltbar',
    fieldEquipment: [],
    sideLayouts: [],
    postInsetMm: 0,
    freestanding: false,
    rearPostCenters: null,
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
