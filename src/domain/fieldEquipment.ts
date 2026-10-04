import { z } from 'zod';
import { postFrame } from '../features/assembly/placements';
import type { ConfigurationV1 } from './configuration';
import { validatePostCenters } from './geometry/posts';
import { checkGlassSliding, GSW_MAX_HEIGHT_MM, GSW_MIN_HEIGHT_MM, type GswCheck } from './glassSlidingDoor';

/**
 * Ausstattung per Feld (V2 design, user decisions 2 Oct 2026). A front field lies between two posts, a side
 * field at the left or right end (garden view). Each field takes up to two elements stacked on top of each
 * other; with two elements the lower part gets its own height. The Giebeldreieck fills the triangle above a
 * side field and is not one of the two elements (confirmed by the owner 2 Oct 2026: Giebeldreieck + 2 more).
 * No product limits, models or prices exist yet:
 * every rule here that is not in URUN_VE_OLCU_KURALLARI.md is marked provisional.
 */
export const fieldElementTypes = ['glasschiebewand', 'aluminiumwand', 'seitenwand_licht', 'senkrechtmarkise'] as const;
export type FieldElementType = typeof fieldElementTypes[number];
/** What the Ausstattung section and the radial menu offer: the four elements plus the side triangle. */
export type EquipmentKind = FieldElementType | 'giebeldreieck';
export const equipmentKinds: readonly EquipmentKind[] = [...fieldElementTypes, 'giebeldreieck'];

/** Owner decision 3 Oct 2026: Klar and Getönt only; two opening directions, no centre opening. */
export const glassTones = ['klar', 'getoent'] as const;
export const openingDirections = ['links', 'rechts'] as const;

/** Owner rule (3 Oct 2026): in a horizontally split field every part other than a Glasschiebewand is at least 30 cm high. */
export const MIN_SPLIT_PART_MM = 300;
/**
 * 50×100 profile (docs/Ausstatungen_Kurallar.md rules 2, 4, 5): lying, it is 5 cm high and 10 cm deep; standing as
 * a side divider it takes 5 cm of the side's depth.
 */
export const BEAM_MM = 50;
export const BEAM_DEPTH_MM = 100;
/**
 * Room between the 50×100 under the Giebeldreieck and the front height (owner, 3 Oct 2026: fixed, never less than
 * 15 cm; Referans 2 shows 15,5 cm). Side fields therefore end 20,5 cm below the front height.
 */
export const GABLE_ROOM_MM = 155;
/** Side division (rule 2): up to 3 parts, each at least 15 cm clear. */
export const MAX_SIDE_PARTS = 3;
export const MIN_SIDE_PART_MM = 150;
/** Default lower part when a second element is added (design example: 100 cm Aluminium, rest glass). */
export const DEFAULT_LOWER_HEIGHT_MM = 1000;
export const MAX_ELEMENTS_PER_FIELD = 2;
/**
 * Rule 11 (4 Oct 2026): highest element per type, without the Giebeldreieck. Senkrechtmarkise has no limit yet;
 * Zip-Markise (240 cm) follows with its model.
 */
/**
 * Seitenwand lichtdurchlässig (4 Oct 2026): WD-55 windows, each pane 11–110 cm wide. With the 4,5 cm frame face on
 * both sides a field needs at least 20 cm.
 */
export const LICHT_PANE_MIN_MM = 110;
export const LICHT_PANE_MAX_MM = 1100;
export const LICHT_FRAME_FACE_MM = 45;
export const LICHT_MIN_FIELD_WIDTH_MM = LICHT_PANE_MIN_MM + 2 * LICHT_FRAME_FACE_MM;

/** Equal windows across `widthMm`, as few as the 110 cm pane limit allows. */
export function lichtWindows(widthMm: number): { count: number; windowMm: number; paneMm: number } | null {
  if (widthMm < LICHT_MIN_FIELD_WIDTH_MM) return null;
  const count = Math.max(1, Math.ceil(widthMm / (LICHT_PANE_MAX_MM + 2 * LICHT_FRAME_FACE_MM)));
  const windowMm = widthMm / count;
  return { count, windowMm, paneMm: windowMm - 2 * LICHT_FRAME_FACE_MM };
}

export const ELEMENT_MAX_HEIGHT_MM: Partial<Record<FieldElementType, number>> = {
  glasschiebewand: GSW_MAX_HEIGHT_MM, aluminiumwand: 3000, seitenwand_licht: 2750,
};

/** Glass and polycarbonate fillings of WD-55 frames (Seitenwand lichtdurchlässig, Giebeldreieck), owner 3–4 Oct 2026. */
export const lightFillings = ['glas_klar', 'glas_milch', 'glas_getoent', 'poly_opal', 'poly_klar', 'poly_bronze'] as const;
export type LightFilling = typeof lightFillings[number];

export const fieldElementSchema = z.object({
  type: z.enum(fieldElementTypes),
  /** Glasschiebewand only; the profile colour always follows the frame colour. */
  // Drafts saved before 3 Oct 2026 may hold "satiniert" / "mittig": they open with Klar / the field's default.
  glassTone: z.preprocess((value) => value === 'satiniert' ? 'klar' : value, z.enum(glassTones).optional()),
  openingDirection: z.preprocess((value) => value === 'mittig' ? undefined : value, z.enum(openingDirections).optional()),
  /** Seitenwand lichtdurchlässig only. */
  filling: z.enum(lightFillings).optional(),
}).strict();
export type FieldElement = z.infer<typeof fieldElementSchema>;

