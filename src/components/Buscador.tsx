"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, ArrowRight, Map } from "lucide-react";
import type { OpcionLugar } from "@/app/api/lugares/route";
import CampoAeropuerto from "@/components/CampoAeropuerto";
import RangoFechas from "@/components/RangoFechas";
import SelectorPasajeros, {
  type Pasajeros,
} from "@/components/SelectorPasajeros";

export interface TramoFormulario {
  origen: string;
  destino: string;
  origenNombre: string | null;
  destinoNombre: string | null;
  fecha: string;
}

export interface ParametrosFormulario {
  origen: string;
  destino: string;
  origenNombre?: string | null;
  destinoNombre?: string | null;
  origenCiudad?: string | null;
  destinoCiudad?: string | null;
  origenPais?: string | null;
  destinoPais?: string | null;
  fechaSalida: string;
  fechaRegreso: string | null;
  adultos: number;
  menores: number[];
  bebes: number;
  cabina: "economy" | "premium_economy" | "business" | "first" | null;
  /** Sólo en multiciudad: dos a cinco tramos con fecha propia. */
  tramos?: TramoFormulario[] | null;
}

const VACIO: ParametrosFormulario = {
  origen: "",
  destino: "",
  origenNombre: null,
  destinoNombre: null,
  origenCiudad: null,
  destinoCiudad: null,
  origenPais: null,
  destinoPais: null,
  fechaSalida: "",
  fechaRegreso: null,
  adultos: 1,
  menores: [],
  bebes: 0,
  cabina: "economy",
  tramos: null,
};

const MAXIMO_TRAMOS = 5;

