import { Document, Page, Text, View } from "@react-pdf/renderer";
import { Encabezado, Pie, estilos } from "./Membrete";
import { Aviso, Sello, type EstadoDocumento } from "./Sello";
import type { BloqueDocumento, ItinerarioDocumento } from "@/lib/documentos";
import { formatoFecha, formatoMoneda } from "@/lib/marca";

const TIPOS: Record<string, string> = {
  vuelo: "Vuelo",
  hotel: "Hospedaje",
  traslado: "Traslado",
  actividad: "Actividad",
  servicio: "Servicio",
  nota: "Nota",
};

const ESTADOS: Record<string, EstadoDocumento> = {
  borrador: "cotizacion",
  cotizacion: "cotizacion",
  confirmado: "confirmada",
  cancelado: "cancelada",
};

function rango(bloque: BloqueDocumento): string {
  if (!bloque.fecha) {
    return "Por definir";
  }
  if (bloque.fecha_fin && bloque.fecha_fin !== bloque.fecha) {
    return `${formatoFecha(bloque.fecha)}\nal ${formatoFecha(bloque.fecha_fin)}`;
  }
  return formatoFecha(bloque.fecha);
}

export function DocumentoItinerario({
  itinerario,
  bloques,
  interno,
}: {
  itinerario: ItinerarioDocumento;
  bloques: BloqueDocumento[];
  interno: boolean;
}) {
  const estado = ESTADOS[itinerario.estado] ?? "cotizacion";
  const esCotizacion = estado === "cotizacion";
  const total = bloques.reduce((suma, b) => suma + Number(b.precio_venta ?? 0), 0);
  const neto = bloques.reduce((suma, b) => suma + Number(b.costo_neto ?? 0), 0);
  const folio = `Itinerario IATP-${itinerario.id.padStart(5, "0")}`;

  return (
    <Document
      title={`${itinerario.titulo} · IA Travel Planning`}
      author="IA Travel Planning"
      subject="Itinerario de viaje"
    >
      <Page size="LETTER" style={estilos.pagina}>
        <Encabezado documento="Itinerario de viaje" />
        <Sello estado={estado} />
        <Text style={estilos.titulo}>{itinerario.titulo}</Text>
        <Text style={estilos.subtitulo}>
          {`Preparado para ${itinerario.cliente} · ${formatoFecha(itinerario.creado_en)} · ${folio}`}
        </Text>

        {esCotizacion ? (
          <Aviso>
            No se compró ni apartó nada. Este documento es una propuesta: las tarifas y la
            disponibilidad cambian sin aviso y sólo quedan garantizadas cuando emitimos la reserva y
            recibes tu clave de confirmación.
          </Aviso>
        ) : null}

        {itinerario.resumen ? (
          <>
            <Text style={estilos.seccion}>Resumen del viaje</Text>
            <Text style={estilos.parrafo}>{itinerario.resumen}</Text>
          </>
        ) : null}

        <Text style={estilos.seccion}>Cómo leer este itinerario</Text>
        <Text style={estilos.parrafo}>
          · Los bloques están en orden cronológico: cada renglón es un vuelo, un hospedaje, un
          traslado o una actividad.
        </Text>
        <Text style={estilos.parrafo}>
          · Los horarios son locales de cada ciudad y las fechas de hospedaje se muestran como
          entrada y salida.
        </Text>
        <Text style={estilos.parrafo}>
          · El precio de cada bloque es final para ti: ya incluye impuestos, cargos del proveedor y
          nuestros servicios.
        </Text>

        <Text style={estilos.seccion}>Itinerario propuesto</Text>
        <View style={estilos.tabla}>
          <View style={estilos.filaEncabezado}>
            <Text style={[estilos.celdaEncabezado, { width: "18%" }]}>FECHA</Text>
            <Text style={[estilos.celdaEncabezado, { width: "13%" }]}>CONCEPTO</Text>
            <Text style={[estilos.celdaEncabezado, { width: "39%" }]}>DETALLE</Text>
            <Text style={[estilos.celdaEncabezado, { width: "15%" }]}>PROVEEDOR</Text>
            <Text style={[estilos.celdaEncabezado, { width: "15%", textAlign: "right" }]}>
              PRECIO
            </Text>
          </View>
          {bloques.map((b) => (
            <View style={estilos.fila} key={b.id} wrap={false}>
              <Text style={[estilos.celda, { width: "18%" }]}>{rango(b)}</Text>
              <Text style={[estilos.celda, { width: "13%" }]}>{TIPOS[b.tipo] ?? b.tipo}</Text>
              <Text style={[estilos.celda, { width: "39%" }]}>
                {b.titulo}
                {b.detalle ? `\n${b.detalle}` : ""}
              </Text>
              <Text style={[estilos.celda, { width: "15%" }]}>{b.proveedor ?? "—"}</Text>
              <Text style={[estilos.celda, { width: "15%", textAlign: "right" }]}>
                {b.precio_venta == null
                  ? "Incluido"
                  : formatoMoneda(Number(b.precio_venta), itinerario.moneda)}
              </Text>
            </View>
          ))}
        </View>

        <View style={estilos.totalCaja} wrap={false}>
          <Text style={estilos.etiqueta}>
            {esCotizacion ? "INVERSIÓN TOTAL ESTIMADA" : "TOTAL DEL VIAJE"}
          </Text>
          <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: "#0B2545" }}>
            {formatoMoneda(total, itinerario.moneda)}
          </Text>
          {interno ? (
            <Text style={{ fontSize: 8, marginTop: 5, color: "#5A6B80" }}>
              {`Uso interno · costo neto ${formatoMoneda(neto, itinerario.moneda)} · margen ${formatoMoneda(total - neto, itinerario.moneda)}`}
            </Text>
          ) : null}
        </View>

        <Text style={estilos.seccion}>Condiciones y advertencias</Text>
        <Text style={estilos.parrafo}>
          · Las tarifas aéreas y de hotel se confirman al momento de emitir; si el proveedor sube el
          precio te avisamos antes de cobrar.
        </Text>
        <Text style={estilos.parrafo}>
          · Cada vuelo y cada hotel tienen sus propias reglas de cambio, cancelación y equipaje: las
          detallamos en la confirmación de cada reserva.
        </Text>
        <Text style={estilos.parrafo}>
          · Revisa visas, escalas con cambio de terminal y vigencia del pasaporte (seis meses en la
          mayoría de destinos). Podemos ayudarte a verificarlo, pero la documentación es
          responsabilidad del viajero.
        </Text>
        <Text style={estilos.parrafo}>
          · Recomendamos seguro de viaje con cobertura médica y de cancelación; lo cotizamos si lo
          pides.
        </Text>

        <Text style={estilos.seccion}>Glosario</Text>
        <Text style={estilos.parrafo}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>PNR:</Text> clave de reserva de la
          aerolínea, seis caracteres, con la que consultas tu vuelo directamente con ella.
        </Text>
        <Text style={estilos.parrafo}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Escala vs. conexión:</Text> escala es una
          parada del mismo vuelo; conexión implica cambiar de avión y, a veces, de terminal.
        </Text>
        <Text style={estilos.parrafo}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Equipaje documentado:</Text> el que viaja en
          la bodega. El de mano va contigo en cabina y casi siempre tiene límite de peso y medidas.
        </Text>
        <Text style={estilos.parrafo}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Prebook:</Text> paso previo a pagar un
          hotel, donde el proveedor congela el precio unos minutos.
        </Text>

        <Pie folio={folio} />
      </Page>
    </Document>
  );
}
