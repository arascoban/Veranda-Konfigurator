import { describe, expect, it } from 'vitest';
import { createDefaultConfiguration, parseConfiguration } from './configuration';
import { evaluateConfiguration } from './evaluateConfiguration';
import {
  addSideDivider, addToField, applyKindToFields, BEAM_MM, equalizeSide, canPlace, divideSide, elementHeightsMm, equipmentRuleNotices, fieldEquipmentSummaryDe,
  findField, lichtWindows, listFields, reconcileFieldEquipment, removeFromField, setDivider, setGable, setLowerHeight, sideLayoutOf,
  splitHorizontally, splitRange, swapElements, updateElement,
} from './fieldEquipment';

const base = () => createDefaultConfiguration();

describe('field equipment', () => {
  it('lists front fields garden-left first, then both sides', () => {
    const configuration = base();
    const fields = listFields(configuration);
    // 500 cm Prime: three posts → two front fields.
    expect(fields.map((field) => field.label)).toEqual(['Vorne · Feld 1', 'Vorne · Feld 2', 'Seite links', 'Seite rechts']);
    const posts = configuration.postCenters!;
    // Garden field 1 lies at the garden-left end, i.e. between the last two posts of the inside order.
    expect(fields[0].id).toBe(`front:${posts[1].id}:${posts[2].id}`);
    expect(fields[0].insideIndex).toBe(1);
    expect(fields[0].heightMm).toBe(2300);
    // Side clear width: wall to the measured back face of the Prime post (11 cm behind the depth line).
    expect(fields[2].widthMm).toBe(2890);
  });

  it('adds up to two different elements and splits the field with a default lower height', () => {
    const fieldId = listFields(base())[0].id;
    let configuration = addToField(base(), fieldId, 'aluminiumwand')!;
    expect(configuration.fieldEquipment[0].lowerHeightMm).toBeNull();
    configuration = addToField(configuration, fieldId, 'seitenwand_licht')!;
    expect(configuration.fieldEquipment[0].elements.map((element) => element.type)).toEqual(['aluminiumwand', 'seitenwand_licht']);
    expect(configuration.fieldEquipment[0].lowerHeightMm).toBe(1000);
    expect(addToField(configuration, fieldId, 'glasschiebewand')).toBeNull();
    expect(canPlace(configuration, findField(configuration, fieldId)!, 'aluminiumwand')).toEqual({ ok: false, reason: 'already_present' });
    expect(evaluateConfiguration(configuration).issues.filter((issue) => issue.field === 'fieldEquipment')).toEqual([]);
    expect(parseConfiguration(configuration).ok).toBe(true);
  });

  it('keeps the Giebeldreieck to the sides', () => {
    const fields = listFields(base());
    expect(addToField(base(), fields[0].id, 'giebeldreieck')).toBeNull();
    const configuration = addToField(base(), 'side:left', 'giebeldreieck')!;
    expect(configuration.sideLayouts).toEqual([{ side: 'left', gable: 'aluminium', dividersMm: [] }]);
    expect(configuration.fieldEquipment).toEqual([]);
    expect(removeFromField(configuration, 'side:left', 'giebeldreieck').sideLayouts).toEqual([]);
  });

  it('clamps the split height: 30 cm for most parts, 100 cm for a Glasschiebewand above the 50×100', () => {
    const fieldId = 'side:right';
    let configuration = addToField(addToField(base(), fieldId, 'aluminiumwand')!, fieldId, 'glasschiebewand')!;
    configuration = setLowerHeight(configuration, fieldId, 50)!;
    expect(configuration.fieldEquipment[0].lowerHeightMm).toBe(300);
    configuration = setLowerHeight(configuration, fieldId, 9999)!;
    // Side height 230 − 20,5 = 209,5 cm; the 50×100 (5 cm) and 100 cm Glasschiebewand leave 104,5 cm below.
    expect(configuration.fieldEquipment[0].lowerHeightMm).toBe(1045);
    configuration = swapElements(configuration, fieldId);
    expect(configuration.fieldEquipment[0].elements[0].type).toBe('glasschiebewand');
    // Now at the bottom, the Glasschiebewand needs at least 100 cm.
    expect(configuration.fieldEquipment[0].lowerHeightMm).toBe(1045);
    expect(setLowerHeight(configuration, fieldId, 200)!.fieldEquipment[0].lowerHeightMm).toBe(1000);
  });

  it('stores Glasschiebewand options and lists them in the summary', () => {
    const fieldId = listFields(base())[0].id;
    let configuration = addToField(base(), fieldId, 'glasschiebewand')!;
    // Front fields open to the left by default; the right side to the right.
    expect(configuration.fieldEquipment[0].elements[0]).toMatchObject({ glassTone: 'klar', openingDirection: 'links' });
    expect(addToField(base(), 'side:right', 'glasschiebewand')!.fieldEquipment[0].elements[0].openingDirection).toBe('rechts');
    expect(addToField(base(), 'side:left', 'glasschiebewand')!.fieldEquipment[0].elements[0].openingDirection).toBe('links');
    configuration = updateElement(configuration, fieldId, 'glasschiebewand', { glassTone: 'getoent', openingDirection: 'rechts' });
    expect(fieldEquipmentSummaryDe(configuration)).toEqual([
      { label: 'Vorne · Feld 1', value: 'Glasschiebewand (ganze Höhe, Glas Getönt, Öffnung rechts)' },
    ]);
  });

  it('opens drafts with the former Satiniert / Mittig options as Klar / the field default', () => {
    const fieldId = listFields(base())[0].id;
    const old = { ...base(), fieldEquipment: [{ fieldId, elements: [{ type: 'glasschiebewand', glassTone: 'satiniert', openingDirection: 'mittig' }], lowerHeightMm: null }] };
    const parsed = parseConfiguration(old);
    expect(parsed.ok && parsed.configuration.fieldEquipment[0].elements[0]).toEqual({ type: 'glasschiebewand', glassTone: 'klar' });
  });

  it('applies an element from the Ausstattung section to the checked fields only', () => {
    const fields = listFields(base());
    const first = applyKindToFields(base(), 'glasschiebewand', [fields[0].id, fields[1].id, 'side:right']);
    expect(first.rejected).toEqual([]);
    expect(first.configuration.fieldEquipment.map((entry) => entry.fieldId).sort()).toEqual([fields[0].id, fields[1].id, 'side:right'].sort());
    const second = applyKindToFields(first.configuration, 'glasschiebewand', [fields[1].id]);
    expect(second.configuration.fieldEquipment.map((entry) => entry.fieldId)).toEqual([fields[1].id]);
    // Giebeldreieck on a front field is rejected, the side takes it.
    const gable = applyKindToFields(base(), 'giebeldreieck', [fields[0].id, 'side:left']);
    expect(gable.rejected).toEqual([fields[0].id]);
  });

  it('drops equipment of fields that disappear after a post change and reports them', () => {
    const fieldId = listFields(base())[0].id;
    const previous = addToField(base(), fieldId, 'aluminiumwand')!;
    const posts = previous.postCenters!;
    // A new post between the garden-left pair splits that field into two new ones.
    const candidate = { ...previous, postCenters: [posts[0], posts[1], { id: 'post-4', xMm: 3720 }, posts[2]] };
    const result = reconcileFieldEquipment(previous, candidate);
    expect(result.dropped).toEqual(['Vorne · Feld 1']);
    expect(result.configuration.fieldEquipment).toEqual([]);
  });

  it('flags equipment on unknown fields as invalid', () => {
    const configuration = { ...base(), fieldEquipment: [{ fieldId: 'front:x:y', elements: [{ type: 'aluminiumwand' as const }], lowerHeightMm: null }] };
    expect(evaluateConfiguration(configuration).issues).toContainEqual({ kind: 'invalid', field: 'fieldEquipment', code: 'field_equipment_unknown_field' });
  });

  it('opens drafts saved before V2 without equipment', () => {
    const { fieldEquipment: _, ...old } = base();
    const parsed = parseConfiguration(old);
    expect(parsed.ok && parsed.configuration.fieldEquipment).toEqual([]);
  });
});

