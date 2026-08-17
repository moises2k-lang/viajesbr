"use client";

import type { ComponentType } from "react";
import {
  Accessibility,
  AirVent,
  ArrowUp,
  Baby,
  Banknote,
  Bath,
  Bed,
  Bell,
  Bike,
  Briefcase,
  Bus,
  Car,
  Cigarette,
  CigaretteOff,
  Coffee,
  Compass,
  Crown,
  DoorOpen,
  Dumbbell,
  Fan,
  Flame,
  GlassWater,
  Headphones,
  Heart,
  Landmark,
  Leaf,
  Lock,
  Luggage,
  Map,
  Maximize,
  Mountain,
  PawPrint,
  Phone,
  Plane,
  RefreshCcw,
  Shirt,
  Smartphone,
  Sparkles,
  SprayCan,
  Sun,
  Tag,
  Trash2,
  Trees,
  Tv,
  Umbrella,
  Undo2,
  Users,
  UtensilsCrossed,
  Waves,
  Wifi,
  Wine,
  X,
  Check,
} from "lucide-react";
import type { OfertaConPrecio } from "@/app/api/buscar/route";
import type { HabitacionConPrecio } from "@/app/api/hoteles/route";
import type { HabitacionCatalogo } from "@/app/api/hoteles/[hotelId]/route";
import { useI18n } from "@/lib/i18n";

function Etiqueta({
  icono: Icono,
  children,
  tipo = "neutro",
}: {
  icono: ComponentType<{ className?: string }>;
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

export function iconoAmenidad(nombre: string): ComponentType<{ className?: string }> {
  const n = nombre.toLowerCase();
  if (n.includes("wifi") || n.includes("internet") || n.includes("wi-fi")) return Wifi;
  if (n.includes("parking") || n.includes("estacionamiento") || n.includes("estaciona")) return Car;
  if (n.includes("restaurant") || n.includes("restaurante") || n.includes("gourmet") || n.includes("comedor")) return UtensilsCrossed;
  if (n.includes("pool") || n.includes("piscina") || n.includes("swimming") || n.includes("alberca")) return Waves;
  if (n.includes("gym") || n.includes("fitness") || n.includes("deporte") || n.includes("gimnasio")) return Dumbbell;
  if (n.includes("breakfast") || n.includes("desayuno")) return Coffee;
  if (n.includes("bar") || n.includes("lounge") || n.includes("cantina")) return Wine;
  if (n.includes("spa") || n.includes("masaje") || n.includes("wellness")) return Sparkles;
  if (n.includes("air condition") || n.includes("aire acondicionado") || n.includes("ac ") || n.includes("climatiz") || n.includes("air vent")) return AirVent;
  if (n.includes("heating") || n.includes("calefacci") || n.includes("heater")) return Flame;
  if (n.includes("elevator") || n.includes("ascensor") || n.includes("lift")) return ArrowUp;
  if (n.includes("laundry") || n.includes("lavander") || n.includes("plancha")) return Shirt;
  if (n.includes("room service") || n.includes("servicio a la habitaci") || n.includes("servihabi")) return Bell;
  if (n.includes("pet") || n.includes("mascota") || n.includes("dog") || n.includes("cat")) return PawPrint;
  if (n.includes("shuttle") || n.includes("traslado") || n.includes("transfer") || n.includes("transport")) return Bus;
  if (n.includes("beach") || n.includes("playa") || n.includes("mar")) return Umbrella;
  if (n.includes("concierge") || n.includes("conserje") || n.includes("recepc")) return Headphones;
  if (n.includes("business") || n.includes("centro de negocios") || n.includes("oficina")) return Briefcase;
  if (n.includes("family") || n.includes("niño") || n.includes("kids") || n.includes("infantil")) return Baby;
  if (n.includes("disable") || n.includes("accesib") || n.includes("handicap") || n.includes("discap")) return Accessibility;
  if (n.includes("tv") || n.includes("televis") || n.includes("cable")) return Tv;
  if (n.includes("phone") || n.includes("teléfono") || n.includes("telefono")) return Phone;
  if (n.includes("bath") || n.includes("baño") || n.includes("bañera") || n.includes("jacuzzi") || n.includes("ducha")) return Bath;
  if (n.includes("minibar") || n.includes("mini bar") || n.includes("refrigerator") || n.includes("frigobar")) return GlassWater;
  if (n.includes("safe") || n.includes("caja fuerte") || n.includes("seguro")) return Lock;
  if (n.includes("balcon") || n.includes("balcón") || n.includes("terraza") || n.includes("terrace")) return DoorOpen;
  if (n.includes("garden") || n.includes("jardín") || n.includes("jardin")) return Trees;
  if (n.includes("kitchen") || n.includes("cocina") || n.includes("kitchenette")) return UtensilsCrossed;
  if (n.includes("no smoking") || n.includes("no fumar") || n.includes("prohibido fumar") || n.includes("non-smoking")) return CigaretteOff;
  if (n.includes("smoking") || n.includes("fumar")) return Cigarette;
  if (n.includes("clean") || n.includes("limpieza") || n.includes("higiene") || n.includes("sanitized")) return SprayCan;
  if (n.includes("24h") || n.includes("24 hour") || n.includes("24 horas")) return Sun;
  if (n.includes("money") || n.includes("cajero") || n.includes("atm") || n.includes("exchange")) return Banknote;
  if (n.includes("mountain") || n.includes("montaña") || n.includes("hiking") || n.includes("trek")) return Mountain;
  if (n.includes("bike") || n.includes("bici") || n.includes("ciclismo")) return Bike;
  if (n.includes("golf") || n.includes("tennis") || n.includes("deporte")) return Compass;
  if (n.includes("casino") || n.includes("nightclub") || n.includes("disco")) return Wine;
  if (n.includes("luggage") || n.includes("equipaje") || n.includes("maletero")) return Luggage;
  if (n.includes("solarium") || n.includes("sol")) return Sun;
  if (n.includes("fan") || n.includes("ventilador")) return Fan;
  if (n.includes("heater") || n.includes("calentador")) return Flame;
  if (n.includes("luxury") || n.includes("lujo")) return Crown;
  if (n.includes("romantic") || n.includes("romántico") || n.includes("honeymoon") || n.includes("luna de miel")) return Heart;
  if (n.includes("historic") || n.includes("histórico") || n.includes("monumento")) return Landmark;
  if (n.includes("map") || n.includes("turistico") || n.includes("tour")) return Map;
  if (n.includes("bed") || n.includes("cama") || n.includes("colchón")) return Bed;
  if (n.includes("smartphone") || n.includes("mobile") || n.includes("app")) return Smartphone;
  if (n.includes("trash") || n.includes("basura") || n.includes("recic")) return Trash2;
  if (n.includes("leaf") || n.includes("eco") || n.includes("green") || n.includes("sostenible")) return Leaf;
  return Check;
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
        <Etiqueta icono={UtensilsCrossed}>{habitacion.regimen}</Etiqueta>
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
          <Etiqueta key={servicio} icono={iconoAmenidad(servicio)}>
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
      {servicios.slice(0, limite).map((servicio) => {
        const Icono = iconoAmenidad(servicio);
        return (
          <Etiqueta key={servicio} icono={Icono}>
            {servicio}
          </Etiqueta>
        );
      })}
    </div>
  );
}
