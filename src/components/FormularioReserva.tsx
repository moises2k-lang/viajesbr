"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Building2 } from "lucide-react";
import type { OfertaConPrecio } from "@/app/api/buscar/route";
import type {
  HotelConPrecio,
  HabitacionConPrecio,
} from "@/app/api/hoteles/route";
import ResumenVuelo from "@/components/ResumenVuelo";
import SelectorTelefono from "@/components/SelectorTelefono";
import FechaNacimiento from "@/components/FechaNacimiento";
import Precio from "@/components/Precio";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
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
  const formularioRef = useRef<HTMLElement>(null);

  useEffect(() => {
    formularioRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

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

  const totalPaquete =
    hotel && habitacion
      ? {
          moneda: oferta.moneda,
          costoNeto: mostrarMargen
            ? oferta.costoNeto + habitacion.costoNeto
            : undefined,
          markup: mostrarMargen
            ? oferta.markup + habitacion.markup
            : undefined,
          precioVenta: oferta.precioVenta + habitacion.precioVenta,
        }
      : null;

  return (
    <section ref={formularioRef} className="mt-8 space-y-6">
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

      {totalPaquete && (
        <div className="rounded-xl border border-[#C9A227] bg-[#FFF8E1] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-[#0B2545]">
              {t("packages.packageTotal")}
            </h3>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#0B2545]">
                <Precio
                  monto={totalPaquete.precioVenta}
                  moneda={totalPaquete.moneda}
                />
              </p>
              {mostrarMargen &&
                totalPaquete.costoNeto !== undefined &&
                totalPaquete.markup !== undefined && (
                  <p className="text-xs text-[#5A6B80]">
                    neto{" "}
                    <Precio
                      monto={totalPaquete.costoNeto}
                      moneda={totalPaquete.moneda}
                    />{" "}
                    + markup{" "}
                    <Precio
                      monto={totalPaquete.markup}
                      moneda={totalPaquete.moneda}
                    />
                  </p>
                )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#E4E8EE] bg-white p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-[#0B2545]">
            {t("form.passengerTitle")}
          </h2>
          <button
            className="text-sm font-medium text-[#14477E] underline"
            onClick={onCancelar}
            type="button"
          >
            {t("common.back")}
          </button>
        </div>

        <p className="mt-1 text-sm font-bold text-[#5A6B80]">
          Los nombres deben ir exactamente como en el pasaporte; la aerolínea
          cobra por corregirlos.
        </p>

        <form className="mt-4 flex flex-col gap-6" onSubmit={enviar}>
          {pasajeros.map((pasajero, indice) => (
            <fieldset
              className="grid gap-3 border-t border-neutral-200 pt-4 sm:grid-cols-2 lg:grid-cols-5"
              key={indice}
            >
              <legend className="text-sm font-bold text-[#0B2545]">
                {etiqueta(oferta.pasajeros[indice], indice)}
              </legend>

              <label className="flex min-w-0 flex-col gap-1 text-sm font-bold text-[#0B2545]">
                {t("common.title")}
                <select
                  className="w-full min-w-0 rounded-md border border-[#14477E] bg-white px-3 py-2.5 text-sm font-semibold text-[#0B2545]"
                  onChange={(e) => actualizar(indice, "titulo", e.target.value)}
                  value={pasajero.titulo}
                >
                  <option value="mr">{t("common.titleMr")}</option>
                  <option value="ms">{t("common.titleMs")}</option>
                  <option value="mrs">{t("common.titleMrs")}</option>
                  <option value="miss">{t("common.titleMiss")}</option>
                  <option value="dr">{t("common.titleDr")}</option>
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1 text-sm font-bold text-[#0B2545]">
                {t("form.firstName")}
                <input
                  className="w-full min-w-0 rounded-md border border-[#14477E] px-3 py-2.5 text-sm font-semibold text-[#0B2545] placeholder:text-[#5A6B80]"
                  onChange={(e) => actualizar(indice, "nombre", e.target.value)}
                  placeholder={t("form.firstName")}
                  required
                  value={pasajero.nombre}
                />
              </label>

              <label className="flex min-w-0 flex-col gap-1 text-sm font-bold text-[#0B2545]">
                {t("form.lastName")}
                <input
                  className="w-full min-w-0 rounded-md border border-[#14477E] px-3 py-2.5 text-sm font-semibold text-[#0B2545] placeholder:text-[#5A6B80]"
                  onChange={(e) =>
                    actualizar(indice, "apellido", e.target.value)
                  }
                  placeholder={t("form.lastName")}
                  required
                  value={pasajero.apellido}
                />
              </label>

              <FechaNacimiento
                className="min-w-0"
                etiqueta={t("form.birthDate")}
                required
                value={pasajero.fechaNacimiento}
                onChange={(v) => actualizar(indice, "fechaNacimiento", v)}
              />

              <label className="flex min-w-0 flex-col gap-1 text-sm font-bold text-[#0B2545]">
                {t("common.gender")}
                <select
                  className="w-full min-w-0 rounded-md border border-[#14477E] bg-white px-3 py-2.5 text-sm font-semibold text-[#0B2545]"
                  onChange={(e) => actualizar(indice, "genero", e.target.value)}
                  value={pasajero.genero}
                >
                  <option value="m">{t("common.male")}</option>
                  <option value="f">{t("common.female")}</option>
                </select>
              </label>
            </fieldset>
          ))}

          <fieldset className="grid gap-3 border-t border-neutral-200 pt-4 sm:grid-cols-2">
            <legend className="text-sm font-bold text-[#0B2545]">
              {t("common.contact")}
            </legend>
            <label className="flex min-w-0 flex-col gap-1 text-sm font-bold text-[#0B2545]">
              {t("common.email")}
              <input
                className="w-full min-w-0 rounded-md border border-[#14477E] px-3 py-2.5 text-sm font-semibold text-[#0B2545] placeholder:text-[#5A6B80]"
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("common.email")}
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
              {enviando ? t("common.loading") : t("form.finalizeReservation")}
            </button>
            {onGuardar && (
              <button
                className="inline-flex items-center gap-1.5 self-start rounded-lg border border-[#14477E] bg-white px-5 py-2.5 text-sm font-semibold text-[#14477E] disabled:opacity-50"
                disabled={enviando || guardando}
                onClick={guardar}
                type="button"
              >
                <Bookmark className="h-4 w-4" />
                {guardando ? t("common.loading") : t("form.saveQuote")}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