export const fieldEquipmentSchema = z.object({
  /**
   * `front:<postId>:<postId>` (inside order, stable post ids), `side:left` / `side:right` (garden view) or, on a
   * divided side, `side:left:<part>` with part 1 at the wall.
   */
  fieldId: z.string().regex(/^(front:[^:]+:[^:]+|side:(left|right)(:[1-3])?)$/),
  /** Bottom to top; one element covers the whole height. */
  elements: z.array(fieldElementSchema).max(MAX_ELEMENTS_PER_FIELD),
  /** Height of the lower element when there are two (the 50×100 separator sits on top of it); null otherwise. */
  lowerHeightMm: z.number().int().safe().nullable(),
}).strict();
export type FieldEquipment = z.infer<typeof fieldEquipmentSchema>;

/** Giebeldreieck fillings (owner, 3 Oct 2026): Aluminium lamellas in F profiles, the rest in WD-55 frames. */
export const gableVariants = ['aluminium', ...lightFillings] as const;
export type GableVariant = typeof gableVariants[number];
export const gableVariantDe: Record<GableVariant, string> = {
  aluminium: 'Aluminium', glas_klar: 'Glas Klar', glas_milch: 'Glas Milch', glas_getoent: 'Glas Getönt',
  poly_opal: 'Polycarbonat Opal', poly_klar: 'Polycarbonat Klar', poly_bronze: 'Polycarbonat Bronze (Anthrazit)',
};
/** Rule 2: the default Giebeldreieck is the aluminium one. */
export const DEFAULT_GABLE: GableVariant = 'aluminium';

export const sideLayoutSchema = z.object({
  side: z.enum(['left', 'right']),
  /** Giebeldreieck above the side; null = open triangle. */
  gable: z.enum(gableVariants).nullable(),
  /** Centres of the standing 50×100 dividers, measured from the wall (mm), ascending; empty = undivided. */
  dividersMm: z.array(z.number().int().safe()).max(MAX_SIDE_PARTS - 1),
}).strict();
export type SideLayout = z.infer<typeof sideLayoutSchema>;
export type Side = SideLayout['side'];

export type FieldDescriptor = {
  id: string;
  kind: 'front' | 'side';
  /** Garden view. */
  side?: 'left' | 'right';
  /** Inside-left index of a front field (0 = between the first two posts of `postCenters`). */
  insideIndex?: number;
  /** "Vorne · Feld 1", "Seite links". */
  label: string;
  /** "Pfosten 1–2 · lichte Weite 229 cm" style detail. */
  detail: string;
  /** Clear width (front) or depth (side) in mm. */
  widthMm: number;
  /** Height available for elements: ground to the gutter underside (front) or to the 50×100 under the gable (side). */
  heightMm: number;
  /** Divided side: part number from the wall (1-based) and the part count. */
  partIndex?: number;
  partCount?: number;
  /** Side: start of the clear part, measured from the wall (mm). */
  startMm?: number;
};

export const elementNameDe: Record<EquipmentKind, string> = {
  glasschiebewand: 'Glasschiebewand',
  aluminiumwand: 'Aluminiumwand',
  seitenwand_licht: 'Seitenwand lichtdurchlässig',
  senkrechtmarkise: 'Senkrechtmarkise',
  giebeldreieck: 'Giebeldreieck',
};
export const glassToneDe: Record<typeof glassTones[number], string> = { klar: 'Klar', getoent: 'Getönt' };
export const openingDirectionDe: Record<typeof openingDirections[number], string> = { links: 'Links', rechts: 'Rechts' };
export type OpeningDirection = typeof openingDirections[number];

/**
 * Default opening (owner, 3 Oct 2026): front fields open to the left, the right side to the right, the left side to
 * the left — always as seen from outside, looking at that face.
 */
export function defaultOpening(field: Pick<FieldDescriptor, 'kind' | 'side'>): OpeningDirection {
  return field.kind === 'side' && field.side === 'right' ? 'rechts' : 'links';
}

export function openingOf(element: FieldElement, field: Pick<FieldDescriptor, 'kind' | 'side'>): OpeningDirection {
  return element.openingDirection ?? defaultOpening(field);
}

export function frontFieldId(leftPostId: string, rightPostId: string): string {
  return `front:${leftPostId}:${rightPostId}`;
}

