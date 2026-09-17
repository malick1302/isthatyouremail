import { CampaignView } from "@/components/gazette/CampaignView";
import { getConfiguredBases } from "@/lib/bases";
import { brevoConfigured, brevoSender } from "@/lib/brevo";

export const dynamic = "force-dynamic";

export default function GazetteCampaignPage() {
  const bases = getConfiguredBases().map((base) => ({
    id: base.id,
    label: base.label,
    color: base.color,
  }));

  return (
    <CampaignView
      bases={bases}
      brevoReady={brevoConfigured()}
      senderReady={Boolean(brevoSender())}
    />
  );
}
