import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AmbientLight, Color, DirectionalLight, Group, Mesh, MeshBasicMaterial,
  PerspectiveCamera, Plane, Raycaster, Scene, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ConfigurationV1 } from '../../domain/configuration';
import type { PostCenter } from '../../domain/geometry/posts';
import { millimetresToCentimetres } from '../../domain/units';
import { addPost, createMinimumPostLayout, findSelectedOpening, finishPostDrag, movePostFromCentimetres, openingAxisSpans, postMoveRange, removePost, type OpeningSelection } from './postEditing';
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
};

export function PreviewViewer({ configuration, editPosts = false, resetViewToken = 0, onPostCentersChange, onSceneStatusChange }: {
  configuration: ConfigurationV1;
  editPosts?: boolean;
  resetViewToken?: number;
  onPostCentersChange?: (posts: PostCenter[]) => void;
  onSceneStatusChange?: (status: 'loading' | 'ready' | 'missing' | 'error') => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ViewerRuntime | null>(null);
  const lastFitKeyRef = useRef('');
  const [sceneStatus, setSceneStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedOpening, setSelectedOpening] = useState<OpeningSelection | null>(null);
  const dimensions = useMemo(() => previewDimensions(configuration), [configuration]);
  const visibleSceneStatus = sceneStatus === 'ready' && !dimensions ? 'missing' : sceneStatus;
  useEffect(() => onSceneStatusChange?.(visibleSceneStatus), [onSceneStatusChange, visibleSceneStatus]);
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
    scene.add(new AmbientLight(0xffffff, 1.5));
    const light = new DirectionalLight(0xffffff, 2);
    light.position.set(4, 8, 5);
    scene.add(light);
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
    const runtime: ViewerRuntime = { scene, camera, renderer, controls, render, group: null };
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
    if (runtime.group) {
      runtime.scene.remove(runtime.group);
      disposeSchematicGroup(runtime.group);
      runtime.group = null;
    }
    if (dimensions) {
      const group = createSchematicGroup(dimensions, configuration.roofMaterialId, { includeGroundGuide: true, includePostControls: true });
      group.userData.dimensions = dimensions;
      runtime.scene.add(group);
      runtime.group = group;
      const fitKey = [dimensions.widthM, dimensions.depthM, dimensions.rearHeightM, dimensions.frontHeightM].join(':');
      if (lastFitKeyRef.current !== fitKey) {
        fitCamera(runtime, dimensions, runtime.camera.aspect);
        lastFitKeyRef.current = fitKey;
      }
    } else {
      lastFitKeyRef.current = '';
    }
    runtime.render();
  }, [dimensions, configuration.roofMaterialId]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime?.group) return;
    markSelectedPost(runtime.group, selectedIndex);
    markSelectedOpening(runtime.group, activeOpening?.index ?? null);
    runtime.render();
  }, [activeOpening?.index, dimensions, selectedIndex]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime?.group) return;
    fitCamera(runtime, dimensionsFromGroup(runtime.group), runtime.camera.aspect);
    runtime.render();
  }, [resetViewToken]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !editPosts || !dimensions || !posts || widthMm === null || !onPostCentersChange) return;
    const canvas = runtime.renderer.domElement;
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const dragPlane = new Plane(new Vector3(0, 0, 1), -dimensions.depthM);
    let drag: { pointerId: number; index: number; initialMm: number; currentMm: number } | null = null;
    const setRay = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, runtime.camera);
    };
    const restorePost = (index: number, xMm: number) => {
      runtime.group?.traverse((object) => {
        if (object.userData.postIndex === index) object.position.x = xMm / 1000;
      });
      runtime.render();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !runtime.group) return;
      setRay(event);
      const hits = raycaster.intersectObjects(runtime.group.children, true);
      const hit = hits.find((entry) => Number.isInteger(entry.object.userData.postIndex));
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
      markSelectedPost(runtime.group, index);
      runtime.render();
      drag = { pointerId: event.pointerId, index, initialMm: post.xMm, currentMm: post.xMm };
      runtime.controls.enabled = false;
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId || !runtime.group) return;
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
      if (!drag || event.pointerId !== drag.pointerId) return;
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
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown, true);
      canvas.removeEventListener('pointermove', onPointerMove, true);
      canvas.removeEventListener('pointerup', onPointerUp, true);
      canvas.removeEventListener('pointercancel', onPointerCancel, true);
      canvas.removeEventListener('lostpointercapture', onLostPointerCapture, true);
      if (drag) restorePost(drag.index, drag.initialMm);
      runtime.controls.enabled = true;
    };
  }, [configuration.productId, dimensions, editPosts, onPostCentersChange, openingSpans, posts, widthMm]);

  const commitPosts = (next: PostCenter[] | null) => { if (next) onPostCentersChange?.(next); };

  const measurements = dimensions
    ? `${millimetresToCentimetres(configuration.dimensionsMm.width!)} × ${millimetresToCentimetres(configuration.dimensionsMm.depth!)} cm`
    : null;

  return (
    <div className="preview-viewer">
      <div className="preview-canvas" ref={hostRef} role="img" aria-label={measurements ? `Schematische 3D-Vorschau, ${measurements}` : 'Schematische 3D-Vorschau'} />
      {editPosts && sceneStatus !== 'error' && <div className="preview-editor" role="group" aria-label="Träger bearbeiten">
        <strong>Träger bearbeiten</strong>
        {widthMm === null || widthMm <= 0 ? <span>Bitte zuerst die Breite eingeben.</span> : <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => commitPosts(createMinimumPostLayout(configuration.productId, widthMm))}>Mindestanordnung</button>
            <button type="button" disabled={!posts || !addPost(configuration.productId, widthMm, posts)}
              onClick={() => posts && commitPosts(addPost(configuration.productId, widthMm, posts))}>Träger hinzufügen</button>
          </div>
          {posts?.length ? <>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {posts.map((post, index) => <button type="button" key={post.id} aria-pressed={selectedPostId === post.id}
                onClick={() => { setSelectedPostId(post.id); setSelectedOpening(null); }}>{index + 1}</button>)}
            </div>
            {openingSpans.length > 0 && <div role="group" aria-label="Felder zwischen Trägerachsen">
              <span>Felder zwischen Trägerachsen: </span>
              {openingSpans.map((span) => <button type="button" key={JSON.stringify([span.leftPostId, span.rightPostId])}
                aria-pressed={activeOpening?.index === span.index}
                onClick={() => { setSelectedPostId(null); setSelectedOpening(span); }}>
                Feld {span.index + 1}
              </button>)}
              {activeOpening && <span> Achsenabstand {millimetresToCentimetres(activeOpening.spanMm)} cm; kein lichtes Maß.</span>}
            </div>}
            <div className="preview-position-row">
            {selectedIndex >= 0 && selectedRange ? <>
              <label htmlFor="post-position">Achse ab links (cm)</label>
              <input id="post-position" type="number" min={selectedRange.minMm / 10} max={selectedRange.maxMm / 10}
                step="0.1" defaultValue={posts[selectedIndex].xMm / 10} key={`${selectedPostId}:${posts[selectedIndex].xMm}`}
                style={{ width: 82 }} onBlur={(event) => {
                  const next = movePostFromCentimetres(configuration.productId, widthMm, posts, selectedIndex, event.currentTarget.value);
                  event.currentTarget.value = String((next ?? posts)[selectedIndex].xMm / 10);
                  commitPosts(next);
                }} />
              <button type="button" disabled={!removePost(configuration.productId, widthMm, posts, selectedIndex)}
                onClick={() => {
                  commitPosts(removePost(configuration.productId, widthMm, posts, selectedIndex));
                  setSelectedPostId(null);
                }}>Entfernen</button>
            </> : <span>Wählen Sie einen Träger im Modell oder über seine Nummer.</span>}
            </div>
          </> : <span>Noch keine Träger gesetzt.</span>}
          <small>Im Modell antippen und entlang der Rinne ziehen. Abstände beziehen sich auf die Achsen.</small>
        </>}
      </div>}
      <p className="preview-note" role="status" aria-live="polite">
        {visibleSceneStatus === 'error' ? '3D-Vorschau nicht verfügbar. Ihre Angaben bleiben erhalten.'
          : sceneStatus === 'loading' ? '3D-Vorschau wird geladen …'
          : !dimensions ? 'Bitte geben Sie gültige Maße für die schematische Vorschau ein.'
            : `Schematische Vorschau · ${configuration.productId === 'premium' ? 'Premium' : 'Prime'} · ${measurements}. Keine Fertigungsdarstellung.`}
      </p>
    </div>
  );
}

