"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

/**
 * Estructura del dashboard: coordina el estado del menú lateral
 * (abierto/cerrado) para que funcione como cajón deslizable en móvil
 * y como barra fija en escritorio.
 */
export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="flex bg-slate-100 min-h-screen">
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header onAbrirMenu={() => setMenuAbierto(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
