import type { Metadata } from "next";
import { Dashboard } from "./_components/dashboard";

export const metadata: Metadata = {
  title: "Baseline — dashboard",
  description:
    "Local dashboard for inspecting every Baseline feature against a snapshot exported by engine/.",
  // Never index the demo dashboard: it renders simulated data and would
  // otherwise compete with the real landing page in search results.
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <Dashboard />;
}
