import { notFound } from "next/navigation";
import { paquetePorSlug } from "@/lib/experiencias";
import ExperienciaWizard from "@/components/ExperienciaWizard";

export const dynamic = "force-dynamic";

export default async function ExperienciaDetallePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const paquete = await paquetePorSlug(slug);
  if (!paquete) {
    notFound();
  }
  return <ExperienciaWizard paquete={paquete} />;
}
