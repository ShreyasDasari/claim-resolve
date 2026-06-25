import type { Metadata } from "next"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export const metadata: Metadata = {
  title: "Resolution Trace · claim-resolve",
  description:
    "Replay the 3-agent entity-resolution pipeline: schema mapping, entity resolution, and conflict resolution across insurance carriers, with confidence scoring and governance thresholds.",
}

export default function DashboardPage() {
  return <DashboardClient />
}
