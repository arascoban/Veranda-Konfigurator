# Handoff — Veranda-Konfigurator

Last updated: 2 October 2026. State at commit `6128ffb` on `main` (and on the work branch `claude/beautiful-gates-t1e5it`).

**V2 redesign (2 Oct 2026):** branch `Veranda-KonfiguratorV2` holds the new layout (left glass column, viewer controls, Feld/Ausstattung with radial menu), `vercel.json` and AR from the real assembly (QR on desktop → AR page on the phone; iOS Quick Look, Android WebXR). See `claude_implementation.md` §14–§15; not merged into `main` yet. Real-device AR acceptance needs the HTTPS deployment.

**3 Oct 2026:** all Markdown documents now live in `docs/`. Glasschiebewand is built from the real profiles (§16); further Ausstattung rules in `docs/Ausstatungen_Kurallar.md`, sizes in `docs/Masse.md`.

Read this file first, then `AGENTS.md`. Everything below is a summary; the detailed records live in the files listed under "Where to read more".

## 1. What this project is

- A German-language 3D configurator for terrace roofs (Terrassenüberdachung). Two separate sales products: **Prime** and **Premium**.
- Stack: React 19, TypeScript, Vite 7, three.js 0.186, zustand, zod v4, vitest, pdf-lib.
- Deployment target: Vercel, opened from a subdomain. The main site (Wix now, WordPress later) only links to it. Not deployed yet; no `vercel.json` yet.
- No payment or purchase in the first release.

## 2. Working rules (from `AGENTS.md`, binding)

- Customer UI, PDF and e-mail are **German**. Internal docs are Turkish. The owner (arascoban) writes in Turkish; answer in Turkish.
- Claude has taken over the roles Astra (plan/review) and Luna/Sol (implementation).
- Record every piece of work in `claude_implementation.md` as a new numbered section. The last one is §13.
- Record every error in `Problems.md` as a unique entry with the `CLAUDE-` prefix. Never delete old entries. One reasoned fix attempt; if it fails, leave it `Açık` and report.
- **Never invent** product limits, prices or engineering rules. Ask the owner when something is missing.
- No secrets, tokens or customer personal data in logs or docs.
- 3D, price, PDF and AR must come from the same configuration revision.
- Git flow used so far: commit on `claude/beautiful-gates-t1e5it`, push, fast-forward `main`, push `main`. The owner asked for this ("main ile birleştir"). Commit messages are in German.
- Ask the owner before starting when something is unclear ("sorun varsa sor başlamadan" is a standing request).

## 3. Commands

```bash
npx npm@11.12.1 ci        # install; npm 10 rewrites the lockfile (CLAUDE-P07-001)
npm run dev               # Vite on http://127.0.0.1:5173
npm run check             # tsc --noEmit
npm test                  # vitest, 106 tests passing
npm run build             # type check + production build
npm run models:prepare    # FBX → GLB + measured JSON (needs fbx2gltf, trimesh, numpy, shapely)
```

Development-only URL parameters for screenshots:

- `?d03camera=px,py,pz,tx,ty,tz` pins the camera (metres).
- `?d03loop=0` stops the continuous render loop. Use it for Playwright on software WebGL, otherwise clicks time out.
- `window.__d03runtime` exposes the viewer runtime (renderer, composer, gtao, sun) in development.

Playwright is installed globally: `PW=$(npm root -g)/playwright`. Launch Chromium with `--use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist`. The Vite dev server sometimes dies between turns; restart it before browser checks.

## 4. Coordinate and naming conventions

- Scene frame: X runs left → right **as seen from inside**, Y up, wall face at z = 0, garden towards −Z. Units in the domain are millimetres; the scene is in metres.
- The customer looks **from the garden**, so every customer-facing "links/rechts", "Pfosten 1", "Front 1", "Dachfeld 1" is garden view. Conversion: `x_garden = W − x`.
- Wording: "Pfosten" (post), not "Träger". "Träger" means rafter.

