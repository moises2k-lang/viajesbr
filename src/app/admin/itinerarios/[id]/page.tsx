import Link from "next/link";
import { notFound } from "next/navigation";
import BotonBorrarBloque from "@/components/BotonBorrarBloque";
import FormularioBloque from "@/components/FormularioBloque";
import SelectorEstado from "@/components/SelectorEstado";
import { itinerarioParaDocumento } from "@/lib/documentos";
import { formatoFecha, formatoMoneda } from "@/lib/marca";

export const dynamic = "force-dynamic";

export default async function DetalleItinerario({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const datos = await itinerarioParaDocumento(id);
  if (!datos) {
    notFound();
  }

  const { itinerario, bloques } = datos;
  const total = bloques.reduce((suma, b) => suma + Number(b.precio_venta ?? 0), 0);
  const neto = bloques.reduce((suma, b) => suma + Number(b.costo_neto ?? 0), 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{itinerario.titulo}</h1>
          <p className="text-sm text-neutral-600">
            {itinerario.cliente} · creado el {formatoFecha(itinerario.creado_en)}
          </p>
        </div>
        <nav className="flex gap-4 text-sm underline">
          <a href={`/api/documentos/itinerario/${itinerario.id}`} rel="noreferrer" target="_blank">
            PDF para el cliente
          </a>
          <a
            href={`/api/documentos/itinerario/${itinerario.id}?interno=1`}
            rel="noreferrer"
            target="_blank"
          >
            PDF interno
          </a>
          <Link href="/admin/itinerarios">Volver</Link>
        </nav>
      </header>

      <div className="mb-6 flex items-center gap-6">
        <SelectorEstado estado={itinerario.estado} itinerarioId={itinerario.id} />
        <p className="text-sm text-neutral-600">
          Venta {formatoMoneda(total, itinerario.moneda)} · neto{" "}
          {formatoMoneda(neto, itinerario.moneda)} · margen{" "}
          {formatoMoneda(total - neto, itinerario.moneda)}
        </p>
      </div>

      {itinerario.resumen ? (
        <p className="mb-6 whitespace-pre-line text-sm text-neutral-700">{itinerario.resumen}</p>
      ) : null}

      {bloques.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin bloques todavía.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left">
              <th className="py-2">#</th>
              <th className="py-2">Fecha</th>
              <th className="py-2">Tipo</th>
              <th className="py-2">Concepto</th>
              <th className="py-2">Proveedor</th>
              <th className="py-2 text-right">Neto</th>
              <th className="py-2 text-right">Venta</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {bloques.map((bloque) => (
              <tr className="border-b border-neutral-200 align-top" key={bloque.id}>
                <td className="py-2">{bloque.posicion}</td>
                <td className="py-2">
                  {bloque.fecha ? formatoFecha(bloque.fecha) : "—"}
                  {bloque.fecha_fin ? ` → ${formatoFecha(bloque.fecha_fin)}` : ""}
                </td>
                <td className="py-2">{bloque.tipo}</td>
                <td className="py-2">
                  {bloque.titulo}
                  {bloque.detalle ? (
                    <span className="block whitespace-pre-line text-xs text-neutral-500">
                      {bloque.detalle}
                    </span>
                  ) : null}
                </td>
                <td className="py-2">{bloque.proveedor ?? "—"}</td>
                <td className="py-2 text-right">
                  {bloque.costo_neto == null
                    ? "—"
                    : formatoMoneda(Number(bloque.costo_neto), itinerario.moneda)}
                </td>
                <td className="py-2 text-right">
                  {bloque.precio_venta == null
                    ? "—"
                    : formatoMoneda(Number(bloque.precio_venta), itinerario.moneda)}
                </td>
                <td className="py-2 text-right">
                  <BotonBorrarBloque bloqueId={bloque.id} itinerarioId={itinerario.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <FormularioBloque itinerarioId={itinerario.id} />
    </main>
  );
}
