"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/FeedbackProvider";

export default function RegisterPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  const register = async () => {
    if (!email) {
      toast.error("Ingresa tu correo electrónico");
      return;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirmar) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setCargando(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setCargando(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Registro exitoso. Revisa tu correo para confirmar la cuenta.");
    setTimeout(() => (window.location.href = "/login"), 1500);
  };

  return (
    <div className="min-h-screen flex">
      {/* PANEL IZQUIERDO */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-green-700 to-green-900 text-white p-16 flex-col justify-center">
        <h1 className="text-6xl font-bold mb-6">🌱 AgroJequetepeque</h1>
        <p className="text-2xl text-green-100 leading-relaxed">
          Crea tu cuenta y comienza a gestionar tu producción agrícola de forma
          inteligente.
        </p>
        <div className="mt-12 space-y-4 text-lg">
          <p>🚜 Gestión de Parcelas</p>
          <p>🌱 Control de Cultivos</p>
          <p>💧 Programación de Riegos</p>
          <p>📈 Producción y Rendimiento</p>
          <p>💰 Finanzas Agrícolas</p>
        </div>
      </div>

      {/* FORMULARIO */}
      <div className="flex-1 flex items-center justify-center bg-slate-100 p-6">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🌱</div>
            <h2 className="text-3xl font-bold text-slate-800">Crear Cuenta</h2>
            <p className="text-slate-500 mt-2">Regístrate para comenzar</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-green-500 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={verPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-slate-300 rounded-xl p-3 pr-12 focus:ring-2 focus:ring-green-500 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Confirmar Contraseña
              </label>
              <input
                type={verPassword ? "text" : "password"}
                placeholder="Repite la contraseña"
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-green-500 outline-none"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && register()}
              />
            </div>

            <button
              onClick={register}
              disabled={cargando}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition"
            >
              {cargando ? "Creando cuenta…" : "Crear Cuenta"}
            </button>

            <p className="text-center text-slate-600">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-green-600 font-semibold">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