/** All fields that take equipment, garden-left first: front fields, then the left and right side. */
export function listFields(configuration: ConfigurationV1): FieldDescriptor[] {
  const { width, depth, frontHeight } = configuration.dimensionsMm;
  if (width === null || depth === null || frontHeight === null) return [];
  const fields: FieldDescriptor[] = [];
  const posts = configuration.postCenters ?? [];
  if (posts.length >= 2 && validatePostCenters(configuration.productId, width, posts).length === 0) {
    const count = posts.length - 1;
    // Clear width between the measured post faces of the product model (works for every product).
    const frame = postFrame(configuration.productId);
    for (let gardenNumber = 1; gardenNumber <= count; gardenNumber += 1) {
      const insideIndex = count - gardenNumber;
      const left = posts[insideIndex];
      const right = posts[insideIndex + 1];
      const clear = (right.xMm - frame.alongMinusMm) - (left.xMm + frame.alongPlusMm);
      fields.push({
        id: frontFieldId(left.id, right.id), kind: 'front', insideIndex,
        label: `Vorne · Feld ${gardenNumber}`,
        detail: `Pfosten ${gardenNumber}–${gardenNumber + 1} · lichte Weite ${cm(clear)} cm`,
        widthMm: clear, heightMm: frontHeight,
      });
    }
  }
  // Side clear width: from the wall to the back face of the end post (owner rule, docs/Ausstatungen_Kurallar.md).
  // Side elements end under the 50×100 below the Giebeldreieck (rules 1 and 4).
  const sideClear = sideClearMm(configuration);
  const sideHeight = frontHeight - GABLE_ROOM_MM - BEAM_MM;
  for (const side of ['left', 'right'] as const) {
    const name = side === 'left' ? 'Seite links' : 'Seite rechts';
    const parts = sideParts(sideClear, sideLayoutOf(configuration, side).dividersMm);
    if (parts.length === 1) {
      fields.push({ id: `side:${side}`, kind: 'side', side, label: name, detail: `lichte Tiefe ${cm(sideClear)} cm`,
        widthMm: sideClear, heightMm: sideHeight, startMm: 0 });
      continue;
    }
    parts.forEach((part, index) => {
      const where = index === 0 ? 'an der Wand' : index === parts.length - 1 ? 'am Pfosten' : 'Mitte';
      fields.push({
        id: `side:${side}:${index + 1}`, kind: 'side', side, label: `${name} · Teil ${index + 1}`,
        detail: `${where} · lichte Breite ${cm(part.widthMm)} cm`, widthMm: part.widthMm, heightMm: sideHeight,
        partIndex: index + 1, partCount: parts.length, startMm: part.startMm,
      });
    });
  }
  return fields;
}

/** Clear depth of a side: wall to the back face of the end post, measured on the product model. */
export function sideClearMm(configuration: ConfigurationV1): number {
  return (configuration.dimensionsMm.depth ?? 0) - postFrame(configuration.productId).backFromDepthMm;
}

export function sideLayoutOf(configuration: ConfigurationV1, side: Side): SideLayout {
  return configuration.sideLayouts.find((layout) => layout.side === side) ?? { side, gable: null, dividersMm: [] };
}

export function sideOfField(fieldId: string): Side | null {
  const match = /^side:(left|right)/.exec(fieldId);
  return match ? match[1] as Side : null;
}

/** Field ids of one side (the whole side or its parts) in the current layout. */
export function sideFieldIds(configuration: ConfigurationV1, side: Side): string[] {
  const count = sideLayoutOf(configuration, side).dividersMm.length + 1;
  return count === 1 ? [`side:${side}`] : Array.from({ length: count }, (_, index) => `side:${side}:${index + 1}`);
}

/** Clear parts between the wall, the standing 50×100 dividers and the end post. */
export function sideParts(clearMm: number, dividersMm: readonly number[]): { startMm: number; widthMm: number }[] {
  const edges = [0, ...dividersMm.flatMap((centre) => [centre - BEAM_MM / 2, centre + BEAM_MM / 2]), clearMm];
  const parts: { startMm: number; widthMm: number }[] = [];
  for (let index = 0; index < edges.length; index += 2) parts.push({ startMm: edges[index], widthMm: edges[index + 1] - edges[index] });
  return parts;
}

/** Divider centres that split `clearMm` into `count` equal clear parts (rule 2: "gleich teilen"). */
export function equalDividers(clearMm: number, count: number): number[] {
  const width = (clearMm - (count - 1) * BEAM_MM) / count;
  return Array.from({ length: count - 1 }, (_, index) => Math.round((index + 1) * width + index * BEAM_MM + BEAM_MM / 2));
}

export function dividersValid(clearMm: number, dividersMm: readonly number[]): boolean {
  if (dividersMm.length > MAX_SIDE_PARTS - 1) return false;
  return sideParts(clearMm, dividersMm).every((part) => part.widthMm >= MIN_SIDE_PART_MM);
}

/** Range a divider may move in (its neighbours' parts keep 15 cm); null when the side has no such divider. */
export function dividerRange(configuration: ConfigurationV1, side: Side, index: number): { minMm: number; maxMm: number } | null {
  const dividers = sideLayoutOf(configuration, side).dividersMm;
  if (index < 0 || index >= dividers.length) return null;
  const before = index === 0 ? 0 : dividers[index - 1] + BEAM_MM / 2;
  const after = index === dividers.length - 1 ? sideClearMm(configuration) : dividers[index + 1] - BEAM_MM / 2;
  return { minMm: before + MIN_SIDE_PART_MM + BEAM_MM / 2, maxMm: after - MIN_SIDE_PART_MM - BEAM_MM / 2 };
}

function withSideLayout(configuration: ConfigurationV1, layout: SideLayout): ConfigurationV1 {
  const rest = configuration.sideLayouts.filter((item) => item.side !== layout.side);
  const empty = layout.gable === null && layout.dividersMm.length === 0;
  return { ...configuration, sideLayouts: empty ? rest : [...rest, layout].sort((a, b) => a.side.localeCompare(b.side)) };
}

/**
 * Sets or removes the Giebeldreieck of a side. Rule 3: without it, the elements below and the side division go
 * too (the caller tells the customer, see `equipmentRuleNotices`).
 */
