import {
  AmbientLight, Box3, Color, DirectionalLight, HemisphereLight, Mesh, Object3D, OrthographicCamera, PerspectiveCamera, Scene, Vector3, WebGLRenderer,
  type Camera,
} from 'three';
import type { ConfigurationV1 } from '../../../domain/configuration';
import { createEquipmentGroup, gswLayoutsFor } from '../../assembly/equipmentScene';
import { loadEquipmentParts } from '../../assembly/glassSlidingScene';
import { createAssemblyGroup, loadLayoutParts, PartLibrary } from '../../assembly/assemblyScene';
import { assemblyLayoutFromConfiguration } from '../../assembly/layoutFromConfiguration';
import { disposeSchematicGroup } from '../../viewer/schematicGeometry';

/** One rendered view for the PDF (ASTRA-GP-08). Titles are German; right/left follow the garden view. */
export type PdfViewId = 'perspective' | 'front' | 'right' | 'left' | 'top';
export type PdfView = { id: PdfViewId; title: string; png: Uint8Array; width: number; height: number };

export const PDF_VIEW_TITLES: Record<PdfViewId, string> = {
  perspective: 'Perspektive von vorne links',
  front: 'Vorderansicht',
  right: 'Rechte Seitenansicht',
  left: 'Linke Seitenansicht',
  top: 'Draufsicht',
};
const VIEW_ORDER: PdfViewId[] = ['perspective', 'front', 'right', 'left', 'top'];

/**
 * Renders the five fixed views of the configuration's real part assembly into PNGs, in a temporary
 * scene that never touches the customer's viewer. Everything created here is released at the end.
 * Scene frame: X left→right as seen from inside, wall at z = 0, garden towards −Z; the customer looks
 * from the garden, so "left" is the +X end.
 */
export async function captureConfigurationViews(
  configuration: ConfigurationV1,
  options: { width?: number; height?: number; library?: PartLibrary; baseUrl?: string } = {},
): Promise<PdfView[]> {
  const width = options.width ?? 1600;
  const height = options.height ?? 1000;
  const layout = assemblyLayoutFromConfiguration(configuration);
  if (!layout) throw new Error('capture_requires_valid_configuration');
  const library = options.library ?? new PartLibrary(options.baseUrl ?? import.meta.env.BASE_URL);
  const parts = await loadLayoutParts(layout, library);

  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  const scene = new Scene();
  scene.background = new Color(0xf4f6f7);
  scene.add(new AmbientLight(0xffffff, 0.55));
  scene.add(new HemisphereLight(0xffffff, 0xb8c0c6, 0.8));
  const key = new DirectionalLight(0xffffff, 1.5);
  key.position.set(layout.widthMm / 2000 + 6, 10, -layout.depthMm / 2000 - 7);
  scene.add(key);
  const fill = new DirectionalLight(0xffffff, 0.6);
  fill.position.set(-6, 5, 4);
  scene.add(fill);
  // Studio lights as in the viewer so colours match the screen.
  for (const [direction, intensity] of [[[0, 0.35, -1], 0.7], [[-1, 0.5, -0.8], 0.5], [[1, 0.5, -0.8], 0.5], [[-0.4, 1, 0.5], 0.6]] as const) {
    const lamp = new DirectionalLight(0xffffff, intensity);
    lamp.position.set(direction[0] * 12, direction[1] * 12, direction[2] * 12);
    scene.add(lamp);
  }
  const group = createAssemblyGroup(layout, parts, { includeGroundGuide: true, includePostControls: false });
  // Editing aids never reach the PDF: outlines are hidden, field planes are invisible by default.
  group.traverse((object) => { if (object.userData.selectionHalo || object.userData.roofFieldHalo) object.visible = false; });
  // Schematic Ausstattung of the same revision (V2); disposed with the group.
  const layouts = gswLayoutsFor(configuration);
  group.add(createEquipmentGroup(configuration, await loadEquipmentParts(configuration, library, layouts).catch(() => null)));
  scene.add(group);
  const bounds = productBounds(group);

  const views: PdfView[] = [];
  try {
    for (const id of VIEW_ORDER) {
      const camera = cameraFor(id, bounds, width / height);
      renderer.render(scene, camera);
      const png = await canvasToPng(canvas);
      views.push({ id, title: PDF_VIEW_TITLES[id], png, width, height });
    }
  } finally {
    scene.remove(group);
    disposeSchematicGroup(group);
    scene.clear();
    renderer.dispose();
    renderer.forceContextLoss();
  }
  if (views.length !== VIEW_ORDER.length) throw new Error('capture_incomplete');
  return views;
}

/** Bounding box of the product parts only (the ground canvas is 200 m wide). */
function productBounds(group: Object3D): Box3 {
  const box = new Box3();
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    if (object instanceof Mesh && !object.userData.ground && object.visible && object.parent?.userData.ground !== true) {
      box.expandByObject(object);
    }
  });
  return box;
}

function cameraFor(id: PdfViewId, bounds: Box3, aspect: number): Camera {
  const centre = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const far = Math.max(size.x, size.y, size.z) * 4 + 10;
  if (id === 'perspective') {
    const camera = new PerspectiveCamera(38, aspect, 0.1, far * 3);
    const radius = size.length() / 2;
    const distance = radius / Math.sin((camera.fov / 2) * Math.PI / 180) * 1.12;
    // From the garden, left of the structure (+X end), slightly above.
    camera.position.copy(centre).add(new Vector3(0.75, 0.42, -0.9).normalize().multiplyScalar(distance));
    camera.lookAt(centre);
    camera.updateMatrixWorld(true);
    return camera;
  }
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, far * 3);
  const direction = { front: new Vector3(0, 0, -1), right: new Vector3(-1, 0, 0), left: new Vector3(1, 0, 0), top: new Vector3(0, 1, 0) }[id];
  camera.up.copy(id === 'top' ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0));
  camera.position.copy(centre).add(direction.clone().multiplyScalar(far));
  camera.lookAt(centre);
  camera.updateMatrixWorld(true);
  // Fit the box corners in camera space with a margin, keeping the page aspect.
  const inverse = camera.matrixWorldInverse;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const corner of boxCorners(bounds)) {
    const local = corner.applyMatrix4(inverse);
    minX = Math.min(minX, local.x); maxX = Math.max(maxX, local.x);
    minY = Math.min(minY, local.y); maxY = Math.max(maxY, local.y);
  }
  const margin = 1.08;
  let halfW = ((maxX - minX) / 2) * margin;
  let halfH = ((maxY - minY) / 2) * margin;
  if (halfW / halfH < aspect) halfW = halfH * aspect; else halfH = halfW / aspect;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  camera.left = cx - halfW; camera.right = cx + halfW; camera.top = cy + halfH; camera.bottom = cy - halfH;
  camera.updateProjectionMatrix();
  return camera;
}

function boxCorners(box: Box3): Vector3[] {
  const { min, max } = box;
  return [
    new Vector3(min.x, min.y, min.z), new Vector3(max.x, min.y, min.z), new Vector3(min.x, max.y, min.z), new Vector3(max.x, max.y, min.z),
    new Vector3(min.x, min.y, max.z), new Vector3(max.x, min.y, max.z), new Vector3(min.x, max.y, max.z), new Vector3(max.x, max.y, max.z),
  ];
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('png_encoding_failed')); return; }
      blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer))).catch(reject);
    }, 'image/png');
  });
}
