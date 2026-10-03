#!/usr/bin/env python3
"""Convert the SketchUp FBX part sources into web GLB assets and measure them.

Usage:  python3 tools/prepare_models.py [prime|premium|glasschiebewand|all]

- Sources under `Models/` (and the repaired caps under `PreparedModels/`) are never modified.
- Output: `public/models/<product>/<part>.glb` plus `src/assets/manifest/<product>.measured.json`
  with the measured bounding box (cm), triangle count and SHA-256 of source and output.
- Requires the `fbx2gltf` npm dev dependency (`npm ci`) and Python packages `trimesh numpy shapely`.

The measured sizes are the facts the assembly code relies on; the placement rules themselves live
in `src/features/assembly/` and stay unconfirmed until the user has checked the mounting drawings.
"""
from __future__ import annotations

import hashlib
import json
import os
import platform
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / 'Models' / 'Terrassenüberdachungen'
OUT = ROOT / 'public' / 'models'
MANIFEST_DIR = ROOT / 'src' / 'assets' / 'manifest'

# partId → source FBX relative to the repository root. Extrusion/length axis and the cross-section are
# documented in the manifest TypeScript files, not here.
PARTS: dict[str, dict[str, str]] = {
    'prime': {
        'wallProfile': 'Models/Terrassenüberdachungen/Prime/Wandprofil/Wandprofil.fbx',
        'wallCap': 'Models/Terrassenüberdachungen/Prime/Wandprofil/WandprofilDeckelLinksRechts.fbx',
        'gutter': 'Models/Terrassenüberdachungen/Prime/Regenrinne/regenrinne.fbx',
        'gutterCap': 'Models/Terrassenüberdachungen/Prime/Regenrinne/regenrinneDeckelLinksRechts.fbx',
        'post': 'Models/Terrassenüberdachungen/Prime/Pfosten/PfostenMitGeradeDeckel.fbx',
        'postHalb': 'Models/Terrassenüberdachungen/Prime/Pfosten/PfostenMitHalbDeckel.fbx',
        'postRohr': 'Models/Terrassenüberdachungen/Prime/Pfosten/PfostenRohrMitGeradeDeckel.fbx',
        'postRohrHalb': 'Models/Terrassenüberdachungen/Prime/Pfosten/PfostenRohrMitHalbDeckel.fbx',
        'rafterMiddle': 'Models/Terrassenüberdachungen/Prime/Trager mittel/tragemittel.fbx',
        'rafterSide': 'Models/Terrassenüberdachungen/Prime/Trager Seiten/tragerseiten.fbx',
        'cover': 'Models/Terrassenüberdachungen/Prime/Zwischendeckel/Zwischendeckel.fbx',
        'panel': 'Models/Terrassenüberdachungen/Prime/DachElement/DachElementGlasUndPolycarbonat.fbx',
    },
    'premium': {
        'wallProfile': 'Models/Terrassenüberdachungen/Premium/Wandprofil/Wandprofil.fbx',
        'wallCapLeft': 'Models/Terrassenüberdachungen/Premium/Wandprofil/WandprofilDeckelLinks.fbx',
        'wallCapRight': 'Models/Terrassenüberdachungen/Premium/Wandprofil/WandprofilDeckelRechts.fbx',
        'gutter': 'Models/Terrassenüberdachungen/Premium/Regenrinne/Regenrinne.fbx',
        # Repaired copies (MODEL-001); the originals under Models/ are wrongly scaled.
        'gutterCapLeft': 'PreparedModels/Premium/Regenrinne/RegenrinneDeckelLinks.fbx',
        'gutterCapRight': 'PreparedModels/Premium/Regenrinne/RegenrinneDeckelRechts.fbx',
        'post': 'Models/Terrassenüberdachungen/Premium/Pfosten/Pfosten.fbx',
        'postRohr': 'Models/Terrassenüberdachungen/Premium/Pfosten/PfostenMitRohr.fbx',
        'rafterMiddle': 'Models/Terrassenüberdachungen/Premium/Trager mittel/tragermitte.fbx',
        'rafterSide': 'Models/Terrassenüberdachungen/Premium/Trager Seiten/trageseiten.fbx',
        'cover': 'Models/Terrassenüberdachungen/Premium/Zwischendeckel/Zwischendeckel.fbx',
        'panel': 'Models/Terrassenüberdachungen/Premium/DachElement/DachElementGlasUndPolycarbonat.fbx',
    },
}

