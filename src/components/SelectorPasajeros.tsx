"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

export interface Pasajeros {
  adultos: number;
  menores: number[];
  bebes: number;
}

interface Props {
  valor: Pasajeros;
  etiqueta?: string;
  /** Los hoteles cobran por huésped, sin la categoría de bebé en brazos. */
  sinBebes?: boolean;
  onCambio: (valor: Pasajeros) => void;
}

const EDADES_MENORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

function Contador({
  etiqueta,
  detalle,
  valor,
  minimo,
  maximo,
  onCambio,
}: {
  etiqueta: string;
  detalle: string;
  valor: number;
  minimo: number;
  maximo: number;
  onCambio: (valor: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-[#0B2545]">{etiqueta}</p>
        <p className="text-xs text-[#5A6B80]">{detalle}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="h-8 w-8 rounded-full border border-[#E4E8EE] text-lg leading-none text-[#14477E] disabled:opacity-40"
          disabled={valor <= minimo}
          onClick={() => onCambio(valor - 1)}
          type="button"
        >
          –
        </button>
        <span className="w-6 text-center text-sm font-semibold">{valor}</span>
        <button
          className="h-8 w-8 rounded-full border border-[#E4E8EE] text-lg leading-none text-[#14477E] disabled:opacity-40"
          disabled={valor >= maximo}
          onClick={() => onCambio(valor + 1)}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function SelectorPasajeros({
  valor,
  etiqueta,
  sinBebes = false,
  onCambio,
}: Props) {
  const { t } = useI18n();
  const etiquetaFinal = etiqueta ?? t("common.passengers");
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fuera(evento: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  function cambiarMenores(cantidad: number) {
    const menores = [...valor.menores];
    while (menores.length < cantidad) menores.push(8);
    while (menores.length > cantidad) menores.pop();
    onCambio({ ...valor, menores });
  }

  const totalAdultos = valor.adultos;
  const totalMenores = valor.menores.length;
  const totalBebes = valor.bebes;
  const partes = [`${totalAdultos} ${totalAdultos === 1 ? t("common.adult") : t("common.adults")}`];
  if (totalMenores > 0) {
    partes.push(`${totalMenores} ${totalMenores === 1 ? t("common.child") : t("common.children")}`);
  }
  if (!sinBebes && totalBebes > 0) {
    partes.push(`${totalBebes} ${totalBebes === 1 ? t("common.infant") : t("common.infants")} ${t("common.inArms")}`);
  }

  return (
    <div className="relative" ref={contenedor}>
      <span className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
        {etiquetaFinal}
      </span>
      <button
        aria-expanded={abierto}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-[#E4E8EE] bg-white px-3 py-2.5 text-left text-sm font-medium text-[#0B2545]"
        onClick={() => setAbierto((v) => !v)}
        type="button"
      >
        <span className="truncate">{partes.join(" · ")}</span>
        <span className="text-xs text-[#5A6B80]">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div className="absolute z-30 mt-1 w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border border-[#E4E8EE] bg-white p-4 shadow-lg">
          <Contador
            detalle={t("form.adultDetail")}
            etiqueta={t("common.adults")}
            maximo={9}
            minimo={1}
            onCambio={(v) => onCambio({ ...valor, adultos: v })}
            valor={valor.adultos}
          />
          <Contador
            detalle={sinBebes ? t("form.childrenDetailAll") : t("form.childrenDetailFlight")}
            etiqueta={sinBebes ? t("common.children") : t("form.childrenWithSeat")}
            maximo={8}
            minimo={0}
            onCambio={cambiarMenores}
            valor={valor.menores.length}
          />
          {valor.menores.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2 border-t border-[#E4E8EE] pt-3">
              {valor.menores.map((edad, indice) => (
                <label className="text-xs text-[#5A6B80]" key={`menor-${indice}`}>
                  {t("common.age")} {indice + 1}
                  <select
                    className="mt-1 w-full rounded border border-[#E4E8EE] px-1 py-1 text-sm text-[#0B2545]"
                    onChange={(evento) => {
                      const menores = [...valor.menores];
                      menores[indice] = Number(evento.target.value);
                      onCambio({ ...valor, menores });
                    }}
                    value={edad}
                  >
                    {(sinBebes ? EDADES_MENORES : EDADES_MENORES.slice(2, 12)).map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {opcion} {t("common.years")}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
          {!sinBebes && (
            <div className="mt-2 border-t border-[#E4E8EE] pt-1">
              <Contador
                detalle={t("form.infantDetail")}
                etiqueta={t("form.infantsInArms")}
                maximo={Math.max(1, valor.adultos)}
                minimo={0}
                onCambio={(v) => onCambio({ ...valor, bebes: v })}
                valor={valor.bebes}
              />
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#E4E8EE] pt-3">
            <p className="text-xs text-[#5A6B80]">
              {sinBebes ? t("form.hotelAgePolicy") : t("form.flightAgePolicy")}
            </p>
            <button
              className="shrink-0 rounded-lg bg-[#0B2545] px-3 py-1.5 text-xs font-semibold text-white"
              onClick={() => setAbierto(false)}
              type="button"
            >
              {t("common.done")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
