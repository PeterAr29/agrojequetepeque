"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/FeedbackProvider";
import { esAdmin } from "@/lib/admin";
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
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // ¿La cuenta actual es administradora? (para mostrar el botón de prueba)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAdmin(esAdmin(user?.email));

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

  // Envía una notificación de prueba a los dispositivos de este usuario.
  const probar = async () => {
    setProcesando(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Debes iniciar sesión de nuevo.");
        return;
      }

      const res = await fetch("/api/notificaciones/prueba", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (res.ok && json.enviados > 0) {
        toast.success(
          `📩 Notificación de prueba enviada a ${json.enviados} dispositivo${
            json.enviados === 1 ? "" : "s"
          }.`
        );
      } else if (json.enviados === 0) {
        toast.info(json.mensaje || "No hay dispositivos suscritos.");
      } else {
        toast.error(json.error || "No se pudo enviar la prueba.");
      }
    } catch {
      toast.error("Error al enviar la notificación de prueba.");
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
      <div className="flex flex-wrap gap-2">
        {admin && (
          <button
            onClick={probar}
            disabled={procesando}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium disabled:opacity-60"
            title="Enviar una notificación de prueba a este dispositivo (solo administrador)"
          >
            🧪 Probar notificación
          </button>
        )}
        <button
          onClick={desactivar}
          disabled={procesando}
          className="bg-green-100 hover:bg-green-200 text-green-700 px-5 py-2.5 rounded-xl font-medium disabled:opacity-60"
          title="Desactivar alertas"
        >
          🔔 Alertas activas · desactivar
        </button>
      </div>
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