describe('field equipment with an invalid post layout', () => {
  it('keeps front equipment while no front field can be listed', () => {
    const fieldId = listFields(base())[0].id;
    const previous = addToField(base(), fieldId, 'aluminiumwand')!;
    // Custom posts that no longer fit after a width change: the layout is invalid, front fields cannot be listed.
    const candidate = { ...previous, dimensionsMm: { ...previous.dimensionsMm, width: 4000 } };
    const result = reconcileFieldEquipment(previous, candidate);
    expect(result.dropped).toEqual([]);
    expect(result.configuration.fieldEquipment).toHaveLength(1);
    expect(evaluateConfiguration(result.configuration).issues.filter((issue) => issue.field === 'fieldEquipment')).toEqual([]);
  });
});

describe('Giebeldreieck rule (confirmed 2 Oct 2026)', () => {
  it('lets a side field combine the Giebeldreieck with two further elements', () => {
    let configuration = addToField(base(), 'side:left', 'giebeldreieck')!;
    configuration = addToField(configuration, 'side:left', 'aluminiumwand')!;
    configuration = addToField(configuration, 'side:left', 'seitenwand_licht')!;
    expect(configuration.fieldEquipment[0]).toMatchObject({ elements: [{ type: 'aluminiumwand' }, { type: 'seitenwand_licht' }] });
    expect(sideLayoutOf(configuration, 'left').gable).toBe('aluminium');
    expect(addToField(configuration, 'side:left', 'senkrechtmarkise')).toBeNull();
    expect(evaluateConfiguration(configuration).issues.filter((issue) => issue.field === 'fieldEquipment')).toEqual([]);
  });
});

