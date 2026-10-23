# Handoff from the planning session (Oct 22–23, 2026)

Context carried over from a Claude session that scanned her review folder, OCR'd the scanned files, drafted a
review plan and built the current version of PNLE Buddy. Treat this as background; ask before acting on anything
marked open.

## The exam

- Target: **PNLE August 2027**. Since 2026 the PNLE runs in **February and August** (2026: Feb 26–27, Aug 29–30;
  filing closed Jul 15). PRC hadn't announced 2027 dates as of Oct 2026, so check before planning around a date.
- Coverage follows the **Enhanced TOS** (BoN Res. No. 10 s. 2025, used since the Nov 2025 exam):
  NP1 Community Health · NP2 Mother & child (incl. growth & development) · NP3 Med-Surg A (surgery, oxygenation,
  fluids & electrolytes, infectious/immunologic, cellular aberrations) · NP4 Med-Surg B (nutrition & GI, metabolism &
  endocrine, perception & coordination) · NP5 Psych + life-threatening conditions. Fundamentals, pharmacology and
  PALMR are integrated in every paper (~20% "Part B"). 100 items per paper.
- Passing: **75% general average, no paper below 60%.**
- Her older recall files use **older NP numbering** (e.g. NP1 = fundamentals/ethics, NP2 = CHN). Sort by topic, never
  by the NP label on a file.

## Her review folder (`~/Fel Reviewers/RN2027`)

- ~326 files, ~38,500 pages: NURSING 1 (school lecture notes by subject) and NURSING 2 (Anki decks, Astig Nurse
  cram sheets, CBRC books, ebooks, Toprank reviewers/recalls/preboards/final coaching, Udan, PALMR, Royal Pentagon,
  Epikus, pharmacology, PNLE review exams).
- **OCR is done** for all 77 scanned PDFs (~6,100 pages): a searchable copy sits next to each original as
  `<name> (searchable).pdf`, and text is in `_ocr_text/`. Born-digital text is in `_text/`, layout XML (for bold/green
  answer keys) in `_text/_layout/`.
- Weak OCR: Recall 8 NP3–NP5 RATIO (pen markup over lecture screenshots), CHN 1 L.2 Family (mostly images).
- Leftovers safe to delete: `_ocr_text/_layers/`, `_text/.bundle-for-pnlebuddy.tgz`, `_text/.layout-for-pnlebuddy.tgz`.
- Duplicates: NURSING-TEST-1-NP-II (1), Recall 2 NP1-NP3 RATIO(1), Theoretical Models(1), Nursing School Bundle in
  both folders, two MCHN ebooks.
- Gaps: **emergency/critical care is thin** (half of NP5 now); most Final Coaching "student copy" sets have no
  answer key. Big textbooks (Brunner, Perry & Potter, Flagg, Videbeck, Saunders) are reference, not reading.

## Draft review plan (not final)

| Phase | Dates | Focus |
|---|---|---|
| 0 Setup & baseline | Oct 26 – Nov 8, 2026 | one timed 100-item set per paper, organize, set up app |
| 1 Content, one paper at a time | Nov 9 – Apr 11 | NP3 (5 wk) → NP4 (5, holiday week) → NP2 (4) → NP1 (4) → NP5 (4) |
| 2 Question-heavy | Apr 12 – Jul 11 | recalls by topic, mistake review, weekly timed paper; file the application |
| 3 Mock boards & final coaching | Jul 12 – exam | weekend mocks (Sat NP1–3, Sun NP4–5), cram sheets, DOH programs, laws; taper last week |

Daily: ~30 min Anki, 2.5–3 h one primary note set, 50–75 topic questions + ~25 mixed review, 20 min notebook.
Weekly: 6 on / 1 off, Saturday timed 100-item paper, two short Part B (PALMR) sessions. Practice target 80%+.
After the Feb 2027 boards, collect those recalls: the first written under the new TOS.

**Open (ask her):** review center and its schedule (align phases 2–3), daily hours / working or not, weakest areas
(or let the baseline decide), and what "topic reviewers like what I make" means: whether her partner already
writes reviewers in some format that should be imported.

## The app as of this handoff

Built in that session (see `CLAUDE.md` for architecture and rules):
- Tracker by NP1–NP5 + Integrated → 24 areas → **67 topics** (`src/content/taxonomy.ts`), with board-readiness tiles.
- Topic pages: Markdown reviewer + "Read in your files" page pointers (`src/content/generated/reading.json`).
  Only one reviewer exists: `content/reviewers/np3-fluids-electrolytes.md` (draft sample).
- Test banks: **4,758 questions** (Saunders Q&A 9e, Brunner test bank, Toprank Google-Forms recalls, PH files keyed by
  bold/green, CDN 500). 346 appear in 2+ sources (`seenIn`). Includes select-all items.
- Flashcards: **21,798** from her 18 Anki decks (Topnotcher/Lj/Vinz etc.), Anki-like scheduling.
- Graded quizzes (practice or exam mode, mock board), notebook with balikan, settings, v1→v2 storage migration.
- Verified: typecheck, lint, 19 tests, production build, click-through at iPad and phone sizes.

Known issues / next tasks:
- Keyword classification misfiles a small share (e.g. a pressure-ulcer item under geriatrics). Tune keywords in
  `taxonomy.ts`, re-run `npm run ingest`, read `content-report.md`.
- More answer keys could be recovered from student-copy sets if the review center provided keys.
- Not yet tested on her iPad; deploy privately over HTTPS for a stable Home Screen app.
- localStorage may fill up as flashcard states grow; IndexedDB is the next step if it does.

## Added Oct 23: her A&P book, and a 3D anatomy plan

- Her textbook **Mack Co, *Anatomy & Physiology*, 1st ed. (Cengage 2023)** is in
  `RN2027/NURSING 1/ANATOMY AND PHYSIOLOGY/` with her ANAPHY_LEC lecture notes. (PDF page = printed page + 22.)
- New area **Anatomy & physiology** (`int-anaphy`) under Integrated, with **12 topics, one per body system**, mapped
  to book chapters and lecture chapters. Total topics: 79.
- From the book (`scripts/ingest/parsers/mack.mts`):
  - **649 questions** from the Learning Checks and the end-of-section Review Questions, keyed from the book's own
    answer appendix. A question block is kept only if its numbering matches its key block exactly, so a missed
    heading can't pair questions with the wrong answers. Keys are as printed; a few look debatable (e.g. §10.3b q2).
    There are no rationales in the book, so the answer screen shows the section and page instead.
  - **2,053 glossary flashcards** (term, aka, Latin/Greek origin, the book's definition, book pages). Each goes to
    the body system whose chapters the book's index cites most; 458 terms the index doesn't list were left out.
  - `public/content/anatomy-terms.json`: all 2,511 glossary terms with pages, for the 3D viewer's info cards.
  - A&P topic pages list the book chapters (PDF pages) and her lecture files for that system.
- New questions are introduced in topic order, so A&P items don't crowd into Today's practice; she reaches them from
  the tracker, topic pages and the quiz builder.
- Totals after ingest: **5,407 questions, 23,851 flashcards.**
- **3D anatomy: planned, not built.** See `docs/ANATOMY_3D_PLAN.md`. Open questions for her are at the end of it.
- I (the planning session) used the **Brunner & Suddarth 14th-edition test bank**, not her 15th-edition textbook.
