"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import SelectorTelefono from "@/components/SelectorTelefono";
import CampoAeropuerto from "@/components/CampoAeropuerto";
import { Building2, Plane, Hotel, Car, FileText, Users, ArrowRight, CheckCircle2 } from "lucide-react";

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
  numViajeros: number;
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

const VACIO: Formulario = {
  empresa: "",
  contacto: "",
  email: "",
  telefono: "",
  numViajeros: 1,
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

const TIPOS_VIAJE = [
  { valor: "ejecutivo", texto: "Viaje de negocios" },
  { valor: "incentivo", texto: "Viaje de incentivo" },
  { valor: "convencion", texto: "Convención / MICE" },
  { valor: "roadshow", texto: "Roadshow" },
  { valor: "otro", texto: "Otro" },
];

const CLASES = [
  { valor: "economy", texto: "Economy" },
  { valor: "premium_economy", texto: "Premium Economy" },
  { valor: "business", texto: "Business" },
  { valor: "first", texto: "First" },
];

const CATEGORIAS = [
  { valor: "3", texto: "3 estrellas" },
  { valor: "4", texto: "4 estrellas" },
  { valor: "5", texto: "5 estrellas" },
  { valor: "boutique", texto: "Boutique / único" },
];

const COCHES = [
  { valor: "sedan", texto: "Sedán ejecutivo" },
  { valor: "suv", texto: "SUV" },
  { valor: "van", texto: "Van / Sprinter" },
  { valor: "lujo", texto: "Lujo" },
];

function inputClase(invalido?: boolean) {
  return `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[#0B2545] outline-none transition focus:border-[#14477E] focus:ring-2 focus:ring-[#14477E]/20 ${
    invalido ? "border-red-300" : "border-[#E4E8EE]"
  }`;
}

function labelClase() {
  return "block text-xs font-medium uppercase tracking-wide text-[#5A6B80] mb-1";
}

function sectionTitle(icon: React.ReactNode, title: string) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#0B2545]">
      {icon} {title}
    </h2>
  );
}

