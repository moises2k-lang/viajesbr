"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { OfertaConPrecio } from "@/app/api/buscar/route";
import type { HotelConPrecio } from "@/app/api/hoteles/route";
import Buscador, { type ParametrosFormulario } from "@/components/Buscador";
import BuscadorHoteles, {
  type ParametrosHotel,
} from "@/components/BuscadorHoteles";
import ListaHoteles from "@/components/ListaHoteles";
import HistorialBusquedas from "@/components/HistorialBusquedas";
import ListaOfertas from "@/components/ListaOfertas";
import FormularioReserva, {
  type ResultadoReserva,
} from "@/components/FormularioReserva";
import {
  borrarHistorial,
  guardarBusqueda,
  historialDelNavegador,
  historialDelServidor,
  suscribirHistorial,
} from "@/lib/historial";

type Estado =
  | { fase: "inicio" }
  | { fase: "buscando" }
  | { fase: "resultados"; ofertas: OfertaConPrecio[]; total: number }
  | { fase: "reservando"; oferta: OfertaConPrecio }
  | { fase: "confirmada"; resultado: ResultadoReserva };

type EstadoHoteles =
  | { fase: "inicio" }
  | { fase: "buscando" }
  | {
      fase: "resultados";
      hoteles: HotelConPrecio[];
      total: number;
      ambiente: string;
    };

