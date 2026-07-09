"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { obtenerClima, detectarAlertaLluvia } from "@/lib/clima";

type AlertaParcela = {
  nombre: string;
  enHoras: number;
  probabilidad: number;
};

/**
 * Banner compacto para el dashboard: revisa el clima de todas las parcelas
 * y muestra un aviso si se espera lluvia en alguna. No muestra nada si no hay.
 */
export default function AlertaClima() {
  const [alertas, setAlertas] = useState<AlertaParcela[]>([]);

  useEffect(() => {
    let activo = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("parcelas")
        .select("nombre,latitud,longitud")
        .eq("usuario_id", user.id);

      const conCoords = (data || []).filter(
        (p) => p.latitud != null && p.longitud != null
      );

      const encontradas: AlertaParcela[] = [];
      await Promise.all(
        conCoords.map(async (p) => {
          try {
            const clima = await obtenerClima(p.latitud, p.longitud);
            const a = detectarAlertaLluvia(clima);
            if (a.hay) {
              encontradas.push({
                nombre: p.nombre,
                enHoras: a.enHoras ?? 0,
                probabilidad: a.probabilidad ?? 0,
              });
            }
          } catch {
            /* ignora errores de una parcela */
          }
        })
      );

      if (activo) setAlertas(encontradas);
    })();

    return () => {
      activo = false;
    };
  }, []);

  if (alertas.length === 0) return null;

  return (
    <Link
      href="/dashboard/clima"
      className="block bg-gradient-to-r from-blue-600 to-blue-500 rounded-3xl p-6 text-white shadow-lg mb-8 hover:shadow-xl transition"
    >
      <div className="flex items-center gap-4">
        <span className="text-4xl">🌧️</span>
        <div className="flex-1">
          <h3 className="text-xl font-bold">Alerta de lluvia</h3>
          <p className="text-blue-100">
            {alertas.length === 1
              ? `Se espera lluvia en "${alertas[0].nombre}" ${
                  alertas[0].enHoras > 0
                    ? `en ~${alertas[0].enHoras} h`
                    : "muy pronto"
                } (${alertas[0].probabilidad}%).`
              : `Se espera lluvia en ${alertas.length} parcelas. Toca para ver el detalle.`}
          </p>
        </div>
        <span className="text-2xl">→</span>
      </div>
    </Link>
  );
}
