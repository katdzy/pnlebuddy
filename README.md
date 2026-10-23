# PNLE Buddy

A calm, iPad-first study companion for the Philippine Nursing Licensure Examination (PNLE).
It tells you what to study next and why, tracks everything by NP1–NP5 and specific topics, runs
practice sessions and graded quizzes, reviews flashcards on an Anki-like schedule, and keeps a
notebook of mistakes to come back to (balikan).

Built with Next.js (App Router), TypeScript and Tailwind CSS. There is no backend or account: progress
is stored in the browser's `localStorage` on the device.

> **About the content.** Questions and flashcards are imported from her own review folder (RN2027) by
> `npm run ingest`: Saunders Q&A, the Brunner & Suddarth test bank, Toprank recall sets, PH board
> files whose answers are marked in bold or green, CDN 500, and her Anki decks. Every item names its
> source. Answer keys are as printed in those sources and have not been clinically reviewed.
> **The generated content includes paid review materials: keep this repository private.**

## Study content (run on the Mac)

```bash
brew install poppler ocrmypdf              # once
python3 scripts/ingest/extract.py          # PDFs → text, layout and OCR inside RN2027 (skips what's done)
npm run ingest                             # → public/content/*.json + content-report.md
```

Both default to `~/Fel Reviewers/RN2027`; pass a path or set `RN2027_DIR` otherwise. Re-running keeps her
progress, because question and card IDs are hashes of their content. Check `content-report.md`
afterwards: it lists counts per paper and topic, every source, and why items were skipped.

Reviewers are Markdown files in `content/reviewers/<topic-id>.md` (see the README there).

## Requirements

- Node.js 22.18 or newer (the importer uses built-in SQLite and zstd)
- npm

## Install and run

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command             | What it does                                                   |
| ------------------- | -------------------------------------------------------------- |
| `npm run dev`       | Development server on http://localhost:3000                    |
| `npm run dev:lan`   | Development server reachable from other devices on your Wi-Fi  |
| `npm run build`     | Production build                                               |
| `npm run start`     | Serve the production build (run `build` first)                 |
| `npm run start:lan` | Serve the production build to other devices on your Wi-Fi      |
| `npm test`          | Unit tests: scheduling, grading, quizzes, cards, storage       |
| `npm run ingest`    | Rebuild questions and flashcards from her RN2027 folder        |
| `npm run lint`      | ESLint                                                         |
| `npm run typecheck` | TypeScript, strict mode                                        |
| `npm run icons`     | Regenerate the app icons in `public/icons` and `src/app`       |

## Testing on an iPad

The iPad and the Mac need to be on the same Wi-Fi network.

1. On the Mac, build and serve the app to the network:

   ```bash
   npm run build
   ```

   ```bash
   npm run start:lan
   ```

2. Find the Mac's local IP address:

   ```bash
   ipconfig getifaddr en0
   ```

3. On the iPad, open **Safari** and go to `http://<that-ip>:3000`, for example
   `http://192.168.68.100:3000`. If macOS asks whether to allow incoming connections for `node`,
   allow it.
4. To install it: tap **Share**, then **Add to Home Screen**. It opens full screen with the sprout
   icon, in both portrait and landscape.

`npm run dev:lan` works the same way if you want live reloading while you edit.

### Things to know about storage on iPad

- **Progress belongs to one address.** Safari stores data per origin, so
  `http://192.168.68.100:3000` and `http://192.168.68.101:3000` are separate, empty stores. If
  the Mac's IP address changes, the Home Screen app will look like a fresh start. The old data
  is still there under the old address.
- **The Home Screen app and Safari tabs keep separate storage.** Progress made in a Safari tab
  does not appear in the installed app, and vice versa.
- **Safari can clear data for websites that haven't been opened in a while.** Apps added to the
  Home Screen are treated differently, but don't count on it.
- **Use the backup.** Progress → *Keep your progress safe* → **Download backup** saves a JSON
  file (to Files or iCloud Drive on iPad). **Restore from file** brings it back on any device or
  address.

