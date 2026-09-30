#!/usr/bin/env python3
"""Draws the provisional mounting references (side section) for the user to confirm or correct.

Output: design/review/MONTAGEBEZUEGE-<product>.svg — one dimensioned side section per product with the
numbers that `src/catalog/attachmentReference.ts` and `src/features/assembly/spec.ts` currently use.
Everything drawn here was read from the SketchUp reference assemblies and is NOT confirmed product data.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'design' / 'review'

# Same numbers as spec.ts / attachmentReference.ts (mm), plus the reference assembly they came from.
PRODUCTS = {
    'prime': dict(
        label='Prime', source='Prime500x300.fbx', reference_depth=3025, reference_front=2085, reference_rear=2400,
        gutter=dict(depth=165, height=160, beyond_post=26), wall=dict(depth=55, height=160),
        post=dict(towards_garden=110, into_gutter=15), rafter=dict(height=98, z_front=53, z_rear=35, front_up=31, rear_up=8),
        panel_below_top=11,
    ),
    'premium': dict(
        label='Premium', source='Premium500x300.fbx', reference_depth=2996, reference_front=2184, reference_rear=2810,
        gutter=dict(depth=204, height=166, beyond_post=32), wall=dict(depth=63, height=190),
        post=dict(towards_garden=135, into_gutter=16), rafter=dict(height=118, z_front=132, z_rear=18, front_up=25, rear_up=13),
        panel_below_top=13,
    ),
}

W, H = 1400, 1000


def svg_for(key: str, p: dict) -> str:
    import math
    D, Hf, Hr = p['reference_depth'], p['reference_front'], p['reference_rear']
    g, w, po, r = p['gutter'], p['wall'], p['post'], p['rafter']
    front = (-D + r['z_front'], Hf + r['front_up'])
    rear = (-r['z_rear'], Hr + r['rear_up'])
    run, rise = rear[0] - front[0], rear[1] - front[1]
    ang = math.degrees(math.atan2(rise, run))
    length = math.hypot(run, rise)
    nx, ny = -rise / length, run / length  # perpendicular to the rafter, upwards
    rh = r['height']
    lift = rh - p['panel_below_top']
    rafter = [front, rear, (rear[0] + nx * rh, rear[1] + ny * rh), (front[0] + nx * rh, front[1] + ny * rh)]
    panel = [(front[0] + nx * lift, front[1] + ny * lift), (rear[0] + nx * lift, rear[1] + ny * lift),
             (rear[0] + nx * (lift + 7), rear[1] + ny * (lift + 7)), (front[0] + nx * (lift + 7), front[1] + ny * (lift + 7))]

    class View:
        """Maps section coordinates (z ≤ 0 towards the garden, y up, mm) to pixels."""
        def __init__(self, scale, ox, oy):
            self.s, self.ox, self.oy = scale, ox, oy
        def X(self, z): return self.ox + z * self.s
        def Y(self, y): return self.oy - y * self.s
        def poly(self, points, fill, stroke='#20272B', width=1.2):
            pts = ' '.join(f'{self.X(z):.1f},{self.Y(y):.1f}' for z, y in points)
            return f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'
        def rect(self, z0, y0, dz, dy, fill):
            return self.poly([(z0, y0), (z0 + dz, y0), (z0 + dz, y0 + dy), (z0, y0 + dy)], fill)
        def dim_v(self, z, y0, y1, text, side=1, dy=0):
            x = self.X(z); a, b = self.Y(y0), self.Y(y1)
            return (f'<line x1="{x}" y1="{a}" x2="{x}" y2="{b}" stroke="#A4263D" stroke-width="1.2"/>'
                    f'<line x1="{x-5}" y1="{a}" x2="{x+5}" y2="{a}" stroke="#A4263D"/><line x1="{x-5}" y1="{b}" x2="{x+5}" y2="{b}" stroke="#A4263D"/>'
                    f'<text x="{x + 8*side}" y="{(a+b)/2 + 4 + dy}" font-size="13" font-weight="600" fill="#A4263D" text-anchor="{"start" if side>0 else "end"}">{text}</text>')
        def dim_h(self, y, z0, z1, text, above=True):
            yy = self.Y(y); a, b = self.X(z0), self.X(z1)
            return (f'<line x1="{a}" y1="{yy}" x2="{b}" y2="{yy}" stroke="#A4263D" stroke-width="1.2"/>'
                    f'<line x1="{a}" y1="{yy-5}" x2="{a}" y2="{yy+5}" stroke="#A4263D"/><line x1="{b}" y1="{yy-5}" x2="{b}" y2="{yy+5}" stroke="#A4263D"/>'
                    f'<text x="{(a+b)/2}" y="{yy - 7 if above else yy + 17}" font-size="13" font-weight="600" fill="#A4263D" text-anchor="middle">{text}</text>')
        def parts(self, with_ground=True):
            out = []
            if with_ground:
                out.append(f'<rect x="{self.X(0)}" y="{self.Y(Hr + 350)}" width="24" height="{self.Y(0)-self.Y(Hr+350)}" fill="#d9dee1" stroke="#738089"/>')
                out.append(f'<line x1="{self.X(-D - 300)}" y1="{self.Y(0)}" x2="{self.X(0) + 24}" y2="{self.Y(0)}" stroke="#738089" stroke-width="2"/>')
            else:
                out.append(f'<rect x="{self.X(0)}" y="{self.Y(Hr + 400)}" width="60" height="{self.Y(Hr - 400) - self.Y(Hr + 400)}" fill="#d9dee1" stroke="#738089"/>')
            out.append(self.rect(-D, 0, po['towards_garden'], Hf + po['into_gutter'], '#9aa3a8'))
            out.append(self.rect(-D - g['beyond_post'], Hf, g['depth'], g['height'], '#c4cacd'))
            out.append(self.rect(-w['depth'], Hr, w['depth'], w['height'], '#c4cacd'))
            out.append(self.poly(rafter, '#8e979c'))
            out.append(self.poly(panel, '#bcd3de', '#6d8f9f'))
            return out

    body = []

    def window(view, title, x0, y0, wpx, hpx, items):
        cid = f'clip{x0}{y0}'
        return [f'<rect x="{x0}" y="{y0}" width="{wpx}" height="{hpx}" fill="#f6f8f9" stroke="#738089"/>',
                f'<text x="{x0 + 10}" y="{y0 + 20}" font-size="14" font-weight="700" fill="#20272B">{title}</text>',
                f'<clipPath id="{cid}"><rect x="{x0}" y="{y0 + 28}" width="{wpx}" height="{hpx - 28}"/></clipPath>',
                f'<g clip-path="url(#{cid})">', *view.parts(with_ground=False), *items, '</g>']

    # Garden-side detail, 1 px = 1 mm: post front at x0+240, gutter underside at y0+300.
    gx, gy, gw, gh = 40, 70, 640, 400
    gd = View(1.0, gx + 240 + D, gy + 300 + Hf)
    body += window(gd, 'Detail Gartenseite (1 px = 1 mm)', gx, gy, gw, gh, [
        gd.dim_v(-D - 46, Hf, front[1], f"① {r['front_up']} mm", -1),
        gd.dim_h(Hf + g['height'] + 40, -D, front[0], f"③ {r['z_front']} mm", True),
        gd.dim_h(Hf - 30, -D - g['beyond_post'], -D, f"⑤ {g['beyond_post']} mm", False),
        gd.dim_v(-D + po['towards_garden'] + 30, Hf, Hf + po['into_gutter'], f"⑥ {po['into_gutter']} mm", 1),
        f'<text x="{gx + 12}" y="{gd.Y(Hf) + 4}" font-size="12" fill="#53616A">Unterkante Rinne = Höhe vorne</text>',
        f'<text x="{gd.X(-D + po["towards_garden"] + 30)}" y="{gd.Y(Hf / 2) if False else gy + gh - 12}" font-size="12" fill="#53616A">Pfosten (Vorderseite links)</text>',
        f'<text x="{gd.X(front[0] + 120)}" y="{gd.Y(front[1] + rh / 2) + 4}" font-size="12" fill="#ffffff">Träger</text>',
        f'<text x="{gd.X(-D - g["beyond_post"] + 20)}" y="{gd.Y(Hf + g["height"] - 18)}" font-size="12" fill="#20272B">Rinne</text>',
    ])

    # Wall-side detail: wall face at x0+540, wall-profile underside at y0+300.
    wx, wy, ww, wh = 720, 70, 640, 400
    wd = View(1.0, wx + 540, wy + 300 + Hr)
    body += window(wd, 'Detail Wandseite (1 px = 1 mm)', wx, wy, ww, wh, [
        wd.dim_v(-w['depth'] - 40, Hr, rear[1], f"② {r['rear_up']} mm", -1, 16),
        wd.dim_h(Hr + w['height'] + 40, rear[0], 0, f"④ {r['z_rear']} mm", True),
        f'<text x="{wx + 12}" y="{wd.Y(Hr) + 18}" font-size="12" fill="#53616A">Unterkante Wandprofil = Höhe hinten</text>',
        f'<text x="{wd.X(-w["depth"]) + 6}" y="{wd.Y(Hr + w["height"] - 18)}" font-size="12" fill="#20272B">Wandprofil</text>',
        f'<text x="{wd.X(0) + 8}" y="{wy + 60}" font-size="12" fill="#53616A">Wand</text>',
        f'<text x="{wd.X(rear[0] - 200)}" y="{wd.Y(rear[1] + rh / 2 + 25) + 4}" font-size="12" fill="#ffffff">Träger</text>',
    ])

    # Overview bottom right (0.13 px/mm).
    ov = View(0.13, 1330, 935)
    body += ov.parts()
    body.append(ov.dim_v(-D - g['beyond_post'] - 40, 0, Hf, f'Höhe vorne {Hf} mm', -1))
    body.append(ov.dim_v(-w['depth'] - 200, 0, Hr, f'Höhe hinten {Hr} mm', -1))
    body.append(ov.dim_h(-120, -D, 0, f'Tiefe {D} mm', above=False))
    body.append(f'<text x="{ov.X(-D)}" y="{ov.Y(Hr + 360)}" font-size="13" fill="#53616A">Übersicht Referenzmodell — Wand rechts, Garten links</text>')

    header = (f'<text x="40" y="30" font-size="22" font-weight="700" fill="#20272B">{p["label"]} — vorläufige Montagebezüge (Seitenschnitt)</text>'
              f'<text x="40" y="52" font-size="13" fill="#53616A">Quelle: {p["source"]}, abgelesen am 30.09.2026. Nummern ①–⑥ bitte bestätigen oder korrigieren. '
              f'Referenzmodell: Dachneigung ≈ {ang:.1f}°, Trägerlänge ≈ {length/10:.1f} cm.</text>')
    legend_y = 505
    legend = ''.join(f'<text x="40" y="{legend_y + i*20}" font-size="13" fill="#20272B">{t}</text>' for i, t in enumerate([
        f"① Trägerunterkante am Gartenende: {r['front_up']} mm über der Unterkante der Regenrinne.",
        f"② Trägerunterkante am Wandende: {r['rear_up']} mm über der Unterkante des Wandprofils.",
        f"③ Träger beginnt {r['z_front']} mm hinter der Pfostenvorderseite.",
        f"④ Träger endet {r['z_rear']} mm vor der Wandfläche.",
        f"⑤ Rinnenvorderkante {g['beyond_post']} mm vor der Pfostenvorderseite; Rinne {g['depth']} × {g['height']} mm.",
        f"⑥ Pfostenoberkante {po['into_gutter']} mm über der Rinnenunterkante (Pfosten steckt in der Rinne).",
        f"Wandprofil {w['depth']} × {w['height']} mm, Träger {rh} mm hoch, Dachplatte {p['panel_below_top']} mm unter der Trägeroberkante.",
        "Dachneigung = atan((Höhe hinten + ② − Höhe vorne − ①) / (Tiefe − ③ − ④)); zulässig 5°–12°.",
        "Grau = Aluminium, blau = Dachplatte, rot = Maße. Nicht bestätigte Produktdaten.",
    ]))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="system-ui, sans-serif">'
            f'<rect width="{W}" height="{H}" fill="#ffffff"/>{header}{legend}{"".join(body)}</svg>')


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for key, product in PRODUCTS.items():
        target = OUT / f'MONTAGEBEZUEGE-{key}.svg'
        target.write_text(svg_for(key, product), encoding='utf-8')
        print('wrote', target.relative_to(ROOT))
