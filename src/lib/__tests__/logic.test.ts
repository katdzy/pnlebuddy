import { describe, expect, it } from "vitest";
import { TOPICS } from "@/content/taxonomy";
import { indexBank } from "../bank";
import { buildCardQueue, cardCountsByTopic, dayOf, isCardDue, rateCard } from "../cards";
import type { Question } from "../content-types";
import { bandFor, grade, isCorrect } from "../grading";
import { computePaperStats, computeTopicStats } from "../insights";
import { coverFor, defaultLook, DEFAULT_TONES, iconFor, sanitizeLook } from "../look";
import { applyAnswer, BOX_INTERVAL_DAYS, buildReviewQueue, DAY_MS, describeDue, shuffle } from "../scheduler";
import {
  answerQuestion,
  finishSession,
  goToNextQuestion,
  goToQuestion,
  planSession,
  quizPool,
  recordMistake,
  recordQuizMistakes,
  reviewCard,
  setTopicDone,
  startQuiz,
  startRecommendedSession,
  type QuizSpec,
} from "../session";
import { emptyData, LEGACY_KEY, loadData, sanitize, saveData, STORAGE_KEY } from "../storage";
import type { StudyData } from "../types";

const T0 = Date.UTC(2026, 9, 1, 9, 0, 0);

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

/** A small fixture bank: 4 questions in each of 6 topics across papers. */
const FIXTURE_TOPICS = ["np1-copar", "np2-labor", "np3-respiratory", "np4-diabetes", "np5-mood", "int-research"];
const questions: Question[] = FIXTURE_TOPICS.flatMap((topicId, t) =>
  [0, 1, 2, 3].map((n) => ({
    id: `q-${t}-${n}`,
    topicId,
    style: n % 2 ? "nclex" : "pnle",
    kind: n === 3 ? "multi" : "single",
    stem: `Question ${n} about ${topicId}?`,
    choices: (["A", "B", "C", "D"] as const).map((id) => ({ id, text: `Option ${id}` })),
    answer: n === 3 ? ["A", "C"] : ["B"],
    rationale: "Because.",
    source: { kind: "reference", label: "Fixture", clinicallyReviewed: false },
  })),
);
const bank = indexBank(questions);

describe("taxonomy", () => {
  it("has unique topic ids that belong to known papers", () => {
    const ids = new Set(TOPICS.map((t) => t.id));
    expect(ids.size).toBe(TOPICS.length);
    for (const id of FIXTURE_TOPICS) expect(ids.has(id)).toBe(true);
  });
});

describe("grading", () => {
  it("needs the exact set for select-all items", () => {
    const multi = bank.question("q-0-3")!;
    expect(isCorrect(multi, ["A", "C"])).toBe(true);
    expect(isCorrect(multi, ["C", "A"])).toBe(true);
    expect(isCorrect(multi, ["A"])).toBe(false);
    expect(isCorrect(multi, ["A", "B", "C"])).toBe(false);
  });

  it("uses the board's bands", () => {
    expect(bandFor(75)).toBe("passing");
    expect(bandFor(74.9)).toBe("below-passing");
    expect(bandFor(59)).toBe("below-floor");
  });

  it("applies the 75% average / 60% floor rule across papers", () => {
    const pass = grade({ np1: [80, 100], np2: [76, 100], np3: [70, 100], np4: [78, 100], np5: [72, 100] });
    expect(pass.boardRule?.passes).toBe(true);
    const floor = grade({ np1: [95, 100], np2: [95, 100], np3: [55, 100], np4: [90, 100], np5: [90, 100] });
    expect(floor.boardRule?.average).toBeGreaterThanOrEqual(75);
    expect(floor.boardRule?.passes).toBe(false);
    expect(floor.boardRule?.weakest?.paperId).toBe("np3");
    expect(grade({ np3: [8, 10] }).boardRule).toBeNull();
  });
});

