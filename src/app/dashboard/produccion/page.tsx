"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast, useConfirm } from "@/components/ui/FeedbackProvider";
import {
  UNIDADES_PRODUCCION as UNIDADES,
  CALIDADES_PRODUCCION as CALIDADES,
  hoyISO,
} from "@/lib/types";
import Toolbar from "@/components/ui/Toolbar";
import { exportarExcel, exportarPDF, type ColumnaExport } from "@/lib/export";

type Parcela = {
  id: string;
  nombre: string;
};

type Cultivo = {
  id: string;
  nombre: string;
};

type Produccion = {
  id: string;
  parcela_id: string | null;
  cultivo_id: string | null;
  fecha_cosecha: string;
  cantidad: number | null;
  unidad: string;
  calidad: string;
  observaciones: string | null;
};

export default function ProduccionPage() {
  const toast = useToast();
  const confirmar = useConfirm();
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroCalidad, setFiltroCalidad] = useState("");

  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [producciones, setProducciones] = useState<Produccion[]>([]);

  const [parcelaId, setParcelaId] = useState("");
  const [cultivoId, setCultivoId] = useState("");
  const [fechaCosecha, setFechaCosecha] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("kg");
  const [calidad, setCalidad] = useState("Primera");
  const [observaciones, setObservaciones] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  async function cargarDatos() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: parcelasData } = await supabase
      .from("parcelas")
      .select("id,nombre")
      .eq("usuario_id", user.id);
    setParcelas(parcelasData || []);

    const { data: cultivosData } = await supabase
      .from("cultivos")
      .select("id,nombre");
    setCultivos((cultivosData as Cultivo[]) || []);

    const { data } = await supabase
      .from("produccion")
      .select("*")
      .order("fecha_cosecha", { ascending: false });
    setProducciones((data as Produccion[]) || []);

    setCargando(false);
  }

  async function guardarProduccion() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (!cultivoId) {
      toast.error("Seleccione un cultivo");
      return;
    }

    if (!cantidad || Number(cantidad) <= 0) {
      toast.error("Ingrese una cantidad válida");
      return;
    }

    const payload = {
      usuario_id: user.id,
      parcela_id: parcelaId || null,
      cultivo_id: cultivoId,
      fecha_cosecha: fechaCosecha || hoyISO(),
      cantidad: Number(cantidad),
      unidad,
      calidad,
      observaciones,
    };

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("produccion")
        .update(payload)
        .eq("id", editandoId);
      if (error) {
        toast.error(error.message);
        setGuardando(false);
        return;
      }
      toast.success("Producción actualizada");
    } else {
      const { error } = await supabase.from("produccion").insert(payload);
      if (error) {
        toast.error(error.message);
        setGuardando(false);
        return;
      }
      toast.success("Producción registrada");
    }

    setGuardando(false);
    limpiarFormulario();
    await cargarDatos();
  }

  function editarProduccion(p: Produccion) {
    setEditandoId(p.id);
    setParcelaId(p.parcela_id || "");
    setCultivoId(p.cultivo_id || "");
    setFechaCosecha(p.fecha_cosecha || "");
    setCantidad(p.cantidad?.toString() || "");
    setUnidad(p.unidad || "kg");
    setCalidad(p.calidad || "Primera");
    setObservaciones(p.observaciones || "");
  }

  async function eliminarProduccion(id: string) {
    const ok = await confirmar({
      titulo: "Eliminar producción",
      mensaje: "¿Desea eliminar este registro de producción?",
      textoConfirmar: "Eliminar",
      peligro: true,
    });
    if (!ok) return;

    const { error } = await supabase.from("produccion").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Registro eliminado");
    await cargarDatos();
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setParcelaId("");
    setCultivoId("");
    setFechaCosecha("");
    setCantidad("");
    setUnidad("kg");
    setCalidad("Primera");
    setObservaciones("");
  }

  useEffect(() => {
    const timer = setTimeout(() => cargarDatos(), 0);
    return () => clearTimeout(timer);
  }, []);

  const nombreParcela = (id: string | null) =>
    parcelas.find((p) => p.id === id)?.nombre || "-";

  const nombreCultivo = (id: string | null) =>
    cultivos.find((c) => c.id === id)?.nombre || "-";

  const colorCalidad = (calidad: string) =>
    calidad === "Primera"
      ? "bg-green-600"
      : calidad === "Segunda"
      ? "bg-yellow-500"
      : "bg-slate-500";

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return producciones.filter((p) => {
      const coincideTexto =
        !texto ||
        [
          nombreCultivo(p.cultivo_id),
          nombreParcela(p.parcela_id),
          p.calidad,
          p.observaciones,
        ]
          .join(" ")
          .toLowerCase()
          .includes(texto);
      const coincideCalidad = !filtroCalidad || p.calidad === filtroCalidad;
      return coincideTexto && coincideCalidad;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producciones, busqueda, filtroCalidad, parcelas, cultivos]);

  const columnas: ColumnaExport<Produccion>[] = [
    { header: "Fecha cosecha", valor: (p) => p.fecha_cosecha },
    { header: "Cultivo", valor: (p) => nombreCultivo(p.cultivo_id) },
    { header: "Parcela", valor: (p) => nombreParcela(p.parcela_id) },
    { header: "Cantidad", valor: (p) => p.cantidad ?? "" },
    { header: "Unidad", valor: (p) => p.unidad },
    { header: "Calidad", valor: (p) => p.calidad },
    { header: "Observaciones", valor: (p) => p.observaciones || "" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-700">📈 Producción</h1>
          <p className="text-slate-600 mt-2">
            Registra las cosechas y el rendimiento de tus cultivos.
          </p>
        </div>

        {/* FORMULARIO */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            {editandoId ? "✏️ Editar Producción" : "➕ Nueva Producción"}
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            <select
              className="border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
              value={cultivoId}
              onChange={(e) => setCultivoId(e.target.value)}
            >
              <option value="">Seleccione un cultivo</option>
              {cultivos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              className="border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
              value={parcelaId}
              onChange={(e) => setParcelaId(e.target.value)}
            >
              <option value="">Sin parcela</option>
              {parcelas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>

            <input
              type="number"
              step="0.01"
              className="border border-slate-300 rounded-xl p-3 text-slate-800"
              placeholder="Cantidad cosechada"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />

            <select
              className="border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
            >
              {UNIDADES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>

            <select
              className="border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
              value={calidad}
              onChange={(e) => setCalidad(e.target.value)}
            >
              {CALIDADES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <div>
              <label className="block mb-2 font-medium text-slate-700">
                Fecha de cosecha
              </label>
              <input
                type="date"
                className="border border-slate-300 rounded-xl p-3 w-full text-slate-800"
                value={fechaCosecha}
                onChange={(e) => setFechaCosecha(e.target.value)}
              />
            </div>
          </div>

          <textarea
            className="w-full border border-slate-300 rounded-xl p-3 mt-5 text-slate-800"
            rows={3}
            placeholder="Observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />

          <div className="flex gap-3 mt-6">
            <button
              onClick={guardarProduccion}
              disabled={guardando}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-8 py-3 rounded-xl shadow-lg"
            >
              {guardando
                ? "Guardando…"
                : editandoId
                ? "Actualizar Producción"
                : "Guardar Producción"}
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
          <h2 className="text-3xl font-bold text-slate-800">🌾 Mis Cosechas</h2>
          <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
            {filtrados.length} Registros
          </span>
        </div>

        <Toolbar
          busqueda={busqueda}
          onBuscar={setBusqueda}
          placeholder="Buscar por cultivo, parcela o calidad…"
          onExportExcel={() => exportarExcel("produccion", columnas, filtrados)}
          onExportPDF={() =>
            exportarPDF("produccion", "Reporte de Producción", columnas, filtrados)
          }
          hayDatos={filtrados.length > 0}
        >
          <select
            className="border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            value={filtroCalidad}
            onChange={(e) => setFiltroCalidad(e.target.value)}
          >
            <option value="">Todas las calidades</option>
            {CALIDADES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Toolbar>

        {cargando ? (
          <div className="bg-white rounded-2xl p-10 shadow text-center text-slate-500">
            Cargando…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow text-center text-slate-500">
            {producciones.length === 0
              ? "No existen registros de producción."
              : "No se encontraron resultados para tu búsqueda."}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtrados.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold text-green-700">
                    🌾 {nombreCultivo(p.cultivo_id)}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${colorCalidad(
                      p.calidad
                    )}`}
                  >
                    {p.calidad}
                  </span>
                </div>

                <div className="space-y-2 text-slate-700">
                  <p className="text-2xl font-bold text-slate-800">
                    {p.cantidad ?? "-"} {p.unidad}
                  </p>
                  <p>📍 {nombreParcela(p.parcela_id)}</p>
                  <p>📅 {p.fecha_cosecha}</p>
                  {p.observaciones && (
                    <p className="text-slate-500 pt-2">📝 {p.observaciones}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <button
                    onClick={() => editarProduccion(p)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarProduccion(p.id)}
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
