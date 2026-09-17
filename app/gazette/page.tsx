import { auth } from "@/auth";
import { GazetteView } from "@/components/gazette/GazetteView";
import { loadGazetteDashboard } from "@/lib/gazette";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GazettePage() {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    redirect("/");
  }

  const data = await loadGazetteDashboard({ apply: true });
  return <GazetteView data={data} />;
}
