import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { evaluateConfiguration } from '../../domain/evaluateConfiguration';
import { parseConfiguration, type ConfigurationV1 } from '../../domain/configuration';
import { previewDimensions } from '../viewer/previewGeometry';
import { createSchematicGroup, disposeSchematicGroup } from '../viewer/schematicGeometry';

export type DemoGlbExport =
  | { status: 'invalid_configuration' }
  | { status: 'stale' }
  | {
    status: 'ready';
    revision: number;
    configuration: ConfigurationV1;
    blob: Blob;
    /** This is a schematic model, never a verified product or sales AR asset. */
    kind: 'schematic_demo';
  };

/** The caller passes the store revision and getter; an edit during export discards the old model. */
export async function exportDemoGlb(
  rawConfiguration: unknown,
  revision: number,
  getCurrentRevision: () => number,
): Promise<DemoGlbExport> {
  const parsed = parseConfiguration(rawConfiguration);
  if (!parsed.ok) return { status: 'invalid_configuration' };
  const configuration = structuredClone(parsed.configuration);
  const dimensions = previewDimensions(configuration);
  if (!dimensions || evaluateConfiguration(configuration).status !== 'requires_engineering_review') {
    return { status: 'invalid_configuration' };
  }
  if (revision !== getCurrentRevision()) return { status: 'stale' };

  const group = createSchematicGroup(dimensions, configuration.roofMaterialId);
  group.name = 'Schematische Vorschau — kein Fertigungsmodell';
  group.userData = {
    previewOnly: true,
    schemaVersion: configuration.schemaVersion,
    catalogVersion: configuration.catalogVersion,
    productId: configuration.productId,
    roofMaterialId: configuration.roofMaterialId,
    dimensionsMm: configuration.dimensionsMm,
    roofBayCount: configuration.roofBayCount,
    postCenters: configuration.postCenters,
    openingOptions: configuration.openingOptions,
    revision,
  };

  try {
    const binary = await new GLTFExporter().parseAsync(group, { binary: true, onlyVisible: true });
    if (revision !== getCurrentRevision()) return { status: 'stale' };
    if (!(binary instanceof ArrayBuffer)) throw new TypeError('GLB exporter did not return binary data');
    return {
      status: 'ready', revision, configuration,
      blob: new Blob([binary], { type: 'model/gltf-binary' }), kind: 'schematic_demo',
    };
  } finally {
    disposeSchematicGroup(group);
  }
}