## 5. Product rules already confirmed by the owner

Full list in `URUN_VE_OLCU_KURALLARI.md` (sections 2, 8, 9). Key points:

- Width 200–1200 cm, depth min 100 cm (glass max 400, polycarbonate max 500), front height 50–500 cm, slope 5–12°.
- New draft: 500 × 300 cm, front 230 cm, 8°. Depth or front-height changes keep the angle; rear-height changes change the angle.
- Posts: Prime 11 × 13,5 cm, Premium 13 × 13,5 cm. Clear opening ≥ 90 cm face to face. Outer post face at most 50 cm from the gutter end. Centre gap 400 cm (Premium 600 cm up to 600 cm width).
- Drain pipe on one end post (default garden-left), on both ends above 800 cm. Prime post cover Gerade/Halb.
- Frame colours RAL 7016 Anthrazit (default) and RAL 9001 Cremeweiß.
- Roof finishes: VSG 8 mm Klar / Opal (Milchglas) / Getönt, Polycarbonat 16 mm Klar / Opal / Bronze (Anthrazit). No 10 mm glass. Tone can be set per roof field within the roof's family. At most +2 roof fields above the minimum.
- Awning (Aufglas or Unterglas, glass roofs only): max 600 × 400 cm, min 100 × 100 cm. Above 600 cm width a single awning gets Milchglas side fields of max(15 cm, (W−600)/2), +2 rafters, no extra fields. Side fields over 86 cm (W > 772 cm) force two awnings with editable widths. Depth is not entered: Unterglas runs from the post back to the wall, Aufglas along the rafter cover. Motor side left/right from the garden. Fabrics are placeholders.
- LED: per rafter 0 to one per metre of depth (rounded at 50 cm: 349 → 3, 350 → 4), never on the two corner rafters, default 2 when added. Control Schaltbar or Dimmbar. Not shown in 3D.
- Price: base price from the cell one step up (100 cm width / 50 cm depth), minimum axes 300/200 cm (`basePriceGrid.ts`). Real prices not supplied yet.

## 6. What works today

- **Konstruktion:** dimensions with ±1 cm, A–E figure, read-only slope and total height, posts editable in the model (hover, click, drag with live dimensions and remaining travel) and in the list, post buttons, cover style, drain side, colour swatches.
- **Dach:** six roof-finish cards, collapsible Dachfelder list with per-field tone, roof fields selectable in the model, awning panel with placeholder 3D box, LED panel. "+" turns into a green check; clicking the check removes the add-on.
- **Viewer:** real GLB assembly for both products, Bemaßungen layer (gold lines, black labels), undo/redo/reset, quality Niedrig / Mittel (AO) / Hoch (AO + shadows) with FPS badge and automatic fallback below 60 FPS, four shadow-free studio lights, other product preloaded in the background.
- **Notices:** bottom-left cards over the 3D view, 6 s progress bar, close button (`src/state/noticeStore.ts`, `src/ui/NoticeStack.tsx`). Use them for any future automatic adjustment.
- **Tooltips:** all explanations are "i" tooltips (`src/ui/InfoTip.tsx`, rendered in a portal and kept on screen).
- **PDF:** German A4 Planungsentwurf with five views rendered from the real assembly (`src/features/pdf/service/captureViews.ts`), garden-view post table, drain and cover rows, schematic plan at the end. In development the button reads "Test-PDF".
- **Profile dialog:** isolated viewer of the selected product's rafter (`src/features/viewer/ProfileViewer.tsx`).
- **Save/open:** one local draft in the same browser.

## 7. Open work

Waiting on the owner:

1. **Mounting offsets ①–⑥:** approve or correct `design/review/MONTAGEBEZUEGE-prime.png` and `-premium.png`; then set `confirmed: true` in `src/catalog/attachmentReference.ts`.
2. **Ausstattung:** product list per field (Glasschiebewand with 3/4/5/6-rail width table, Festglas, Aluminiumwand, Zip/Senkrechtmarkise, side triangle), limits and models. `openingOptions` is still `z.array(z.never())`.
3. **Awning:** 3D models (Aufglas/Unterglas) and real fabric swatches with names.
4. **Pictures:** further section icons if wanted; PBR materials for aluminium, glass and polycarbonate later.
5. **Prices:** base grid, glass/polycarbonate per m², awning, LED per piece (Schaltbar/Dimmbar), extra roof fields.
6. **PDF by e-mail (Astra GP-10/11):** e-mail provider (e.g. Resend/Postmark), sender address and domain, terms-of-use text with version, store for idempotency and rate limits (e.g. Vercel KV). See `Problems.md` → `CLAUDE-GP-001`.
7. Logo, contact details, PDF header.

Can be done without the owner:

- ~~Vercel preparation~~, ~~AR from the real assembly + QR + entry page~~, ~~opening data model~~: done on `Veranda-KonfiguratorV2` (§14–§15).
- ~~Glasschiebewand~~ (§16–§17), ~~Ausstattung rules 1–5 and 7, Aluminiumwand, 50×100, Giebeldreieck variants, side division, draggable 50×100~~ (§18). Next: Seitenwand lichtdurchlässig from WD-55 (Klar/Milch), Senkrechtmarkise, Freistehend (A-Profil, L-Kapak, 50×100; side field width shrinks), Zip-Markise in front of a Glasschiebewand once its model exists (rule 6). Left: connect the Vercel project/domain, then test AR on Android and iPhone.
- Mobile/tablet layout and touch check (SW-10).

Gaps compared with Schweng, from `schweng.md`: side openings and side posts, Freistehend, Unterzugträger, moving posts inwards up to 1 m (needs a support profile model), drain outlet direction/height, awning animation, save by e-mail and open by ID, live price and enquiry form, manual/dynamic quality mode.

## 8. Where to read more

| File | Content |
| --- | --- |
| `AGENTS.md` | Binding working rules |
| `claude_implementation.md` | Everything Claude did, §1–§13 |
| `Problems.md` | Error records (`CLAUDE-*`), including `CLAUDE-GP-001` |
| `URUN_VE_OLCU_KURALLARI.md` | Confirmed product and measurement rules |
| `GUNCEL_DURUM_VE_ASAMALAR.md` | Stage overview and open inputs |
| `01_Ocak_AstraGuncelPlan.md` | Astra's fix plan GP-01…12 (GP-10/11 open) |
| `schweng.md` | Competitor review and plan SW-00…10 |
| `TASARIM_PLANI_LUNA_SOL.md` | Visual design direction |

Key code locations:

| Area | Path |
| --- | --- |
| Catalogue and limits | `src/catalog/catalog.ts`, `src/catalog/attachmentReference.ts` |
| Configuration schema | `src/domain/configuration.ts` |
| Rules and evaluation | `src/domain/evaluateConfiguration.ts`, `src/domain/geometry/`, `src/domain/awning.ts`, `src/domain/led.ts`, `src/domain/roofFinish.ts` |
| Part placement (pure) | `src/features/assembly/placements.ts`, `spec.ts` |
| Scene building | `src/features/assembly/assemblyScene.ts`, `annotations.ts`, `dimensions.ts` |
| Viewer | `src/features/viewer/PreviewViewer.tsx` |
| Left panel | `src/features/configurator/ConfiguratorShell.tsx`, `components/ConstructionSettings.tsx`, `components/RoofSettings.tsx` |
| App wiring and history | `src/app/ConfiguratorApp.tsx` |
| PDF | `src/features/pdf/` |
| Model pipeline | `tools/prepare_models.py`, sources in `Models/` (Git LFS), output in `public/models/` |

## 9. Suggested first message for the new session

> Read `HANDOFF.md` and `AGENTS.md` in the repository, then continue the project as Claude. Record work in `claude_implementation.md` (next section §14) and errors in `Problems.md`. Answer me in Turkish. Ask before starting if anything is unclear.