describe("question scheduling", () => {
  it("sends a missed question back to box 0, due now", () => {
    const p = applyAnswer(undefined, "q", "np1-copar", false, T0);
    expect(p).toMatchObject({ box: 0, dueAt: T0, lastResult: "incorrect", topicId: "np1-copar" });
  });

  it("starts a first-try correct answer at box 2", () => {
    const p = applyAnswer(undefined, "q", "np1-copar", true, T0);
    expect(p.dueAt).toBe(T0 + BOX_INTERVAL_DAYS[2] * DAY_MS);
  });

  it("puts missed questions first, then due, then new topics", () => {
    const missed = questions[5];
    const learned = questions[10];
    const progress = {
      [missed.id]: applyAnswer(undefined, missed.id, missed.topicId, false, T0),
      [learned.id]: applyAnswer(undefined, learned.id, learned.topicId, true, T0),
    };
    const later = T0 + 4 * DAY_MS;
    const stats = computeTopicStats(bank, [], progress, later);
    const queue = buildReviewQueue(questions, TOPICS.map((t) => t.id), progress, stats, later);
    expect(queue[0]).toMatchObject({ questionId: missed.id, reason: "missed" });
    expect(queue[1]).toMatchObject({ questionId: learned.id, reason: "due" });
    expect(new Set(queue.map((q) => q.questionId)).size).toBe(questions.length);
  });

  it("describes due dates plainly and shuffles deterministically", () => {
    expect(describeDue(T0, T0)).toBe("Ready now");
    expect(describeDue(T0 + DAY_MS, T0)).toBe("Tomorrow");
    expect(shuffle([1, 2, 3, 4, 5], 7)).toEqual(shuffle([1, 2, 3, 4, 5], 7));
  });
});

describe("practice session", () => {
  it("runs start → answer → mistake → finish, honouring a focus paper", () => {
    let data: StudyData = { ...emptyData(), profile: { ...emptyData().profile, focusPaper: "np3" } };
    const plan = planSession(data, bank, 10, T0);
    expect(plan.items.every((i) => i.topicId === "np3-respiratory")).toBe(true);

    data = startRecommendedSession(data, bank, 10, T0, "s1");
    const q = bank.question(data.activeSession!.questionIds[0])!;
    expect(goToNextQuestion(data)).toBe(data); // can't skip before answering

    data = answerQuestion(data, bank, q.id, ["D"], T0 + 1000);
    expect(answerQuestion(data, bank, q.id, q.answer, T0 + 2000)).toBe(data); // double submit ignored
    expect(data.attempts).toHaveLength(1);
    expect(data.progress[q.id].lastResult).toBe("incorrect");

    data = recordMistake(data, bank, { questionId: q.id, sessionId: "s1", chosen: ["D"], category: "confused", note: " mixed up " }, T0, "m1");
    data = recordMistake(data, bank, { questionId: q.id, sessionId: "s1", chosen: ["D"], category: "concept", note: "" }, T0, "m2");
    expect(data.mistakes).toHaveLength(1);
    expect(data.mistakes[0]).toMatchObject({ kind: "question", itemId: q.id, category: "concept" });
    expect(data.mistakes[0].snapshot.answerText).toContain("B.");

    const { data: after, record } = finishSession(data, bank, T0 + 5000);
    expect(after.activeSession).toBeNull();
    expect(record).toMatchObject({ answeredCount: 1, correctCount: 0, byPaper: { np3: [0, 1] } });
  });
});

describe("quizzes", () => {
  const spec: QuizSpec = {
    title: "Mock",
    papers: ["np1", "np2", "np3", "np4", "np5"],
    topicIds: [],
    count: 10,
    style: "all",
    onlyMissed: false,
    feedback: "end",
  };

  it("filters the pool by paper, topic and style", () => {
    expect(quizPool(emptyData(), bank, spec)).toHaveLength(20);
    expect(quizPool(emptyData(), bank, { ...spec, style: "pnle" }).every((q) => q.style === "pnle")).toBe(true);
    expect(quizPool(emptyData(), bank, { ...spec, papers: ["np2"], topicIds: ["np2-labor"] })).toHaveLength(4);
  });

  it("spreads a mock board evenly across papers", () => {
    const data = startQuiz(emptyData(), bank, spec, T0, "quiz1");
    const ids = data.activeSession!.questionIds;
    expect(ids).toHaveLength(10);
    const perPaper = new Map<string, number>();
    for (const id of ids) {
      const t = bank.question(id)!.topicId.slice(0, 3);
      perPaper.set(t, (perPaper.get(t) ?? 0) + 1);
    }
    expect([...perPaper.values()].every((n) => n === 2)).toBe(true);
  });

  it("exam mode: answers can change, scoring happens on submit, blanks count as wrong", () => {
    let data = startQuiz(emptyData(), bank, { ...spec, count: 5 }, T0, "quiz2");
    const s = data.activeSession!;
    const [a, b] = s.questionIds.map((id) => bank.question(id)!);
    data = answerQuestion(data, bank, a.id, ["D"], T0 + 1);
    data = answerQuestion(data, bank, a.id, a.answer, T0 + 2); // changed her mind
    data = answerQuestion(data, bank, b.id, ["D"], T0 + 3);
    expect(data.attempts).toHaveLength(0); // nothing scored yet
    data = goToQuestion(data, 4); // free navigation in exam mode
    expect(data.activeSession!.currentIndex).toBe(4);

    const { data: after, record } = finishSession(data, bank, T0 + 10);
    expect(record!.correctCount).toBe(1);
    expect(record!.plannedCount).toBe(5);
    expect(after.attempts).toHaveLength(5);
    expect(grade(record!.byPaper).total).toBe(5);
    expect(record!.answers![a.id]).toBe(a.answer.join(""));

    const noted = recordQuizMistakes(after, bank, record!, T0 + 20, (() => {
      let i = 0;
      return () => `m${i++}`;
    })());
    expect(noted.mistakes).toHaveLength(4);
  });
});

