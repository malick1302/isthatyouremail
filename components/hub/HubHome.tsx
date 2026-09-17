import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/hub/DashboardHeader";
import { allowedDomains } from "@/lib/authz";
import { signIn } from "@/auth";

function HubCell({
  href,
  className,
  children,
  description,
}: {
  href?: string;
  className: string;
  children: ReactNode;
  description?: string;
}) {
  const content = (
    <>
      {children}
      {description ? <span className="sr-only">. {description}</span> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} prefetch={false} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function HubShape({
  src,
  width,
  height,
  label,
  labelClassName,
}: {
  src: string;
  width: number;
  height: number;
  label: string;
  labelClassName: string;
}) {
  return (
    <>
      <span className="hub-shape-frame">
        <span className="hub-shape-spin">
          <Image
            src={src}
            alt=""
            width={width}
            height={height}
            priority
            className="hub-shape-img"
          />
        </span>
      </span>
      <span className={`hub-shape-label ${labelClassName}`}>{label}</span>
    </>
  );
}

function HubMosaic({ interactive }: { interactive: boolean }) {
  const href = (path: string) => (interactive ? path : undefined);
  const Tag = interactive ? "nav" : "div";

  return (
    <Tag
      className="hub-mosaic"
      aria-label={interactive ? "Applications" : undefined}
      aria-hidden={interactive ? undefined : true}
    >
      <HubCell
        href={href("/gazette")}
        className="hub-cell hub-gazette"
        description="Croissance des inscriptions Airtable et désabos Gazette / cours en ligne."
      >
        <span className="hub-tile-label">On t&apos;envoie une gazette</span>
      </HubCell>

      <HubCell
        href={href("/trackmyusers")}
        className="hub-cell hub-track"
        description="Suivi d'utilisation de tous tes sites Softr via PostHog."
      >
        <span className="hub-tile-label">Track my users</span>
      </HubCell>

      <HubCell
        href={href("/magic-link")}
        className="hub-cell hub-shape hub-magic"
        description="Génération de magic links Softr."
      >
        <HubShape
          src="/hub/magic-link-flower.png"
          width={793}
          height={811}
          label="Magic link"
          labelClassName="hub-shape-label-cream"
        />
      </HubCell>

      <div className="hub-cell hub-stripe-yellow" />
      <div className="hub-cell hub-stripe-black" />
      <HubCell
        href={href("/contenu-acad")}
        className="hub-cell hub-contenu"
        description="Ajouter des modules, articles, cours et vidéos dans Airtable Site Académie C&M."
      >
        <span className="hub-tile-label">contenu ACAD</span>
      </HubCell>

      <HubCell
        href={href("/modules")}
        className="hub-cell hub-shape hub-modules"
        description="Notes, % de réussite et commentaires Fillout."
      >
        <HubShape
          src="/hub/modules-star.png"
          width={433}
          height={433}
          label="Modules"
          labelClassName="hub-shape-label-ink"
        />
      </HubCell>

      <div className="hub-cell hub-stripe-ybot" />

      <HubCell
        href={href("/tu-cours-en-ligne")}
        className="hub-cell hub-cours-face"
        description="Inscriptions Fillout par session, et envoi d’un mail Brevo aux inscrits."
      >
        <span className="hub-tile-label">Tu cours en ligne ?</span>
      </HubCell>

      <HubCell
        href={href("/inbox")}
        className="hub-cell hub-inbox"
        description="Inbox Gmail colorée selon tes bases Airtable."
      >
        <span className="hub-tile-label">isthatyouremail</span>
      </HubCell>

      <HubCell
        href={href("/mots-croises")}
        className="hub-cell hub-shape hub-mots"
        description="Notes des grilles Fillout."
      >
        <HubShape
          src="/hub/mots-croises-blob.png"
          width={536}
          height={536}
          label="Mots croisés"
          labelClassName="hub-shape-label-cream"
        />
      </HubCell>
    </Tag>
  );
}

export function HubDashboard({ email }: { email?: string | null }) {
  return (
    <div className="hub-page">
      <DashboardHeader email={email} />
      <div className="hub-scene">
        <HubMosaic interactive />
      </div>
    </div>
  );
}

export function HubSignIn({
  expired,
  forbidden,
  canSignIn,
}: {
  expired?: boolean;
  forbidden?: boolean;
  canSignIn: boolean;
}) {
  return (
    <div className="hub-page">
      <DashboardHeader showSession={false} />
      <div className="hub-scene">
        <div className="hub-signin-layer">
          <div className="hub-signin">
            <p className="hub-signin-kicker">Clic et Moi</p>
            <p className="hub-signin-copy">
              Connecte-toi pour ouvrir tes apps : gazette, trackmyusers, magic link, cours en ligne,
              isthatyouremail, modules, mots croisés et contenu ACAD.
            </p>
            {forbidden ? (
              <p className="hub-signin-alert">
                Accès réservé aux comptes {allowedDomains().map((domain) => `@${domain}`).join(", ")}.
                Un Gmail personnel n’ouvre ni les bases Airtable ni les campagnes.
              </p>
            ) : null}
            {expired ? (
              <p className="hub-signin-alert">Session expirée. Reconnecte-toi.</p>
            ) : null}
            {!canSignIn ? (
              <p className="hub-signin-alert hub-signin-alert-muted">
                Copie <code>.env.example</code> vers <code>.env.local</code> et remplis les clés Google
                avant de te connecter.
              </p>
            ) : null}
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <button type="submit" className="hub-signin-btn">
                Continuer avec Google
              </button>
            </form>
          </div>
        </div>
        <HubMosaic interactive={false} />
      </div>
    </div>
  );
}
