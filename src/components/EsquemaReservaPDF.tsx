import { Fragment, type ReactNode } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  G,
  Path,
  Circle,
  Line,
  Rect,
} from "@react-pdf/renderer";
import { Encabezado, Pie, estilos } from "@/documentos/Membrete";
import { formatoFecha, formatoHora, formatoMoneda, MARCA } from "@/lib/marca";
import type { OfertaConPrecio, SegmentoNormalizado, TramoNormalizado } from "@/lib/ofertas";

const propios = StyleSheet.create({
  compactTitle: { marginBottom: 3, marginTop: 2 },
  compactSubtitle: { marginBottom: 8 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: MARCA.oro,
    color: MARCA.azul,
    fontSize: 8,
    fontWeight: 700,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 3,
    marginTop: 4,
  },
  infoRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  infoCol: {
    flex: 1,
    minWidth: 130,
    backgroundColor: "#F5F7FA",
    padding: 8,
    borderRadius: 3,
  },
  noteBox: { marginTop: 8, backgroundColor: "#FFF8E1", padding: 8, borderRadius: 3 },
  noteText: { color: "#8A6A00", fontSize: 8, lineHeight: 1.35 },
  totalCompact: { marginTop: 8, padding: 10 },
  mapSection: { marginTop: 10 },

  flightBlock: { marginTop: 8 },
  flightTitle: { fontSize: 11, fontWeight: 700, color: MARCA.azul, marginBottom: 6 },
  tramoBox: { marginTop: 6, borderWidth: 1, borderColor: MARCA.grisClaro, borderRadius: 4, overflow: "hidden" },
  tramoTitle: { backgroundColor: "#F5F7FA", padding: 6, fontSize: 9, fontWeight: 700, color: MARCA.azul },
  segmentBox: { borderTopWidth: 1, borderTopColor: MARCA.grisClaro },
  segmentHeader: {
    backgroundColor: MARCA.azul,
    padding: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  segmentHeaderText: { color: "#FFFFFF", fontSize: 8, fontWeight: 700 },
  segmentRow: { flexDirection: "row", alignItems: "center", padding: 6, gap: 6 },
  segmentCol: { flex: 1 },
  segmentCode: { fontSize: 13, fontWeight: 700, color: MARCA.azul },
  segmentPlace: { fontSize: 7.5, color: MARCA.gris, marginTop: 1 },
  segmentTime: { fontSize: 8, fontWeight: 700, color: MARCA.azul, marginTop: 3 },
  segmentArrow: { width: 50, alignItems: "center", justifyContent: "center" },
  segmentArrowText: { fontSize: 10, color: MARCA.gris, textAlign: "center" },
  segmentDuration: { fontSize: 7.5, color: MARCA.gris, textAlign: "center", marginTop: 1 },
  layoverRow: { backgroundColor: "#FFF8E1", padding: 5, borderTopWidth: 1, borderTopColor: MARCA.grisClaro },
  layoverText: { fontSize: 8, color: MARCA.azul },
  conditionsBox: { padding: 6, borderTopWidth: 1, borderTopColor: MARCA.grisClaro },
  conditionsText: { fontSize: 7.5, color: MARCA.gris },
});

interface Itinerario {
  id: string;
  titulo: string;
  cliente: string;
  resumen: string | null;
  moneda: string;
  estado: string;
  creado_en: string;
}

interface Bloque {
  id: string;
  posicion: number;
  tipo: string;
  titulo: string;
  fecha: string | null;
  fecha_fin: string | null;
  detalle: string | null;
  proveedor: string | null;
  costo_neto: number | null;
  precio_venta: number | null;
  datos: unknown;
}

interface AeropuertoCoord {
  lat: number;
  lon: number;
  nombre?: string;
}

interface Props {
  itinerario: Itinerario;
  bloques: Bloque[];
  aeropuertos?: Record<string, AeropuertoCoord | null>;
}

const TIPOS: Record<string, string> = {
  vuelo: "Vuelo",
  hotel: "Hospedaje",
  traslado: "Traslado",
  actividad: "Actividad",
  servicio: "Servicio",
  nota: "Nota",
};

function sinFlecha(s: string | null | undefined): string {
  return (s ?? "").replace(/→/g, "->");
}

function duracionMinutos(min: number | null | undefined): string {
  if (min === null || min === undefined || min < 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h} h ${m} min`;
  if (h > 0) return `${h} h`;
  return `${m} min`;
}

function fechaDeIso(iso: string | null | undefined): string {
  if (!iso || iso === "undefined") return "—";
  const fecha = iso.slice(0, 10);
  if (!fecha || fecha === "undefined") return "—";
  return formatoFecha(fecha);
}

function horaDeIso(iso: string | null | undefined): string {
  if (!iso || iso === "undefined") return "";
  return formatoHora(iso);
}

function equipajeTexto(equipaje: { tipo: string; cantidad: number }[] | undefined): string {
  if (!equipaje || equipaje.length === 0) return "Consultar política";
  const partes = equipaje.map((e) => `${e.cantidad} ${e.tipo}${e.cantidad > 1 ? "s" : ""}`);
  return partes.join(" · ");
}

function resumenServicio(b: Bloque): string {
  if (b.tipo === "vuelo") {
    const datos = b.datos as Record<string, unknown> | null;
    const oferta = datos?.oferta as Partial<OfertaConPrecio> | undefined;
    const tramos = oferta?.tramos ?? [];
    return tramos
      .map((t) => {
        const tr = t as Partial<TramoNormalizado>;
        const segs = tr.segmentos ?? [];
        const origen = tr.origen ?? segs[0]?.origen ?? "—";
        const destino = tr.destino ?? segs[segs.length - 1]?.destino ?? "—";
        return `${origen} -> ${destino}`;
      })
      .join(" · ");
  }
  return b.detalle ?? "—";
}

function MapaRuta({
  aeropuertos,
  segmentos,
}: {
  aeropuertos: Record<string, AeropuertoCoord | null>;
  segmentos: { origen: string; destino: string }[];
}) {
  const iatas: string[] = [];
  const agregar = (iata: string) => {
    if (!iatas.includes(iata)) iatas.push(iata);
  };
  for (const s of segmentos) {
    agregar(s.origen);
    agregar(s.destino);
  }
  if (iatas.length < 2) return null;

  const w = 515;
  const h = 240;
  const pad = 24;
  const puntos: Record<string, { x: number; y: number; nombre?: string }> = {};
  const coordsDisponibles = iatas.filter((i) => !!aeropuertos[i]).length;

  if (coordsDisponibles >= 2) {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;
    for (const iata of iatas) {
      const c = aeropuertos[iata];
      if (!c) continue;
      if (c.lat < minLat) minLat = c.lat;
      if (c.lat > maxLat) maxLat = c.lat;
      if (c.lon < minLon) minLon = c.lon;
      if (c.lon > maxLon) maxLon = c.lon;
    }
    if (maxLon - minLon > 180) {
      for (const iata of iatas) {
        const p = aeropuertos[iata];
        if (p && p.lon > 0) p.lon -= 360;
      }
      minLon = Infinity;
      maxLon = -Infinity;
      for (const iata of iatas) {
        const p = aeropuertos[iata];
        if (!p) continue;
        if (p.lon < minLon) minLon = p.lon;
        if (p.lon > maxLon) maxLon = p.lon;
      }
    }
    const rangeLat = Math.max(0.0001, maxLat - minLat);
    const rangeLon = Math.max(0.0001, maxLon - minLon);
    const scaleX = (w - 2 * pad) / rangeLon;
    const scaleY = (h - 2 * pad) / rangeLat;
    const scale = Math.min(scaleX, scaleY) * 0.92;
    const offsetX = (w - rangeLon * scale) / 2;
    const offsetY = (h - rangeLat * scale) / 2;
    for (const iata of iatas) {
      const p = aeropuertos[iata];
      if (!p) continue;
      puntos[iata] = {
        x: offsetX + (p.lon - minLon) * scale,
        y: h - offsetY - (p.lat - minLat) * scale,
        nombre: p.nombre,
      };
    }
    for (const iata of iatas) {
      if (!puntos[iata]) puntos[iata] = { x: w / 2, y: h / 2, nombre: undefined };
    }
  } else {
    const n = iatas.length;
    const step = n > 1 ? (w - 2 * pad) / (n - 1) : 0;
    iatas.forEach((iata, i) => {
      puntos[iata] = {
        x: pad + i * step,
        y: h / 2,
        nombre: aeropuertos[iata]?.nombre,
      };
    });
  }

  const gridLines: ReactNode[] = [];
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const y = pad + ((h - 2 * pad) * i) / ticks;
    gridLines.push(<Line key={`h-${i}`} x1={pad} y1={y} x2={w - pad} y2={y} stroke="#DAE3EC" strokeWidth={0.5} />);
    const x = pad + ((w - 2 * pad) * i) / ticks;
    gridLines.push(<Line key={`v-${i}`} x1={x} y1={pad} x2={x} y2={h - pad} stroke="#DAE3EC" strokeWidth={0.5} />);
  }

  const routes: ReactNode[] = [];
  segmentos.forEach((seg, idx) => {
    const o = puntos[seg.origen];
    const d = puntos[seg.destino];
    if (!o || !d) return;
    const p1 = o;
    const p2 = d;
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const udx = dx / len;
    const udy = dy / len;
    const curve = Math.min(36, len * 0.28) * (idx % 2 === 0 ? -1 : 1);
    const cx = mx - udy * curve;
    const cy = my + udx * curve;
    routes.push(
      <Path
        key={`r-${idx}`}
        d={`M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`}
        stroke={MARCA.azul}
        strokeWidth={2.5}
        fill="none"
      />,
    );
  });

  const dots: ReactNode[] = [];
  const labels: ReactNode[] = [];
  iatas.forEach((iata) => {
    const p = puntos[iata];
    const label = iata;
    const dx = p.x > w - 60 ? -8 : 8;
    const anchor = p.x > w - 60 ? "end" : "start";
    const x = p.x + dx;
    const y = p.y - 8;
    dots.push(
      <Fragment key={`d-${iata}`}>
        <Circle cx={p.x} cy={p.y} r={6} fill={MARCA.oro} stroke={MARCA.azul} strokeWidth={1.5} />
        <Circle cx={p.x} cy={p.y} r={2.5} fill={MARCA.azul} />
      </Fragment>,
    );
    labels.push(
      <Text key={`l-${iata}`} x={x} y={y} textAnchor={anchor} style={{ fontSize: 9, fill: MARCA.azul, fontWeight: 700 } as any}>
        {label}
      </Text>,
    );
  });

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Rect x={0} y={0} width={w} height={h} fill="#EDF4FA" />
      <Rect x={pad} y={pad} width={w - 2 * pad} height={h - 2 * pad} rx={4} fill="#FFFFFF" stroke={MARCA.azulClaro} strokeWidth={0.5} />
      <G>{gridLines}</G>
      <G>{routes}</G>
      <G>{dots}</G>
      <G>{labels}</G>
    </Svg>
  );
}

export default function EsquemaReservaPDF({ itinerario, bloques, aeropuertos = {} }: Props) {
  const folio = `IATP-${itinerario.id.padStart(5, "0")}`;
  const total = bloques.reduce((sum, b) => sum + (typeof b.precio_venta === "number" ? b.precio_venta : 0), 0);

  const vuelos = bloques
    .filter((b) => b.tipo === "vuelo")
    .map((b) => {
      const datos = (typeof b.datos === "object" && b.datos !== null ? b.datos : {}) as Record<string, unknown>;
      return { bloque: b, oferta: datos.oferta as Partial<OfertaConPrecio> | undefined };
    })
    .filter((v): v is { bloque: Bloque; oferta: OfertaConPrecio } => !!v.oferta?.tramos && v.oferta.tramos.length > 0);

  const segmentosRuta: { origen: string; destino: string }[] = [];
  for (const v of vuelos) {
    for (const tramo of v.oferta.tramos) {
      for (const s of tramo.segmentos) {
        segmentosRuta.push({ origen: s.origen, destino: s.destino });
      }
    }
  }

  const conMapa = segmentosRuta.length > 0;

  return (
    <Document title={`${sinFlecha(itinerario.titulo)} · IA Travel Planning`} author="IA Travel Planning" subject="Esquema de viaje">
      <Page size="A4" style={estilos.pagina}>
        <Encabezado documento="Esquema de viaje" />
        <View>
          <Text style={[estilos.titulo, propios.compactTitle]}>{sinFlecha(itinerario.titulo)}</Text>
          <Text style={[estilos.subtitulo, propios.compactSubtitle]}>
            {`Preparado para ${itinerario.cliente} · ${formatoFecha(itinerario.creado_en)} · ${folio}`}
          </Text>
          <Text style={propios.badge}>{itinerario.estado.toUpperCase()}</Text>
        </View>

        <View style={propios.infoRow}>
          <View style={propios.infoCol}>
            <Text style={estilos.etiqueta}>CLIENTE</Text>
            <Text style={estilos.dato}>{itinerario.cliente}</Text>
          </View>
          <View style={propios.infoCol}>
            <Text style={estilos.etiqueta}>CONTACTO</Text>
            <Text style={estilos.dato}>{itinerario.resumen || "—"}</Text>
          </View>
          <View style={propios.infoCol}>
            <Text style={estilos.etiqueta}>MONEDA</Text>
            <Text style={estilos.dato}>{itinerario.moneda}</Text>
          </View>
        </View>

        <Text style={estilos.seccion}>Itinerario día por día</Text>
        <View style={estilos.tabla}>
          <View style={estilos.filaEncabezado}>
            <Text style={[estilos.celdaEncabezado, { width: "16%" }]}>DÍA / FECHA</Text>
            <Text style={[estilos.celdaEncabezado, { width: "13%" }]}>CONCEPTO</Text>
            <Text style={[estilos.celdaEncabezado, { width: "41%" }]}>SERVICIO</Text>
            <Text style={[estilos.celdaEncabezado, { width: "15%" }]}>PROVEEDOR</Text>
            <Text style={[estilos.celdaEncabezado, { width: "15%", textAlign: "right" }]}>PRECIO</Text>
          </View>
          {bloques.map((b, i) => (
            <View style={estilos.fila} key={b.id} wrap={false}>
              <Text style={[estilos.celda, { width: "16%" }]}>
                {`Día ${i + 1}`}
                {b.fecha ? `\n${formatoFecha(b.fecha)}` : ""}
                {b.fecha_fin && b.fecha_fin !== b.fecha ? `\nal ${formatoFecha(b.fecha_fin)}` : ""}
              </Text>
              <Text style={[estilos.celda, { width: "13%" }]}>{TIPOS[b.tipo] ?? b.tipo}</Text>
              <Text style={[estilos.celda, { width: "41%" }]}>
                {sinFlecha(b.titulo)}
                {b.detalle ? `\n${sinFlecha(b.detalle)}` : ""}
                {b.tipo === "vuelo" ? `\n${resumenServicio(b)}` : ""}
              </Text>
              <Text style={[estilos.celda, { width: "15%" }]}>{b.proveedor ?? "—"}</Text>
              <Text style={[estilos.celda, { width: "15%", textAlign: "right" }]}>
                {typeof b.precio_venta === "number" ? formatoMoneda(b.precio_venta, itinerario.moneda) : "Incluido"}
              </Text>
            </View>
          ))}
        </View>

        <View style={[estilos.totalCaja, propios.totalCompact]}>
          <Text style={estilos.etiqueta}>INVERSIÓN TOTAL ESTIMADA</Text>
          <Text style={{ fontSize: 16, fontWeight: 700, color: MARCA.azul }}>{formatoMoneda(total, itinerario.moneda)}</Text>
        </View>

        <View style={propios.noteBox}>
          <Text style={propios.noteText}>
            Nota: Precios sujetos a disponibilidad y cambio sin previo aviso. Tarifa sujeta a condiciones de la aerolínea y del hotel.
          </Text>
        </View>

        {conMapa && (
          <View style={propios.mapSection}>
            <Text style={estilos.seccion}>Mapa del viaje</Text>
            <MapaRuta aeropuertos={aeropuertos} segmentos={segmentosRuta} />
          </View>
        )}

        <Pie folio={folio} />
      </Page>

      {vuelos.length > 0 && (
        <Page size="A4" style={estilos.pagina}>
          <Encabezado documento="Plan de vuelo" />
          <Text style={[estilos.titulo, propios.compactTitle]}>Plan de vuelo detallado</Text>
          <Text style={[estilos.subtitulo, propios.compactSubtitle]}>
            {`${vuelos.length} vuelo${vuelos.length === 1 ? "" : "s"} · ${segmentosRuta.length} tramo${segmentosRuta.length === 1 ? "" : "s"}`}
          </Text>

          {vuelos.map((v, vi) => (
            <View key={`v-${vi}`} style={propios.flightBlock}>
              <Text style={propios.flightTitle}>{`${v.oferta.aerolinea} · ${sinFlecha(v.bloque.titulo)}`}</Text>
              {v.oferta.tramos.map((tramo, ti) => (
                <View key={`t-${ti}`} style={propios.tramoBox}>
                  <Text style={propios.tramoTitle}>
                    {`Tramo ${ti + 1}: ${tramo.origen ?? tramo.segmentos?.[0]?.origen ?? "—"} -> ${tramo.destino ?? tramo.segmentos?.[tramo.segmentos.length - 1]?.destino ?? "—"}`}
                  </Text>
                  {tramo.segmentos.map((s, si) => (
                    <Fragment key={`seg-${si}`}>
                      <View style={propios.segmentBox}>
                        <View style={propios.segmentHeader}>
                          <Text style={propios.segmentHeaderText}>{`Vuelo ${s.vuelo ?? "—"} · ${s.aerolinea ?? "—"}`}</Text>
                          <Text style={propios.segmentHeaderText}>{`${s.cabina ?? "—"} · ${s.avion ?? "—"}`}</Text>
                        </View>
                        <View style={propios.segmentRow}>
                          <View style={propios.segmentCol}>
                            <Text style={propios.segmentCode}>{s.origen ?? "—"}</Text>
                            <Text style={propios.segmentPlace}>
                              {`${s.origenNombre ?? "—"}${s.origenCiudad ? `, ${s.origenCiudad}` : ""}${s.origenPais ? `, ${s.origenPais}` : ""}`}
                            </Text>
                            <Text style={propios.segmentTime}>
                              {`${fechaDeIso(s.sale)}${horaDeIso(s.sale) ? ` · ${horaDeIso(s.sale)}` : ""}`}
                            </Text>
                          </View>
                          <View style={propios.segmentArrow}>
                            <Text style={propios.segmentArrowText}>{"->"}</Text>
                            <Text style={propios.segmentDuration}>{duracionMinutos(s.minutos)}</Text>
                          </View>
                          <View style={propios.segmentCol}>
                            <Text style={propios.segmentCode}>{s.destino ?? "—"}</Text>
                            <Text style={propios.segmentPlace}>
                              {`${s.destinoNombre ?? "—"}${s.destinoCiudad ? `, ${s.destinoCiudad}` : ""}${s.destinoPais ? `, ${s.destinoPais}` : ""}`}
                            </Text>
                            <Text style={propios.segmentTime}>
                              {`${fechaDeIso(s.llega)}${horaDeIso(s.llega) ? ` · ${horaDeIso(s.llega)}` : ""}`}
                            </Text>
                          </View>
                        </View>
                        {s.esperaMinutos ? (
                          <View style={propios.layoverRow}>
                            <Text style={propios.layoverText}>{`Escala en ${s.destino ?? "—"}: ${duracionMinutos(s.esperaMinutos)}`}</Text>
                          </View>
                        ) : null}
                      </View>
                    </Fragment>
                  ))}
                  <View style={propios.conditionsBox}>
                    <Text style={propios.conditionsText}>
                      {`Equipaje: ${equipajeTexto(tramo.equipaje)} · Cambios: ${v.oferta.cambiosPermitidos ? "Permitidos" : "No permitidos"} · Reembolso: ${v.oferta.reembolsoPermitido ? "Permitido" : "No permitido"}`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

          <Pie folio={folio} />
        </Page>
      )}
    </Document>
  );
}