function markSelectedPost(group: Group, selectedIndex: number): void {
  group.traverse((object) => {
    if (object.userData.selectionHalo) object.visible = object.userData.postIndex === selectedIndex;
    if (object.userData.postVisual && object instanceof Mesh && object.material instanceof MeshBasicMaterial) {
      object.material.color.setHex(object.userData.postIndex === selectedIndex ? 0x20272c : 0x68747d);
    }
  });
}

function markSelectedOpening(group: Group, selectedIndex: number | null): void {
  group.traverse((object) => {
    if (object.userData.openingIndex === undefined || !(object instanceof Mesh) || !(object.material instanceof MeshBasicMaterial)) return;
    object.material.opacity = object.userData.openingIndex === selectedIndex ? 0.16 : 0;
  });
}

function dimensionsFromGroup(group: Group): PreviewDimensions {
  return group.userData.dimensions as PreviewDimensions;
}

function fitCamera(runtime: ViewerRuntime, dimensions: PreviewDimensions, aspect: number): void {
  const { widthM, depthM, rearHeightM, frontHeightM } = dimensions;
  const target = new Vector3(widthM / 2, Math.max(rearHeightM, frontHeightM) / 2, depthM / 2);
  const distance = cameraDistanceForPreview(dimensions, runtime.camera.fov, aspect);
  runtime.camera.position.copy(target).add(new Vector3(0.65, 0.55, 0.75).normalize().multiplyScalar(distance));
  runtime.camera.far = Math.max(100, distance * 4);
  runtime.camera.updateProjectionMatrix();
  runtime.controls.target.copy(target);
  runtime.controls.update();
}
