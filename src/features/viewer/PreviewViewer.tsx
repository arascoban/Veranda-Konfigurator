import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AmbientLight, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PerspectiveCamera, Plane, Raycaster, Scene, Sprite, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { assemblyLayoutFromConfiguration, type AssemblyLayout } from '../assembly/placements';
import { createAssemblyGroup, loadLayoutParts, PartLibrary, preloadProductParts } from '../assembly/assemblyScene';
import { createDimensionGroup, createTextSprite, disposeAnnotations, setMarkerLimits } from '../assembly/annotations';
import { postSections } from '../../catalog/catalog';
import { buildDimensionLines, fieldName } from '../assembly/dimensions';
import type { ConfigurationV1 } from '../../domain/configuration';
import type { PostCenter } from '../../domain/geometry/posts';
import { millimetresToCentimetres } from '../../domain/units';
import { findSelectedOpening, finishPostDrag, openingAxisSpans, postMoveRange, type OpeningSelection } from './postEditing';
import { cameraDistanceForPreview, previewDimensions, type PreviewDimensions } from './previewGeometry';
import { createSchematicGroup, disposeSchematicGroup } from './schematicGeometry';
import './styles.css';

type ViewerRuntime = {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
  render: () => void;
  group: Group | null;
  library: PartLibrary;
};

export type ProductModelStatus = 'loading' | 'ready' | 'missing' | 'error';