describe('Glasschiebewand in fields', () => {
  it('needs 120–596 cm clear width and 100 cm height, and is removed when the field shrinks', () => {
    const configuration = base();
    const field = listFields(configuration)[0];
    expect(canPlace(configuration, field, 'glasschiebewand')).toEqual({ ok: true });
    // Front height 90 cm: too low for a Glasschiebewand.
    const low = { ...configuration, dimensionsMm: { ...configuration.dimensionsMm, frontHeight: 900 } };
    expect(canPlace(low, listFields(low)[0], 'glasschiebewand')).toEqual({ ok: false, reason: 'too_low' });
    // Narrow side: 120 cm depth − 13,5 cm post = 106,5 cm clear.
    const narrow = { ...configuration, dimensionsMm: { ...configuration.dimensionsMm, depth: 1200 } };
    expect(canPlace(narrow, findField(narrow, 'side:left')!, 'glasschiebewand')).toEqual({ ok: false, reason: 'too_narrow' });
    const withGsw = addToField(configuration, 'side:left', 'glasschiebewand')!;
    const shrunk = reconcileFieldEquipment(withGsw, { ...withGsw, dimensionsMm: { ...withGsw.dimensionsMm, depth: 1200 } });
    expect(shrunk.dropped).toEqual(['Seite links: Glasschiebewand']);
    expect(shrunk.configuration.fieldEquipment).toEqual([]);
  });

  it('refuses a second element when the Glasschiebewand would get less than 100 cm', () => {
    const configuration = { ...base(), dimensionsMm: { ...base().dimensionsMm, frontHeight: 1050 } };
    const fieldId = listFields(configuration)[0].id;
    const withAlu = addToField(configuration, fieldId, 'aluminiumwand')!;
    expect(canPlace(withAlu, findField(withAlu, fieldId)!, 'glasschiebewand')).toEqual({ ok: false, reason: 'too_low' });
  });
});