export function setGable(configuration: ConfigurationV1, side: Side, variant: GableVariant | null): ConfigurationV1 {
  const layout = sideLayoutOf(configuration, side);
  if (variant !== null) return withSideLayout(configuration, { ...layout, gable: variant });
  return {
    ...withSideLayout(configuration, { side, gable: null, dividersMm: [] }),
    fieldEquipment: configuration.fieldEquipment.filter((entry) => sideOfField(entry.fieldId) !== side),
  };
}

/**
 * New dividers for a side; part i of the result takes the equipment of old part `sourceOf(i)`. A divided side
 * needs the Giebeldreieck (rule 2: aluminium unless one is chosen). What no longer fits is dropped by the
 * reconcile step with a notice.
 */
function withDividers(configuration: ConfigurationV1, side: Side, dividersMm: number[], sourceOf: (index: number) => number): ConfigurationV1 | null {
  if (!dividersValid(sideClearMm(configuration), dividersMm)) return null;
  const layout = sideLayoutOf(configuration, side);
  const oldEntries = sideFieldIds(configuration, side).map((id) => configuration.fieldEquipment.find((entry) => entry.fieldId === id));
  const gable = layout.gable ?? (dividersMm.length ? DEFAULT_GABLE : null);
  const next = withSideLayout(configuration, { ...layout, gable, dividersMm });
  const moved = sideFieldIds(next, side).flatMap((id, index) => {
    const source = oldEntries[Math.min(sourceOf(index), oldEntries.length - 1)];
    return source ? [{ ...source, fieldId: id, elements: source.elements.map((element) => ({ ...element })) }] : [];
  });
  return { ...next, fieldEquipment: [...configuration.fieldEquipment.filter((entry) => sideOfField(entry.fieldId) !== side), ...moved] };
}

/**
 * "Feld unterteilen" (rule 2, owner 3 Oct 2026: like adding a post): one more standing 50×100 in the middle of the
 * widest part, up to 3 parts. Both halves keep the split part's equipment. Null when no part can take it.
 */
export function addSideDivider(configuration: ConfigurationV1, side: Side): ConfigurationV1 | null {
  const layout = sideLayoutOf(configuration, side);
  if (layout.dividersMm.length >= MAX_SIDE_PARTS - 1) return null;
  const parts = sideParts(sideClearMm(configuration), layout.dividersMm);
  const widest = parts.reduce((best, part, index) => part.widthMm > parts[best].widthMm ? index : best, 0);
  const centre = Math.round(parts[widest].startMm + parts[widest].widthMm / 2);
  const dividersMm = [...layout.dividersMm, centre].sort((a, b) => a - b);
  return withDividers(configuration, side, dividersMm, (index) => index <= widest ? index : index - 1);
}

/** "Feld gleich unterteilen": the current number of parts, equally wide again. */
export function equalizeSide(configuration: ConfigurationV1, side: Side): ConfigurationV1 | null {
  const count = sideLayoutOf(configuration, side).dividersMm.length + 1;
  if (count === 1) return null;
  return withDividers(configuration, side, equalDividers(sideClearMm(configuration), count), (index) => index);
}

/**
 * Sets 1–3 equal parts at once; 1 removes the division ("Teilung entfernen"), the first part's equipment stays.
 * Null when the side is too shallow for that many parts.
 */
export function divideSide(configuration: ConfigurationV1, side: Side, count: number): ConfigurationV1 | null {
  if (!Number.isInteger(count) || count < 1 || count > MAX_SIDE_PARTS) return null;
  return withDividers(configuration, side, count === 1 ? [] : equalDividers(sideClearMm(configuration), count), (index) => index);
}

/** Moves one side divider (drag or cm input), clamped so every part keeps 15 cm. */
export function setDivider(configuration: ConfigurationV1, side: Side, index: number, centreMm: number): ConfigurationV1 | null {
  const range = dividerRange(configuration, side, index);
  if (!range || !Number.isFinite(centreMm) || range.maxMm < range.minMm) return null;
  const layout = sideLayoutOf(configuration, side);
  const dividersMm = layout.dividersMm.map((value, at) => at === index ? Math.max(range.minMm, Math.min(range.maxMm, Math.round(centreMm))) : value);
  return withSideLayout(configuration, { ...layout, dividersMm });
}

export function findField(configuration: ConfigurationV1, fieldId: string): FieldDescriptor | undefined {
  return listFields(configuration).find((field) => field.id === fieldId);
}

export function equipmentFor(configuration: ConfigurationV1, fieldId: string): FieldEquipment {
  return configuration.fieldEquipment.find((entry) => entry.fieldId === fieldId)
    ?? { fieldId, elements: [], lowerHeightMm: null };
}

/** Whether `kind` may be placed on `field`, and why not. */
export type PlaceRefusal = 'side_only' | 'already_present' | 'field_full' | 'too_low' | 'too_narrow' | 'too_wide' | 'too_high';
/** Short German reason for menus and checklists. */
export const placeRefusalDe: Record<PlaceRefusal, string> = {
  side_only: 'nur seitlich', already_present: 'bereits gewählt', field_full: 'Feld voll (2 Elemente)',
  too_low: 'Feld zu niedrig', too_narrow: 'Feld zu schmal', too_wide: 'Feld zu breit (max. 596 cm)',
  too_high: 'Feld zu hoch – erst unten ein anderes Element wählen',
};

