"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Sun, Moon, Monitor, type LucideIcon } from "lucide-react";
import {
  type Tema,
  temaGuardado,
  guardarTema,
  aplicarTema,
  suscribirCambioTema,
} from "@/lib/tema";

const OPCIONES: { valor: Tema; label: string; Icono: LucideIcon }[] = [
  { valor: "claro", label: "Claro", Icono: Sun },
  { valor: "oscuro", label: "Oscuro", Icono: Moon },
  { valor: "sistema", label: "Sistema", Icono: Monitor },
];

export default function ToggleTema() {
  // Lee la preferencia sin setState-en-efecto (y sin desajuste de hidratación).
  const tema = useSyncExternalStore<Tema>(
    suscribirCambioTema,
    temaGuardado,
    () => "sistema"
  );

  // Si está en "sistema", reaplica el tema al cambiar la preferencia del SO.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const alCambiar = () => {
      if (temaGuardado() === "sistema") aplicarTema("sistema");
    };
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, []);

  function elegir(t: Tema) {
    guardarTema(t);
  }

  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
      {OPCIONES.map(({ valor, label, Icono }) => {
        const activo = tema === valor;
        return (
          <button
            key={valor}
            onClick={() => elegir(valor)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activo
                ? "bg-white text-green-700 shadow"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <Icono className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
