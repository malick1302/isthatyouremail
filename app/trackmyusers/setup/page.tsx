import { SetupGuide } from "@/components/trackmyusers/SetupGuide";
import { buildPostHogSnippet, getPostHogHost } from "@/lib/posthog";
import { getSoftrSites } from "@/lib/softr-sites";

export const dynamic = "force-dynamic";

export default function TrackMyUsersSetupPage() {
  const sites = getSoftrSites();
  const snippets = Object.fromEntries(sites.map((site) => [site.id, buildPostHogSnippet(site.id)]));

  return <SetupGuide host={getPostHogHost()} sites={sites} snippets={snippets} />;
}
