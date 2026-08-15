"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface Props {
  onChange: (id: string | null, respuesta: string) => void;
}

export default function Captcha({ onChange }: Props) {
  const { t } = useI18n();
  const [captcha, setCaptcha] = useState<{ id: string; pregunta: string } | null>(null);
  const [respuesta, setRespuesta] = useState("");

  async function cargar() {
    try {
      const res = await fetch("/api/captcha");
      const data = (await res.json()) as { id?: string; pregunta?: string };
      if (data.id && data.pregunta) {
        setCaptcha({ id: data.id, pregunta: data.pregunta });
        setRespuesta("");
        onChange(data.id, "");
      }
    } catch (error) {
      console.error("Error cargando captcha:", error);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function handleChange(val: string) {
    setRespuesta(val);
    onChange(captcha?.id ?? null, val);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-[#0B2545]">{t("common.captchaTitle")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex min-w-[5rem] items-center justify-center rounded-md bg-[#E4E8EE] px-3 py-2 text-sm font-bold text-[#0B2545]">
          {captcha?.pregunta ?? "…"}
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={respuesta}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t("common.captchaPlaceholder")}
          required
          className="w-28 rounded-md border border-[#14477E] bg-white px-3 py-2 text-sm font-semibold text-[#0B2545] placeholder:text-[#5A6B80] focus:border-[#0B2545] focus:outline-none"
        />
      </div>
    </div>
  );
}
