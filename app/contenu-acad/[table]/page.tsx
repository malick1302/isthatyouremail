import { ContenuAcadTableView } from "@/components/contenu-acad/ContenuAcadTableView";
import { loadContenuTable } from "@/lib/contenu-acad";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ContenuAcadTablePage({
  params,
}: {
  params: Promise<{ table: string }>;
}) {
  const { table: slug } = await params;
  const data = await loadContenuTable(slug);
  if (!data) notFound();
  return <ContenuAcadTableView data={data} />;
}
