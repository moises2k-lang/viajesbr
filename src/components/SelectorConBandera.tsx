"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import BanderaIso from "@/components/BanderaIso";

export interface ItemSelectorConBandera {
  valor: string;
  iso: string;
  etiqueta: string;
}

interface Props {
  items: ItemSelectorConBandera[];
  valor: string | null;
  onCambio: (valor: string) => void;
  etiqueta?: string;
  placeholder?: string;
  renderEtiqueta?: (item: ItemSelectorConBandera) => React.ReactNode;
  renderOpcion?: (item: ItemSelectorConBandera) => React.ReactNode;
  className?: string;
  listaClassName?: string;
  itemClassName?: string;
  botonClassName?: string;
  buscable?: boolean;
  placeholderBusqueda?: string;
}

export default function SelectorConBandera({
  items,
  valor,
  onCambio,
  etiqueta,
  placeholder = "Seleccionar",
  renderEtiqueta,
  renderOpcion,
  className,
  listaClassName,
  itemClassName,
  botonClassName,
  buscable,
  placeholderBusqueda,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const contenedor = useRef<HTMLDivElement>(null);

  const seleccionado = useMemo(
    () => items.find((i) => i.valor === valor) ?? null,
    [items, valor],
  );

  const itemsFiltrados = useMemo(() => {
    if (!buscable || !busqueda.trim()) return items;
    const termino = busqueda.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.etiqueta.toLowerCase().includes(termino) ||
        i.valor.toLowerCase().includes(termino) ||
        i.iso.toLowerCase().includes(termino),
    );
  }, [items, buscable, busqueda]);

  useEffect(() => {
    function cerrar(evento: MouseEvent) {
      if (
        contenedor.current &&
        !contenedor.current.contains(evento.target as Node)
      ) {
        setAbierto(false);
      }
    }
    if (abierto) document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  function seleccionar(nuevo: string) {
    onCambio(nuevo);
    setAbierto(false);
    setBusqueda("");
  }

  return (
    <div className={`relative ${className ?? ""}`} ref={contenedor}>
      {etiqueta && (
        <label className="mb-1 block text-sm font-bold text-[#0B2545]">
          {etiqueta}
        </label>
      )}
      <button
        aria-expanded={abierto}
        className={`flex w-full items-center justify-between gap-2 rounded-md border border-[#14477E] bg-white px-3 py-2.5 text-left text-sm font-semibold text-[#0B2545] focus:border-[#0B2545] focus:outline-none ${botonClassName ?? ""}`}
        onClick={() => setAbierto((v) => !v)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {seleccionado ? (
            renderEtiqueta ? (
              renderEtiqueta(seleccionado)
            ) : (
              <>
                <BanderaIso iso={seleccionado.iso} />
                <span className="truncate">{seleccionado.etiqueta}</span>
              </>
            )
          ) : (
            <span className="text-neutral-400">{placeholder}</span>
          )}
        </span>
        <span className="shrink-0 text-neutral-400">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div
          className={`absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-[#E4E8EE] bg-white shadow-lg ${listaClassName ?? ""}`}
        >
          {buscable && (
            <div className="sticky top-0 z-10 border-b border-[#E4E8EE] bg-white p-2">
              <input
                autoFocus
                className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-[#0B2545] focus:border-[#14477E] focus:outline-none"
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={placeholderBusqueda ?? "Buscar…"}
                type="text"
                value={busqueda}
              />
            </div>
          )}
          {itemsFiltrados.map((item) => (
            <button
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#F5F7FA] ${seleccionado?.valor === item.valor ? "bg-[#F5F7FA] font-medium" : ""} ${itemClassName ?? ""}`}
              key={item.valor}
              onClick={() => seleccionar(item.valor)}
              type="button"
            >
              {renderOpcion ? (
                renderOpcion(item)
              ) : (
                <>
                  <BanderaIso iso={item.iso} />
                  <span className="truncate">{item.etiqueta}</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
