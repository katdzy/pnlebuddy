@AGENTS.md
@docs/HANDOFF.md

# PNLE Buddy: notes for Claude Code

A calm, iPad-first study app for one person preparing for the Philippine Nurse Licensure Exam (target: August 2027).
Read `PRODUCT.md` before changing anything user-facing. Its principles are binding: no streaks, no guilt, no
countdowns, one thing at a time, honest about performance.

## Commands

| | |
|---|---|
| `npm run dev` / `npm run dev:lan` | Dev server (LAN version for testing on her iPad) |
| `npm test` | Vitest: scheduling, grading, quizzes, flashcards, storage migration |
| `npm run typecheck` / `npm run lint` | Must pass before every commit |
| `python3 scripts/ingest/extract.py` | Step 1: PDFs in her RN2027 folder → text, layout XML, OCR (needs `brew install poppler ocrmypdf`) |
| `npm run ingest` | Step 2: text + Anki decks → `public/content/*.json`, `src/content/generated/reading.json`, `content-report.md` |

Her review folder defaults to `~/Fel Reviewers/RN2027`; override with `RN2027_DIR=...`.

## How it's built

- **Structure** `src/content/taxonomy.ts`: NP1–NP5 per the Enhanced TOS (BON Res. 10 s. 2025), plus an
  "Integrated" group (fundamentals, pharmacology, PALMR) that the board tests inside every paper. Papers → areas →
  67 specific topics. Each topic has keywords the importer uses to sort content. This is the one place to change the
  structure.
- **Content** is generated, not hand-written: `scripts/ingest/` parses her PDFs (Saunders Q&A, Brunner test bank,
  Toprank Google-Forms recalls, PH board files whose keys are bold or green) and Anki decks, classifies each item into a
  topic, merges duplicates (`seenIn` = how many of her files contain it), and drops anything without a readable answer
  key. Read `content-report.md` after every ingest.
- **Loading** `src/lib/content.ts`: questions for all papers load at start; flashcards load per paper on demand.
- **Logic** is pure and tested in `src/lib/`: `scheduler.ts` (Leitner boxes for questions), `cards.ts` (Anki-like SRS),
  `grading.ts` (75% average / 60% floor), `session.ts` (practice, topic drills, quizzes incl. exam mode, notebook),
  `insights.ts` (topic and paper stats), `storage.ts` (versioned localStorage, v1→v2→v3 migration; v3 added her
  `topicsDone` checklist), `look.ts` (themes, covers, icons, paper colours; see `DESIGN.md`).
- **Screens** `src/components/`: today, tracker, topic (reviewer + "read in your files"), quiz, study (focus mode),
  cards, notebook, settings.
- **Reviewers** are Markdown files in `content/reviewers/<topic-id>.md`, rendered at build time on `/topics/<id>`.

## Rules

1. **Her content never goes to GitHub.** The repo (github.com/katdzy/pnlebuddy) is public, so `public/content/`,
   `src/content/generated/` and `content-report.md` are git-ignored: they hold text from her paid review materials.
   Deploy from this Mac (`netlify deploy --build --prod`), where those files exist. The deployed site is behind a
   password gate (`src/proxy.ts`, `SITE_PASSWORD` env var on Netlify); never deploy without it.
2. **Never invent sources or answer keys.** If a parser can't find a key, the item is dropped. `source.label` must say
   where the item really came from. Don't mark anything `clinicallyReviewed`.
3. **Reviewers** that Claude drafts must say so at the top (see the sample `np3-fluids-electrolytes.md`) and should be
   based on her own notes: the topic page lists which files and pages cover each topic (`reading.json`).
4. **Her progress lives in localStorage** under `pnlebuddy:v2` (the key stays even though data is now version 3). Any
   change to `StudyData` needs a migration in `storage.ts` and a test. Never drop her notebook. The look (theme,
   covers, icons, motto) is separate, under `pnlebuddy:look`; cover photos are in IndexedDB (`pnlebuddy-media`).
7. **Visual system** is documented in `DESIGN.md`. Colours come from tokens only, so every theme keeps working.
5. **Question IDs** are hashes of the stem and choices, so re-running ingest keeps her progress. Changing `hashId` or
   `fingerprint` resets everything; don't.
6. This Next.js has Cache Components on. Server code that reads files must be inside `"use cache"` (see
   `src/app/(main)/topics/[topicId]/page.tsx`). Check `node_modules/next/dist/docs/` before using a Next API.

## Good next tasks

- Write reviewers for the topics she finds hardest (ask which), from the pages listed on each topic page.
- Improve topic sorting where `content-report.md` looks off (adjust keywords in `taxonomy.ts`, re-run ingest).
- Parse more answer keys: many Final Coaching "student copy" files have none; ask her if the review center gave keys.
- Move progress to IndexedDB if localStorage nears its ~5 MB limit (flashcard states grow with use).
