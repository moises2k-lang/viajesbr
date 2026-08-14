import Link from "next/link";
import { dinero } from "@/lib/dinero";
import { reglasActivas } from "@/lib/markup";
import FormularioRegla from "@/components/FormularioRegla";
import BotonDesactivar from "@/components/BotonDesactivar";

export const dynamic = "force-dynamic";

export default async function AdminMarkup() {
  const reglas = await reglasActivas();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Reglas de markup</h1>
        <Link className="text-sm underline" href="/">
          Volver al buscador
        </Link>
      </header>

      <p className="mb-6 text-sm text-neutral-600">
        Se aplica la primera regla activa que coincida, ordenada por prioridad
        (menor primero). El markup es porcentaje + monto fijo, con un mínimo
        garantizado.
      </p>

      {reglas.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No hay reglas activas: se vende a costo neto.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left">
              <th className="py-2">Prioridad</th>
              <th className="py-2">Nombre</th>
              <th className="py-2">Aerolínea</th>
              <th className="py-2">Ruta</th>
              <th className="py-2">Moneda</th>
              <th className="py-2 text-right">%</th>
              <th className="py-2 text-right">Fijo</th>
              <th className="py-2 text-right">Mínimo</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {reglas.map((regla) => (
              <tr className="border-b border-neutral-200" key={regla.id}>
                <td className="py-2">{regla.prioridad}</td>
                <td className="py-2">{regla.nombre}</td>
                <td className="py-2">{regla.aerolinea_iata ?? "todas"}</td>
                <td className="py-2">
                  {regla.origen ?? "*"} → {regla.destino ?? "*"}
                </td>
                <td className="py-2">{regla.moneda ?? "todas"}</td>
                <td className="py-2 text-right">
                  {Number(regla.porcentaje).toFixed(2)}%
                </td>
                <td className="py-2 text-right">
                  {dinero(Number(regla.monto_fijo))}
                </td>
                <td className="py-2 text-right">
                  {dinero(Number(regla.monto_minimo))}
                </td>
                <td className="py-2 text-right">
                  <BotonDesactivar id={regla.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <FormularioRegla />
    </main>
  );
}
