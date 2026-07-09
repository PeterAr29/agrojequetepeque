"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Header({ onAbrirMenu }: { onAbrirMenu: () => void }) {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const obtenerUsuario = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setEmail(user.email || "");
    };
    obtenerUsuario();
  }, []);

  const inicial = email ? email[0].toUpperCase() : "?";

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-8 py-4">
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          {/* Botón menú (solo móvil) */}
          <button
            onClick={onAbrirMenu}
            className="lg:hidden text-2xl text-slate-600 hover:text-green-700 p-1"
            aria-label="Abrir menú"
          >
            ☰
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

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex bg-green-100 px-4 py-2 rounded-xl items-center gap-2 max-w-[220px]">
            <span className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {inicial}
            </span>
            <span className="text-slate-700 text-sm truncate">{email}</span>
          </div>
          {/* Solo avatar en móvil */}
          <span className="sm:hidden w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
            {inicial}
          </span>
        </div>
      </div>
    </header>
  );
}
