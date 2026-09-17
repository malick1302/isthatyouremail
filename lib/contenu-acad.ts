import { airtableConfigured } from "@/lib/airtable";

export const CONTENU_ACAD_BASE_ID = "appi9cU6A1Cjhc9g2";
export const CONTENU_ACAD_BASE_LABEL = "Site Académie C&M";

export type ContenuFieldType =
  | "text"
  | "textarea"
  | "url"
  | "date"
  | "datetime"
  | "number"
  | "singleSelect"
  | "multipleSelect";

export type ContenuField = {
  name: string;
  label: string;
  type: ContenuFieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: string[];
  defaultValue?: string | string[] | number;
};

export type ContenuTableSlug = "modules" | "articles" | "cours" | "videotheque";

export type ContenuTableConfig = {
  slug: ContenuTableSlug;
  name: string;
  label: string;
  description: string;
  titleField: string;
  dateField: string;
  statusField?: string;
  imageField?: string;
  imageFieldId?: string;
  fields: ContenuField[];
};

export type ContenuLink = {
  label: string;
  url: string;
};

export type ContenuListItem = {
  id: string;
  title: string;
  date: string | null;
  status: string | null;
  description: string | null;
  imageUrl: string | null;
  links: ContenuLink[];
};

export type ContenuTableData = {
  configured: boolean;
  error: string | null;
  table: ContenuTableConfig;
  records: ContenuListItem[];
  options: Record<string, string[]>;
};

