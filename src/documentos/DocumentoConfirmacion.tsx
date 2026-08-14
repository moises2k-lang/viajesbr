import { Document, Page, Text, View } from "@react-pdf/renderer";
import { Encabezado, Pie, estilos } from "./Membrete";
import { Aviso, Sello, type EstadoDocumento } from "./Sello";
import type { OrdenDocumento, PasajeroDocumento } from "@/lib/documentos";
import type { RebanadaOferta, SegmentoOferta } from "@/lib/duffel";
import { duracionLegible, formatoFecha, formatoHora, formatoMoneda } from "@/lib/marca";

const TIPOS: Record<string, string> = {
  adult: "Adulto",
  child: "Menor",
  infant_without_seat: "Bebé sin asiento",
};

function equipaje(segmento: SegmentoOferta): string {
  const bolsas = segmento.passengers?.[0]?.baggages ?? [];
  if (!bolsas.length) {
    return "Según tarifa";
  }
  const texto = bolsas
    .filter((b) => b.quantity > 0)
    .map((b) => `${b.quantity} ${b.type === "carry_on" ? "de mano" : "documentada"}`);
  return texto.length ? texto.join(" · ") : "Sin equipaje incluido";
}

const TRATAMIENTOS: Record<string, string> = {
  mr: "Sr.",
  mrs: "Sra.",
  ms: "Sra.",
  miss: "Srta.",
  dr: "Dr.",
};

function tratamiento(titulo: string | null): string {
  if (!titulo) {
    return "";
  }
  const clave = titulo.toLowerCase().replace(/\.$/, "");
  return `${TRATAMIENTOS[clave] ?? titulo} `;
}

function Tramo({ rebanada, indice }: { rebanada: RebanadaOferta; indice: number }) {
  return (
    <View wrap={false}>
      <Text style={estilos.seccion}>
        {`Tramo ${indice + 1}: ${rebanada.origin.iata_code} – ${rebanada.destination.iata_code}`}
        {rebanada.duration ? ` · ${duracionLegible(rebanada.duration)}` : ""}
      </Text>
      <View style={estilos.tabla}>
        <View style={estilos.filaEncabezado}>
          <Text style={[estilos.celdaEncabezado, { width: "22%" }]}>FECHA</Text>
          <Text style={[estilos.celdaEncabezado, { width: "26%" }]}>VUELO</Text>
          <Text style={[estilos.celdaEncabezado, { width: "26%" }]}>RUTA Y HORARIO</Text>
          <Text style={[estilos.celdaEncabezado, { width: "13%" }]}>CABINA</Text>
          <Text style={[estilos.celdaEncabezado, { width: "13%" }]}>EQUIPAJE</Text>
        </View>
        {rebanada.segments.map((s) => (
          <View style={estilos.fila} key={s.id}>
            <Text style={[estilos.celda, { width: "22%" }]}>{formatoFecha(s.departing_at)}</Text>
            <Text style={[estilos.celda, { width: "26%" }]}>
              {`${s.marketing_carrier.name} ${s.marketing_carrier.iata_code}${s.marketing_carrier_flight_number}`}
              {s.aircraft?.name ? `\n${s.aircraft.name}` : ""}
            </Text>
            <Text style={[estilos.celda, { width: "26%" }]}>
              {`${s.origin.iata_code} ${formatoHora(s.departing_at)} – ${s.destination.iata_code} ${formatoHora(s.arriving_at)}`}
              {s.duration ? `\n${duracionLegible(s.duration)}` : ""}
            </Text>
            <Text style={[estilos.celda, { width: "13%" }]}>
              {s.passengers?.[0]?.cabin_class_marketing_name ?? "—"}
            </Text>
            <Text style={[estilos.celda, { width: "13%" }]}>{equipaje(s)}</Text>
          </View>
        ))}
      </View>
      {rebanada.segments.length > 1 ? (
        <Text style={[estilos.parrafo, { marginTop: 5, fontSize: 8 }]}>
          Este tramo tiene escala. El equipaje y la conexión dependen de la aerolínea: confirma en
          el mostrador si necesitas recoger maletas entre vuelos.
        </Text>
      ) : null}
    </View>
  );
}

