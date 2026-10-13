import { TKiView } from "@/components/t-ki/TKiView";
import { airtableConfigured } from "@/lib/airtable";

export const dynamic = "force-dynamic";

export default function TKiPage() {
  return <TKiView airtableReady={airtableConfigured()} />;
}
