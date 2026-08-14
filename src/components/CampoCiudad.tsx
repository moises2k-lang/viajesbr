"use client";

import { useEffect, useRef, useState } from "react";
import type { OpcionCiudad } from "@/app/api/ciudades/route";

interface Props {
  etiqueta: string;
  descripcion: string | null;
  onCambio: (opcion: OpcionCiudad | null) => void;
}

export default function CampoCiudad({ etiqueta, descripcion, onCambio }: Props) {
  const [texto, setTexto] = useState(descripcion ?? "");
  const [opciones, setOpciones] = useState<OpcionCiudad[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [resaltada, setResaltada] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  /** Destino elegido antes de abrir el campo, para no perderlo si no se elige otro. */
  const anterior = useRef(descripcion ?? "");

  useEffect(() => {
    function fuera(evento: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(evento.target as Node)) {
        setAbierto(false);
        setTexto((actual) => (actual.trim() === "" ? anterior.current : actual));
      }
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 3) return;
    const control = new AbortController();
    const temporizador = setTimeout(async () => {
      setBuscando(true);
      try {
        const respuesta = await fetch(`/api/ciudades?q=${encodeURIComponent(consulta)}`, {
          signal: control.signal,
        });
        const cuerpo = (await respuesta.json()) as { opciones?: OpcionCiudad[] };
        setOpciones(respuesta.ok ? (cuerpo.opciones ?? []) : []);
        setResaltada(0);
      } catch {
        // búsqueda cancelada o sin red: no hay sugerencias que mostrar
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => {
      control.abort();
      clearTimeout(temporizador);
    };
  }, [texto]);

  function elegir(opcion: OpcionCiudad) {
    anterior.current = [opcion.bandera, opcion.nombre].filter(Boolean).join(" ");
    setTexto(anterior.current);
    onCambio(opcion);
    setAbierto(false);
  }

  /** Al entrar al campo se vacía para escribir de una, sin borrar el destino a mano. */
  function abrir() {
    if (texto !== "") {
      anterior.current = texto;
      setTexto("");
    }
    setAbierto(true);
  }

  function teclas(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (!abierto || sugerencias.length === 0) return;
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setResaltada((i) => (i + 1) % sugerencias.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setResaltada((i) => (i - 1 + sugerencias.length) % sugerencias.length);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      elegir(sugerencias[resaltada]);
    } else if (evento.key === "Escape") {
      setAbierto(false);
      setTexto(anterior.current);
    }
  }

  const consulta = texto.trim();
  const sugerencias = consulta.length >= 3 ? opciones : [];

  return (
    <div className="relative" ref={contenedor}>
      <label className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
        {etiqueta}
      </label>
      <input
        autoComplete="off"
        className="mt-1 w-full rounded-lg border border-[#E4E8EE] bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-[#0B2545] outline-none focus:border-[#14477E] focus:ring-2 focus:ring-[#14477E]/20"
        onChange={(evento) => {
          const nuevo = evento.target.value;
          setTexto(nuevo);
          setAbierto(true);
          setOpciones([]);
          setBuscando(nuevo.trim().length >= 3);
          onCambio(null);
        }}
        onClick={abrir}
        onFocus={abrir}
        onKeyDown={teclas}
        placeholder="Ciudad, zona o país"
        ref={campo}
        required
        value={texto}
      />
      {texto !== "" && (
        <button
          aria-label="Limpiar destino"
          className="absolute right-2 top-[1.9rem] flex h-6 w-6 items-center justify-center rounded-full text-[#5A6B80] hover:bg-[#F5F7FA]"
          onClick={() => {
            anterior.current = "";
            setTexto("");
            setOpciones([]);
            onCambio(null);
            campo.current?.focus();
          }}
          type="button"
        >
          ×
        </button>
      )}

      {abierto && consulta.length >= 3 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full min-w-[20rem] max-w-[calc(100vw-2rem)] overflow-auto rounded-lg border border-[#E4E8EE] bg-white shadow-lg">
          {sugerencias.map((opcion, indice) => (
            <li key={opcion.placeId}>
              <button
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${
                  indice === resaltada ? "bg-[#F5F7FA]" : ""
                }`}
                onClick={() => elegir(opcion)}
                onMouseEnter={() => setResaltada(indice)}
                type="button"
              >
                {opcion.bandera && <span className="text-lg leading-none">{opcion.bandera}</span>}
                <span className="min-w-0">
                  <span className="block font-medium text-[#0B2545]">{opcion.nombre}</span>
                  <span className="block text-xs text-[#5A6B80]">{opcion.detalle}</span>
                </span>
              </button>
            </li>
          ))}
          {sugerencias.length === 0 && (
            <li className="px-3 py-2 text-sm text-[#5A6B80]">
              {buscando ? "Buscando destinos…" : "Sin destinos con ese nombre"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
