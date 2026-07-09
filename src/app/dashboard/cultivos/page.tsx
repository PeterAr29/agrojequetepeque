"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast, useConfirm } from "@/components/ui/FeedbackProvider";
import { ESTADOS_CULTIVO } from "@/lib/types";
import Toolbar from "@/components/ui/Toolbar";
import { exportarExcel, exportarPDF, type ColumnaExport } from "@/lib/export";

type Parcela = {
  id: string;
  nombre: string;
};

type Cultivo = {
  id: string;
  nombre: string;
  tipo: string;
  fecha_siembra: string;
  fecha_cosecha: string;
  estado: string;
  parcela_id: string;
};

export default function CultivosPage() {
  const toast = useToast();
  const confirmar = useConfirm();
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);

  const [parcelaId, setParcelaId] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [fechaSiembra, setFechaSiembra] = useState("");
  const [fechaCosecha, setFechaCosecha] = useState("");
  const [estado, setEstado] = useState("Activo");

  const [editandoId, setEditandoId] = useState<string | null>(null);

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
      .select("*");

    setCultivos((cultivosData as Cultivo[]) || []);
    setCargando(false);
  }

  async function guardarCultivo() {
    if (!parcelaId) {
      toast.error("Seleccione una parcela");
      return;
    }

    if (!nombre.trim()) {
      toast.error("Ingrese el nombre del cultivo");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("cultivos")
        .update({
          nombre,
          tipo,
          fecha_siembra: fechaSiembra || null,
          fecha_cosecha: fechaCosecha || null,
          estado,
          parcela_id: parcelaId,
        })
        .eq("id", editandoId);

      if (error) {
        toast.error(error.message);
        setGuardando(false);
        return;
      }

      toast.success("Cultivo actualizado");
    } else {
      const { error } = await supabase.from("cultivos").insert({
        usuario_id: user.id,
        nombre,
        tipo,
        fecha_siembra: fechaSiembra || null,
        fecha_cosecha: fechaCosecha || null,
        estado,
        parcela_id: parcelaId,
      });

      if (error) {
        toast.error(error.message);
        setGuardando(false);
        return;
      }

      toast.success("Cultivo registrado");
    }

    setGuardando(false);
    limpiarFormulario();
    await cargarDatos();
  }

  function editarCultivo(cultivo: Cultivo) {
    setEditandoId(cultivo.id);
    setNombre(cultivo.nombre);
    setTipo(cultivo.tipo);
    setFechaSiembra(cultivo.fecha_siembra || "");
    setFechaCosecha(cultivo.fecha_cosecha || "");
    setEstado(cultivo.estado);
    setParcelaId(cultivo.parcela_id);
  }

  async function eliminarCultivo(id: string) {
    const ok = await confirmar({
      titulo: "Eliminar cultivo",
      mensaje: "¿Desea eliminar este cultivo? Esta acción no se puede deshacer.",
      textoConfirmar: "Eliminar",
      peligro: true,
    });

    if (!ok) return;

    const { error } = await supabase
      .from("cultivos")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Cultivo eliminado");
    await cargarDatos();
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setParcelaId("");
    setNombre("");
    setTipo("");
    setFechaSiembra("");
    setFechaCosecha("");
    setEstado("Activo");
  }

  useEffect(() => {
  const cargar = async () => {
    await cargarDatos();
  };

  const timer = setTimeout(() => {
    cargar();
  }, 0);

  return () => clearTimeout(timer);
}, []);

  const nombreParcela = (id: string | null) =>
    parcelas.find((p) => p.id === id)?.nombre || "-";

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return cultivos.filter((c) => {
      const coincideTexto =
        !texto ||
        [c.nombre, c.tipo, c.estado, nombreParcela(c.parcela_id)]
          .join(" ")
          .toLowerCase()
          .includes(texto);
      const coincideEstado = !filtroEstado || c.estado === filtroEstado;
      return coincideTexto && coincideEstado;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cultivos, busqueda, filtroEstado, parcelas]);

  const columnas: ColumnaExport<Cultivo>[] = [
    { header: "Nombre", valor: (c) => c.nombre },
    { header: "Tipo", valor: (c) => c.tipo },
    { header: "Parcela", valor: (c) => nombreParcela(c.parcela_id) },
    { header: "Estado", valor: (c) => c.estado },
    { header: "Siembra", valor: (c) => c.fecha_siembra },
    { header: "Cosecha", valor: (c) => c.fecha_cosecha },
  ];

  return (
  <div className="min-h-screen bg-slate-100 p-8">

    <div className="max-w-7xl mx-auto">

      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">

        <div>
          <h1 className="text-4xl font-bold text-green-700">
            🌱 Gestión de Cultivos
          </h1>

          <p className="text-slate-600 mt-2">
            Administra los cultivos registrados en tus parcelas.
          </p>
        </div>

      </div>

      {/* FORMULARIO */}

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-10">

        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          {editandoId
            ? "✏️ Editar Cultivo"
            : "➕ Nuevo Cultivo"}
        </h2>

        <div className="grid md:grid-cols-2 gap-5">

          <select
            className="border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
            value={parcelaId}
            onChange={(e) => setParcelaId(e.target.value)}
          >
            <option value="">
              Seleccione una parcela
            </option>

            {parcelas.map((parcela) => (
              <option
                key={parcela.id}
                value={parcela.id}
              >
                {parcela.nombre}
              </option>
            ))}
          </select>

          <input
            className="border border-slate-300 rounded-xl p-3 text-slate-800"
            placeholder="Nombre del cultivo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <input
            className="border border-slate-300 rounded-xl p-3 text-slate-800"
            placeholder="Tipo de cultivo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          />

          <select
            className="border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            {ESTADOS_CULTIVO.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>

          <div>
            <label className="block mb-2 font-medium text-slate-700">
              Fecha de Siembra
            </label>

            <input
              type="date"
              className="border border-slate-300 rounded-xl p-3 w-full text-slate-800"
              value={fechaSiembra}
              onChange={(e) =>
                setFechaSiembra(e.target.value)
              }
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-slate-700">
              Fecha de Cosecha
            </label>

            <input
              type="date"
              className="border border-slate-300 rounded-xl p-3 w-full text-slate-800"
              value={fechaCosecha}
              onChange={(e) =>
                setFechaCosecha(e.target.value)
              }
            />
          </div>

        </div>

        <button
          onClick={guardarCultivo}
          disabled={guardando}
          className="mt-6 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-8 py-3 rounded-xl shadow-lg"
        >
          {guardando
            ? "Guardando…"
            : editandoId
            ? "Actualizar Cultivo"
            : "Guardar Cultivo"}
        </button>

      </div>

      {/* LISTA */}

      <div className="flex items-center justify-between mb-5">

        <h2 className="text-3xl font-bold text-slate-800">
          🌾 Mis Cultivos
        </h2>

        <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
          {filtrados.length} Cultivos
        </span>

      </div>

      <Toolbar
        busqueda={busqueda}
        onBuscar={setBusqueda}
        placeholder="Buscar por nombre, tipo o parcela…"
        onExportExcel={() => exportarExcel("cultivos", columnas, filtrados)}
        onExportPDF={() =>
          exportarPDF("cultivos", "Reporte de Cultivos", columnas, filtrados)
        }
        hayDatos={filtrados.length > 0}
      >
        <select
          className="border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {ESTADOS_CULTIVO.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </Toolbar>

      {cargando ? (
        <div className="bg-white rounded-2xl p-10 shadow text-center text-slate-500">
          Cargando…
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 shadow text-center text-slate-500">
          {cultivos.length === 0
            ? "No existen cultivos registrados."
            : "No se encontraron resultados para tu búsqueda."}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          {filtrados.map((cultivo) => (

            <div
              key={cultivo.id}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition"
            >

              <div className="flex justify-between items-start mb-4">

                <h3 className="text-2xl font-bold text-green-700">
                  {cultivo.nombre}
                </h3>

                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${
                    cultivo.estado === "Activo"
                      ? "bg-green-600"
                      : cultivo.estado === "Cosechado"
                      ? "bg-yellow-500"
                      : "bg-slate-600"
                  }`}
                >
                  {cultivo.estado}
                </span>

              </div>

              <div className="space-y-2 text-slate-700">

                <p>
                  <strong>🌱 Tipo:</strong> {cultivo.tipo}
                </p>

                <p>
                  <strong>📅 Siembra:</strong>{" "}
                  {cultivo.fecha_siembra}
                </p>

                <p>
                  <strong>🌾 Cosecha:</strong>{" "}
                  {cultivo.fecha_cosecha}
                </p>

              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">

                <button
                  onClick={() =>
                    editarCultivo(cultivo)
                  }
                  className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg"
                >
                  Editar
                </button>

                <button
                  onClick={() =>
                    eliminarCultivo(cultivo.id)
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