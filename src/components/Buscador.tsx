"use client";

import { useEffect, useState } from "react";
import type { OpcionLugar } from "@/app/api/lugares/route";
import CampoAeropuerto from "@/components/CampoAeropuerto";
import RangoFechas from "@/components/RangoFechas";
import SelectorPasajeros, {
  type Pasajeros,
} from "@/components/SelectorPasajeros";

export interface ParametrosFormulario {
  origen: string;
  destino: string;
  origenNombre?: string | null;
  destinoNombre?: string | null;
  fechaSalida: string;
  fechaRegreso: string | null;
  adultos: number;
  menores: number[];
  bebes: number;
  cabina: "economy" | "premium_economy" | "business" | "first" | null;
}

const VACIO: ParametrosFormulario = {
  origen: "",
  destino: "",
  origenNombre: null,
  destinoNombre: null,
  fechaSalida: "",
  fechaRegreso: null,
  adultos: 1,
  menores: [],
  bebes: 0,
  cabina: "economy",
};

const CABINAS: {
  valor: NonNullable<ParametrosFormulario["cabina"]>;
  texto: string;
}[] = [
  { valor: "economy", texto: "Turista" },
  { valor: "premium_economy", texto: "Premium" },
  { valor: "business", texto: "Business" },
  { valor: "first", texto: "Primera" },
];

interface Props {
  cargando: boolean;
  valoresIniciales: ParametrosFormulario | null;
  onBuscar: (parametros: ParametrosFormulario) => void;
}

