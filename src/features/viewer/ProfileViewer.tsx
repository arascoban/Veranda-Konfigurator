import { useEffect, useRef } from 'react';
import { AmbientLight, Color, DirectionalLight, Group, HemisphereLight, Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer, Box3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { FrameColorId, ProductId } from '../../catalog/catalog';
import { createFinishMaterials, PartLibrary } from '../assembly/assemblyScene';
import { assemblySpecs } from '../assembly/spec';
import { disposeSchematicGroup } from './schematicGeometry';

export type ProfileViewStatus = 'loading' | 'ready' | 'error';

/** Part ids that make up one metre of the product's middle rafter (ASTRA-GP-03). */
const RAFTER_PARTS: Record<ProductId, string[]> = {
  prime: ['rafterMiddle'],
  premium: ['rafterMiddleBody', 'rafterMiddleTop', 'rafterMiddleTopFront', 'rafterMiddleTopRear'],
};

/**
 * Isolated viewer for the selected product's rafter profile: its own renderer, its own loading state,
 * released when the dialog closes. Never shows the other product's part.
 */
export function ProfileViewer({ productId, frameColor, onStatusChange }: {
  productId: ProductId; frameColor: FrameColorId; onStatusChange?: (status: ProfileViewStatus) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(onStatusChange);
  statusRef.current = onStatusChange;
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    statusRef.current?.('loading');
    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);
    const scene = new Scene();
    scene.background = new Color(0xf2eee8);
    scene.add(new AmbientLight(0xffffff, 0.6));
    scene.add(new HemisphereLight(0xffffff, 0xb8c0c6, 0.8));
    const key = new DirectionalLight(0xffffff, 1.4); key.position.set(3, 5, 4); scene.add(key);
    const fill = new DirectionalLight(0xffffff, 0.6); fill.position.set(-4, 2, -3); scene.add(fill);
    const camera = new PerspectiveCamera(40, 1, 0.01, 50);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    let group: Group | null = null;
    const render = () => renderer.render(scene, camera);
    controls.addEventListener('change', render);
    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const library = new PartLibrary(import.meta.env.BASE_URL);
    const spec = assemblySpecs[productId];
    const ids = RAFTER_PARTS[productId].filter((id) => spec.parts[id]);
    Promise.all(ids.map((id) => library.load(spec.parts[id].glb))).then((parts) => {
      if (cancelled) return;
      const finishes = createFinishMaterials('glass', frameColor);
      group = new Group();
      parts.forEach((part) => {
        const clone = part.clone(true);
        clone.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          const name = Array.isArray(object.material) ? object.material.map((m) => m.name).join(' ') : object.material.name;
          object.material = /Material2|Charcoal|Gummi|Rubber/i.test(name) ? finishes.rubber : finishes.aluminium;
          object.userData.sharedAsset = true;
        });
        group!.add(clone);
      });
      // Frame the metre-long piece diagonally so the cross-section and the top are both visible.
      const box = new Box3().setFromObject(group);
      const centre = box.getCenter(new Vector3());
      const radius = box.getSize(new Vector3()).length() / 2;
      group.position.sub(centre);
      scene.add(group);
      controls.target.set(0, 0, 0);
      camera.position.set(radius * 1.3, radius * 0.9, radius * 1.6);
      camera.near = radius / 50;
      camera.far = radius * 20;
      camera.updateProjectionMatrix();
      controls.update();
      render();
      statusRef.current?.('ready');
    }).catch(() => { if (!cancelled) statusRef.current?.('error'); });

    return () => {
      cancelled = true;
      observer.disconnect();
      controls.removeEventListener('change', render);
      controls.dispose();
      if (group) { scene.remove(group); disposeSchematicGroup(group); }
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [productId, frameColor]);
  return <div ref={hostRef} className="profile-viewer" role="img" aria-label="Trägerprofil des gewählten Produkts" />;
}
