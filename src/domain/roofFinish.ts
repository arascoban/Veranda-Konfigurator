import { defaultRoofFinish, opalRoofFinish, roofFinishes, type RoofFinishId, type RoofMaterialId } from '../catalog/catalog';
import type { ConfigurationV1 } from './configuration';
import type { RoofBayGeometry } from './geometry/roof';

export function finishesOfFamily(family: RoofMaterialId): RoofFinishId[] {
  return (Object.keys(roofFinishes) as RoofFinishId[]).filter((id) => roofFinishes[id].family === family);
}

/** Tone of every bay from left to right (inside view). Awning side fields default to Milchglas/Opal. */
export function resolveRoofFieldFinishes(configuration: ConfigurationV1, roof: Pick<RoofBayGeometry, 'bayCount' | 'awningSideFields'> | null): RoofFinishId[] {
  if (!roof) return [];
  const family = configuration.roofMaterialId;
  const base = roofFinishes[configuration.roofFinish].family === family ? configuration.roofFinish : defaultRoofFinish[family];
  return Array.from({ length: roof.bayCount }, (_, index) => {
    const override = configuration.roofFieldFinishes[index];
    if (override && roofFinishes[override].family === family) return override;
    if (roof.awningSideFields && (index === 0 || index === roof.bayCount - 1)) return opalRoofFinish[family];
    return base;
  });
}

/** Selecting one of the six finishes for the whole roof also selects its family and clears field overrides. */
export function withRoofFinish(configuration: ConfigurationV1, finish: RoofFinishId): ConfigurationV1 {
  const family = roofFinishes[finish].family;
  const familyChanged = family !== configuration.roofMaterialId;
  return {
    ...configuration,
    roofMaterialId: family,
    roofFinish: finish,
    roofFieldFinishes: [],
    roofBayCount: familyChanged ? null : configuration.roofBayCount,
    awning: family === 'glass' ? configuration.awning : null,
  };
}

/** Tone of one field (inside-left index); same family as the roof. */
export function withRoofFieldFinish(configuration: ConfigurationV1, index: number, finish: RoofFinishId, bayCount: number): ConfigurationV1 {
  if (roofFinishes[finish].family !== configuration.roofMaterialId) return configuration;
  const next: (RoofFinishId | null)[] = Array.from({ length: bayCount }, (_, i) => configuration.roofFieldFinishes[i] ?? null);
  next[index] = finish;
  return { ...configuration, roofFieldFinishes: next };
}

/** Field names as the customer sees them from the garden: Dachfeld 1 is the garden-left field. */
export function roofFieldName(index: number, bayCount: number): string {
  return `Dachfeld ${bayCount - index}`;
}
