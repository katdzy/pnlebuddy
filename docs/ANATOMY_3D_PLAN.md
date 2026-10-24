# 3D anatomy: plan for Claude Code

An in-app 3D body she can turn, peel and tap, tied to her own A&P book, her lecture notes and the question bank.
Read `PRODUCT.md` and `DESIGN.md` first: the same principles apply here (calm, one thing at a time, iPad-first,
honest), and every colour comes from the theme tokens so all six themes keep working.

Status: **phase 2 built (Oct 24, 2026); the iPad frame-rate check from phase 0 is still open.** `npm run anatomy`
builds all 11 system files (1,654 structures, 14.5 MB), `structures.json` and a report. `/anatomy` has:
- a chip per system that cycles shown → see-through (x-ray: faint, and taps pass through it) → hidden;
- tap or search a structure → a card with her book's glossary entry word for word (aka, origin, printed pages), saying
  whether it's the structure itself, a broader term or the larger structure it's part of; chapters, lecture notes and
  a link to the topic page; "Zoom to it" and "Show only this". On iPad landscape the card sits beside the canvas; on
  narrower screens it's a sheet over the bottom of the canvas, and the view shifts up to stay clear of it;
- search that also finds glossary terms the model doesn't have ("SA node"), shown as book-only cards;
- a List view (all structures by system, filtered by the search box) for screen readers and browsing;
- the view in the URL (`?s=skeletal,heart&x=muscular&f=FMA24475`, or `&t=<term>`), so reloads keep her place;
- "Open in 3D" on the A&P topic pages and a link on the tracker's A&P area (`TOPIC_SYSTEMS` in `src/lib/anatomy.ts`);
- the service worker serves the hashed model files from its cache once fetched.
Next: phase 3 ("Practice this", the identify quiz, v4 storage).

### What phase 1 found

- **Use the IS-A download, not PART-OF.** `isa_BP3D_4.0_obj_99.zip` (143 MB) has every PART-OF mesh (same geometry,
  different header) plus ~1,000 more: 323 muscles, 26 nerves, the spleen, testes, laryngeal cartilages. Both concept
  lists are still read: IS-A says what a mesh *is* ("muscle organ", "artery"), PART-OF what it's *in* ("heart").
- **What BodyParts3D doesn't have:** female reproductive organs (it's a male body), lung tissue (lungs are their
  bronchial trees and vessels), thyroid gland, lymph nodes, tonsils, spinal cord (only its central canal), spinal
  nerves, ear beyond the external ear. The credits page says so.
- **Systems are rules, not roots** (`scripts/anatomy/systems.mts`): each mesh goes to the first system whose rule
  matches its kinds, what it's part of, or its name; only hair and skin are left out. Display order is separate.
- **Normals are not stored.** They split vertices along seams (muscles had as many vertices as triangles), which
  stopped simplification. Without them the files are a third the size; the viewer computes smooth normals on load.
- **Glossary links: 66% (1,093 of 1,654), not the 80% hoped for.** By system: skeleton 97%, heart 95%, digestive 76%,
  muscles 71%, airways 57%, brain & nerves 55%, vessels 50%. What's left isn't in her book's glossary (the stomach,
  rectum, insula and most named arterial branches have no entry). Matches are only made, never invented, and each
  says how (`exact`, `general` = a broader term, `part` = the larger structure); a broader or larger term must be one
  the book places in the same body system, because words like "canaliculi", "raphe" and "rectus" mean something else
  there. Hand-only terms (lumbricals, interossei) are kept off the foot. Tests: `scripts/anatomy/__tests__/`.
- **Glossary bug fixed on the way:** the PDF's text layer drops one letter per fi/fl/ff ligature at the end of a bold
  glossary term ("flexor hallucis longu"). `restoreLigatureLoss` in `parsers/mack.mts` puts them back from the book's
  own text; 116 terms fixed, 74 of which now have index pages and became flashcards. Card ids are keyed on the term as
  first imported (`textLayer`), so her progress is kept (one card, "extracellular fluid", merged with its duplicate).

### What phase 0 found (read before phase 1)

- **The PART-OF tree is regional, not by system.** The femur sits under "left thigh" → "left lower limb"; the
  "skeletal system" root has the skull, spine and ribs but no limbs, plus some eye parts. So the skeleton is chosen by
  bone names (`scripts/anatomy/systems.mts`), not by walking a root. Expect the same for muscles, vessels and nerves:
  check each system's member list in `public/anatomy/report.md` before trusting a root.
