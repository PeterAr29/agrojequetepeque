"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/FeedbackProvider";
import { soportaNotificaciones, pedirPermiso } from "@/lib/notificaciones";
import {
  pushConfigurado,
  soportaPush,
  estaSuscrito,
  suscribirPush,
  desuscribirPush,
} from "@/lib/push";

type Estado = "cargando" | "activo" | "inactivo" | "no-soportado";

/**
 * Botón para activar/desactivar las alertas de lluvia.
 * - Si Web Push está configurado y hay Service Worker → suscribe (Nivel 3:
 *   avisos aunque la app esté cerrada).
 * - Si no → solo pide permiso para notificaciones locales (Nivel 2).
 */
export default function AlertasPush() {
  const toast = useToast();
  const [estado, setEstado] = useState<Estado>("cargando");
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!soportaNotificaciones()) {
        setEstado("no-soportado");
        return;
      }
      const suscrito = await estaSuscrito();
      const permitido = Notification.permission === "granted";
      setEstado(suscrito && permitido ? "activo" : "inactivo");
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const activar = async () => {
    setProcesando(true);
    try {
      if (pushConfigurado() && soportaPush()) {
        const ok = await suscribirPush();
        if (ok) {
          setEstado("activo");
          toast.success(
            "Alertas activadas. Te avisaremos aunque cierres la app."
          );
        } else {
          toast.error(
            "No se pudo activar. Instala la app (PWA) y acepta el permiso de notificaciones."
          );
        }
      } else {
        // Sin push configurado: al menos notificaciones locales (app abierta).
        const permiso = await pedirPermiso();
        if (permiso === "granted") {
          setEstado("activo");
          toast.success("Alertas activadas (mientras la app esté abierta).");
        } else {
          toast.info("No activaste las notificaciones.");
        }
      }
    } finally {
      setProcesando(false);
    }
  };

  const desactivar = async () => {
    setProcesando(true);
    try {
      await desuscribirPush();
      setEstado("inactivo");
      toast.info("Alertas desactivadas.");
    } finally {
      setProcesando(false);
    }
  };

  if (estado === "cargando") return null;

  if (estado === "no-soportado") {
    return (
      <span className="bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm">
        Notificaciones no disponibles en este navegador
      </span>
    );
  }

  if (estado === "activo") {
    return (
      <button
        onClick={desactivar}
        disabled={procesando}
        className="bg-green-100 hover:bg-green-200 text-green-700 px-5 py-2.5 rounded-xl font-medium disabled:opacity-60"
        title="Desactivar alertas"
      >
        🔔 Alertas activas · desactivar
      </button>
    );
  }

  return (
    <button
      onClick={activar}
      disabled={procesando}
      className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium disabled:opacity-60"
    >
      🔔 Activar alertas de lluvia
    </button>
  );
}
