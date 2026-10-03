import { describe, expect, it } from 'vitest';
import { createDefaultConfiguration, parseConfiguration } from './configuration';
import { evaluateConfiguration } from './evaluateConfiguration';
import {
  addToField, applyKindToFields, canPlace, fieldEquipmentSummaryDe, findField, listFields, reconcileFieldEquipment,
  removeFromField, setLowerHeight, swapElements, updateElement,
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
    // Side clear width: depth minus the post depth (13,5 cm).
    expect(fields[2].widthMm).toBe(2865);
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
    expect(configuration.fieldEquipment).toEqual([{ fieldId: 'side:left', elements: [], lowerHeightMm: null, gable: true }]);
    expect(removeFromField(configuration, 'side:left', 'giebeldreieck').fieldEquipment).toEqual([]);
  });

  it('clamps the split height: 10 cm for most parts, 100 cm for a Glasschiebewand', () => {
    const fieldId = 'side:right';
    let configuration = addToField(addToField(base(), fieldId, 'aluminiumwand')!, fieldId, 'glasschiebewand')!;
    configuration = setLowerHeight(configuration, fieldId, 50)!;
    expect(configuration.fieldEquipment[0].lowerHeightMm).toBe(100);
    configuration = setLowerHeight(configuration, fieldId, 9999)!;
    // The Glasschiebewand on top keeps its 100 cm: 230 − 100 = 130 cm for the lower part at most.
    expect(configuration.fieldEquipment[0].lowerHeightMm).toBe(1300);
    configuration = swapElements(configuration, fieldId);
    expect(configuration.fieldEquipment[0].elements[0].type).toBe('glasschiebewand');
    // Now at the bottom, the Glasschiebewand needs at least 100 cm.
    expect(configuration.fieldEquipment[0].lowerHeightMm).toBe(1300);
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
    const old = { ...base(), fieldEquipment: [{ fieldId, elements: [{ type: 'glasschiebewand', glassTone: 'satiniert', openingDirection: 'mittig' }], lowerHeightMm: null, gable: false }] };
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
    const configuration = { ...base(), fieldEquipment: [{ fieldId: 'front:x:y', elements: [{ type: 'aluminiumwand' as const }], lowerHeightMm: null, gable: false }] };
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
    expect(configuration.fieldEquipment[0]).toMatchObject({ gable: true, elements: [{ type: 'aluminiumwand' }, { type: 'seitenwand_licht' }] });
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