- **No ventricle walls.** The heart has atrial walls, valves, papillary muscles, coronary vessels and the four chamber
  *cavities* (blood volumes), but no ventricular myocardium mesh. The cavities stand in for the ventricles' shape.
- `partof_element_parts.txt` already lists every element file under a compound concept (no tree walk needed for a
  root). Two OBJ files have empty headers (FJ1450, FJ1656) and are left out.
- The OBJ headers still carry the old CC BY-SA 2.1 JP notice; the license page says CC BY 4.0 since 2025-02-27.
- No `obj2gltf`: the OBJs are plain triangles with matching normals, so `convert.mts` reads them directly.
- Sizes: skeleton 238 structures, 3.73 MB at 60% simplification (4.65 MB unsimplified, 3.43 MB at 40%); heart 40
  structures, 0.83 MB. The viewer's JS is a separate ~1 MB chunk (uncompressed) loaded only on `/anatomy`.
- In the in-app browser preview a hidden pane gets no animation frames, so the canvas looks blank there; that's the
  preview, not the page.

---

## 1. What she gets

- **Body view** at `/anatomy`: one body, system chips along the top (Skeletal, Muscular, Nervous, Cardiovascular,
  Respiratory, Digestive, Urinary, Reproductive, Endocrine, Lymphatic). Turn with one finger, pinch to zoom, two
  fingers to pan, a "reset view" button.
- **Tap a structure** → it highlights, everything else fades, and a card shows:
  - the name, its "aka" names, and the word origin (Latin/Greek), from her book's glossary;
  - the book's definition, word for word, with the book pages to read (printed page numbers);
  - which of her ANAPHY lecture files covers it;
  - "Practice": book questions and board questions that mention it, and its flashcard if there is one.
- **Peel / x-ray**: per system, show, fade (x-ray) or hide. "Isolate" shows only the tapped structure.
- **Search**: type "femur", "SA node", "loop of Henle" and jump to it. If the structure isn't in the 3D model
  (microscopic things like the nephron or the alveolus), show its book definition and pages instead of failing.
- **Identify quiz** (phase 3): a structure lights up and she picks its name from four, distractors from the same
  system. Missed ones go to the notebook like any other mistake.
