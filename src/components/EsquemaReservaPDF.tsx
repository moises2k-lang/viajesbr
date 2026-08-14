import { Fragment } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import path from "node:path";

const regular = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Barlow-Regular.ttf",
);
const bold = path.join(process.cwd(), "public", "fonts", "Barlow-Bold.ttf");

Font.register({
  family: "Barlow",
  fonts: [
    { src: regular, fontWeight: 400 },
    { src: bold, fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Barlow",
    fontSize: 10,
    color: "#0B2545",
  },
  header: {
    backgroundColor: "#0B2545",
    padding: 16,
    margin: -32,
    marginBottom: 16,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: 700,
  },
  headerSubtitle: {
    color: "#ffffff",
    fontSize: 10,
    marginTop: 4,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#14477E",
    marginBottom: 6,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E4E8EE",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E4E8EE",
  },
  cell: {
    flex: 1,
  },
  col2: { flex: 2 },
  col3: { flex: 3 },
  note: {
    backgroundColor: "#FFF6E0",
    padding: 8,
    marginTop: 12,
    borderRadius: 4,
  },
  noteText: { color: "#8A6A00" },
  totalBox: {
    marginTop: 16,
    backgroundColor: "#F5F7FA",
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 12, fontWeight: 700 },
  totalValue: { fontSize: 12, fontWeight: 700, color: "#0B2545" },
});

function formatoFecha(fecha: string) {
  try {
    return new Date(`${fecha}T00:00:00Z`).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return fecha;
  }
}

function formatoMoneda(monto: number, moneda?: string) {
  return `${moneda ?? "USD"} ${monto.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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

function textoPasajeros(resumen: string | null) {
  if (!resumen) return "No informado";
  const partes = resumen.split(" · ");
  if (partes.length >= 2) return partes[0];
  return resumen;
}

export default function EsquemaReservaPDF({
  itinerario,
  bloques,
}: {
  itinerario: Itinerario;
  bloques: Bloque[];
}) {
  const total = bloques.reduce(
    (sum, b) => sum + (typeof b.precio_venta === "number" ? b.precio_venta : 0),
    0,
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{itinerario.titulo}</Text>
          <Text style={styles.headerSubtitle}>
            {itinerario.estado.toUpperCase()} · {formatoFecha(itinerario.creado_en)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Cliente</Text>
        <View>
          <Text>{itinerario.cliente}</Text>
          <Text>{itinerario.resumen}</Text>
        </View>

        <Text style={styles.sectionTitle}>Itinerario</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.col2}>Día / Fecha</Text>
          <Text style={styles.col3}>Servicio</Text>
          <Text style={styles.col2}>Detalle</Text>
          <Text style={styles.cell}>Precio</Text>
        </View>
        {bloques.map((bloque, i) => (
          <View key={bloque.id} style={styles.tableRow}>
            <Text style={styles.col2}>
              {bloque.fecha ? `${i + 1} · ${formatoFecha(bloque.fecha)}` : `Día ${i + 1}`}
              {bloque.fecha_fin && bloque.fecha_fin !== bloque.fecha
                ? ` – ${formatoFecha(bloque.fecha_fin)}`
                : ""}
            </Text>
            <Text style={styles.col3}>{bloque.titulo}</Text>
            <Text style={styles.col2}>{bloque.detalle ?? "—"}</Text>
            <Text style={styles.cell}>
              {typeof bloque.precio_venta === "number"
                ? formatoMoneda(bloque.precio_venta, itinerario.moneda)
                : "—"}
            </Text>
          </View>
        ))}

        {bloques.map((bloque) => {
          const datos =
            typeof bloque.datos === "object" && bloque.datos !== null
              ? (bloque.datos as Record<string, unknown>)
              : {};
          if (bloque.tipo === "vuelo" && datos.oferta) {
            const oferta = datos.oferta as {
              tramos: {
                origen: string;
                destino: string;
                segmentos: {
                  vuelo: string;
                  origen: string;
                  destino: string;
                  sale: string;
                  llega: string;
                  aerolinea: string;
                }[];
              }[];
            };
            return (
              <Fragment key={`det-${bloque.id}`}>
                <Text style={styles.sectionTitle}>Detalle del vuelo</Text>
                <View style={styles.tableHeader}>
                  <Text style={styles.cell}>Tramo</Text>
                  <Text style={styles.cell}>Vuelo</Text>
                  <Text style={styles.cell}>Sale</Text>
                  <Text style={styles.cell}>Llega</Text>
                </View>
                {oferta.tramos.map((tramo, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.cell}>
                      {tramo.origen} → {tramo.destino}
                    </Text>
                    <Text style={styles.cell}>
                      {tramo.segmentos.map((s) => s.vuelo).join(" · ")}
                    </Text>
                    <Text style={styles.cell}>
                      {tramo.segmentos[0]?.sale.slice(11, 16)}
                    </Text>
                    <Text style={styles.cell}>
                      {tramo.segmentos[tramo.segmentos.length - 1]?.llega.slice(11, 16)}
                    </Text>
                  </View>
                ))}
              </Fragment>
            );
          }
          if (bloque.tipo === "hotel" && datos.hotel) {
            const hotel = datos.hotel as { nombre: string; direccion?: string | null; noches: number };
            const habitacion = (datos.habitacion as { habitacion?: string }) ?? {};
            return (
              <View key={`det-${bloque.id}`} style={styles.note}>
                <Text style={styles.noteText}>
                  Hotel: {hotel.nombre} ({hotel.noches} noches) — {habitacion.habitacion ?? ""}
                  {hotel.direccion ? ` · ${hotel.direccion}` : ""}
                </Text>
              </View>
            );
          }
          return null;
        })}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total estimado</Text>
          <Text style={styles.totalValue}>
            {formatoMoneda(total, itinerario.moneda)}
          </Text>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            Nota: Precios sujetos a disponibilidad y cambio sin previo aviso.
            Tarifa sujeta a condiciones de la aerolínea y del hotel.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
