"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast, useConfirm } from "@/components/ui/FeedbackProvider";
import { METODOS_RIEGO as METODOS, hoyISO } from "@/lib/types";
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

type Riego = {
  id: string;
  parcela_id: string | null;
  cultivo_id: string | null;
  fecha: string;
  metodo: string;
  cantidad_agua: number | null;
  duracion_horas: number | null;
  observaciones: string | null;
};

export default function RiegosPage() {
  const toast = useToast();
  const confirmar = useConfirm();
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");

  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [riegos, setRiegos] = useState<Riego[]>([]);

  const [parcelaId, setParcelaId] = useState("");
  const [cultivoId, setCultivoId] = useState("");
  const [fecha, setFecha] = useState("");
  const [metodo, setMetodo] = useState("Goteo");
  const [cantidadAgua, setCantidadAgua] = useState("");
  const [duracion, setDuracion] = useState("");
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

    const { data: riegosData } = await supabase
      .from("riegos")
      .select("*")
      .order("fecha", { ascending: false });
    setRiegos((riegosData as Riego[]) || []);

    setCargando(false);
  }

  async function guardarRiego() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (!parcelaId) {
      toast.error("Seleccione una parcela");
      return;
    }

    const payload = {
      usuario_id: user.id,
      parcela_id: parcelaId,
      cultivo_id: cultivoId || null,
      fecha: fecha || hoyISO(),
      metodo,
      cantidad_agua: cantidadAgua === "" ? null : Number(cantidadAgua),
      duracion_horas: duracion === "" ? null : Number(duracion),
      observaciones,
    };

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("riegos")
        .update(payload)
        .eq("id", editandoId);
      if (error) {
        toast.error(error.message);
        setGuardando(false);
        return;
      }
      toast.success("Riego actualizado");
    } else {
      const { error } = await supabase.from("riegos").insert(payload);
      if (error) {
        toast.error(error.message);
        setGuardando(false);
        return;
      }
      toast.success("Riego registrado");
    }

    setGuardando(false);
    limpiarFormulario();
    await cargarDatos();
  }

  function editarRiego(riego: Riego) {
    setEditandoId(riego.id);
    setParcelaId(riego.parcela_id || "");
    setCultivoId(riego.cultivo_id || "");
    setFecha(riego.fecha || "");
    setMetodo(riego.metodo || "Goteo");
    setCantidadAgua(riego.cantidad_agua?.toString() || "");
    setDuracion(riego.duracion_horas?.toString() || "");
    setObservaciones(riego.observaciones || "");
  }

  async function eliminarRiego(id: string) {
    const ok = await confirmar({
      titulo: "Eliminar riego",
      mensaje: "¿Desea eliminar este riego?",
      textoConfirmar: "Eliminar",
      peligro: true,
    });
    if (!ok) return;

    const { error } = await supabase.from("riegos").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Riego eliminado");
    await cargarDatos();
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setParcelaId("");
    setCultivoId("");
    setFecha("");
    setMetodo("Goteo");
    setCantidadAgua("");
    setDuracion("");
    setObservaciones("");
  }

  useEffect(() => {
    const timer = setTimeout(() => cargarDatos(), 0);
    return () => clearTimeout(timer);
  }, []);

  const nombreParcela = (id: string | null) =>
    parcelas.find((p) => p.id === id)?.nombre || "-";

  const nombreCultivo = (id: string | null) =>
    cultivos.find((c) => c.id === id)?.nombre || null;

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return riegos.filter((r) => {
      const coincideTexto =
        !texto ||
        [
          nombreParcela(r.parcela_id),
          nombreCultivo(r.cultivo_id) || "",
          r.metodo,
          r.observaciones,
        ]
          .join(" ")
          .toLowerCase()
          .includes(texto);
      const coincideMetodo = !filtroMetodo || r.metodo === filtroMetodo;
      return coincideTexto && coincideMetodo;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riegos, busqueda, filtroMetodo, parcelas, cultivos]);

  const columnas: ColumnaExport<Riego>[] = [
    { header: "Fecha", valor: (r) => r.fecha },
    { header: "Parcela", valor: (r) => nombreParcela(r.parcela_id) },
    { header: "Cultivo", valor: (r) => nombreCultivo(r.cultivo_id) || "" },
    { header: "Método", valor: (r) => r.metodo },
    { header: "Agua (m³)", valor: (r) => r.cantidad_agua ?? "" },
    { header: "Duración (h)", valor: (r) => r.duracion_horas ?? "" },
    { header: "Observaciones", valor: (r) => r.observaciones || "" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-700">💧 Gestión de Riegos</h1>
          <p className="text-slate-600 mt-2">
            Registra y controla el riego de tus parcelas y cultivos.
          </p>
        </div>

        {/* FORMULARIO */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            {editandoId ? "✏️ Editar Riego" : "➕ Nuevo Riego"}
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            <select
              className="border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
              value={parcelaId}
              onChange={(e) => setParcelaId(e.target.value)}
            >
              <option value="">Seleccione una parcela</option>
              {parcelas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>

            <select
              className="border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
              value={cultivoId}
              onChange={(e) => setCultivoId(e.target.value)}
            >
              <option value="">Sin cultivo específico</option>
              {cultivos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              className="border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
            >
              {METODOS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>

            <div>
              <label className="block mb-2 font-medium text-slate-700">Fecha</label>
              <input
                type="date"
                className="border border-slate-300 rounded-xl p-3 w-full text-slate-800"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>

            <input
              type="number"
              step="0.01"
              className="border border-slate-300 rounded-xl p-3 text-slate-800"
              placeholder="Cantidad de agua (m³)"
              value={cantidadAgua}
              onChange={(e) => setCantidadAgua(e.target.value)}
            />

            <input
              type="number"
              step="0.01"
              className="border border-slate-300 rounded-xl p-3 text-slate-800"
              placeholder="Duración (horas)"
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
            />
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
              onClick={guardarRiego}
              disabled={guardando}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-8 py-3 rounded-xl shadow-lg"
            >
              {guardando
                ? "Guardando…"
                : editandoId
                ? "Actualizar Riego"
                : "Guardar Riego"}
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
          <h2 className="text-3xl font-bold text-slate-800">💦 Mis Riegos</h2>
          <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
            {filtrados.length} Registros
          </span>
        </div>

        <Toolbar
          busqueda={busqueda}
          onBuscar={setBusqueda}
          placeholder="Buscar por parcela, cultivo o método…"
          onExportExcel={() => exportarExcel("riegos", columnas, filtrados)}
          onExportPDF={() =>
            exportarPDF("riegos", "Reporte de Riegos", columnas, filtrados)
          }
          hayDatos={filtrados.length > 0}
        >
          <select
            className="border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            value={filtroMetodo}
            onChange={(e) => setFiltroMetodo(e.target.value)}
          >
            <option value="">Todos los métodos</option>
            {METODOS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Toolbar>

        {cargando ? (
          <div className="bg-white rounded-2xl p-10 shadow text-center text-slate-500">
            Cargando…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow text-center text-slate-500">
            {riegos.length === 0
              ? "No existen riegos registrados."
              : "No se encontraron resultados para tu búsqueda."}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtrados.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold text-green-700">
                    💧 {nombreParcela(r.parcela_id)}
                  </h3>
                  <span className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm font-semibold">
                    {r.metodo}
                  </span>
                </div>

                <div className="space-y-2 text-slate-700">
                  <p>📅 {r.fecha}</p>
                  {nombreCultivo(r.cultivo_id) && (
                    <p>🌱 {nombreCultivo(r.cultivo_id)}</p>
                  )}
                  <p>🚰 {r.cantidad_agua ?? "-"} m³</p>
                  <p>⏱️ {r.duracion_horas ?? "-"} h</p>
                  {r.observaciones && (
                    <p className="text-slate-500 pt-2">📝 {r.observaciones}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <button
                    onClick={() => editarRiego(r)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarRiego(r.id)}
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