- **Nursing overlays** (phase 4): IM injection sites (deltoid, vastus lateralis, ventrogluteal, and dorsogluteal
  with the sciatic nerve showing why it's avoided), heart auscultation points, abdominal quadrants and McBurney's
  point, lumbar puncture level. These are hand-placed and must be checked by her before they ship.

Out of scope: microscopic anatomy (cells, nephron, sarcomere), physiology animations, and skin layers (BodyParts3D
has no detailed integument). For those, the card points to the book figure pages.

---

## 2. What already exists (built from her book)

Her book is **Mack Co, *Anatomy & Physiology*, 1st ed., Cengage 2023**, in
`RN2027/NURSING 1/ANATOMY AND PHYSIOLOGY/`. `scripts/ingest/parsers/mack.mts` reads its layout XML column by column
and produces:

| Output | What | Used by |
|---|---|---|
| `public/content/questions-int.json` | 649 Learning Check + chapter Review questions, keyed from the book's own answer appendix | quizzes, topic drills |
| `public/content/cards-int.json` | 2,053 glossary flashcards (term → book definition, origin, pages) | flashcards |
| `public/content/anatomy-terms.json` (git-ignored: book text) | all 2,511 glossary terms: `{term, aka[], origin?, definition, pages[] (PDF), chapter?, topicId?}` | **the 3D info card** |
| `src/content/generated/reading.json` | each A&P topic → book chapters (PDF pages) + her ANAPHY_LEC lecture files | topic pages |

The A&P topics are the 12 `int-ap-*` topics in `src/content/taxonomy.ts` (`ANAPHY_TOPICS`, area `int-anaphy`), each
with `bookChapters` and `lectureChapters`. PDF page = printed page + 22 (`MACK_PAGE_OFFSET`).

Keys are taken exactly as the book prints them. A few look debatable (e.g. §10.3b Learning Check q2 says symphysis
joints are more prevalent during development). Don't "fix" keys in code; if she disagrees, she notes it in the
notebook.

---

## 3. The 3D model

**Use BodyParts3D 4.0** (Database Center for Life Science, Japan).

- License: **CC BY 4.0** (changed from CC BY-SA 2.1 JP in Feb 2025). Required credit, verbatim:
  "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International".
- Download from https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html :
  - `isa_BP3D_4.0_obj_99.zip` (143 MB, every mesh at 99% reduction). Unzip it in `anatomy-src/`. (Phase 0 used
    `partof_BP3D_4.0_obj_99.zip`, a subset; it's no longer needed.)
  - `isa_element_parts.txt` as well as the PART-OF lists below.
  - `partof_parts_list_e.txt`, `partof_inclusion_relation_list.txt`, `partof_element_parts.txt` (tab-separated:
    FMA concept id, English name, element file ids).
  - Only ELEMENT parts have meshes; a COMPOUND part ("heart", "skeletal system") is the sum of its elements.
- Keep the downloads **outside the repo**: `~/Fel Reviewers/anatomy-src/`. The converted GLBs go in
  `public/anatomy/`. The model license allows them in the public repo, but they're tens of MB, so git-ignore
  `/public/anatomy/*.glb` and build them on the Mac like `public/content/` (deploys run from there).

Later, optionally: **Z-Anatomy** (CC BY-SA 4.0, a Blender atlas built on BodyParts3D with better muscles and labels).
Two of its reference models are non-commercial (kidney: CC BY-NC 4.0; inner ear: CC BY-NC-SA 4.0). Fine for her
private use, but list them on the credits page and don't use them if the app ever goes public.

---

## 4. Build pipeline (`scripts/anatomy/`)

> As built (phase 1): `source.mts` reads the downloads, `systems.mts` holds the system rules (not roots, see "What
> phase 1 found"), `terms.mts` links names to the glossary, and `convert.mts` writes the GLBs, `structures.json`,
> `manifest.json` and `report.md`. There's no separate `structures.mts`; credits are the `/anatomy/credits` page. The
> original plan below is kept for reference.

Node 22 `.mts` scripts, same style as `scripts/ingest/`. Add `npm run anatomy`.

1. **`systems.mts`: choose what goes in each system file.** For each system, find its root concept *by English name*
   in `partof_parts_list_e.txt` (e.g. "skeletal system", "heart", "lung", "brain"), walk
   `partof_inclusion_relation_list.txt` down to ELEMENT parts, and map those to OBJ files with
   `partof_element_parts.txt`. **Look up the FMA ids from the files; don't hard-code ids from memory.** Write the
   resolved roots into `src/content/anatomy/systems.ts`:

   | System | Roots to look for (verify names in the parts list) | Topic |
   |---|---|---|
   | Skeletal | skeletal system / bones, joints, cartilage | `int-ap-skeletal` |
   | Muscular | skeletal muscles | `int-ap-muscular` |
   | Nervous | brain, spinal cord, cranial nerves, spinal nerves, eye, ear | `int-ap-nervous` |
   | Cardiovascular | heart, arteries, veins | `int-ap-cardiovascular` |
   | Respiratory | nasal cavity, larynx, trachea, bronchi, lungs, diaphragm | `int-ap-respiratory` |
   | Digestive | oral cavity → anus, liver, gallbladder, pancreas | `int-ap-digestive` |
   | Urinary | kidneys, ureters, bladder, urethra | `int-ap-urinary` |
   | Reproductive | male and female genital organs (two files; she picks) | `int-ap-reproductive` |
   | Endocrine | thyroid, parathyroid, adrenal, pituitary, pancreas (shared with digestive) | `int-ap-endocrine` |
   | Lymphatic | spleen, thymus, tonsils, lymph nodes and vessels if present | `int-ap-lymphatic` |

   Left/right pairs stay separate meshes (she needs "left ventricle" vs "right").

2. **`convert.mts`: OBJ → one GLB per system.** Use `obj2gltf` per element, then `@gltf-transform/core` +
   `@gltf-transform/functions` to merge into one scene per system: `weld`, `simplify` (meshoptimizer, target about
   50% on muscles and vessels), `quantize`, `meshopt` compression. **Each element stays its own mesh, named by its
   FMA id**, so tapping can find it. Budget: ≤ 4 MB per system file, ≤ 30 MB total. Output
   `public/anatomy/<system>.glb`, plus a content hash in the file name so it can be cached forever.

3. **`structures.mts`: the structure catalogue** → `public/anatomy/structures.json`:
   `{ fmaId, name, system, side?, center: [x,y,z], radius, termKey? }`.
   `termKey` links to `anatomy-terms.json`: normalise the FMA name (drop "left/right", "of", plural forms) and match
   the glossary `term` or `aka`; record unmatched names in `public/anatomy/report.md`. Never write a definition by
   hand here: an unmatched structure shows its name and the book chapter only.

4. **Credits**: write the attribution into `public/anatomy/CREDITS.md`, and show it on a `/anatomy/credits` page
   (linked from the viewer's ⓘ button and from Settings).

Package versions (current and React 19.3 compatible as of Oct 2026; re-check before installing):
`three@0.186.1`, `@react-three/fiber@9.8.1` (peer: react ≥19 <19.4), `@react-three/drei@10.7.9`;
dev: `@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions` (4.5.1), `meshoptimizer@1.3.0`,
`@types/three@0.186.0`. (Installed in phase 0, pinned exactly.)

---

## 5. Viewer (app code)

- **Route** `src/app/(main)/anatomy/page.tsx` (server: title and metadata only) → `src/components/anatomy/AnatomyScreen.tsx`
  (`"use client"`) → `Viewer` loaded with `next/dynamic(..., { ssr: false })`. In this Next.js, `ssr: false` is only
  allowed inside a client component (see `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`). three.js
  must never load on other pages.
- **Rendering** (react-three-fiber + drei): `<Canvas frameloop="demand" dpr={[1, 2]}>`, `OrbitControls` (damped,
  limits so she can't get lost inside the body), `useGLTF` with the meshopt decoder, one `<Suspense>` per system so
  each loads only when its chip is turned on (start with Skeletal). Soft studio light; no shadows.
- **Picking**: raycast on tap (not hover; this is a touch app). Highlight = emissive tint from the app's accent
  token; others go to 15% opacity. Label only the selected structure (drei `Html`), never a cloud of labels.
- **Layout**: iPad landscape: canvas on the left, info card on the right (360 px). Portrait and phone: canvas full
  width, card as a bottom sheet. Use existing tokens and components (`Bits.tsx`, `.chip`, `.btn`). The canvas
  background and highlight colour read the current theme's CSS variables, so Night shift gets a dark scene.
- **State**: selected structure and visible systems live in the URL (`?s=heart&f=<fmaId>`), so a topic page or a
  question can deep-link to "show me this".
- **Info card** reads `anatomy-terms.json` (lazy, about 650 KB), `reading.json` and the question bank already in
  memory. "Practice this" = `int-ap-*` questions whose stem or choices mention the term or an aka, then board questions
  that do; start with `actions.startList(...)`.
- **Accessibility**: a "List" toggle shows the same structures as a searchable list per system (the 3D canvas is not
  usable with a screen reader). Respect `prefers-reduced-motion` (no auto-rotate, no fly-to animation). 44 px tap
  targets on all controls.
- **Links in**: A&P topic pages (`/topics/int-ap-*`) get "Open in 3D" for their system; the tracker's A&P area too.
  Add "Anatomy" to the sidebar's page list in `src/components/Sidebar.tsx` (with a page icon key in `look.ts`), and on
  phones to the More/settings route rather than a sixth bottom tab.
- **Offline**: `public/sw.js` is network-first. Add cache-first for `/anatomy/*.glb` (hashed, immutable) so a system
  she has opened once works offline. Bump `CACHE`.

---

## 6. Progress (phase 3, identify quiz)

Identify results need their own spaced-repetition state. Add `anatomy: Record<fmaId, CardState>` to `StudyData` as
**v4 (v3 is her topic checklist) with a migration and a test in `storage.ts`** (CLAUDE.md rule 4). Reuse `rateCard` from `cards.ts`. Misses go to the
notebook as `kind: "card"` mistakes with a snapshot (name, system, book definition) so the notebook still works if
the model changes.

---

## 7. Phases

| Phase | Work | Done when |
|---|---|---|
| 0. Spike | Convert Skeletal + heart only; bare `/anatomy` page | Runs at ≥ 45 fps on her iPad, tap selects the right bone, page weight < 8 MB. If not, drop to fewer muscles/vessels or try three's `BatchedMesh` before going further. |
| 1. Pipeline | `npm run anatomy` builds all systems, `structures.json`, report, credits | ≥ 80% of structures matched to a glossary term; report lists the rest (**done; 66%, see above**) |
| 2. Viewer | systems, peel/x-ray, tap card, search, list mode, deep links, topic-page links | Typecheck, lint, tests pass; checked at iPad and phone sizes; no console errors |
| 3. Study | "Practice this", identify quiz, v3 storage + migration test, notebook | Tests for the quiz queue and the migration |
| 4. Nursing overlays | injection sites, auscultation points, quadrants (hand-placed pins) | She has checked every pin |

---

## 8. Questions for her

1. Which systems first? (Suggest: cardio, respiratory, nervous: heaviest on NP3–NP5.)
2. Are the nursing overlays (injection sites, auscultation points) worth it before the identify quiz?
3. Filipino names or mnemonics she uses for structures, to show on the card?