export function canPlace(configuration: ConfigurationV1, field: FieldDescriptor, kind: EquipmentKind):
  { ok: true } | { ok: false; reason: PlaceRefusal } {
  const entry = equipmentFor(configuration, field.id);
  if (kind === 'giebeldreieck') {
    return field.kind !== 'side' ? { ok: false, reason: 'side_only' }
      : sideLayoutOf(configuration, field.side!).gable ? { ok: false, reason: 'already_present' } : { ok: true };
  }
  if (entry.elements.some((element) => element.type === kind)) return { ok: false, reason: 'already_present' };
  if (entry.elements.length >= MAX_ELEMENTS_PER_FIELD) return { ok: false, reason: 'field_full' };
  // A second element needs room for itself plus the minimum of the element already there.
  const elements = [...entry.elements, newElement(kind, field)];
  if (entry.elements.length === 1 && !splitRange(field, elements)) {
    const tooLow = field.heightMm - BEAM_MM < minPartMm(elements[0]) + minPartMm(elements[1]);
    return { ok: false, reason: tooLow ? 'too_low' : 'too_high' };
  }
  // Alone, an element fills the whole height: rule 11 maxima (the customer splits the field first).
  if (entry.elements.length === 0 && field.heightMm > maxPartMm(elements[0])) return { ok: false, reason: 'too_high' };
  if (kind === 'seitenwand_licht' && field.widthMm < LICHT_MIN_FIELD_WIDTH_MM) return { ok: false, reason: 'too_narrow' };
  if (kind === 'glasschiebewand') {
    // Full height alone; in a split field the Glasschiebewand part needs its own 100 cm (checked by splitRange).
    const check = gswCheck(field, entry.elements.length === 1 ? GSW_MIN_HEIGHT_MM : field.heightMm);
    if (!check.ok) return check;
  }
  return { ok: true };
}

/** Width/height check of a Glasschiebewand of `heightMm` in this field (docs/Masse.md). */
export function gswCheck(field: Pick<FieldDescriptor, 'widthMm'>, heightMm: number): GswCheck {
  return checkGlassSliding(field.widthMm, heightMm);
}

/** Smallest height an element may get in a split field (Glasschiebewand 100 cm, others 30 cm). */
function minPartMm(element: FieldElement | undefined): number {
  return element?.type === 'glasschiebewand' ? GSW_MIN_HEIGHT_MM : MIN_SPLIT_PART_MM;
}

/** Highest an element may be (rule 11); unlimited where no maximum is known. */
export function maxPartMm(element: FieldElement | undefined): number {
  return (element && ELEMENT_MAX_HEIGHT_MM[element.type]) ?? Number.POSITIVE_INFINITY;
}

export function hasKind(configuration: ConfigurationV1, fieldId: string, kind: EquipmentKind): boolean {
  if (kind === 'giebeldreieck') {
    const side = sideOfField(fieldId);
    return side !== null && sideLayoutOf(configuration, side).gable !== null;
  }
  return equipmentFor(configuration, fieldId).elements.some((element) => element.type === kind);
}

export function newElement(type: FieldElementType, field?: Pick<FieldDescriptor, 'kind' | 'side'>): FieldElement {
  if (type === 'glasschiebewand') return { type, glassTone: 'klar', openingDirection: field ? defaultOpening(field) : 'links' };
  return type === 'seitenwand_licht' ? { type, filling: 'glas_klar' } : { type };
}

/**
 * Lower-part limits of a split field (`elements` bottom to top); null when the field is too low to split.
 * The 5 cm 50×100 separator sits on the lower part (rule 5); a Glasschiebewand keeps at least 100 cm measured from
 * the separator's top (rule 7: 200 cm = 95 cm Aluminiumwand + 5 cm 50×100 + 100 cm Glasschiebewand).
 */
export function splitRange(field: Pick<FieldDescriptor, 'heightMm'>, elements: readonly FieldElement[] = []): { minMm: number; maxMm: number } | null {
  // Rule 11 maxima limit both parts too: the upper part may not grow past its maximum either.
  const minMm = Math.max(minPartMm(elements[0]), field.heightMm - BEAM_MM - maxPartMm(elements[1]));
  const maxMm = Math.min(field.heightMm - BEAM_MM - minPartMm(elements[1]), maxPartMm(elements[0]));
  return maxMm >= minMm ? { minMm, maxMm } : null;
}

export function defaultLowerHeight(field: Pick<FieldDescriptor, 'heightMm'>, elements: readonly FieldElement[] = []): number | null {
  const range = splitRange(field, elements);
  if (!range) return null;
  return DEFAULT_LOWER_HEIGHT_MM >= range.minMm && DEFAULT_LOWER_HEIGHT_MM <= range.maxMm
    ? DEFAULT_LOWER_HEIGHT_MM : Math.max(range.minMm, Math.min(range.maxMm, Math.round((field.heightMm - BEAM_MM) / 20) * 10));
}

function withEntry(configuration: ConfigurationV1, entry: FieldEquipment): ConfigurationV1 {
  const rest = configuration.fieldEquipment.filter((item) => item.fieldId !== entry.fieldId);
  const empty = entry.elements.length === 0;
  const normalised: FieldEquipment = { ...entry, lowerHeightMm: entry.elements.length === 2 ? entry.lowerHeightMm : null };
  return { ...configuration, fieldEquipment: empty ? rest : [...rest, normalised] };
}

/**
 * Adds an element on top (or the gable); returns null when the rules do not allow it. Rule 1: an element on a
 * side brings the aluminium Giebeldreieck along when the side has none.
 */
