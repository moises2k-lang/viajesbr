"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SelectorTelefono from "@/components/SelectorTelefono";
import SiteHeader from "@/components/SiteHeader";
import CampoAeropuerto from "@/components/CampoAeropuerto";
import FechaNacimiento from "@/components/FechaNacimiento";
import RangoFechas from "@/components/RangoFechas";
import Captcha from "@/components/Captcha";
import { useI18n } from "@/lib/i18n";
import {
  Building2,
  Plane,
  Car,
  FileText,
  Users,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Plus,
  Briefcase,
} from "lucide-react";

interface Viajero {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  pasaporte: string;
  nacionalidad: string;
  fechaNacimiento: string;
}

interface Bloque {
  posicion: number;
  tipo: string;
  titulo: string;
  fecha: string | null;
  fecha_fin: string | null;
  detalle: string;
  proveedor: string | null;
  costo_neto?: number | null;
  precio_venta?: number | null;
  datos?: unknown;
}

interface Formulario {
  empresa: string;
  contacto: string;
  email: string;
  telefono: string;
  viajeros: Viajero[];
  tipoViaje: string;
  origenCodigo: string;
  origenDesc: string | null;
  destinoCodigo: string;
  destinoDesc: string | null;
  fechaSalida: string;
  fechaRegreso: string;
  vueloNecesario: boolean;
  clasePreferida: string;
  hotelNecesario: boolean;
  categoriaHotel: string;
  cocheNecesario: boolean;
  tipoCoche: string;
  trasladoAeropuerto: boolean;
  notas: string;
}

function viajeroVacio(): Viajero {
  return {
    id: crypto.randomUUID(),
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
    pasaporte: "",
    nacionalidad: "",
    fechaNacimiento: "",
  };
}

const VACIO: Formulario = {
  empresa: "",
  contacto: "",
  email: "",
  telefono: "",
  viajeros: [viajeroVacio()],
  tipoViaje: "ejecutivo",
  origenCodigo: "",
  origenDesc: null,
  destinoCodigo: "",
  destinoDesc: null,
  fechaSalida: "",
  fechaRegreso: "",
  vueloNecesario: true,
  clasePreferida: "business",
  hotelNecesario: true,
  categoriaHotel: "4",
  cocheNecesario: false,
  tipoCoche: "sedan",
  trasladoAeropuerto: true,
  notas: "",
};

function inputClase(invalido?: boolean) {
  return `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[#0B2545] outline-none transition focus:border-[#14477E] focus:ring-2 focus:ring-[#14477E]/20 ${
    invalido ? "border-red-300" : "border-[#E4E8EE]"
  }`;
}

function labelClase() {
  return "block text-xs font-bold uppercase tracking-wide text-[#0B2545] mb-1";
}

function sectionTitle(icon: React.ReactNode, title: string) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#0B2545]">
      {icon} {title}
    </h2>
  );
}

function viajeroBloque(v: Viajero, num: number): string {
  const partes = [`#${num} ${v.nombre} ${v.apellidos}`.trim()];
  if (v.nacionalidad) partes.push(v.nacionalidad);
  if (v.pasaporte) partes.push(v.pasaporte);
  if (v.fechaNacimiento) partes.push(v.fechaNacimiento);
  return partes.join(" · ");
}

