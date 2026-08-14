"use client";

import { Plane, Luggage, RefreshCcw, Undo2, Tag, Users, Bed, Utensils, Maximize, Check, X } from "lucide-react";
import type { OfertaConPrecio } from "@/app/api/buscar/route";
import type { HabitacionConPrecio } from "@/app/api/hoteles/route";
import type { HabitacionCatalogo } from "@/app/api/hoteles/[hotelId]/route";
import { useI18n } from "@/lib/i18n";

function Etiqueta({
  icono: Icono,
  children,
  tipo = "neutro",
}: {
  icono: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  tipo?: "neutro" | "positivo" | "negativo";
}) {
  const colores = {
    neutro: "bg-[#F5F7FA] text-[#0B2545]",
    positivo: "bg-[#E8F5E9] text-[#1B5E20]",
    negativo: "bg-[#FFEBEE] text-[#B71C1C]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${colores[tipo]}`}
    >
      <Icono className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function CaracteristicasVuelo({ oferta }: { oferta: OfertaConPrecio }) {
  const { t } = useI18n();

  const cabinas = Array.from(
    new Set(
      oferta.tramos
        .flatMap((tramo) => tramo.segmentos.map((s) => s.cabina))
        .filter(Boolean),
    ),
  );

  let maletasMano = Infinity;
  let maletasDoc = Infinity;
  for (const tramo of oferta.tramos) {
    const mano =
      tramo.equipaje.find((e) => e.tipo === "carry_on")?.cantidad ?? 0;
    const doc =
      tramo.equipaje.find((e) => e.tipo === "checked")?.cantidad ?? 0;
    if (mano < maletasMano) maletasMano = mano;
    if (doc < maletasDoc) maletasDoc = doc;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {oferta.tramos[0]?.marcaTarifa && (
        <Etiqueta icono={Tag}>{oferta.tramos[0].marcaTarifa}</Etiqueta>
      )}
      {cabinas.map((cabina) => (
        <Etiqueta key={cabina} icono={Plane}>
          {cabina}
        </Etiqueta>
      ))}
      <Etiqueta icono={Luggage}>
        {maletasMano > 0 && maletasMano !== Infinity
          ? `${maletasMano} ${t("flights.carryOn")}`
          : t("flights.baggageNotIncluded")}
        {" · "}
        {maletasDoc > 0 && maletasDoc !== Infinity
          ? `${maletasDoc} ${t("flights.checked")}`
          : t("flights.noCheckedBaggage")}
      </Etiqueta>
      {oferta.cambiosPermitidos !== null && (
        <Etiqueta
          icono={RefreshCcw}
          tipo={oferta.cambiosPermitidos ? "positivo" : "negativo"}
        >
          {oferta.cambiosPermitidos
            ? t("flights.changeable")
            : t("flights.nonChangeable")}
        </Etiqueta>
      )}
      {oferta.reembolsoPermitido !== null && (
        <Etiqueta
          icono={Undo2}
          tipo={oferta.reembolsoPermitido ? "positivo" : "negativo"}
        >
          {oferta.reembolsoPermitido
            ? t("flights.refundable")
            : t("flights.nonRefundable")}
        </Etiqueta>
      )}
    </div>
  );
}

export function CaracteristicasHabitacion({
  habitacion,
  catalogo,
  limiteServicios = 4,
}: {
  habitacion: HabitacionConPrecio;
  catalogo: HabitacionCatalogo | null | undefined;
  limiteServicios?: number;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap gap-1.5">
      {habitacion.regimen && (
        <Etiqueta icono={Utensils}>{habitacion.regimen}</Etiqueta>
      )}
      {habitacion.reembolsable !== null && (
        <Etiqueta
          icono={habitacion.reembolsable ? Undo2 : X}
          tipo={habitacion.reembolsable ? "positivo" : "negativo"}
        >
          {habitacion.reembolsable
            ? habitacion.cancelaAntesDe
              ? t("hotels.cancelUntil", {
                  date: habitacion.cancelaAntesDe,
                })
              : t("hotels.freeCancellation")
            : t("hotels.nonRefundableRoom")}
        </Etiqueta>
      )}
      {catalogo?.metros && (
        <Etiqueta icono={Maximize}>
          {t("hotels.roomSize", { size: catalogo.metros })}
        </Etiqueta>
      )}
      {catalogo?.ocupacionMaxima && (
        <Etiqueta icono={Users}>
          {t("hotels.maxOccupancy", { max: catalogo.ocupacionMaxima })}
        </Etiqueta>
      )}
      {catalogo?.camas && catalogo.camas.length > 0 && (
        <Etiqueta icono={Bed}>{catalogo.camas.join(" · ")}</Etiqueta>
      )}
      {catalogo?.servicios
        ?.slice(0, limiteServicios)
        .map((servicio) => (
          <Etiqueta key={servicio} icono={Check}>
            {servicio}
          </Etiqueta>
        ))}
    </div>
  );
}

export function ServiciosHotel({
  servicios,
  limite = 8,
}: {
  servicios: string[];
  limite?: number;
}) {
  if (!servicios.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {servicios.slice(0, limite).map((servicio) => (
        <Etiqueta key={servicio} icono={Check}>
          {servicio}
        </Etiqueta>
      ))}
    </div>
  );
}
