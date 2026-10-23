// Supportive microcopy. No guilt, no urgency, no streaks.

import { DAY_MS } from "./scheduler";

export function greeting(now: number, name: string): string {
  const hour = new Date(now).getHours();
  const part = hour < 5 ? "Hello" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const n = name.trim();
  return n ? `${part}, ${n}.` : `${part}.`;
}

const ENCOURAGEMENTS = [
  "One question at a time is plenty.",
  "Short sessions still count.",
  "You don't have to do everything today.",
  "Steady beats perfect.",
  "Every rationale you read is time well spent.",
  "Small steps add up quietly.",
];

export function encouragement(now: number, lastStudiedAt: number | null): string {
  if (lastStudiedAt === null) return "Welcome. Let's start small, with one short session.";
  if (now - lastStudiedAt > 3 * DAY_MS) return "Welcome back. Everything is right where you left it.";
  const day = Math.floor(now / DAY_MS);
  return ENCOURAGEMENTS[day % ENCOURAGEMENTS.length];
}

export function sessionClosing(correct: number, answered: number, planned: number): string {
  if (answered < planned) return "You stopped partway, and that's completely fine. What you answered is saved.";
  const ratio = answered ? correct / answered : 0;
  if (ratio >= 0.8) return "That was a strong round. These will come back later so they stay fresh.";
  if (ratio >= 0.5) return "Good, honest work. The ones you missed will come back first next time.";
  return "Tough round, and that's how learning works. The ones you missed will come back first next time.";
}

export function formatDate(at: number): string {
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
