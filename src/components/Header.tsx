"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, Settings, LogOut, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useConfirm, useToast } from "@/components/ui/FeedbackProvider";

export default function Header({ onAbrirMenu }: { onAbrirMenu: () => void }) {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [abierto, setAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const confirmar = useConfirm();
  const toast = useToast();

  useEffect(() => {
    const obtenerUsuario = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        setNombre((user.user_metadata?.nombre as string) || "");
      }
    };
    obtenerUsuario();
  }, []);

  // Cerrar el menú al hacer clic fuera.
  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", alClic);
    return () => document.removeEventListener("mousedown", alClic);
  }, [abierto]);

  const inicial = (nombre || email || "?")[0]?.toUpperCase() || "?";

  const cerrarSesion = async () => {
    setAbierto(false);
    const ok = await confirmar({
      titulo: "Cerrar sesión",
      mensaje: "¿Seguro que deseas salir de tu cuenta?",
      textoConfirmar: "Cerrar sesión",
      peligro: true,
    });
    if (!ok) return;
    await supabase.auth.signOut();
    toast.info("Sesión cerrada");
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-8 py-4">
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          {/* Botón menú (solo móvil) */}
          <button
            onClick={onAbrirMenu}
            className="lg:hidden text-slate-600 hover:text-green-700 p-1"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-800">
              🌱 AgroJequetepeque
            </h1>
            <p className="hidden sm:block text-slate-500 text-sm">
              Gestión Agrícola Inteligente
            </p>
          </div>
        </div>

        {/* Avatar + menú de usuario */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setAbierto((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-green-100 px-2 sm:px-3 py-2 hover:bg-green-200 transition-colors"
            aria-haspopup="menu"
            aria-expanded={abierto}
          >
            <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {inicial}
            </span>
            <span className="hidden sm:block text-slate-700 text-sm truncate max-w-[160px]">
              {nombre || email}
            </span>
            <ChevronDown
              className={`hidden sm:block w-4 h-4 text-slate-500 transition-transform ${
                abierto ? "rotate-180" : ""
              }`}
            />
          </button>

          {abierto && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden z-30"
            >
              {/* Cabecera con datos del usuario */}
              <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                <span className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold shrink-0">
                  {inicial}
                </span>
                <div className="min-w-0">
                  {nombre && (
                    <p className="font-semibold text-slate-800 truncate">
                      {nombre}
                    </p>
                  )}
                  <p className="text-slate-500 text-sm truncate">{email}</p>
                </div>
              </div>

              <Link
                href="/dashboard/configuracion"
                onClick={() => setAbierto(false)}
                className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 transition-colors"
                role="menuitem"
              >
                <Settings className="w-5 h-5 text-slate-500" />
                Configuración
              </Link>

              <button
                onClick={cerrarSesion}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                role="menuitem"
              >
                <LogOut className="w-5 h-5" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
