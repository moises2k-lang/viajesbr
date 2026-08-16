"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  ChevronLeft,
  MapPin,
  Plane,
  Search,
  Tag,
  Users,
} from "lucide-react";
import CampoAeropuerto from "@/components/CampoAeropuerto";
import TarjetaOferta from "@/components/TarjetaOferta";
import ListaHoteles from "@/components/ListaHoteles";
import FormularioReserva from "@/components/FormularioReserva";
import ResumenVuelo from "@/components/ResumenVuelo";
import SelectorMoneda from "@/components/SelectorMoneda";
import Precio from "@/components/Precio";
import { useMoneda } from "@/components/MonedaContext";
import { useI18n } from "@/lib/i18n";
import type { OfertaConPrecio } from "@/app/api/buscar/route";
import type { HotelConPrecio, HabitacionConPrecio } from "@/app/api/hoteles/route";
import type { PaqueteTematico } from "@/lib/experiencias";

interface Props {
  paquete: PaqueteTematico;
}

interface FiltroBusqueda {
  origenCodigo: string;
  origenDescripcion: string | null;
  fechaSalida: string;
  fechaRegreso: string;
  adultos: number;
  bebes: number;
  menores: number[];
  cabina: string;
}

type Paso = "configurar" | "vuelos" | "hoteles" | "resumen" | "guardado";