export const CONTENU_TABLES: ContenuTableConfig[] = [
  {
    slug: "modules",
    name: "Modules",
    label: "Modules",
    description: "Fiches pédagogiques visibles sur le site de l’académie.",
    titleField: "Titre",
    dateField: "Date de publication",
    statusField: "Statut",
    imageField: "Image",
    imageFieldId: "fldYtL9VJHZUyx9gY",
    fields: [
      { name: "Titre", label: "Titre", type: "text", required: true, placeholder: "Protéger sa webcam…" },
      { name: "Description", label: "Description", type: "textarea", required: true },
      { name: "Date de publication", label: "Date de publication", type: "date", required: true },
      {
        name: "Niveau",
        label: "Niveau",
        type: "singleSelect",
        options: ["Débutant ", "Intermédiaire", "Avancé"],
      },
      {
        name: "Statut",
        label: "Statut",
        type: "singleSelect",
        options: ["Visible", "Non-visible"],
        defaultValue: "Visible",
      },
      {
        name: "Thématique pour site",
        label: "Thématique",
        type: "multipleSelect",
        options: [
          "La santé connectée",
          "La sécurité en ligne",
          "Le numérique au quotidien",
          "Les démarches en ligne ",
        ],
      },
      {
        name: "Thèmes Abordés",
        label: "Thèmes abordés",
        type: "multipleSelect",
        options: [
          "Administratif en ligne ",
          "Arnaques",
          "Culture numérique ",
          "Finances en ligne ",
          "sécurité numérique",
        ],
      },
      {
        name: "Tri Client",
        label: "Tri client",
        type: "multipleSelect",
        options: ["Acad", "Fortuneo"],
        defaultValue: ["Acad"],
      },
      { name: "Lien affilié", label: "Lien (Fillout / page)", type: "url", placeholder: "https://" },
    ],
  },
  {
    slug: "articles",
    name: "Articles Actualité",
    label: "Articles actualité",
    description: "Articles publiés dans l’espace actualités du site.",
    titleField: "Titre",
    dateField: "Date de publication",
    statusField: "Statut",
    imageField: "Image",
    imageFieldId: "fldvBI0KYdjW3erDG",
    fields: [
      { name: "Titre", label: "Titre", type: "text", required: true },
      { name: "Description", label: "Description", type: "textarea", required: true },
      { name: "Date de publication", label: "Date de publication", type: "date", required: true },
      {
        name: "Thèmatique pour site",
        label: "Thématique",
        type: "singleSelect",
        options: [
          "Actualités",
          "La santé connectée",
          "La sécurité en ligne",
          "Le numérique au quotidien",
          "Les démarches en ligne",
        ],
      },
      {
        name: "Thème Abordés",
        label: "Thèmes abordés",
        type: "multipleSelect",
        options: [
          "Accessoires numériques ",
          "Actualités",
          "Administratif en ligne ",
          "Arnaques",
          "Culture numérique ",
          "Divertissement ",
          "Facebook",
          "Familles, proches",
          "Finance en ligne ",
          "Gestion des fichiers ",
          "Google",
          "IA",
          "Mail",
          "Photos",
          "Quotidien",
          "Réseaux sociaux",
          "Santé en ligne ",
          "Sécurité numérique ",
          "Smartphone ",
          "Whatsapp",
          "Youtube",
        ],
      },
      {
        name: "Statut",
        label: "Statut",
        type: "multipleSelect",
        options: ["Visible", "Non Visible"],
        defaultValue: ["Visible"],
      },
      { name: "Lien Affilié", label: "Lien de l’article", type: "url", placeholder: "https://" },
    ],
  },
  {
    slug: "cours",
    name: "Cours en ligne",
    label: "Cours en ligne",
    description: "Sessions live : dates, liens Meet et inscriptions.",
    titleField: "Titre",
    dateField: "Date de cours",
    statusField: "Statut",
    imageField: "Image",
    imageFieldId: "fldiKmYoMVcu4d9QP",
    fields: [
      { name: "Titre", label: "Titre", type: "text", required: true },
      { name: "Description", label: "Description", type: "textarea", required: true },
      { name: "Date de cours", label: "Début", type: "datetime", required: true },
      { name: "Date de cours FIN", label: "Fin", type: "datetime" },
      { name: "Heure de début", label: "Heure affichée", type: "text", placeholder: "10h00", hint: "Ex. 10h00" },
      {
        name: "Durée du cours",
        label: "Durée",
        type: "singleSelect",
        options: ["45mn", "1h", "1h00", "1h30"],
        defaultValue: "1h",
      },
      {
        name: "Animateur",
        label: "Animateur",
        type: "singleSelect",
        options: ["Anais", "Aymeric", "Capucine", "Cédric", "Maëlie", "Malick"],
      },
      {
        name: "Niveau",
        label: "Niveau",
        type: "singleSelect",
        options: ["Débutant", "Intermédiaire", "Avancé"],
      },
      {
        name: "Thématique pour site",
        label: "Thématique",
        type: "singleSelect",
        options: ["La santé connectée", "La sécurité en ligne", "Le numérique au quotidien"],
      },
      {
        name: "Thèmes Abordés",
        label: "Thèmes abordés",
        type: "multipleSelect",
        options: [
          "Actualités ",
          "Arnaques",
          "Culture numérique ",
          "Divertissement",
          "Facebook",
          "Finances en ligne ",
          "Gestion des fichiers",
          "IA",
          "Mail",
          "Photos ",
          "Quotidien ",
          "Réseaux sociaux ",
          "Santé en ligne ",
          "sécurité numérique",
        ],
      },
      {
        name: "Statut",
        label: "Statut",
        type: "multipleSelect",
        options: ["Visible", "non-visible"],
        defaultValue: ["Visible"],
      },
      {
        name: "Cours prévu ?",
        label: "Cours prévu",
        type: "singleSelect",
        options: ["✅", "❌"],
        defaultValue: "✅",
      },
      { name: "Capacité max", label: "Capacité max", type: "number", defaultValue: 40 },
      { name: "Lien Google Meet", label: "Lien Google Meet", type: "url" },
      { name: "Lien d'inscription", label: "Lien d’inscription Fillout", type: "url" },
      { name: "ID pour fillout", label: "ID Fillout", type: "text", placeholder: "cours_200625_arnaque" },
      { name: "Plan cours ", label: "Plan du cours", type: "textarea" },
    ],
  },
  {
    slug: "videotheque",
    name: "Vidéothèque",
    label: "Vidéothèque",
    description: "Replays et tutoriels YouTube du site.",
    titleField: "Titre",
    dateField: "Date de publication",
    statusField: "Statut",
    imageField: "Image",
    imageFieldId: "fld7ZZSHkkSfsZuLR",
    fields: [
      { name: "Titre", label: "Titre", type: "text", required: true },
      { name: "Description", label: "Description", type: "textarea", required: true },
      { name: "Date de publication", label: "Date de publication", type: "date", required: true },
      {
        name: "Catégorie",
        label: "Catégorie",
        type: "singleSelect",
        options: ["Replay", "Tutoriel"],
        defaultValue: "Tutoriel",
      },
      {
        name: "Niveau",
        label: "Niveau",
        type: "singleSelect",
        options: ["Débutant", "Intermédiaire", "Avancé"],
      },
      {
        name: "Statut",
        label: "Statut",
        type: "singleSelect",
        options: ["Visible", "Non visible"],
        defaultValue: "Visible",
      },
      {
        name: "Thématique pour site",
        label: "Thématique",
        type: "singleSelect",
        options: ["La santé connectée", "La sécurité en ligne", "Le numérique au quotidien"],
      },
      {
        name: "Thèmes Abordés",
        label: "Thèmes abordés",
        type: "multipleSelect",
        options: [
          "Accessoires numériques ",
          "Actualités ",
          "Administratif en ligne ",
          "Arnaques ",
          "Culture numérique ",
          "Divertissement",
          "Facebook ",
          "Famille, proches",
          "Finance en ligne ",
          "Gestion des fichiers ",
          "Google ",
          "IA ",
          "Mail ",
          "Photos ",
          "Quotidien ",
          "Réseaux sociaux ",
          "Santé en ligne ",
          "Sécurité numérique ",
          "Smartphone",
          "Whatsapp",
          "Youtube ",
        ],
      },
      {
        name: "Tri Client",
        label: "Tri client",
        type: "multipleSelect",
        options: ["Acad", "Axa", "CMP", "Esprit Retraite", "Mon espace Crédit Agricole"],
        defaultValue: ["Acad"],
      },
      { name: "Lien affilié", label: "Lien vidéo", type: "url", placeholder: "https://youtu.be/…" },
    ],
  },
];

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

