"use client";

import { useEffect, useState } from "react";

interface Props {
  onChange: (id: string | null, respuesta: string) => void;
}

export default function Captcha({ onChange }: Props) {
  const [id, setId] = useState<string | null>(null);

  async function cargar() {
    try {
      const res = await fetch("/api/captcha");
      const data = (await res.json()) as { id?: string; token?: string };
      if (data.id && data.token) {
        setId(data.id);
        onChange(data.id, data.token);
      } else {
        setId(null);
        onChange(null, "");
      }
    } catch (error) {
      console.error("Error cargando verificación:", error);
      setId(null);
      onChange(null, "");
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <>
      {id && (
        <input
          type="hidden"
          name="captchaId"
          value={id}
          readOnly
        />
      )}
    </>
  );
}
