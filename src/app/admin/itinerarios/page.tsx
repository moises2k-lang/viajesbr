import Link from "next/link";
import FormularioItinerario from "@/components/FormularioItinerario";
import { query } from "@/lib/db";
import { formatoFecha, formatoMoneda } from "@/lib/marca";

export const dynamic = "force-dynamic";

interface Fila extends Record<string, unknown> {
  id: string;
  creado_en: string;
  titulo: string;
  cliente: string;
  moneda: string;
  estado: string;
  bloques: number;
  total: string;
}

export default async function AdminItinerarios() {
  const itinerarios = await query<Fila>(
    `SELECT i.id::text, i.creado_en, i.titulo, i.cliente, i.moneda, i.estado,
            count(b.id)::int AS bloques,
            coalesce(sum(b.precio_venta), 0)::text AS total
       FROM itinerarios i
       LEFT JOIN itinerario_bloques b ON b.itinerario_id = i.id
      GROUP BY i.id
      ORDER BY i.creado_en DESC`,
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Itinerarios</h1>
        <nav className="flex gap-4 text-sm underline">
          <Link href="/admin/markup">Markup</Link>
          <Link href="/">Buscador</Link>
        </nav>
      </header>

      {itinerarios.length === 0 ? (
        <p className="text-sm text-neutral-500">Todavía no hay itinerarios.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left">
              <th className="py-2">Creado</th>
              <th className="py-2">Título</th>
              <th className="py-2">Cliente</th>
              <th className="py-2">Estado</th>
              <th className="py-2 text-right">Bloques</th>
              <th className="py-2 text-right">Total</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {itinerarios.map((itinerario) => (
              <tr className="border-b border-neutral-200" key={itinerario.id}>
                <td className="py-2">{formatoFecha(itinerario.creado_en)}</td>
                <td className="py-2">
                  <Link className="underline" href={`/admin/itinerarios/${itinerario.id}`}>
                    {itinerario.titulo}
                  </Link>
                </td>
                <td className="py-2">{itinerario.cliente}</td>
                <td className="py-2">{itinerario.estado}</td>
                <td className="py-2 text-right">{itinerario.bloques}</td>
                <td className="py-2 text-right">
                  {formatoMoneda(Number(itinerario.total), itinerario.moneda)}
                </td>
                <td className="py-2 text-right">
                  <a
                    className="underline"
                    href={`/api/documentos/itinerario/${itinerario.id}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <FormularioItinerario />
    </main>
  );
}
