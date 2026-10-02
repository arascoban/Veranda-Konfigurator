import { Box3, Group, Mesh, Vector3, type Object3D } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';
import { parseConfiguration, type ConfigurationV1 } from '../../domain/configuration';
import { evaluateConfiguration } from '../../domain/evaluateConfiguration';
import { assemblyLayoutFromConfiguration } from '../assembly/placements';
import { createAssemblyGroup, loadLayoutParts, type PartLibrary } from '../assembly/assemblyScene';
import { createEquipmentGroup } from '../assembly/equipmentScene';
import { disposeSchematicGroup } from '../viewer/schematicGeometry';

/**
 * AR model of the real part assembly (SW-07, 2 Oct 2026): the same assembly builder as the viewer and the PDF,
 * plus the schematic Ausstattung, without ground, pick planes or editing aids. Metres, Y up; the model stands
 * on y = 0, centred on its footprint and turned so the garden side faces the viewer (+Z in AR).
 * Mounting offsets are still provisional (SOL-K01-001): this is a planning preview, not a production model.
 */
export type AssemblyModelExport =
  | { status: 'invalid_configuration' }
  | { status: 'stale' }
  | { status: 'ready'; revision: number; configuration: ConfigurationV1; blob: Blob; format: 'glb' | 'usdz'; kind: 'assembly_preview' };

export async function buildArGroup(configuration: ConfigurationV1, library: PartLibrary): Promise<Group | null> {
  const layout = assemblyLayoutFromConfiguration(configuration);
  if (!layout) return null;
  const parts = await loadLayoutParts(layout, library);
  const assembly = createAssemblyGroup(layout, parts, { includeGroundGuide: false, includePostControls: false });
  assembly.add(createEquipmentGroup(configuration));
  // Editing aids and anything flagged as not exportable never reach the AR file.
  const hidden: Object3D[] = [];
  assembly.traverse((object) => {
    if (object.userData.exportable === false || object.userData.selectionHalo || object.userData.roofFieldHalo || object.userData.moveArrows) hidden.push(object);
  });
  for (const object of hidden) object.removeFromParent();
  assembly.updateMatrixWorld(true);
  const box = new Box3();
  assembly.traverse((object) => { if (object instanceof Mesh) box.expandByObject(object); });
  const centre = box.getCenter(new Vector3());
  // Footprint centre to the origin, floor at y = 0; then a half turn so the garden face (−Z) looks at the viewer.
  assembly.position.set(-centre.x, -box.min.y, -centre.z);
  const root = new Group();
  root.name = `Terrassenüberdachung ${configuration.productId} — Planungsvorschau`;
  root.rotation.y = Math.PI;
  root.add(assembly);
  root.userData = { previewOnly: true, productId: configuration.productId, dimensionsMm: configuration.dimensionsMm, catalogVersion: configuration.catalogVersion };
  root.updateMatrixWorld(true);
  return root;
}

/** The caller passes the store revision and a getter; an edit during the export discards the result. */
export async function exportAssemblyModel(
  rawConfiguration: unknown,
  format: 'glb' | 'usdz',
  library: PartLibrary,
  revision = 0,
  getCurrentRevision: () => number = () => revision,
): Promise<AssemblyModelExport> {
  const parsed = parseConfiguration(rawConfiguration);
  if (!parsed.ok) return { status: 'invalid_configuration' };
  const configuration = structuredClone(parsed.configuration);
  if (evaluateConfiguration(configuration).status !== 'requires_engineering_review') return { status: 'invalid_configuration' };
  const root = await buildArGroup(configuration, library);
  if (!root) return { status: 'invalid_configuration' };
  try {
    if (revision !== getCurrentRevision()) return { status: 'stale' };
    let blob: Blob;
    if (format === 'glb') {
      const binary = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: true });
      if (!(binary instanceof ArrayBuffer)) throw new TypeError('GLB exporter did not return binary data');
      blob = new Blob([binary], { type: 'model/gltf-binary' });
    } else {
      const bytes = await new USDZExporter().parseAsync(root, { quickLookCompatible: true });
      blob = new Blob([bytes], { type: 'model/vnd.usdz+zip' });
    }
    if (revision !== getCurrentRevision()) return { status: 'stale' };
    return { status: 'ready', revision, configuration, blob, format, kind: 'assembly_preview' };
  } finally {
    disposeSchematicGroup(root);
  }
}
