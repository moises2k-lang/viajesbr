"use client";

import type { OfertaConPrecio } from "@/app/api/buscar/route";

function hora(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function duracion(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
  if (!m) return iso;
  const horas = m[1] ? `${m[1]}h` : "";
  const minutos = m[2] ? `${m[2]}m` : "";
  return [horas, minutos].filter(Boolean).join(" ");
}

interface Props {
  ofertas: OfertaConPrecio[];
  total: number;
  onElegir: (oferta: OfertaConPrecio) => void;
}

export default function ListaOfertas({ ofertas, total, onElegir }: Props) {
  if (ofertas.length === 0) {
    return (
      <p className="mt-8 rounded-md border border-neutral-200 p-4 text-sm text-neutral-600">
        Ninguna aerolínea devolvió tarifas para esa combinación.
      </p>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm text-neutral-500">
        {total} opciones encontradas · mostrando {ofertas.length} de menor a mayor precio
      </h2>

      <ul className="flex flex-col gap-3">
        {ofertas.map((oferta) => (
          <li className="rounded-lg border border-neutral-200 p-4" key={oferta.ofertaId}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{oferta.aerolinea}</p>
                {oferta.tramos.map((tramo, indice) => (
                  <div className="mt-2 text-sm text-neutral-700" key={`${oferta.ofertaId}-${indice}`}>
                    <p className="font-medium">
                      {tramo.origen} → {tramo.destino}
                      {tramo.duracion ? ` · ${duracion(tramo.duracion)}` : ""}
                      {tramo.segmentos.length > 1 ? ` · ${tramo.segmentos.length - 1} escala(s)` : " · directo"}
                    </p>
                    {tramo.segmentos.map((segmento) => (
                      <p className="text-neutral-600" key={segmento.vuelo + segmento.sale}>
                        {segmento.vuelo} · {segmento.origen} {hora(segmento.sale)} → {segmento.destino}{" "}
                        {hora(segmento.llega)}
                        {segmento.cabina ? ` · ${segmento.cabina}` : ""}
                      </p>
                    ))}
                    <p className="text-neutral-500">
                      {tramo.marcaTarifa ? `Tarifa ${tramo.marcaTarifa} · ` : ""}
                      {tramo.equipaje.length > 0
                        ? tramo.equipaje
                            .map((e) => `${e.cantidad} ${e.tipo === "carry_on" ? "de mano" : "documentada"}`)
                            .join(" + ")
                        : "Equipaje no informado por la aerolínea"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="text-right">
                <p className="text-xl font-semibold">
                  {oferta.precioVenta.toFixed(2)} {oferta.moneda}
                </p>
                <p className="text-xs text-neutral-500">
                  neto {oferta.costoNeto.toFixed(2)} + markup {oferta.markup.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {oferta.cambiosPermitidos === null
                    ? "Cambios: no informado"
                    : oferta.cambiosPermitidos
                      ? "Permite cambios"
                      : "Sin cambios"}
                  {" · "}
                  {oferta.reembolsoPermitido === null
                    ? "Reembolso: no informado"
                    : oferta.reembolsoPermitido
                      ? "Reembolsable"
                      : "No reembolsable"}
                </p>
                <button
                  className="mt-3 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
                  onClick={() => onElegir(oferta)}
                  type="button"
                >
                  Reservar
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
