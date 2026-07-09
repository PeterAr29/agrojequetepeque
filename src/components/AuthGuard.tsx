"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Protege las rutas del dashboard. Comprueba la sesión de Supabase:
 * - Si no hay sesión, redirige a /login.
 * - Mientras comprueba, muestra una pantalla de carga.
 * - Se suscribe a cambios de auth (p. ej. cerrar sesión en otra pestaña).
 */
export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    let activo = true;

    const comprobarSesion = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!activo) return;

      if (!session) {
        router.replace("/login");
        return;
      }

      setVerificando(false);
    };

    comprobarSesion();

    // Reacciona a cambios de sesión (login/logout) en tiempo real.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (verificando) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-green-700">
        <div className="text-5xl mb-4 animate-pulse">🌱</div>
        <p className="text-slate-600 font-medium">Cargando…</p>
      </div>
    );
  }

  return <>{children}</>;
}
