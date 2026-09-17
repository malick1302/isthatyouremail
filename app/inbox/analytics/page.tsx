import { AnalyticsView } from "@/components/AnalyticsView";
import { auth } from "@/auth";
import { analyticsErrorMessage, loadAnalyticsDashboard } from "@/lib/analytics";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.accessToken || session.error) redirect("/");

  let error = "";
  let data = null;
  try {
    data = await loadAnalyticsDashboard(session.accessToken, session.user?.email);
  } catch (caught) {
    error = analyticsErrorMessage(caught);
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--paper)] p-8">
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </p>
      </div>
    );
  }

  return <AnalyticsView data={data} />;
}
