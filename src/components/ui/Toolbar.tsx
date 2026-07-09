"use client";

/**
 * Barra de herramientas reutilizable para los listados:
 * búsqueda por texto, filtros extra (children) y botones de exportación.
 */
export default function Toolbar({
  busqueda,
  onBuscar,
  placeholder = "Buscar…",
  onExportExcel,
  onExportPDF,
  hayDatos = true,
  children,
}: {
  busqueda: string;
  onBuscar: (valor: string) => void;
  placeholder?: string;
  onExportExcel: () => void;
  onExportPDF: () => void;
  hayDatos?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow border border-slate-200 p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder={placeholder}
            className="w-full border border-slate-300 rounded-xl py-2.5 pl-10 pr-3 text-slate-800 focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>

        {/* Filtros extra */}
        {children && (
          <div className="flex flex-wrap gap-3">{children}</div>
        )}

        {/* Exportación */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onExportExcel}
            disabled={!hayDatos}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium"
            title="Exportar a Excel (CSV)"
          >
            📊 Excel
          </button>
          <button
            onClick={onExportPDF}
            disabled={!hayDatos}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium"
            title="Exportar a PDF"
          >
            📄 PDF
          </button>
        </div>
      </div>
    </div>
  );
}
