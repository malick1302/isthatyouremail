"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONTENU_TABLES } from "@/lib/contenu-acad";

export function ContenuAcadNav() {
  const pathname = usePathname();

  return (
    <>
      {CONTENU_TABLES.map((table) => {
        const href = `/contenu-acad/${table.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={table.slug}
            href={href}
            prefetch={false}
            className={`rounded-full px-3 py-1.5 text-sm ${
              active ? "bg-white text-[#5b2c6f]" : "border border-white/40 text-white hover:bg-white/15"
            }`}
          >
            {table.label}
          </Link>
        );
      })}
    </>
  );
}
