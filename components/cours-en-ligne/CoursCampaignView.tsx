"use client";

import { CampaignHistory } from "@/components/gazette/CampaignHistory";
import type { CampaignTemplate } from "@/lib/campaigns";
import { coursFormLabel, type CoursFormOption, type CoursFormRecipients } from "@/lib/cours-en-ligne";
import { contrastText, isSendableEmail } from "@/lib/email";
import { useEffect, useMemo, useRef, useState } from "react";

type RecipientsByForm = Record<string, CoursFormRecipients>;

type SendState =
  | { phase: "idle" }
  | { phase: "importing" }
  | { phase: "waiting" }
  | { phase: "launching" }
  | { phase: "done"; name: string; count: number }
  | { phase: "error"; message: string };

function formatCount(value: number): string {
  return value.toLocaleString("fr-FR");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function CoursCampaignView({
  forms,
  initialFormId,
  filloutReady,
  brevoReady,
  senderReady,
}: {
  forms: CoursFormOption[];
  initialFormId: string | null;
  filloutReady: boolean;
  brevoReady: boolean;
  senderReady: boolean;
}) {
  const knownInitial = forms.some((form) => form.formId === initialFormId) ? initialFormId : null;
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(knownInitial ? [knownInitial] : []),
  );
  const [recipients, setRecipients] = useState<RecipientsByForm>({});
  const [loadingFormId, setLoadingFormId] = useState<string | null>(null);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testPending, setTestPending] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [send, setSend] = useState<SendState>({ phase: "idle" });
  const [historyKey, setHistoryKey] = useState(0);
  const loadGen = useRef(0);
  const recipientsRef = useRef<RecipientsByForm>({});
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    if (!brevoReady) return;
    let cancelled = false;
    async function loadTemplates() {
      try {
        const response = await fetch("/api/campaigns/templates");
        const data = (await response.json()) as { templates?: CampaignTemplate[]; error?: string };
        if (cancelled) return;
        if (!response.ok) {
          setTemplatesError(data.error ?? "Impossible de lister les templates Brevo.");
          return;
        }
        setTemplates(data.templates ?? []);
        setTemplatesError(null);
      } catch {
        if (!cancelled) setTemplatesError("Impossible de lister les templates Brevo.");
      }
    }
    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [brevoReady]);

  useEffect(() => {
    if (!filloutReady || selectedRef.current.size === 0) return;
    void loadSelectedRecipients(selectedRef.current);
    // Chargement des sessions déjà cochées (lien ?form=).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filloutReady]);

  const summary = useMemo(() => {
    const rows = forms
      .filter((form) => selected.has(form.formId))
      .map((form) => recipients[form.formId])
      .filter((row): row is CoursFormRecipients => Boolean(row));
    const allEmails = rows.flatMap((row) => row.emails);
    const unique = new Set(allEmails);
    return {
      uniqueCount: unique.size,
      emails: [...unique],
      duplicates: allEmails.length - unique.size,
      missing: rows.reduce((sum, row) => sum + row.missing, 0),
      invalid: rows.reduce((sum, row) => sum + row.invalid, 0),
      loaded: rows.length,
      expected: selected.size,
    };
  }, [forms, recipients, selected]);

  const recipientsReady = summary.loaded === summary.expected && summary.expected > 0;
  const sending = send.phase === "importing" || send.phase === "waiting" || send.phase === "launching";
  const selectedTemplate = templates.find((item) => item.id === templateId) ?? null;

  async function loadSelectedRecipients(currentSelected: Set<string>, reset = false) {
    const gen = ++loadGen.current;
    setRecipientsError(null);
    if (reset) {
      recipientsRef.current = {};
      setRecipients({});
    }
    const cached = recipientsRef.current;
    const toLoad = forms.filter((form) => currentSelected.has(form.formId) && !cached[form.formId]);

    for (const form of toLoad) {
      if (gen !== loadGen.current) return;
      setLoadingFormId(form.formId);
      try {
        const response = await fetch("/api/cours-en-ligne/recipients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formId: form.formId }),
        });
        const data = (await response.json()) as CoursFormRecipients & { error?: string };
        if (gen !== loadGen.current) return;
        if (!response.ok) {
          setRecipientsError(data.error ?? `Impossible de lire ${form.displayName}.`);
          break;
        }
        recipientsRef.current = { ...recipientsRef.current, [form.formId]: data };
        setRecipients(recipientsRef.current);
      } catch {
        if (gen !== loadGen.current) return;
        setRecipientsError(`Impossible de lire ${form.displayName}.`);
        break;
      }
    }
    if (gen !== loadGen.current) return;
    setLoadingFormId(null);
  }

  async function toggleForm(formId: string) {
    const next = new Set(selected);
    if (next.has(formId)) {
      next.delete(formId);
    } else {
      next.add(formId);
    }
    setSelected(next);
    setConfirm(false);
    if (next.has(formId) && !recipientsRef.current[formId]) {
      await loadSelectedRecipients(next);
    }
  }

  async function sendTest() {
    if (!templateId) return;
    setTestPending(true);
    setTestError(null);
    setTestOk(false);
    try {
      const response = await fetch("/api/campaigns/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, email: testEmail }),
      });
      if (!response.ok) {
        setTestError(await readError(response, "Impossible d'envoyer le test."));
        return;
      }
      setTestOk(true);
    } catch {
      setTestError("Impossible d'envoyer le test.");
    } finally {
      setTestPending(false);
    }
  }

  async function launchCampaign() {
    if (!templateId || summary.emails.length === 0) return;
    setSend({ phase: "importing" });
    try {
      const selectedForms = forms
        .filter((form) => selected.has(form.formId))
        .map((form) => {
          const row = recipients[form.formId];
          return row
            ? { baseId: form.formId, label: row.label, emails: row.emails }
            : null;
        })
        .filter((row): row is { baseId: string; label: string; emails: string[] } =>
          Boolean(row && row.emails.length > 0),
        );
      const startResponse = await fetch("/api/campaigns/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "session", templateId, bases: selectedForms }),
      });
      const startData = (await startResponse.json()) as {
        lists?: { listId: number; processId: number }[];
        listIds?: number[];
        error?: string;
      };
      if (!startResponse.ok || !startData.lists?.length) {
        setSend({ phase: "error", message: startData.error ?? "Impossible de préparer l'import." });
        return;
      }

      setSend({ phase: "waiting" });
      const pending = new Set(startData.lists.map((list) => list.processId));
      for (let attempt = 0; attempt < 90 && pending.size > 0; attempt += 1) {
        for (const processId of [...pending]) {
          const statusResponse = await fetch(
            `/api/campaigns/import-status?processId=${processId}`,
          );
          const statusData = (await statusResponse.json()) as { status?: string; error?: string };
          if (!statusResponse.ok) {
            setSend({
              phase: "error",
              message: statusData.error ?? "Impossible de suivre l'import Brevo.",
            });
            return;
          }
          if (statusData.status === "completed") pending.delete(processId);
          if (statusData.status === "failed" || statusData.status === "cancelled") {
            setSend({ phase: "error", message: "L'import des contacts Brevo a échoué." });
            return;
          }
        }
        if (pending.size === 0) break;
        if (attempt === 89) {
          setSend({ phase: "error", message: "L'import Brevo prend trop de temps." });
          return;
        }
        await wait(2000);
      }

      setSend({ phase: "launching" });
      const launchResponse = await fetch("/api/campaigns/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "session",
          templateId,
          listIds: startData.listIds ?? startData.lists.map((list) => list.listId),
        }),
      });
      const launchData = (await launchResponse.json()) as { name?: string; error?: string };
      if (!launchResponse.ok) {
        setSend({ phase: "error", message: launchData.error ?? "Impossible d'envoyer la campagne." });
        return;
      }
      setSend({
        phase: "done",
        name: launchData.name ?? "Session cours",
        count: summary.uniqueCount,
      });
      setConfirm(false);
      setHistoryKey((current) => current + 1);
    } catch {
      setSend({ phase: "error", message: "Impossible d'envoyer la campagne." });
    }
  }

  function reset() {
    loadGen.current += 1;
    recipientsRef.current = {};
    setTemplateId(null);
    setSelected(new Set());
    setRecipients({});
    setConfirm(false);
    setSend({ phase: "idle" });
    setTestOk(false);
    setTestError(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--paper)] lg:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
          <header>
            <h1 className="text-3xl font-semibold leading-tight">Envoyer un mail aux inscrits</h1>
            <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">
              Même procédé que la gazette : tu choisis un template Brevo (lien et contenu gérés
              dans Brevo), puis les sessions Fillout à qui l&apos;envoyer.
            </p>
          </header>

          {!filloutReady ? (
            <p className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
              Ajoute <code className="text-[var(--ink)]">FILLOUT_API_KEY</code> pour lire les
              inscriptions.
            </p>
          ) : null}
          {!brevoReady ? (
            <p className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
              Ajoute <code className="text-[var(--ink)]">BREVO_API_KEY</code> dans{" "}
              <code className="text-[var(--ink)]">.env.local</code> : Brevo → SMTP &amp; API.
            </p>
          ) : null}
          {brevoReady && !senderReady ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Ajoute <code className="font-medium">BREVO_SENDER_EMAIL</code> et{" "}
              <code className="font-medium">BREVO_SENDER_NAME</code> (expéditeur déjà vérifié dans
              Brevo) avant l&apos;envoi réel. Le test template reste possible.
            </p>
          ) : null}

          <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_20px_50px_rgba(36,28,20,0.06)]">
            <h2 className="text-lg font-semibold">Template Brevo</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Templates transactionnels actifs. Le lien (Meet, replay, page d&apos;inscription…) se
              gère dans le template Brevo.
            </p>
            {templatesError ? (
              <p className="mt-3 text-sm text-red-700">{templatesError}</p>
            ) : (
              <select
                className="mt-4 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-[15px] outline-none focus:border-[var(--brand)]"
                value={templateId ?? ""}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setTemplateId(Number.isInteger(value) && value > 0 ? value : null);
                  setTestOk(false);
                  setConfirm(false);
                }}
                disabled={sending || !brevoReady}
              >
                <option value="">Choisir un template…</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                    {template.subject ? ` — ${template.subject}` : ""}
                  </option>
                ))}
              </select>
            )}
            {templates.length === 0 && !templatesError ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Aucun template actif. Crée-les dans Brevo → Transactional → Templates.
              </p>
            ) : null}
          </section>

          <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_20px_50px_rgba(36,28,20,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Sessions Fillout</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Coche la ou les sessions. On envoie uniquement aux e-mails extraits des
                  soumissions.
                </p>
              </div>
              {forms.length > 0 ? (
                <button
                  type="button"
                  className="text-sm font-medium text-[var(--brand)] hover:underline"
                  onClick={() => {
                    const next = new Set(forms.map((form) => form.formId));
                    setSelected(next);
                    if (filloutReady) void loadSelectedRecipients(next);
                  }}
                  disabled={sending || !filloutReady}
                >
                  Tout sélectionner
                </button>
              ) : null}
            </div>
            {forms.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Aucun formulaire dont le nom commence par « Cours en ligne ».
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {forms.map((form) => {
                  const checked = selected.has(form.formId);
                  const row = recipients[form.formId];
                  return (
                    <li key={form.formId}>
                      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
                        <span className="flex min-w-0 items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={sending || !filloutReady}
                            onChange={() => void toggleForm(form.formId)}
                          />
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: form.color }}
                            aria-hidden
                          />
                          <span className="min-w-0">
                            <span className="block font-medium">{coursFormLabel(form)}</span>
                            <span className="block truncate text-xs text-[var(--muted)]">
                              {form.name}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-[var(--muted)]">
                          {loadingFormId === form.formId
                            ? "Lecture…"
                            : row
                              ? `${formatCount(row.emails.length)} e-mails`
                              : checked
                                ? "—"
                                : ""}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            {loadingFormId ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Lecture de {forms.find((form) => form.formId === loadingFormId)?.displayName}…
              </p>
            ) : null}
            {recipientsError ? <p className="mt-3 text-sm text-red-700">{recipientsError}</p> : null}
          </section>

          <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_20px_50px_rgba(36,28,20,0.06)]">
            <h2 className="text-lg font-semibold">Récapitulatif</h2>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {formatCount(summary.uniqueCount)}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              destinataire{summary.uniqueCount > 1 ? "s" : ""} unique
              {summary.uniqueCount > 1 ? "s" : ""}
              {summary.missing > 0
                ? ` · ${formatCount(summary.missing)} sans e-mail`
                : ""}
              {summary.duplicates > 0
                ? ` · ${formatCount(summary.duplicates)} doublon(s) écarté(s)`
                : ""}
              {summary.invalid > 0
                ? ` · ${formatCount(summary.invalid)} e-mail(s) invalide(s)`
                : ""}
            </p>
          </section>

          <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_20px_50px_rgba(36,28,20,0.06)]">
            <h2 className="text-lg font-semibold">Envoi test</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Envoie le template choisi à une seule adresse avant la campagne (50 tests/jour côté
              Brevo).
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={testEmail}
                onChange={(event) => {
                  setTestEmail(event.target.value);
                  setTestOk(false);
                }}
                placeholder="prenom.nom@example.com"
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-[15px] outline-none focus:border-[var(--brand)]"
                disabled={sending}
              />
              <button
                type="button"
                onClick={() => void sendTest()}
                disabled={
                  !templateId || !isSendableEmail(testEmail) || testPending || sending || !brevoReady
                }
                className="shrink-0 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                style={{ color: contrastText("#2563eb") }}
              >
                {testPending ? "Envoi du test…" : "Envoyer un test"}
              </button>
            </div>
            {testOk ? (
              <p className="mt-3 text-sm text-emerald-700">Test envoyé à {testEmail}.</p>
            ) : null}
            {testError ? <p className="mt-3 text-sm text-red-700">{testError}</p> : null}
          </section>

          <section className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_20px_50px_rgba(36,28,20,0.06)]">
            {!confirm ? (
              <button
                type="button"
                onClick={() => setConfirm(true)}
                disabled={
                  !recipientsReady ||
                  !templateId ||
                  summary.uniqueCount === 0 ||
                  sending ||
                  !senderReady
                }
                className="w-full rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                Envoyer la campagne
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm leading-6">
                  Confirmer l&apos;envoi de{" "}
                  <span className="font-semibold">{selectedTemplate?.name ?? "ce template"}</span>{" "}
                  à <span className="font-semibold">{formatCount(summary.uniqueCount)}</span>{" "}
                  inscrit{summary.uniqueCount > 1 ? "s" : ""} ?
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void launchCampaign()}
                    disabled={sending}
                    className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {send.phase === "importing"
                      ? "Import des contacts…"
                      : send.phase === "waiting"
                        ? "Import Brevo en cours…"
                        : send.phase === "launching"
                          ? "Envoi de la campagne…"
                          : `Oui, envoyer à ${formatCount(summary.uniqueCount)} personnes`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm(false)}
                    disabled={sending}
                    className="rounded-full border border-[var(--line)] px-5 py-3 text-sm font-medium hover:border-[var(--brand)] disabled:opacity-60"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
            {send.phase === "error" ? (
              <p className="mt-3 text-sm text-red-700">{send.message}</p>
            ) : null}
            {send.phase === "done" ? (
              <div className="mt-4 rounded-2xl bg-[var(--paper)] px-4 py-3 text-sm">
                <p>
                  Campagne <span className="font-semibold">{send.name}</span> envoyée à{" "}
                  {formatCount(send.count)} destinataire{send.count > 1 ? "s" : ""}.
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-3 text-sm font-medium text-[var(--brand)] hover:underline"
                >
                  Nouvelle campagne
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </div>
      <CampaignHistory
        brevoReady={brevoReady}
        refreshKey={historyKey}
        kinds={["session"]}
        showBases={false}
      />
    </div>
  );
}
