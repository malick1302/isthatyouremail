import { CoursCampaignView } from "@/components/cours-en-ligne/CoursCampaignView";
import { brevoConfigured, brevoSender } from "@/lib/brevo";
import { listCoursFormOptions } from "@/lib/cours-en-ligne";
import { isFilloutConfigured } from "@/lib/fillout";

export const dynamic = "force-dynamic";

export default async function CoursCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawForm = params.form;
  const initialFormId = Array.isArray(rawForm) ? rawForm[0] : (rawForm ?? null);
  const filloutReady = isFilloutConfigured();
  let forms: Awaited<ReturnType<typeof listCoursFormOptions>> = [];
  if (filloutReady) {
    try {
      forms = await listCoursFormOptions();
    } catch {
      forms = [];
    }
  }

  return (
    <CoursCampaignView
      forms={forms}
      initialFormId={initialFormId}
      filloutReady={filloutReady}
      brevoReady={brevoConfigured()}
      senderReady={Boolean(brevoSender())}
    />
  );
}
