import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { MARCA } from "@/lib/marca";

export type EstadoDocumento =
  | "cotizacion"
  | "confirmada"
  | "prueba"
  | "pendiente"
  | "cancelada";

const COLORES: Record<EstadoDocumento, { fondo: string; texto: string; etiqueta: string }> = {
  cotizacion: { fondo: "#FDF3D7", texto: "#7A5B00", etiqueta: "COTIZACIÓN — NO ES UNA RESERVA" },
  confirmada: { fondo: "#E3F5E9", texto: "#116B34", etiqueta: "RESERVA CONFIRMADA" },
  prueba: { fondo: "#FDE7E7", texto: "#9B1C1C", etiqueta: "DOCUMENTO DE PRUEBA (SANDBOX)" },
  pendiente: { fondo: "#FFF1E0", texto: "#8A4B00", etiqueta: "PENDIENTE DE PAGO" },
  cancelada: { fondo: "#EDEFF3", texto: "#4A5568", etiqueta: "CANCELADA" },
};

const estilos = StyleSheet.create({
  sello: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 3,
    marginBottom: 10,
  },
  texto: { fontSize: 8, fontWeight: 700, letterSpacing: 0.8 },
  aviso: {
    padding: 9,
    borderLeftWidth: 3,
    borderLeftColor: MARCA.oro,
    backgroundColor: "#FBFAF5",
    marginBottom: 12,
    fontSize: 8.5,
    lineHeight: 1.5,
  },
});

export function Sello({ estado }: { estado: EstadoDocumento }) {
  const color = COLORES[estado];
  return (
    <View style={[estilos.sello, { backgroundColor: color.fondo }]}>
      <Text style={[estilos.texto, { color: color.texto }]}>{color.etiqueta}</Text>
    </View>
  );
}

export function Aviso({ children }: { children: string }) {
  return <Text style={estilos.aviso}>{children}</Text>;
}