export default function CorporativoWizard() {
  const { t } = useI18n();
  const [paso, setPaso] = useState(1);
  const [f, setF] = useState<Formulario>(VACIO);
  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [captchaRespuesta, setCaptchaRespuesta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itinerarioId, setItinerarioId] = useState<string | null>(null);

  const numViajeros = f.viajeros.length;

  const TIPOS_VIAJE = useMemo(
    () => [
      { valor: "ejecutivo", key: "corporate.travelTypeBusiness" },
      { valor: "incentivo", key: "corporate.travelTypeIncentive" },
      { valor: "convencion", key: "corporate.travelTypeConvention" },
      { valor: "roadshow", key: "corporate.travelTypeRoadshow" },
      { valor: "otro", key: "corporate.travelTypeOther" },
    ],
    [],
  );

  const CLASES = useMemo(
    () => [
      { valor: "economy", key: "common.economy" },
      { valor: "premium_economy", key: "common.premium" },
      { valor: "business", key: "common.business" },
      { valor: "first", key: "common.first" },
    ],
    [],
  );

  const CATEGORIAS = useMemo(
    () => [
      { valor: "3", key: "corporate.hotel3" },
      { valor: "4", key: "corporate.hotel4" },
      { valor: "5", key: "corporate.hotel5" },
      { valor: "boutique", key: "corporate.hotelBoutique" },
    ],
    [],
  );

  const COCHES = useMemo(
    () => [
      { valor: "sedan", key: "corporate.vehicleSedan" },
      { valor: "suv", key: "corporate.vehicleSuv" },
      { valor: "van", key: "corporate.vehicleVan" },
      { valor: "lujo", key: "corporate.vehicleLuxury" },
    ],
    [],
  );

  function actualizar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setF((prev) => ({ ...prev, [campo]: valor } as Formulario));
  }

  function actualizarViajero(id: string, campo: keyof Viajero, valor: string) {
    setF((prev) => ({
      ...prev,
      viajeros: prev.viajeros.map((v) =>
        v.id === id ? { ...v, [campo]: valor } : v,
      ),
    }));
  }

  function agregarViajero() {
    setF((prev) => ({
      ...prev,
      viajeros: [...prev.viajeros, viajeroVacio()],
    }));
  }

  function eliminarViajero(id: string) {
    if (f.viajeros.length <= 1) return;
    setF((prev) => ({
      ...prev,
      viajeros: prev.viajeros.filter((v) => v.id !== id),
    }));
  }

  function validarPaso1() {
    return (
      f.empresa.trim() &&
      f.contacto.trim() &&
      f.email.trim() &&
      f.telefono.trim() &&
      f.viajeros.length > 0 &&
      f.viajeros.every((v) => v.nombre.trim() && v.apellidos.trim())
    );
  }

  function validarPaso2() {
    return f.origenCodigo.trim() && f.destinoCodigo.trim() && f.fechaSalida;
  }

  function continuar() {
    setError(null);
    if (paso === 1 && !validarPaso1()) {
      setError(t("errors.completeCompany"));
      return;
    }
    if (paso === 2 && !validarPaso2()) {
      setError(t("errors.completeTrip"));
      return;
    }
    setPaso((p) => p + 1);
  }

  async function guardar() {
    setError(null);
    if (!validarPaso1() || !validarPaso2()) {
      setError(t("errors.reviewRequired"));
      return;
    }
    setGuardando(true);

    const bloques: Bloque[] = [];
    bloques.push({
      posicion: 0,
      tipo: "corporativo",
      titulo: `${t("common.company")}: ${f.empresa}`,
      fecha: f.fechaSalida || null,
      fecha_fin: f.fechaRegreso || null,
      detalle: `${t(TIPOS_VIAJE.find((tOption) => tOption.valor === f.tipoViaje)?.key || "corporate.travelTypeBusiness")} · ${numViajeros} ${t("common.passengers")} · ${f.contacto}`,
      proveedor: null,
      datos: {
        empresa: f.empresa,
        contacto: f.contacto,
        email: f.email,
        telefono: f.telefono,
        tipoViaje: f.tipoViaje,
        notas: f.notas,
        viajeros: f.viajeros,
      },
    });

    f.viajeros.forEach((v, i) => {
      bloques.push({
        posicion: bloques.length,
        tipo: "viajero",
        titulo: `${t("common.passengers")} ${i + 1}`,
        fecha: f.fechaSalida || null,
        fecha_fin: f.fechaRegreso || null,
        detalle: viajeroBloque(v, i + 1),
        proveedor: null,
        datos: v,
      });
    });

    if (f.vueloNecesario) {
      bloques.push({
        posicion: bloques.length,
        tipo: "vuelo",
        titulo: `${t("flights.flight")} ${f.origenDesc || f.origenCodigo} → ${f.destinoDesc || f.destinoCodigo}`,
        fecha: f.fechaSalida,
        fecha_fin: f.fechaRegreso || null,
        detalle: `${numViajeros} ${t("common.passengers")} · ${t(CLASES.find((c) => c.valor === f.clasePreferida)?.key as string || t("common.business"))}`,
        proveedor: t("corporate.pendingQuote"),
        datos: { origen: f.origenCodigo, destino: f.destinoCodigo, clase: f.clasePreferida },
      });
    }

    if (f.hotelNecesario) {
      bloques.push({
        posicion: bloques.length,
        tipo: "hotel",
        titulo: `${t("hotels.hotel")} ${t("common.in")} ${f.destinoDesc || f.destinoCodigo}`,
        fecha: f.fechaSalida,
        fecha_fin: f.fechaRegreso || null,
        detalle: `${t(CATEGORIAS.find((c) => c.valor === f.categoriaHotel)?.key as string || t("corporate.hotel4"))} · ${numViajeros} ${t("common.guests")}`,
        proveedor: t("corporate.pendingQuote"),
        datos: { destino: f.destinoCodigo, categoria: f.categoriaHotel },
      });
    }

    if (f.cocheNecesario) {
      const detalles: string[] = [t(COCHES.find((c) => c.valor === f.tipoCoche)?.key as string || t("corporate.vehicleSedan"))];
      if (f.trasladoAeropuerto) detalles.push(t("corporate.airportTransfer"));
      bloques.push({
        posicion: bloques.length,
        tipo: "coche",
        titulo: t("corporate.transfers"),
        fecha: f.fechaSalida,
        fecha_fin: f.fechaRegreso || null,
        detalle: detalles.filter(Boolean).join(" · "),
        proveedor: t("corporate.pendingQuote"),
        datos: { tipoCoche: f.tipoCoche, trasladoAeropuerto: f.trasladoAeropuerto },
      });
    }

    try {
      const respuesta = await fetch("/api/itinerarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: `${t("corporate.badge")} · ${f.empresa} · ${f.destinoDesc || f.destinoCodigo || f.origenDesc || f.origenCodigo}`,
          cliente: f.contacto,
          resumen: `${f.email} · ${f.telefono} · ${f.empresa} · ${numViajeros} ${t("common.passengers")}`,
          moneda: "USD",
          estado: "borrador",
          bloques,
          captchaId,
          captchaRespuesta,
        }),
      });
      const cuerpo = (await respuesta.json()) as { id?: string; error?: string };
      if (!respuesta.ok || !cuerpo.id) {
        throw new Error(cuerpo.error ?? t("errors.saveFailed"));
      }
      setItinerarioId(cuerpo.id);
      setPaso(4);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  const pasos = [
    { n: 1, label: t("corporate.stepCompany"), icon: <Briefcase className="h-3.5 w-3.5" /> },
    { n: 2, label: t("corporate.stepTrip"), icon: <Plane className="h-3.5 w-3.5" /> },
    { n: 3, label: t("corporate.stepServices"), icon: <Car className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <SiteHeader />

      <section className="bg-[#0B2545] pb-16 pt-6 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wide">
              <Building2 className="h-3.5 w-3.5" /> {t("corporate.badge")}
            </div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{t("corporate.title")}</h1>
            <p className="mt-2 text-sm text-white/70">{t("corporate.subtitle")}</p>
          </div>
        </div>
      </section>

      <main className="mx-auto -mt-10 w-full max-w-7xl flex-1 px-4 pb-16 sm:px-6">
        <div className="rounded-2xl bg-white p-4 shadow-lg shadow-[#0B2545]/10 sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {paso === 4 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <h2 className="mt-4 text-xl font-semibold text-[#0B2545]">{t("corporate.quoteSaved")}</h2>
              <p className="mt-1 text-sm text-[#5A6B80]">{t("corporate.quoteSavedMessage")}</p>
              {itinerarioId && (
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2545] px-5 py-2.5 text-sm font-semibold text-white"
                    onClick={() => window.open(`/api/itinerarios/${itinerarioId}/pdf`, "_blank")}
                    type="button"
                  >
                    <FileText className="h-4 w-4" /> {t("corporate.downloadPdf")}
                  </button>
                  <Link
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#14477E] px-5 py-2.5 text-sm font-semibold text-[#14477E]"
                    href="/"
                  >
                    {t("corporate.backHome")}
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-2 text-sm font-medium text-[#5A6B80] flex-wrap">
                {pasos.map((p, idx) => (
                  <span key={p.n} className="inline-flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                        paso >= p.n ? "bg-[#0B2545] text-white" : "bg-[#E4E8EE]"
                      }`}
                    >
                      {p.icon} {p.label}
                    </span>
                    {idx < pasos.length - 1 && <span className="text-[#D7DDE5]">→</span>}
                  </span>
                ))}
              </div>

              {paso === 1 && (
                <div className="space-y-6">
                  {sectionTitle(<Building2 className="h-5 w-5" />, t("corporate.companyTitle"))}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClase()}>{t("common.company")} *</label>
                      <input
                        className={inputClase()}
                        onChange={(e) => actualizar("empresa", e.target.value)}
                        type="text"
                        value={f.empresa}
                      />
                    </div>
                    <div>
                      <label className={labelClase()}>{t("corporate.contactName")} *</label>
                      <input
                        className={inputClase()}
                        onChange={(e) => actualizar("contacto", e.target.value)}
                        type="text"
                        value={f.contacto}
                      />
                    </div>
                    <div>
                      <label className={labelClase()}>{t("common.email")} *</label>
                      <input
                        className={inputClase()}
                        onChange={(e) => actualizar("email", e.target.value)}
                        type="email"
                        value={f.email}
                      />
                    </div>
                    <div>
                      <SelectorTelefono
                        etiqueta={`${t("common.phone")} *`}
                        onChange={(v) => actualizar("telefono", v)}
                        value={f.telefono}
                      />
                    </div>
                    <div>
                      <label className={labelClase()}>{t("common.tripType")}</label>
                      <select
                        className={inputClase()}
                        onChange={(e) => actualizar("tipoViaje", e.target.value)}
                        value={f.tipoViaje}
                      >
                        {TIPOS_VIAJE.map((tOption) => (
                          <option key={tOption.valor} value={tOption.valor}>
                            {t(tOption.key as string)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {sectionTitle(<Users className="h-5 w-5" />, `${t("corporate.travelersTitle")} (${numViajeros})`)}
                  <div className="space-y-4">
                    {f.viajeros.map((viajero, indice) => (
                      <div
                        key={viajero.id}
                        className="rounded-xl border border-[#E4E8EE] p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#0B2545]">
                            {t("common.passenger")} {indice + 1}
                          </p>
                          {f.viajeros.length > 1 && (
                            <button
                              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                              onClick={() => eliminarViajero(viajero.id)}
                              type="button"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> {t("common.remove")}
                            </button>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className={labelClase()}>{t("form.firstName")} *</label>
                            <input
                              className={inputClase()}
                              onChange={(e) => actualizarViajero(viajero.id, "nombre", e.target.value)}
                              type="text"
                              value={viajero.nombre}
                            />
                          </div>
                          <div>
                            <label className={labelClase()}>{t("form.lastName")} *</label>
                            <input
                              className={inputClase()}
                              onChange={(e) => actualizarViajero(viajero.id, "apellidos", e.target.value)}
                              type="text"
                              value={viajero.apellidos}
                            />
                          </div>
                          <div>
                            <label className={labelClase()}>{t("common.email")}</label>
                            <input
                              className={inputClase()}
                              onChange={(e) => actualizarViajero(viajero.id, "email", e.target.value)}
                              type="email"
                              value={viajero.email}
                            />
                          </div>
                          <div>
                            <SelectorTelefono
                              etiqueta={t("common.phone")}
                              onChange={(v) => actualizarViajero(viajero.id, "telefono", v)}
                              value={viajero.telefono}
                            />
                          </div>
                          <div>
                            <label className={labelClase()}>{t("common.passport")}</label>
                            <input
                              className={inputClase()}
                              onChange={(e) => actualizarViajero(viajero.id, "pasaporte", e.target.value)}
                              type="text"
                              value={viajero.pasaporte}
                            />
                          </div>
                          <div>
                            <label className={labelClase()}>{t("common.nationality")}</label>
                            <input
                              className={inputClase()}
                              onChange={(e) => actualizarViajero(viajero.id, "nacionalidad", e.target.value)}
                              type="text"
                              value={viajero.nacionalidad}
                            />
                          </div>
                          <FechaNacimiento
                            className="sm:col-span-2 lg:col-span-4"
                            etiqueta={t("common.birthday")}
                            value={viajero.fechaNacimiento}
                            onChange={(v) => actualizarViajero(viajero.id, "fechaNacimiento", v)}
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#14477E] px-4 py-2 text-sm font-semibold text-[#14477E]"
                      onClick={agregarViajero}
                      type="button"
                    >
                      <Plus className="h-4 w-4" /> {t("corporate.addTraveler")}
                    </button>
                  </div>
                </div>
              )}

              {paso === 2 && (
                <div className="space-y-4">
                  {sectionTitle(<Plane className="h-5 w-5" />, t("corporate.tripTitle"))}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <CampoAeropuerto
                      etiqueta={`${t("common.origin")} *`}
                      valor={f.origenCodigo}
                      descripcion={f.origenDesc}
                      onCambio={(codigo, desc) => {
                        actualizar("origenCodigo", codigo);
                        actualizar("origenDesc", desc);
                      }}
                    />
                    <CampoAeropuerto
                      etiqueta={`${t("common.destination")} *`}
                      valor={f.destinoCodigo}
                      descripcion={f.destinoDesc}
                      onCambio={(codigo, desc) => {
                        actualizar("destinoCodigo", codigo);
                        actualizar("destinoDesc", desc);
                      }}
                    />
                    <div className="sm:col-span-2">
                      <RangoFechas
                        conRegreso
                        desde={f.fechaSalida}
                        etiquetaDesde={t("common.departure")}
                        etiquetaHasta={t("common.return")}
                        hasta={f.fechaRegreso || null}
                        onCambio={(desde, hasta) => {
                          actualizar("fechaSalida", desde);
                          actualizar("fechaRegreso", hasta ?? "");
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {paso === 3 && (
                <div className="space-y-6">
                  {sectionTitle(<Car className="h-5 w-5" />, t("corporate.servicesTitle"))}

                  <div className="rounded-xl border border-[#E4E8EE] p-4">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        checked={f.vueloNecesario}
                        className="h-4 w-4 accent-[#0B2545]"
                        onChange={(e) => actualizar("vueloNecesario", e.target.checked)}
                        type="checkbox"
                      />
                      <span className="font-semibold text-[#0B2545]">{t("common.flights")}</span>
                    </label>
                    {f.vueloNecesario && (
                      <div className="mt-3 pl-7">
                        <label className={labelClase()}>{t("corporate.flightClass")}</label>
                        <select
                          className={`${inputClase()} max-w-xs`}
                          onChange={(e) => actualizar("clasePreferida", e.target.value)}
                          value={f.clasePreferida}
                        >
                          {CLASES.map((c) => (
                            <option key={c.valor} value={c.valor}>
                              {t(c.key as string)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#E4E8EE] p-4">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        checked={f.hotelNecesario}
                        className="h-4 w-4 accent-[#0B2545]"
                        onChange={(e) => actualizar("hotelNecesario", e.target.checked)}
                        type="checkbox"
                      />
                      <span className="font-semibold text-[#0B2545]">{t("common.hotels")}</span>
                    </label>
                    {f.hotelNecesario && (
                      <div className="mt-3 pl-7">
                        <label className={labelClase()}>{t("corporate.hotelCategory")}</label>
                        <select
                          className={`${inputClase()} max-w-xs`}
                          onChange={(e) => actualizar("categoriaHotel", e.target.value)}
                          value={f.categoriaHotel}
                        >
                          {CATEGORIAS.map((c) => (
                            <option key={c.valor} value={c.valor}>
                              {t(c.key as string)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#E4E8EE] p-4">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        checked={f.cocheNecesario}
                        className="h-4 w-4 accent-[#0B2545]"
                        onChange={(e) => actualizar("cocheNecesario", e.target.checked)}
                        type="checkbox"
                      />
                      <span className="font-semibold text-[#0B2545]">{t("corporate.transfers")}</span>
                    </label>
                    {f.cocheNecesario && (
                      <div className="mt-3 space-y-3 pl-7">
                        <div>
                          <label className={labelClase()}>{t("corporate.vehicleType")}</label>
                          <select
                            className={`${inputClase()} max-w-xs`}
                            onChange={(e) => actualizar("tipoCoche", e.target.value)}
                            value={f.tipoCoche}
                          >
                            {COCHES.map((c) => (
                              <option key={c.valor} value={c.valor}>
                                {t(c.key as string)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-[#0B2545]">
                          <input
                            checked={f.trasladoAeropuerto}
                            className="h-4 w-4 accent-[#0B2545]"
                            onChange={(e) => actualizar("trasladoAeropuerto", e.target.checked)}
                            type="checkbox"
                          />
                          {t("corporate.airportTransfer")}
                        </label>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelClase()}>{t("corporate.additionalNotes")}</label>
                    <textarea
                      className={`${inputClase()} min-h-[5rem]`}
                      onChange={(e) => actualizar("notas", e.target.value)}
                      placeholder={t("corporate.notesPlaceholder")}
                      value={f.notas}
                    />
                  </div>

                  <Captcha
                    onChange={(id, respuesta) => {
                      setCaptchaId(id);
                      setCaptchaRespuesta(respuesta);
                    }}
                  />
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                {paso > 1 ? (
                  <button
                    className="rounded-lg border border-[#E4E8EE] px-5 py-2.5 text-sm font-medium text-[#5A6B80]"
                    onClick={() => setPaso((p) => p - 1)}
                    type="button"
                  >
                    {t("common.back")}
                  </button>
                ) : (
                  <div />
                )}

                {paso < 3 ? (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2545] px-6 py-2.5 text-sm font-semibold text-white"
                    onClick={continuar}
                    type="button"
                  >
                    {t("common.continue")} <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2545] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={guardando || !captchaId || !captchaRespuesta}
                    onClick={guardar}
                    type="button"
                  >
                    {guardando ? t("common.loading") : t("corporate.saveQuote")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
