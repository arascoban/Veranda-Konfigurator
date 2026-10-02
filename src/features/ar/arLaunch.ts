import {
  DirectionalLight, HemisphereLight, Matrix4, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, RingGeometry, Scene, Vector3, WebGLRenderer,
} from 'three';

/**
 * Device AR without a server (SW-07, 2 Oct 2026):
 * - iPhone/iPad: Quick Look opens a USDZ built on the device (blob URL, `<a rel="ar">`).
 * - Android (Chrome/ARCore): a WebXR "immersive-ar" session; a ring marks the floor, a tap places the model at
 *   metre scale, turned towards the viewer; another tap moves it.
 * Everything else gets the normal 3D view. Real-device acceptance is still open (needs the HTTPS deployment).
 */
export type ArSupport = { quickLook: boolean; webXr: boolean };

export async function detectArSupport(): Promise<ArSupport> {
  const anchor = document.createElement('a');
  const quickLook = Boolean(anchor.relList?.supports?.('ar'));
  let webXr = false;
  try { webXr = Boolean(await navigator.xr?.isSessionSupported('immersive-ar')); } catch { webXr = false; }
  return { quickLook, webXr };
}

/** Must run inside the click handler (user activation); the USDZ blob is prepared beforehand. */
export function openQuickLook(usdz: Blob, title: string): void {
  const url = URL.createObjectURL(usdz);
  const anchor = document.createElement('a');
  anchor.rel = 'ar';
  anchor.href = `${url}#allowsContentScaling=0&canonicalWebPageURL=${encodeURIComponent(window.location.href)}&checkoutTitle=${encodeURIComponent(title)}`;
  // Quick Look requires an image child to treat the link as an AR link.
  anchor.appendChild(document.createElement('img'));
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Starts the WebXR session; resolves when the session ends. `overlay` is shown over the camera image
 * (hint and close button) where DOM overlay is supported. Call from a click handler.
 */
export async function startWebXrAr(model: Object3D, overlay: HTMLElement, events: { onPlaced?: () => void; onStarted?: (end: () => void) => void } = {}): Promise<void> {
  const xr = navigator.xr;
  if (!xr) throw new Error('webxr_unavailable');
  const session = await xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: overlay },
  });
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local');
  const scene = new Scene();
  scene.add(new HemisphereLight(0xffffff, 0x8a8f94, 2));
  const sun = new DirectionalLight(0xffffff, 1.5);
  sun.position.set(2, 6, 3);
  scene.add(sun);
  const camera = new PerspectiveCamera();
  const reticle = new Mesh(new RingGeometry(0.12, 0.16, 40).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0x2f9dff }));
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);
  model.visible = false;
  scene.add(model);

  await renderer.xr.setSession(session);
  events.onStarted?.(() => { void session.end(); });
  const viewerSpace = await session.requestReferenceSpace('viewer');
  const hitTestSource = await session.requestHitTestSource?.({ space: viewerSpace });
  const position = new Vector3();
  const cameraPosition = new Vector3();
  const reticleMatrix = new Matrix4();

  const onSelect = () => {
    if (!reticle.visible) return;
    reticleMatrix.copy(reticle.matrix);
    position.setFromMatrixPosition(reticleMatrix);
    model.position.copy(position);
    // Face the viewer. Inside the root the garden side looks along −Z, so a yaw θ turns it to (−sin θ, −cos θ);
    // pick θ so that direction points from the model to the camera.
    cameraPosition.setFromMatrixPosition(renderer.xr.getCamera().matrixWorld);
    model.rotation.set(0, Math.atan2(position.x - cameraPosition.x, position.z - cameraPosition.z), 0);
    model.visible = true;
    events.onPlaced?.();
  };
  session.addEventListener('select', onSelect);

  renderer.setAnimationLoop((_time, frame) => {
    if (frame && hitTestSource) {
      const space = renderer.xr.getReferenceSpace();
      const hit = space ? frame.getHitTestResults(hitTestSource)[0] : undefined;
      const pose = hit && space ? hit.getPose(space) : undefined;
      reticle.visible = Boolean(pose);
      if (pose) reticle.matrix.fromArray(pose.transform.matrix);
    }
    renderer.render(scene, camera);
  });

  await new Promise<void>((resolve) => session.addEventListener('end', () => resolve(), { once: true }));
  session.removeEventListener('select', onSelect);
  hitTestSource?.cancel();
  renderer.setAnimationLoop(null);
  scene.remove(model);
  reticle.geometry.dispose();
  (reticle.material as MeshBasicMaterial).dispose();
  renderer.dispose();
}
