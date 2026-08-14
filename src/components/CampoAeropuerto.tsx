"use client";

import { useEffect, useRef, useState } from "react";
import type { OpcionLugar } from "@/app/api/lugares/route";

interface Props {
  etiqueta: string;
  valor: string;
  descripcion: string | null;
  onCambio: (codigo: string, descripcion: string | null) => void;
}

export default function CampoAeropuerto({ etiqueta, valor, descripcion, onCambio }: Props) {
  const [texto, setTexto] = useState(descripcion ? `${descripcion} (${valor})` : valor);
  const [opciones, setOpciones] = useState<OpcionLugar[]>([]);
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

  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 2) return;
    const control = new AbortController();
    const temporizador = setTimeout(async () => {
      try {
        const respuesta = await fetch(`/api/lugares?q=${encodeURIComponent(consulta)}`, {
          signal: control.signal,
        });
        if (!respuesta.ok) {
          setOpciones([]);
          return;
        }
        const cuerpo = (await respuesta.json()) as { opciones: OpcionLugar[] };
        setOpciones(cuerpo.opciones);
      } catch {
        // búsqueda cancelada o sin red: no hay sugerencias que mostrar
      }
    }, 250);
    return () => {
      control.abort();
      clearTimeout(temporizador);
    };
  }, [texto]);

  function elegir(opcion: OpcionLugar) {
    const nombre = [opcion.bandera, opcion.nombre].filter(Boolean).join(" ");
    setTexto(`${nombre} (${opcion.codigo})`);
    onCambio(opcion.codigo, nombre);
    setAbierto(false);
  }

  return (
    <div className="relative" ref={contenedor}>
      <label className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
        {etiqueta}
      </label>
      <input
        autoComplete="off"
        className="mt-1 w-full rounded-lg border border-[#E4E8EE] bg-white px-3 py-2.5 text-sm font-medium text-[#0B2545] outline-none focus:border-[#14477E] focus:ring-2 focus:ring-[#14477E]/20"
        onChange={(evento) => {
          const nuevo = evento.target.value;
          setTexto(nuevo);
          setAbierto(true);
          if (/^[A-Za-z]{3}$/.test(nuevo.trim())) {
            onCambio(nuevo.trim().toUpperCase(), null);
          }
        }}
        onFocus={() => setAbierto(true)}
        placeholder="Ciudad, aeropuerto o código"
        required
        value={texto}
      />
      {abierto && texto.trim().length >= 2 && opciones.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full min-w-[20rem] max-w-[calc(100vw-2rem)] overflow-auto rounded-lg border border-[#E4E8EE] bg-white shadow-lg">
          {opciones.map((opcion) => (
            <li key={`${opcion.tipo}-${opcion.codigo}`}>
              <button
                className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[#F5F7FA]"
                onClick={() => elegir(opcion)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {opcion.bandera && <span className="text-lg leading-none">{opcion.bandera}</span>}
                  <span className="min-w-0">
                    <span className="block font-medium text-[#0B2545]">{opcion.nombre}</span>
                    <span className="block text-xs text-[#5A6B80]">
                      {[
                        opcion.tipo === "ciudad" ? "Todos los aeropuertos" : opcion.ciudad,
                        opcion.pais,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 rounded bg-[#E4E8EE] px-1.5 py-0.5 font-mono text-xs text-[#14477E]">
                  {opcion.codigo}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