describe('Ausstattung rules 1–7 (docs/Ausstatungen_Kurallar.md, 3 Oct 2026)', () => {
  it('rule 1: an element on a side brings the aluminium Giebeldreieck and says so', () => {
    const next = addToField(base(), 'side:right', 'aluminiumwand')!;
    expect(sideLayoutOf(next, 'right')).toEqual({ side: 'right', gable: 'aluminium', dividersMm: [] });
    expect(equipmentRuleNotices(base(), next).map((notice) => notice.title)).toEqual(['Giebeldreieck ergänzt']);
    // A chosen variant is kept.
    const glass = addToField(setGable(base(), 'right', 'glas_milch'), 'side:right', 'aluminiumwand')!;
    expect(sideLayoutOf(glass, 'right').gable).toBe('glas_milch');
    expect(equipmentRuleNotices(base(), setGable(base(), 'right', 'glas_milch'))).toEqual([]);
  });

  it('rule 3: removing the Giebeldreieck removes the elements below and the division', () => {
    let configuration = divideSide(addToField(base(), 'side:left', 'aluminiumwand')!, 'left', 2)!;
    expect(configuration.fieldEquipment.map((entry) => entry.fieldId)).toEqual(['side:left:1', 'side:left:2']);
    const removed = removeFromField(configuration, 'side:left:2', 'giebeldreieck');
    expect(removed.fieldEquipment).toEqual([]);
    expect(removed.sideLayouts).toEqual([]);
    expect(equipmentRuleNotices(configuration, removed).map((notice) => notice.title)).toEqual(['Elemente entfernt']);
    configuration = applyKindToFields(configuration, 'giebeldreieck', []).configuration;
    expect(configuration.fieldEquipment).toEqual([]);
  });

  it('rule 2: divides a side into up to 3 equal parts with standing 50×100 profiles, each part its own field', () => {
    const configuration = divideSide(base(), 'right', 3)!;
    // 289 cm clear − 2 × 5 cm = 279 cm → three parts of 93 cm.
    const parts = listFields(configuration).filter((field) => field.side === 'right');
    expect(parts.map((field) => field.id)).toEqual(['side:right:1', 'side:right:2', 'side:right:3']);
    expect(parts.map((field) => Math.round(field.widthMm))).toEqual([930, 930, 930]);
    expect(parts.map((field) => field.label)).toEqual(['Seite rechts · Teil 1', 'Seite rechts · Teil 2', 'Seite rechts · Teil 3']);
    // A divided side needs the Giebeldreieck (aluminium by default).
    expect(sideLayoutOf(configuration, 'right').gable).toBe('aluminium');
    expect(divideSide(base(), 'right', 4)).toBeNull();
    // Dragging keeps 15 cm per part.
    const moved = setDivider(configuration, 'right', 0, 0)!;
    expect(listFields(moved).find((field) => field.id === 'side:right:1')!.widthMm).toBe(150);
    expect(evaluateConfiguration(moved).issues.filter((issue) => issue.field === 'fieldEquipment')).toEqual([]);
    // Back to one part: the first part's equipment stays.
    const single = divideSide(addToField(configuration, 'side:right:1', 'aluminiumwand')!, 'right', 1)!;
    expect(single.fieldEquipment.map((entry) => entry.fieldId)).toEqual(['side:right']);
    expect(parseConfiguration(single).ok).toBe(true);
  });

  it('rule 4: side fields end under the 50×100 below the Giebeldreieck, at least 15 cm under the front height', () => {
    const field = findField(base(), 'side:left')!;
    expect(2300 - field.heightMm - BEAM_MM).toBeGreaterThanOrEqual(150);
    expect(field.heightMm).toBe(2095);
  });

  it('rule 2 like posts: each "Feld unterteilen" adds one 50×100 in the widest part, "gleich" equalises', () => {
    let configuration = addToField(base(), 'side:left', 'aluminiumwand')!;
    configuration = addSideDivider(configuration, 'left')!;
    // 289 cm clear: the divider sits in the middle.
    expect(sideLayoutOf(configuration, 'left').dividersMm).toEqual([1445]);
    expect(configuration.fieldEquipment.map((entry) => entry.fieldId).sort()).toEqual(['side:left:1', 'side:left:2']);
    configuration = setDivider(configuration, 'left', 0, 600)!;
    configuration = addSideDivider(configuration, 'left')!;
    // The wider part (by the post) is split; three parts, every one with the Aluminiumwand.
    expect(sideLayoutOf(configuration, 'left').dividersMm).toEqual([600, 1758]);
    expect(configuration.fieldEquipment).toHaveLength(3);
    expect(addSideDivider(configuration, 'left')).toBeNull();
    expect(sideLayoutOf(equalizeSide(configuration, 'left')!, 'left').dividersMm).toEqual([955, 1935]);
    expect(divideSide(configuration, 'left', 1)!.sideLayouts).toEqual([{ side: 'left', gable: 'aluminium', dividersMm: [] }]);
  });

  it('rules 5 and 7: a 50×100 lies between two elements; a Glasschiebewand keeps 100 cm above it', () => {
    const configuration = { ...base(), dimensionsMm: { ...base().dimensionsMm, frontHeight: 2000 } };
    const field = listFields(configuration)[0];
    let next = addToField(configuration, field.id, 'glasschiebewand')!;
    next = splitHorizontally(next, field.id)!;
    const entry = next.fieldEquipment[0];
    // "Horizontal teilen": Aluminiumwand comes below, the Glasschiebewand moves up.
    expect(entry.elements.map((element) => element.type)).toEqual(['aluminiumwand', 'glasschiebewand']);
    // 200 cm = 95 cm Aluminiumwand + 5 cm 50×100 + 100 cm Glasschiebewand at most.
    expect(splitRange(field, entry.elements)).toEqual({ minMm: 300, maxMm: 950 });
    expect(elementHeightsMm(field, entry)).toEqual([950, 1000]);
    expect(splitHorizontally(next, field.id)).toBeNull();
    expect(splitHorizontally(addToField(configuration, field.id, 'aluminiumwand')!, field.id)).toBeNull();
  });

  it('re-divides a side equally when the depth leaves a part under 15 cm', () => {
    const divided = setDivider(divideSide(base(), 'left', 2)!, 'left', 0, 2700)!;
    const shallower = { ...divided, dimensionsMm: { ...divided.dimensionsMm, depth: 2500 } };
    const result = reconcileFieldEquipment(divided, shallower);
    expect(result.clamped).toBe(true);
    expect(sideLayoutOf(result.configuration, 'left').dividersMm).toEqual([1195]);
  });

  it('opens drafts with the former gable flag as a clear glass Giebeldreieck', () => {
    const old = { ...base(), fieldEquipment: [{ fieldId: 'side:left', elements: [], lowerHeightMm: null, gable: true }] };
    const parsed = parseConfiguration(old);
    expect(parsed.ok && parsed.configuration.sideLayouts).toEqual([{ side: 'left', gable: 'glas_klar', dividersMm: [] }]);
    expect(parsed.ok && parsed.configuration.fieldEquipment).toEqual([]);
  });
});