# Glasschiebewand (2 Oct 2026, docs/Masse.md): single profiles per rail count (the full "N Schienen" models have
# other sizes; the owner named the single profiles authoritative) and one 90 cm glass leaf that the viewer scales.
# Every part is moved so its bounds start at the origin: X = length, Y = up, Z = depth (0 = garden side).
# The glass leaf keeps its height position (bottom profile 1.8 cm above the floor, glass from 7.8 cm).
for _rails in (3, 4, 5, 6):
    _folder = f'Models/Glasschiebewand/{_rails}'
    PARTS.setdefault('glasschiebewand', {}).update({
        f'rail{_rails}Top': f'{_folder}/ObereSchiene.fbx',
        f'rail{_rails}Bottom': f'{_folder}/{"UnterSchine" if _rails == 4 else "UnterSchiene"}.fbx',
        f'rail{_rails}Side': f'{_folder}/U_Profil.fbx',
    })
PARTS['glasschiebewand']['glassLeaf'] = 'Models/Glasschiebewand/Glas90cm.fbx'
# Same leaf with the vertical edge strip (brush seal) on its left edge (3 Oct 2026).
PARTS['glasschiebewand']['glassLeafEdge'] = 'Models/Glasschiebewand/Glas90cmMitBuerste.fbx'
NORMALISE = {'glasschiebewand': {'keepY': ['glassLeaf', 'glassLeafEdge']}}


def normalise_part(product: str, part_id: str, path: Path) -> None:
    """Moves the part to the origin (see NORMALISE); the source FBX positions are arbitrary."""
    import numpy as np
    import trimesh

    scene = trimesh.load(str(path), force='scene')
    lo, _ = scene.bounds
    shift = -np.asarray(lo, dtype=float)
    if part_id in NORMALISE[product].get('keepY', []):
        shift[1] = 0.0
    out = trimesh.Scene()
    for index, node in enumerate(scene.graph.nodes_geometry):
        transform, geometry_name = scene.graph[node]
        mesh = scene.geometry[geometry_name].copy()
        mesh.apply_transform(transform)
        mesh.apply_translation(shift)
        material = getattr(mesh.visual, 'material', None)
        name = getattr(material, 'name', None) or 'part'
        # Source textures are not used on the web; the material name decides the finish in the viewer.
        mesh.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name=name))
        out.add_geometry(mesh, node_name=f'{part_id}{index}', geom_name=f'{part_id}{index}')
    out.export(str(path))


def fbx2gltf_binary() -> Path:
    system = {'Linux': 'Linux', 'Darwin': 'Darwin', 'Windows': 'Windows_NT'}[platform.system()]
    binary = ROOT / 'node_modules' / 'fbx2gltf' / 'bin' / system / ('FBX2glTF.exe' if system == 'Windows_NT' else 'FBX2glTF')
    if not binary.exists():
        sys.exit('fbx2gltf binary missing; run `npm ci` first')
    binary.chmod(binary.stat().st_mode | 0o111)
    return binary


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b''):
            digest.update(chunk)
    return digest.hexdigest()


def is_lfs_pointer(path: Path) -> bool:
    with path.open('rb') as handle:
        return handle.read(40).startswith(b'version https://git-lfs')


