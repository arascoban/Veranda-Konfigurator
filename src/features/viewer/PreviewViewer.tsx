import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AmbientLight, Box3, CanvasTexture, Color, SRGBColorSpace, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial,
  PCFShadowMap, PerspectiveCamera, Plane, Raycaster, Object3D, Scene, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { assemblyLayoutFromConfiguration, type AssemblyLayout } from '../assembly/placements';
import { createAssemblyGroup, loadLayoutParts, PartLibrary, peekLayoutParts, preloadProductParts } from '../assembly/assemblyScene';
import { createDimensionGroup, disposeAnnotations, setMarkerLimits } from '../assembly/annotations';
import { createEquipmentGroup, disposeEquipmentGroup } from '../assembly/equipmentScene';
import { canPlace, elementNameDe, equipmentKinds, findField, frontFieldId, hasKind, type EquipmentKind } from '../../domain/fieldEquipment';
import { RadialMenu, type RadialOption } from './RadialMenu';
import { postSections } from '../../catalog/catalog';
import { buildDimensionLines } from '../assembly/dimensions';
import type { ConfigurationV1 } from '../../domain/configuration';
import type { PostCenter } from '../../domain/geometry/posts';
import { millimetresToCentimetres } from '../../domain/units';
import { finishPostDrag, openingAxisSpans, postMoveRange, type OpeningAxisSpan } from './postEditing';
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
  /** High quality: shadows from a fixed sun and screen-space ambient occlusion through a composer. */
  quality: RenderQuality;
  composer: EffectComposer | null;
  gtao: GTAOPass | null;
  sun: DirectionalLight;
  /** Shadow-free studio lights aimed at the structure centre. */
  studio: DirectionalLight[];
  /** Structure bounds (metres) that receive ambient occlusion; the huge ground canvas outside is left alone. */
  aoBox: Box3 | null;
  setQuality: (quality: RenderQuality) => void;
  /** Camera preset last applied; refits after measurement changes keep it. */
  view: ViewPreset;
  /** Camera distance of the fitted view = 100 % zoom. */
  fitDistance: number;
  backdrop: Backdrop;
  /** Aspect of the visible area right of the left column; the camera fits the model into it. */
  fitAspect: number;
  /** Width (CSS px) covered by the left column; the projection is shifted so the model centres right of it. */
  insetLeft: number;
  /** Bemaßungen shown: the fitted view also makes room for the dimension lines around the model. */
  fitWithDimensions: boolean;
};

/** Camera presets of the V2 view bar; "front" and "side" are seen from the garden (side = garden-left end). */
export type ViewPreset = '3d' | 'front' | 'side' | 'top';
/** Studio: plain warm background; Garten: sky and lawn (no photo yet). */
export type Backdrop = 'studio' | 'garden';
/** Quality chosen in the menu; "auto" starts low, steps up while the frame rate holds and steps down (then stays) below 60 fps. */
export type QualityMode = 'auto' | RenderQuality;

/** low: plain; medium: ambient occlusion; high: ambient occlusion + shadows from the fixed sun. */
export type RenderQuality = 'low' | 'medium' | 'high';
/** Phones and tablets always stay on low quality (decided 30 Sep 2026). */
const qualityLabel: Record<QualityMode, string> = { auto: 'Auto', low: 'Niedrig', medium: 'Mittel', high: 'Hoch' };
const qualityOption: Record<QualityMode, string> = {
  auto: 'Automatisch (nach Bildrate)',
  low: 'Niedrig', medium: 'Mittel (Ambient Occlusion)', high: 'Hoch (Ambient Occlusion, Schatten)',
};
const FIELD_BLUE = 0x2f9dff;
const ZOOM_STEP = 1.25;
const highQualityAvailable = () => typeof window !== 'undefined'
  && !window.matchMedia('(pointer: coarse)').matches && window.innerWidth >= 768;

export type ProductModelStatus = 'loading' | 'ready' | 'missing' | 'error';

