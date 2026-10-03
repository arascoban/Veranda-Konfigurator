import { z } from 'zod';
import { postSections, postWidthMm } from '../catalog/catalog';
import type { ConfigurationV1 } from './configuration';
import { validatePostCenters } from './geometry/posts';
import { checkGlassSliding, GSW_MIN_HEIGHT_MM, type GswCheck } from './glassSlidingDoor';

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

export const glassTones = ['klar', 'getoent', 'satiniert'] as const;
export const openingDirections = ['links', 'rechts', 'mittig'] as const;

/** Provisional (2 Oct 2026, until the owner supplies limits): each part of a split field is at least 10 cm high. */
export const MIN_SPLIT_PART_MM = 100;
/** Default lower part when a second element is added (design example: 100 cm Aluminium, rest glass). */
export const DEFAULT_LOWER_HEIGHT_MM = 1000;
export const MAX_ELEMENTS_PER_FIELD = 2;

export const fieldElementSchema = z.object({
  type: z.enum(fieldElementTypes),
  /** Glasschiebewand only; the profile colour always follows the frame colour. */
  glassTone: z.enum(glassTones).optional(),
  openingDirection: z.enum(openingDirections).optional(),
}).strict();
export type FieldElement = z.infer<typeof fieldElementSchema>;

export const fieldEquipmentSchema = z.object({
  /** `front:<postId>:<postId>` (inside order, stable post ids) or `side:left` / `side:right` (garden view). */
  fieldId: z.string().regex(/^(front:[^:]+:[^:]+|side:(left|right))$/),
  /** Bottom to top; one element covers the whole height. */
  elements: z.array(fieldElementSchema).max(MAX_ELEMENTS_PER_FIELD),
  /** Height of the lower element when there are two; null otherwise. */
  lowerHeightMm: z.number().int().safe().nullable(),
  /** Giebeldreieck above a side field. */
  gable: z.boolean(),
}).strict();
export type FieldEquipment = z.infer<typeof fieldEquipmentSchema>;

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
  /** Height available for elements: ground to the gutter underside. */
  heightMm: number;
};

export const elementNameDe: Record<EquipmentKind, string> = {
  glasschiebewand: 'Glasschiebewand',
  aluminiumwand: 'Aluminiumwand',
  seitenwand_licht: 'Seitenwand lichtdurchlässig',
  senkrechtmarkise: 'Senkrechtmarkise',
  giebeldreieck: 'Giebeldreieck',
};
export const glassToneDe: Record<typeof glassTones[number], string> = { klar: 'Klar', getoent: 'Getönt', satiniert: 'Satiniert' };
export const openingDirectionDe: Record<typeof openingDirections[number], string> = { links: 'Links', rechts: 'Rechts', mittig: 'Mittig' };

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
    const postWidth = postWidthMm(configuration.productId);
    for (let gardenNumber = 1; gardenNumber <= count; gardenNumber += 1) {
      const insideIndex = count - gardenNumber;
      const left = posts[insideIndex];
      const right = posts[insideIndex + 1];
      const clear = right.xMm - left.xMm - postWidth;
      fields.push({
        id: frontFieldId(left.id, right.id), kind: 'front', insideIndex,
        label: `Vorne · Feld ${gardenNumber}`,
        detail: `Pfosten ${gardenNumber}–${gardenNumber + 1} · lichte Weite ${cm(clear)} cm`,
        widthMm: clear, heightMm: frontHeight,
      });
    }
  }
  // Side clear width: from the wall to the back face of the end post (owner rule, docs/Ausstatungen_Kurallar.md).
  const sideClear = depth - postSections[configuration.productId].towardsGardenMm;
  for (const side of ['left', 'right'] as const) {
    fields.push({
      id: `side:${side}`, kind: 'side', side,
      label: side === 'left' ? 'Seite links' : 'Seite rechts',
      detail: `lichte Tiefe ${cm(sideClear)} cm`,
      widthMm: sideClear, heightMm: frontHeight,
    });
  }
  return fields;
}

export function findField(configuration: ConfigurationV1, fieldId: string): FieldDescriptor | undefined {
  return listFields(configuration).find((field) => field.id === fieldId);
}

export function equipmentFor(configuration: ConfigurationV1, fieldId: string): FieldEquipment {
  return configuration.fieldEquipment.find((entry) => entry.fieldId === fieldId)
    ?? { fieldId, elements: [], lowerHeightMm: null, gable: false };
}

