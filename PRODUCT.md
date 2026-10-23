# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, specified by the requester. Local storage only for persistence. No database, auth, paid APIs, or AI APIs in the first version.

## Users

One primary user: a nursing graduate preparing for the Philippine Nursing Licensure Examination (PNLE). She studies mostly on an iPad (portrait and landscape), sometimes on a phone or desktop, often in short windows of time and while tired or anxious about the exam. The app is built for her by her partner.

## Product Purpose

A calm study companion that removes the work of managing a study system. It answers "what should I study next, why, and for how long", runs one focused practice session at a time, helps her learn from mistakes, and brings material back for review before she forgets it.

Success: she can open the app, understand what to do next, complete a short session, review her mistakes, close the app, and come back later without losing progress.

## Positioning

Not a tracker or dashboard. The system decides the next step and explains its reasoning in plain language; she only has to start.

## Operating Context

- Installed to the iPad Home Screen as a PWA; opened for 10, 25, or 45-minute sessions.
- One multiple-choice question at a time, rationale after submission, optional mistake reason.
- Progress lives in the browser's local storage on that device.

## Capabilities and Constraints

- Today's Next Step, Focus Mode, Mistake Notebook (balikan), Smart Review Queue.
- Tracker sorted like the board: NP1–NP5 plus the integrated material, each broken into specific topics.
- Topic reviewers (Markdown) with pointers to the pages in her own files that cover each topic.
- Test banks from her own materials, PNLE board-style and NCLEX-style, including select-all-that-apply.
- Anki-style flashcards from her own decks.
- Graded quizzes: practice or exam mode, scored with the board's rule (75% average, no paper under 60%).
- Topic completion (seen) is tracked separately from demonstrated performance. Nothing is ever labelled "mastered".
- Personal like the Notion trackers reviewees make: colour themes (incl. a dark one), covers and page icons she
  changes on the page itself, a colour and icon per paper, a motto, and her own topic checklist. The checklist is
  self-reported and shown apart from performance.
- Review logic is a simple, explainable spaced-review rule kept separate from UI so it can be replaced.
- Out of scope: social features, subscriptions, marketplaces, AI features in the app, exam-date countdowns.

## Brand Commitments

- Name: **PNLE Buddy**.
- Greeting is time-of-day based; she can optionally set her own name in the app.
- Voice: warm, supportive, plain. Never guilt, never urgency.

## Evidence on Hand

- Questions and flashcards are imported from her own review materials (see `content-report.md`). Each item says which file it came from. Answer keys are as printed in the source; nothing has been clinically reviewed, and the app says so.
- Never fabricate sources or answer keys. Items without a readable key are left out.

## Product Principles

1. She should never have to manage the system; the system manages itself.
2. One thing at a time. Fewer choices beat more features.
3. A missed day is never a failure. No streaks, leaderboards, red overdue counts, or hour quotas.
4. Be honest about performance: show what she has demonstrated, not what she has merely clicked through.
5. Reliability over features: progress must survive refreshes, closes, and returns.

## Accessibility & Inclusion

Comfortable touch targets for iPad, keyboard support, accessible forms and controls, readable line lengths, WCAG AA contrast.