describe('rule 11 maxima and Seitenwand lichtdurchlässig (4 Oct 2026)', () => {
  it('keeps every element under its maximum height', () => {
    const tall = { ...base(), dimensionsMm: { ...base().dimensionsMm, frontHeight: 2800, rearHeight: 3220 } };
    const field = listFields(tall)[0];
    // 280 cm: a Glasschiebewand alone would be too high (max. 240 cm) …
    expect(canPlace(tall, field, 'glasschiebewand')).toEqual({ ok: false, reason: 'too_high' });
    // … but above an Aluminiumwand it fits: 280 − 5 − 240 = 35 cm at least below.
    const split = addToField(addToField(tall, field.id, 'aluminiumwand')!, field.id, 'glasschiebewand')!;
    expect(splitRange(field, split.fieldEquipment[0].elements)).toEqual({ minMm: 350, maxMm: 1750 });
    expect(evaluateConfiguration(split).issues.filter((issue) => issue.field === 'fieldEquipment')).toEqual([]);
    // A front height change that leaves a single Glasschiebewand too high removes it with a notice.
    const withGsw = addToField(base(), field.id, 'glasschiebewand')!;
    const raised = reconcileFieldEquipment(withGsw, { ...withGsw, dimensionsMm: { ...withGsw.dimensionsMm, frontHeight: 2500 } });
    expect(raised.dropped).toEqual(['Vorne · Feld 1: Glasschiebewand']);
  });

  it('splits a translucent wall into equal WD-55 windows with panes of 11–110 cm', () => {
    expect(lichtWindows(2890)).toMatchObject({ count: 3 });
    expect(lichtWindows(2890)!.paneMm).toBeCloseTo(873.3, 1);
    expect(lichtWindows(1190)).toMatchObject({ count: 1, paneMm: 1100 });
    expect(lichtWindows(1191)!.count).toBe(2);
    expect(lichtWindows(199)).toBeNull();
    const configuration = addToField(base(), 'side:left', 'seitenwand_licht')!;
    expect(configuration.fieldEquipment[0].elements[0]).toEqual({ type: 'seitenwand_licht', filling: 'glas_klar' });
    expect(fieldEquipmentSummaryDe(configuration)[0].value).toContain('Glas Klar, 3 Fenster');
  });
});
