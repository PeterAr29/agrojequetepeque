"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast, useConfirm } from "@/components/ui/FeedbackProvider";
import { CATEGORIAS_GASTO as CATEGORIAS, formatoSoles, hoyISO } from "@/lib/types";
import Toolbar from "@/components/ui/Toolbar";
import { exportarExcel, exportarPDF, type ColumnaExport } from "@/lib/export";

type Parcela = {
  id: string;
  nombre: string;
};

type Gasto = {
  id: string;
  parcela_id: string | null;
  categoria: string;
  descripcion: string | null;
  monto: number;
  fecha: string;
};

export default function GastosPage() {
  const toast = useToast();
  const confirmar = useConfirm();
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");

  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);

  const [parcelaId, setParcelaId] = useState("");
  const [categoria, setCategoria] = useState("Insumos");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");

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

    const { data: gastosData } = await supabase
      .from("gastos")
      .select("*")
      .order("fecha", { ascending: false });

    setGastos((gastosData as Gasto[]) || []);
    setCargando(false);
  }

  async function guardarGasto() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (!monto || Number(monto) <= 0) {
      toast.error("Ingrese un monto válido");
      return;
    }

    const payload = {
      usuario_id: user.id,
      parcela_id: parcelaId || null,
      categoria,
      descripcion,
      monto: Number(monto),
      fecha: fecha || hoyISO(),
    };

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("gastos")
        .update(payload)
        .eq("id", editandoId);

      if (error) {
        toast.error(error.message);
        setGuardando(false);
        return;
      }
      toast.success("Gasto actualizado");
    } else {
      const { error } = await supabase.from("gastos").insert(payload);

      if (error) {
        toast.error(error.message);
        setGuardando(false);
        return;
      }
      toast.success("Gasto registrado");
    }

    setGuardando(false);
    limpiarFormulario();
    await cargarDatos();
  }

  function editarGasto(gasto: Gasto) {
    setEditandoId(gasto.id);
    setParcelaId(gasto.parcela_id || "");
    setCategoria(gasto.categoria);
    setDescripcion(gasto.descripcion || "");
    setMonto(gasto.monto?.toString() || "");
    setFecha(gasto.fecha || "");
  }

  async function eliminarGasto(id: string) {
    const ok = await confirmar({
      titulo: "Eliminar gasto",
      mensaje: "¿Desea eliminar este gasto?",
      textoConfirmar: "Eliminar",
      peligro: true,
    });
    if (!ok) return;

    const { error } = await supabase.from("gastos").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Gasto eliminado");
    await cargarDatos();
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setParcelaId("");
    setCategoria("Insumos");
    setDescripcion("");
    setMonto("");
    setFecha("");
  }

  useEffect(() => {
    const timer = setTimeout(() => cargarDatos(), 0);
    return () => clearTimeout(timer);
  }, []);

  const nombreParcela = (id: string | null) =>
    parcelas.find((p) => p.id === id)?.nombre || "General";

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return gastos.filter((g) => {
      const coincideTexto =
        !texto ||
        [g.descripcion, g.categoria, nombreParcela(g.parcela_id)]
          .join(" ")
          .toLowerCase()
          .includes(texto);
      const coincideCategoria = !filtroCategoria || g.categoria === filtroCategoria;
      return coincideTexto && coincideCategoria;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, busqueda, filtroCategoria, parcelas]);

  const total = filtrados.reduce((sum, g) => sum + Number(g.monto), 0);

  const columnas: ColumnaExport<Gasto>[] = [
    { header: "Fecha", valor: (g) => g.fecha },
    { header: "Categoría", valor: (g) => g.categoria },
    { header: "Parcela", valor: (g) => nombreParcela(g.parcela_id) },
    { header: "Descripción", valor: (g) => g.descripcion || "" },
    { header: "Monto (S/)", valor: (g) => Number(g.monto).toFixed(2) },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-700">💰 Gestión de Gastos</h1>
          <p className="text-slate-600 mt-2">
            Registra los costos operativos de tu producción agrícola.
          </p>
        </div>

        {/* RESUMEN */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-6 text-white shadow-lg mb-8">
          <p className="text-red-100">Total de gastos registrados</p>
          <h2 className="text-4xl font-bold mt-1">{formatoSoles(total)}</h2>
        </div>

        {/* FORMULARIO */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            {editandoId ? "✏️ Editar Gasto" : "➕ Nuevo Gasto"}
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            <select
              className="border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
              value={parcelaId}
              onChange={(e) => setParcelaId(e.target.value)}
            >
              <option value="">Sin parcela (general)</option>
              {parcelas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>

            <select
              className="border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <input
              type="number"
              step="0.01"
              className="border border-slate-300 rounded-xl p-3 text-slate-800"
              placeholder="Monto (S/)"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />

            <div>
              <label className="block mb-2 font-medium text-slate-700">Fecha</label>
              <input
                type="date"
                className="border border-slate-300 rounded-xl p-3 w-full text-slate-800"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>

          <textarea
            className="w-full border border-slate-300 rounded-xl p-3 mt-5 text-slate-800"
            rows={3}
            placeholder="Descripción del gasto"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />

          <div className="flex gap-3 mt-6">
            <button
              onClick={guardarGasto}
              disabled={guardando}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-8 py-3 rounded-xl shadow-lg"
            >
              {guardando
                ? "Guardando…"
                : editandoId
                ? "Actualizar Gasto"
                : "Guardar Gasto"}
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
          <h2 className="text-3xl font-bold text-slate-800">📋 Mis Gastos</h2>
          <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
            {filtrados.length} Registros
          </span>
        </div>

        <Toolbar
          busqueda={busqueda}
          onBuscar={setBusqueda}
          placeholder="Buscar por descripción, categoría o parcela…"
          onExportExcel={() => exportarExcel("gastos", columnas, filtrados)}
          onExportPDF={() => exportarPDF("gastos", "Reporte de Gastos", columnas, filtrados)}
          hayDatos={filtrados.length > 0}
        >
          <select
            className="border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map((c) => (
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
            {gastos.length === 0
              ? "No existen gastos registrados."
              : "No se encontraron resultados para tu búsqueda."}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 text-sm">
                  <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Parcela</th>
                    <th className="p-4">Descripción</th>
                    <th className="p-4 text-right">Monto</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((g) => (
                    <tr key={g.id} className="border-t border-slate-100 text-slate-700">
                      <td className="p-4">{g.fecha}</td>
                      <td className="p-4">
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                          {g.categoria}
                        </span>
                      </td>
                      <td className="p-4">{nombreParcela(g.parcela_id)}</td>
                      <td className="p-4 text-slate-500">{g.descripcion || "-"}</td>
                      <td className="p-4 text-right font-bold text-slate-800">
                        {formatoSoles(Number(g.monto))}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => editarGasto(g)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarGasto(g.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
