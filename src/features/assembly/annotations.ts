import {
  BufferGeometry, CanvasTexture, DoubleSide, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial,
  PlaneGeometry, RingGeometry, Shape, ShapeGeometry, Sprite, SpriteMaterial, Vector3,
} from 'three';
import { millimetresToMetres } from '../../domain/units';
import type { Object3D } from 'three';
import type { DimensionLine } from './dimensions';

/** Screen colours of the interface (RAL 7016 direction); never a product colour. */
export const ANTHRACITE = 0x383e42;
/** Move arrows (user choice 30 Sep 2026). */
export const ARROW_GOLD = 0xd4af37;

/** One or two lines of text (split at "\n"); no background unless requested, so it sits directly on the floor. */
function textCanvas(text: string, options: { background?: string; color?: string; bold?: boolean }): HTMLCanvasElement {
  const scale = 2;
  const lines = text.split('\n');
  const font = `${options.bold ? '700' : '600'} ${26 * scale}px system-ui, sans-serif`;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = font;
  const paddingX = 12 * scale;
  const lineHeight = 34 * scale;
  canvas.width = Math.ceil(Math.max(...lines.map((line) => context.measureText(line).width)) + paddingX * 2);
  canvas.height = lineHeight * lines.length + 10 * scale;
  context.font = font;
  if (options.background) {
    context.fillStyle = options.background;
    context.beginPath();
    context.roundRect(0, 0, canvas.width, canvas.height, 10 * scale);
    context.fill();
  }
  context.fillStyle = options.color ?? '#20272B';
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  lines.forEach((line, index) => context.fillText(line, canvas.width / 2, 5 * scale + lineHeight * (index + 0.5)));
  return canvas;
}

/**
 * Text fixed in the scene (it does not turn with the camera): lying on the ground or standing parallel to
 * the wall, both readable from the garden side.
 */
export function createFlatLabel(text: string, plane: 'ground' | 'wall', heightM = 0.28, color = '#111111'): Mesh {
  const canvas = textCanvas(text, { bold: true, color });
  heightM = heightM * (text.split('\n').length > 1 ? 1.75 : 1);
  const texture = new CanvasTexture(canvas);
  const mesh = new Mesh(new PlaneGeometry(heightM * canvas.width / canvas.height, heightM),
    new MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, side: DoubleSide }));
  // Reading direction runs towards −X because the customer looks from the garden (facing +Z).
  if (plane === 'ground') mesh.rotation.x = -Math.PI / 2;
  mesh.rotateOnWorldAxis(new Vector3(0, 1, 0), Math.PI);
  mesh.renderOrder = 10;
  mesh.userData.disposable = true;
  return mesh;
}

