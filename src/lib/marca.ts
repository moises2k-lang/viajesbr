import { dinero } from "@/lib/dinero";

export const MARCA = {
  nombre: "IA Travel Planning",
  sitio: "viajes.sistemas-e.com",
  correo: "moises2k@gmail.com",
  telefono: "+52 55 3041 4719",
  azul: "#0B2545",
  azulClaro: "#14477E",
  oro: "#C9A227",
  gris: "#5A6B80",
  grisClaro: "#E4E8EE",
} as const;

export function formatoMoneda(monto: number, moneda: string): string {
  return dinero(monto, moneda);
}

export function formatoFecha(valor: string | Date | null): string {
  if (!valor) {
    return "";
  }
  const fecha = typeof valor === "string" ? new Date(valor) : valor;
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(fecha);
}

export function formatoHora(valor: string | null): string {
  if (!valor) {
    return "";
  }
  return valor.slice(11, 16);
}

export function duracionLegible(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const coincidencia = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso);
  if (!coincidencia) {
    return iso;
  }
  const dias = Number(coincidencia[1] ?? 0);
  const horas = Number(coincidencia[2] ?? 0) + dias * 24;
  const minutos = Number(coincidencia[3] ?? 0);
  return minutos ? `${horas} h ${minutos} min` : `${horas} h`;
}
