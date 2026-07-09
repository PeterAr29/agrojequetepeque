// ============================================================
//  Clima — datos de Open-Meteo (gratis, sin API key, con CORS)
//  https://open-meteo.com/
// ============================================================

export type ClimaActual = {
  temperatura: number;
  humedad: number;
  precipitacion: number;
  codigo: number;
};

export type HoraPronostico = {
  hora: string; // ISO
  probabilidadLluvia: number; // %
  precipitacion: number; // mm
  temperatura: number;
  codigo: number;
};

export type Clima = {
  actual: ClimaActual;
  horas: HoraPronostico[];
};

export type AlertaLluvia = {
  hay: boolean;
  hora?: Date;
  enHoras?: number; // dentro de cuántas horas
  probabilidad?: number; // %
  milimetros?: number;
};

// Umbrales para considerar "va a llover"
const UMBRAL_PROBABILIDAD = 50; // %
const UMBRAL_MM = 0.2; // mm
const VENTANA_HORAS = 12; // mirar las próximas 12 horas

/** Descarga el clima actual y el pronóstico horario para unas coordenadas. */
export async function obtenerClima(
  lat: number,
  lng: number
): Promise<Clima> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code` +
    `&hourly=precipitation_probability,precipitation,temperature_2m,weather_code` +
    `&timezone=auto&forecast_days=2`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo obtener el clima");

  const data = await res.json();

  const horas: HoraPronostico[] = (data.hourly?.time || []).map(
    (t: string, i: number) => ({
      hora: t,
      probabilidadLluvia: data.hourly.precipitation_probability?.[i] ?? 0,
      precipitacion: data.hourly.precipitation?.[i] ?? 0,
      temperatura: data.hourly.temperature_2m?.[i] ?? 0,
      codigo: data.hourly.weather_code?.[i] ?? 0,
    })
  );

  return {
    actual: {
      temperatura: data.current?.temperature_2m ?? 0,
      humedad: data.current?.relative_humidity_2m ?? 0,
      precipitacion: data.current?.precipitation ?? 0,
      codigo: data.current?.weather_code ?? 0,
    },
    horas,
  };
}

/** Busca la primera hora con lluvia probable en la ventana próxima. */
export function detectarAlertaLluvia(clima: Clima): AlertaLluvia {
  const ahora = Date.now();
  const limite = ahora + VENTANA_HORAS * 3600_000;

  for (const h of clima.horas) {
    const t = new Date(h.hora).getTime();
    if (t < ahora || t > limite) continue;

    if (
      h.probabilidadLluvia >= UMBRAL_PROBABILIDAD ||
      h.precipitacion >= UMBRAL_MM
    ) {
      return {
        hay: true,
        hora: new Date(h.hora),
        enHoras: Math.max(0, Math.round((t - ahora) / 3600_000)),
        probabilidad: h.probabilidadLluvia,
        milimetros: h.precipitacion,
      };
    }
  }

  return { hay: false };
}

/** Próximas N horas de pronóstico a partir de ahora. */
export function proximasHoras(clima: Clima, cantidad = 12): HoraPronostico[] {
  const ahora = Date.now();
  return clima.horas
    .filter((h) => new Date(h.hora).getTime() >= ahora)
    .slice(0, cantidad);
}

// --- Mapeo de códigos WMO a emoji + descripción ---
// https://open-meteo.com/en/docs (WMO Weather interpretation codes)
export function descripcionClima(codigo: number): {
  emoji: string;
  texto: string;
} {
  if (codigo === 0) return { emoji: "☀️", texto: "Despejado" };
  if (codigo === 1) return { emoji: "🌤️", texto: "Mayormente despejado" };
  if (codigo === 2) return { emoji: "⛅", texto: "Parcialmente nublado" };
  if (codigo === 3) return { emoji: "☁️", texto: "Nublado" };
  if (codigo === 45 || codigo === 48) return { emoji: "🌫️", texto: "Niebla" };
  if (codigo >= 51 && codigo <= 57) return { emoji: "🌦️", texto: "Llovizna" };
  if (codigo >= 61 && codigo <= 67) return { emoji: "🌧️", texto: "Lluvia" };
  if (codigo >= 71 && codigo <= 77) return { emoji: "🌨️", texto: "Nieve" };
  if (codigo >= 80 && codigo <= 82)
    return { emoji: "🌧️", texto: "Chubascos" };
  if (codigo >= 95) return { emoji: "⛈️", texto: "Tormenta" };
  return { emoji: "🌡️", texto: "—" };
}

/** Formatea una hora ISO a "3:00 p. m." local. */
export function formatoHora(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("es-PE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
