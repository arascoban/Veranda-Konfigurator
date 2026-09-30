import { describe, expect, it } from 'vitest';
import { createEmptyConfiguration } from '../../domain/configuration';
import { cameraDistanceForPreview, previewDimensions } from './previewGeometry';

describe('schematic preview dimensions', () => {
  it('maps a 500 × 300 cm design to metre scene bounds once', () => {
    const configuration = createEmptyConfiguration();
    configuration.dimensionsMm = { width: 5000, depth: 3000, rearHeight: 2700, frontHeight: 2400 };
    configuration.postCenters = [{ id: 'left', xMm: 500 }, { id: 'right', xMm: 4500 }];
    const dimensions = previewDimensions(configuration)!;
    expect(dimensions).toEqual({
      widthM: 5,
      depthM: 3,
      rearHeightM: 2.7,
      frontHeightM: 2.4,
      postCentersM: [0.5, 4.5],
      postSectionM: { alongGutterM: 0.11, towardsGardenM: 0.12 },
    });
    expect(cameraDistanceForPreview(dimensions, 45, 0.6)).toBeGreaterThan(cameraDistanceForPreview(dimensions, 45, 1.6));
  });

  it('does not create a misleading scene from incomplete or invalid measurements', () => {
    const configuration = createEmptyConfiguration();
    expect(previewDimensions(configuration)).toBeNull();
    configuration.dimensionsMm = { width: 0, depth: 3000, rearHeight: 2700, frontHeight: 2400 };
    expect(previewDimensions(configuration)).toBeNull();
    configuration.dimensionsMm.width = 5000;
    configuration.postCenters = [{ id: 'outside', xMm: 5001 }];
    expect(previewDimensions(configuration)).toBeNull();
  });
});