export function DocumentoConfirmacion({
  orden,
  pasajeros,
  interno,
}: {
  orden: OrdenDocumento;
  pasajeros: PasajeroDocumento[];
  interno: boolean;
}) {
  const esPrueba = orden.ambiente !== "produccion";
  const estado: EstadoDocumento = esPrueba
    ? "prueba"
    : orden.estado === "confirmada"
      ? "confirmada"
      : orden.estado === "cancelada"
        ? "cancelada"
        : "pendiente";
  const cambios = orden.respuesta.conditions?.change_before_departure;
  const reembolsos = orden.respuesta.conditions?.refund_before_departure;
  const folio = `Reserva ${orden.pnr ?? orden.duffel_order_id}`;

  return (
    <Document
      title={`${folio} · IA Travel Planning`}
      author="IA Travel Planning"
      subject="Confirmación de reserva de vuelo"
    >
      <Page size="LETTER" style={estilos.pagina}>
        <Encabezado documento="Confirmación de reserva" />
        <Sello estado={estado} />
        <Text style={estilos.titulo}>
          {orden.respuesta.slices[0]?.origin.city_name ?? orden.respuesta.slices[0]?.origin.iata_code}
          {" – "}
          {orden.respuesta.slices.at(-1)?.destination.city_name ??
            orden.respuesta.slices.at(-1)?.destination.iata_code}
        </Text>
        <Text style={estilos.subtitulo}>
          {`Emitida el ${formatoFecha(orden.creado_en)} · ${pasajeros.length} ${
            pasajeros.length === 1 ? "pasajero" : "pasajeros"
          }`}
        </Text>

        {esPrueba ? (
          <Aviso>
            Este documento se generó en el ambiente de pruebas (sandbox) del proveedor: la clave de
            reserva NO existe en los sistemas de la aerolínea y no da derecho a viajar. Sirve
            únicamente para validar el formato del documento.
          </Aviso>
        ) : null}

        <View style={{ flexDirection: "row", gap: 18, marginBottom: 4 }}>
          <View>
            <Text style={estilos.etiqueta}>CLAVE DE RESERVA (PNR)</Text>
            <Text style={estilos.dato}>{orden.pnr ?? "—"}</Text>
          </View>
          <View>
            <Text style={estilos.etiqueta}>REFERENCIA INTERNA</Text>
            <Text style={estilos.dato}>{`IATP-${orden.id.padStart(5, "0")}`}</Text>
          </View>
          <View>
            <Text style={estilos.etiqueta}>ESTADO</Text>
            <Text style={estilos.dato}>{orden.estado.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={estilos.etiqueta}>CONTACTO DEL VIAJERO</Text>
            <Text style={estilos.dato}>{orden.contacto_email ?? "—"}</Text>
          </View>
        </View>

        <Text style={estilos.seccion}>Pasajeros</Text>
        <View style={estilos.tabla}>
          <View style={estilos.filaEncabezado}>
            <Text style={[estilos.celdaEncabezado, { width: "8%" }]}>#</Text>
            <Text style={[estilos.celdaEncabezado, { width: "46%" }]}>NOMBRE COMPLETO</Text>
            <Text style={[estilos.celdaEncabezado, { width: "23%" }]}>TIPO</Text>
            <Text style={[estilos.celdaEncabezado, { width: "23%" }]}>NACIMIENTO</Text>
          </View>
          {pasajeros.map((p, i) => (
            <View style={estilos.fila} key={`${p.nombre}-${p.apellido}-${i}`}>
              <Text style={[estilos.celda, { width: "8%" }]}>{i + 1}</Text>
              <Text style={[estilos.celda, { width: "46%" }]}>
                {`${tratamiento(p.titulo)}${p.nombre} ${p.apellido}`}
              </Text>
              <Text style={[estilos.celda, { width: "23%" }]}>{TIPOS[p.tipo] ?? p.tipo}</Text>
              <Text style={[estilos.celda, { width: "23%" }]}>
                {formatoFecha(p.fecha_nacimiento)}
              </Text>
            </View>
          ))}
        </View>

        {orden.respuesta.slices.map((rebanada, i) => (
          <Tramo rebanada={rebanada} indice={i} key={rebanada.id} />
        ))}

        <View style={estilos.totalCaja} wrap={false}>
          <Text style={estilos.etiqueta}>TOTAL PAGADO POR EL VIAJERO</Text>
          <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: "#0B2545" }}>
            {formatoMoneda(Number(orden.precio_venta), orden.moneda)}
          </Text>
          {interno ? (
            <Text style={{ fontSize: 8, marginTop: 5, color: "#5A6B80" }}>
              {`Uso interno · costo neto ${formatoMoneda(Number(orden.costo_neto), orden.moneda)} · margen ${formatoMoneda(Number(orden.markup), orden.moneda)} · orden ${orden.duffel_order_id}`}
            </Text>
          ) : (
            <Text style={{ fontSize: 8, marginTop: 5, color: "#5A6B80" }}>
              Incluye impuestos y cargos del boleto, así como los servicios de gestión de IA Travel
              Planning.
            </Text>
          )}
        </View>

        <Text style={estilos.seccion}>Condiciones de la tarifa</Text>
        <Text style={estilos.parrafo}>
          {`Cambios antes de la salida: ${
            cambios == null
              ? "consultar con la aerolínea"
              : cambios.allowed
                ? `permitidos${cambios.penalty_amount ? ` con penalización de ${formatoMoneda(Number(cambios.penalty_amount), orden.moneda)}` : " sin penalización"}`
                : "no permitidos"
          }.`}
        </Text>
        <Text style={estilos.parrafo}>
          {`Reembolso antes de la salida: ${
            reembolsos == null
              ? "consultar con la aerolínea"
              : reembolsos.allowed
                ? `permitido${reembolsos.penalty_amount ? ` con penalización de ${formatoMoneda(Number(reembolsos.penalty_amount), orden.moneda)}` : " sin penalización"}`
                : "no permitido"
          }.`}
        </Text>

        <Text style={estilos.seccion}>Antes de viajar</Text>
        <Text style={estilos.parrafo}>
          · Los nombres deben coincidir exactamente con el pasaporte o identificación con la que
          viajas; un cambio de nombre puede requerir reemitir el boleto.
        </Text>
        <Text style={estilos.parrafo}>
          · Verifica requisitos de visa, tránsito y vigencia de pasaporte (mínimo seis meses en la
          mayoría de destinos). IA Travel Planning no responde por documentación incompleta.
        </Text>
        <Text style={estilos.parrafo}>
          · Preséntate en el aeropuerto tres horas antes en vuelos internacionales y dos en
          nacionales; el check-in en línea suele abrir 24 horas antes.
        </Text>
        <Text style={estilos.parrafo}>
          · Los horarios son locales de cada aeropuerto y pueden cambiar por decisión de la
          aerolínea; te avisamos si detectamos una modificación.
        </Text>

        <Pie folio={folio} />
      </Page>
    </Document>
  );
}