export function addToField(configuration: ConfigurationV1, fieldId: string, kind: EquipmentKind): ConfigurationV1 | null {
  const field = findField(configuration, fieldId);
  if (!field || !canPlace(configuration, field, kind).ok) return null;
  if (kind === 'giebeldreieck') return setGable(configuration, field.side!, DEFAULT_GABLE);
  const entry = equipmentFor(configuration, fieldId);
  const elements = [...entry.elements, newElement(kind, field)];
  const next = withEntry(configuration, { ...entry, elements, lowerHeightMm: elements.length === 2 ? defaultLowerHeight(field, elements) : null });
  return field.kind === 'side' && !sideLayoutOf(next, field.side!).gable ? setGable(next, field.side!, DEFAULT_GABLE) : next;
}

export function removeFromField(configuration: ConfigurationV1, fieldId: string, kind: EquipmentKind): ConfigurationV1 {
  if (kind === 'giebeldreieck') {
    const side = sideOfField(fieldId);
    return side ? setGable(configuration, side, null) : configuration;
  }
  const entry = equipmentFor(configuration, fieldId);
  return withEntry(configuration, { ...entry, elements: entry.elements.filter((element) => element.type !== kind) });
}

/**
 * "Horizontal teilen" (rule 7): the field's only element moves up and an Aluminiumwand comes below, with the
 * 50×100 between them. Null when the field holds no single element other than an Aluminiumwand, or is too low.
 */
export function splitHorizontally(configuration: ConfigurationV1, fieldId: string): ConfigurationV1 | null {
  const field = findField(configuration, fieldId);
  const entry = equipmentFor(configuration, fieldId);
  if (!field || entry.elements.length !== 1 || entry.elements[0].type === 'aluminiumwand') return null;
  const elements = [newElement('aluminiumwand', field), entry.elements[0]];
  const lowerHeightMm = defaultLowerHeight(field, elements);
  if (lowerHeightMm === null) return null;
  return withEntry(configuration, { ...entry, elements, lowerHeightMm });
}

export function updateElement(configuration: ConfigurationV1, fieldId: string, type: FieldElementType, patch: Partial<Omit<FieldElement, 'type'>>): ConfigurationV1 {
  const entry = equipmentFor(configuration, fieldId);
  return withEntry(configuration, { ...entry, elements: entry.elements.map((element) => element.type === type ? { ...element, ...patch } : element) });
}

/** Sets the lower-part height, clamped to the provisional limits. */
export function setLowerHeight(configuration: ConfigurationV1, fieldId: string, heightMm: number): ConfigurationV1 | null {
  const field = findField(configuration, fieldId);
  const entry = equipmentFor(configuration, fieldId);
  const range = field ? splitRange(field, entry.elements) : null;
  if (!range || entry.elements.length !== 2 || !Number.isFinite(heightMm)) return null;
  return withEntry(configuration, { ...entry, lowerHeightMm: Math.max(range.minMm, Math.min(range.maxMm, Math.round(heightMm))) });
}

/** Swaps upper and lower element; the lower height stays where it is, clamped to the new minimums. */
export function swapElements(configuration: ConfigurationV1, fieldId: string): ConfigurationV1 {
  const entry = equipmentFor(configuration, fieldId);
  const field = findField(configuration, fieldId);
  if (entry.elements.length !== 2 || !field) return configuration;
  const elements = [entry.elements[1], entry.elements[0]];
  const range = splitRange(field, elements);
  if (!range) return configuration;
  const lower = Math.max(range.minMm, Math.min(range.maxMm, entry.lowerHeightMm ?? range.minMm));
  return withEntry(configuration, { ...entry, elements, lowerHeightMm: lower });
}

/** Height of each element (bottom to top) in its field; with two, the 5 cm 50×100 lies between them. */
export function elementHeightsMm(field: Pick<FieldDescriptor, 'heightMm'>, entry: FieldEquipment): number[] {
  if (entry.elements.length === 2) {
    const lower = entry.lowerHeightMm ?? (field.heightMm - BEAM_MM) / 2;
    return [lower, field.heightMm - lower - BEAM_MM];
  }
  return entry.elements.map(() => field.heightMm);
}

/**
 * "Ausstattung first": the chosen fields get the element (where the rules allow it), every other field loses
 * it. Returns the new configuration and the fields that could not take it.
 */
export function applyKindToFields(configuration: ConfigurationV1, kind: EquipmentKind, fieldIds: readonly string[]):
  { configuration: ConfigurationV1; rejected: string[] } {
  let next = configuration;
  const rejected: string[] = [];
  if (kind === 'giebeldreieck') {
    for (const field of listFields(configuration)) if (fieldIds.includes(field.id) && field.kind !== 'side') rejected.push(field.id);
    for (const side of ['left', 'right'] as const) {
      const wanted = fieldIds.some((id) => sideOfField(id) === side);
      const present = sideLayoutOf(next, side).gable !== null;
      if (wanted !== present) next = setGable(next, side, wanted ? DEFAULT_GABLE : null);
    }
    return { configuration: next, rejected };
  }
  for (const field of listFields(configuration)) {
    const wanted = fieldIds.includes(field.id);
    const present = hasKind(next, field.id, kind);
    if (wanted && !present) {
      const added = addToField(next, field.id, kind);
      if (added) next = added; else rejected.push(field.id);
    } else if (!wanted && present) next = removeFromField(next, field.id, kind);
  }
  return { configuration: next, rejected };
}

