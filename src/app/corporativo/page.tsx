import type { Metadata } from "next";
import CorporativoWizard from "@/components/CorporativoWizard";

export const metadata: Metadata = {
  title: "Viajes Corporativos | IA Travel Planning",
  description: "Cotización de viajes corporativos, incentivos, convenciones y MICE. Vuelos, hoteles y traslados.",
};

export default function CorporativoPage() {
  return <CorporativoWizard />;
}
