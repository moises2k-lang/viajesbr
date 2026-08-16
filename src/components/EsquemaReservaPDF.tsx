import { Fragment, type ReactNode } from "react";
import { Document, Page, Text, View, StyleSheet, Svg, G, Path, Circle, Line, Rect } from "@react-pdf/renderer";
import { Encabezado, Pie, estilos } from "@/documentos/Membrete";
import { formatoFecha, formatoHora, formatoMoneda, MARCA } from "@/lib/marca";
import type { OfertaConPrecio, SegmentoNormalizado, TramoNormalizado } from "@/lib/ofertas";

const propios = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: MARCA.oro,
    color: MARCA.azul,
    fontSize: 9,
    fontWeight: 700,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 3,
    marginTop: 8,
  },
  infoBox: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  infoColumn: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#F5F7FA",
    padding: 10,
    borderRadius: 4,
  },
  label: {
    fontSize: 7.5,
    color: MARCA.gris,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    fontWeight: 700,
    color: MARCA.azul,
  },
  flightCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: MARCA.grisClaro,
    borderRadius: 4,
    overflow: "hidden",
  },
  flightHeader: {
    backgroundColor: MARCA.azul,
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  flightHeaderText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 700,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 8,
  },
  routeCol: {
    flex: 1,
  },
  routeCode: {
    fontSize: 16,
    fontWeight: 700,
    color: MARCA.azul,
  },
  routeName: {
    fontSize: 8,
    color: MARCA.gris,
    marginTop: 2,
  },
  routeTime: {
    fontSize: 9,
    fontWeight: 700,
    color: MARCA.azul,
    marginTop: 4,
  },
  routeLine: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  routeLineText: {
    fontSize: 8,
    color: MARCA.gris,
    textAlign: "center",
  },
  layoverBox: {
    backgroundColor: "#FFF8E1",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: MARCA.grisClaro,
  },
  noteBox: {
    marginTop: 10,
    backgroundColor: "#FFF8E1",
    padding: 8,
    borderRadius: 4,
  },
  noteText: { color: "#8A6A00", fontSize: 8.5, lineHeight: 1.45 },
  mapContainer: {
    marginTop: 14,
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    padding: 10,
    borderRadius: 4,
  },
  legend: {
    marginTop: 8,
    fontSize: 8,
    color: MARCA.gris,
    textAlign: "center",
  },
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

