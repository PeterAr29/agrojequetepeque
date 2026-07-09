"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast, useConfirm } from "@/components/ui/FeedbackProvider";
import { formatoSoles, hoyISO } from "@/lib/types";
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

type Ingreso = {
  id: string;
  parcela_id: string | null;
  cultivo_id: string | null;
  concepto: string | null;
  cantidad_kg: number | null;
  monto: number;
  fecha: string;
};

export default function IngresosPage() {
  const toast = useToast();
  const confirmar = useConfirm();
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroCultivo, setFiltroCultivo] = useState("");

  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);

  const [parcelaId, setParcelaId] = useState("");
  const [cultivoId, setCultivoId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [cantidadKg, setCantidadKg] = useState("");
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

    const { data: cultivosData } = await supabase
      .from("cultivos")
      .select("id,nombre");
    setCultivos((cultivosData as Cultivo[]) || []);

    const { data: ingresosData } = await supabase
      .from("ingresos")
      .select("*")
      .order("fecha", { ascending: false });
    setIngresos((ingresosData as Ingreso[]) || []);

    setCargando(false);
  }

  async function guardarIngreso() {
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
      cultivo_id: cultivoId || null,
      concepto,
      cantidad_kg: cantidadKg === "" ? null : Number(cantidadKg),
      monto: Number(monto),
      fecha: fecha || hoyISO(),
    };

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("ingresos")
        .update(payload)
        .eq("id", editandoId);
      if (error) {
        toast.error(error.message);
        setGuardando(false);
        return;
      }
      toast.success("Ingreso actualizado");
    } else {
      const { error } = await supabase.from("ingresos").insert(payload);
      if (error) {
        toast.error(error.message);
        setGuardando(false);
        return;
      }
      toast.success("Ingreso registrado");
    }

    setGuardando(false);
    limpiarFormulario();
    await cargarDatos();
  }

  function editarIngreso(ingreso: Ingreso) {
    setEditandoId(ingreso.id);
    setParcelaId(ingreso.parcela_id || "");
    setCultivoId(ingreso.cultivo_id || "");
    setConcepto(ingreso.concepto || "");
    setCantidadKg(ingreso.cantidad_kg?.toString() || "");
    setMonto(ingreso.monto?.toString() || "");
    setFecha(ingreso.fecha || "");
  }

  async function eliminarIngreso(id: string) {
    const ok = await confirmar({
      titulo: "Eliminar ingreso",
      mensaje: "¿Desea eliminar este ingreso?",
      textoConfirmar: "Eliminar",
      peligro: true,
    });
    if (!ok) return;

    const { error } = await supabase.from("ingresos").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ingreso eliminado");
    await cargarDatos();
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setParcelaId("");
    setCultivoId("");
    setConcepto("");
    setCantidadKg("");
    setMonto("");
    setFecha("");
  }

  useEffect(() => {
    const timer = setTimeout(() => cargarDatos(), 0);
    return () => clearTimeout(timer);
  }, []);

  const nombreParcela = (id: string | null) =>
    parcelas.find((p) => p.id === id)?.nombre || "General";

  const nombreCultivo = (id: string | null) =>
    cultivos.find((c) => c.id === id)?.nombre || "-";

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return ingresos.filter((i) => {
      const coincideTexto =
        !texto ||
        [i.concepto, nombreCultivo(i.cultivo_id), nombreParcela(i.parcela_id)]
          .join(" ")
          .toLowerCase()
          .includes(texto);
      const coincideCultivo = !filtroCultivo || i.cultivo_id === filtroCultivo;
      return coincideTexto && coincideCultivo;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingresos, busqueda, filtroCultivo, parcelas, cultivos]);

  const total = filtrados.reduce((sum, i) => sum + Number(i.monto), 0);

  const columnas: ColumnaExport<Ingreso>[] = [
    { header: "Fecha", valor: (i) => i.fecha },
    { header: "Concepto", valor: (i) => i.concepto || "" },
    { header: "Cultivo", valor: (i) => nombreCultivo(i.cultivo_id) },
    { header: "Parcela", valor: (i) => nombreParcela(i.parcela_id) },
    { header: "Cantidad (kg)", valor: (i) => i.cantidad_kg ?? "" },
    { header: "Monto (S/)", valor: (i) => Number(i.monto).toFixed(2) },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-700">🏦 Gestión de Ingresos</h1>
          <p className="text-slate-600 mt-2">
            Registra las ventas y la rentabilidad de tu producción.
          </p>
        </div>

        {/* RESUMEN */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg mb-8">
          <p className="text-blue-100">Total de ingresos registrados</p>
          <h2 className="text-4xl font-bold mt-1">{formatoSoles(total)}</h2>
        </div>

        {/* FORMULARIO */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            {editandoId ? "✏️ Editar Ingreso" : "➕ Nuevo Ingreso"}
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
              value={cultivoId}
              onChange={(e) => setCultivoId(e.target.value)}
            >
              <option value="">Sin cultivo</option>
              {cultivos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <input
              className="border border-slate-300 rounded-xl p-3 text-slate-800"
              placeholder="Concepto (ej. Venta de arroz)"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
            />

            <input
              type="number"
              step="0.01"
              className="border border-slate-300 rounded-xl p-3 text-slate-800"
              placeholder="Cantidad (kg)"
              value={cantidadKg}
              onChange={(e) => setCantidadKg(e.target.value)}
            />

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

          <div className="flex gap-3 mt-6">
            <button
              onClick={guardarIngreso}
              disabled={guardando}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-8 py-3 rounded-xl shadow-lg"
            >
              {guardando
                ? "Guardando…"
                : editandoId
                ? "Actualizar Ingreso"
                : "Guardar Ingreso"}
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
          <h2 className="text-3xl font-bold text-slate-800">📋 Mis Ingresos</h2>
          <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
            {filtrados.length} Registros
          </span>
        </div>

        <Toolbar
          busqueda={busqueda}
          onBuscar={setBusqueda}
          placeholder="Buscar por concepto, cultivo o parcela…"
          onExportExcel={() => exportarExcel("ingresos", columnas, filtrados)}
          onExportPDF={() =>
            exportarPDF("ingresos", "Reporte de Ingresos", columnas, filtrados)
          }
          hayDatos={filtrados.length > 0}
        >
          <select
            className="border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            value={filtroCultivo}
            onChange={(e) => setFiltroCultivo(e.target.value)}
          >
            <option value="">Todos los cultivos</option>
            {cultivos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Toolbar>

        {cargando ? (
          <div className="bg-white rounded-2xl p-10 shadow text-center text-slate-500">
            Cargando…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow text-center text-slate-500">
            {ingresos.length === 0
              ? "No existen ingresos registrados."
              : "No se encontraron resultados para tu búsqueda."}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 text-sm">
                  <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Concepto</th>
                    <th className="p-4">Cultivo</th>
                    <th className="p-4">Parcela</th>
                    <th className="p-4 text-right">Cant. (kg)</th>
                    <th className="p-4 text-right">Monto</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((i) => (
                    <tr key={i.id} className="border-t border-slate-100 text-slate-700">
                      <td className="p-4">{i.fecha}</td>
                      <td className="p-4">{i.concepto || "-"}</td>
                      <td className="p-4">{nombreCultivo(i.cultivo_id)}</td>
                      <td className="p-4">{nombreParcela(i.parcela_id)}</td>
                      <td className="p-4 text-right">{i.cantidad_kg ?? "-"}</td>
                      <td className="p-4 text-right font-bold text-green-700">
                        {formatoSoles(Number(i.monto))}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => editarIngreso(i)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarIngreso(i.id)}
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
