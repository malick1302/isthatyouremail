import { getBases } from "@/lib/bases";

export const UNKNOWN_FOLDER = "Autre";
export const INBOX_FOLDER = "Boîte de réception";

export type NavFolder = {
  slug: string;
  name: string;
  href: string;
  color: string | null;
  gmailName: string;
};

export function folderSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getFolderNames(): string[] {
  const labels = getBases().map((base) => base.label).filter(Boolean);
  return [...labels, UNKNOWN_FOLDER];
}

export function getClassifyFolderNames(): string[] {
  return [INBOX_FOLDER, ...getFolderNames()];
}

export function getNavFolders(): NavFolder[] {
  const used = new Set<string>(["inbox", folderSlug(UNKNOWN_FOLDER)]);
  const fromBases = getBases().map((base) => {
    const fromLabel = folderSlug(base.label);
    const slug = fromLabel && !used.has(fromLabel) ? fromLabel : folderSlug(base.id);
    used.add(slug);
    return {
      slug,
      name: base.label,
      href: `/inbox/folder/${slug}`,
      color: base.color,
      gmailName: base.label,
    };
  });

  return [
    {
      slug: "inbox",
      name: "Boîte de réception",
      href: "/inbox",
      color: "#1e3d34",
      gmailName: "INBOX",
    },
    ...fromBases,
    {
      slug: folderSlug(UNKNOWN_FOLDER),
      name: UNKNOWN_FOLDER,
      href: `/inbox/folder/${folderSlug(UNKNOWN_FOLDER)}`,
      color: null,
      gmailName: UNKNOWN_FOLDER,
    },
  ];
}

export function findFolderBySlug(slug: string): NavFolder | undefined {
  return getNavFolders().find((folder) => folder.slug === slug);
}