export function PreviewViewer({ configuration, resetViewToken = 0, view = { preset: '3d', token: 0 }, backdrop = 'studio', showDimensions = false, selectedPostId = null, onSelectPost, selectedRoofField = null, onSelectRoofField,
  selectedFieldId = null, onSelectField, highlightFieldIds = [], onFieldPick, onPostCentersChange, onSceneStatusChange, onProductModelStatusChange,
  interactive = true }: {
  configuration: ConfigurationV1;
  /** false: look only (AR page) — no post dragging, field menu or quality menu. */
  interactive?: boolean;
  resetViewToken?: number;
  /** Camera preset; a new token re-applies it even when the preset is unchanged. */
  view?: { preset: ViewPreset; token: number };
  backdrop?: Backdrop;
  /** Front/side field selected here or in the Feld section (`front:…`, `side:left|right`). */
  selectedFieldId?: string | null;
  onSelectField?: (fieldId: string | null) => void;
  /** Fields ticked in the Ausstattung checklist; tinted blue in the model. */
  highlightFieldIds?: readonly string[];
  /** A kind picked in the radial menu of a field. */
  onFieldPick?: (fieldId: string, kind: EquipmentKind) => void;
  /** Bemaßungen layer: main measurements plus the clear width of every field. */
  showDimensions?: boolean;
  /** Selection is shared with the settings panel; posts are edited directly in the model. */
  selectedPostId?: string | null;
  onSelectPost?: (postId: string | null) => void;
  /** Roof field (inside-left index) selected in the model; its tone is edited in the Dach section. */
  selectedRoofField?: number | null;
  onSelectRoofField?: (index: number | null) => void;
  onPostCentersChange?: (posts: PostCenter[]) => void;
  onSceneStatusChange?: (status: 'loading' | 'ready' | 'missing' | 'error') => void;
  /** Real product parts: missing while the schematic stands in, ready once the GLB assembly is shown. */
  onProductModelStatusChange?: (status: ProductModelStatus) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ViewerRuntime | null>(null);
  const lastFitKeyRef = useRef('');
  const [sceneStatus, setSceneStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // Latest callbacks live in a ref so the pointer handlers are not torn down (and an active drag lost)
  // just because the parent re-rendered with new function identities (ASTRA-GP-02).
  const callbacks = useRef({ onSelectPost, onSelectRoofField, onPostCentersChange, onSelectField });
  callbacks.current = { onSelectPost, onSelectRoofField, onPostCentersChange, onSelectField };
  const setSelectedPostId = (postId: string | null) => callbacks.current.onSelectPost?.(postId);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  /** Screen anchor (viewer pixels) of the "+" over the hovered field. */
  const [plusAnchor, setPlusAnchor] = useState<{ fieldId: string; x: number; y: number } | null>(null);
  const [radial, setRadial] = useState<{ fieldId: string; x: number; y: number } | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [hoveredRoofField, setHoveredRoofField] = useState(-1);
  const [fps, setFps] = useState<number | null>(null);
  const [quality, setQualityState] = useState<RenderQuality>('low');
  const [qualityMode, setQualityMode] = useState<QualityMode>('auto');
  const qualityModeRef = useRef<QualityMode>('auto');
  qualityModeRef.current = qualityMode;
  /** Set when the customer picks Auto again: the render loop forgets an earlier step-down. */
  const autoRestartRef = useRef(false);
  const backdropRef = useRef<Backdrop>(backdrop);
  backdropRef.current = backdrop;
  const [autoLowered, setAutoLowered] = useState(false);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const canUseHigh = highQualityAvailable();
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
  const fieldIdOf = (data: Record<string, unknown>) => fieldIdFromUserData(data, openingSpans);

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
    scene.add(new AmbientLight(0xffffff, 0.45));
    scene.add(new HemisphereLight(0xffffff, 0xb8c0c6, 0.7));
    // Fixed sun: garden side, high, slightly from the right; casts shadows in high quality.
    const light = new DirectionalLight(0xffffff, 1.6);
    light.position.set(4, 8, -5);
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = 0.02;
    scene.add(light);
    scene.add(light.target);
    // Studio lights (no shadows, every quality level): straight from the garden, left and right diagonal,
    // one from above at an angle. Directions are relative to the structure centre (set on group swap).
    const studio = [
      { direction: new Vector3(0, 0.35, -1), intensity: 0.7 },
      { direction: new Vector3(-1, 0.5, -0.8), intensity: 0.5 },
      { direction: new Vector3(1, 0.5, -0.8), intensity: 0.5 },
      { direction: new Vector3(-0.4, 1, 0.5), intensity: 0.6 },
    ].map(({ direction, intensity }) => {
      const lamp = new DirectionalLight(0xffffff, intensity);
      lamp.userData.direction = direction.normalize();
      lamp.position.copy(direction).multiplyScalar(12);
      scene.add(lamp);
      scene.add(lamp.target);
      return lamp;
    });
    // Near plane 5 cm: depth precision feeds shadows and ambient occlusion (CLAUDE-K03-007).
    const camera = new PerspectiveCamera(45, 1, 0.05, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.minDistance = 0.4;
    let render = () => {
      if (runtime.quality !== 'low' && runtime.composer) runtime.composer.render();
      else renderer.render(scene, camera);
    };
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
    const runtime: ViewerRuntime = {
      scene, camera, renderer, controls, render, group: null, library: new PartLibrary(import.meta.env.BASE_URL),
      quality: 'low', composer: null, gtao: null, sun: light, studio, aoBox: null, view: '3d', fitDistance: 1, backdrop: backdropRef.current, fitAspect: 1, insetLeft: 0, fitWithDimensions: false,
      setQuality: (next) => {
        if (runtime.quality === next) return;
        runtime.quality = next;
        renderer.shadowMap.enabled = next === 'high';
        renderer.shadowMap.type = PCFShadowMap;
        light.castShadow = next === 'high';
        if (next !== 'low' && !runtime.composer) {
          const composer = new EffectComposer(renderer);
          composer.addPass(new RenderPass(scene, camera));
          const gtao = new GTAOPass(scene, camera, host.clientWidth, host.clientHeight);
          gtao.output = GTAOPass.OUTPUT.Default;
          gtao.updateGtaoMaterial({ radius: 0.2 });
          if (runtime.aoBox) gtao.setSceneClipBox(runtime.aoBox);
          composer.addPass(gtao);
          composer.addPass(new OutputPass());
          runtime.composer = composer;
          runtime.gtao = gtao;
          // CSS size: the composer multiplies by its own pixel ratio, so physical pixels would double it (ASTRA-GP-06).
          composer.setPixelRatio(renderer.getPixelRatio());
          composer.setSize(host.clientWidth, host.clientHeight);
        }
        // Materials compiled without shadow support must be rebuilt when the shadow map is switched.
        scene.traverse((object) => {
          if (object instanceof Mesh && !Array.isArray(object.material)) object.material.needsUpdate = true;
        });
        render();
      },
    };
    runtimeRef.current = runtime;
    // Review aid only: lets screenshot scripts inspect and toggle the render pipeline.
    if (import.meta.env.DEV) (window as unknown as { __d03runtime?: ViewerRuntime }).__d03runtime = runtime;
    applyBackdrop(runtime, backdropRef.current);
    setSceneStatus('ready');

    // Continuous render loop: measures the real frame rate and drives the automatic quality fallback.
    let frame = 0;
    let lastTime = performance.now();
    let lastReport = lastTime;
    const durations: number[] = [];
    let highSince = 0;
    // Review aid only: ?d03loop=0 renders on demand (screenshot scripts on software GL).
    const continuous = !(import.meta.env.DEV && new URLSearchParams(window.location.search).get('d03loop') === '0');
    // Auto quality starts low and steps up while the frame rate holds; one drop locks it (no oscillation).
    let autoLocked = !continuous || !highQualityAvailable();
    let steadySince = 0;
    const loop = (now: number) => {
      if (continuous) frame = requestAnimationFrame(loop);
      durations.push(now - lastTime);
      lastTime = now;
      if (durations.length > 90) durations.shift();
      render();
      if (now - lastReport > 500 && durations.length >= 10) {
        lastReport = now;
        const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;
        const current = Math.round(1000 / average);
        setFps(current);
        if (autoRestartRef.current) { autoRestartRef.current = false; autoLocked = !highQualityAvailable(); }
        if (qualityModeRef.current !== 'auto') { highSince = 0; steadySince = 0; }
        else if (current < 58) {
          steadySince = 0;
          if (runtime.quality !== 'low') {
            if (!highSince) highSince = now;
            // Below 60 fps for a while after a switch → one step down, and stay there.
            if (now - highSince > 3000) {
              const lower: RenderQuality = runtime.quality === 'high' ? 'medium' : 'low';
              runtime.setQuality(lower);
              setQualityState(lower);
              setAutoLowered(true);
              autoLocked = true;
              highSince = 0;
            }
          }
        } else {
          highSince = 0;
          if (!steadySince) steadySince = now;
          // A steady frame rate for 3 s → one step up (medium, then high).
          if (!autoLocked && runtime.quality !== 'high' && now - steadySince > 3000) {
            const higher: RenderQuality = runtime.quality === 'low' ? 'medium' : 'high';
            runtime.setQuality(higher);
            setQualityState(higher);
            steadySince = 0;
          }
        }
      }
    };
    frame = requestAnimationFrame(loop);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setSceneStatus('error');
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    controls.addEventListener('change', render);
    const reportZoom = () => {
      const distance = camera.position.distanceTo(controls.target);
      if (distance > 0) setZoomPercent(Math.round((runtime.fitDistance / distance) * 100));
    };
    controls.addEventListener('change', reportZoom);
    // Any camera movement closes the radial menu and hides the "+" (their anchors would be stale).
    const onCameraStart = () => { setRadial(null); setPlusAnchor(null); };
    controls.addEventListener('start', onCameraStart);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // The canvas runs under the glass column (V2); --viewer-inset-left tells how much of it is covered.
      const inset = Math.min(width * 0.6, parseFloat(getComputedStyle(host).getPropertyValue('--viewer-inset-left')) || 0);
      runtime.insetLeft = inset;
      runtime.fitAspect = Math.max(0.2, (width - inset) / height);
      if (inset > 0) camera.setViewOffset(width, height, -inset / 2, 0, width, height);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      runtime.composer?.setSize(width, height);
      if (runtime.group) fitCamera(runtime, dimensionsFromGroup(runtime.group), runtime.fitAspect, runtime.view);
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener('change', render);
      controls.removeEventListener('change', reportZoom);
      controls.removeEventListener('start', onCameraStart);
      const equipment = scene.getObjectByName('Ausstattung');
      if (equipment instanceof Group) disposeEquipmentGroup(equipment);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      if (runtime.group) { scene.remove(runtime.group); disposeSchematicGroup(runtime.group); }
      const dims = scene.getObjectByName('Bemaßungen');
      if (dims) disposeAnnotations(dims);
      runtime.gtao?.dispose();
      runtime.composer?.dispose();
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
        const span = Math.max(dimensions.widthM, dimensions.depthM, dimensions.rearHeightM) + 2;
        runtime.sun.position.set(dimensions.widthM / 2 + span * 0.4, span * 1.2, -dimensions.depthM / 2 - span * 0.6);
        runtime.sun.target.position.set(dimensions.widthM / 2, 0, -dimensions.depthM / 2);
        const centre = new Vector3(dimensions.widthM / 2, Math.max(dimensions.rearHeightM, dimensions.frontHeightM) / 2, -dimensions.depthM / 2);
        for (const lamp of runtime.studio) {
          lamp.target.position.copy(centre);
          lamp.position.copy(centre).add((lamp.userData.direction as Vector3).clone().multiplyScalar(span * 2));
        }
        const cam = runtime.sun.shadow.camera;
        cam.left = -span; cam.right = span; cam.top = span; cam.bottom = -span; cam.near = 0.5; cam.far = span * 4;
        cam.updateProjectionMatrix();
        runtime.aoBox = new Box3(
          new Vector3(-1, -0.2, -dimensions.depthM - 1),
          new Vector3(dimensions.widthM + 1, Math.max(dimensions.rearHeightM, dimensions.frontHeightM) + 1, 1),
        );
        runtime.gtao?.setSceneClipBox(runtime.aoBox);
        markSelectedPost(group, selectedIndexRef.current, -1);
        markFields(group, fieldMarksRef.current.idOf, fieldMarksRef.current.selected, null, fieldMarksRef.current.highlighted);
        applyBackdrop(runtime, runtime.backdrop);
        markSelectedRoofField(group, selectedRoofFieldRef.current, -1);
      }
      runtime.render();
    };
    if (!dimensions) {
      swapGroup(null);
      lastFitKeyRef.current = '';
      setModelStatus('missing');
      return;
    }
    const options = { includeGroundGuide: true, includePostControls: true };
    // Parts already in memory (same product edited again, or the other product preloaded in the background)
    // are assembled at once, so the schematic never flashes. Otherwise the schematic bridges the download.
    const cachedParts = layout ? peekLayoutParts(layout, runtime.library) : null;
    if (layout && cachedParts) swapGroup(createAssemblyGroup(layout, cachedParts, options));
    else swapGroup(createSchematicGroup(dimensions, configuration.roofMaterialId, options));
    const fitKey = [dimensions.widthM, dimensions.depthM, dimensions.rearHeightM, dimensions.frontHeightM].join(':');
    if (lastFitKeyRef.current !== fitKey) {
      fitCamera(runtime, dimensions, runtime.fitAspect, runtime.view);
      lastFitKeyRef.current = fitKey;
    }
    if (!layout) {
      setModelStatus('missing');
      return;
    }
    if (cachedParts) {
      setModelStatus('ready');
      return;
    }
    let cancelled = false;
    setModelStatus('loading');
    loadLayoutParts(layout, runtime.library).then((parts) => {
      if (cancelled) return;
      swapGroup(createAssemblyGroup(layout, parts, options));
      setModelStatus('ready');
      // Warm the other product right away in the background; this never changes the selected product.
      preloadProductParts(layout.productId === 'prime' ? 'premium' : 'prime', runtime.library);
    }).catch(() => {
      // The schematic stays in place; the product model is reported as unavailable, never as ready.
      if (!cancelled) setModelStatus('error');
    });
    return () => { cancelled = true; };
  }, [dimensions, configuration.roofMaterialId, layout]);

  const selectedIndexRef = useRef(-1);
  const fieldMarksRef = useRef<{ idOf: (data: Record<string, unknown>) => string | null; selected: string | null; highlighted: readonly string[] }>({
    idOf: () => null, selected: null, highlighted: [] });
  const selectedRoofFieldRef = useRef<number | null>(null);
  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
    fieldMarksRef.current = { idOf: fieldIdOf, selected: selectedFieldId, highlighted: highlightFieldIds };
    selectedRoofFieldRef.current = selectedRoofField;
    const runtime = runtimeRef.current;
    if (!runtime?.group) return;
    markSelectedPost(runtime.group, selectedIndex, hoveredIndex);
    markFields(runtime.group, fieldIdOf, selectedFieldId, radial?.fieldId ?? hoveredField, highlightFieldIds);
    markSelectedRoofField(runtime.group, selectedRoofField, hoveredRoofField);
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
  }, [selectedFieldId, radial?.fieldId, highlightFieldIds.join(','), openingSpans, dimensions, selectedIndex, hoveredIndex, hoveredField, selectedRoofField, hoveredRoofField, modelStatus, openingSpans.length, selectedRange, posts, configuration.productId]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    applyDimensionLayer(runtime, showDimensions && dimensions ? configuration : null);
    runtime.render();
  }, [showDimensions, configuration, dimensions]);

  // Switching Bemaßungen refits the view so the outer labels (heights on the garden-left side) are not cut off
  // or hidden under the left column — but only while the customer has not zoomed or moved the camera.
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || runtime.fitWithDimensions === showDimensions) return;
    const untouched = runtime.group && Math.abs(runtime.camera.position.distanceTo(runtime.controls.target) - runtime.fitDistance) < runtime.fitDistance * 0.01;
    runtime.fitWithDimensions = showDimensions;
    if (untouched && runtime.group) {
      fitCamera(runtime, dimensionsFromGroup(runtime.group), runtime.fitAspect, runtime.view);
      runtime.render();
    }
  }, [showDimensions]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime?.group) return;
    fitCamera(runtime, dimensionsFromGroup(runtime.group), runtime.fitAspect, runtime.view);
    runtime.render();
  }, [resetViewToken]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.view = view.preset;
    setRadial(null);
    setPlusAnchor(null);
    if (!runtime.group) return;
    fitCamera(runtime, dimensionsFromGroup(runtime.group), runtime.fitAspect, view.preset);
    runtime.render();
  }, [view.preset, view.token]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    applyBackdrop(runtime, backdrop);
    runtime.render();
  }, [backdrop]);

  // Schematic Ausstattung layer, rebuilt with every revision of the equipment or the frame.
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const previous = runtime.scene.getObjectByName('Ausstattung');
    if (previous instanceof Group) { runtime.scene.remove(previous); disposeEquipmentGroup(previous); }
    if (dimensions) runtime.scene.add(createEquipmentGroup(configuration));
    runtime.render();
  }, [configuration, dimensions]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !dimensions || !posts || widthMm === null || !interactive) return;
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
      // Nearest selectable thing wins: a post, a roof field (Dach section) or a field between posts.
      const nearest = hits.find((entry) => isPickable(entry.object.userData));
      if (!nearest) return;
      if (Number.isInteger(nearest.object.userData.roofFieldIndex)) {
        setSelectedPostId(null);
        callbacks.current.onSelectField?.(null);
        setRadial(null);
        callbacks.current.onSelectRoofField?.(nearest.object.userData.roofFieldIndex as number);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      // Fields react on click (pointer up without movement), so the model can still be orbited across them.
      if (!Number.isInteger(nearest.object.userData.postIndex)) return;
      const hit = nearest;
      const index = hit.object.userData.postIndex as number;
      const post = posts[index];
      if (!post) return;
      setSelectedPostId(post.id);
      callbacks.current.onSelectField?.(null);
      setRadial(null);
      callbacks.current.onSelectRoofField?.(null);
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
        const nearest = hits.find((entry) => isPickable(entry.object.userData));
        const data = nearest?.object.userData ?? {};
        const index = Number.isInteger(data.postIndex) ? (data.postIndex as number) : -1;
        const roofField = Number.isInteger(data.roofFieldIndex) ? (data.roofFieldIndex as number) : -1;
        const fieldId = index < 0 && roofField < 0 ? fieldIdFromUserData(data, openingSpans) : null;
        canvas.style.cursor = index >= 0 ? 'ew-resize' : roofField >= 0 || fieldId ? 'pointer' : '';
        setHoveredIndex(index);
        setHoveredRoofField(roofField);
        setHoveredField(fieldId);
        // "+" over the hovered field (black on white, field tinted blue); none while a mouse button is down.
        const anchor = fieldId && nearest && event.buttons === 0 ? { fieldId, ...projectObjectCentre(nearest.object, runtime.camera, canvas) } : null;
        // Same field at (almost) the same spot: keep the state object, so a mouse move does not re-render the viewer.
        setPlusAnchor((previous) => previous && anchor && previous.fieldId === anchor.fieldId
          && Math.abs(previous.x - anchor.x) < 1 && Math.abs(previous.y - anchor.y) < 1 ? previous : anchor);
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
      // Live feedback while dragging: field widths and the remaining travel on the arrows follow the post.
      const livePosts = posts.map((post, index) => index === drag!.index ? { ...post, xMm } : post);
      if (showDimensions) applyDimensionLayer(runtime, { ...configuration, postCenters: livePosts });
      const section = postSections[configuration.productId];
      runtime.group.traverse((object) => {
        if (object.userData.moveArrows && object.userData.postIndex === drag!.index) {
          setMarkerLimits(object, (range.maxMm - xMm) / 10, (xMm - range.minMm) / 10,
            -dimensions.depthM + section.towardsGardenMm / 2000, section.alongGutterMm / 2000);
        }
      });
      event.preventDefault();
    };
    const finishDrag = (event: PointerEvent, cancelled: boolean) => {
      if (!drag) {
        // A plain click on empty space (no orbit movement) clears the selection.
        if (!cancelled && press && Math.hypot(event.clientX - press.x, event.clientY - press.y) < 4 && runtime.group) {
          setRay(event);
          const nearest = raycaster.intersectObjects(runtime.group.children, true).find((entry) => isPickable(entry.object.userData));
          const fieldId = nearest ? fieldIdFromUserData(nearest.object.userData, openingSpans) : null;
          if (nearest && fieldId) {
            // A field opens its radial menu at the field centre (V2); the Feld section follows the selection.
            setSelectedPostId(null);
            callbacks.current.onSelectRoofField?.(null);
            callbacks.current.onSelectField?.(fieldId);
            setPlusAnchor(null);
            setRadial({ fieldId, ...projectObjectCentre(nearest.object, runtime.camera, canvas) });
          } else if (!nearest) { setSelectedPostId(null); callbacks.current.onSelectField?.(null); setRadial(null); callbacks.current.onSelectRoofField?.(null); }
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
        if (next) callbacks.current.onPostCentersChange?.(next);
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
    const onLeave = (event: PointerEvent) => {
      if (drag) return;
      canvas.style.cursor = '';
      setHoveredIndex(-1);
      // Moving onto the "+" button keeps the field hovered.
      if (event.relatedTarget instanceof Element && event.relatedTarget.closest('.field-plus')) return;
      setHoveredField(null);
      setPlusAnchor(null);
    };
    canvas.addEventListener('pointerleave', onLeave);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSelectedPostId(null); setRadial(null); } };
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
  }, [configuration, dimensions, openingSpans, posts, widthMm, showDimensions, interactive]);

  const measurements = dimensions
    ? `${millimetresToCentimetres(configuration.dimensionsMm.width!)} × ${millimetresToCentimetres(configuration.dimensionsMm.depth!)} cm`
    : null;

  const radialField = radial ? findField(configuration, radial.fieldId) : undefined;
  const radialOptions: RadialOption[] = radialField ? equipmentKinds.map((kind) => {
    if (hasKind(configuration, radialField.id, kind)) return { kind, label: elementNameDe[kind], state: 'present' as const, note: 'gewählt' };
    const check = canPlace(configuration, radialField, kind);
    return check.ok ? { kind, label: elementNameDe[kind], state: 'available' as const }
      : { kind, label: elementNameDe[kind], state: 'disabled' as const,
        note: check.reason === 'side_only' ? 'nur seitlich' : check.reason === 'field_full' ? 'Feld voll' : 'zu niedrig' };
  }) : [];
  const plusField = plusAnchor && !radial ? findField(configuration, plusAnchor.fieldId) : undefined;
  const hostSize = { width: hostRef.current?.clientWidth ?? 800, height: hostRef.current?.clientHeight ?? 600 };
  const radialScale = Math.min(1, (Math.min(hostSize.width - (runtimeRef.current?.insetLeft ?? 0), hostSize.height) - 24) / 380);
  const insetLeft = runtimeRef.current?.insetLeft ?? 0;
  const clampToHost = (value: number, size: number, limit: number, start = 0) => Math.max(start + size / 2 + 8, Math.min(limit - size / 2 - 8, value));
  const zoomBy = (factor: number) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const offset = runtime.camera.position.clone().sub(runtime.controls.target);
    const distance = Math.max(runtime.controls.minDistance, Math.min(runtime.camera.far / 2, offset.length() / factor));
    runtime.camera.position.copy(runtime.controls.target).add(offset.setLength(distance));
    runtime.controls.update();
    runtime.controls.dispatchEvent({ type: 'change' });
  };
  const pickRadial = (kind: EquipmentKind) => {
    if (!radial) return;
    onFieldPick?.(radial.fieldId, kind);
    setRadial(null);
  };

  return (
    <div className="preview-viewer">
      <div className="preview-canvas" ref={hostRef} role="img" aria-label={measurements ? `Schematische 3D-Vorschau, ${measurements}` : 'Schematische 3D-Vorschau'} />
      {plusField && plusAnchor && <div className="field-plus" style={{ left: plusAnchor.x, top: plusAnchor.y }}>
        <button type="button" className="field-plus__button" aria-label={`${plusField.label}: Ausstattung hinzufügen`}
          onPointerLeave={(event) => { if (!(event.relatedTarget instanceof HTMLCanvasElement)) { setPlusAnchor(null); setHoveredField(null); } }}
          onClick={() => {
            onSelectRoofField?.(null);
            onSelectField?.(plusField.id);
            setRadial({ fieldId: plusField.id, x: plusAnchor.x, y: plusAnchor.y });
            setPlusAnchor(null);
          }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14m-7-7h14" /></svg>
        </button>
        <span className="field-plus__label">{plusField.label} · Ausstattung hinzufügen</span>
      </div>}
      {radial && radialField && <>
        <div className="radial-menu__backdrop" onPointerDown={() => setRadial(null)} aria-hidden="true" />
        <RadialMenu title={`${radialField.label} · bis zu 2 Elemente`} options={radialOptions} scale={radialScale}
          x={clampToHost(radial.x, 380 * radialScale, hostSize.width, insetLeft)} y={clampToHost(radial.y, 380 * radialScale + 60, hostSize.height)}
          onPick={pickRadial} onClose={() => setRadial(null)} />
      </>}
      {sceneStatus !== 'error' && interactive && <div className="fps-badge">
        <span className="fps-badge__fps" aria-label="Bildrate">{fps ?? '–'} FPS</span>
        <button type="button" className="fps-badge__button" aria-haspopup="menu" aria-expanded={qualityMenuOpen}
          onClick={() => setQualityMenuOpen((open) => !open)}>
          Qualität: {qualityLabel[qualityMode]}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {qualityMenuOpen && <div className="fps-badge__menu" role="menu" aria-label="Darstellungsqualität">
          {(['auto', 'low', 'medium', 'high'] as const).map((option) => (
            <button key={option} type="button" role="menuitemradio" aria-checked={qualityMode === option}
              disabled={(option === 'medium' || option === 'high') && !canUseHigh}
              onClick={() => {
                const effective: RenderQuality = option === 'auto' ? 'low' : option;
                runtimeRef.current?.setQuality(effective);
                setQualityState(effective);
                setQualityMode(option);
                if (option === 'auto') autoRestartRef.current = true;
                setAutoLowered(false);
                setQualityMenuOpen(false);
              }}>
              {qualityOption[option]}
            </button>
          ))}
          <small>{!canUseHigh ? 'Auf Telefon und Tablet läuft die niedrige Qualität.'
            : qualityMode !== 'auto' ? `Fest eingestellt: ${qualityLabel[quality]}.`
              : autoLowered ? `Automatisch auf ${qualityLabel[quality].toLowerCase()} gestellt, weil die Bildrate unter 60 fiel.`
                : `Aktuell ${qualityLabel[quality].toLowerCase()}; bei stabilen 60 Bildern pro Sekunde wird schrittweise erhöht, darunter zurückgeschaltet.`}</small>
        </div>}
      </div>}
      {sceneStatus === 'ready' && dimensions && <div className="zoom-bar" role="group" aria-label="Zoom">
        <button type="button" className="zoom-bar__button" aria-label="Verkleinern" onClick={() => zoomBy(1 / ZOOM_STEP)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
        </button>
        <output className="zoom-bar__value" aria-live="polite">{zoomPercent} %</output>
        <button type="button" className="zoom-bar__button" aria-label="Vergrößern" onClick={() => zoomBy(ZOOM_STEP)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14m-7-7h14" /></svg>
        </button>
      </div>}
      <p className="preview-note" role="status" aria-live="polite">
        {visibleSceneStatus === 'error' ? '3D-Vorschau nicht verfügbar. Ihre Angaben bleiben erhalten.'
          : sceneStatus === 'loading' ? '3D-Vorschau wird geladen …'
          : !dimensions ? 'Bitte geben Sie gültige Maße für die schematische Vorschau ein.'
            : modelStatus === 'ready' ? `Produktmodell · ${configuration.productId === 'premium' ? 'Premium' : 'Prime'} · ${measurements}. Montagebezüge vorläufig, Ausstattung schematisch.`
              : modelStatus === 'loading' ? `Produktmodell wird geladen · ${measurements}. Bis dahin schematische Vorschau.`
                : `Schematische Vorschau · ${configuration.productId === 'premium' ? 'Premium' : 'Prime'} · ${measurements}. Keine Fertigungsdarstellung.`}
      </p>
    </div>
  );
}

/** Replaces the "Bemaßungen" layer; null removes it. */
function applyDimensionLayer(runtime: ViewerRuntime, configuration: ConfigurationV1 | null): void {
  const previous = runtime.scene.getObjectByName('Bemaßungen');
  if (previous instanceof Group) { runtime.scene.remove(previous); disposeAnnotations(previous); }
  if (configuration) runtime.scene.add(createDimensionGroup(buildDimensionLines(configuration)));
}

function markSelectedPost(group: Group, selectedIndex: number, hoveredIndex: number): void {
  group.traverse((object) => {
    if (object.userData.selectionHalo) object.visible = object.userData.postIndex === selectedIndex;
    if (object.userData.moveArrows) object.visible = object.userData.postIndex === selectedIndex;
    if (!object.userData.postVisual || !(object instanceof Mesh)) return;
    const isSelected = object.userData.postIndex === selectedIndex;
    const selected = isSelected || object.userData.postIndex === hoveredIndex;
    if (object.material instanceof MeshBasicMaterial) object.material.color.setHex(selected ? 0x20272c : 0x68747d);
    else if (object.material instanceof MeshStandardMaterial) {
      // Product parts share finishes; a selected/hovered post gets its own instance with an emissive tint
      // (blue when selected, matching the edge outline; a soft grey glow on hover).
      if (selected && !object.userData.ownMaterial) {
        object.material = object.material.clone();
        object.userData.ownMaterial = true;
      }
      if (object.userData.ownMaterial) object.material.emissive.setHex(isSelected ? 0x0a2a4e : selected ? 0x1f2a33 : 0x000000);
    }
  });
}

/** Blue outline on the selected roof field, soft tint while hovering; panel materials are per tone, so tinted ones are cloned. */
function markSelectedRoofField(group: Group, selectedIndex: number | null, hoveredIndex: number): void {
  group.traverse((object) => {
    if (object.userData.roofFieldHalo) object.visible = object.userData.roofFieldIndex === selectedIndex;
    if (!object.userData.roofFieldVisual || !(object instanceof Mesh) || !(object.material instanceof MeshPhysicalMaterial)) return;
    const index = object.userData.roofFieldIndex as number;
    const active = index === selectedIndex || index === hoveredIndex;
    if (active && !object.userData.ownMaterial) {
      object.material = object.material.clone();
      object.userData.ownMaterial = true;
    }
    if (object.userData.ownMaterial) object.material.emissive.setHex(index === selectedIndex ? 0x0f4f94 : active ? 0x27343c : 0x000000);
  });
}

/** Field pick planes: blue tint for the selected (strong), Ausstattung-checked and hovered fields. */
function markFields(group: Group, idOf: (data: Record<string, unknown>) => string | null, selected: string | null, hovered: string | null,
  highlighted: readonly string[]): void {
  group.traverse((object) => {
    if (!(object instanceof Mesh) || !(object.material instanceof MeshBasicMaterial)) return;
    if (object.userData.openingIndex === undefined && object.userData.sideField === undefined) return;
    const id = idOf(object.userData);
    object.material.color.setHex(FIELD_BLUE);
    object.material.opacity = id === null ? 0 : id === selected ? 0.24 : highlighted.includes(id) ? 0.2 : id === hovered ? 0.16 : 0;
  });
}

function isPickable(data: Record<string, unknown>): boolean {
  return (Number.isInteger(data.postIndex) && !data.moveArrows) || Number.isInteger(data.roofFieldIndex)
    || Number.isInteger(data.openingIndex) || data.sideField === 'left' || data.sideField === 'right';
}

/** Equipment field id of a pick plane: front planes via the post pair of their gap, sides directly. */
function fieldIdFromUserData(data: Record<string, unknown>, spans: readonly OpeningAxisSpan[]): string | null {
  if (data.sideField === 'left' || data.sideField === 'right') return `side:${data.sideField}`;
  if (!Number.isInteger(data.openingIndex)) return null;
  const span = spans.find((entry) => entry.index === data.openingIndex);
  return span ? frontFieldId(span.leftPostId, span.rightPostId) : null;
}

/** Centre of an object's bounds in CSS pixels of the canvas. */
function projectObjectCentre(object: Object3D, camera: PerspectiveCamera, canvas: HTMLCanvasElement): { x: number; y: number } {
  const centre = new Box3().setFromObject(object).getCenter(new Vector3()).project(camera);
  const bounds = canvas.getBoundingClientRect();
  return { x: (centre.x + 1) / 2 * bounds.width, y: (1 - centre.y) / 2 * bounds.height };
}

const backdropSky = (() => {
  let texture: CanvasTexture | null = null;
  return () => {
    if (texture) return texture;
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, '#b9d4e6');
      gradient.addColorStop(0.62, '#e4eef1');
      gradient.addColorStop(1, '#eef1e8');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 4, 256);
    }
    texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  };
})();

