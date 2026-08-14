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
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  const seleccionado = useMemo(
    () => items.find((i) => i.valor === valor) ?? null,
    [items, valor],
  );

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
  }

  return (
    <div className={`relative ${className ?? ""}`} ref={contenedor}>
      {etiqueta && (
        <label className="mb-1 block text-sm font-medium text-[#0B2545]">
          {etiqueta}
        </label>
      )}
      <button
        aria-expanded={abierto}
        className={`flex w-full items-center justify-between gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-left text-sm text-[#0B2545] focus:border-[#14477E] focus:outline-none ${botonClassName ?? ""}`}
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
          {items.map((item) => (
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
