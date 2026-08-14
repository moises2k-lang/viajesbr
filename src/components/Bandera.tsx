import Image from "next/image";
import { isoDeBandera, separarBandera } from "@/lib/paises";

interface Props {
  /** Emoji de bandera tal como lo devuelven las APIs (🇲🇽). */
  bandera: string | null | undefined;
  clase?: string;
}

/**
 * Dibuja la bandera como imagen: Windows no tiene tipografía para los emoji de
 * bandera y los muestra como dos letras ("mx"), así que no se puede usar texto.
 */
export default function Bandera({ bandera, clase }: Props) {
  const iso = bandera ? isoDeBandera(bandera) : null;
  if (!iso) return null;
  return (
    <Image
      alt=""
      className={`inline-block shrink-0 rounded-[2px] object-cover align-[-0.15em] ${clase ?? ""}`}
      height={12}
      src={`https://flagcdn.com/w40/${iso}.png`}
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
