import type { Metadata } from "next";
import { QuizScreen } from "@/components/quiz/QuizScreen";

export const metadata: Metadata = { title: "Quiz" };

export default function Page() {
  return <QuizScreen />;
}