/** Whether `kind` may be placed on `field`, and why not. */
export type PlaceRefusal = 'side_only' | 'already_present' | 'field_full' | 'too_low' | 'too_narrow' | 'too_wide';
/** Short German reason for menus and checklists. */
export const placeRefusalDe: Record<PlaceRefusal, string> = {
  side_only: 'nur seitlich', already_present: 'bereits gewählt', field_full: 'Feld voll (2 Elemente)',
  too_low: 'Feld zu niedrig', too_narrow: 'Feld zu schmal (min. 120 cm)', too_wide: 'Feld zu breit (max. 596 cm)',
};

export function canPlace(configuration: ConfigurationV1, field: FieldDescriptor, kind: EquipmentKind):
  { ok: true } | { ok: false; reason: PlaceRefusal } {
  const entry = equipmentFor(configuration, field.id);
  if (kind === 'giebeldreieck') return field.kind !== 'side' ? { ok: false, reason: 'side_only' } : entry.gable ? { ok: false, reason: 'already_present' } : { ok: true };
  if (entry.elements.some((element) => element.type === kind)) return { ok: false, reason: 'already_present' };
  if (entry.elements.length >= MAX_ELEMENTS_PER_FIELD) return { ok: false, reason: 'field_full' };
  // A second element needs room for itself plus the minimum of the element already there.
  const elements = [...entry.elements, newElement(kind)];
  if (entry.elements.length === 1 && !splitRange(field, elements)) return { ok: false, reason: 'too_low' };
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

/** Smallest height an element may get in a split field (Glasschiebewand 100 cm, others provisional 10 cm). */
function minPartMm(element: FieldElement | undefined): number {
  return element?.type === 'glasschiebewand' ? GSW_MIN_HEIGHT_MM : MIN_SPLIT_PART_MM;
}

export function hasKind(configuration: ConfigurationV1, fieldId: string, kind: EquipmentKind): boolean {
  const entry = equipmentFor(configuration, fieldId);
  return kind === 'giebeldreieck' ? entry.gable : entry.elements.some((element) => element.type === kind);
}

export function newElement(type: FieldElementType): FieldElement {
  return type === 'glasschiebewand' ? { type, glassTone: 'klar', openingDirection: 'mittig' } : { type };
}

/**
 * Lower-part limits of a split field (`elements` bottom to top); null when the field is too low to split.
 * A Glasschiebewand part keeps at least 100 cm. The 50×100 separator profile between the parts follows in the
 * next step (owner, 3 Oct 2026) and is not deducted yet.
 */
export function splitRange(field: Pick<FieldDescriptor, 'heightMm'>, elements: readonly FieldElement[] = []): { minMm: number; maxMm: number } | null {
  const minMm = minPartMm(elements[0]);
  const maxMm = field.heightMm - minPartMm(elements[1]);
  return maxMm >= minMm ? { minMm, maxMm } : null;
}

export function defaultLowerHeight(field: Pick<FieldDescriptor, 'heightMm'>, elements: readonly FieldElement[] = []): number | null {
  const range = splitRange(field, elements);
  if (!range) return null;
  return DEFAULT_LOWER_HEIGHT_MM >= range.minMm && DEFAULT_LOWER_HEIGHT_MM <= range.maxMm
    ? DEFAULT_LOWER_HEIGHT_MM : Math.round(field.heightMm / 20) * 10;
}

function withEntry(configuration: ConfigurationV1, entry: FieldEquipment): ConfigurationV1 {
  const rest = configuration.fieldEquipment.filter((item) => item.fieldId !== entry.fieldId);
  const empty = entry.elements.length === 0 && !entry.gable;
  const normalised: FieldEquipment = { ...entry, lowerHeightMm: entry.elements.length === 2 ? entry.lowerHeightMm : null };
  return { ...configuration, fieldEquipment: empty ? rest : [...rest, normalised] };
}

/** Adds an element on top (or the gable); returns null when the rules do not allow it. */
export function addToField(configuration: ConfigurationV1, fieldId: string, kind: EquipmentKind): ConfigurationV1 | null {
  const field = findField(configuration, fieldId);
  if (!field || !canPlace(configuration, field, kind).ok) return null;
  const entry = equipmentFor(configuration, fieldId);
  if (kind === 'giebeldreieck') return withEntry(configuration, { ...entry, gable: true });
  const elements = [...entry.elements, newElement(kind)];
  return withEntry(configuration, { ...entry, elements, lowerHeightMm: elements.length === 2 ? defaultLowerHeight(field, elements) : null });
}

export function removeFromField(configuration: ConfigurationV1, fieldId: string, kind: EquipmentKind): ConfigurationV1 {
  const entry = equipmentFor(configuration, fieldId);
  if (kind === 'giebeldreieck') return withEntry(configuration, { ...entry, gable: false });
  return withEntry(configuration, { ...entry, elements: entry.elements.filter((element) => element.type !== kind) });
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

/** Height of each element (bottom to top) in its field. */
export function elementHeightsMm(field: Pick<FieldDescriptor, 'heightMm'>, entry: FieldEquipment): number[] {
  if (entry.elements.length === 2) {
    const lower = entry.lowerHeightMm ?? field.heightMm / 2;
    return [lower, field.heightMm - lower];
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

export type FieldEquipmentIssue = 'field_equipment_unknown_field' | 'field_equipment_duplicate' | 'field_equipment_gable_on_front'
  | 'field_equipment_split_out_of_range' | 'field_equipment_duplicate_element' | 'field_equipment_gsw_size';

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
    if (entry.gable && field.kind !== 'side') issues.add('field_equipment_gable_on_front');
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
    });
  }
  return [...issues];
}

