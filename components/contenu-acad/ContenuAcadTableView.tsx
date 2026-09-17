"use client";

import type { ContenuField, ContenuListItem, ContenuTableData } from "@/lib/contenu-acad";
import { useMemo, useState, type FormEvent } from "react";

function todayIsoDate() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function formatListDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [year, month, day] = value.slice(0, 10).split("-");
      return `${day}/${month}/${year}`;
    }
    return value;
  }
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: value.includes("T") ? "2-digit" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
  });
}

function hourLabelFromDatetime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hour = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return hour.replace(":", "h");
}

function durationMinutes(value: string) {
  if (value.includes("45")) return 45;
  if (value.includes("1h30") || value.includes("1h30")) return 90;
  if (value.startsWith("1")) return 60;
  return 60;
}

function addMinutesToDatetimeLocal(value: string, minutes: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialValues(data: ContenuTableData): Record<string, string | string[] | number> {
  const values: Record<string, string | string[] | number> = {};
  for (const field of data.table.fields) {
    if (field.defaultValue !== undefined) values[field.name] = field.defaultValue;
    else if (field.type === "multipleSelect") values[field.name] = [];
    else if (field.type === "date") values[field.name] = todayIsoDate();
    else if (field.type === "number") values[field.name] = "";
    else values[field.name] = "";
  }
  return values;
}

function optionLabel(value: string) {
  if (value === "✅") return "Oui";
  if (value === "❌") return "Non";
  return value.trim();
}

export function ContenuAcadTableView({ data }: { data: ContenuTableData }) {
  const [values, setValues] = useState(() => initialValues(data));
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ContenuListItem | null>(null);
  const [records, setRecords] = useState(data.records);
  const [query, setQuery] = useState("");

  const options = data.options;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((record) =>
      [record.title, record.description, record.status].some((item) => item?.toLowerCase().includes(q)),
    );
  }, [query, records]);

  function setField(name: string, value: string | string[] | number) {
    setValues((current) => {
      const next = { ...current, [name]: value };
      if (name === "Date de cours" && typeof value === "string") {
        const hour = hourLabelFromDatetime(value);
        if (hour) next["Heure de début"] = hour;
        const duration = String(next["Durée du cours"] ?? "1h");
        const end = addMinutesToDatetimeLocal(value, durationMinutes(duration));
        if (end) next["Date de cours FIN"] = end;
      }
      if (name === "Durée du cours") {
        const start = String(next["Date de cours"] ?? "");
        if (start) {
          const end = addMinutesToDatetimeLocal(start, durationMinutes(String(value)));
          if (end) next["Date de cours FIN"] = end;
        }
      }
      return next;
    });
  }

  function toggleMulti(name: string, option: string) {
    const current = values[name];
    const list = Array.isArray(current) ? current : [];
    setField(
      name,
      list.includes(option) ? list.filter((item) => item !== option) : [...list, option],
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    setCreated(null);

    try {
      const body = new FormData();
      body.set("slug", data.table.slug);
      body.set("values", JSON.stringify(values));
      if (imageUrl.trim()) body.set("imageUrl", imageUrl.trim());
      if (imageFile) body.set("image", imageFile);

      const response = await fetch("/api/contenu-acad", { method: "POST", body });
      const payload = (await response.json()) as { record?: ContenuListItem; error?: string };
      if (!response.ok || !payload.record) {
        setError(payload.error ?? "Impossible d’ajouter le contenu.");
        return;
      }
      setCreated(payload.record);
      setRecords((current) => [payload.record as ContenuListItem, ...current]);
      setValues(initialValues(data));
      setImageUrl("");
      setImageFile(null);
      const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
      if (fileInput) fileInput.value = "";
    } catch {
      setError("Impossible d’ajouter le contenu.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--paper)] p-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <section>
          <header className="mb-5">
            <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
              {data.table.label}
            </h1>
            <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">{data.table.description}</p>
          </header>

          {!data.configured ? (
            <p className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
              {data.error}
            </p>
          ) : null}

          {data.error && data.configured ? (
            <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {data.error}
            </p>
          ) : null}

          <form
            onSubmit={(event) => void onSubmit(event)}
            className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_20px_50px_rgba(36,28,20,0.06)]"
          >
            <div className="flex flex-col gap-5">
              {data.table.fields.map((field) => (
                <FieldControl
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  options={options[field.name] ?? field.options ?? []}
                  onChange={(value) => setField(field.name, value)}
                  onToggle={(option) => toggleMulti(field.name, option)}
                />
              ))}

              <div>
                <p className="text-sm font-medium">Image</p>
                <div className="mt-2 flex gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder="https://… (URL publique)"
                    className="min-w-0 flex-1 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-[15px] outline-none focus:border-[var(--brand)]"
                  />
                  {/^https?:\/\//i.test(imageUrl.trim()) ? (
                    <a
                      href={imageUrl.trim()}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 self-stretch rounded-2xl border border-[var(--line)] px-3 py-3 text-sm font-medium text-[var(--brand)] hover:border-[var(--brand)]"
                    >
                      Ouvrir
                    </a>
                  ) : null}
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--brand)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  URL publique ou fichier (JPEG, PNG, WebP — 4,5 Mo max).
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending || !data.configured}
              className="mt-6 w-full rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Enregistrement…" : `Ajouter dans ${data.table.label}`}
            </button>

            {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
            {created ? (
              <p className="mt-3 rounded-2xl bg-[#efe6fb] px-4 py-3 text-sm text-[#5b2c6f]">
                « {created.title} » a été ajouté dans Airtable.
                {created.links.length > 0 ? (
                  <>
                    {" "}
                    {created.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mr-2 font-medium underline decoration-transparent hover:decoration-current"
                      >
                        {link.label} ↗
                      </a>
                    ))}
                  </>
                ) : null}
              </p>
            ) : null}
          </form>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_20px_50px_rgba(36,28,20,0.06)]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Déjà en ligne</h2>
                <p className="text-sm text-[var(--muted)]">{records.length} fiches récentes</p>
              </div>
            </div>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrer par titre…"
              className="mt-3 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            />
            <ul className="mt-4 flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
              {filtered.length === 0 ? (
                <li className="text-sm text-[var(--muted)]">Aucun contenu pour l’instant.</li>
              ) : (
                filtered.map((record) => {
                  const primary = record.links[0];
                  return (
                    <li key={record.id} className="rounded-2xl bg-[var(--paper)] p-3">
                      <div className="flex gap-3">
                        {record.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={record.imageUrl}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="h-14 w-14 shrink-0 rounded-xl bg-[#efe6fb]" />
                        )}
                        <div className="min-w-0 flex-1">
                          {primary ? (
                            <a
                              href={primary.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate font-medium text-[var(--brand)] hover:underline"
                            >
                              {record.title}
                            </a>
                          ) : (
                            <p className="truncate font-medium">{record.title}</p>
                          )}
                          <p className="text-xs text-[var(--muted)]">
                            {[formatListDate(record.date), record.status].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                      {record.links.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {record.links.map((link) => (
                            <a
                              key={`${record.id}-${link.url}`}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--brand)] hover:border-[var(--brand)]"
                            >
                              {link.label} ↗
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FieldControl({
  field,
  value,
  options,
  onChange,
  onToggle,
}: {
  field: ContenuField;
  value: string | string[] | number | undefined;
  options: string[];
  onChange: (value: string | string[] | number) => void;
  onToggle: (option: string) => void;
}) {
  const id = `contenu-${field.name}`;
  const textValue = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const selected = Array.isArray(value) ? value : [];

  return (
    <div>
      <label className="text-sm font-medium" htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-[var(--brand)]"> *</span> : null}
      </label>
      {field.hint ? <p className="mt-0.5 text-xs text-[var(--muted)]">{field.hint}</p> : null}

      {field.type === "textarea" ? (
        <textarea
          id={id}
          required={field.required}
          rows={4}
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-[15px] outline-none focus:border-[var(--brand)]"
        />
      ) : field.type === "multipleSelect" ? (
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={field.label}>
          {options.map((option) => {
            const active = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => onToggle(option)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-[var(--brand)] text-white"
                    : "border border-[var(--line)] bg-white text-[var(--ink)]"
                }`}
              >
                {optionLabel(option)}
              </button>
            );
          })}
        </div>
      ) : field.type === "singleSelect" ? (
        <select
          id={id}
          required={field.required}
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-[15px] outline-none focus:border-[var(--brand)]"
        >
          <option value="">Choisir…</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {optionLabel(option)}
            </option>
          ))}
        </select>
      ) : field.type === "url" ? (
        <div className="mt-2 flex gap-2">
          <input
            id={id}
            required={field.required}
            type="url"
            value={textValue}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
            className="min-w-0 flex-1 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-[15px] outline-none focus:border-[var(--brand)]"
          />
          {/^https?:\/\//i.test(textValue.trim()) ? (
            <a
              href={textValue.trim()}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 self-stretch rounded-2xl border border-[var(--line)] px-3 py-3 text-sm font-medium text-[var(--brand)] hover:border-[var(--brand)]"
            >
              Ouvrir
            </a>
          ) : null}
        </div>
      ) : (
        <input
          id={id}
          required={field.required}
          type={
            field.type === "number"
              ? "number"
              : field.type === "date"
                ? "date"
                : field.type === "datetime"
                  ? "datetime-local"
                  : "text"
          }
          value={textValue}
          onChange={(event) =>
            onChange(field.type === "number" ? event.target.value : event.target.value)
          }
          placeholder={field.placeholder}
          className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-[15px] outline-none focus:border-[var(--brand)]"
        />
      )}
    </div>
  );
}
