"use client";

import { formatoSoles } from "@/lib/types";

type Registro = { fecha: string; monto: number };

type BarraMes = {
  etiqueta: string;
  gastos: number;
  ingresos: number;
};

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Set", "Oct", "Nov", "Dic",
];

/**
 * Gráfico de barras (sin librerías) que compara gastos vs ingresos
 * de los últimos 6 meses. Agrupa por mes en el cliente.
 */
export default function GraficoMensual({
  gastos,
  ingresos,
}: {
  gastos: Registro[];
  ingresos: Registro[];
}) {
  // Construye los últimos 6 meses (clave YYYY-M).
  const hoy = new Date();
  const meses: BarraMes[] = [];
  const indicePorClave = new Map<string, number>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const clave = `${d.getFullYear()}-${d.getMonth()}`;
    indicePorClave.set(clave, meses.length);
    meses.push({ etiqueta: MESES[d.getMonth()], gastos: 0, ingresos: 0 });
  }

  const acumular = (registros: Registro[], campo: "gastos" | "ingresos") => {
    for (const r of registros) {
      if (!r.fecha) continue;
      const d = new Date(r.fecha);
      const clave = `${d.getFullYear()}-${d.getMonth()}`;
      const idx = indicePorClave.get(clave);
      if (idx !== undefined) meses[idx][campo] += Number(r.monto) || 0;
    }
  };

  acumular(gastos, "gastos");
  acumular(ingresos, "ingresos");

  const maximo = Math.max(
    1,
    ...meses.map((m) => Math.max(m.gastos, m.ingresos))
  );

  const hayDatos = meses.some((m) => m.gastos > 0 || m.ingresos > 0);

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="text-xl font-bold text-slate-800">
          📊 Ingresos vs Gastos (últimos 6 meses)
        </h3>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded bg-blue-500" /> Ingresos
          </span>
          <span className="flex items-center gap-2 text-slate-600">
            <span className="w-3 h-3 rounded bg-red-500" /> Gastos
          </span>
        </div>
      </div>

      {!hayDatos ? (
        <p className="text-center text-slate-400 py-12">
          Aún no hay datos financieros para mostrar.
        </p>
      ) : (
        <div className="flex items-end justify-between gap-2 sm:gap-4 h-56">
          {meses.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full">
              <div className="flex-1 w-full flex items-end justify-center gap-1">
                <div
                  className="w-1/2 max-w-[28px] bg-blue-500 rounded-t-md transition-all hover:bg-blue-600 relative group"
                  style={{ height: `${(m.ingresos / maximo) * 100}%` }}
                  title={`Ingresos: ${formatoSoles(m.ingresos)}`}
                />
                <div
                  className="w-1/2 max-w-[28px] bg-red-500 rounded-t-md transition-all hover:bg-red-600 relative group"
                  style={{ height: `${(m.gastos / maximo) * 100}%` }}
                  title={`Gastos: ${formatoSoles(m.gastos)}`}
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">{m.etiqueta}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
