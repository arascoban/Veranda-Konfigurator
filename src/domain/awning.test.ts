import { describe, expect, it } from 'vitest';
import { awningAvailability, awningSpans, createAwning, reconcileAwning, validateAwning } from './awning';
import { createDefaultConfiguration } from './configuration';
import { evaluateConfiguration } from './evaluateConfiguration';
import { calculateAwningSideFieldGeometry } from './geometry/roof';
import { ledRafterCount, maxLedPerRafter } from './led';
import { resolveRoofFieldFinishes, withRoofFieldFinish, withRoofFinish } from './roofFinish';

const withWidth = (widthMm: number, depthMm = 3000) => {
  const configuration = createDefaultConfiguration();
  configuration.dimensionsMm.width = widthMm;
  configuration.dimensionsMm.depth = depthMm;
  return configuration;
};

describe('awning rules (confirmed 1 Oct 2026)', () => {
  it('is not offered on polycarbonate roofs', () => {
    const configuration = withRoofFinish(withWidth(5000), 'pc_klar');
    expect(awningAvailability(configuration).reason).toBe('polycarbonate');
    expect(createAwning(configuration, 'aufglas')).toBeNull();
    expect(validateAwning({ ...configuration, awning: { type: 'aufglas', count: 1, widthsMm: null, motorSide: 'left', fabricId: 'stoff-1' } })).toEqual(['awning_requires_glass']);
  });

  it('covers the full width up to 600 cm with one awning; Unterglas runs from the post back to the wall', () => {
    const configuration = withWidth(5000, 3000);
    expect(awningAvailability(configuration)).toMatchObject({ available: true, singleMode: 'full', sideFieldMm: 0 });
    const awning = createAwning(configuration);
    expect(awning).toEqual({ type: 'unterglas', count: 1, widthsMm: null, motorSide: 'left', fabricId: 'stoff-1' });
    expect(awningSpans({ ...configuration, awning })).toEqual([{ xMm: 0, widthMm: 5000, depthMm: 3000 - 135, type: 'unterglas' }]);
    expect(awningSpans({ ...configuration, awning: { ...awning!, type: 'aufglas' } })[0].depthMm).toBeNull();
  });

  it('adds 15 cm Milchglas side fields from 601 cm on; the awning takes the rest', () => {
    const configuration = withWidth(6010);
    expect(awningAvailability(configuration)).toMatchObject({ singleMode: 'side_fields', sideFieldMm: 150 });
    const evaluation = evaluateConfiguration({ ...configuration, awning: createAwning(configuration) });
    expect(evaluation.roof?.awningSideFields).toBe(true);
    expect(evaluation.roof?.capWidthsMm[0]).toBe(95);
    expect(awningSpans({ ...configuration, awning: createAwning(configuration) })[0]).toMatchObject({ xMm: 150, widthMm: 5710 });
  });

  it('adds two Milchglas side fields of 50 cm on a 700 cm roof and fixes the field layout', () => {
    const configuration = withWidth(7000);
    const awning = createAwning(configuration, 'aufglas');
    expect(awning?.count).toBe(1);
    expect(awningAvailability(configuration)).toMatchObject({ singleMode: 'side_fields', sideFieldMm: 500 });
    const evaluation = evaluateConfiguration({ ...configuration, awning });
    expect(evaluation.roof?.awningSideFields).toBe(true);
    expect(evaluation.roof?.capWidthsMm[0]).toBe(445);
    expect(evaluation.roof?.bayCount).toBe(calculateAwningSideFieldGeometry(7000, 'glass')?.bayCount);
    expect(evaluation.issues.some((issue) => issue.field === 'awning')).toBe(false);
    const tones = resolveRoofFieldFinishes({ ...configuration, awning }, evaluation.roof);
    expect(tones[0]).toBe('vsg_opal');
    expect(tones[tones.length - 1]).toBe('vsg_opal');
    expect(tones[1]).toBe('vsg_klar');
    // The customer may still add extra fields only with two awnings.
    expect(evaluateConfiguration({ ...configuration, awning, roofBayCount: 99 }).roof?.bayCount).toBe(evaluation.roof?.bayCount);
  });

  it('requires two awnings once a side field would exceed 86 cm, split equally by default', () => {
    const configuration = withWidth(8000);
    expect(awningAvailability(configuration).singleMode).toBe('unavailable');
    const awning = createAwning(configuration, 'aufglas');
    expect(awning).toEqual({ type: 'aufglas', count: 2, widthsMm: [4000, 4000], motorSide: 'left', fabricId: 'stoff-1' });
    expect(validateAwning({ ...configuration, awning: { ...awning!, count: 1 } })).toEqual(['awning_single_not_possible']);
    expect(validateAwning({ ...configuration, awning: { ...awning!, widthsMm: [7000, 1000] } })).toEqual(['awning_width_out_of_range']);
    expect(validateAwning({ ...configuration, awning: { ...awning!, widthsMm: [3000, 5000] } })).toEqual([]);
  });

  it('reconciles a stored awning after the width or material changes', () => {
    const base = withWidth(5000);
    const awning = createAwning(base, 'aufglas')!;
    expect(reconcileAwning({ ...base, dimensionsMm: { ...base.dimensionsMm, width: 8000 }, awning })).toMatchObject({ count: 2, widthsMm: [4000, 4000] });
    expect(reconcileAwning(withRoofFinish({ ...base, awning }, 'pc_opal'))).toBeNull();
    expect(withRoofFinish({ ...base, awning }, 'pc_opal').awning).toBeNull();
  });
});

