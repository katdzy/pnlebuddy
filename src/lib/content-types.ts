/*
 * Shapes of the study content: questions, flashcards and the manifest that
 * lists them. Shared by the app and the import scripts in scripts/ingest, so
 * keep this file free of runtime imports.
 */

import type { PaperId } from "@/content/taxonomy";

export type ChoiceId = "A" | "B" | "C" | "D" | "E" | "F";
export const CHOICE_IDS: ChoiceId[] = ["A", "B", "C", "D", "E", "F"];

export interface Choice {
  id: ChoiceId;
  text: string;
}

export interface QuestionSource {
  /** "demo" = written for the prototype. "reference" = taken from her review materials. */
  kind: "demo" | "reference";
  /** Human-readable origin, e.g. "Saunders Q&A 9e, p. 412". Never invented. */
  label: string;
  /** Path of the source file inside her RN2027 folder, when known. */
  file?: string;
  page?: number;
  /** True only after a qualified reviewer has checked the item. */
  clinicallyReviewed: boolean;
}

export interface Question {
  id: string;
  topicId: string;
  /** "nclex" = US NCLEX-style item, "pnle" = Philippine board-style item. */
  style: "nclex" | "pnle";
  /** "single" = one best answer. "multi" = select all that apply. */
  kind: "single" | "multi";
  /** Shared situation text for PNLE situational sets. */
  situation?: string;
  stem: string;
  choices: Choice[];
  /** Correct choice ids. Exactly one for "single". */
  answer: ChoiceId[];
  /** Why the answer is right. Can be empty when the source gives none. */
  rationale: string;
  /** Why each other option is wrong, when the source explains it. */
  distractorExplanations?: Partial<Record<ChoiceId, string>>;
  /** Test-taking strategy or a priority tip, when the source has one. */
  tip?: string;
  source: QuestionSource;
  /** How many of her sources contain this same question (high-yield signal). */
  seenIn?: number;
}

export interface Flashcard {
  id: string;
  topicId: string;
  /** Original deck path, e.g. "OB › Normal › Menstrual cycle". */
  deck: string;
  /** Sanitized HTML (b, i, u, br, ul, ol, li, sub, sup, img, span.cloze). */
  front: string;
  back: string;
  /** Short source label, e.g. "Anki: TO TOP THE PNLE (By Lj)". */
  source: string;
}

export interface ContentFile {
  paperId: PaperId;
  file: string;
  count: number;
}

export interface ContentManifest {
  version: 1;
  generatedAt: string;
  questionFiles: ContentFile[];
  cardFiles: ContentFile[];
  /** Per topic: how many questions and cards exist. */
  topics: Record<string, { questions: number; cards: number }>;
  /** Where the items came from, for the About section. */
  sources: { label: string; questions: number; cards: number }[];
}
