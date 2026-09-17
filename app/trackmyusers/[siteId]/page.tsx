import { SiteDetailView } from "@/components/trackmyusers/SiteDetailView";
import { loadSiteDetailDashboard } from "@/lib/posthog-site-detail";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const data = await loadSiteDetailDashboard(decodeURIComponent(siteId));
  if (!data) notFound();
  return <SiteDetailView data={data} />;
}