/** Studio: warm stone background and ground; Garten: sky gradient and lawn. */
function applyBackdrop(runtime: ViewerRuntime, backdrop: Backdrop): void {
  runtime.backdrop = backdrop;
  runtime.scene.background = backdrop === 'garden' ? backdropSky() : new Color(0xe9e4dc);
  runtime.group?.traverse((object) => {
    if (object.userData.ground && object instanceof Mesh && object.material instanceof MeshBasicMaterial) {
      object.material.color.setHex(backdrop === 'garden' ? 0x8da16d : 0xd8d1c6);
    }
  });
}

function dimensionsFromGroup(group: Group): PreviewDimensions {
  return group.userData.dimensions as PreviewDimensions;
}

const viewDirections: Record<ViewPreset, Vector3> = {
  // Viewed from the garden side, slightly from the right.
  '3d': new Vector3(0.65, 0.5, -0.8),
  front: new Vector3(0, 0.12, -1),
  // Garden-left end (inside x = W).
  side: new Vector3(1, 0.12, -0.02),
  // From above with the wall at the top and the garden-left end on the left.
  top: new Vector3(0, 1, -0.001),
};

function fitCamera(runtime: ViewerRuntime, dimensions: PreviewDimensions, aspect: number, view: ViewPreset = '3d'): void {
  const { widthM, depthM, rearHeightM, frontHeightM } = dimensions;
  const target = new Vector3(widthM / 2, Math.max(rearHeightM, frontHeightM) / 2, -depthM / 2);
  // Dimension lines reach about 2.3 m past the garden-left end (heights), 0.9 m past the other end and
  // 0.8 m in front of the posts (see buildDimensionLines); the fitted box grows enough to keep them in view.
  const fitted = runtime.fitWithDimensions ? { ...dimensions, widthM: widthM + 1.8, depthM: depthM + 0.8 } : dimensions;
  if (runtime.fitWithDimensions) target.add(new Vector3(0.7, 0, -0.3));
  const distance = cameraDistanceForPreview(fitted, runtime.camera.fov, aspect);
  runtime.camera.position.copy(target).add(viewDirections[view].clone().normalize().multiplyScalar(distance));
  runtime.camera.far = Math.max(100, distance * 4);
  runtime.camera.updateProjectionMatrix();
  runtime.controls.target.copy(target);
  runtime.fitDistance = distance;
  if (import.meta.env.DEV) {
    // Review aid only: ?d03camera=px,py,pz,tx,ty,tz (metres) pins the camera for close-up screenshots.
    const pinned = new URLSearchParams(window.location.search).get('d03camera')?.split(',').map(Number);
    if (view === '3d' && pinned?.length === 6 && pinned.every(Number.isFinite)) {
      runtime.camera.position.set(pinned[0], pinned[1], pinned[2]);
      runtime.controls.target.set(pinned[3], pinned[4], pinned[5]);
    }
  }
  runtime.controls.update();
  runtime.controls.dispatchEvent({ type: 'change' });
}
