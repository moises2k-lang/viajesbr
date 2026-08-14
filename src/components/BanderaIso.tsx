"use client";

import Image from "next/image";

interface Props {
  iso: string | null | undefined;
  clase?: string;
  alt?: string;
}

/** Dibuja la bandera de un país a partir de su código ISO de dos letras. */
export default function BanderaIso({ iso, clase, alt }: Props) {
  if (!iso) return null;
  const normalizado = iso.toLowerCase();
  return (
    <Image
      alt={alt ?? ""}
      className={`inline-block shrink-0 rounded-[2px] object-cover align-[-0.15em] ${clase ?? ""}`}
      height={12}
      src={`https://flagcdn.com/w40/${normalizado}.png`}
      unoptimized
      width={16}
    />
  );
}
