import { auth } from "@/auth";
import { HubDashboard, HubSignIn } from "@/components/hub/HubHome";

export const dynamic = "force-dynamic";

function firstQuery(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const session = await auth();
  const queryError = firstQuery((await searchParams).error);
  const forbidden = queryError === "AccessDenied" || session?.error === "AccessDenied";

  if (session?.accessToken && !session.error) {
    return <HubDashboard email={session.user?.email} />;
  }

  return (
    <HubSignIn
      expired={Boolean(session?.error) && session?.error !== "AccessDenied"}
      forbidden={forbidden}
      canSignIn={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.AUTH_SECRET)}
    />
  );
}
