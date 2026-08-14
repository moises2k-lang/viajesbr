"use client";

import { useEffect, useState } from "react";
import type { OpcionCiudad } from "@/app/api/ciudades/route";
import CampoCiudad from "@/components/CampoCiudad";
import RangoFechas from "@/components/RangoFechas";
import SelectorPasajeros, { type Pasajeros } from "@/components/SelectorPasajeros";
import { useMoneda } from "@/components/MonedaContext";

export interface ParametrosHotel {
  placeId: string;
  destino: string;
  pais: string | null;
  entrada: string;
  salida: string | null;
  adultos: number;
  menores: number[];
  moneda: string;
  nacionalidad: string;
}

const VACIO: ParametrosHotel = {
  placeId: "",
  destino: "",
  pais: null,
  entrada: "",
  salida: null,
  adultos: 2,
  menores: [],
  moneda: "USD",
  nacionalidad: "MX",
};

function noches(entrada: string, salida: string | null): number | null {
  if (!entrada || !salida) return null;
  const dia = 24 * 60 * 60 * 1000;
  const diferencia =
    new Date(`${salida}T00:00:00Z`).getTime() - new Date(`${entrada}T00:00:00Z`).getTime();
  return diferencia > 0 ? Math.round(diferencia / dia) : null;
}

interface Props {
  cargando: boolean;
  valoresIniciales: ParametrosHotel | null;
  onBuscar: (parametros: ParametrosHotel) => void;
}

export default function BuscadorHoteles({ cargando, valoresIniciales, onBuscar }: Props) {
  const { moneda } = useMoneda();
  const [datos, setDatos] = useState<ParametrosHotel>(valoresIniciales ?? VACIO);

  useEffect(() => {
    setDatos((actuales) => (actuales.moneda === moneda ? actuales : { ...actuales, moneda }));
  }, [moneda]);

  const pasajeros: Pasajeros = { adultos: datos.adultos, menores: datos.menores, bebes: 0 };
  const totalNoches = noches(datos.entrada, datos.salida);
  const falta = !datos.placeId
    ? "Elige un destino de la lista"
    : totalNoches === null
      ? "Elige las fechas de entrada y salida"
      : null;

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (falta) return;
    onBuscar({ ...datos, moneda });
  }

  return (
    <form className="rounded-2xl bg-white p-4 shadow-lg shadow-[#0B2545]/10 sm:p-6" onSubmit={enviar}>
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <CampoCiudad
            descripcion={datos.destino || null}
            etiqueta="Destino"
            onCambio={(opcion: OpcionCiudad | null) =>
              setDatos({
                ...datos,
                placeId: opcion?.placeId ?? "",
                destino: opcion ? [opcion.bandera, opcion.nombre].filter(Boolean).join(" ") : "",
                pais: opcion?.pais ?? null,
              })
            }
          />
        </div>

        <div className="lg:col-span-4">
          <RangoFechas
            conRegreso
            desde={datos.entrada}
            etiquetaDesde="Entrada"
            etiquetaHasta="Salida"
            hasta={datos.salida}
            onCambio={(entrada, salida) => setDatos({ ...datos, entrada, salida })}
          />
        </div>

        <div className="lg:col-span-4">
          <SelectorPasajeros
            etiqueta="Huéspedes"
            onCambio={(p) => setDatos({ ...datos, adultos: p.adultos, menores: p.menores })}
            sinBebes
            valor={pasajeros}
          />
        </div>

      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="w-full rounded-lg bg-[#0B2545] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#14477E] disabled:opacity-60 sm:w-auto"
          disabled={cargando || falta !== null}
          type="submit"
        >
          {cargando ? "Buscando hoteles…" : "Buscar hoteles"}
        </button>
        <p className="text-xs text-[#5A6B80]">
          {falta ??
            `${totalNoches} noche${totalNoches === 1 ? "" : "s"} · ${datos.adultos} adulto${
              datos.adultos === 1 ? "" : "s"
            }${datos.menores.length > 0 ? ` · ${datos.menores.length} menor${datos.menores.length === 1 ? "" : "es"}` : ""} · precios en ${datos.moneda}`}
        </p>
      </div>
    </form>
  );
}
