import type { Metadata } from "next";
import { NotebookScreen } from "@/components/notebook/NotebookScreen";

export const metadata: Metadata = { title: "Notebook" };

export default function NotebookPage() {
  return <NotebookScreen />;
}
