import { MagicLinkView } from "@/components/magic-link/MagicLinkView";
import { getConfiguredBases } from "@/lib/bases";
import { softrConfigured } from "@/lib/softr";
import { getSoftrSiteForBase } from "@/lib/softr-sites";

export const dynamic = "force-dynamic";

export default function MagicLinkPage() {
  const bases = getConfiguredBases().flatMap((base) => {
    const site = getSoftrSiteForBase(base);
    if (!site) return [];
    return [
      {
        id: base.id,
        label: base.label,
        color: base.color,
        softrLabel: site.label,
        softrUrl: site.url,
      },
    ];
  });

  return <MagicLinkView bases={bases} softrReady={softrConfigured()} />;
}