export type FieldEquipmentIssue = 'field_equipment_unknown_field' | 'field_equipment_duplicate'
  | 'field_equipment_split_out_of_range' | 'field_equipment_duplicate_element' | 'field_equipment_gsw_size'
  | 'field_equipment_gable_missing' | 'field_equipment_side_division' | 'field_equipment_too_high';

export function validateFieldEquipment(configuration: ConfigurationV1): FieldEquipmentIssue[] {
  const issues = new Set<FieldEquipmentIssue>();
  const listed = listFields(configuration);
  const fields = new Map(listed.map((field) => [field.id, field]));
  // While the post layout is invalid no front field can be listed; the post issue is reported on its own.
  const frontListable = listed.some((field) => field.kind === 'front');
  const seen = new Set<string>();
  for (const entry of configuration.fieldEquipment) {
    if (seen.has(entry.fieldId)) issues.add('field_equipment_duplicate');
    seen.add(entry.fieldId);
    const field = fields.get(entry.fieldId);
    if (!field) { if (frontListable || !entry.fieldId.startsWith('front:')) issues.add('field_equipment_unknown_field'); continue; }
    if (new Set(entry.elements.map((element) => element.type)).size !== entry.elements.length) issues.add('field_equipment_duplicate_element');
    if (entry.elements.length === 2) {
      const range = splitRange(field, entry.elements);
      if (!range || entry.lowerHeightMm === null || entry.lowerHeightMm < range.minMm || entry.lowerHeightMm > range.maxMm) {
        issues.add('field_equipment_split_out_of_range');
      }
    }
    const heights = elementHeightsMm(field, entry);
    entry.elements.forEach((element, index) => {
      if (element.type === 'glasschiebewand' && !gswCheck(field, heights[index]).ok) issues.add('field_equipment_gsw_size');
      if (heights[index] > maxPartMm(element)) issues.add('field_equipment_too_high');
    });
  }
  if (listed.length) {
    for (const side of ['left', 'right'] as const) {
      const layout = sideLayoutOf(configuration, side);
      if (configuration.sideLayouts.filter((item) => item.side === side).length > 1) issues.add('field_equipment_duplicate');
      if (layout.dividersMm.length && !dividersValid(sideClearMm(configuration), layout.dividersMm)) issues.add('field_equipment_side_division');
      // Rules 1 and 2: equipment below or a division needs the Giebeldreieck.
      const equipped = configuration.fieldEquipment.some((entry) => sideOfField(entry.fieldId) === side && entry.elements.length > 0);
      if (!layout.gable && (equipped || layout.dividersMm.length)) issues.add('field_equipment_gable_missing');
    }
  }
  return [...issues];
}

/**
 * After posts or measurements change: equipment on fields that no longer exist is dropped (a new post splits
 * a field into two new ones) and split heights are clamped into the new field height. `dropped` lists the
 * labels of removed fields for the notice.
 */
export function reconcileFieldEquipment(previous: ConfigurationV1, rawCandidate: ConfigurationV1):
  { configuration: ConfigurationV1; dropped: string[]; clamped: boolean } {
  let candidate = rawCandidate;
  let sidesClamped = false;
  // A depth change can leave side parts under 15 cm: the side is divided equally again (or not at all).
  if (candidate.dimensionsMm.depth !== null) {
    for (const layout of candidate.sideLayouts) {
      const clear = sideClearMm(candidate);
      if (!layout.dividersMm.length || dividersValid(clear, layout.dividersMm)) continue;
      const equal = equalDividers(clear, layout.dividersMm.length + 1);
      candidate = withSideLayout(candidate, { ...layout, dividersMm: dividersValid(clear, equal) ? equal : [] });
      sidesClamped = true;
    }
  }
  // Rules 1 and 2 hold for every state that reaches the store (the domain actions already keep them).
  for (const side of ['left', 'right'] as const) {
    const layout = sideLayoutOf(candidate, side);
    const equipped = candidate.fieldEquipment.some((entry) => sideOfField(entry.fieldId) === side && entry.elements.length > 0);
    if (!layout.gable && (equipped || layout.dividersMm.length)) candidate = setGable(candidate, side, DEFAULT_GABLE);
  }
  if (!candidate.fieldEquipment.length) return { configuration: candidate, dropped: [], clamped: sidesClamped };
  const listed = listFields(candidate);
  const fields = new Map(listed.map((field) => [field.id, field]));
  // With incomplete measurements nothing can be checked; keep the data until the draft is complete again.
  if (!fields.size) return { configuration: candidate, dropped: [], clamped: sidesClamped };
  // An invalid post layout (e.g. custom posts after a width change) lists no front fields: keep their
  // equipment until the posts are valid again instead of dropping it.
  const frontListable = listed.some((field) => field.kind === 'front');
  const oldLabels = new Map(listFields(previous).map((field) => [field.id, field.label]));
  const dropped: string[] = [];
  let clamped = sidesClamped;
  const kept: FieldEquipment[] = [];
  for (const entry of candidate.fieldEquipment) {
    const field = fields.get(entry.fieldId);
    if (!field) {
      if (!frontListable && entry.fieldId.startsWith('front:')) { kept.push(entry); continue; }
      dropped.push(oldLabels.get(entry.fieldId) ?? entry.fieldId);
      continue;
    }
    let next = entry;
    // Elements that no longer fit the new width or height are removed with a notice: a Glasschiebewand outside
    // 120–596 cm or 100–240 cm, a single element above its rule 11 maximum, a translucent wall under 20 cm.
    const split = entry.elements.length === 2;
    const fits = (element: FieldElement) => (element.type !== 'glasschiebewand' || gswCheck(field, split ? GSW_MIN_HEIGHT_MM : field.heightMm).ok)
      && (split || field.heightMm <= maxPartMm(element))
      && (element.type !== 'seitenwand_licht' || field.widthMm >= LICHT_MIN_FIELD_WIDTH_MM);
    const fitting = entry.elements.filter(fits);
    if (fitting.length !== entry.elements.length) {
      for (const element of entry.elements.filter((item) => !fits(item))) dropped.push(`${field.label}: ${elementNameDe[element.type]}`);
      next = { ...entry, elements: fitting, lowerHeightMm: null };
    }
    if (next.elements.length === 2) {
      const range = splitRange(field, next.elements);
      if (!range) { next = { ...next, elements: next.elements.slice(0, 1), lowerHeightMm: null }; clamped = true; }
      else if (next.lowerHeightMm === null || next.lowerHeightMm < range.minMm || next.lowerHeightMm > range.maxMm) {
        next = { ...next, lowerHeightMm: Math.max(range.minMm, Math.min(range.maxMm, next.lowerHeightMm ?? defaultLowerHeight(field, next.elements) ?? range.minMm)) };
        clamped = true;
      }
    }
    if (next.elements.length) kept.push(next);
  }
  if (!dropped.length && !clamped) return { configuration: candidate, dropped, clamped };
  return { configuration: { ...candidate, fieldEquipment: kept }, dropped, clamped };
}

