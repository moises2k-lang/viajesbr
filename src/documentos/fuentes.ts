import { join } from "node:path";
import { Font } from "@react-pdf/renderer";

/** Barlow es la tipografía de la marca; los PDF la cargan del disco, no de la red. */
export const FUENTE = "Barlow";

let registrada = false;

export function registrarFuentes(): void {
  if (registrada) return;
  const carpeta = join(process.cwd(), "public", "fuentes");
  Font.register({
    family: FUENTE,
    fonts: [
      { src: join(carpeta, "Barlow-Regular.ttf"), fontWeight: 400 },
      { src: join(carpeta, "Barlow-SemiBold.ttf"), fontWeight: 600 },
      { src: join(carpeta, "Barlow-Bold.ttf"), fontWeight: 700 },
    ],
  });
  registrada = true;
}
