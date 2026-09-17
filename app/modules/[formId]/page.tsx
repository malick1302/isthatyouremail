import { FilloutDetail } from "@/components/fillout/FilloutDetail";
import { loadFilloutForm } from "@/lib/fillout";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  const { form } = await loadFilloutForm("module", decodeURIComponent(formId));
  if (!form) notFound();
  return <FilloutDetail form={form} kind="module" />;
}