describe("flashcards", () => {
  it("schedules Again/Good/Easy like Anki and counts by topic", () => {
    const again = rateCard(undefined, "np5-mood", 1, T0);
    const good = rateCard(undefined, "np5-mood", 3, T0);
    const easy = rateCard(undefined, "np5-mood", 4, T0);
    expect(again[1]).toBe(1);
    expect(good[1]).toBe(2);
    expect(easy[1]).toBe(4);
    const next = rateCard(good, "np5-mood", 3, T0 + 2 * DAY_MS);
    expect(next[1]).toBeGreaterThan(good[1]);
    expect(isCardDue(good, T0)).toBe(false);
    expect(isCardDue(good, T0 + 2 * DAY_MS)).toBe(true);

    const counts = cardCountsByTopic({ c1: again, c2: easy }, T0 + DAY_MS);
    expect(counts["np5-mood"]).toMatchObject({ seen: 2, due: 1, learned: 1 });
  });

  it("puts due cards first and limits new ones", () => {
    const states = { c2: rateCard(undefined, "np5-mood", 1, T0) };
    const q = buildCardQueue(["c1", "c2", "c3", "c4"], states, T0 + DAY_MS, 2);
    expect(q.due).toEqual(["c2"]);
    expect(q.fresh).toEqual(["c1", "c3"]);
  });

  it("logs new vs review counts per day", () => {
    let data = reviewCard(emptyData(), "c1", "np5-mood", 3, T0);
    data = reviewCard(data, "c1", "np5-mood", 3, T0 + 1000);
    expect(data.cardLog[String(dayOf(T0))]).toEqual([1, 1]);
  });
});

describe("tracker stats", () => {
  it("rolls topics up into papers", () => {
    const attempts = [0, 1, 2, 3, 4, 5].map((i) => ({
      questionId: `q-2-${i % 4}`,
      topicId: "np3-respiratory",
      choiceIds: ["B" as const],
      correct: i % 3 !== 0,
      at: T0 + i,
      sessionId: "s",
    }));
    const topic = computeTopicStats(bank, attempts, {}, T0);
    const papers = computePaperStats(topic, attempts, []);
    expect(papers.np3.recentAttempts).toBe(6);
    expect(papers.np3.recentPercent).toBeCloseTo(66.7, 0);
    expect(papers.np1.recentPercent).toBeNull();
  });
});