def measure(path: Path) -> dict:
    import numpy as np
    import trimesh

    scene = trimesh.load(str(path), force='scene')
    lo, hi = scene.bounds
    triangles = int(sum(len(geometry.faces) for geometry in scene.geometry.values()))
    materials = sorted({
        str(getattr(getattr(geometry.visual, 'material', None), 'name', '') or '')
        for geometry in scene.geometry.values()
    } - {''})
    return {
        'boundsMinCm': [round(float(value) * 100, 3) for value in lo],
        'boundsMaxCm': [round(float(value) * 100, 3) for value in hi],
        'sizeCm': [round(float(value) * 100, 3) for value in (np.asarray(hi) - np.asarray(lo))],
        'triangles': triangles,
        'meshes': len(scene.geometry),
        'materials': materials,
    }


# Premium rafters: the 1 m body carries the roof; the top strip, cover and seals overhang 5 cm at the
# gutter and 2 cm at the wall. They are split so the body can be stretched while the overhangs keep their size.
SPLIT_RAFTERS = {'premium': ['rafterMiddle', 'rafterSide']}
# Posts: the drain outlet (bottom) and cover/top fittings must not stretch. Bottom 0–25 cm and top 75–100 cm stay
# fixed; only the middle 50 cm is scaled to the post height (three-slice).
SPLIT_POSTS = {'prime': ['post', 'postHalb', 'postRohr', 'postRohrHalb'], 'premium': ['post', 'postRohr']}
POST_SLICES_M = (0.25, 0.75)


def split_post(product: str, part_id: str, target_dir: Path) -> dict[str, Path]:
    import trimesh

    scene = trimesh.load(str(target_dir / f'{part_id}.glb'), force='scene')
    lo, hi = POST_SLICES_M
    groups: dict[str, list] = {'Bottom': [], 'Mid': [], 'Top': []}
    for node in scene.graph.nodes_geometry:
        transform, geometry_name = scene.graph[node]
        mesh = scene.geometry[geometry_name].copy()
        mesh.apply_transform(transform)
        bottom = mesh.slice_plane([0, lo, 0], [0, -1, 0], cap=False)
        middle = mesh.slice_plane([0, lo, 0], [0, 1, 0], cap=False).slice_plane([0, hi, 0], [0, -1, 0], cap=False)
        top = mesh.slice_plane([0, hi, 0], [0, 1, 0], cap=False)
        for key, piece in (('Bottom', bottom), ('Mid', middle), ('Top', top)):
            if piece is not None and len(piece.faces):
                material = getattr(mesh.visual, 'material', None)
                name = getattr(material, 'name', None) or 'part'
                piece.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name=name))
                groups[key].append(piece)
    outputs = {}
    for key, meshes in groups.items():
        out_scene = trimesh.Scene()
        for index, mesh in enumerate(meshes):
            out_scene.add_geometry(mesh, node_name=f'{key}{index}', geom_name=f'{key}{index}')
        path = target_dir / f'{part_id}{key}.glb'
        out_scene.export(str(path))
        outputs[f'{part_id}{key}'] = path
    return outputs