export function PreviewViewer({ configuration, resetViewToken = 0, showDimensions = false, selectedPostId = null, onSelectPost, onPostCentersChange, onSceneStatusChange, onProductModelStatusChange }: {
  configuration: ConfigurationV1;
  resetViewToken?: number;
  /** Bemaßungen layer: main measurements plus the clear width of every field. */
  showDimensions?: boolean;
  /** Selection is shared with the settings panel; posts are edited directly in the model. */
  selectedPostId?: string | null;
  onSelectPost?: (postId: string | null) => void;
  onPostCentersChange?: (posts: PostCenter[]) => void;
  onSceneStatusChange?: (status: 'loading' | 'ready' | 'missing' | 'error') => void;
  /** Real product parts: missing while the schematic stands in, ready once the GLB assembly is shown. */
  onProductModelStatusChange?: (status: ProductModelStatus) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ViewerRuntime | null>(null);
  const lastFitKeyRef = useRef('');
  const [sceneStatus, setSceneStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const setSelectedPostId = (postId: string | null) => onSelectPost?.(postId);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [hoveredOpening, setHoveredOpening] = useState(-1);
  const [selectedOpening, setSelectedOpening] = useState<OpeningSelection | null>(null);
  const dimensions = useMemo(() => previewDimensions(configuration), [configuration]);
  const layout = useMemo(() => assemblyLayoutFromConfiguration(configuration), [configuration]);
  const [modelStatus, setModelStatus] = useState<ProductModelStatus>('missing');
  const visibleSceneStatus = sceneStatus === 'ready' && !dimensions ? 'missing' : sceneStatus;
  useEffect(() => onSceneStatusChange?.(visibleSceneStatus), [onSceneStatusChange, visibleSceneStatus]);
  useEffect(() => onProductModelStatusChange?.(modelStatus), [onProductModelStatusChange, modelStatus]);
  const posts = configuration.postCenters;
  const widthMm = configuration.dimensionsMm.width;
  const selectedIndex = posts?.findIndex((post) => post.id === selectedPostId) ?? -1;
  const selectedRange = posts && widthMm !== null && selectedIndex >= 0
    ? postMoveRange(configuration.productId, widthMm, posts, selectedIndex) : null;
  const openingSpans = useMemo(() => posts && widthMm !== null
    ? openingAxisSpans(configuration.productId, widthMm, posts) : [], [configuration.productId, posts, widthMm]);
  const activeOpening = findSelectedOpening(openingSpans, selectedOpening);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setSceneStatus('error');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    scene.background = new Color(0xf4f7f8);
    scene.add(new AmbientLight(0xffffff, 0.9));
    scene.add(new HemisphereLight(0xffffff, 0xb8c0c6, 1.2));
    const light = new DirectionalLight(0xffffff, 2.2);
    light.position.set(4, 8, -5);
    scene.add(light);
    const fill = new DirectionalLight(0xffffff, 0.8);
    fill.position.set(-6, 4, 3);
    scene.add(fill);
    const camera = new PerspectiveCamera(45, 1, 0.01, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    let render = () => renderer.render(scene, camera);
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('d03perf') === '1') {
      const normalRender = render;
      const cpuSamplesMs: number[] = [];
      const sampleLimit = 120;
      renderer.domElement.dataset.d03RenderCpuWindow = String(sampleLimit);
      render = () => {
        const started = performance.now();
        normalRender();
        cpuSamplesMs.push(performance.now() - started);
        if (cpuSamplesMs.length > sampleLimit) cpuSamplesMs.shift();
        const ordered = [...cpuSamplesMs].sort((left, right) => left - right);
        renderer.domElement.dataset.d03RenderCpuSamples = String(cpuSamplesMs.length);
        renderer.domElement.dataset.d03RenderCpuAvgMs =
          (cpuSamplesMs.reduce((sum, duration) => sum + duration, 0) / cpuSamplesMs.length).toFixed(2);
        renderer.domElement.dataset.d03RenderCpuP95Ms =
          ordered[Math.ceil(ordered.length * 0.95) - 1].toFixed(2);
        renderer.domElement.dataset.d03RenderCpuMaxMs = ordered[ordered.length - 1].toFixed(2);
      };
    }
    const runtime: ViewerRuntime = { scene, camera, renderer, controls, render, group: null, library: new PartLibrary(import.meta.env.BASE_URL) };
    runtimeRef.current = runtime;
    setSceneStatus('ready');
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setSceneStatus('error');
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    controls.addEventListener('change', render);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (runtime.group) fitCamera(runtime, dimensionsFromGroup(runtime.group), width / height);
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    return () => {
      observer.disconnect();
      controls.removeEventListener('change', render);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      if (runtime.group) disposeSchematicGroup(runtime.group);
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      runtimeRef.current = null;
      lastFitKeyRef.current = '';
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const swapGroup = (group: Group | null) => {
      if (runtime.group) {
        runtime.scene.remove(runtime.group);
        disposeSchematicGroup(runtime.group);
        runtime.group = null;
      }
      if (group && dimensions) {
        group.userData.dimensions = dimensions;
        runtime.scene.add(group);
        runtime.group = group;
        markSelectedPost(group, selectedIndexRef.current, -1);
        markSelectedOpening(group, selectedOpeningIndexRef.current, -1, openingSpans.length);
      }
      runtime.render();
    };
    if (!dimensions) {
      swapGroup(null);
      lastFitKeyRef.current = '';
      setModelStatus('missing');
      return;
    }
    // The schematic is shown at once; the product parts replace it as soon as they are loaded.
    swapGroup(createSchematicGroup(dimensions, configuration.roofMaterialId, { includeGroundGuide: true, includePostControls: true }));
    const fitKey = [dimensions.widthM, dimensions.depthM, dimensions.rearHeightM, dimensions.frontHeightM].join(':');
    if (lastFitKeyRef.current !== fitKey) {
      fitCamera(runtime, dimensions, runtime.camera.aspect);
      lastFitKeyRef.current = fitKey;
    }
    if (!layout) {
      setModelStatus('missing');
      return;
    }
    let cancelled = false;
    setModelStatus('loading');
    loadLayoutParts(layout, runtime.library).then((parts) => {
      if (cancelled) return;
      swapGroup(createAssemblyGroup(layout, parts, { includeGroundGuide: true, includePostControls: true }));
      setModelStatus('ready');
      // Warm the other product in the background; this never changes the selected product.
      window.setTimeout(() => preloadProductParts(layout.productId === 'prime' ? 'premium' : 'prime', runtime.library), 1500);
    }).catch(() => {
      // The schematic stays in place; the product model is reported as unavailable, never as ready.
      if (!cancelled) setModelStatus('error');
    });
    return () => { cancelled = true; };
  }, [dimensions, configuration.roofMaterialId, layout]);

  const selectedIndexRef = useRef(-1);
  const selectedOpeningIndexRef = useRef<number | null>(null);
  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
    selectedOpeningIndexRef.current = activeOpening?.index ?? null;
    const runtime = runtimeRef.current;
    if (!runtime?.group) return;
    markSelectedPost(runtime.group, selectedIndex, hoveredIndex);
    markSelectedOpening(runtime.group, activeOpening?.index ?? null, hoveredOpening, openingSpans.length);
    // Remaining travel in each direction, written on the arrows of the selected post.
    if (selectedIndex >= 0 && selectedRange && posts && dimensions) {
      const section = postSections[configuration.productId];
      runtime.group.traverse((object) => {
        if (object.userData.moveArrows && object.userData.postIndex === selectedIndex) {
          setMarkerLimits(object, (selectedRange.maxMm - posts[selectedIndex].xMm) / 10, (posts[selectedIndex].xMm - selectedRange.minMm) / 10,
            -dimensions.depthM + section.towardsGardenMm / 2000, section.alongGutterMm / 2000);
        }
      });
    }
    runtime.render();
  }, [activeOpening?.index, dimensions, selectedIndex, hoveredIndex, hoveredOpening, modelStatus, openingSpans.length, selectedRange, posts, configuration.productId]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const previous = runtime.scene.getObjectByName('Bemaßungen');
    if (previous instanceof Group) { runtime.scene.remove(previous); disposeAnnotations(previous); }
    if (showDimensions && dimensions) runtime.scene.add(createDimensionGroup(buildDimensionLines(configuration)));
    runtime.render();
  }, [showDimensions, configuration, dimensions]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime?.group) return;
    fitCamera(runtime, dimensionsFromGroup(runtime.group), runtime.camera.aspect);
    runtime.render();
  }, [resetViewToken]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !dimensions || !posts || widthMm === null || !onPostCentersChange) return;
    const canvas = runtime.renderer.domElement;
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    // Posts move along the gutter in the plane of their garden-facing faces (z = −depth).
    const dragPlane = new Plane(new Vector3(0, 0, 1), dimensions.depthM);
    let drag: { pointerId: number; index: number; initialMm: number; currentMm: number; started: boolean; startX: number } | null = null;
    let press: { x: number; y: number } | null = null;
    const setRay = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, runtime.camera);
    };
    const restorePost = (index: number, xMm: number) => {
      runtime.group?.traverse((object) => {
        if (object.userData.postIndex === index && object.userData.postMovable) object.position.x = xMm / 1000;
      });
      runtime.render();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !runtime.group) return;
      setRay(event);
      press = { x: event.clientX, y: event.clientY };
      const hits = raycaster.intersectObjects(runtime.group.children, true);
      const hit = hits.find((entry) => Number.isInteger(entry.object.userData.postIndex) && !entry.object.userData.moveArrows);
      if (!hit) {
        const openingHit = hits.find((entry) => Number.isInteger(entry.object.userData.openingIndex));
        if (!openingHit) return;
        const opening = openingSpans.find((span) => span.index === openingHit.object.userData.openingIndex);
        if (!opening) return;
        setSelectedPostId(null);
        setSelectedOpening(opening);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const index = hit.object.userData.postIndex as number;
      const post = posts[index];
      if (!post) return;
      setSelectedPostId(post.id);
      setSelectedOpening(null);
      markSelectedPost(runtime.group, index, -1);
      runtime.render();
      drag = { pointerId: event.pointerId, index, initialMm: post.xMm, currentMm: post.xMm, started: false, startX: event.clientX };
      runtime.controls.enabled = false;
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!runtime.group) return;
      if (!drag) {
        // Hover feedback: a post or a field under the pointer is highlighted.
        setRay(event);
        const hits = raycaster.intersectObjects(runtime.group.children, true);
        const hover = hits.find((entry) => Number.isInteger(entry.object.userData.postIndex) && !entry.object.userData.moveArrows);
        const index = hover ? (hover.object.userData.postIndex as number) : -1;
        const openingHit = index < 0 ? hits.find((entry) => Number.isInteger(entry.object.userData.openingIndex)) : undefined;
        canvas.style.cursor = index >= 0 ? 'ew-resize' : openingHit ? 'pointer' : '';
        setHoveredIndex(index);
        setHoveredOpening(openingHit ? (openingHit.object.userData.openingIndex as number) : -1);
        return;
      }
      if (event.pointerId !== drag.pointerId) return;
      // A click must not nudge the post: dragging starts only after a small pointer movement.
      if (!drag.started) {
        if (Math.abs(event.clientX - drag.startX) < 4) return;
        drag.started = true;
      }
      setRay(event);
      const hit = raycaster.ray.intersectPlane(dragPlane, new Vector3());
      const range = postMoveRange(configuration.productId, widthMm, posts, drag.index);
      if (!hit || !range) return;
      const xMm = Math.max(range.minMm, Math.min(range.maxMm, Math.round(hit.x * 100) * 10));
      if (xMm === drag.currentMm) return;
      drag.currentMm = xMm;
      restorePost(drag.index, xMm);
      event.preventDefault();
    };
    const finishDrag = (event: PointerEvent, cancelled: boolean) => {
      if (!drag) {
        // A plain click on empty space (no orbit movement) clears the selection.
        if (!cancelled && press && Math.hypot(event.clientX - press.x, event.clientY - press.y) < 4 && runtime.group) {
          setRay(event);
          const anyHit = raycaster.intersectObjects(runtime.group.children, true)
            .some((entry) => Number.isInteger(entry.object.userData.postIndex) || Number.isInteger(entry.object.userData.openingIndex));
          if (!anyHit) { setSelectedPostId(null); setSelectedOpening(null); }
        }
        press = null;
        return;
      }
      if (event.pointerId !== drag.pointerId) return;
      press = null;
      const finished = drag;
      drag = null;
      runtime.controls.enabled = true;
      if (cancelled) restorePost(finished.index, finished.initialMm);
      else {
        const next = finishPostDrag(configuration.productId, widthMm, posts, finished.index,
          finished.initialMm, finished.currentMm, false);
        if (next) onPostCentersChange(next);
        else if (finished.currentMm !== finished.initialMm) restorePost(finished.index, finished.initialMm);
      }
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      event.preventDefault();
    };
    canvas.addEventListener('pointerdown', onPointerDown, true);
    canvas.addEventListener('pointermove', onPointerMove, true);
    const onPointerUp = (event: PointerEvent) => finishDrag(event, false);
    const onPointerCancel = (event: PointerEvent) => finishDrag(event, true);
    const onLostPointerCapture = (event: PointerEvent) => finishDrag(event, true);
    canvas.addEventListener('pointerup', onPointerUp, true);
    canvas.addEventListener('pointercancel', onPointerCancel, true);
    canvas.addEventListener('lostpointercapture', onLostPointerCapture, true);
    const onLeave = () => { if (!drag) { canvas.style.cursor = ''; setHoveredIndex(-1); setHoveredOpening(-1); } };
    canvas.addEventListener('pointerleave', onLeave);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSelectedPostId(null); setSelectedOpening(null); } };
    window.addEventListener('keydown', onKey);
    return () => {
      canvas.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('keydown', onKey);
      canvas.style.cursor = '';
      canvas.removeEventListener('pointerdown', onPointerDown, true);
      canvas.removeEventListener('pointermove', onPointerMove, true);
      canvas.removeEventListener('pointerup', onPointerUp, true);
      canvas.removeEventListener('pointercancel', onPointerCancel, true);
      canvas.removeEventListener('lostpointercapture', onLostPointerCapture, true);
      if (drag) restorePost(drag.index, drag.initialMm);
      runtime.controls.enabled = true;
    };
  }, [configuration.productId, dimensions, onPostCentersChange, onSelectPost, openingSpans, posts, widthMm]);

  const measurements = dimensions
    ? `${millimetresToCentimetres(configuration.dimensionsMm.width!)} × ${millimetresToCentimetres(configuration.dimensionsMm.depth!)} cm`
    : null;

  return (
    <div className="preview-viewer">
      <div className="preview-canvas" ref={hostRef} role="img" aria-label={measurements ? `Schematische 3D-Vorschau, ${measurements}` : 'Schematische 3D-Vorschau'} />
      <p className="preview-note" role="status" aria-live="polite">
        {visibleSceneStatus === 'error' ? '3D-Vorschau nicht verfügbar. Ihre Angaben bleiben erhalten.'
          : sceneStatus === 'loading' ? '3D-Vorschau wird geladen …'
          : !dimensions ? 'Bitte geben Sie gültige Maße für die schematische Vorschau ein.'
            : modelStatus === 'ready' ? `Produktmodell · ${configuration.productId === 'premium' ? 'Premium' : 'Prime'} · ${measurements}. Montagebezüge vorläufig, keine Fertigungsdarstellung.`
              : modelStatus === 'loading' ? `Produktmodell wird geladen · ${measurements}. Bis dahin schematische Vorschau.`
                : `Schematische Vorschau · ${configuration.productId === 'premium' ? 'Premium' : 'Prime'} · ${measurements}. Keine Fertigungsdarstellung.`}
      </p>
    </div>
  );
}

