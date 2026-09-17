import { allowedDomains, isAllowedEmail, isVerifiedGoogleEmail } from "@/lib/authz";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

const hostedDomain = allowedDomains().length === 1 ? allowedDomains()[0] : undefined;

const GMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.settings.basic",
].join(" ");

function denyToken(token: JWT): JWT {
  return {
    ...token,
    accessToken: undefined,
    refreshToken: undefined,
    expiresAt: undefined,
    error: "AccessDenied",
  };
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    return { ...token, error: "RefreshAccessTokenError" };
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: String(token.refreshToken),
    }),
  });

  const refreshed = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
  };

  if (!response.ok || !refreshed.access_token) {
    return { ...token, error: "RefreshAccessTokenError" };
  }

  return {
    ...token,
    accessToken: refreshed.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600),
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
    error: undefined,
  };
}

const nextAuth = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/",
    error: "/",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: GMAIL_SCOPES,
          access_type: "offline",
          prompt: "select_account consent",
          ...(hostedDomain ? { hd: hostedDomain } : {}),
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      const googleProfile = profile as { email_verified?: boolean | string } | undefined;
      return isVerifiedGoogleEmail(googleProfile) && isAllowedEmail(user.email);
    },
    async jwt({ token, account, user }) {
      const email = (user?.email ?? token.email) as string | undefined;
      if (!isAllowedEmail(email)) {
        return denyToken(token);
      }

      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          error: undefined,
        };
      }

      if (token.error === "AccessDenied") {
        return denyToken(token);
      }

      if (token.expiresAt && Date.now() < Number(token.expiresAt) * 1000 - 30_000) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token.error === "AccessDenied" || !isAllowedEmail(session.user?.email)) {
        session.accessToken = undefined;
        session.error = "AccessDenied";
        return session;
      }
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined;
      return session;
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

export async function auth() {
  const session = await nextAuth.auth();
  if (!session) return session;
  if (!isAllowedEmail(session.user?.email)) {
    return { ...session, accessToken: undefined, error: "AccessDenied" };
  }
  return session;
}
