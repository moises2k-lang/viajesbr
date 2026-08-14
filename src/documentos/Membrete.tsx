import { Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { MARCA } from "@/lib/marca";

export const estilos = StyleSheet.create({
  pagina: {
    paddingTop: 34,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#1A2230",
  },
  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: MARCA.oro,
    paddingBottom: 10,
    marginBottom: 16,
  },
  encabezadoTextos: { marginLeft: 10, flexGrow: 1 },
  marcaNombre: { fontSize: 15, fontFamily: "Helvetica-Bold", color: MARCA.azul },
  marcaBajada: { fontSize: 7.5, color: MARCA.gris, letterSpacing: 2.2, marginTop: 2 },
  contacto: { fontSize: 7.5, color: MARCA.gris, textAlign: "right", lineHeight: 1.5 },
  titulo: { fontSize: 17, fontFamily: "Helvetica-Bold", color: MARCA.azul, marginBottom: 4 },
  subtitulo: { fontSize: 9.5, color: MARCA.gris, marginBottom: 14, lineHeight: 1.5 },
  seccion: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: MARCA.azul,
    marginTop: 16,
    marginBottom: 6,
  },
  parrafo: { lineHeight: 1.55, marginBottom: 5 },
  tabla: { borderWidth: 1, borderColor: MARCA.grisClaro, borderRadius: 3 },
  filaEncabezado: { flexDirection: "row", backgroundColor: MARCA.azul },
  fila: { flexDirection: "row", borderTopWidth: 1, borderTopColor: MARCA.grisClaro },
  celdaEncabezado: {
    padding: 6,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  celda: { padding: 6, fontSize: 8.5, lineHeight: 1.45 },
  etiqueta: { fontSize: 7.5, color: MARCA.gris, letterSpacing: 0.6 },
  dato: { fontSize: 10, fontFamily: "Helvetica-Bold", color: MARCA.azul, marginTop: 2 },
  totalCaja: {
    marginTop: 14,
    padding: 12,
    backgroundColor: "#F4F6FA",
    borderLeftWidth: 3,
    borderLeftColor: MARCA.oro,
  },
  pie: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: MARCA.grisClaro,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: MARCA.gris,
  },
});

export function Logotipo({ tamano = 34 }: { tamano?: number }) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 96 96">
      <Rect width="96" height="96" rx="26" fill={MARCA.azul} />
      <Path d="M22 78 C 38 44, 61 27, 77 22" stroke={MARCA.oro} strokeWidth={4.5} fill="none" />
      <Path d="M45 69 L78 23 L74 73 L64 61 Z" fill="#FFFFFF" />
    </Svg>
  );
}

export function Encabezado({ documento }: { documento: string }) {
  return (
    <View style={estilos.encabezado} fixed>
      <Logotipo />
      <View style={estilos.encabezadoTextos}>
        <Text style={estilos.marcaNombre}>{MARCA.nombre}</Text>
        <Text style={estilos.marcaBajada}>{documento.toUpperCase()}</Text>
      </View>
      <View>
        <Text style={estilos.contacto}>{MARCA.sitio}</Text>
        <Text style={estilos.contacto}>{MARCA.correo}</Text>
        <Text style={estilos.contacto}>{MARCA.telefono}</Text>
      </View>
    </View>
  );
}

export function Pie({ folio }: { folio: string }) {
  return (
    <View style={estilos.pie} fixed>
      <Text>
        {MARCA.nombre} · {folio}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}