def split_rafter(product: str, part_id: str, target_dir: Path) -> dict[str, Path]:
    import numpy as np
    import trimesh

    scene = trimesh.load(str(target_dir / f'{part_id}.glb'), force='scene')
    groups: dict[str, list] = {'Body': [], 'Top': [], 'TopFront': [], 'TopRear': []}
    for node in scene.graph.nodes_geometry:
        transform, geometry_name = scene.graph[node]
        mesh = scene.geometry[geometry_name].copy()
        mesh.apply_transform(transform)
        lo, hi = mesh.bounds
        if lo[0] > -0.001 and hi[0] < 1.001:
            groups['Body'].append(mesh)
            continue
        # Overhanging parts: cut at x = 0 and x = 1 m (open cuts sit inside the joined profile).
        front = mesh.slice_plane([0, 0, 0], [-1, 0, 0], cap=False)
        rear = mesh.slice_plane([1, 0, 0], [1, 0, 0], cap=False)
        middle = mesh.slice_plane([0, 0, 0], [1, 0, 0], cap=False).slice_plane([1, 0, 0], [-1, 0, 0], cap=False)
        for key, piece in (('TopFront', front), ('Top', middle), ('TopRear', rear)):
            if piece is not None and len(piece.faces):
                piece.visual = mesh.visual.copy() if hasattr(mesh.visual, 'copy') else mesh.visual
                groups[key].append(piece)
    outputs = {}
    for key, meshes in groups.items():
        out_scene = trimesh.Scene()
        for index, mesh in enumerate(meshes):
            material = getattr(mesh.visual, 'material', None)
            name = getattr(material, 'name', None) or 'part'
            # Keep the source material name so the viewer can tell seals from aluminium.
            mesh.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(name=name))
            out_scene.add_geometry(mesh, node_name=f'{key}{index}', geom_name=f'{key}{index}')
        path = target_dir / f'{part_id}{key}.glb'
        out_scene.export(str(path))
        outputs[f'{part_id}{key}'] = path
    return outputs


def prepare(product: str) -> None:
    binary = fbx2gltf_binary()
    out_dir = OUT / product
    out_dir.mkdir(parents=True, exist_ok=True)
    report = {'product': product, 'unit': 'cm', 'upAxis': 'Y', 'converter': 'fbx2gltf 0.9.7-p1', 'parts': {}}
    for part_id, relative in PARTS[product].items():
        source = ROOT / relative
        if not source.exists():
            sys.exit(f'{relative}: source missing')
        if is_lfs_pointer(source):
            sys.exit(f'{relative}: Git LFS pointer only; run `git lfs pull` first')
        target = out_dir / f'{part_id}.glb'
        result = subprocess.run(
            [str(binary), '--binary', '--input', str(source), '--output', str(target.with_suffix(''))],
            capture_output=True, text=True, check=False,
        )
        if result.returncode != 0 or not target.exists():
            sys.exit(f'{relative}: conversion failed\n{result.stdout}\n{result.stderr}')
        warnings = sorted({line.strip() for line in result.stdout.splitlines() if line.strip().startswith('Warning')})
        if product in NORMALISE:
            normalise_part(product, part_id, target)
        entry = {
            'source': relative,
            'sourceSha256': sha256(source),
            'glb': f'models/{product}/{part_id}.glb',
            'glbBytes': target.stat().st_size,
            'glbSha256': sha256(target),
            'converterWarnings': warnings,
            **measure(target),
        }
        report['parts'][part_id] = entry
        print(f"{product}/{part_id:14s} {entry['glbBytes']:8d} B  {entry['triangles']:6d} tri  size cm {entry['sizeCm']}")
        splits = {}
        if part_id in SPLIT_RAFTERS.get(product, []):
            splits = split_rafter(product, part_id, out_dir)
        elif part_id in SPLIT_POSTS.get(product, []):
            splits = split_post(product, part_id, out_dir)
        if splits:
            for split_id, split_path in splits.items():
                split_entry = {
                    'source': relative, 'sourceSha256': entry['sourceSha256'], 'derivedFrom': part_id,
                    'glb': f'models/{product}/{split_id}.glb', 'glbBytes': split_path.stat().st_size,
                    'glbSha256': sha256(split_path), 'converterWarnings': [], **measure(split_path),
                }
                report['parts'][split_id] = split_entry
                print(f"{product}/{split_id:14s} {split_entry['glbBytes']:8d} B  {split_entry['triangles']:6d} tri  size cm {split_entry['sizeCm']}")
    manifest = MANIFEST_DIR / f'{product}.measured.json'
    manifest.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'wrote {manifest.relative_to(ROOT)}')


if __name__ == '__main__':
    selection = sys.argv[1] if len(sys.argv) > 1 else 'prime'
    os.chdir(ROOT)
    for product in (PARTS.keys() if selection == 'all' else [selection]):
        prepare(product)
