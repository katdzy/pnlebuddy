import type { Metadata } from "next";
import { CardReview } from "@/components/cards/CardReview";

export const metadata: Metadata = { title: "Flashcards" };

export default function FlashcardsPage() {
  return <CardReview />;
}