export default function CorporativoWizard() {
  const { usuario } = useAuth();
  const [paso, setPaso] = useState(1);
  const [f, setF] = useState<Formulario>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itinerarioId, setItinerarioId] = useState<string | null>(null);

  function actualizar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setF((prev) => ({ ...prev, [campo]: valor } as Formulario));
  }

  function validarPaso1() {
    return f.empresa.trim() && f.contacto.trim() && f.email.trim() && f.telefono.trim();
  }

  function validarPaso2() {
    return f.origenCodigo.trim() && f.destinoCodigo.trim() && f.fechaSalida;
  }

  function continuar() {
    setError(null);
    if (paso === 1 && !validarPaso1()) {
      setError("Completa los datos de empresa y contacto.");
      return;
    }
    if (paso === 2 && !validarPaso2()) {
      setError("Completa origen, destino y fecha de salida.");
      return;
    }
    setPaso((p) => p + 1);
  }

  async function guardar() {
    setError(null);
    if (!validarPaso1() || !validarPaso2()) {
      setError("Revisa los datos obligatorios.");
      return;
    }
    setGuardando(true);

    const bloques: Bloque[] = [];
    bloques.push({
      posicion: 0,
      tipo: "corporativo",
      titulo: `Empresa: ${f.empresa}`,
      fecha: f.fechaSalida || null,
      fecha_fin: f.fechaRegreso || null,
      detalle: `${TIPOS_VIAJE.find((t) => t.valor === f.tipoViaje)?.texto} · ${f.numViajeros} viajero${f.numViajeros === 1 ? "" : "s"}`,
      proveedor: null,
      datos: { empresa: f.empresa, contacto: f.contacto, email: f.email, telefono: f.telefono, tipoViaje: f.tipoViaje, notas: f.notas },
    });

    if (f.vueloNecesario) {
      bloques.push({
        posicion: bloques.length,
        tipo: "vuelo",
        titulo: `Vuelo ${f.origenDesc || f.origenCodigo} → ${f.destinoDesc || f.destinoCodigo}`,
        fecha: f.fechaSalida,
        fecha_fin: f.fechaRegreso || null,
        detalle: `${f.numViajeros} pasajero${f.numViajeros === 1 ? "" : "s"} · ${CLASES.find((c) => c.valor === f.clasePreferida)?.texto}`,
        proveedor: "Pendiente cotización",
        datos: { origen: f.origenCodigo, destino: f.destinoCodigo, clase: f.clasePreferida },
      });
    }

    if (f.hotelNecesario) {
      bloques.push({
        posicion: bloques.length,
        tipo: "hotel",
        titulo: `Hotel en ${f.destinoDesc || f.destinoCodigo}`,
        fecha: f.fechaSalida,
        fecha_fin: f.fechaRegreso || null,
        detalle: `${CATEGORIAS.find((c) => c.valor === f.categoriaHotel)?.texto} · ${f.numViajeros} huéspedes`,
        proveedor: "Pendiente cotización",
        datos: { destino: f.destinoCodigo, categoria: f.categoriaHotel },
      });
    }

    if (f.cocheNecesario) {
      const detalles: string[] = [COCHES.find((c) => c.valor === f.tipoCoche)?.texto ?? ""];
      if (f.trasladoAeropuerto) detalles.push("traslado aeropuerto");
      bloques.push({
        posicion: bloques.length,
        tipo: "coche",
        titulo: `Traslado / renta de auto`,
        fecha: f.fechaSalida,
        fecha_fin: f.fechaRegreso || null,
        detalle: detalles.filter(Boolean).join(" · "),
        proveedor: "Pendiente cotización",
        datos: { tipoCoche: f.tipoCoche, trasladoAeropuerto: f.trasladoAeropuerto },
      });
    }

    try {
      const respuesta = await fetch("/api/itinerarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: `Cotización corporativa · ${f.empresa} · ${f.destinoDesc || f.destinoCodigo || f.origenDesc || f.origenCodigo}`,
          cliente: f.contacto,
          resumen: `${f.email} · ${f.telefono} · ${f.empresa} · ${f.numViajeros} viajeros`,
          moneda: "USD",
          estado: "borrador",
          bloques,
        }),
      });
      const cuerpo = (await respuesta.json()) as { id?: string; error?: string };
      if (!respuesta.ok || !cuerpo.id) {
        throw new Error(cuerpo.error ?? "No se pudo guardar la cotización");
      }
      setItinerarioId(cuerpo.id);
      setPaso(4);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <header className="bg-[#0B2545]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/">
            <img alt="IA Travel Planning" className="h-9" src="/logo.svg" />
          </Link>
          <nav className="flex items-center gap-4 text-sm text-white/80">
            <Link className="hover:text-white" href="/">Vuelos / Hoteles</Link>
            <Link className="hover:text-white" href="/admin/itinerarios">Itinerarios</Link>
            {usuario && <span className="hidden sm:inline">{usuario.nombre ?? usuario.email}</span>}
          </nav>
        </div>
      </header>

      <section className="bg-[#0B2545] pb-16 pt-6 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wide">
              <Building2 className="h-3.5 w-3.5" /> Viajes corporativos
            </div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Cotiza tu viaje de negocios o MICE</h1>
            <p className="mt-2 text-sm text-white/70">
              Viajes ejecutivos, incentivos, convenciones y roadshows. Armamos el paquete con vuelos, hoteles corporativos y traslados.
            </p>
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
              <h2 className="mt-4 text-xl font-semibold text-[#0B2545]">Cotización guardada</h2>
              <p className="mt-1 text-sm text-[#5A6B80]">
                Te contactaremos en menos de 2 horas hábiles. Puedes descargar el esquema.
              </p>
              {itinerarioId && (
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2545] px-5 py-2.5 text-sm font-semibold text-white"
                    onClick={() => window.open(`/api/itinerarios/${itinerarioId}/pdf`, "_blank")}
                    type="button"
                  >
                    <FileText className="h-4 w-4" /> Descargar esquema PDF
                  </button>
                  <Link
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#14477E] px-5 py-2.5 text-sm font-semibold text-[#14477E]"
                    href="/"
                  >
                    Volver al inicio
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-2 text-sm font-medium text-[#5A6B80]">
                <span className={`rounded-full px-3 py-1 ${paso >= 1 ? "bg-[#0B2545] text-white" : "bg-[#E4E8EE]"}`}>1</span>
                <span className={paso >= 1 ? "text-[#0B2545]" : ""}>Empresa</span>
                <span className="text-[#D7DDE5]">→</span>
                <span className={`rounded-full px-3 py-1 ${paso >= 2 ? "bg-[#0B2545] text-white" : "bg-[#E4E8EE]"}`}>2</span>
                <span className={paso >= 2 ? "text-[#0B2545]" : ""}>Viaje</span>
                <span className="text-[#D7DDE5]">→</span>
                <span className={`rounded-full px-3 py-1 ${paso >= 3 ? "bg-[#0B2545] text-white" : "bg-[#E4E8EE]"}`}>3</span>
                <span className={paso >= 3 ? "text-[#0B2545]" : ""}>Servicios</span>
              </div>

              {paso === 1 && (
                <div className="space-y-4">
                  {sectionTitle(<Users className="h-5 w-5" />, "Datos de la empresa y contacto")}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClase()}>Empresa *</label>
                      <input
                        className={inputClase()}
                        onChange={(e) => actualizar("empresa", e.target.value)}
                        type="text"
                        value={f.empresa}
                      />
                    </div>
                    <div>
                      <label className={labelClase()}>Nombre del contacto *</label>
                      <input
                        className={inputClase()}
                        onChange={(e) => actualizar("contacto", e.target.value)}
                        type="text"
                        value={f.contacto}
                      />
                    </div>
                    <div>
                      <label className={labelClase()}>Correo *</label>
                      <input
                        className={inputClase()}
                        onChange={(e) => actualizar("email", e.target.value)}
                        type="email"
                        value={f.email}
                      />
                    </div>
                    <div>
                      <SelectorTelefono
                        etiqueta="Teléfono *"
                        onChange={(v) => actualizar("telefono", v)}
                        value={f.telefono}
                      />
                    </div>
                    <div>
                      <label className={labelClase()}>Número de viajeros</label>
                      <input
                        className={inputClase()}
                        min={1}
                        onChange={(e) => actualizar("numViajeros", Math.max(1, parseInt(e.target.value || "1", 10)))}
                        type="number"
                        value={f.numViajeros}
                      />
                    </div>
                    <div>
                      <label className={labelClase()}>Tipo de viaje</label>
                      <select
                        className={inputClase()}
                        onChange={(e) => actualizar("tipoViaje", e.target.value)}
                        value={f.tipoViaje}
                      >
                        {TIPOS_VIAJE.map((t) => (
                          <option key={t.valor} value={t.valor}>{t.texto}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {paso === 2 && (
                <div className="space-y-4">
                  {sectionTitle(<Plane className="h-5 w-5" />, "Detalles del viaje")}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <CampoAeropuerto
                      etiqueta="Origen *"
                      valor={f.origenCodigo}
                      descripcion={f.origenDesc}
                      onCambio={(codigo, desc) => {
                        actualizar("origenCodigo", codigo);
                        actualizar("origenDesc", desc);
                      }}
                    />
                    <CampoAeropuerto
                      etiqueta="Destino *"
                      valor={f.destinoCodigo}
                      descripcion={f.destinoDesc}
                      onCambio={(codigo, desc) => {
                        actualizar("destinoCodigo", codigo);
                        actualizar("destinoDesc", desc);
                      }}
                    />
                    <div>
                      <label className={labelClase()}>Fecha de salida *</label>
                      <input
                        className={inputClase()}
                        onChange={(e) => actualizar("fechaSalida", e.target.value)}
                        type="date"
                        value={f.fechaSalida}
                      />
                    </div>
                    <div>
                      <label className={labelClase()}>Fecha de regreso</label>
                      <input
                        className={inputClase()}
                        onChange={(e) => actualizar("fechaRegreso", e.target.value)}
                        type="date"
                        value={f.fechaRegreso}
                      />
                    </div>
                  </div>
                </div>
              )}

              {paso === 3 && (
                <div className="space-y-6">
                  {sectionTitle(<Building2 className="h-5 w-5" />, "Servicios que necesitas")}

                  <div className="rounded-xl border border-[#E4E8EE] p-4">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        checked={f.vueloNecesario}
                        className="h-4 w-4 accent-[#0B2545]"
                        onChange={(e) => actualizar("vueloNecesario", e.target.checked)}
                        type="checkbox"
                      />
                      <span className="font-semibold text-[#0B2545]">Vuelos</span>
                    </label>
                    {f.vueloNecesario && (
                      <div className="mt-3 pl-7">
                        <label className={labelClase()}>Clase preferida</label>
                        <select
                          className={`${inputClase()} max-w-xs`}
                          onChange={(e) => actualizar("clasePreferida", e.target.value)}
                          value={f.clasePreferida}
                        >
                          {CLASES.map((c) => (
                            <option key={c.valor} value={c.valor}>{c.texto}</option>
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
                      <span className="font-semibold text-[#0B2545]">Hotel</span>
                    </label>
                    {f.hotelNecesario && (
                      <div className="mt-3 pl-7">
                        <label className={labelClase()}>Categoría preferida</label>
                        <select
                          className={`${inputClase()} max-w-xs`}
                          onChange={(e) => actualizar("categoriaHotel", e.target.value)}
                          value={f.categoriaHotel}
                        >
                          {CATEGORIAS.map((c) => (
                            <option key={c.valor} value={c.valor}>{c.texto}</option>
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
                      <span className="font-semibold text-[#0B2545]">Traslados / Renta de auto</span>
                    </label>
                    {f.cocheNecesario && (
                      <div className="mt-3 space-y-3 pl-7">
                        <div>
                          <label className={labelClase()}>Tipo de vehículo</label>
                          <select
                            className={`${inputClase()} max-w-xs`}
                            onChange={(e) => actualizar("tipoCoche", e.target.value)}
                            value={f.tipoCoche}
                          >
                            {COCHES.map((c) => (
                              <option key={c.valor} value={c.valor}>{c.texto}</option>
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
                          Incluir traslado aeropuerto
                        </label>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelClase()}>Notas adicionales</label>
                    <textarea
                      className={`${inputClase()} min-h-[5rem]`}
                      onChange={(e) => actualizar("notas", e.target.value)}
                      placeholder="Politicas de viaje, aerolínea preferida, requerimientos especiales..."
                      value={f.notas}
                    />
                  </div>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                {paso > 1 ? (
                  <button
                    className="rounded-lg border border-[#E4E8EE] px-5 py-2.5 text-sm font-medium text-[#5A6B80]"
                    onClick={() => setPaso((p) => p - 1)}
                    type="button"
                  >
                    Atrás
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
                    Continuar <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2545] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={guardando}
                    onClick={guardar}
                    type="button"
                  >
                    {guardando ? "Guardando..." : "Guardar cotización"}
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