export default function Portada({ modoInterno }: { modoInterno: boolean }) {
  const [pestana, setPestana] = useState<"vuelos" | "hoteles">("vuelos");
  const [estado, setEstado] = useState<Estado>({ fase: "inicio" });
  const [estadoHoteles, setEstadoHoteles] = useState<EstadoHoteles>({
    fase: "inicio",
  });
  const [ultimoHotel, setUltimoHotel] = useState<ParametrosHotel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ultimaBusqueda, setUltimaBusqueda] =
    useState<ParametrosFormulario | null>(null);
  // Cada búsqueda aplicada remonta el formulario, incluso si repite los mismos datos.
  const [aplicaciones, setAplicaciones] = useState(0);
  const historial = useSyncExternalStore(
    suscribirHistorial,
    historialDelNavegador,
    historialDelServidor,
  );

  async function buscar(parametros: ParametrosFormulario) {
    setError(null);
    setUltimaBusqueda(parametros);
    setAplicaciones((n) => n + 1);
    guardarBusqueda(parametros);
    setEstado({ fase: "buscando" });
    try {
      const respuesta = await fetch("/api/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parametros),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo.error ?? "No se pudo completar la búsqueda");
        setEstado({ fase: "inicio" });
        return;
      }
      setEstado({
        fase: "resultados",
        ofertas: cuerpo.ofertas,
        total: cuerpo.total,
      });
    } catch (e) {
      setError((e as Error).message);
      setEstado({ fase: "inicio" });
    }
  }

  async function buscarHotel(parametros: ParametrosHotel) {
    setError(null);
    setUltimoHotel(parametros);
    setEstadoHoteles({ fase: "buscando" });
    try {
      const respuesta = await fetch("/api/hoteles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parametros),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo.error ?? "No se pudo buscar hoteles");
        setEstadoHoteles({ fase: "inicio" });
        return;
      }
      setEstadoHoteles({
        fase: "resultados",
        hoteles: cuerpo.hoteles,
        total: cuerpo.total,
        ambiente: cuerpo.ambiente,
      });
    } catch (e) {
      setError((e as Error).message);
      setEstadoHoteles({ fase: "inicio" });
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#F5F7FA]">
      <header className="bg-[#0B2545]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="IA Travel Planning" className="h-9" src="/logo.svg" />
          <nav className="flex items-center gap-4 text-sm text-white/80">
            <Link
              className="hover:text-white"
              href="/admin/itinerarios"
              prefetch={false}
            >
              Itinerarios
            </Link>
            <Link
              className="hover:text-white"
              href="/admin/markup"
              prefetch={false}
            >
              Markup
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-[#0B2545] pb-16 pt-2 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">
              {pestana === "vuelos"
                ? "Vuelos con tarifas en tiempo real"
                : "Hoteles con tarifas en tiempo real"}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {pestana === "vuelos"
                ? "Más de 300 aerolíneas · precio final con impuestos · sin cargos escondidos"
                : "Inventario de liteAPI · precio por estancia completa · políticas de cancelación reales"}
            </p>
            <div className="mt-4 flex gap-2">
              {(["vuelos", "hoteles"] as const).map((opcion) => (
                <button
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                    pestana === opcion
                      ? "bg-white text-[#0B2545]"
                      : "bg-white/15 text-white"
                  }`}
                  key={opcion}
                  onClick={() => {
                    setError(null);
                    setPestana(opcion);
                  }}
                  type="button"
                >
                  {opcion === "vuelos" ? "Vuelos" : "Hoteles"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto -mt-10 w-full max-w-7xl flex-1 px-4 pb-16 sm:px-6">
        {pestana === "hoteles" && (
          <>
            <div className="relative z-10">
              <BuscadorHoteles
                cargando={estadoHoteles.fase === "buscando"}
                valoresIniciales={ultimoHotel}
                onBuscar={buscarHotel}
              />
            </div>

            {error && (
              <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {estadoHoteles.fase === "buscando" && (
              <div className="mt-6 flex flex-col gap-3">
                <p className="text-sm text-[#5A6B80]">
                  Consultando hoteles en vivo…
                </p>
                {[0, 1, 2].map((n) => (
                  <div
                    className="h-32 animate-pulse rounded-xl border border-[#E4E8EE] bg-white"
                    key={n}
                  />
                ))}
              </div>
            )}

            {estadoHoteles.fase === "resultados" && (
              <div className="mt-6">
                <p className="mb-3 text-sm text-[#5A6B80]">
                  {estadoHoteles.total} hotel
                  {estadoHoteles.total === 1 ? "" : "es"} con disponibilidad
                  {ultimoHotel ? ` en ${ultimoHotel.destino}` : ""}
                  {estadoHoteles.ambiente === "sandbox"
                    ? " · inventario de prueba (sandbox): no reserva hoteles reales"
                    : ""}
                </p>
                <ListaHoteles
                  hoteles={estadoHoteles.hoteles}
                  mostrarMargen={modoInterno}
                />
              </div>
            )}
          </>
        )}

        <div className={pestana === "vuelos" ? "relative z-10" : "hidden"}>
          <Buscador
            cargando={estado.fase === "buscando"}
            key={`formulario-${aplicaciones}`}
            valoresIniciales={ultimaBusqueda}
            onBuscar={buscar}
          />
        </div>

        {pestana === "vuelos" &&
          (estado.fase === "inicio" || estado.fase === "resultados") && (
            <HistorialBusquedas
              historial={historial}
              onBorrar={borrarHistorial}
              onRepetir={buscar}
            />
          )}

        {pestana === "vuelos" && error && (
          <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {pestana === "vuelos" && estado.fase === "buscando" && (
          <div className="mt-6 flex flex-col gap-3">
            <p className="text-sm text-[#5A6B80]">
              Consultando aerolíneas en vivo… puede tardar hasta 30 segundos.
            </p>
            {[0, 1, 2, 3].map((n) => (
              <div
                className="h-28 animate-pulse rounded-xl border border-[#E4E8EE] bg-white"
                key={n}
              />
            ))}
          </div>
        )}

        {pestana === "vuelos" && estado.fase === "resultados" && (
          <ListaOfertas
            mostrarMargen={modoInterno}
            ofertas={estado.ofertas}
            total={estado.total}
            onElegir={(oferta) => setEstado({ fase: "reservando", oferta })}
          />
        )}

        {pestana === "vuelos" && estado.fase === "reservando" && (
          <FormularioReserva
            mostrarMargen={modoInterno}
            oferta={estado.oferta}
            onCancelar={() => ultimaBusqueda && buscar(ultimaBusqueda)}
            onReservada={(resultado) =>
              setEstado({ fase: "confirmada", resultado })
            }
          />
        )}

        {pestana === "vuelos" && estado.fase === "confirmada" && (
          <section className="mt-8 rounded-xl border border-green-300 bg-green-50 p-6">
            <h2 className="text-lg font-semibold text-green-900">
              Reserva confirmada
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-[#5A6B80]">Clave de reserva (PNR)</dt>
              <dd className="font-mono font-semibold">
                {estado.resultado.pnr}
              </dd>
              <dt className="text-[#5A6B80]">Ambiente</dt>
              <dd>{estado.resultado.ambiente}</dd>
              <dt className="text-[#5A6B80]">Costo neto</dt>
              <dd>
                {estado.resultado.costoNeto.toFixed(2)}{" "}
                {estado.resultado.moneda}
              </dd>
              <dt className="text-[#5A6B80]">Markup</dt>
              <dd>
                {estado.resultado.markup.toFixed(2)} {estado.resultado.moneda}
              </dd>
              <dt className="text-[#5A6B80]">Precio de venta</dt>
              <dd className="font-semibold">
                {estado.resultado.precioVenta.toFixed(2)}{" "}
                {estado.resultado.moneda}
              </dd>
            </dl>
            <button
              className="mt-6 rounded-lg bg-[#0B2545] px-4 py-2 text-sm text-white"
              onClick={() => setEstado({ fase: "inicio" })}
              type="button"
            >
              Nueva búsqueda
            </button>
          </section>
        )}
      </main>

      <footer className="mt-auto bg-[#0B2545] text-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>IA Travel Planning · Moises Mejlachowicz</p>
          <p>
            Tarifas y disponibilidad en tiempo real · los precios cambian sin
            aviso
          </p>
        </div>
      </footer>
    </div>
  );
}
