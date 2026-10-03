import { describe, expect, it } from 'vitest';
import { createDefaultConfiguration } from '../../domain/configuration';
import { addSideDivider } from '../../domain/fieldEquipment';
import { buildDimensionLines } from './dimensions';

describe('Bemaßungen of divided sides', () => {
  it('shows every side part instead of the side depth', () => {
    const configuration = addSideDivider(createDefaultConfiguration(), 'right')!;
    const lines = buildDimensionLines(configuration);
    expect(lines.map((line) => line.id)).toContain('depthLeft');
    expect(lines.map((line) => line.id)).not.toContain('depthRight');
    expect(lines.filter((line) => line.id.startsWith('side-')).map((line) => line.label)).toEqual(['Teil 1\n140,8 cm', 'Teil 2\n140,7 cm']);
  });
});
