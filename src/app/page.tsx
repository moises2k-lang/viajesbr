"use client";

import Link from "next/link";
import { useState } from "react";
import type { OfertaConPrecio } from "@/app/api/buscar/route";
import Buscador, { type ParametrosFormulario } from "@/components/Buscador";
import ListaOfertas from "@/components/ListaOfertas";
import FormularioReserva, { type ResultadoReserva } from "@/components/FormularioReserva";

type Estado =
  | { fase: "inicio" }
  | { fase: "buscando" }
  | { fase: "resultados"; ofertas: OfertaConPrecio[]; total: number }
  | { fase: "reservando"; oferta: OfertaConPrecio }
  | { fase: "confirmada"; resultado: ResultadoReserva };

export default function Home() {
  const [estado, setEstado] = useState<Estado>({ fase: "inicio" });
  const [error, setError] = useState<string | null>(null);
  const [ultimaBusqueda, setUltimaBusqueda] = useState<ParametrosFormulario | null>(null);

  async function buscar(parametros: ParametrosFormulario) {
    setError(null);
    setUltimaBusqueda(parametros);
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
      setEstado({ fase: "resultados", ofertas: cuerpo.ofertas, total: cuerpo.total });
    } catch (e) {
      setError((e as Error).message);
      setEstado({ fase: "inicio" });
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <header className="bg-[#0B2545]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="IA Travel Planning" className="h-9" src="/logo.svg" />
          <nav className="flex items-center gap-4 text-sm text-white/80">
            <Link className="hover:text-white" href="/admin/itinerarios">
              Itinerarios
            </Link>
            <Link className="hover:text-white" href="/admin/markup">
              Markup
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16">
        <section className="-mb-6 bg-[#0B2545] pb-14 pt-2 text-white">
          <div className="px-1">
            <h1 className="text-2xl font-semibold sm:text-3xl">
              Vuelos con tarifas en tiempo real
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Más de 300 aerolíneas · precio final con impuestos · sin cargos escondidos
            </p>
          </div>
        </section>

        <div className="relative z-10">
          <Buscador
            cargando={estado.fase === "buscando"}
            valoresIniciales={ultimaBusqueda}
            onBuscar={buscar}
          />
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {estado.fase === "buscando" && (
          <div className="mt-6 flex flex-col gap-3">
            <p className="text-sm text-[#5A6B80]">
              Consultando aerolíneas en vivo… puede tardar hasta 30 segundos.
            </p>
            {[0, 1, 2, 3].map((n) => (
              <div className="h-28 animate-pulse rounded-xl border border-[#E4E8EE] bg-white" key={n} />
            ))}
          </div>
        )}

        {estado.fase === "resultados" && (
          <ListaOfertas
            ofertas={estado.ofertas}
            total={estado.total}
            onElegir={(oferta) => setEstado({ fase: "reservando", oferta })}
          />
        )}

        {estado.fase === "reservando" && (
          <FormularioReserva
            oferta={estado.oferta}
            onCancelar={() => ultimaBusqueda && buscar(ultimaBusqueda)}
            onReservada={(resultado) => setEstado({ fase: "confirmada", resultado })}
          />
        )}

        {estado.fase === "confirmada" && (
          <section className="mt-8 rounded-xl border border-green-300 bg-green-50 p-6">
            <h2 className="text-lg font-semibold text-green-900">Reserva confirmada</h2>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-[#5A6B80]">Clave de reserva (PNR)</dt>
              <dd className="font-mono font-semibold">{estado.resultado.pnr}</dd>
              <dt className="text-[#5A6B80]">Ambiente</dt>
              <dd>{estado.resultado.ambiente}</dd>
              <dt className="text-[#5A6B80]">Costo neto</dt>
              <dd>
                {estado.resultado.costoNeto.toFixed(2)} {estado.resultado.moneda}
              </dd>
              <dt className="text-[#5A6B80]">Markup</dt>
              <dd>
                {estado.resultado.markup.toFixed(2)} {estado.resultado.moneda}
              </dd>
              <dt className="text-[#5A6B80]">Precio de venta</dt>
              <dd className="font-semibold">
                {estado.resultado.precioVenta.toFixed(2)} {estado.resultado.moneda}
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
    </div>
  );
}
