import { CoursEnLigneOverview } from "@/components/cours-en-ligne/CoursEnLigneOverview";
import { loadCoursEnLigneDashboard } from "@/lib/cours-en-ligne";

export const dynamic = "force-dynamic";

export default async function TuCoursEnLignePage() {
  const data = await loadCoursEnLigneDashboard();
  return <CoursEnLigneOverview data={data} />;
}
