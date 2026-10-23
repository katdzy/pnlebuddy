import { getPaper, getTopic, TOPICS, type PaperId, type Topic } from "@/content/taxonomy";
import type { Question } from "./content-types";

/** Indexed, read-only access to the question bank. */
export interface BankIndex {
  questions: Question[];
  question(id: string): Question | undefined;
  questionsInTopic(topicId: string): Question[];
  questionsInPaper(paperId: PaperId): Question[];
  /** Topics in taxonomy order. */
  topics: Topic[];
}

export function indexBank(questions: Question[]): BankIndex {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const byTopic = new Map<string, Question[]>();
  const byPaper = new Map<string, Question[]>();
  for (const q of questions) {
    const t = getTopic(q.topicId);
    if (!t) continue;
    (byTopic.get(q.topicId) ?? byTopic.set(q.topicId, []).get(q.topicId)!).push(q);
    (byPaper.get(t.paperId) ?? byPaper.set(t.paperId, []).get(t.paperId)!).push(q);
  }
  return {
    questions,
    question: (id) => byId.get(id),
    questionsInTopic: (id) => byTopic.get(id) ?? [],
    questionsInPaper: (id) => byPaper.get(id) ?? [],
    topics: TOPICS,
  };
}

export function topicName(topicId: string): string {
  return getTopic(topicId)?.name ?? "Older notes";
}

export function paperOfTopic(topicId: string): PaperId | undefined {
  return getTopic(topicId)?.paperId;
}

export function paperShort(topicId: string): string {
  const p = paperOfTopic(topicId);
  return p ? (getPaper(p)?.short ?? "") : "";
}
