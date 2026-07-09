"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { useToast, useConfirm } from "@/components/ui/FeedbackProvider";
import {
  TIPOS_SUELO,
  areaPoligonoHa,
  centroPoligono,
  type Parcela,
  type Coordenada,
} from "@/lib/types";
import Toolbar from "@/components/ui/Toolbar";
import { exportarExcel, exportarPDF, type ColumnaExport } from "@/lib/export";

// El mapa (Leaflet) usa APIs del navegador → se carga solo en el cliente.
const MapaParcela = dynamic(() => import("@/components/ui/MapaParcela"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
      Cargando mapa…
    </div>
  ),
});

export default function ParcelasPage() {
  const toast = useToast();
  const confirmar = useConfirm();
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtroSuelo, setFiltroSuelo] = useState("");

  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");

  const [superficie, setSuperficie] = useState("");
  const [unidadSuperficie, setUnidadSuperficie] =
    useState("ha");

  const [tipoSuelo, setTipoSuelo] =
    useState("Franco");

  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");

  const [descripcion, setDescripcion] =
    useState("");

  const [poligono, setPoligono] = useState<Coordenada[]>([]);

  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  const [editandoId, setEditandoId] =
    useState<string | null>(null);

  // Al cambiar el contorno en el mapa, autocalcula centro (lat/long) y superficie.
  function actualizarPoligono(coords: Coordenada[]) {
    setPoligono(coords);

    const centro = centroPoligono(coords);
    setLatitud(centro ? centro[0].toFixed(6) : "");
    setLongitud(centro ? centro[1].toFixed(6) : "");

    if (coords.length >= 3) {
      setSuperficie(String(areaPoligonoHa(coords)));
      setUnidadSuperficie("ha");
    }
  }

  async function cargarParcelas() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("parcelas")
      .select("*")
      .eq("usuario_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    setParcelas((data as Parcela[]) || []);
    setCargando(false);
  }

  async function guardarParcela() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (!nombre.trim()) {
      toast.error("Ingrese el nombre de la parcela");
      return;
    }

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("parcelas")
        .update({
          nombre,
          ubicacion,

          superficie:
            superficie === ""
              ? null
              : Number(superficie),

          unidad_superficie:
            unidadSuperficie,

          tipo_suelo: tipoSuelo,

          latitud:
            latitud === ""
              ? null
              : Number(latitud),

          longitud:
            longitud === ""
              ? null
              : Number(longitud),

          poligono: poligono.length > 0 ? poligono : null,

          descripcion,
        })
        .eq("id", editandoId);

      if (error) {
        toast.error(error.message);
        setGuardando(false);
        return;
      }

      toast.success("Parcela actualizada");
    } else {
      const { error } = await supabase
        .from("parcelas")
        .insert({
          usuario_id: user.id,

          nombre,
          ubicacion,

          superficie:
            superficie === ""
              ? null
              : Number(superficie),

          unidad_superficie:
            unidadSuperficie,

          tipo_suelo: tipoSuelo,

          latitud:
            latitud === ""
              ? null
              : Number(latitud),

          longitud:
            longitud === ""
              ? null
              : Number(longitud),

          poligono: poligono.length > 0 ? poligono : null,

          descripcion,
        });

      if (error) {
        toast.error(error.message);
        setGuardando(false);
        return;
      }

      toast.success("Parcela registrada");
    }

    setGuardando(false);
    limpiarFormulario();
    await cargarParcelas();
  }

  function editarParcela(parcela: Parcela) {
    setEditandoId(parcela.id);

    setNombre(parcela.nombre);
    setUbicacion(parcela.ubicacion || "");

    setSuperficie(
      parcela.superficie?.toString() || ""
    );

    setUnidadSuperficie(
      parcela.unidad_superficie || "ha"
    );

    setTipoSuelo(
      parcela.tipo_suelo || "Franco"
    );

    setLatitud(
      parcela.latitud?.toString() || ""
    );

    setLongitud(
      parcela.longitud?.toString() || ""
    );

    setPoligono(
      (parcela.poligono as Coordenada[]) || []
    );

    setDescripcion(
      parcela.descripcion || ""
    );
  }

  async function eliminarParcela(id: string) {
    const ok = await confirmar({
      titulo: "Eliminar parcela",
      mensaje: "¿Desea eliminar esta parcela? Esta acción no se puede deshacer.",
      textoConfirmar: "Eliminar",
      peligro: true,
    });

    if (!ok) return;

    const { error } = await supabase
      .from("parcelas")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Parcela eliminada");
    await cargarParcelas();
  }

  function limpiarFormulario() {
    setEditandoId(null);

    setNombre("");
    setUbicacion("");

    setSuperficie("");

    setUnidadSuperficie("ha");

    setTipoSuelo("Franco");

    setLatitud("");
    setLongitud("");
    setPoligono([]);

    setDescripcion("");
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarParcelas();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return parcelas.filter((p) => {
      const coincideTexto =
        !texto ||
        [p.nombre, p.ubicacion, p.tipo_suelo, p.descripcion]
          .join(" ")
          .toLowerCase()
          .includes(texto);
      const coincideSuelo = !filtroSuelo || p.tipo_suelo === filtroSuelo;
      return coincideTexto && coincideSuelo;
    });
  }, [parcelas, busqueda, filtroSuelo]);

  const columnas: ColumnaExport<Parcela>[] = [
    { header: "Nombre", valor: (p) => p.nombre },
    { header: "Ubicación", valor: (p) => p.ubicacion || "" },
    { header: "Superficie", valor: (p) => p.superficie ?? "" },
    { header: "Unidad", valor: (p) => p.unidad_superficie || "" },
    { header: "Tipo de suelo", valor: (p) => p.tipo_suelo || "" },
    { header: "Latitud", valor: (p) => p.latitud ?? "" },
    { header: "Longitud", valor: (p) => p.longitud ?? "" },
    { header: "Descripción", valor: (p) => p.descripcion || "" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-700">
            🚜 Gestión de Parcelas
          </h1>

          <p className="text-slate-600 mt-2">
            Administra la información de tus parcelas agrícolas.
          </p>
        </div>

        {/* FORMULARIO */}

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-10">

          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            {editandoId
              ? "✏️ Editar Parcela"
              : "➕ Nueva Parcela"}
          </h2>

          <div className="grid md:grid-cols-2 gap-5">

            <input
              className="border border-slate-300 rounded-xl p-3"
              placeholder="Nombre de la parcela"
              value={nombre}
              onChange={(e) =>
                setNombre(e.target.value)
              }
            />

            <input
              className="border border-slate-300 rounded-xl p-3"
              placeholder="Ubicación"
              value={ubicacion}
              onChange={(e) =>
                setUbicacion(e.target.value)
              }
            />

            <input
              type="number"
              className="border border-slate-300 rounded-xl p-3"
              placeholder="Superficie (se calcula al dibujar)"
              value={superficie}
              onChange={(e) =>
                setSuperficie(e.target.value)
              }
            />

            <select
              className="border border-slate-300 rounded-xl p-3"
              value={unidadSuperficie}
              onChange={(e) =>
                setUnidadSuperficie(
                  e.target.value
                )
              }
            >
              <option value="ha">
                Hectáreas (ha)
              </option>

              <option value="m²">
                Metros cuadrados (m²)
              </option>
            </select>

            <select
              className="border border-slate-300 rounded-xl p-3"
              value={tipoSuelo}
              onChange={(e) =>
                setTipoSuelo(
                  e.target.value
                )
              }
            >
              {TIPOS_SUELO.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>

            <div>
              <label className="block mb-2 text-sm font-medium text-slate-500">
                Latitud (automática)
              </label>
              <input
                readOnly
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 text-slate-500"
                placeholder="Se calcula del mapa"
                value={latitud}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-slate-500">
                Longitud (automática)
              </label>
              <input
                readOnly
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 text-slate-500"
                placeholder="Se calcula del mapa"
                value={longitud}
              />
            </div>

          </div>

          {/* MAPA: dibuja el contorno de la parcela */}
          <div className="mt-6">
            <label className="block mb-1 font-semibold text-slate-700">
              🗺️ Ubicación y contorno de la parcela
            </label>
            <p className="text-slate-500 text-sm mb-3">
              Pulsa <strong>Dibujar parcela</strong> y haz clic en el mapa para marcar
              las esquinas. La superficie y las coordenadas se calculan solas. Usa{" "}
              <strong>🎯 Mi ubicación</strong> para centrarte donde estás.
            </p>

            <MapaParcela
              poligono={poligono}
              onCambio={actualizarPoligono}
              centroInicial={
                latitud && longitud
                  ? [Number(latitud), Number(longitud)]
                  : null
              }
            />
          </div>

          <textarea
            className="w-full border border-slate-300 rounded-xl p-3 mt-5"
            rows={4}
            placeholder="Descripción de la parcela"
            value={descripcion}
            onChange={(e) =>
              setDescripcion(
                e.target.value
              )
            }
          />

          <div className="flex gap-3 mt-6">

            <button
              onClick={guardarParcela}
              disabled={guardando}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-8 py-3 rounded-xl shadow-lg"
            >
              {guardando
                ? "Guardando…"
                : editandoId
                ? "Actualizar Parcela"
                : "Guardar Parcela"}
            </button>

            {editandoId && (
              <button
                onClick={limpiarFormulario}
                className="bg-slate-500 hover:bg-slate-600 text-white px-8 py-3 rounded-xl"
              >
                Cancelar
              </button>
            )}

          </div>
        </div>

        {/* LISTADO */}

        <div className="flex justify-between items-center mb-5">

          <h2 className="text-3xl font-bold text-slate-800">
            📋 Mis Parcelas
          </h2>

          <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
            {filtradas.length} Parcelas
          </span>

        </div>

        <Toolbar
          busqueda={busqueda}
          onBuscar={setBusqueda}
          placeholder="Buscar por nombre, ubicación o suelo…"
          onExportExcel={() => exportarExcel("parcelas", columnas, filtradas)}
          onExportPDF={() =>
            exportarPDF("parcelas", "Reporte de Parcelas", columnas, filtradas)
          }
          hayDatos={filtradas.length > 0}
        >
          <select
            className="border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            value={filtroSuelo}
            onChange={(e) => setFiltroSuelo(e.target.value)}
          >
            <option value="">Todos los suelos</option>
            {TIPOS_SUELO.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Toolbar>

        {cargando ? (
          <div className="bg-white rounded-2xl p-10 shadow text-center text-slate-500">
            Cargando…
          </div>
        ) : filtradas.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow text-center text-slate-500">
            {parcelas.length === 0
              ? "No existen parcelas registradas."
              : "No se encontraron resultados para tu búsqueda."}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            {filtradas.map((parcela) => (
              <div
                key={parcela.id}
                className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition"
              >
                <h3 className="text-2xl font-bold text-green-700 mb-4">
                  🚜 {parcela.nombre}
                </h3>

                <div className="space-y-2 text-slate-700">

                  <p>
                    📍 {parcela.ubicacion}
                  </p>

                  <p>
                    📏 {parcela.superficie ?? "-"}{" "}
                    {parcela.unidad_superficie ?? ""}
                  </p>

                  <p>
                    🌱 {parcela.tipo_suelo ?? "-"}
                  </p>

                  <p>
                    🗺️ {parcela.latitud ?? "-"},{" "}
                    {parcela.longitud ?? "-"}
                  </p>

                  {parcela.poligono &&
                    parcela.poligono.length >= 3 && (
                      <p className="text-green-700 text-sm font-medium">
                        📐 Contorno definido ({parcela.poligono.length} puntos)
                      </p>
                    )}

                  {parcela.descripcion && (
                    <p className="text-slate-500 pt-2">
                      📝 {parcela.descripcion}
                    </p>
                  )}

                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">

                  <button
                    onClick={() =>
                      editarParcela(parcela)
                    }
                    className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() =>
                      eliminarParcela(parcela.id)
                    }
                    className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
                  >
                    Eliminar
                  </button>

                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}