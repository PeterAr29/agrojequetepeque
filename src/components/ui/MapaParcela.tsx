"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Marker,
  Tooltip,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordenada } from "@/lib/types";
import { areaPoligonoHa, centroPoligono } from "@/lib/types";
import { useToast } from "@/components/ui/FeedbackProvider";

// Icono (círculo) para los vértices. Usa divIcon para no depender de las
// imágenes por defecto de Leaflet (que suelen romperse con los bundlers).
const crearIcono = (color: string) =>
  L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25);cursor:grab;"></div>`,
  });

// Iconos creados UNA sola vez: su referencia es estable entre renders, así que
// arrastrar un vértice no recrea su DOM (eso era lo que cortaba el gesto).
const ICONO_INICIO = crearIcono("#f97316");
const ICONO_VERTICE = crearIcono("#15803d");

// Centro aproximado del valle de Jequetepeque (por si no hay datos previos).
const CENTRO_DEFECTO: Coordenada = [-7.2, -79.4];

// maxNativeZoom = último zoom con imágenes reales. En zooms mayores Leaflet
// escala esos tiles en vez de pedir otros inexistentes (evita el placeholder
// "Map data not yet available" del satélite de Esri en zonas rurales).
// El satélite se limita a 17 (cobertura casi universal) para que en zonas
// rurales nunca aparezca el cartel; a más zoom se amplía la imagen.
const ZOOM_MAXIMO = 19;

const TILES = {
  calle: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap",
    maxNativeZoom: 19,
  },
  satelite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    maxNativeZoom: 17,
  },
};