For everyday use, deploy the app to an HTTPS host (for example Vercel's free tier) and add
*that* address to the Home Screen. It gives you a stable origin and enables offline support.

## Offline support

`public/sw.js` is a small network-first service worker. When online it always fetches fresh
files. When offline it serves the last copy it saw. It registers only in production builds, and
only in a secure context (HTTPS or `localhost`).

**What was tested:** a production build on `localhost` in a Chromium browser. After visiting
each screen once, the server was stopped. The app still opened, moved between Today, Notebook,
Progress and Focus, and saved new answers.

**What was not tested:** offline use on an iPad. Over a plain `http://` LAN address the
service worker does not register, so offline won't work on an iPad until the app is served over
HTTPS.

## How it works

### Today's Next Step

The home screen builds a session from the review queue (below), sized by the length she picks:
10 minutes ≈ 5 questions, 25 ≈ 12, 45 ≈ 20. The title and the "Why this" text describe what
that exact session contains. Start begins the same questions the preview describes.

### Review queue (`src/lib/scheduler.ts`)

A Leitner-box system, deliberately simple and explainable:

- A **missed** question goes to box 0 and is due right away, so it comes back next session.
- Each **correct** answer moves it up a box. Boxes are due after 0, 1, 3, 7, 16 and 35 days.
- A question answered correctly the **first time** starts in box 2 (3 days), so easy material
  doesn't crowd out what needs work.

The queue is ordered:

1. Missed questions that are due
2. Questions from weak topics (unseen first, then due)
3. Other questions due for review
4. Questions from topics not started yet, one topic at a time
5. Unseen questions from topics already started
6. Everything else, soonest due first (optional extra practice)

All of it is pure functions that take `now` as an argument, so you can unit test it or swap in
a different algorithm without touching the UI.

### Coverage vs. demonstrated performance (`src/lib/insights.ts`)

- **Covered** = how many of a topic's questions she has seen.
- **Performance** = how she answered her last 6 attempts in that topic:
  - *Getting started* (fewer than 3 attempts)
  - *Needs practice* (under 60% correct)
  - *Building*
  - *Steady* (at least 5 attempts and 80%+ correct)

Nothing is ever labeled "mastered", and finishing a topic doesn't mark it done. A topic counts
as *improving* when its last 3 attempts beat the ones before by at least 25 percentage points.

### Data and persistence (`src/lib/storage.ts`, `src/lib/store.ts`)

- Everything lives under one versioned `localStorage` key, `pnlebuddy:v2` (data from v1 is migrated automatically).
- Each answer is saved the moment it's submitted, and the session in progress is saved too, so a
  refresh or a closed app resumes exactly where it was.
- Stored data is validated on load. Malformed entries are dropped. If the stored data can't be
  read at all, it is copied to a backup key and the app starts fresh, with a notice.
- If a save fails (storage full or blocked), a banner says so and points to the backup.

## Project structure

```
scripts/ingest/        extract.py (PDF → text/OCR), build.mts (→ JSON), parsers/, anki.mts, classify.mts
content/reviewers/     Markdown reviewers, one per topic
public/content/        Generated questions, flashcards, card images, manifest (private)
src/
  app/(main)/          Today, Tracker, Topic pages, Quiz, Cards, Notebook, Settings
  app/study/           Focus mode for practice and quizzes
  app/flashcards/      Flashcard review
  content/taxonomy.ts  NP1–NP5 → areas → topics (+ keywords for sorting)
  content/generated/   reading.json: where each topic appears in her files (private)
  lib/                 Pure logic: scheduler, cards, grading, session, insights, storage (+ tests)
  components/          Screens
```

## Known limitations

- Light theme only.
- Progress lives on one device. Use Settings → Download backup to move it.
- Topic sorting is keyword-based; a small share of items land in a neighbouring topic.
- Files with no readable answer key (most "student copy" final coaching sets) aren't imported.
- Offline support hasn't been verified on an iPad (it needs HTTPS).