function markSelectedPost(group: Group, selectedIndex: number, hoveredIndex: number): void {
  group.traverse((object) => {
    if (object.userData.selectionHalo) object.visible = object.userData.postIndex === selectedIndex;
    if (object.userData.moveArrows) object.visible = object.userData.postIndex === selectedIndex;
    if (!object.userData.postVisual || !(object instanceof Mesh)) return;
    const selected = object.userData.postIndex === selectedIndex || object.userData.postIndex === hoveredIndex;
    if (object.material instanceof MeshBasicMaterial) object.material.color.setHex(selected ? 0x20272c : 0x68747d);
    else if (object.material instanceof MeshStandardMaterial) {
      // Product parts share finishes; a selected post gets its own instance with an emissive tint.
      if (selected && !object.userData.ownMaterial) {
        object.material = object.material.clone();
        object.material.emissive.setHex(0x1f2a33);
        object.userData.ownMaterial = true;
      } else if (!selected && object.userData.ownMaterial) {
        object.material.emissive.setHex(0x000000);
      }
    }
  });
}

/** Highlights the hovered/selected field and shows its name ("Front n") with a "+" for future equipment. */
function markSelectedOpening(group: Group, selectedIndex: number | null, hoveredIndex: number, _fieldCount: number): void {
  // Count the field planes in the group itself so the names stay right whatever the caller knows.
  let fieldCount = 0;
  group.traverse((object) => { if (Number.isInteger(object.userData.openingIndex)) fieldCount += 1; });
  group.traverse((object) => {
    if (object.userData.openingIndex === undefined || !(object instanceof Mesh) || !(object.material instanceof MeshBasicMaterial)) return;
    const index = object.userData.openingIndex as number;
    const active = index === selectedIndex || index === hoveredIndex;
    object.material.color.setHex(0x383e42);
    object.material.opacity = index === selectedIndex ? 0.22 : index === hoveredIndex ? 0.14 : 0;
    const labels = (object.userData.labels ??= {}) as { name?: Sprite; plus?: Sprite; text?: string };
    const text = fieldName(index, fieldCount);
    if (labels.name && labels.text !== text) { object.remove(labels.name); labels.name = undefined; }
    if (active && !labels.name) {
      labels.text = text;
      const name = createTextSprite(text, { heightM: 0.24, background: 'rgba(56,62,66,0.95)', color: '#ffffff', bold: true });
      name.position.set(0, 0.32, 0.02);
      const plus = createTextSprite('+', { heightM: 0.34, background: 'rgba(255,255,255,0.96)', color: '#383E42', bold: true });
      plus.position.set(0, -0.1, 0.02);
      object.add(name);
      if (!labels.plus) { object.add(plus); labels.plus = plus; }
      labels.name = name;
    }
    if (labels.name) labels.name.visible = active;
    if (labels.plus) labels.plus.visible = active;
  });
}

