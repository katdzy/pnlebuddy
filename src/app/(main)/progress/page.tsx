import { redirect } from "next/navigation";

// The old Progress screen became the Tracker.
export default function ProgressPage() {
  redirect("/tracker");
}
