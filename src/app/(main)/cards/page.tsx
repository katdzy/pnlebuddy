import type { Metadata } from "next";
import { CardsScreen } from "@/components/cards/CardsScreen";

export const metadata: Metadata = { title: "Flashcards" };

export default function Page() {
  return <CardsScreen />;
}