export default function Buscador({
  cargando,
  valoresIniciales,
  onBuscar,
}: Props) {
  const [datos, setDatos] = useState<ParametrosFormulario>(
    valoresIniciales ?? VACIO,
  );
  const [inversiones, setInversiones] = useState(0);
  const [origenDetectado, setOrigenDetectado] = useState<OpcionLugar | null>(
    null,
  );
  const [redondo, setRedondo] = useState(
    valoresIniciales ? valoresIniciales.fechaRegreso !== null : true,
  );

  useEffect(() => {
    if (valoresIniciales) return;
    const control = new AbortController();

    /** El GPS del navegador da la ciudad real; la IP suele apuntar a otra. */
    async function coordenadas(): Promise<string> {
      if (typeof navigator === "undefined" || !navigator.geolocation) return "";
      return new Promise((resolver) => {
        const listo = setTimeout(() => resolver(""), 8000);
        navigator.geolocation.getCurrentPosition(
          (posicion) => {
            clearTimeout(listo);
            resolver(
              `?lat=${posicion.coords.latitude.toFixed(4)}&lon=${posicion.coords.longitude.toFixed(4)}`,
            );
          },
          () => {
            clearTimeout(listo);
            resolver("");
          },
          { timeout: 8000, maximumAge: 600000 },
        );
      });
    }

    (async () => {
      try {
        const respuesta = await fetch(`/api/origen${await coordenadas()}`, {
          signal: control.signal,
        });
        if (!respuesta.ok) return;
        const cuerpo = (await respuesta.json()) as {
          opcion: OpcionLugar | null;
        };
        if (!cuerpo.opcion) return;
        const opcion = cuerpo.opcion;
        setOrigenDetectado(opcion);
        setDatos((actuales) =>
          actuales.origen === ""
            ? {
                ...actuales,
                origen: opcion.codigo,
                origenNombre: [opcion.bandera, opcion.nombre]
                  .filter(Boolean)
                  .join(" "),
              }
            : actuales,
        );
      } catch {
        // sin ubicación disponible: el usuario escribe su origen
      }
    })();
    return () => control.abort();
  }, [valoresIniciales]);

  const pasajeros: Pasajeros = {
    adultos: datos.adultos,
    menores: datos.menores,
    bebes: datos.bebes,
  };

  const falta =
    datos.origen.trim().length !== 3
      ? "Elige el aeropuerto de origen"
      : datos.destino.trim().length !== 3
        ? "Elige el aeropuerto de destino"
        : datos.origen.trim().toUpperCase() ===
            datos.destino.trim().toUpperCase()
          ? "El origen y el destino no pueden ser el mismo"
          : datos.fechaSalida === ""
            ? "Elige la fecha de salida"
            : redondo && datos.fechaRegreso === null
              ? "Elige la fecha de regreso"
              : null;
  const completo = falta === null;

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!completo) return;
    onBuscar({
      ...datos,
      origen: datos.origen.trim().toUpperCase(),
      destino: datos.destino.trim().toUpperCase(),
      fechaRegreso: redondo ? datos.fechaRegreso || null : null,
    });
  }

  function invertir() {
    setInversiones((n) => n + 1);
    setDatos({
      ...datos,
      origen: datos.destino,
      destino: datos.origen,
      origenNombre: datos.destinoNombre ?? null,
      destinoNombre: datos.origenNombre ?? null,
    });
  }

  return (
    <form
      className="rounded-2xl bg-white p-4 shadow-lg shadow-[#0B2545]/10 sm:p-6"
      onSubmit={enviar}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-[#E4E8EE] p-1 text-sm">
          <button
            className={`rounded-full px-4 py-1.5 font-medium ${redondo ? "bg-white text-[#0B2545] shadow" : "text-[#5A6B80]"}`}
            onClick={() => setRedondo(true)}
            type="button"
          >
            Redondo
          </button>
          <button
            className={`rounded-full px-4 py-1.5 font-medium ${redondo ? "text-[#5A6B80]" : "bg-white text-[#0B2545] shadow"}`}
            onClick={() => setRedondo(false)}
            type="button"
          >
            Sólo ida
          </button>
        </div>
        <div className="flex rounded-full bg-[#E4E8EE] p-1 text-sm">
          {CABINAS.map((cabina) => (
            <button
              className={`rounded-full px-3 py-1.5 font-medium ${
                datos.cabina === cabina.valor
                  ? "bg-white text-[#0B2545] shadow"
                  : "text-[#5A6B80]"
              }`}
              key={cabina.valor}
              onClick={() => setDatos({ ...datos, cabina: cabina.valor })}
              type="button"
            >
              {cabina.texto}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="relative lg:col-span-3">
          <CampoAeropuerto
            descripcion={datos.origenNombre ?? null}
            etiqueta="Origen"
            key={`origen-${inversiones}-${origenDetectado?.codigo ?? "manual"}`}
            onCambio={(codigo, nombre) =>
              setDatos({ ...datos, origen: codigo, origenNombre: nombre })
            }
            valor={datos.origen}
          />
          {origenDetectado && datos.origen === origenDetectado.codigo && (
            <p className="mt-1 text-[11px] text-[#5A6B80]">
              Detectado por tu ubicación ({origenDetectado.ciudad ?? origenDetectado.codigo}) —
              cámbialo si no sales de ahí
            </p>
          )}
          <button
            aria-label="Invertir origen y destino"
            className="absolute -bottom-4 right-5 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-[#E4E8EE] bg-white text-xs text-[#14477E] shadow lg:-right-3 lg:bottom-auto lg:top-8"
            title="Invertir origen y destino"
            onClick={invertir}
            type="button"
          >
            ⇄
          </button>
        </div>

        <div className="lg:col-span-3">
          <CampoAeropuerto
            descripcion={datos.destinoNombre ?? null}
            etiqueta="Destino"
            key={`destino-${inversiones}`}
            onCambio={(codigo, nombre) =>
              setDatos({ ...datos, destino: codigo, destinoNombre: nombre })
            }
            valor={datos.destino}
          />
        </div>

        <div className="lg:col-span-4">
          <RangoFechas
            conRegreso={redondo}
            desde={datos.fechaSalida}
            hasta={datos.fechaRegreso}
            onCambio={(desde, hasta) =>
              setDatos({ ...datos, fechaSalida: desde, fechaRegreso: hasta })
            }
          />
        </div>

        <div className="lg:col-span-2">
          <SelectorPasajeros
            onCambio={(p) => setDatos({ ...datos, ...p })}
            valor={pasajeros}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="w-full rounded-lg bg-[#0B2545] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#14477E] disabled:opacity-60 sm:w-auto"
          disabled={cargando || !completo}
          type="submit"
        >
          {cargando ? "Buscando tarifas…" : "Buscar vuelos"}
        </button>
        <p className="text-xs text-[#5A6B80]">
          {falta ??
            `${datos.adultos + datos.menores.length + datos.bebes} pasajero${
              datos.adultos + datos.menores.length + datos.bebes === 1
                ? ""
                : "s"
            } · ${redondo ? "viaje redondo" : "sólo ida"} · ${
              CABINAS.find((c) => c.valor === datos.cabina)?.texto ?? "Turista"
            }`}
        </p>
      </div>
    </form>
  );
}
