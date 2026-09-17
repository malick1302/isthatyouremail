import { redirect } from "next/navigation";

export default async function ThreadRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/inbox?mail=${encodeURIComponent(id)}`);
}
