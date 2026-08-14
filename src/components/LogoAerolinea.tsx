"use client";

import { useState } from "react";

import { logoAerolinea } from "@/lib/dinero";

interface Props {
  iata: string;
  nombre?: string;
  logo?: string | null;
  className?: string;
}

/** Logo de la aerolínea, con el catálogo de Duffel como respaldo y el código IATA si no hay imagen. */
export default function LogoAerolinea({
  iata,
  nombre,
  logo,
  className = "h-6 w-6",
}: Props) {
  const [falla, setFalla] = useState(false);

  if (falla || iata.trim() === "") {
    return (
      <span
        className={`${className} flex shrink-0 items-center justify-center rounded bg-[#E4E8EE] font-mono text-[10px] text-[#14477E]`}
      >
        {iata}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={nombre ?? iata}
      className={`${className} shrink-0 rounded object-contain`}
      onError={() => setFalla(true)}
      src={logo ?? logoAerolinea(iata)}
    />
  );
}