/** One German line per equipped field for the overview and the PDF, garden-left first. */
export function fieldEquipmentSummaryDe(configuration: ConfigurationV1): { label: string; value: string }[] {
  const rows = listFields(configuration).flatMap((field) => {
    const entry = configuration.fieldEquipment.find((item) => item.fieldId === field.id);
    if (!entry) return [];
    const parts = entry.elements.map((element, index) => {
      const position = entry.elements.length === 2
        ? index === 0 ? `unten ${cm(entry.lowerHeightMm ?? 0)} cm` : `oben ${cm(field.heightMm - (entry.lowerHeightMm ?? 0) - BEAM_MM)} cm`
        : 'ganze Höhe';
      const options = element.type === 'glasschiebewand'
        ? `, Glas ${glassToneDe[element.glassTone ?? 'klar']}, Öffnung ${openingDirectionDe[openingOf(element, field)].toLowerCase()}`
        : element.type === 'seitenwand_licht' ? `, ${gableVariantDe[element.filling ?? 'glas_klar']}, ${lichtWindows(field.widthMm)?.count ?? 1} Fenster` : '';
      return `${elementNameDe[element.type]} (${position}${options})`;
    });
    if (entry.elements.length === 2) parts.push('dazwischen 50×100');
    return parts.length ? [{ label: field.label, value: parts.join('; ') }] : [];
  });
  // One line per side for the Giebeldreieck and the division.
  const sides = (['left', 'right'] as const).flatMap((side) => {
    const layout = sideLayoutOf(configuration, side);
    if (!layout.gable && !layout.dividersMm.length) return [];
    const parts = [layout.gable ? `Giebeldreieck ${gableVariantDe[layout.gable]} mit 50×100` : 'ohne Giebeldreieck'];
    if (layout.dividersMm.length) parts.push(`${layout.dividersMm.length + 1} Teile mit 50×100 geteilt`);
    return [{ label: side === 'left' ? 'Seite links' : 'Seite rechts', value: parts.join('; ') }];
  });
  return [...rows, ...sides];
}

/**
 * Notices for the rule-driven changes between two states (rules 1–3), for the customer messages.
 */
export function equipmentRuleNotices(previous: ConfigurationV1, next: ConfigurationV1): { title: string; message: string }[] {
  const notices: { title: string; message: string }[] = [];
  for (const side of ['left', 'right'] as const) {
    const before = sideLayoutOf(previous, side);
    const after = sideLayoutOf(next, side);
    const name = side === 'left' ? 'Seite links' : 'Seite rechts';
    const count = (configuration: ConfigurationV1) => configuration.fieldEquipment
      .filter((entry) => sideOfField(entry.fieldId) === side).reduce((sum, entry) => sum + entry.elements.length, 0);
    if (!before.gable && after.gable && (count(next) > count(previous) || after.dividersMm.length > before.dividersMm.length)) {
      notices.push({ title: 'Giebeldreieck ergänzt', message: `${name}: Sobald die Seite unten ausgestattet oder geteilt ist, muss das Dreieck darüber geschlossen sein. Es wurde ein Giebeldreieck ${gableVariantDe[after.gable]} mit 50×100 darunter ergänzt; die Ausführung ist im Feld wählbar.` });
    }
    if (before.gable && !after.gable && (count(previous) > 0 || before.dividersMm.length)) {
      notices.push({ title: 'Elemente entfernt', message: `${name}: Ohne Giebeldreieck sind darunter keine Elemente möglich. Die Elemente dieser Seite${before.dividersMm.length ? ' und ihre Teilung' : ''} wurden deshalb entfernt.` });
    }
  }
  return notices;
}

function cm(mm: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(mm / 10);
}
