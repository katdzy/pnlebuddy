import type { Metadata } from "next";
import { AnatomyScreen } from "@/components/anatomy/AnatomyScreen";

export const metadata: Metadata = { title: "Anatomy" };

export default function AnatomyPage() {
  return <AnatomyScreen />;
}
