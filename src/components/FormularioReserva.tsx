"use client";

import { useState } from "react";
import { Bookmark, Building2 } from "lucide-react";
import type { OfertaConPrecio } from "@/app/api/buscar/route";
import type {
  HotelConPrecio,
  HabitacionConPrecio,
} from "@/app/api/hoteles/route";
import ResumenVuelo from "@/components/ResumenVuelo";
import SelectorTelefono from "@/components/SelectorTelefono";
import Precio from "@/components/Precio";

export interface ResultadoReserva {
  ordenId: string;
  duffelOrderId: string;
  pnr: string;
  ambiente: string;
  moneda: string;
  costoNeto: number;
  markup: number;
  precioVenta: number;
}

interface PasajeroFormulario {
  titulo: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  genero: string;
}

function etiqueta(
  pasajero: { tipo: string; edad: number | null },
  indice: number,
): string {
  if (pasajero.tipo === "infant_without_seat")
    return `Bebé en brazos ${indice + 1}`;
  if (pasajero.edad !== null) return `Menor de ${pasajero.edad} años`;
  return `Adulto ${indice + 1}`;
}

interface Props {
  oferta: OfertaConPrecio;
  mostrarMargen: boolean;
  hotel?: HotelConPrecio;
  habitacion?: HabitacionConPrecio;
  onCancelar: () => void;
  onReservada: (resultado: ResultadoReserva) => void;
  onGuardar?: (datos: {
    pasajeros: {
      titulo: string;
      nombre: string;
      apellido: string;
      fechaNacimiento: string;
      genero: string;
    }[];
    email: string;
    telefono: string;
  }) => Promise<string>;
}

export default function FormularioReserva({
  oferta,
  mostrarMargen,
  hotel,
  habitacion,
  onCancelar,
  onReservada,
  onGuardar,
}: Props) {
  const [pasajeros, setPasajeros] = useState<PasajeroFormulario[]>(
    oferta.pasajeros.map(() => ({
      titulo: "mr",
      nombre: "",
      apellido: "",
      fechaNacimiento: "",
      genero: "m",
    })),
  );
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("+52");
  const [enviando, setEnviando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function actualizar(
    indice: number,
    campo: keyof PasajeroFormulario,
    valor: string,
  ) {
    setPasajeros((previos) =>
      previos.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)),
    );
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const respuesta = await fetch("/api/reservar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ofertaId: oferta.ofertaId,
          email,
          telefono,
          pasajeros: pasajeros.map((p) => ({
            titulo: p.titulo,
            nombre: p.nombre.trim(),
            apellido: p.apellido.trim(),
            fechaNacimiento: p.fechaNacimiento,
            genero: p.genero,
          })),
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo.error ?? "No se pudo emitir la reserva");
        return;
      }
      onReservada(cuerpo as ResultadoReserva);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!onGuardar) return;
    setError(null);
    setGuardando(true);
    try {
      const pasajerosLimpios = pasajeros.map((p) => ({
        titulo: p.titulo,
        nombre: p.nombre.trim(),
        apellido: p.apellido.trim(),
        fechaNacimiento: p.fechaNacimiento,
        genero: p.genero,
      }));
      const id = await onGuardar({
        pasajeros: pasajerosLimpios,
        email,
        telefono,
      });
      window.open(`/api/itinerarios/${id}/pdf`, "_blank");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="mt-8 space-y-6">
      <ResumenVuelo mostrarMargen={mostrarMargen} oferta={oferta} />

      {hotel && habitacion && (
        <div className="rounded-xl border border-[#E4E8EE] bg-white p-4">
          <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-[#0B2545]">
            <Building2 className="h-5 w-5" /> Hotel incluido
          </h3>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-[#0B2545]">{hotel.nombre}</p>
              <p className="text-sm text-[#5A6B80]">
                {habitacion.habitacion} · {hotel.noches} noches
              </p>
            </div>
            <p className="text-xl font-semibold text-[#0B2545]">
              <Precio monto={habitacion.precioVenta} moneda={hotel.moneda} />
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#E4E8EE] bg-white p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-[#0B2545]">
            Datos de los pasajeros
          </h2>
          <button
            className="text-sm text-[#14477E] underline"
            onClick={onCancelar}
            type="button"
          >
            Volver a resultados
          </button>
        </div>

        <p className="mt-1 text-sm text-[#5A6B80]">
          Los nombres deben ir exactamente como en el pasaporte; la aerolínea
          cobra por corregirlos.
        </p>

        <form className="mt-4 flex flex-col gap-6" onSubmit={enviar}>
          {pasajeros.map((pasajero, indice) => (
            <fieldset
              className="grid gap-3 border-t border-neutral-200 pt-4 sm:grid-cols-2 lg:grid-cols-5"
              key={indice}
            >
              <legend className="text-sm font-medium">
                {etiqueta(oferta.pasajeros[indice], indice)}
              </legend>

              <label className="flex min-w-0 flex-col gap-1 text-sm">
                Título
                <select
                  className="w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2"
                  onChange={(e) => actualizar(indice, "titulo", e.target.value)}
                  value={pasajero.titulo}
                >
                  <option value="mr">Sr.</option>
                  <option value="ms">Sra./Srta.</option>
                  <option value="mrs">Sra.</option>
                  <option value="miss">Srta.</option>
                  <option value="dr">Dr.</option>
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1 text-sm">
                Nombre(s)
                <input
                  className="w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2"
                  onChange={(e) => actualizar(indice, "nombre", e.target.value)}
                  required
                  value={pasajero.nombre}
                />
              </label>

              <label className="flex min-w-0 flex-col gap-1 text-sm">
                Apellidos
                <input
                  className="w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2"
                  onChange={(e) =>
                    actualizar(indice, "apellido", e.target.value)
                  }
                  required
                  value={pasajero.apellido}
                />
              </label>

              <label className="flex min-w-0 flex-col gap-1 text-sm">
                Fecha de nacimiento
                <input
                  className="w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2"
                  onChange={(e) =>
                    actualizar(indice, "fechaNacimiento", e.target.value)
                  }
                  required
                  type="date"
                  value={pasajero.fechaNacimiento}
                />
              </label>

              <label className="flex min-w-0 flex-col gap-1 text-sm">
                Sexo
                <select
                  className="w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2"
                  onChange={(e) => actualizar(indice, "genero", e.target.value)}
                  value={pasajero.genero}
                >
                  <option value="m">Masculino</option>
                  <option value="f">Femenino</option>
                </select>
              </label>
            </fieldset>
          ))}

          <fieldset className="grid gap-3 border-t border-neutral-200 pt-4 sm:grid-cols-2">
            <legend className="text-sm font-medium">Contacto</legend>
            <label className="flex min-w-0 flex-col gap-1 text-sm">
              Correo
              <input
                className="w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2"
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <SelectorTelefono
              required
              value={telefono}
              onChange={setTelefono}
            />
          </fieldset>

          {error && (
            <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              className="self-start rounded-lg bg-[#C9A227] px-5 py-2.5 text-sm font-semibold text-[#0B2545] disabled:opacity-50"
              disabled={enviando || guardando}
              type="submit"
            >
              {enviando ? "Emitiendo…" : "Confirmar reserva"}
            </button>
            {onGuardar && (
              <button
                className="inline-flex items-center gap-1.5 self-start rounded-lg border border-[#14477E] bg-white px-5 py-2.5 text-sm font-semibold text-[#14477E] disabled:opacity-50"
                disabled={enviando || guardando}
                onClick={guardar}
                type="button"
              >
                <Bookmark className="h-4 w-4" />
                {guardando ? "Guardando…" : "Guardar reserva"}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
