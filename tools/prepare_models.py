#!/usr/bin/env python3
"""Convert the SketchUp FBX part sources into web GLB assets and measure them.

Usage:  python3 tools/prepare_models.py [prime|premium|all]

- Sources under `Models/` (and the repaired caps under `PreparedModels/`) are never modified.
- Output: `public/models/<product>/<part>.glb` plus `src/assets/manifest/<product>.measured.json`
  with the measured bounding box (cm), triangle count and SHA-256 of source and output.
- Requires the `fbx2gltf` npm dev dependency (`npm ci`) and Python packages `trimesh numpy`.

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
        'rafterMiddle': 'Models/Terrassenüberdachungen/Premium/Trager mittel/tragermitte.fbx',
        'rafterSide': 'Models/Terrassenüberdachungen/Premium/Trager Seiten/trageseiten.fbx',
        'cover': 'Models/Terrassenüberdachungen/Premium/Zwischendeckel/Zwischendeckel.fbx',
        'panel': 'Models/Terrassenüberdachungen/Premium/DachElement/DachElementGlasUndPolycarbonat.fbx',
    },
}


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
    manifest = MANIFEST_DIR / f'{product}.measured.json'
    manifest.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'wrote {manifest.relative_to(ROOT)}')


if __name__ == '__main__':
    selection = sys.argv[1] if len(sys.argv) > 1 else 'prime'
    os.chdir(ROOT)
    for product in (PARTS.keys() if selection == 'all' else [selection]):
        prepare(product)
