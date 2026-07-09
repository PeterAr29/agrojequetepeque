"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  obtenerClima,
  detectarAlertaLluvia,
  proximasHoras,
  descripcionClima,
  formatoHora,
  type Clima,
  type AlertaLluvia,
} from "@/lib/clima";
import { notificarLluvia } from "@/lib/notificaciones";
import AlertasPush from "@/components/ui/AlertasPush";

type ParcelaClima = {
  id: string;
  nombre: string;
  latitud: number | null;
  longitud: number | null;
};

type Estado = {
  clima?: Clima;
  alerta?: AlertaLluvia;
  error?: boolean;
};

export default function ClimaPage() {
  const [parcelas, setParcelas] = useState<ParcelaClima[]>([]);
  const [datos, setDatos] = useState<Record<string, Estado>>({});
  const [cargando, setCargando] = useState(true);

  const cargarClima = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("parcelas")
      .select("id,nombre,latitud,longitud")
      .eq("usuario_id", user.id);

    const lista = (data as ParcelaClima[]) || [];
    setParcelas(lista);
    setCargando(false);

    const conCoords = lista.filter(
      (p) => p.latitud != null && p.longitud != null
    );

    await Promise.all(
      conCoords.map(async (p) => {
        try {
          const clima = await obtenerClima(p.latitud!, p.longitud!);
          const alerta = detectarAlertaLluvia(clima);
          setDatos((prev) => ({ ...prev, [p.id]: { clima, alerta } }));

          // Notifica (nivel 2) si hay lluvia y el permiso está concedido.
          if (alerta.hay && Notification?.permission === "granted") {
            await notificarLluvia(
              p.id,
              p.nombre,
              alerta.enHoras ?? 0,
              alerta.probabilidad ?? 0
            );
          }
        } catch {
          setDatos((prev) => ({ ...prev, [p.id]: { error: true } }));
        }
      })
    );
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarClima();
    }, 0);
    // Refresca cada 30 min mientras la página esté abierta.
    const intervalo = setInterval(cargarClima, 30 * 60 * 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(intervalo);
    };
  }, [cargarClima]);

  const conCoords = parcelas.filter(
    (p) => p.latitud != null && p.longitud != null
  );
  const sinCoords = parcelas.filter(
    (p) => p.latitud == null || p.longitud == null
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-green-700">🌦️ Clima y Alertas</h1>
            <p className="text-slate-600 mt-2">
              Pronóstico y avisos de lluvia para cada una de tus parcelas.
            </p>
          </div>

          <AlertasPush />
        </div>

        {cargando ? (
          <div className="bg-white rounded-2xl p-10 shadow text-center text-slate-500">
            Cargando…
          </div>
        ) : parcelas.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow text-center text-slate-500">
            No tienes parcelas registradas. Crea una en la sección Parcelas.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {conCoords.map((p) => (
              <TarjetaClima key={p.id} parcela={p} estado={datos[p.id]} />
            ))}
          </div>
        )}

        {sinCoords.length > 0 && (
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h3 className="font-bold text-amber-800 mb-2">
              📍 Parcelas sin ubicación
            </h3>
            <p className="text-amber-700 text-sm mb-3">
              Estas parcelas no tienen coordenadas, por eso no podemos darte su clima.
              Edítalas y dibuja su contorno en el mapa:
            </p>
            <div className="flex flex-wrap gap-2">
              {sinCoords.map((p) => (
                <span
                  key={p.id}
                  className="bg-white border border-amber-200 px-3 py-1.5 rounded-lg text-amber-800 text-sm"
                >
                  {p.nombre}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TarjetaClima({
  parcela,
  estado,
}: {
  parcela: ParcelaClima;
  estado?: Estado;
}) {
  if (!estado) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 text-slate-400">
        🌡️ {parcela.nombre} — cargando clima…
      </div>
    );
  }

  if (estado.error || !estado.clima) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 text-slate-500">
        🌡️ {parcela.nombre} — no se pudo obtener el clima.
      </div>
    );
  }

  const { clima, alerta } = estado;
  const desc = descripcionClima(clima.actual.codigo);
  const horas = proximasHoras(clima, 8);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
      {/* Encabezado */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">🚜 {parcela.nombre}</h3>
          <p className="text-slate-500">
            {desc.emoji} {desc.texto}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-slate-800">
            {Math.round(clima.actual.temperatura)}°
          </p>
          <p className="text-slate-500 text-sm">
            💧 {clima.actual.humedad}%
          </p>
        </div>
      </div>

      {/* Alerta */}
      {alerta?.hay ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-blue-800 font-semibold">
            🌧️ Se espera lluvia{" "}
            {alerta.enHoras && alerta.enHoras > 0
              ? `en ~${alerta.enHoras} h`
              : "muy pronto"}
          </p>
          <p className="text-blue-700 text-sm mt-1">
            {alerta.hora && `A las ${formatoHora(alerta.hora)}`} ·{" "}
            {alerta.probabilidad}% de probabilidad
            {alerta.milimetros ? ` · ${alerta.milimetros} mm` : ""}
          </p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-green-800 font-medium">
            ☀️ Sin lluvia prevista en las próximas horas.
          </p>
        </div>
      )}

      {/* Próximas horas */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {horas.map((h) => {
          const d = descripcionClima(h.codigo);
          return (
            <div
              key={h.hora}
              className="flex-shrink-0 text-center bg-slate-50 rounded-xl px-3 py-2 min-w-[64px]"
            >
              <p className="text-xs text-slate-500">{formatoHora(h.hora)}</p>
              <p className="text-xl">{d.emoji}</p>
              <p className="text-sm font-semibold text-slate-700">
                {Math.round(h.temperatura)}°
              </p>
              <p className="text-xs text-blue-600">💧{h.probabilidadLluvia}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
