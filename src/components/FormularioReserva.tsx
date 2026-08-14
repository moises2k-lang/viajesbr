"use client";

import { useState } from "react";
import type { OfertaConPrecio } from "@/app/api/buscar/route";
import ResumenVuelo from "@/components/ResumenVuelo";

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
  onCancelar: () => void;
  onReservada: (resultado: ResultadoReserva) => void;
}

export default function FormularioReserva({
  oferta,
  mostrarMargen,
  onCancelar,
  onReservada,
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

  return (
    <section className="mt-8 space-y-6">
      <ResumenVuelo mostrarMargen={mostrarMargen} oferta={oferta} />

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
            <label className="flex min-w-0 flex-col gap-1 text-sm">
              Teléfono (con lada +52)
              <input
                className="w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2"
                onChange={(e) => setTelefono(e.target.value)}
                required
                value={telefono}
              />
            </label>
          </fieldset>

          {error && (
            <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            className="self-start rounded-lg bg-[#C9A227] px-5 py-2.5 text-sm font-semibold text-[#0B2545] disabled:opacity-50"
            disabled={enviando}
            type="submit"
          >
            {enviando ? "Emitiendo…" : "Confirmar reserva"}
          </button>
        </form>
      </div>
    </section>
  );
}
