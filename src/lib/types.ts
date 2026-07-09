// ============================================================
//  Tipos del dominio — reflejan las tablas de supabase/schema.sql
// ============================================================

/** Par de coordenadas [latitud, longitud]. */
export type Coordenada = [number, number];

export type Parcela = {
  id: string;
  usuario_id: string;
  nombre: string;
  ubicacion: string | null;
  superficie: number | null;
  unidad_superficie: string | null;
  tipo_suelo: string | null;
  latitud: number | null;
  longitud: number | null;
  poligono: Coordenada[] | null;
  descripcion: string | null;
  created_at: string;
};

/**
 * Área geodésica (en m²) de un polígono definido por coordenadas [lat, lng].
 * Misma fórmula que usa Leaflet.draw (esfera de radio 6378137 m). Sin dependencias.
 */
export function areaPoligonoM2(coords: Coordenada[]): number {
  if (!coords || coords.length < 3) return 0;
  const d2r = Math.PI / 180;
  const R = 6378137; // radio terrestre en metros
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lat1, lng1] = coords[i];
    const [lat2, lng2] = coords[(i + 1) % coords.length];
    area +=
      (lng2 - lng1) * d2r * (2 + Math.sin(lat1 * d2r) + Math.sin(lat2 * d2r));
  }
  return Math.abs((area * R * R) / 2);
}

/** Superficie en hectáreas (m² / 10.000), redondeada a 4 decimales. */
export function areaPoligonoHa(coords: Coordenada[]): number {
  return Math.round((areaPoligonoM2(coords) / 10000) * 10000) / 10000;
}

/** Centro (promedio de vértices) de un polígono. */
export function centroPoligono(coords: Coordenada[]): Coordenada | null {
  if (!coords || coords.length === 0) return null;
  const suma = coords.reduce(
    (acc, [lat, lng]) => [acc[0] + lat, acc[1] + lng] as Coordenada,
    [0, 0] as Coordenada
  );
  return [suma[0] / coords.length, suma[1] / coords.length];
}

export type Cultivo = {
  id: string;
  usuario_id: string;
  parcela_id: string | null;
  nombre: string;
  tipo: string | null;
  fecha_siembra: string | null;
  fecha_cosecha: string | null;
  estado: string;
  created_at: string;
};

export type Riego = {
  id: string;
  usuario_id: string;
  parcela_id: string | null;
  cultivo_id: string | null;
  fecha: string;
  metodo: string;
  cantidad_agua: number | null;
  duracion_horas: number | null;
  observaciones: string | null;
  created_at: string;
};

export type Produccion = {
  id: string;
  usuario_id: string;
  parcela_id: string | null;
  cultivo_id: string | null;
  fecha_cosecha: string;
  cantidad: number | null;
  unidad: string;
  calidad: string;
  observaciones: string | null;
  created_at: string;
};

export type Gasto = {
  id: string;
  usuario_id: string;
  parcela_id: string | null;
  categoria: string;
  descripcion: string | null;
  monto: number;
  fecha: string;
  created_at: string;
};

export type Ingreso = {
  id: string;
  usuario_id: string;
  parcela_id: string | null;
  cultivo_id: string | null;
  concepto: string | null;
  cantidad_kg: number | null;
  monto: number;
  fecha: string;
  created_at: string;
};

// Opciones reutilizables (deben coincidir con los CHECK/valores del esquema)
export const CATEGORIAS_GASTO = [
  "Insumos",
  "Mano de obra",
  "Maquinaria",
  "Riego",
  "Transporte",
  "Otros",
] as const;

export const METODOS_RIEGO = ["Goteo", "Aspersión", "Gravedad", "Manual"] as const;

export const UNIDADES_PRODUCCION = ["kg", "ton", "quintal"] as const;

export const CALIDADES_PRODUCCION = ["Primera", "Segunda", "Tercera"] as const;

export const ESTADOS_CULTIVO = ["Activo", "Cosechado", "Finalizado"] as const;

export const TIPOS_SUELO = [
  "Franco",
  "Arcilloso",
  "Arenoso",
  "Limoso",
  "Franco Arcilloso",
  "Franco Arenoso",
] as const;

/** Formatea un número como soles peruanos. */
export function formatoSoles(valor: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(valor || 0);
}

/** Fecha de hoy en formato YYYY-MM-DD (para inputs date). */
export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}
