import { FilloutDetail } from "@/components/fillout/FilloutDetail";
import { loadFilloutForm } from "@/lib/fillout";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CrosswordDetailPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  const { form } = await loadFilloutForm("crossword", decodeURIComponent(formId));
  if (!form) notFound();
  return <FilloutDetail form={form} kind="crossword" />;
}