/** Captura los clics del mapa para añadir vértices en modo dibujo. */
function CapturaClics({
  activo,
  onAgregar,
}: {
  activo: boolean;
  onAgregar: (c: Coordenada) => void;
}) {
  useMapEvents({
    click(e) {
      if (activo) onAgregar([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

/** Recentra el mapa cuando cambia `centro` (p. ej. tras usar el GPS). */
function Recentrar({ centro }: { centro: Coordenada | null }) {
  const map = useMap();
  useEffect(() => {
    if (centro) map.setView(centro, 16);
  }, [centro, map]);
  return null;
}

export default function MapaParcela({
  poligono,
  onCambio,
  centroInicial,
}: {
  poligono: Coordenada[];
  onCambio: (poligono: Coordenada[]) => void;
  centroInicial?: Coordenada | null;
}) {
  const toast = useToast();
  const [modoDibujo, setModoDibujo] = useState(false);
  const [capa, setCapa] = useState<"calle" | "satelite">("calle");
  const [miUbicacion, setMiUbicacion] = useState<Coordenada | null>(null);
  // Vértice que se está arrastrando (posición en vivo, sin tocar aún el estado
  // padre para no interrumpir el gesto de Leaflet).
  const [arrastrando, setArrastrando] = useState<{
    i: number;
    c: Coordenada;
  } | null>(null);

  const centroMapa =
    centroPoligono(poligono) || centroInicial || CENTRO_DEFECTO;

  const agregarPunto = (c: Coordenada) => onCambio([...poligono, c]);
  const deshacer = () => onCambio(poligono.slice(0, -1));
  const limpiar = () => onCambio([]);

  // Reemplaza la coordenada del vértice `indice` (al arrastrarlo).
  const moverPunto = (indice: number, lat: number, lng: number) => {
    onCambio(
      poligono.map((c, i) => (i === indice ? ([lat, lng] as Coordenada) : c))
    );
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización");
      return;
    }
    toast.info("Obteniendo tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: Coordenada = [pos.coords.latitude, pos.coords.longitude];
        setMiUbicacion(c);
        toast.success("Ubicación encontrada. Ya puedes dibujar tu parcela.");
      },
      () => toast.error("No se pudo obtener tu ubicación (revisa los permisos)"),
      { enableHighAccuracy: true }
    );
  };

  // Contorno "en vivo": si se está arrastrando un vértice, refleja su posición
  // actual para que el polígono y la superficie se actualicen mientras se mueve,
  // sin cambiar la prop `position` del marcador (eso es lo que cortaba el drag).
  const poligonoVista = arrastrando
    ? poligono.map((c, i) => (i === arrastrando.i ? arrastrando.c : c))
    : poligono;

  const superficie = areaPoligonoHa(poligonoVista);

  return (
    <div>
      {/* CONTROLES */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={() => setModoDibujo((v) => !v)}
          className={`px-4 py-2 rounded-xl text-sm font-medium text-white ${
            modoDibujo
              ? "bg-orange-500 hover:bg-orange-600"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {modoDibujo ? "✏️ Dibujando… (clic en el mapa)" : "✏️ Dibujar parcela"}
        </button>

        <button
          type="button"
          onClick={deshacer}
          disabled={poligono.length === 0}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-200 hover:bg-slate-300 text-slate-700 disabled:opacity-50"
        >
          ↩️ Deshacer punto
        </button>

        <button
          type="button"
          onClick={limpiar}
          disabled={poligono.length === 0}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-50"
        >
          🗑️ Limpiar
        </button>

        <button
          type="button"
          onClick={usarMiUbicacion}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
        >
          🎯 Mi ubicación
        </button>

        <button
          type="button"
          onClick={() => setCapa((c) => (c === "calle" ? "satelite" : "calle"))}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-700 hover:bg-slate-800 text-white ml-auto"
        >
          {capa === "calle" ? "🛰️ Ver satélite" : "🗺️ Ver calles"}
        </button>
      </div>

      {/* MAPA */}
      <div className="rounded-2xl overflow-hidden border border-slate-300">
        <MapContainer
          center={centroMapa}
          zoom={14}
          maxZoom={ZOOM_MAXIMO}
          style={{ height: "420px", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            key={capa}
            url={TILES[capa].url}
            attribution={TILES[capa].attribution}
            maxZoom={ZOOM_MAXIMO}
            maxNativeZoom={TILES[capa].maxNativeZoom}
          />

          <CapturaClics activo={modoDibujo} onAgregar={agregarPunto} />
          <Recentrar centro={miUbicacion} />

          {/* Contorno */}
          {poligonoVista.length >= 3 && (
            <Polygon
              positions={poligonoVista}
              pathOptions={{ color: "#15803d", fillColor: "#22c55e", fillOpacity: 0.3 }}
            />
          )}
          {poligonoVista.length === 2 && (
            <Polyline positions={poligonoVista} pathOptions={{ color: "#15803d" }} />
          )}

          {/* Vértices arrastrables */}
          {poligono.map((p, i) => (
            <Marker
              key={i}
              position={p}
              draggable
              icon={i === 0 ? ICONO_INICIO : ICONO_VERTICE}
              eventHandlers={{
                drag: (e) => {
                  const ll = (e.target as L.Marker).getLatLng();
                  setArrastrando({ i, c: [ll.lat, ll.lng] });
                },
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng();
                  setArrastrando(null);
                  moverPunto(i, ll.lat, ll.lng);
                },
              }}
            >
              <Tooltip>
                {i === 0 ? "Inicio" : `Punto ${i + 1}`} · arrástrame
              </Tooltip>
            </Marker>
          ))}

          {/* Mi ubicación */}
          {miUbicacion && (
            <CircleMarker
              center={miUbicacion}
              radius={8}
              pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.9 }}
            >
              <Tooltip>Tú estás aquí</Tooltip>
            </CircleMarker>
          )}
        </MapContainer>
      </div>

      {/* RESUMEN */}
      <div className="flex flex-wrap gap-4 mt-3 text-sm">
        <span className="bg-slate-100 px-3 py-2 rounded-lg text-slate-700">
          📍 Puntos: <strong>{poligono.length}</strong>
        </span>
        <span className="bg-green-100 px-3 py-2 rounded-lg text-green-800">
          📐 Superficie: <strong>{superficie.toFixed(4)} ha</strong>
        </span>
        {poligono.length > 0 && poligono.length < 3 && (
          <span className="bg-amber-100 px-3 py-2 rounded-lg text-amber-800">
            Marca al menos 3 puntos para cerrar la parcela.
          </span>
        )}
        {poligono.length > 0 && (
          <span className="bg-blue-50 px-3 py-2 rounded-lg text-blue-700">
            💡 Arrastra un punto para ajustarlo.
          </span>
        )}
      </div>
    </div>
  );
}
