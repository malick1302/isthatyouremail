import { UsageOverview } from "@/components/trackmyusers/UsageOverview";
import { loadUsageDashboard } from "@/lib/posthog";
import { connection } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function TrackMyUsersPage() {
  await connection();
  const data = await loadUsageDashboard();
  return <UsageOverview data={data} />;
}
