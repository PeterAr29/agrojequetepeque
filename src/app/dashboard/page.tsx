"use client";

import { useEffect, useState } from "react";
import {
  Tractor,
  Sprout,
  Wallet,
  Landmark,
  Ruler,
  Wheat,
  Activity,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatoSoles, CATEGORIAS_GASTO } from "@/lib/types";
import GraficoMensual from "@/components/ui/GraficoMensual";
import AlertaClima from "@/components/ui/AlertaClima";
import Skeleton from "@/components/ui/Skeleton";

type Gasto = { fecha: string; monto: number; categoria: string; descripcion: string | null };
type Ingreso = { fecha: string; monto: number; concepto: string | null };
type Actividad = {
  tipo: "gasto" | "ingreso";
  etiqueta: string;
  fecha: string;
  monto: number;
};

// Equivalencia aproximada a kg para totalizar producción de distintas unidades.
const A_KG: Record<string, number> = { kg: 1, ton: 1000, quintal: 100 };

const COLOR_CATEGORIA: Record<string, string> = {
  Insumos: "bg-green-500",
  "Mano de obra": "bg-blue-500",
  Maquinaria: "bg-amber-500",
  Riego: "bg-cyan-500",
  Transporte: "bg-purple-500",
  Otros: "bg-slate-400",
};

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function fechaLarga(): string {
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function fechaCorta(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" }).format(
    new Date(y, (m || 1) - 1, d || 1)
  );
}

function numero(n: number): string {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(n || 0);
}