/**
 * After posts or measurements change: equipment on fields that no longer exist is dropped (a new post splits
 * a field into two new ones) and split heights are clamped into the new field height. `dropped` lists the
 * labels of removed fields for the notice.
 */
export function reconcileFieldEquipment(previous: ConfigurationV1, candidate: ConfigurationV1):
  { configuration: ConfigurationV1; dropped: string[]; clamped: boolean } {
  if (!candidate.fieldEquipment.length) return { configuration: candidate, dropped: [], clamped: false };
  const listed = listFields(candidate);
  const fields = new Map(listed.map((field) => [field.id, field]));
  // With incomplete measurements nothing can be checked; keep the data until the draft is complete again.
  if (!fields.size) return { configuration: candidate, dropped: [], clamped: false };
  // An invalid post layout (e.g. custom posts after a width change) lists no front fields: keep their
  // equipment until the posts are valid again instead of dropping it.
  const frontListable = listed.some((field) => field.kind === 'front');
  const oldLabels = new Map(listFields(previous).map((field) => [field.id, field.label]));
  const dropped: string[] = [];
  let clamped = false;
  const kept: FieldEquipment[] = [];
  for (const entry of candidate.fieldEquipment) {
    const field = fields.get(entry.fieldId);
    if (!field) {
      if (!frontListable && entry.fieldId.startsWith('front:')) { kept.push(entry); continue; }
      dropped.push(oldLabels.get(entry.fieldId) ?? entry.fieldId);
      continue;
    }
    let next = entry;
    // A Glasschiebewand that no longer fits the new width (120–596 cm) or height is removed with a notice.
    const fitting = entry.elements.filter((element) => element.type !== 'glasschiebewand'
      || gswCheck(field, entry.elements.length === 2 ? GSW_MIN_HEIGHT_MM : field.heightMm).ok);
    if (fitting.length !== entry.elements.length) {
      dropped.push(`${field.label}: Glasschiebewand`);
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
    if (next.elements.length || next.gable) kept.push(next);
  }
  if (!dropped.length && !clamped) return { configuration: candidate, dropped, clamped };
  return { configuration: { ...candidate, fieldEquipment: kept }, dropped, clamped };
}

/** One German line per equipped field for the overview and the PDF, garden-left first. */
export function fieldEquipmentSummaryDe(configuration: ConfigurationV1): { label: string; value: string }[] {
  return listFields(configuration).flatMap((field) => {
    const entry = configuration.fieldEquipment.find((item) => item.fieldId === field.id);
    if (!entry) return [];
    const parts = entry.elements.map((element, index) => {
      const position = entry.elements.length === 2
        ? index === 0 ? `unten ${cm(entry.lowerHeightMm ?? 0)} cm` : `oben ${cm(field.heightMm - (entry.lowerHeightMm ?? 0))} cm`
        : 'ganze Höhe';
      const options = element.type === 'glasschiebewand'
        ? `, Glas ${glassToneDe[element.glassTone ?? 'klar']}, Öffnung ${openingDirectionDe[element.openingDirection ?? 'mittig'].toLowerCase()}` : '';
      return `${elementNameDe[element.type]} (${position}${options})`;
    });
    if (entry.gable) parts.push(elementNameDe.giebeldreieck);
    return parts.length ? [{ label: field.label, value: parts.join('; ') }] : [];
  });
}

function cm(mm: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(mm / 10);
}
