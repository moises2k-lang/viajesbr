import type { ParametrosFormulario } from "@/components/Buscador";

export interface BusquedaGuardada {
  parametros: ParametrosFormulario;
  buscadaEn: string;
}

const LLAVE = "agencia-historial-busquedas";
const MAXIMO = 8;
const VACIO: BusquedaGuardada[] = [];

let cache: BusquedaGuardada[] | null = null;
const oyentes = new Set<() => void>();

function huella(p: ParametrosFormulario): string {
  return [
    p.origen,
    p.destino,
    p.fechaSalida,
    p.fechaRegreso ?? "",
    p.adultos,
    p.menores.join(","),
    p.bebes,
    p.cabina ?? "",
    (p.tramos ?? []).map((t) => `${t.origen}${t.destino}${t.fecha}`).join(">"),
  ].join("|");
}

function leerDelNavegador(): BusquedaGuardada[] {
  const crudo = window.localStorage.getItem(LLAVE);
  if (!crudo) return VACIO;
  try {
    const datos = JSON.parse(crudo) as BusquedaGuardada[];
    return Array.isArray(datos) && datos.length > 0 ? datos : VACIO;
  } catch {
    return VACIO;
  }
}

function avisar(historial: BusquedaGuardada[]): void {
  cache = historial;
  for (const oyente of oyentes) oyente();
}

export function suscribirHistorial(oyente: () => void): () => void {
  oyentes.add(oyente);
  const desdeOtraPestana = () => avisar(leerDelNavegador());
  window.addEventListener("storage", desdeOtraPestana);
  return () => {
    oyentes.delete(oyente);
    window.removeEventListener("storage", desdeOtraPestana);
  };
}

export function historialDelNavegador(): BusquedaGuardada[] {
  if (cache === null) cache = leerDelNavegador();
  return cache;
}

/** El servidor no tiene localStorage: la primera pintura va sin historial. */
export function historialDelServidor(): BusquedaGuardada[] {
  return VACIO;
}

/** Agrega la búsqueda al inicio, sin repetir la misma combinación. */
export function guardarBusqueda(parametros: ParametrosFormulario): void {
  const nueva: BusquedaGuardada = {
    parametros,
    buscadaEn: new Date().toISOString(),
  };
  const restantes = historialDelNavegador().filter(
    (b) => huella(b.parametros) !== huella(parametros),
  );
  const historial = [nueva, ...restantes].slice(0, MAXIMO);
  window.localStorage.setItem(LLAVE, JSON.stringify(historial));
  avisar(historial);
}

export function borrarHistorial(): void {
  window.localStorage.removeItem(LLAVE);
  avisar(VACIO);
}