describe('LED rule', () => {
  it('allows one LED per metre, rounding at 50 cm, never on corner rafters', () => {
    expect(maxLedPerRafter(3490)).toBe(3);
    expect(maxLedPerRafter(3500)).toBe(4);
    expect(maxLedPerRafter(5000)).toBe(5);
    expect(maxLedPerRafter(null)).toBe(0);
    expect(ledRafterCount(7)).toBe(5);
    expect(ledRafterCount(2)).toBe(0);
    const configuration = { ...withWidth(5000, 3000), ledPerRafter: 4 };
    expect(validateAwning({ ...withWidth(5000, 1100), awning: createAwning(withWidth(5000, 3000)) })).toEqual(['awning_depth_out_of_range']);
    expect(evaluateConfiguration(configuration).issues.some((issue) => issue.code === 'led_per_rafter_above_limit')).toBe(true);
  });
});

describe('roof tones per field', () => {
  it('keeps overrides inside the family and maps the whole roof when the family changes', () => {
    const configuration = withWidth(5000);
    const roof = evaluateConfiguration(configuration).roof!;
    const mixed = withRoofFieldFinish(configuration, 0, 'vsg_opal', roof.bayCount);
    expect(resolveRoofFieldFinishes(mixed, roof)[0]).toBe('vsg_opal');
    expect(withRoofFieldFinish(configuration, 0, 'pc_opal', roof.bayCount)).toBe(configuration);
    const polycarbonate = withRoofFinish(mixed, 'pc_bronze');
    expect(polycarbonate.roofMaterialId).toBe('polycarbonate');
    expect(polycarbonate.roofFieldFinishes).toEqual([]);
    expect(polycarbonate.roofBayCount).toBeNull();
  });

  it('limits extra roof fields to two above the minimum', () => {
    const configuration = withWidth(5000);
    const minimum = evaluateConfiguration(configuration).roof!.bayCount;
    expect(evaluateConfiguration({ ...configuration, roofBayCount: minimum + 2 }).issues.some((issue) => issue.code === 'roof_bays_above_limit')).toBe(false);
    expect(evaluateConfiguration({ ...configuration, roofBayCount: minimum + 3 }).issues.some((issue) => issue.code === 'roof_bays_above_limit')).toBe(true);
  });
});