function tramoVacio(fecha = ""): TramoFormulario {
  return {
    origen: "",
    destino: "",
    origenNombre: null,
    destinoNombre: null,
    fecha,
  };
}

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
  const [tipo, setTipo] = useState<"redondo" | "ida" | "multiciudad">(
    valoresIniciales?.tramos && valoresIniciales.tramos.length > 1
      ? "multiciudad"
      : valoresIniciales && valoresIniciales.fechaRegreso === null
        ? "ida"
        : "redondo",
  );
  const [tramos, setTramos] = useState<TramoFormulario[]>(
    valoresIniciales?.tramos && valoresIniciales.tramos.length > 1
      ? valoresIniciales.tramos
      : [tramoVacio(), tramoVacio()],
  );
  /**
   * Sube de número cuando el sistema (no el usuario) rellena un tramo, para
   * refrescar ese campo. No puede depender del texto escrito: si no, el campo se
   * reinicia a las tres letras y se cierra el autocomplete a media palabra.
   */
  const [rellenos, setRellenos] = useState<number[]>(() => tramos.map(() => 0));

  function marcarRelleno(indice: number) {
    setRellenos((actuales) =>
      actuales.map((numero, i) => (i === indice ? numero + 1 : numero)),
    );
  }

  const redondo = tipo === "redondo";
  const multiciudad = tipo === "multiciudad";

  /** Al abrir multiciudad se arranca con lo que ya escribió en el buscador simple. */
  function activarMulticiudad() {
    setTramos((actuales) => {
      const vacios = actuales.every((t) => t.origen === "" && t.destino === "");
      if (!vacios) return actuales;
      return [
        {
          origen: datos.origen,
          destino: datos.destino,
          origenNombre: datos.origenNombre ?? null,
          destinoNombre: datos.destinoNombre ?? null,
          fecha: datos.fechaSalida,
        },
        {
          origen: datos.destino,
          destino: "",
          origenNombre: datos.destinoNombre ?? null,
          destinoNombre: null,
          fecha: datos.fechaRegreso ?? "",
        },
      ];
    });
    setRellenos((actuales) => actuales.map((numero) => numero + 1));
    setTipo("multiciudad");
  }

  function cambiarTramo(indice: number, cambios: Partial<TramoFormulario>) {
    setTramos((actuales) =>
      actuales.map((tramo, i) =>
        i === indice ? { ...tramo, ...cambios } : tramo,
      ),
    );
  }

  const faltaMulticiudad = ((): string | null => {
    for (let i = 0; i < tramos.length; i += 1) {
      const tramo = tramos[i];
      if (tramo.origen.trim().length !== 3)
        return `Elige el origen del tramo ${i + 1}`;
      if (tramo.destino.trim().length !== 3)
        return `Elige el destino del tramo ${i + 1}`;
      if (
        tramo.origen.trim().toUpperCase() === tramo.destino.trim().toUpperCase()
      )
        return `El tramo ${i + 1} tiene el mismo origen y destino`;
      if (tramo.fecha === "") return `Elige la fecha del tramo ${i + 1}`;
      if (i > 0 && tramo.fecha < tramos[i - 1].fecha)
        return `La fecha del tramo ${i + 1} no puede ser antes que la del tramo ${i}`;
    }
    return null;
  })();

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
                origenCiudad: opcion.ciudad,
                origenPais: opcion.pais,
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

  const faltaSimple =
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
  const falta = multiciudad ? faltaMulticiudad : faltaSimple;
  const completo = falta === null;

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!completo) return;
    if (multiciudad) {
      const limpios = tramos.map((tramo) => ({
        ...tramo,
        origen: tramo.origen.trim().toUpperCase(),
        destino: tramo.destino.trim().toUpperCase(),
      }));
      onBuscar({
        ...datos,
        origen: limpios[0].origen,
        destino: limpios[limpios.length - 1].destino,
        origenNombre: limpios[0].origenNombre,
        destinoNombre: limpios[limpios.length - 1].destinoNombre,
        origenCiudad: null,
        destinoCiudad: null,
        origenPais: null,
        destinoPais: null,
        fechaSalida: limpios[0].fecha,
        fechaRegreso: null,
        tramos: limpios,
      });
      return;
    }
    onBuscar({
      ...datos,
      origen: datos.origen.trim().toUpperCase(),
      destino: datos.destino.trim().toUpperCase(),
      fechaRegreso: redondo ? datos.fechaRegreso || null : null,
      tramos: null,
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
      origenCiudad: datos.destinoCiudad ?? null,
      destinoCiudad: datos.origenCiudad ?? null,
      origenPais: datos.destinoPais ?? null,
      destinoPais: datos.origenPais ?? null,
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
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium ${tipo === "redondo" ? "bg-white text-[#0B2545] shadow" : "text-[#5A6B80]"}`}
            onClick={() => setTipo("redondo")}
            type="button"
          >
            <ArrowLeftRight className="h-4 w-4" /> Redondo
          </button>
          <button
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium ${tipo === "ida" ? "bg-white text-[#0B2545] shadow" : "text-[#5A6B80]"}`}
            onClick={() => setTipo("ida")}
            type="button"
          >
            <ArrowRight className="h-4 w-4" /> Sólo ida
          </button>
          <button
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium ${tipo === "multiciudad" ? "bg-white text-[#0B2545] shadow" : "text-[#5A6B80]"}`}
            onClick={activarMulticiudad}
            type="button"
          >
            <Map className="h-4 w-4" /> Multiciudad
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

      {multiciudad ? (
        <div className="space-y-3">
          {tramos.map((tramo, indice) => (
            <div
              className="grid gap-3 rounded-xl border border-[#E4E8EE] p-3 lg:grid-cols-12"
              key={`tramo-${indice}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#14477E] lg:col-span-12">
                Tramo {indice + 1}
              </p>
              <div className="lg:col-span-4">
                <CampoAeropuerto
                  descripcion={tramo.origenNombre}
                  etiqueta="Origen"
                  key={`tramo-origen-${indice}-${rellenos[indice] ?? 0}`}
                  onCambio={(codigo, nombre) =>
                    cambiarTramo(indice, {
                      origen: codigo,
                      origenNombre: nombre,
                    })
                  }
                  valor={tramo.origen}
                />
              </div>
              <div className="lg:col-span-4">
                <CampoAeropuerto
                  descripcion={tramo.destinoNombre}
                  etiqueta="Destino"
                  key={`tramo-destino-${indice}-${rellenos[indice] ?? 0}`}
                  onCambio={(codigo, nombre) => {
                    cambiarTramo(indice, {
                      destino: codigo,
                      destinoNombre: nombre,
                    });
                    /** El siguiente tramo casi siempre sale de donde llegó el anterior. */
                    if (
                      indice + 1 < tramos.length &&
                      tramos[indice + 1].origen === ""
                    ) {
                      cambiarTramo(indice + 1, {
                        origen: codigo,
                        origenNombre: nombre,
                      });
                      marcarRelleno(indice + 1);
                    }
                  }}
                  valor={tramo.destino}
                />
              </div>
              <div className="lg:col-span-3">
                <RangoFechas
                  conRegreso={false}
                  desde={tramo.fecha}
                  etiquetaDesde="Fecha"
                  hasta={null}
                  onCambio={(fecha) => cambiarTramo(indice, { fecha })}
                  unica
                />
              </div>

              <div className="flex items-end lg:col-span-1">
                {tramos.length > 2 && (
                  <button
                    className="w-full rounded-lg border border-[#E4E8EE] px-2 py-2.5 text-xs text-[#B4451F]"
                    onClick={() => {
                      setTramos(tramos.filter((_, i) => i !== indice));
                      setRellenos(
                        rellenos
                          .filter((_, i) => i !== indice)
                          .map((numero) => numero + 1),
                      );
                    }}
                    type="button"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            {tramos.length < MAXIMO_TRAMOS && (
              <button
                className="rounded-lg border border-[#14477E] px-4 py-2 text-sm font-semibold text-[#14477E]"
                onClick={() => {
                  setTramos([
                    ...tramos,
                    {
                      ...tramoVacio(tramos[tramos.length - 1].fecha),
                      origen: tramos[tramos.length - 1].destino,
                      origenNombre: tramos[tramos.length - 1].destinoNombre,
                    },
                  ]);
                  setRellenos([...rellenos, 0]);
                }}
                type="button"
              >
                + Agregar tramo
              </button>
            )}
            <div className="w-full sm:w-56">
              <SelectorPasajeros
                onCambio={(p) => setDatos({ ...datos, ...p })}
                valor={pasajeros}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-3">
            <CampoAeropuerto
              descripcion={datos.origenNombre ?? null}
              etiqueta="Origen"
              key={`origen-${inversiones}-${origenDetectado?.codigo ?? "manual"}`}
              onCambio={(codigo, nombre, ciudad, pais) =>
                setDatos({ ...datos, origen: codigo, origenNombre: nombre, origenCiudad: ciudad, origenPais: pais })
              }
              valor={datos.origen}
            />
            {origenDetectado && datos.origen === origenDetectado.codigo && (
              <p className="mt-1 text-[11px] text-[#5A6B80]">
                Detectado por tu ubicación (
                {origenDetectado.ciudad ?? origenDetectado.codigo}) — cámbialo
                si no sales de ahí
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
              onCambio={(codigo, nombre, ciudad, pais) =>
                setDatos({ ...datos, destino: codigo, destinoNombre: nombre, destinoCiudad: ciudad, destinoPais: pais })
              }
              valor={datos.destino}
            />
          </div>

          <div className="lg:col-span-3">
            <RangoFechas
              conRegreso={redondo}
              desde={datos.fechaSalida}
              hasta={datos.fechaRegreso}
              onCambio={(desde, hasta) =>
                setDatos({ ...datos, fechaSalida: desde, fechaRegreso: hasta })
              }
            />
          </div>

          <div className="lg:col-span-3">
            <SelectorPasajeros
              onCambio={(p) => setDatos({ ...datos, ...p })}
              valor={pasajeros}
            />
          </div>
        </div>
      )}

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
            } · ${
              multiciudad
                ? `multiciudad (${tramos.length} tramos)`
                : redondo
                  ? "viaje redondo"
                  : "sólo ida"
            } · ${
              CABINAS.find((c) => c.valor === datos.cabina)?.texto ?? "Turista"
            }`}
        </p>
      </div>
    </form>
  );
}