function hoyIso(dias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function totalNoches(entrada: string, salida: string): number {
  const ms = new Date(salida).getTime() - new Date(entrada).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export default function ExperienciaWizard({ paquete }: Props) {
  const { t } = useI18n();
  const { moneda, setMoneda } = useMoneda();
  const [paso, setPaso] = useState<Paso>("configurar");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoy = useMemo(() => hoyIso(), []);
  const defRegreso = hoyIso((paquete.duracionNoches ?? 4) + 30);

  const [filtro, setFiltro] = useState<FiltroBusqueda>({
    origenCodigo: paquete.origenIata ?? "MEX",
    origenDescripcion: null,
    fechaSalida: hoy,
    fechaRegreso: defRegreso,
    adultos: Math.max(1, paquete.adultos),
    bebes: paquete.bebes,
    menores: paquete.menores.slice(),
    cabina: paquete.cabina ?? "economy",
  });

  const [vuelos, setVuelos] = useState<OfertaConPrecio[] | null>(null);
  const [vuelo, setVuelo] = useState<OfertaConPrecio | null>(null);
  const [hoteles, setHoteles] = useState<HotelConPrecio[] | null>(null);
  const [hotel, setHotel] = useState<HotelConPrecio | null>(null);
  const [habitacion, setHabitacion] = useState<HabitacionConPrecio | null>(null);
  const [itinerarioGuardado, setItinerarioGuardado] = useState<string | null>(null);

  const totalPaquete =
    vuelo && hotel && habitacion
      ? vuelo.precioVenta + habitacion.precioVenta
      : null;

  useEffect(() => {
    if (vuelo) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [vuelo]);

  useEffect(() => {
    if (hotel && habitacion) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [hotel, habitacion]);

  async function buscar() {
    setError(null);
    setVuelos(null);
    setVuelo(null);
    setHoteles(null);
    setHotel(null);
    setHabitacion(null);

    if (!filtro.origenCodigo || filtro.origenCodigo.length !== 3) {
      setError("Elige un origen válido");
      return;
    }
    if (!filtro.fechaSalida || !filtro.fechaRegreso) {
      setError("Elige fechas de salida y regreso");
      return;
    }
    if (filtro.fechaRegreso <= filtro.fechaSalida) {
      setError("La fecha de regreso debe ser después de la salida");
      return;
    }

    setBuscando(true);
    try {
      const [vueloResp, lugarResp] = await Promise.all([
        fetch("/api/buscar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origen: filtro.origenCodigo,
            destino: paquete.destinoIata,
            fechaSalida: filtro.fechaSalida,
            fechaRegreso: filtro.fechaRegreso,
            adultos: filtro.adultos,
            menores: filtro.menores,
            bebes: filtro.bebes,
            cabina: filtro.cabina,
          }),
        }),
        fetch(`/api/ciudades?q=${encodeURIComponent(paquete.destinoCiudad)}`),
      ]);

      const vueloCuerpo = (await vueloResp.json()) as {
        ofertas?: OfertaConPrecio[];
        error?: string;
      };
      if (!vueloResp.ok) throw new Error(vueloCuerpo.error ?? "No se pudieron buscar vuelos");
      const ofertas = vueloCuerpo.ofertas ?? [];
      setVuelos(ofertas);

      const lugarCuerpo = (await lugarResp.json()) as {
        opciones?: { placeId: string; nombre: string; pais: string | null }[];
        error?: string;
      };
      if (!lugarResp.ok) throw new Error(lugarCuerpo.error ?? "No se pudo resolver el destino");

      const opcionLugar = (lugarCuerpo.opciones ?? []).find(
        (o) => (o.pais ?? "").toUpperCase() === (paquete.destinoPaisCode ?? "").toUpperCase(),
      ) ?? lugarCuerpo.opciones?.[0];

      if (!opcionLugar) {
        setBuscando(false);
        setPaso("vuelos");
        return;
      }

      const hotelResp = await fetch("/api/hoteles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: opcionLugar.placeId,
          destino: paquete.destinoCiudad,
          pais: paquete.destinoPaisCode,
          entrada: filtro.fechaSalida,
          salida: filtro.fechaRegreso,
          adultos: filtro.adultos,
          menores: filtro.menores,
          moneda: "USD",
          nacionalidad: "MX",
        }),
      });
      const hotelCuerpo = (await hotelResp.json()) as {
        hoteles?: HotelConPrecio[];
        error?: string;
      };
      if (!hotelResp.ok) throw new Error(hotelCuerpo.error ?? "No se pudieron buscar hoteles");
      const hotelesList = (hotelCuerpo.hoteles ?? []).filter(
        (h) =>
          !paquete.hotelEstrellasMin ||
          (h.estrellas ?? 0) >= paquete.hotelEstrellasMin,
      );
      setHoteles(hotelesList);
      setPaso("vuelos");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBuscando(false);
    }
  }

  function elegirVuelo(oferta: OfertaConPrecio) {
    setVuelo(oferta);
    setPaso("hoteles");
  }

  function elegirHotel(h: HotelConPrecio, hab: HabitacionConPrecio) {
    setHotel(h);
    setHabitacion(hab);
    setPaso("resumen");
  }

  async function guardarCotizacion(datos: {
    pasajeros: { titulo: string; nombre: string; apellido: string; fechaNacimiento: string; genero: string }[];
    email: string;
    telefono: string;
    captchaId: string;
    captchaRespuesta: string;
  }): Promise<string> {
    if (!vuelo) throw new Error("No hay vuelo seleccionado");
    const tramoIda = vuelo.tramos[0];
    const tramoVuelta = vuelo.tramos[vuelo.tramos.length - 1];
    const pasajeroPrincipal = datos.pasajeros[0] ?? { nombre: "", apellido: "" };
    const nombresPasajeros = datos.pasajeros
      .map((p) => `${p.nombre} ${p.apellido}`.trim())
      .filter(Boolean)
      .join(" · ");

    const bloques: unknown[] = [
      {
        posicion: 0,
        tipo: "vuelo",
        titulo: `Vuelo ${vuelo.aerolinea} ${tramoIda.origen} → ${tramoVuelta.destino}`,
        fecha: tramoIda.segmentos[0].sale.slice(0, 10),
        fecha_fin: tramoVuelta.segmentos[tramoVuelta.segmentos.length - 1].llega.slice(0, 10),
        detalle: `${tramoIda.origen} → ${tramoVuelta.destino} · ${vuelo.tramos.length === 2 ? "ida y vuelta" : vuelo.tramos.length + " tramos"}`,
        proveedor: vuelo.aerolinea,
        costo_neto: vuelo.costoNeto,
        precio_venta: vuelo.precioVenta,
        datos: { oferta: vuelo, pasajeros: datos.pasajeros },
      },
    ];

    if (hotel && habitacion) {
      bloques.push({
        posicion: 1,
        tipo: "hotel",
        titulo: `Hotel ${hotel.nombre}`,
        fecha: filtro.fechaSalida,
        fecha_fin: filtro.fechaRegreso,
        detalle: `${habitacion.habitacion} · ${hotel.noches} noches`,
        proveedor: "liteAPI",
        costo_neto: habitacion.costoNeto,
        precio_venta: habitacion.precioVenta,
        datos: { hotel, habitacion },
      });
    }

    const respuesta = await fetch("/api/itinerarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: `${paquete.titulo} — ${tramoIda.origen} → ${tramoVuelta.destino}`,
        cliente: `${pasajeroPrincipal.nombre} ${pasajeroPrincipal.apellido}`.trim() || datos.email,
        resumen: `${nombresPasajeros || datos.email} · ${datos.telefono}`,
        moneda: vuelo.moneda,
        estado: "cotizacion",
        bloques,
        captchaId: datos.captchaId,
        captchaRespuesta: datos.captchaRespuesta,
      }),
    });
    const cuerpo = (await respuesta.json()) as { id?: string; error?: string };
    if (!respuesta.ok || !cuerpo.id) {
      throw new Error(cuerpo.error ?? "No se pudo guardar la cotización");
    }
    setItinerarioGuardado(cuerpo.id);
    setPaso("guardado");
    return cuerpo.id;
  }

  function cambiarMenores(cantidad: number) {
    setFiltro((prev) => {
      const actuales = prev.menores.slice(0, cantidad);
      while (actuales.length < cantidad) actuales.push(10);
      return { ...prev, menores: actuales };
    });
  }

  const cabinaLabel = useMemo(() => {
    switch (filtro.cabina) {
      case "business":
        return t("common.business");
      case "premium_economy":
        return "Premium economy";
      case "first":
        return t("common.first");
      default:
        return t("common.economy");
    }
  }, [filtro.cabina, t]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <Link
          className="inline-flex items-center gap-1 text-sm text-[#14477E] hover:underline"
          href="/experiencias"
        >
          <ChevronLeft className="h-4 w-4" /> {t("common.back")}
        </Link>
        <SelectorMoneda
          className="w-28"
          etiqueta=""
          placeholder=""
          valor={moneda}
          onCambio={(nuevo) => setMoneda(nuevo ?? "USD")}
        />
      </div>

      {paquete.imagen && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={paquete.destinoCiudad}
          className="mb-6 h-64 w-full rounded-2xl object-cover shadow-sm"
          src={paquete.imagen}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-[#E4E8EE] bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#0B2545] to-[#14477E] p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide">
                <Tag className="h-3 w-3" /> {paquete.categoria}
              </div>
              <h1 className="text-2xl font-semibold sm:text-3xl">{paquete.titulo}</h1>
              {paquete.subtitulo && (
                <p className="mt-1 text-white/80">{paquete.subtitulo}</p>
              )}
            </div>
            {paquete.destinoPaisCode && (
              <img
                alt={paquete.destinoCiudad}
                className="h-10 w-auto rounded-md border border-white/20"
                src={`https://flagcdn.com/w80/${paquete.destinoPaisCode.toLowerCase()}.png`}
              />
            )}
          </div>
          {paquete.descripcion && (
            <p className="mt-4 max-w-2xl text-sm text-white/80">{paquete.descripcion}</p>
          )}
          {paquete.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {paquete.tags.map((tag) => (
                <span
                  className="rounded-full bg-white/10 px-2.5 py-1 text-xs"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8">
          {paso === "configurar" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-[#0B2545]">
                {t("experiences.configureTrip")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5A6B80]">
                    {t("common.origin")}
                  </label>
                  <CampoAeropuerto
                    etiqueta=""
                    valor={filtro.origenCodigo}
                    descripcion={filtro.origenDescripcion}
                    onCambio={(codigo, descripcion) =>
                      setFiltro((prev) => ({
                        ...prev,
                        origenCodigo: codigo,
                        origenDescripcion: descripcion,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5A6B80]">
                    {t("common.destination")}
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-[#E4E8EE] bg-[#F5F7FA] px-3 py-2.5 text-[#0B2545]">
                    <MapPin className="h-4 w-4 text-[#5A6B80]" />
                    {paquete.destinoCiudad} ({paquete.destinoIata})
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5A6B80]">
                    {t("common.departure")}
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-[#E4E8EE] px-3 py-2">
                    <Calendar className="h-4 w-4 text-[#5A6B80]" />
                    <input
                      className="w-full bg-transparent text-sm text-[#0B2545] outline-none"
                      onChange={(e) =>
                        setFiltro((prev) => ({
                          ...prev,
                          fechaSalida: e.target.value,
                        }))
                      }
                      type="date"
                      value={filtro.fechaSalida}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5A6B80]">
                    {t("common.return")}
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-[#E4E8EE] px-3 py-2">
                    <Calendar className="h-4 w-4 text-[#5A6B80]" />
                    <input
                      className="w-full bg-transparent text-sm text-[#0B2545] outline-none"
                      onChange={(e) =>
                        setFiltro((prev) => ({
                          ...prev,
                          fechaRegreso: e.target.value,
                        }))
                      }
                      type="date"
                      value={filtro.fechaRegreso}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5A6B80]">
                    {t("common.adults")}
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-[#E4E8EE] px-3 py-2">
                    <Users className="h-4 w-4 text-[#5A6B80]" />
                    <input
                      className="w-full bg-transparent text-sm text-[#0B2545] outline-none"
                      max={9}
                      min={1}
                      onChange={(e) =>
                        setFiltro((prev) => ({
                          ...prev,
                          adultos: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                      type="number"
                      value={filtro.adultos}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5A6B80]">
                    {t("common.children")}
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-[#E4E8EE] px-3 py-2">
                    <Users className="h-4 w-4 text-[#5A6B80]" />
                    <input
                      className="w-full bg-transparent text-sm text-[#0B2545] outline-none"
                      max={8}
                      min={0}
                      onChange={(e) => cambiarMenores(Number(e.target.value) || 0)}
                      type="number"
                      value={filtro.menores.length}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5A6B80]">
                    {t("common.infants")}
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-[#E4E8EE] px-3 py-2">
                    <Users className="h-4 w-4 text-[#5A6B80]" />
                    <input
                      className="w-full bg-transparent text-sm text-[#0B2545] outline-none"
                      max={4}
                      min={0}
                      onChange={(e) =>
                        setFiltro((prev) => ({
                          ...prev,
                          bebes: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      type="number"
                      value={filtro.bebes}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5A6B80]">
                    {t("common.cabin")}
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#E4E8EE] px-3 py-2.5 text-sm text-[#0B2545] outline-none"
                    onChange={(e) =>
                      setFiltro((prev) => ({ ...prev, cabina: e.target.value }))
                    }
                    value={filtro.cabina}
                  >
                    <option value="economy">{t("common.economy")}</option>
                    <option value="premium_economy">Premium economy</option>
                    <option value="business">{t("common.business")}</option>
                    <option value="first">{t("common.first")}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-[#E4E8EE] bg-[#F5F7FA] p-4 text-sm text-[#5A6B80]">
                <Plane className="h-5 w-5 text-[#14477E]" />
                {t("experiences.chooseDates")}: {cabinaLabel} ·{" "}
                {totalNoches(filtro.fechaSalida, filtro.fechaRegreso)} {t("experiences.nights")}
              </div>

              {error && (
                <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                className="inline-flex items-center gap-2 rounded-xl bg-[#C9A227] px-6 py-3 font-medium text-white shadow-sm hover:bg-[#b08f22] disabled:opacity-60"
                disabled={buscando}
                onClick={buscar}
                type="button"
              >
                {buscando ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" /> {t("experiences.searchFlightsAndHotels")}
                  </>
                )}
              </button>
            </div>
          )}

          {paso === "vuelos" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-[#0B2545]">
                {t("experiences.flightResults")}: {paquete.destinoCiudad}
              </h2>
              {vuelos && vuelos.length > 0 ? (
                <ul className="space-y-4">
                  {vuelos.slice(0, 12).map((oferta) => (
                    <TarjetaOferta
                      key={oferta.ofertaId}
                      mostrarMargen={false}
                      oferta={oferta}
                      onElegir={elegirVuelo}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-[#5A6B80]">{t("experiences.noFlights")}</p>
              )}
            </div>
          )}

          {paso === "hoteles" && vuelo && (
            <div className="space-y-6">
              <button
                className="inline-flex items-center gap-1 text-sm text-[#14477E] hover:underline"
                onClick={() => setPaso("vuelos")}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" /> {t("common.back")}
              </button>
              <div className="rounded-xl border border-[#C9A227] bg-[#FFF8E1] p-4">
                <ResumenVuelo mostrarMargen={false} oferta={vuelo} />
              </div>
              <h2 className="text-lg font-semibold text-[#0B2545]">
                {t("experiences.hotelResults")}: {paquete.destinoCiudad}
              </h2>
              {hoteles && hoteles.length > 0 ? (
                <ListaHoteles
                  hoteles={hoteles}
                  mostrarMargen={false}
                  oferta={vuelo}
                  onElegir={elegirHotel}
                />
              ) : (
                <p className="text-[#5A6B80]">{t("experiences.noHotels")}</p>
              )}
            </div>
          )}

          {paso === "resumen" && vuelo && (
            <div className="space-y-6">
              <button
                className="inline-flex items-center gap-1 text-sm text-[#14477E] hover:underline"
                onClick={() => {
                  setHotel(null);
                  setHabitacion(null);
                  setPaso("hoteles");
                }}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" /> {t("common.back")}
              </button>

              {totalPaquete !== null && (
                <div className="rounded-xl border border-[#C9A227] bg-[#FFF8E1] p-6">
                  <h3 className="text-base font-semibold text-[#0B2545]">
                    {t("experiences.packageSummary")}
                  </h3>
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-1 text-sm text-[#5A6B80]">
                      <p className="flex items-center gap-2">
                        <Plane className="h-4 w-4" /> {t("flights.flight")}:{" "}
                        <Precio monto={vuelo.precioVenta} moneda={vuelo.moneda} />
                      </p>
                      {hotel && habitacion && (
                        <p className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" /> {t("hotels.hotel")}:{" "}
                          <Precio monto={habitacion.precioVenta} moneda={hotel.moneda} />
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#5A6B80]">{t("packages.packageTotal")}</p>
                      <p className="text-3xl font-bold text-[#0B2545]">
                        <Precio monto={totalPaquete} moneda={vuelo.moneda} />
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <FormularioReserva
                hotel={hotel ?? undefined}
                habitacion={habitacion ?? undefined}
                mostrarMargen={false}
                oferta={vuelo}
                onCancelar={() => setPaso("hoteles")}
                onGuardar={guardarCotizacion}
                onReservada={() => {}}
              />
            </div>
          )}

          {paso === "guardado" && itinerarioGuardado && (
            <div className="space-y-6 text-center">
              <h2 className="text-2xl font-semibold text-[#0B2545]">
                {t("corporate.quoteSaved")}
              </h2>
              <p className="text-[#5A6B80]">{t("corporate.quoteSavedMessage")}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <a
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0B2545] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#14477E]"
                  href={`/api/itinerarios/${itinerarioGuardado}/pdf`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {t("corporate.downloadPdf")}
                </a>
                <Link
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E4E8EE] bg-white px-5 py-2.5 text-sm font-medium text-[#0B2545] hover:bg-[#F5F7FA]"
                  href="/experiencias"
                >
                  {t("common.back")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
