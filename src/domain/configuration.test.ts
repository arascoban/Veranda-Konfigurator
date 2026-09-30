import { describe, expect, it } from 'vitest';
import { createEmptyConfiguration, parseConfiguration } from './configuration';
import { evaluateConfiguration } from './evaluateConfiguration';
import { centimetresToMillimetres, millimetresToMetres } from './units';

describe('versioned configuration contract', () => {
  it('starts Prime with missing measurements and no asserted price or manufacturability', () => {
    const config = createEmptyConfiguration();
    expect(config.productId).toBe('prime');
    expect(evaluateConfiguration(config)).toMatchObject({ status: 'incomplete', manufacturable: false });
  });

  it('keeps unsupported saved versions and products out of the current catalogue', () => {
    expect(parseConfiguration({ ...createEmptyConfiguration(), schemaVersion: 2 })).toMatchObject({
      ok: false, reason: 'unsupported_version',
    });
    expect(parseConfiguration({ ...createEmptyConfiguration(), productId: 'unknown' })).toMatchObject({
      ok: false, reason: 'invalid',
    });
    expect(parseConfiguration({ ...createEmptyConfiguration(), openingOptions: ['unconfirmed-wall'] })).toMatchObject({
      ok: false, reason: 'invalid',
    });
  });

  it('keeps confirmed material-specific depth limits distinct', () => {
    const config = createEmptyConfiguration();
    config.dimensionsMm = { width: 5000, depth: 4001, rearHeight: 2400, frontHeight: 2200 };
    config.postCenters = [{ id: 'left', xMm: 0 }, { id: 'center', xMm: 2500 }, { id: 'right', xMm: 5000 }];
    expect(evaluateConfiguration(config).issues.some((issue) => issue.code === 'depth_above_material_limit')).toBe(true);
    config.roofMaterialId = 'polycarbonate';
    expect(evaluateConfiguration(config).issues.some((issue) => issue.code === 'depth_above_material_limit')).toBe(false);
    config.dimensionsMm.depth = 5001;
    expect(evaluateConfiguration(config).issues.some((issue) => issue.code === 'depth_above_material_limit')).toBe(true);
  });

  it('accepts the confirmed maximum depth and flags the next millimetre', () => {
    const config = createEmptyConfiguration();
    config.dimensionsMm = { width: 5000, depth: 4000, rearHeight: 2600, frontHeight: 2200 };
    expect(evaluateConfiguration(config).issues.some((issue) => issue.code === 'depth_above_material_limit')).toBe(false);
    config.dimensionsMm.depth = 4001;
    expect(evaluateConfiguration(config).issues.some((issue) => issue.code === 'depth_above_material_limit')).toBe(true);
    config.roofMaterialId = 'polycarbonate';
    config.dimensionsMm.depth = 5000;
    expect(evaluateConfiguration(config).issues.some((issue) => issue.code === 'depth_above_material_limit')).toBe(false);
    config.dimensionsMm.depth = 5001;
    expect(evaluateConfiguration(config).issues.some((issue) => issue.code === 'depth_above_material_limit')).toBe(true);
  });

  it('flags widths above 1200 cm and invalid non-positive dimensions without approving manufacture', () => {
    const config = createEmptyConfiguration();
    config.dimensionsMm = { width: 12000, depth: 3000, rearHeight: 2500, frontHeight: 2200 };
    expect(evaluateConfiguration(config).issues.some((issue) => issue.code === 'width_above_1200_cm')).toBe(false);
    config.dimensionsMm.width = 12001;
    expect(evaluateConfiguration(config)).toMatchObject({ status: 'invalid', manufacturable: false });
    expect(evaluateConfiguration(config).issues.some((issue) => issue.code === 'width_above_1200_cm')).toBe(true);
    config.dimensionsMm.width = 0;
    config.dimensionsMm.depth = -1;
    const evaluation = evaluateConfiguration(config);
    expect(evaluation.issues.filter((issue) => issue.code === 'positive_integer_mm_required')).toHaveLength(2);
    expect(evaluation.roof).toBeNull();
  });

  it('preserves an existing Premium product when a saved design is parsed', () => {
    const premium = { ...createEmptyConfiguration(), productId: 'premium' as const };
    expect(parseConfiguration(premium)).toMatchObject({ ok: true, configuration: { productId: 'premium' } });
    expect(parseConfiguration({ ...premium, catalogVersion: 'obsolete' })).toMatchObject({
      ok: false, reason: 'unsupported_version',
    });
  });

  it('converts only representable centimetre precision and metres at the viewer boundary', () => {
    expect(centimetresToMillimetres(123.4)).toBe(1234);
    expect(centimetresToMillimetres(123.45)).toBeNull();
    expect(millimetresToMetres(1234)).toBe(1.234);
  });
});
