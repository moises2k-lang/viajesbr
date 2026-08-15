"use client";

import { useEffect, useRef, useState } from "react";
import type { HotelConPrecio, HabitacionConPrecio } from "@/app/api/hoteles/route";
import Precio from "@/components/Precio";
import SelectorTelefono from "@/components/SelectorTelefono";
import { useI18n } from "@/lib/i18n";
import { Bookmark, Building2 } from "lucide-react";

export interface ResultadoReservaHotel {
  reservaId: string;
  bookingId: string;
  confirmacionHotel: string | null;
  estado: string;
  ambiente: string;
  moneda: string;
  costoNeto: number;
  markup: number;
  precioVenta: number;
}

interface Props {
  hotel: HotelConPrecio;
  habitacion: HabitacionConPrecio;
  onReservada: (resultado: ResultadoReservaHotel) => void;
  onGuardar?: (datos: {
    nombre: string;
    apellido: string;
    correo: string;
    telefono: string;
  }) => Promise<string>;
  onCancelar: () => void;
}

export default function FormularioReservaHotel({
  hotel,
  habitacion,
  onReservada,
  onGuardar,
  onCancelar,
}: Props) {
  const { t } = useI18n();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("+52");
  const [metodoPago, setMetodoPago] = useState("ACC_CREDIT_CARD");
  const [enviando, setEnviando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formularioRef = useRef<HTMLElement>(null);

  useEffect(() => {
    formularioRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!onGuardar) return;
    setError(null);
    setGuardando(true);
    try {
      const id = await onGuardar({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correo.trim(),
        telefono: telefono.trim(),
      });
      window.open(`/api/itinerarios/${id}/pdf`, "_blank");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const respuesta = await fetch("/api/hoteles/reservar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ofertaId: habitacion.ofertaId,
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          correo: correo.trim(),
          telefono: telefono.trim(),
          metodoPago,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo.error ?? t("errors.searchFailed"));
        return;
      }
      onReservada(cuerpo as ResultadoReservaHotel);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const inputClase =
    "w-full min-w-0 rounded-md border border-[#14477E] bg-white px-3 py-2.5 text-sm font-semibold text-[#0B2545] placeholder:text-[#5A6B80] focus:border-[#0B2545] focus:outline-none";
  const labelClase = "block text-sm font-bold text-[#0B2545] mb-1";

  return (
    <section ref={formularioRef} className="mt-8 space-y-6">
      <div className="rounded-xl border border-[#E4E8EE] bg-white p-4">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-[#0B2545]">
          <Building2 className="h-5 w-5" /> {t("hotels.hotel")}
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-[#0B2545]">{hotel.nombre}</p>
            <p className="text-sm text-[#5A6B80]">
              {habitacion.habitacion} · {hotel.noches} {hotel.noches === 1 ? t("common.night") : t("common.nights")}
            </p>
          </div>
          <p className="text-xl font-semibold text-[#0B2545]">
            <Precio monto={habitacion.precioVenta} moneda={hotel.moneda} />
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#E4E8EE] bg-white p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-[#0B2545]">
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

        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={enviar}>
          <label className={labelClase}>
            {t("form.firstName")} *
            <input
              className={inputClase}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={t("form.firstName")}
              required
              value={nombre}
            />
          </label>
          <label className={labelClase}>
            {t("form.lastName")} *
            <input
              className={inputClase}
              onChange={(e) => setApellido(e.target.value)}
              placeholder={t("form.lastName")}
              required
              value={apellido}
            />
          </label>
          <label className={labelClase}>
            {t("common.email")} *
            <input
              className={inputClase}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder={t("common.email")}
              required
              type="email"
              value={correo}
            />
          </label>
          <SelectorTelefono
            etiqueta={`${t("common.phone")} *`}
            required
            value={telefono}
            onChange={setTelefono}
          />
          <label className={labelClase}>
            {t("form.paymentMethod")}
            <select
              className={inputClase}
              onChange={(e) => setMetodoPago(e.target.value)}
              value={metodoPago}
            >
              <option value="ACC_CREDIT_CARD">{t("form.paymentCreditCard")}</option>
              <option value="WALLET">{t("form.paymentWallet")}</option>
            </select>
          </label>

          {error && (
            <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button
              className="rounded-lg bg-[#C9A227] px-5 py-2.5 text-sm font-semibold text-[#0B2545] disabled:opacity-50"
              disabled={enviando || guardando}
              type="submit"
            >
              {enviando ? t("common.loading") : t("form.finalizeReservation")}
            </button>
            {onGuardar && (
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#14477E] bg-white px-5 py-2.5 text-sm font-semibold text-[#14477E] disabled:opacity-50"
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
