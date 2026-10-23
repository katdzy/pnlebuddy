# Topic reviewers

One Markdown file per topic, named by the topic id from `src/content/taxonomy.ts`, e.g.
`np2-preg-complications.md`. It appears on that topic's page under **Reviewer**, and she can mark it as read.

Write them short and scannable: tables for values and comparisons, bullets for nursing actions, a "board-style traps"
section at the end. Use `>` for a note box at the top (for example, which of her files the reviewer is based on).

If Claude drafts one, start with a `> **Draft reviewer.**` note naming the sources it was written from, and base it on
the pages the topic page lists under "Read in your files".

Topic ids: run `npm run ingest` and look at `content-report.md` → "By topic", or open the tracker.
