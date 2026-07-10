"use client";

import { useEffect, useState } from "react";
import { Tractor, Sprout, Wallet, Landmark, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatoSoles } from "@/lib/types";
import { ICONOS_MODULO } from "@/components/ui/iconos";
import GraficoMensual from "@/components/ui/GraficoMensual";
import AlertaClima from "@/components/ui/AlertaClima";
import Skeleton from "@/components/ui/Skeleton";

type Movimiento = { fecha: string; monto: number };

export default function Dashboard() {
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(true);

  const [totalParcelas, setTotalParcelas] = useState(0);
  const [totalCultivos, setTotalCultivos] = useState(0);
  const [totalGastos, setTotalGastos] = useState(0);
  const [totalIngresos, setTotalIngresos] = useState(0);

  const [gastos, setGastos] = useState<Movimiento[]>([]);
  const [ingresos, setIngresos] = useState<Movimiento[]>([]);

  async function cargarDashboard() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setEmail(user.email || "");

    const [parcelasRes, cultivosRes, gastosRes, ingresosRes] = await Promise.all([
      supabase
        .from("parcelas")
        .select("*", { count: "exact", head: true })
        .eq("usuario_id", user.id),
      supabase
        .from("cultivos")
        .select("*", { count: "exact", head: true })
        .eq("usuario_id", user.id),
      supabase.from("gastos").select("fecha,monto").eq("usuario_id", user.id),
      supabase.from("ingresos").select("fecha,monto").eq("usuario_id", user.id),
    ]);

    setTotalParcelas(parcelasRes.count || 0);
    setTotalCultivos(cultivosRes.count || 0);

    const listaGastos = (gastosRes.data as Movimiento[]) || [];
    const listaIngresos = (ingresosRes.data as Movimiento[]) || [];

    setGastos(listaGastos);
    setIngresos(listaIngresos);
    setTotalGastos(listaGastos.reduce((s, g) => s + Number(g.monto), 0));
    setTotalIngresos(listaIngresos.reduce((s, i) => s + Number(i.monto), 0));

    setCargando(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => cargarDashboard(), 0);
    return () => clearTimeout(timer);
  }, []);

  const balance = totalIngresos - totalGastos;

  return (
    <div className="p-4 sm:p-8">
      {/* BIENVENIDA */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">
          🌱 Bienvenido a AgroJequetepeque
        </h2>
        <p className="text-green-100">
          Gestiona parcelas, cultivos y la producción agrícola desde una sola
          plataforma.
        </p>
        {email && (
          <div className="mt-4 inline-block bg-white/20 px-4 py-2 rounded-xl">
            👤 {email}
          </div>
        )}
      </div>

      {/* ALERTA DE LLUVIA */}
      <AlertaClima />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <KpiCard
          Icono={Tractor}
          fondo="bg-green-100"
          iconoColor="text-green-700"
          etiqueta="Parcelas Registradas"
          badge="Activas"
          badgeColor="text-green-600"
          cargando={cargando}
          valor={String(totalParcelas)}
        />
        <KpiCard
          Icono={Sprout}
          fondo="bg-emerald-100"
          iconoColor="text-emerald-700"
          etiqueta="Cultivos Registrados"
          badge="Activos"
          badgeColor="text-emerald-600"
          cargando={cargando}
          valor={String(totalCultivos)}
        />
        <KpiCard
          Icono={Wallet}
          fondo="bg-red-100"
          iconoColor="text-red-600"
          etiqueta="Gastos Totales"
          badge="Egresos"
          badgeColor="text-red-600"
          cargando={cargando}
          valor={formatoSoles(totalGastos)}
        />
        <KpiCard
          Icono={Landmark}
          fondo="bg-blue-100"
          iconoColor="text-blue-600"
          etiqueta="Ingresos Totales"
          badge="Ventas"
          badgeColor="text-blue-600"
          cargando={cargando}
          valor={formatoSoles(totalIngresos)}
        />
      </div>

      {/* BALANCE + GRÁFICO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
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
            <h2 className="text-4xl font-bold mt-2">{formatoSoles(balance)}</h2>
          )}
          <p className="text-white/80 mt-3 text-sm">
            {balance >= 0
              ? "✅ Tus ingresos superan a tus gastos."
              : "⚠️ Tus gastos superan a tus ingresos."}
          </p>
        </div>

        <div className="lg:col-span-2">
          <GraficoMensual gastos={gastos} ingresos={ingresos} />
        </div>
      </div>

      {/* ACCESOS RÁPIDOS */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
          🚀 Accesos Rápidos
        </h2>
        <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
          AgroJequetepeque
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AccesoRapido href="/dashboard/parcelas" modulo="parcelas" titulo="Parcelas" texto="Gestión de terrenos agrícolas." />
        <AccesoRapido href="/dashboard/cultivos" modulo="cultivos" titulo="Cultivos" texto="Control de siembras y cosechas." />
        <AccesoRapido href="/dashboard/riegos" modulo="riegos" titulo="Riegos" texto="Seguimiento del riego agrícola." />
        <AccesoRapido href="/dashboard/produccion" modulo="produccion" titulo="Producción" texto="Rendimiento y cosechas." />
        <AccesoRapido href="/dashboard/gastos" modulo="gastos" titulo="Gastos" texto="Costos operativos agrícolas." />
        <AccesoRapido href="/dashboard/ingresos" modulo="ingresos" titulo="Ingresos" texto="Ventas y rentabilidad." />
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
        <span className={`${badgeColor} font-semibold`}>{badge}</span>
      </div>
      <p className="text-slate-500">{etiqueta}</p>
      {cargando ? (
        <Skeleton className="h-8 w-24 mt-3" />
      ) : (
        <h2 className="text-3xl font-bold text-slate-800 mt-2 break-words">
          {valor}
        </h2>
      )}
    </div>
  );
}

function AccesoRapido({
  href,
  modulo,
  titulo,
  texto,
}: {
  href: string;
  modulo: string;
  titulo: string;
  texto: string;
}) {
  const Icono = ICONOS_MODULO[modulo];
  return (
    <a
      href={href}
      className="group bg-white rounded-3xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all"
    >
      <div className="inline-flex p-4 mb-4 rounded-2xl bg-green-100 text-green-700 group-hover:bg-green-600 group-hover:text-white transition-colors">
        <Icono className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-slate-800">{titulo}</h3>
      <p className="text-slate-500 mt-2">{texto}</p>
    </a>
  );
}
