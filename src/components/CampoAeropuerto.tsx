"use client";

import { useEffect, useRef, useState } from "react";
import type { OpcionLugar } from "@/app/api/lugares/route";
import Bandera from "@/components/Bandera";
import { separarBandera } from "@/lib/paises";

interface Props {
  etiqueta: string;
  valor: string;
  descripcion: string | null;
  onCambio: (codigo: string, descripcion: string | null) => void;
}

export default function CampoAeropuerto({
  etiqueta,
  valor,
  descripcion,
  onCambio,
}: Props) {
  const inicial = separarBandera(descripcion ?? "");
  const elegida = inicial.resto ? `${inicial.resto} (${valor})` : valor;
  const [texto, setTexto] = useState(elegida);
  /** Bandera del lugar elegido: se dibuja como imagen porque Windows no tiene el emoji. */
  const [banderaElegida, setBanderaElegida] = useState<string | null>(
    inicial.bandera,
  );
  const [opciones, setOpciones] = useState<OpcionLugar[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [resaltada, setResaltada] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  /** Lo que hay que restaurar si el usuario abre el campo y se va sin elegir nada. */
  const anterior = useRef(elegida);

  /** Se llama desde el listener global, que se registra una sola vez. */
  const cerrarRef = useRef<() => void>(() => {});

  useEffect(() => {
    function fuera(evento: MouseEvent) {
      if (
        contenedor.current &&
        !contenedor.current.contains(evento.target as Node)
      ) {
        cerrarRef.current();
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
      setBuscando(true);
      try {
        const respuesta = await fetch(
          `/api/lugares?q=${encodeURIComponent(consulta)}`,
          {
            signal: control.signal,
          },
        );
        const cuerpo = (await respuesta.json()) as { opciones?: OpcionLugar[] };
        setOpciones(respuesta.ok ? (cuerpo.opciones ?? []) : []);
        setResaltada(0);
      } catch {
        // búsqueda cancelada o sin red: no hay sugerencias que mostrar
      } finally {
        setBuscando(false);
      }
    }, 250);
    return () => {
      control.abort();
      clearTimeout(temporizador);
    };
  }, [texto]);

  function elegir(opcion: OpcionLugar) {
    anterior.current = `${opcion.nombre} (${opcion.codigo})`;
    setTexto(anterior.current);
    setBanderaElegida(opcion.bandera);
    onCambio(
      opcion.codigo,
      [opcion.bandera, opcion.nombre].filter(Boolean).join(" "),
    );
    setAbierto(false);
  }

  /**
   * Al cerrar, un código escrito a mano ("EZE") se completa con el aeropuerto,
   * su ciudad y su país; si no, el campo se quedaría con las tres letras pelonas.
   */
  function cerrar() {
    setAbierto(false);
    const escrito = texto.trim();
    if (escrito === "") {
      setTexto(anterior.current);
      return;
    }
    if (/^[A-Za-z]{3}$/.test(escrito)) {
      const exacta = opciones.find(
        (opcion) => opcion.codigo.toUpperCase() === escrito.toUpperCase(),
      );
      if (exacta) elegir(exacta);
    }
  }

  useEffect(() => {
    cerrarRef.current = cerrar;
  });

  /** Al entrar al campo se vacía para escribir de una, sin borrar el aeropuerto a mano. */
  function abrir() {
    if (texto !== "") {
      anterior.current = texto;
      setTexto("");
      setBanderaElegida(null);
    }
    setAbierto(true);
  }

  /** null cuando lo escrito es demasiado corto para consultar el catálogo. */
  const sugerencias = texto.trim().length >= 2 ? opciones : null;

  function teclas(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (!abierto || sugerencias === null || sugerencias.length === 0) return;
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
    } else if (evento.key === "Tab") {
      cerrar();
    }
  }

  return (
    <div className="relative" ref={contenedor}>
      <label className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
        {etiqueta}
      </label>
      <div className="relative mt-1">
        <input
          autoComplete="off"
          className={`w-full min-w-0 rounded-lg border border-[#E4E8EE] bg-white py-2.5 pr-9 text-sm font-medium text-[#0B2545] outline-none focus:border-[#14477E] focus:ring-2 focus:ring-[#14477E]/20 ${
            banderaElegida ? "pl-9" : "pl-3"
          }`}
          onChange={(evento) => {
            const nuevo = evento.target.value;
            setTexto(nuevo);
            setAbierto(true);
            setOpciones([]);
            setBuscando(nuevo.trim().length >= 2);
            setBanderaElegida(null);
            if (/^[A-Za-z]{3}$/.test(nuevo.trim())) {
              onCambio(nuevo.trim().toUpperCase(), null);
            }
          }}
          onClick={abrir}
          onFocus={abrir}
          onKeyDown={teclas}
          placeholder="Ciudad, aeropuerto o código"
          ref={campo}
          required
          value={texto}
        />
        {banderaElegida && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <Bandera bandera={banderaElegida} clase="h-3 w-5" />
          </span>
        )}
        {texto !== "" && (
          <button
            aria-label={`Limpiar ${etiqueta.toLowerCase()}`}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#5A6B80] hover:bg-[#F5F7FA]"
            onClick={() => {
              anterior.current = "";
              setTexto("");
              setBanderaElegida(null);
              setOpciones([]);
              campo.current?.focus();
            }}
            type="button"
          >
            ×
          </button>
        )}
      </div>
      {abierto && sugerencias !== null && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full min-w-[20rem] max-w-[calc(100vw-2rem)] overflow-auto rounded-lg border border-[#E4E8EE] bg-white shadow-lg">
          {sugerencias.map((opcion, indice) => (
            <li key={`${opcion.tipo}-${opcion.codigo}`}>
              <button
                className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm ${
                  indice === resaltada ? "bg-[#F5F7FA]" : ""
                }`}
                onClick={() => elegir(opcion)}
                onMouseEnter={() => setResaltada(indice)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Bandera bandera={opcion.bandera} clase="h-3.5 w-5" />
                  <span className="min-w-0">
                    <span className="block font-medium text-[#0B2545]">
                      {opcion.nombre}
                    </span>
                    <span className="block text-xs text-[#5A6B80]">
                      {[
                        opcion.tipo === "ciudad"
                          ? "Todos los aeropuertos"
                          : opcion.ciudad,
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
          {sugerencias.length === 0 && (
            <li className="px-3 py-2 text-sm text-[#5A6B80]">
              {buscando
                ? "Buscando aeropuertos…"
                : "Sin aeropuertos con ese nombre"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
