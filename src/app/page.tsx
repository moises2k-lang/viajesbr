"use client";

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
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agencia de viajes</h1>
          <p className="text-sm text-neutral-500">
            Búsqueda y emisión de vuelos con markup propio
          </p>
        </div>
        <a className="text-sm underline" href="/admin/markup">
          Reglas de markup
        </a>
      </header>

      <Buscador
        cargando={estado.fase === "buscando"}
        valoresIniciales={ultimaBusqueda}
        onBuscar={buscar}
      />

      {error && (
        <p className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {estado.fase === "buscando" && (
        <p className="mt-8 text-sm text-neutral-500">Consultando aerolíneas…</p>
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
        <section className="mt-8 rounded-lg border border-green-300 bg-green-50 p-6">
          <h2 className="text-lg font-semibold text-green-900">Reserva confirmada</h2>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-neutral-600">Clave de reserva (PNR)</dt>
            <dd className="font-mono font-semibold">{estado.resultado.pnr}</dd>
            <dt className="text-neutral-600">Ambiente</dt>
            <dd>{estado.resultado.ambiente}</dd>
            <dt className="text-neutral-600">Costo neto</dt>
            <dd>
              {estado.resultado.costoNeto.toFixed(2)} {estado.resultado.moneda}
            </dd>
            <dt className="text-neutral-600">Markup</dt>
            <dd>
              {estado.resultado.markup.toFixed(2)} {estado.resultado.moneda}
            </dd>
            <dt className="text-neutral-600">Precio de venta</dt>
            <dd className="font-semibold">
              {estado.resultado.precioVenta.toFixed(2)} {estado.resultado.moneda}
            </dd>
          </dl>
          <button
            className="mt-6 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
            onClick={() => setEstado({ fase: "inicio" })}
            type="button"
          >
            Nueva búsqueda
          </button>
        </section>
      )}
    </main>
  );
}
