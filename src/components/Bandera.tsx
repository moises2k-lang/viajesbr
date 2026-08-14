import Image from "next/image";
import { isoDeBandera, separarBandera, codigoPais } from "@/lib/paises";

interface Props {
  /** Emoji de bandera tal como lo devuelven las APIs (🇲🇽). */
  bandera?: string | null | undefined;
  /** Código ISO de dos letras del país (mx, ar, us). */
  iso?: string | null | undefined;
  /** Nombre del país, por si no hay emoji ni ISO. */
  pais?: string | null | undefined;
  clase?: string;
}

function normalizarIso(
  bandera: string | null | undefined,
  iso: string | null | undefined,
  pais: string | null | undefined,
): string | null {
  if (iso && /^[A-Za-z]{2}$/.test(iso)) return iso.toLowerCase();
  if (bandera) {
    const limpio = bandera.replace(/\uFE0F/g, "").trim();
    const codigo = isoDeBandera(limpio);
    if (codigo) return codigo;
    const { resto } = separarBandera(limpio);
    if (resto) {
      const isoDeResto = isoDeBandera(resto);
      if (isoDeResto) return isoDeResto;
    }
  }
  if (pais) {
    return codigoPais(pais);
  }
  return null;
}

/**
 * Dibuja la bandera como imagen: Windows no tiene tipografía para los emoji de
 * bandera y los muestra como dos letras ("mx"), así que no se puede usar texto.
 * Acepta emoji, ISO o nombre de país, y usa el primero que pueda resolver.
 */
export default function Bandera({ bandera, iso, pais, clase }: Props) {
  const codigo = normalizarIso(bandera, iso, pais);
  if (!codigo) return null;
  return (
    <Image
      alt=""
      className={`inline-block shrink-0 rounded-[2px] object-cover align-[-0.15em] ${clase ?? ""}`}
      height={12}
      src={`https://flagcdn.com/w40/${codigo}.png`}
      unoptimized
      width={16}
    />
  );
}

/** Texto que puede traer el emoji de bandera al inicio ("🇲🇽 Cancún"): lo dibuja como imagen. */
export function TextoConBandera({
  texto,
}: {
  texto: string | null | undefined;
}) {
  if (!texto) return null;
  const { bandera, resto } = separarBandera(texto);
  return (
    <>
      {bandera && <Bandera bandera={bandera} clase="mr-1" />}
      {resto}
    </>
  );
}