function duracionMinutos(min: number | null): string {
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
  if (!equipaje || equipaje.length === 0) return "Consultar política de equipaje";
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
  const puntos: Record<string, { lat: number; lon: number }> = {};
  for (const iata of Object.keys(aeropuertos)) {
    const c = aeropuertos[iata];
    if (c) puntos[iata] = { lat: c.lat, lon: c.lon };
  }
  const iatas = Object.keys(puntos);
  if (iatas.length < 2) return null;

  const w = 500;
  const h = 260;
  const pad = 30;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const p of Object.values(puntos)) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }

  if (maxLon - minLon > 180) {
    for (const p of Object.values(puntos)) {
      if (p.lon > 0) p.lon -= 360;
    }
    minLon = Infinity;
    maxLon = -Infinity;
    for (const p of Object.values(puntos)) {
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
    }
  }

  const rangeLat = Math.max(0.0001, maxLat - minLat);
  const rangeLon = Math.max(0.0001, maxLon - minLon);
  const scaleX = (w - 2 * pad) / rangeLon;
  const scaleY = (h - 2 * pad) / rangeLat;
  const scale = Math.min(scaleX, scaleY);

  function project(lat: number, lon: number) {
    const x = pad + (lon - minLon) * scale;
    const y = h - pad - (lat - minLat) * scale;
    return { x, y };
  }

  const ticks = 4;
  const gridLines: ReactNode[] = [];
  for (let i = 0; i <= ticks; i++) {
    const y = pad + ((h - 2 * pad) * i) / ticks;
    gridLines.push(<Line key={`h-${i}`} x1={pad} y1={y} x2={w - pad} y2={y} stroke="#E4E8EE" strokeWidth={0.5} />);
    const x = pad + ((w - 2 * pad) * i) / ticks;
    gridLines.push(<Line key={`v-${i}`} x1={x} y1={pad} x2={x} y2={h - pad} stroke="#E4E8EE" strokeWidth={0.5} />);
  }

  const routes: ReactNode[] = [];
  const drawn = new Set<string>();
  for (const seg of segmentos) {
    const o = puntos[seg.origen];
    const d = puntos[seg.destino];
    if (!o || !d) continue;
    const p1 = project(o.lat, o.lon);
    const p2 = project(d.lat, d.lon);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const udx = dx / len;
    const udy = dy / len;
    const curve = Math.min(60, len * 0.35);
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const cx = mx - udy * curve;
    const cy = my + udx * curve;
    const key = `${seg.origen}-${seg.destino}`;
    if (!drawn.has(key)) {
      drawn.add(key);
      routes.push(
        <Path
          key={key}
          d={`M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`}
          stroke={MARCA.azulClaro}
          strokeWidth={2}
          fill="none"
        />,
      );
    }
  }

  const dots: ReactNode[] = [];
  const labels: ReactNode[] = [];
  for (const iata of iatas) {
    const p = project(puntos[iata].lat, puntos[iata].lon);
    dots.push(<Circle key={iata} cx={p.x} cy={p.y} r={5} fill={MARCA.oro} stroke={MARCA.azul} strokeWidth={1} />);
    labels.push(
      <Text key={`l-${iata}`} x={p.x + 7} y={p.y - 7} style={{ fontSize: 8, fill: MARCA.azul } as any}>
        {iata}
      </Text>,
    );
  }

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Rect x={pad} y={pad} width={w - 2 * pad} height={h - 2 * pad} rx={4} fill="#FFFFFF" stroke={MARCA.grisClaro} strokeWidth={1} />
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

  const vuelos = (
    bloques
      .filter((b) => b.tipo === "vuelo")
      .map((b) => {
        const datos = (typeof b.datos === "object" && b.datos !== null ? b.datos : {}) as Record<string, unknown>;
        return { bloque: b, oferta: datos.oferta as Partial<OfertaConPrecio> | undefined };
      })
      .filter((v): v is { bloque: Bloque; oferta: OfertaConPrecio } => !!v.oferta?.tramos && v.oferta.tramos.length > 0)
  );

  const segmentosRuta: { origen: string; destino: string }[] = [];
  for (const v of vuelos) {
    for (const tramo of v.oferta.tramos) {
      for (const s of tramo.segmentos) {
        segmentosRuta.push({ origen: s.origen, destino: s.destino });
      }
    }
  }

  const conMapa = Object.values(aeropuertos).some(Boolean) && segmentosRuta.length > 0;

  return (
    <Document title={`${sinFlecha(itinerario.titulo)} · IA Travel Planning`} author="IA Travel Planning" subject="Esquema de viaje">
      <Page size="A4" style={estilos.pagina}>
        <Encabezado documento="Esquema de viaje" />
        <View style={{ marginTop: 10 }}>
          <Text style={estilos.titulo}>{sinFlecha(itinerario.titulo)}</Text>
          <Text style={estilos.subtitulo}>
            {`Preparado para ${itinerario.cliente} · ${formatoFecha(itinerario.creado_en)} · ${folio}`}
          </Text>
          <Text style={propios.badge}>{itinerario.estado.toUpperCase()}</Text>
        </View>

        <View style={propios.infoBox}>
          <View style={propios.infoColumn}>
            <Text style={propios.label}>CLIENTE</Text>
            <Text style={propios.value}>{itinerario.cliente}</Text>
          </View>
          <View style={propios.infoColumn}>
            <Text style={propios.label}>CONTACTO</Text>
            <Text style={propios.value}>{itinerario.resumen || "—"}</Text>
          </View>
          <View style={propios.infoColumn}>
            <Text style={propios.label}>MONEDA</Text>
            <Text style={propios.value}>{itinerario.moneda}</Text>
          </View>
        </View>

        <Text style={estilos.seccion}>Resumen de servicios</Text>
        <View style={estilos.tabla}>
          <View style={estilos.filaEncabezado}>
            <Text style={[estilos.celdaEncabezado, { width: "16%" }]}>FECHA</Text>
            <Text style={[estilos.celdaEncabezado, { width: "13%" }]}>CONCEPTO</Text>
            <Text style={[estilos.celdaEncabezado, { width: "41%" }]}>DETALLE</Text>
            <Text style={[estilos.celdaEncabezado, { width: "15%" }]}>PROVEEDOR</Text>
            <Text style={[estilos.celdaEncabezado, { width: "15%", textAlign: "right" }]}>PRECIO</Text>
          </View>
          {bloques.map((b) => (
            <View style={estilos.fila} key={b.id} wrap={false}>
              <Text style={[estilos.celda, { width: "16%" }]}>
                {b.fecha ? formatoFecha(b.fecha) : "Por definir"}
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

        <View style={estilos.totalCaja} wrap={false}>
          <Text style={estilos.etiqueta}>INVERSIÓN TOTAL ESTIMADA</Text>
          <Text style={{ fontSize: 18, fontWeight: 700, color: MARCA.azul }}>
            {formatoMoneda(total, itinerario.moneda)}
          </Text>
        </View>

        <View style={propios.noteBox} wrap={false}>
          <Text style={propios.noteText}>
            Nota: Precios sujetos a disponibilidad y cambio sin previo aviso. Tarifa sujeta a condiciones de la aerolínea y del hotel.
          </Text>
        </View>

        <Pie folio={folio} />
      </Page>

      <Page size="A4" style={estilos.pagina}>
        <Encabezado documento="Calendario de viaje" />
        <Text style={estilos.titulo}>Calendario día por día</Text>
        <Text style={estilos.subtitulo}>
          {`${sinFlecha(itinerario.titulo)} · ${bloques.length} servicio${bloques.length === 1 ? "" : "s"}`}
        </Text>

        <View style={estilos.tabla}>
          <View style={estilos.filaEncabezado}>
            <Text style={[estilos.celdaEncabezado, { width: "18%" }]}>DÍA / FECHA</Text>
            <Text style={[estilos.celdaEncabezado, { width: "14%" }]}>CONCEPTO</Text>
            <Text style={[estilos.celdaEncabezado, { width: "38%" }]}>SERVICIO</Text>
            <Text style={[estilos.celdaEncabezado, { width: "15%" }]}>PROVEEDOR</Text>
            <Text style={[estilos.celdaEncabezado, { width: "15%", textAlign: "right" }]}>PRECIO</Text>
          </View>
          {bloques.map((b, i) => (
            <View style={estilos.fila} key={b.id} wrap={false}>
              <Text style={[estilos.celda, { width: "18%" }]}>
                {`Día ${i + 1}`}
                {b.fecha ? `\n${formatoFecha(b.fecha)}` : ""}
                {b.fecha_fin && b.fecha_fin !== b.fecha ? `\nal ${formatoFecha(b.fecha_fin)}` : ""}
              </Text>
              <Text style={[estilos.celda, { width: "14%" }]}>{TIPOS[b.tipo] ?? b.tipo}</Text>
              <Text style={[estilos.celda, { width: "38%" }]}>
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

        <View style={estilos.totalCaja} wrap={false}>
          <Text style={estilos.etiqueta}>TOTAL ESTIMADO</Text>
          <Text style={{ fontSize: 16, fontWeight: 700, color: MARCA.azul }}>
            {formatoMoneda(total, itinerario.moneda)}
          </Text>
        </View>

        <Pie folio={folio} />
      </Page>

      {vuelos.map((v, vueloIdx) => (
        <Page size="A4" style={estilos.pagina} key={`vuelo-${v.bloque.id}`}>
          <Encabezado documento="Plan de vuelo" />
          <Text style={estilos.titulo}>
            {`${v.oferta.aerolinea ?? "Vuelo"} · ${sinFlecha(v.bloque.titulo)}`}
          </Text>
          <Text style={estilos.subtitulo}>
            {`Vuelo ${vueloIdx + 1} de ${v.oferta.tramos.length} tramo${v.oferta.tramos.length === 1 ? "" : "s"}`}
          </Text>

          {v.oferta.tramos.map((tramo: TramoNormalizado, tramoIdx: number) => (
            <View key={`tramo-${tramoIdx}`} wrap={false}>
              <Text style={estilos.seccion}>{`Tramo ${tramoIdx + 1}: ${tramo.origen ?? tramo.segmentos?.[0]?.origen ?? "—"} -> ${tramo.destino ?? tramo.segmentos?.[tramo.segmentos.length - 1]?.destino ?? "—"}`}</Text>
              {tramo.segmentos.map((s: SegmentoNormalizado, idx: number) => (
                <Fragment key={`seg-${idx}`}>
                  <View style={propios.flightCard}>
                    <View style={propios.flightHeader}>
                      <Text style={propios.flightHeaderText}>{`Vuelo ${s.vuelo ?? "—"} · ${s.aerolinea ?? "—"}`}</Text>
                      <Text style={propios.flightHeaderText}>{`${s.cabina ?? "—"} · ${s.avion ?? "—"}`}</Text>
                    </View>
                    <View style={propios.routeRow}>
                      <View style={propios.routeCol}>
                        <Text style={propios.routeCode}>{s.origen ?? "—"}</Text>
                        <Text style={propios.routeName}>{`${s.origenNombre ?? "—"}${s.origenCiudad ? `, ${s.origenCiudad}` : ""}${s.origenPais ? `, ${s.origenPais}` : ""}`}</Text>
                        <Text style={propios.routeTime}>{`${fechaDeIso(s.sale)}${horaDeIso(s.sale) ? ` · ${horaDeIso(s.sale)}` : ""}`}</Text>
                      </View>
                      <View style={propios.routeLine}>
                        <Text style={propios.routeLineText}>{duracionMinutos(s.minutos)}</Text>
                        <Text style={propios.routeLineText}>----</Text>
                      </View>
                      <View style={propios.routeCol}>
                        <Text style={propios.routeCode}>{s.destino ?? "—"}</Text>
                        <Text style={propios.routeName}>{`${s.destinoNombre ?? "—"}${s.destinoCiudad ? `, ${s.destinoCiudad}` : ""}${s.destinoPais ? `, ${s.destinoPais}` : ""}`}</Text>
                        <Text style={propios.routeTime}>{`${fechaDeIso(s.llega)}${horaDeIso(s.llega) ? ` · ${horaDeIso(s.llega)}` : ""}`}</Text>
                      </View>
                    </View>
                  </View>
                  {s.esperaMinutos ? (
                    <View style={propios.layoverBox}>
                      <Text style={{ fontSize: 8.5, color: MARCA.azul }}>
                        {`Escala en ${s.destino ?? "—"}: ${duracionMinutos(s.esperaMinutos)}`}
                      </Text>
                    </View>
                  ) : null}
                </Fragment>
              ))}

              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 8, color: MARCA.gris }}>
                  {`Equipaje: ${equipajeTexto(tramo.equipaje)}`}
                </Text>
              </View>
            </View>
          ))}

          <View style={propios.noteBox} wrap={false}>
            <Text style={propios.noteText}>
              {`Cambios antes de salida: ${v.oferta.cambiosPermitidos ? "Permitidos" : "No permitidos"}`}
              {` · Reembolso antes de salida: ${v.oferta.reembolsoPermitido ? "Permitido" : "No permitido"}`}
            </Text>
          </View>

          <Pie folio={folio} />
        </Page>
      ))}

      {conMapa && (
        <Page size="A4" style={estilos.pagina}>
          <Encabezado documento="Mapa de ruta" />
          <Text style={estilos.titulo}>Mapa del viaje completo</Text>
          <Text style={estilos.subtitulo}>{`Ruta aérea con escala(s) incluida(s)`}</Text>
          <View style={propios.mapContainer}>
            <MapaRuta aeropuertos={aeropuertos} segmentos={segmentosRuta} />
          </View>
          <Text style={propios.legend}>
            Linea azul: ruta de vuelo{` · `}Circulo dorado: aeropuerto{` · `}Origen -&gt; Destino
          </Text>
          <Pie folio={folio} />
        </Page>
      )}
    </Document>
  );
}