/** Text on a canvas, drawn as a sprite that always faces the camera. */
export function createTextSprite(text: string, options: { heightM?: number; background?: string; color?: string; bold?: boolean } = {}): Sprite {
  const scale = 2;
  const font = `${options.bold ? '700' : '600'} ${26 * scale}px system-ui, sans-serif`;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = font;
  const paddingX = 16 * scale;
  const textWidth = context.measureText(text).width;
  canvas.width = Math.ceil(textWidth + paddingX * 2);
  canvas.height = 44 * scale;
  context.font = font;
  context.fillStyle = options.background ?? 'rgba(255,255,255,0.92)';
  const radius = 10 * scale;
  context.beginPath();
  context.roundRect(0, 0, canvas.width, canvas.height, radius);
  context.fill();
  context.fillStyle = options.color ?? '#20272B';
  context.textBaseline = 'middle';
  context.fillText(text, paddingX, canvas.height / 2);
  const texture = new CanvasTexture(canvas);
  const sprite = new Sprite(new SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  const heightM = options.heightM ?? 0.22;
  sprite.scale.set(heightM * canvas.width / canvas.height, heightM, 1);
  sprite.renderOrder = 10;
  sprite.userData.disposable = true;
  return sprite;
}

/** Dimension lines with end ticks and a label at the midpoint. */
export function createDimensionGroup(lines: DimensionLine[]): Group {
  const group = new Group();
  group.name = 'Bemaßungen';
  group.userData.dimensions = true;
  const positions: number[] = [];
  const tickM = 0.12;
  for (const line of lines) {
    const a = new Vector3(...line.fromMm.map(millimetresToMetres));
    const b = new Vector3(...line.toMm.map(millimetresToMetres));
    const tick = new Vector3(...line.tick).normalize().multiplyScalar(tickM / 2);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    for (const end of [a, b]) {
      positions.push(end.x - tick.x, end.y - tick.y, end.z - tick.z, end.x + tick.x, end.y + tick.y, end.z + tick.z);
    }
    const label = createFlatLabel(line.label, line.plane);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    // Ground labels sit just above the floor beside their line; wall labels stand next to the height line.
    if (line.plane === 'ground') label.position.copy(mid).add(new Vector3(0, 0.01, a.x === b.x ? 0 : -0.36));
    // Depth lines run along Z: their text runs along the line (reading towards the garden).
    if (line.plane === 'ground' && a.x === b.x) label.rotateOnWorldAxis(new Vector3(0, 1, 0), -Math.PI / 2);
    else label.position.copy(mid).add(new Vector3(line.tick[0] * 0.05, 0, 0));
    if (line.labelOffsetMm) label.position.add(new Vector3(...line.labelOffsetMm.map(millimetresToMetres)));
    group.add(label);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const segments = new LineSegments(geometry, new LineBasicMaterial({ color: ARROW_GOLD, depthTest: false }));
  segments.renderOrder = 9;
  group.add(segments);
  return group;
}

/** Flat arrow lying on the ground, pointing along +X (rotate for other directions). */
function flatArrow(lengthM: number, color: number): Mesh {
  const shape = new Shape();
  const shaft = lengthM * 0.6;
  const w = 0.022;
  shape.moveTo(0, -w); shape.lineTo(shaft, -w); shape.lineTo(shaft, -w * 3); shape.lineTo(lengthM, 0);
  shape.lineTo(shaft, w * 3); shape.lineTo(shaft, w); shape.lineTo(0, w); shape.closePath();
  const mesh = new Mesh(new ShapeGeometry(shape), new MeshBasicMaterial({ color, transparent: true, opacity: 0.95, polygonOffset: true, polygonOffsetFactor: -2 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 8;
  return mesh;
}

/** Ground ring plus the two flat move arrows shown around a selected post. */
export function createSelectionMarker(postIndex: number, zCentreM: number, halfWidthM: number): Group {
  const marker = new Group();
  marker.userData.postIndex = postIndex;
  marker.userData.moveArrows = true;
  marker.visible = false;
  const ring = new Mesh(new RingGeometry(halfWidthM + 0.06, halfWidthM + 0.085, 40),
    new MeshBasicMaterial({ color: ANTHRACITE, transparent: true, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.012, zCentreM);
  ring.renderOrder = 8;
  marker.add(ring);
  for (const direction of [1, -1]) {
    const arrow = flatArrow(0.3, ARROW_GOLD);
    arrow.position.set(direction * (halfWidthM + 0.12), 0.014, zCentreM);
    if (direction < 0) arrow.rotation.z = Math.PI;
    arrow.userData.arrowDirection = direction;
    marker.add(arrow);
  }
  return marker;
}

/** Writes how far the post may still move in each direction on top of its arrows (cm). */
export function setMarkerLimits(marker: Object3D, plusXcm: number, minusXcm: number, zCentreM: number, halfWidthM: number): void {
  for (const old of marker.children.filter((child) => child.userData.limitLabel)) {
    marker.remove(old);
    disposeAnnotations(old as Group);
  }
  const format = (cm: number) => `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(cm)} cm`;
  for (const [direction, cm] of [[1, plusXcm], [-1, minusXcm]] as const) {
    const label = createFlatLabel(format(cm), 'ground', 0.16, '#7a5f14');
    label.position.set(direction * (halfWidthM + 0.27), 0.016, zCentreM - 0.14);
    label.userData.limitLabel = true;
    marker.add(label);
  }
}

export function disposeAnnotations(group: Object3D): void {
  group.traverse((object) => {
    if (object instanceof Sprite) {
      object.material.map?.dispose();
      object.material.dispose();
    } else if (object instanceof Mesh || object instanceof LineSegments) {
      object.geometry.dispose();
      if (!Array.isArray(object.material)) object.material.dispose();
    }
  });
}
