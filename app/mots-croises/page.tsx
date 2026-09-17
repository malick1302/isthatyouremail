import { FilloutOverview } from "@/components/fillout/FilloutOverview";
import { loadFilloutDashboard } from "@/lib/fillout";

export const dynamic = "force-dynamic";

export default async function CrosswordPage() {
  const data = await loadFilloutDashboard("crossword");
  return <FilloutOverview data={data} />;
}
