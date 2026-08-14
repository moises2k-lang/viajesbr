"use client";

import { useEffect, useRef, useState } from "react";

export interface Pasajeros {
  adultos: number;
  menores: number[];
  bebes: number;
}

interface Props {
  valor: Pasajeros;
  onCambio: (valor: Pasajeros) => void;
}

const EDADES_MENORES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function resumen(p: Pasajeros): string {
  const partes = [`${p.adultos} adulto${p.adultos === 1 ? "" : "s"}`];
  if (p.menores.length > 0) {
    partes.push(`${p.menores.length} menor${p.menores.length === 1 ? "" : "es"}`);
  }
  if (p.bebes > 0) {
    partes.push(`${p.bebes} bebé${p.bebes === 1 ? "" : "s"} en brazos`);
  }
  return partes.join(" · ");
}

function Contador({
  etiqueta,
  detalle,
  valor,
  minimo,
  maximo,
  onCambio,
}: {
  etiqueta: string;
  detalle: string;
  valor: number;
  minimo: number;
  maximo: number;
  onCambio: (valor: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-[#0B2545]">{etiqueta}</p>
        <p className="text-xs text-[#5A6B80]">{detalle}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="h-8 w-8 rounded-full border border-[#E4E8EE] text-lg leading-none text-[#14477E] disabled:opacity-40"
          disabled={valor <= minimo}
          onClick={() => onCambio(valor - 1)}
          type="button"
        >
          –
        </button>
        <span className="w-6 text-center text-sm font-semibold">{valor}</span>
        <button
          className="h-8 w-8 rounded-full border border-[#E4E8EE] text-lg leading-none text-[#14477E] disabled:opacity-40"
          disabled={valor >= maximo}
          onClick={() => onCambio(valor + 1)}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function SelectorPasajeros({ valor, onCambio }: Props) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fuera(evento: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  function cambiarMenores(cantidad: number) {
    const menores = [...valor.menores];
    while (menores.length < cantidad) menores.push(8);
    while (menores.length > cantidad) menores.pop();
    onCambio({ ...valor, menores });
  }

  return (
    <div className="relative" ref={contenedor}>
      <span className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
        Pasajeros
      </span>
      <button
        className="mt-1 w-full rounded-lg border border-[#E4E8EE] bg-white px-3 py-2.5 text-left text-sm font-medium text-[#0B2545]"
        onClick={() => setAbierto((v) => !v)}
        type="button"
      >
        {resumen(valor)}
      </button>

      {abierto && (
        <div className="absolute z-30 mt-1 w-80 rounded-lg border border-[#E4E8EE] bg-white p-4 shadow-lg">
          <Contador
            detalle="12 años o más"
            etiqueta="Adultos"
            maximo={9}
            minimo={1}
            onCambio={(v) => onCambio({ ...valor, adultos: v })}
            valor={valor.adultos}
          />
          <Contador
            detalle="2 a 11 años, con asiento"
            etiqueta="Menores"
            maximo={8}
            minimo={0}
            onCambio={cambiarMenores}
            valor={valor.menores.length}
          />
          {valor.menores.length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-2 border-t border-[#E4E8EE] pt-3">
              {valor.menores.map((edad, indice) => (
                <label className="text-xs text-[#5A6B80]" key={`menor-${indice}`}>
                  Edad {indice + 1}
                  <select
                    className="mt-1 w-full rounded border border-[#E4E8EE] px-2 py-1 text-sm text-[#0B2545]"
                    onChange={(evento) => {
                      const menores = [...valor.menores];
                      menores[indice] = Number(evento.target.value);
                      onCambio({ ...valor, menores });
                    }}
                    value={edad}
                  >
                    {EDADES_MENORES.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {opcion} años
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
          <div className="mt-2 border-t border-[#E4E8EE] pt-1">
            <Contador
              detalle="Menos de 2 años, sin asiento"
              etiqueta="Bebés en brazos"
              maximo={Math.max(1, valor.adultos)}
              minimo={0}
              onCambio={(v) => onCambio({ ...valor, bebes: v })}
              valor={valor.bebes}
            />
          </div>
          <p className="mt-2 text-xs text-[#5A6B80]">
            La edad es la que tendrá el menor el día del vuelo; la aerolínea la valida contra el
            pasaporte.
          </p>
        </div>
      )}
    </div>
  );
}
