"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/FeedbackProvider";

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function recuperarPassword() {
    if (!email) {
      toast.error("Ingresa tu correo electrónico");
      return;
    }

    setCargando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Usa el dominio actual (localhost en dev, Vercel en producción).
      redirectTo: `${window.location.origin}/update-password`,
    });
    setCargando(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setEnviado(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-green-700 mb-4">
          🔐 Recuperar Contraseña
        </h1>

        {enviado ? (
          <div className="bg-green-100 text-green-700 p-4 rounded-xl">
            Hemos enviado un correo para restablecer tu contraseña. Revisa tu bandeja
            de entrada (y la carpeta de spam).
          </div>
        ) : (
          <>
            <p className="text-slate-500 mb-4">
              Te enviaremos un enlace para crear una nueva contraseña.
            </p>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && recuperarPassword()}
              className="w-full border border-slate-300 rounded-xl p-3 mb-4"
            />
            <button
              onClick={recuperarPassword}
              disabled={cargando}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-3 rounded-xl"
            >
              {cargando ? "Enviando…" : "Enviar enlace"}
            </button>
          </>
        )}

        <div className="text-center mt-6">
          <Link href="/login" className="text-green-700 hover:underline">
            ← Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
