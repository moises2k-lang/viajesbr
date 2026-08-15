"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface Usuario {
  id: string;
  email: string;
  nombre: string | null;
}

interface AuthState {
  usuario: Usuario | null;
  cargando: boolean;
}

interface AuthContextValue extends AuthState {
  iniciarSesion: (email: string, password: string) => Promise<void>;
  registrar: (email: string, password: string, nombre?: string, captchaId?: string, captchaRespuesta?: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  refrescar: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  async function refrescar() {
    try {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as { usuario?: Usuario | null };
      setUsuario(data.usuario ?? null);
    } catch {
      setUsuario(null);
    }
  }

  async function parseRespuesta(res: Response) {
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("application/json")) {
      return (await res.json()) as { error?: string } & Partial<Usuario>;
    }
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  async function iniciarSesion(email: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseRespuesta(res);
    if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar sesión");
    setUsuario(data as Usuario);
  }

  async function registrar(email: string, password: string, nombre?: string, captchaId?: string, captchaRespuesta?: string) {
    const res = await fetch("/api/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, nombre, captchaId, captchaRespuesta }),
    });
    const data = await parseRespuesta(res);
    if (!res.ok) throw new Error(data.error ?? "No se pudo crear la cuenta");
    setUsuario(data as Usuario);
  }

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUsuario(null);
  }

  useEffect(() => {
    refrescar().finally(() => setCargando(false));
  }, []);

  return (
    <AuthContext.Provider
      value={{ usuario, cargando, iniciarSesion, registrar, cerrarSesion, refrescar }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