export default function Dashboard() {
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(true);

  const [totalParcelas, setTotalParcelas] = useState(0);
  const [superficie, setSuperficie] = useState(0);
  const [totalCultivos, setTotalCultivos] = useState(0);
  const [cultivosActivos, setCultivosActivos] = useState(0);
  const [produccionKg, setProduccionKg] = useState(0);

  const [totalGastos, setTotalGastos] = useState(0);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [gastosMes, setGastosMes] = useState(0);
  const [ingresosMes, setIngresosMes] = useState(0);

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);

  async function cargarDashboard() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setEmail(user.email || "");

    const [parcelasRes, cultivosRes, produccionRes, gastosRes, ingresosRes] =
      await Promise.all([
        supabase.from("parcelas").select("superficie").eq("usuario_id", user.id),
        supabase.from("cultivos").select("estado").eq("usuario_id", user.id),
        supabase.from("produccion").select("cantidad,unidad").eq("usuario_id", user.id),
        supabase
          .from("gastos")
          .select("fecha,monto,categoria,descripcion")
          .eq("usuario_id", user.id),
        supabase.from("ingresos").select("fecha,monto,concepto").eq("usuario_id", user.id),
      ]);

    const parcelas = (parcelasRes.data as { superficie: number | null }[]) || [];
    setTotalParcelas(parcelas.length);
    setSuperficie(parcelas.reduce((s, p) => s + Number(p.superficie || 0), 0));

    const cultivos = (cultivosRes.data as { estado: string | null }[]) || [];
    setTotalCultivos(cultivos.length);
    setCultivosActivos(
      cultivos.filter((c) => (c.estado || "").toLowerCase().startsWith("activ")).length
    );

    const produccion = (produccionRes.data as { cantidad: number | null; unidad: string }[]) || [];
    setProduccionKg(
      produccion.reduce((s, p) => s + Number(p.cantidad || 0) * (A_KG[p.unidad] || 1), 0)
    );

    const listaGastos = (gastosRes.data as Gasto[]) || [];
    const listaIngresos = (ingresosRes.data as Ingreso[]) || [];
    setGastos(listaGastos);
    setIngresos(listaIngresos);

    setTotalGastos(listaGastos.reduce((s, g) => s + Number(g.monto), 0));
    setTotalIngresos(listaIngresos.reduce((s, i) => s + Number(i.monto), 0));

    const mesActual = new Date().toISOString().slice(0, 7); // YYYY-MM
    const delMes = (f: string) => (f || "").slice(0, 7) === mesActual;
    setGastosMes(listaGastos.filter((g) => delMes(g.fecha)).reduce((s, g) => s + Number(g.monto), 0));
    setIngresosMes(
      listaIngresos.filter((i) => delMes(i.fecha)).reduce((s, i) => s + Number(i.monto), 0)
    );

    setCargando(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => cargarDashboard(), 0);
    return () => clearTimeout(timer);
  }, []);

  const balance = totalIngresos - totalGastos;

  // Distribución de gastos por categoría (solo las que tienen monto).
  const porCategoria = CATEGORIAS_GASTO.map((cat) => ({
    cat,
    total: gastos.filter((g) => g.categoria === cat).reduce((s, g) => s + Number(g.monto), 0),
  }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxCategoria = Math.max(1, ...porCategoria.map((x) => x.total));

  // Actividad reciente: gastos + ingresos combinados, más nuevos primero.
  const actividad: Actividad[] = [
    ...gastos.map((g) => ({
      tipo: "gasto" as const,
      etiqueta: g.descripcion?.trim() || g.categoria,
      fecha: g.fecha,
      monto: Number(g.monto),
    })),
    ...ingresos.map((i) => ({
      tipo: "ingreso" as const,
      etiqueta: i.concepto?.trim() || "Ingreso",
      fecha: i.fecha,
      monto: Number(i.monto),
    })),
  ]
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))
    .slice(0, 6);

  return (
    <div className="p-4 sm:p-8 space-y-8">
      {/* BIENVENIDA */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-700 to-green-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-8 -top-10 opacity-10 pointer-events-none">
          <Sprout className="w-48 h-48" />
        </div>
        <div className="relative">
          <p className="text-green-100 capitalize">{fechaLarga()}</p>
          <h2 className="text-2xl sm:text-3xl font-bold mt-1 mb-2">
            🌱 {saludo()}, bienvenido a AgroJequetepeque
          </h2>
          <p className="text-green-100 max-w-2xl">
            Gestiona parcelas, cultivos y la producción agrícola desde una sola plataforma.
          </p>
          {email && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl">
              👤 {email}
            </div>
          )}
        </div>
      </div>

      {/* ALERTA DE LLUVIA */}
      <AlertaClima />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard
          Icono={Tractor}
          fondo="bg-green-100"
          iconoColor="text-green-700"
          etiqueta="Parcelas registradas"
          badge="Terrenos"
          badgeColor="text-green-600"
          cargando={cargando}
          valor={String(totalParcelas)}
        />
        <KpiCard
          Icono={Sprout}
          fondo="bg-emerald-100"
          iconoColor="text-emerald-700"
          etiqueta="Cultivos registrados"
          badge={`${cultivosActivos} activos`}
          badgeColor="text-emerald-600"
          cargando={cargando}
          valor={String(totalCultivos)}
        />
        <KpiCard
          Icono={Ruler}
          fondo="bg-lime-100"
          iconoColor="text-lime-700"
          etiqueta="Superficie total"
          badge="Hectáreas"
          badgeColor="text-lime-600"
          cargando={cargando}
          valor={`${numero(superficie)} ha`}
        />
        <KpiCard
          Icono={Wheat}
          fondo="bg-amber-100"
          iconoColor="text-amber-700"
          etiqueta="Producción total"
          badge="Cosechado"
          badgeColor="text-amber-600"
          cargando={cargando}
          valor={`${numero(produccionKg)} kg`}
        />
        <KpiCard
          Icono={Wallet}
          fondo="bg-red-100"
          iconoColor="text-red-600"
          etiqueta="Gastos totales"
          badge="Egresos"
          badgeColor="text-red-600"
          cargando={cargando}
          valor={formatoSoles(totalGastos)}
        />
        <KpiCard
          Icono={Landmark}
          fondo="bg-blue-100"
          iconoColor="text-blue-600"
          etiqueta="Ingresos totales"
          badge="Ventas"
          badgeColor="text-blue-600"
          cargando={cargando}
          valor={formatoSoles(totalIngresos)}
        />
      </div>

      {/* BALANCE + GRÁFICO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className={`rounded-3xl p-6 shadow-lg text-white flex flex-col justify-center ${
            balance >= 0
              ? "bg-gradient-to-br from-green-600 to-emerald-700"
              : "bg-gradient-to-br from-red-600 to-rose-700"
          }`}
        >
          <p className="text-white/80 text-lg">Balance neto</p>
          {cargando ? (
            <Skeleton className="h-10 w-40 mt-2 bg-white/30" />
          ) : (
            <h2 className="text-4xl font-bold mt-2 break-words">{formatoSoles(balance)}</h2>
          )}
          <p className="text-white/80 mt-3 text-sm">
            {balance >= 0
              ? "✅ Tus ingresos superan a tus gastos."
              : "⚠️ Tus gastos superan a tus ingresos."}
          </p>

          <div className="mt-5 pt-5 border-t border-white/20 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-white/70">Ingresos del mes</p>
              {cargando ? (
                <Skeleton className="h-5 w-20 mt-1 bg-white/30" />
              ) : (
                <p className="font-bold text-base">{formatoSoles(ingresosMes)}</p>
              )}
            </div>
            <div>
              <p className="text-white/70">Gastos del mes</p>
              {cargando ? (
                <Skeleton className="h-5 w-20 mt-1 bg-white/30" />
              ) : (
                <p className="font-bold text-base">{formatoSoles(gastosMes)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <GraficoMensual gastos={gastos} ingresos={ingresos} />
        </div>
      </div>

      {/* DISTRIBUCIÓN DE GASTOS + ACTIVIDAD RECIENTE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por categoría */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-red-100 p-3 rounded-2xl">
              <PieChart className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Gastos por categoría</h3>
          </div>

          {cargando ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : porCategoria.length === 0 ? (
            <p className="text-center text-slate-400 py-12">
              Aún no hay gastos registrados.
            </p>
          ) : (
            <div className="space-y-4">
              {porCategoria.map(({ cat, total }) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-700">{cat}</span>
                    <span className="font-semibold text-slate-800">{formatoSoles(total)}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${COLOR_CATEGORIA[cat] || "bg-slate-400"} transition-all`}
                      style={{ width: `${(total / maxCategoria) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actividad reciente */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-100 p-3 rounded-2xl">
              <Activity className="w-6 h-6 text-green-700" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Actividad reciente</h3>
          </div>

          {cargando ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : actividad.length === 0 ? (
            <p className="text-center text-slate-400 py-12">
              Todavía no hay movimientos registrados.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {actividad.map((a, i) => {
                const esIngreso = a.tipo === "ingreso";
                return (
                  <li key={i} className="flex items-center gap-4 py-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        esIngreso ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"
                      }`}
                    >
                      {esIngreso ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 truncate">{a.etiqueta}</p>
                      <p className="text-xs text-slate-500">
                        {esIngreso ? "Ingreso" : "Gasto"} · {fechaCorta(a.fecha)}
                      </p>
                    </div>
                    <span
                      className={`font-bold whitespace-nowrap ${
                        esIngreso ? "text-blue-600" : "text-red-600"
                      }`}
                    >
                      {esIngreso ? "+" : "−"}
                      {formatoSoles(a.monto)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  Icono,
  fondo,
  iconoColor,
  etiqueta,
  badge,
  badgeColor,
  cargando,
  valor,
}: {
  Icono: LucideIcon;
  fondo: string;
  iconoColor: string;
  etiqueta: string;
  badge: string;
  badgeColor: string;
  cargando: boolean;
  valor: string;
}) {
  return (
    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all">
      <div className="flex justify-between items-center mb-4">
        <div className={`${fondo} p-4 rounded-2xl`}>
          <Icono className={`w-7 h-7 ${iconoColor}`} />
        </div>
        <span className={`${badgeColor} font-semibold text-sm`}>{badge}</span>
      </div>
      <p className="text-slate-500">{etiqueta}</p>
      {cargando ? (
        <Skeleton className="h-8 w-24 mt-3" />
      ) : (
        <h2 className="text-3xl font-bold text-slate-800 mt-2 break-words">{valor}</h2>
      )}
    </div>
  );
}
