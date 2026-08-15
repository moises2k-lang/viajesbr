"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import Captcha from "@/components/Captcha";
import { useI18n } from "@/lib/i18n";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
}

export default function AuthModal({ abierto, onCerrar }: Props) {
  const { iniciarSesion, registrar } = useAuth();
  const { t } = useI18n();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [captchaRespuesta, setCaptchaRespuesta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!abierto) return null;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (modo === "registro" && password !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setCargando(true);
    try {
      if (modo === "login") {
        await iniciarSesion(email, password);
      } else {
        await registrar(email, password, nombre || undefined, captchaId ?? undefined, captchaRespuesta || undefined);
      }
      setNombre("");
      setEmail("");
      setPassword("");
      setConfirmar("");
      setCaptchaId(null);
      setCaptchaRespuesta("");
      onCerrar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#0B2545]">
            {modo === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>
          <button
            className="rounded-full p-1 text-[#5A6B80] hover:bg-[#E4E8EE]"
            onClick={onCerrar}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={enviar}>
          {modo === "registro" && (
            <label className="block text-sm">
              Nombre
              <input
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
                onChange={(e) => setNombre(e.target.value)}
                type="text"
                value={nombre}
              />
            </label>
          )}
          <label className="block text-sm">
            Correo
            <input
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              value={email}
            />
          </label>
          <label className="block text-sm">
            Contraseña
            <input
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              value={password}
            />
          </label>
          {modo === "registro" && (
            <label className="block text-sm">
              Confirmar contraseña
              <input
                required
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
                minLength={6}
                onChange={(e) => setConfirmar(e.target.value)}
                type="password"
                value={confirmar}
              />
            </label>
          )}

          {modo === "registro" && (
            <Captcha
              onChange={(id, respuesta) => {
                setCaptchaId(id);
                setCaptchaRespuesta(respuesta);
              }}
            />
          )}

          {error && (
            <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            className="w-full rounded-lg bg-[#0B2545] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            disabled={cargando || (modo === "registro" && (!captchaId || !captchaRespuesta))}
            type="submit"
          >
            {cargando
              ? "Procesando…"
              : modo === "login"
                ? "Entrar"
                : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[#5A6B80]">
          {modo === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button
            className="font-semibold text-[#14477E] underline"
            onClick={() => {
              setModo(modo === "login" ? "registro" : "login");
              setError(null);
            }}
            type="button"
          >
            {modo === "login" ? "Regístrate" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}