function airtableHeaders(json = false): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.AIRTABLE_PAT ?? ""}`,
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export function getContenuTable(slug: string): ContenuTableConfig | null {
  return CONTENU_TABLES.find((table) => table.slug === slug) ?? null;
}

function asText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) return value[0].trim();
  return null;
}

function asUrl(value: unknown): string | null {
  const text = asText(value);
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text;
  return null;
}

function recordLinks(table: ContenuTableConfig, record: AirtableRecord): ContenuLink[] {
  const links: ContenuLink[] = [];
  const seen = new Set<string>();
  for (const field of table.fields) {
    if (field.type !== "url") continue;
    const url = asUrl(record.fields[field.name]);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    links.push({ label: field.label, url });
  }
  return links;
}

function attachmentUrl(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const first = value[0] as { url?: string; thumbnails?: { large?: { url?: string }; small?: { url?: string } } };
  return first.thumbnails?.large?.url ?? first.thumbnails?.small?.url ?? first.url ?? null;
}

function mergeOptions(seed: string[] | undefined, extra: Iterable<string>): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const value of [...(seed ?? []), ...extra]) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    list.push(value);
  }
  return list.sort((a, b) => a.trim().localeCompare(b.trim(), "fr"));
}

function collectOptions(table: ContenuTableConfig, records: AirtableRecord[]): Record<string, string[]> {
  const collected: Record<string, Set<string>> = {};
  for (const field of table.fields) {
    if (field.type !== "singleSelect" && field.type !== "multipleSelect") continue;
    collected[field.name] = new Set();
  }

  for (const record of records) {
    for (const [name, value] of Object.entries(record.fields)) {
      if (!collected[name]) continue;
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) {
        if (typeof item === "string" && item.trim()) collected[name].add(item);
      }
    }
  }

  const options: Record<string, string[]> = {};
  for (const field of table.fields) {
    if (field.type !== "singleSelect" && field.type !== "multipleSelect") continue;
    options[field.name] = mergeOptions(field.options, collected[field.name] ?? []);
  }
  return options;
}

async function listRecords(table: ContenuTableConfig, max = 80): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    params.set("sort[0][field]", table.dateField);
    params.set("sort[0][direction]", "desc");
    const url = `https://api.airtable.com/v0/${CONTENU_ACAD_BASE_ID}/${encodeURIComponent(table.name)}?${params}`;
    const response = await fetch(url, { headers: airtableHeaders(), cache: "no-store" });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Airtable ${table.name} ${response.status}: ${body.slice(0, 220)}`);
    }
    const data = (await response.json()) as { records?: AirtableRecord[]; offset?: string };
    records.push(...(data.records ?? []));
    offset = data.offset;
  } while (offset && records.length < max);
  return records.slice(0, max);
}

function toListItem(table: ContenuTableConfig, record: AirtableRecord): ContenuListItem {
  return {
    id: record.id,
    title: asText(record.fields[table.titleField]) ?? "(sans titre)",
    date: asText(record.fields[table.dateField]),
    status: table.statusField ? asText(record.fields[table.statusField]) : null,
    description: asText(record.fields.Description),
    imageUrl: table.imageField ? attachmentUrl(record.fields[table.imageField]) : null,
    links: recordLinks(table, record),
  };
}

export async function loadContenuTable(slug: string): Promise<ContenuTableData | null> {
  const table = getContenuTable(slug);
  if (!table) return null;

  if (!airtableConfigured()) {
    return {
      configured: false,
      error: "Ajoute AIRTABLE_PAT dans .env.local pour écrire dans Airtable.",
      table,
      records: [],
      options: collectOptions(table, []),
    };
  }

  try {
    const records = await listRecords(table);
    return {
      configured: true,
      error: null,
      table,
      records: records.map((record) => toListItem(table, record)),
      options: collectOptions(table, records),
    };
  } catch (error) {
    return {
      configured: true,
      error: error instanceof Error ? error.message : "Impossible de lire Airtable.",
      table,
      records: [],
      options: collectOptions(table, []),
    };
  }
}

export type CreateContenuInput = {
  slug: string;
  values: Record<string, unknown>;
  imageUrl?: string;
  imageFile?: { filename: string; contentType: string; data: Buffer };
};

function allowedNames(table: ContenuTableConfig): Set<string> {
  return new Set(table.fields.map((field) => field.name));
}

function normalizeValue(field: ContenuField, raw: unknown): unknown {
  if (raw == null) return undefined;
  if (typeof raw === "string" && !raw.trim()) return undefined;

  if (field.type === "multipleSelect") {
    const list = Array.isArray(raw) ? raw : [raw];
    const values = list.filter((item): item is string => typeof item === "string" && item.trim() !== "");
    return values.length > 0 ? values : undefined;
  }

  if (field.type === "number") {
    const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }

  if (field.type === "datetime" && typeof raw === "string") {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
  }

  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "boolean" || typeof raw === "number") return raw;
  return undefined;
}

async function uploadAttachment(recordId: string, fieldId: string, file: NonNullable<CreateContenuInput["imageFile"]>) {
  const response = await fetch(
    `https://content.airtable.com/v0/${CONTENU_ACAD_BASE_ID}/${recordId}/${fieldId}/uploadAttachment`,
    {
      method: "POST",
      headers: airtableHeaders(true),
      body: JSON.stringify({
        contentType: file.contentType,
        filename: file.filename,
        file: file.data.toString("base64"),
      }),
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Upload image ${response.status}: ${body.slice(0, 220)}`);
  }
}

export async function createContenuRecord(input: CreateContenuInput): Promise<ContenuListItem> {
  const table = getContenuTable(input.slug);
  if (!table) throw Object.assign(new Error("Table inconnue."), { status: 400 });
  if (!process.env.AIRTABLE_PAT) {
    throw Object.assign(new Error("Ajoute AIRTABLE_PAT dans .env.local."), { status: 503 });
  }

  const allowed = allowedNames(table);
  const fields: Record<string, unknown> = {};

  for (const field of table.fields) {
    if (!allowed.has(field.name)) continue;
    const value = normalizeValue(field, input.values[field.name]);
    if (value !== undefined) fields[field.name] = value;
  }

  const title = fields[table.titleField];
  if (typeof title !== "string" || !title.trim()) {
    throw Object.assign(new Error("Le titre est obligatoire."), { status: 400 });
  }

  if (input.imageUrl?.trim() && table.imageField) {
    fields[table.imageField] = [{ url: input.imageUrl.trim() }];
  }

  const response = await fetch(
    `https://api.airtable.com/v0/${CONTENU_ACAD_BASE_ID}/${encodeURIComponent(table.name)}`,
    {
      method: "POST",
      headers: airtableHeaders(true),
      body: JSON.stringify({ fields, typecast: true }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw Object.assign(new Error(`Airtable ${response.status}: ${body.slice(0, 280)}`), {
      status: response.status === 422 ? 422 : 502,
    });
  }

  const created = (await response.json()) as AirtableRecord;

  if (input.imageFile && table.imageFieldId) {
    await uploadAttachment(created.id, table.imageFieldId, input.imageFile);
    const refreshed = await fetch(
      `https://api.airtable.com/v0/${CONTENU_ACAD_BASE_ID}/${encodeURIComponent(table.name)}/${created.id}`,
      { headers: airtableHeaders(), cache: "no-store" },
    );
    if (refreshed.ok) {
      const record = (await refreshed.json()) as AirtableRecord;
      return toListItem(table, record);
    }
  }

  return toListItem(table, created);
}