function dimensionsFromGroup(group: Group): PreviewDimensions {
  return group.userData.dimensions as PreviewDimensions;
}

function fitCamera(runtime: ViewerRuntime, dimensions: PreviewDimensions, aspect: number): void {
  const { widthM, depthM, rearHeightM, frontHeightM } = dimensions;
  const target = new Vector3(widthM / 2, Math.max(rearHeightM, frontHeightM) / 2, -depthM / 2);
  const distance = cameraDistanceForPreview(dimensions, runtime.camera.fov, aspect);
  // Viewed from the garden side, slightly from the right.
  runtime.camera.position.copy(target).add(new Vector3(0.65, 0.5, -0.8).normalize().multiplyScalar(distance));
  runtime.camera.far = Math.max(100, distance * 4);
  runtime.camera.updateProjectionMatrix();
  runtime.controls.target.copy(target);
  if (import.meta.env.DEV) {
    // Review aid only: ?d03camera=px,py,pz,tx,ty,tz (metres) pins the camera for close-up screenshots.
    const pinned = new URLSearchParams(window.location.search).get('d03camera')?.split(',').map(Number);
    if (pinned?.length === 6 && pinned.every(Number.isFinite)) {
      runtime.camera.position.set(pinned[0], pinned[1], pinned[2]);
      runtime.controls.target.set(pinned[3], pinned[4], pinned[5]);
    }
  }
  runtime.controls.update();
}
