"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/FeedbackProvider";

export default function UpdatePasswordPage() {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function actualizar() {
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirmar) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password });
    setCargando(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Contraseña actualizada");
    setTimeout(() => (window.location.href = "/login"), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-green-700 mb-4">🔑 Nueva Contraseña</h1>
        <p className="text-slate-500 mb-4">Crea una contraseña nueva para tu cuenta.</p>

        <div className="relative mb-4">
          <input
            type={verPassword ? "text" : "password"}
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-xl p-3 pr-12"
          />
          <button
            type="button"
            onClick={() => setVerPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            aria-label="Mostrar u ocultar contraseña"
          >
            {verPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <input
          type={verPassword ? "text" : "password"}
          placeholder="Confirmar contraseña"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && actualizar()}
          className="w-full border border-slate-300 rounded-xl p-3 mb-4"
        />

        <button
          onClick={actualizar}
          disabled={cargando}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-3 rounded-xl"
        >
          {cargando ? "Guardando…" : "Guardar Contraseña"}
        </button>
      </div>
    </div>
  );
}