describe("storage", () => {
  it("round-trips through storage and drops malformed entries", () => {
    const store = memoryStorage();
    const data = { ...emptyData(), cards: { c1: rateCard(undefined, "np5-mood", 3, T0) } };
    expect(saveData(store, data)).toBe(true);
    expect(loadData(store).data.cards.c1).toEqual(data.cards.c1);
    const messy = sanitize({ ...data, attempts: [{ nope: true }], cards: { bad: [1, 2] } });
    expect(messy.attempts).toEqual([]);
    expect(messy.cards).toEqual({});
  });

  it("migrates v1 data, keeping name, notes and history", () => {
    const v1 = {
      version: 1,
      profile: { name: "Fel", preferredMinutes: 10 },
      progress: { "demo-ic-01": { box: 2 } },
      attempts: [],
      mistakes: [
        {
          id: "m1",
          questionId: "demo-ic-01",
          sessionId: "s",
          chosenChoiceId: "A",
          category: "concept",
          note: "spores!",
          createdAt: T0,
          resolvedAt: null,
          snapshot: { stem: "C. diff hand hygiene?", correctChoiceId: "B", correctText: "Soap and water", rationale: "Spores.", chosenText: "Alcohol rub" },
        },
      ],
      saved: {},
      sessions: [{ id: "s", startedAt: T0, endedAt: T0 + 1, plannedCount: 5, answeredCount: 5, correctCount: 4, topicIds: [] }],
      activeSession: null,
    };
    const store = memoryStorage({ [LEGACY_KEY]: JSON.stringify(v1) });
    const { data, migrated } = loadData(store);
    expect(migrated).toBe(true);
    expect(data.version).toBe(3);
    expect(data.topicsDone).toEqual({});
    expect(data.profile).toMatchObject({ name: "Fel", preferredMinutes: 10 });
    expect(data.progress).toEqual({});
    expect(data.mistakes[0]).toMatchObject({ kind: "question", note: "spores!", chosen: ["A"] });
    expect(data.mistakes[0].snapshot.answerText).toBe("B. Soap and water");
    expect(data.sessions).toHaveLength(1);
    expect(store.getItem(STORAGE_KEY)).not.toBeNull();
    expect(store.getItem(LEGACY_KEY)).not.toBeNull(); // old copy left untouched
  });

  it("migrates v2 data to v3, keeping everything and starting an empty checklist", () => {
    const v2 = { ...emptyData(), version: 2, profile: { ...emptyData().profile, name: "Fel" }, reviewersRead: { "np3-fluids-electrolytes": T0 } } as Record<string, unknown>;
    delete v2.topicsDone;
    const store = memoryStorage({ [STORAGE_KEY]: JSON.stringify(v2) });
    const { data } = loadData(store);
    expect(data.version).toBe(3);
    expect(data.profile.name).toBe("Fel");
    expect(data.reviewersRead).toEqual({ "np3-fluids-electrolytes": T0 });
    expect(data.topicsDone).toEqual({});
  });

  it("keeps her topic checklist and drops malformed ticks", () => {
    const ticked = setTopicDone(emptyData(), "np5-mood", true, T0);
    expect(ticked.topicsDone).toEqual({ "np5-mood": T0 });
    expect(setTopicDone(ticked, "np5-mood", false, T0).topicsDone).toEqual({});
    expect(sanitize({ ...ticked, topicsDone: { "np5-mood": T0, bad: "yes" } }).topicsDone).toEqual({ "np5-mood": T0 });
  });

  it("backs up unreadable data before starting fresh", () => {
    const store = memoryStorage({ [STORAGE_KEY]: "{not json" });
    const { recovered } = loadData(store);
    expect(recovered).toBe(true);
    expect([...Array(store.length).keys()].some((i) => store.key(i)!.includes(":unreadable:"))).toBe(true);
  });
});

describe("look", () => {
  it("falls back to defaults and drops anything unknown", () => {
    expect(sanitizeLook(null)).toEqual(defaultLook());
    const l = sanitizeLook({
      theme: "matcha",
      font: "comic-sans",
      paperTones: { np3: "blue", np4: "neon" },
      icons: { "page:today": "🌸🌸 extra", "<script>": "x" },
      covers: { "page:quiz": { kind: "pattern", pattern: "dots" }, "page:cards": { kind: "pattern", pattern: "nope" }, "paper:np1": { kind: "photo", id: "photo-abc" } },
      motto: "Future RN",
    });
    expect(l.theme).toBe("matcha");
    expect(l.font).toBe("modern");
    expect(l.paperTones.np3).toBe("blue");
    expect(l.paperTones.np4).toBe(DEFAULT_TONES.np4);
    expect(l.icons).toEqual({ "page:today": "🌸" });
    expect(l.covers).toEqual({ "page:quiz": { kind: "pattern", pattern: "dots" }, "paper:np1": { kind: "photo", id: "photo-abc" } });
    expect(l.motto).toBe("Future RN");
  });

  it("resolves icons and covers: her choice, then the default", () => {
    const l = { ...defaultLook(), icons: { "page:tracker": "" }, covers: { "page:today": { kind: "none" as const } } };
    expect(iconFor(l, "page:tracker")).toBe("");
    expect(iconFor(l, "paper:np5")).toBe("🧠");
    expect(coverFor(l, "page:today")).toEqual({ kind: "none" });
    expect(coverFor(l, "paper:np2").kind).toBe("pattern");
  });
});
