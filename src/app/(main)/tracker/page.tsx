import type { Metadata } from "next";
import { TrackerScreen } from "@/components/tracker/TrackerScreen";

export const metadata: Metadata = { title: "Tracker" };

export default function Page() {
  return <TrackerScreen />;
}
