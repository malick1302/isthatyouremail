import { FilloutOverview } from "@/components/fillout/FilloutOverview";
import { loadFilloutDashboard } from "@/lib/fillout";

export const dynamic = "force-dynamic";

export default async function ModulesPage() {
  const data = await loadFilloutDashboard("module");
  return <FilloutOverview data={data} />;
}
