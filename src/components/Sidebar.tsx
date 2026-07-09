"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useConfirm, useToast } from "@/components/ui/FeedbackProvider";

const menu = [
  { nombre: "Dashboard", ruta: "/dashboard", icono: "📊" },
  { nombre: "Clima", ruta: "/dashboard/clima", icono: "🌦️" },
  { nombre: "Parcelas", ruta: "/dashboard/parcelas", icono: "🚜" },
  { nombre: "Cultivos", ruta: "/dashboard/cultivos", icono: "🌱" },
  { nombre: "Riegos", ruta: "/dashboard/riegos", icono: "💧" },
  { nombre: "Producción", ruta: "/dashboard/produccion", icono: "📈" },
  { nombre: "Gastos", ruta: "/dashboard/gastos", icono: "💰" },
  { nombre: "Ingresos", ruta: "/dashboard/ingresos", icono: "🏦" },
];

export default function Sidebar({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  const pathname = usePathname();
  const confirmar = useConfirm();
  const toast = useToast();

  const cerrarSesion = async () => {
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
    <>
      {/* Fondo oscuro en móvil cuando el menú está abierto */}
      {abierto && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onCerrar}
          aria-hidden
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 w-72 h-screen bg-gradient-to-b from-green-800 to-green-900 text-white flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">🌱 Agro</h1>
            <p className="text-green-200">Jequetepeque</p>
          </div>
          {/* Botón cerrar (solo móvil) */}
          <button
            onClick={onCerrar}
            className="lg:hidden text-2xl text-green-200 hover:text-white"
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        <nav className="px-4 flex-1 overflow-y-auto">
          {menu.map((item) => {
            const activo = pathname === item.ruta;
            return (
              <Link
                key={item.ruta}
                href={item.ruta}
                onClick={onCerrar}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl mb-2 transition-all ${
                  activo
                    ? "bg-white text-green-800 font-bold shadow-lg"
                    : "hover:bg-green-700"
                }`}
              >
                <span className="text-xl">{item.icono}</span>
                {item.nombre}
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <button
            className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-xl transition"
            onClick={cerrarSesion}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
