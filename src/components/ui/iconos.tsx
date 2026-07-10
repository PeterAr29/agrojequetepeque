"use client";

import {
  LayoutDashboard,
  CloudRain,
  Tractor,
  Sprout,
  Droplets,
  TrendingUp,
  Wallet,
  Landmark,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * Iconos de cada módulo (SVG uniformes, en vez de emojis que cambian por SO).
 * Se usan en el Sidebar y en los accesos rápidos del dashboard.
 */
export const ICONOS_MODULO: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  clima: CloudRain,
  parcelas: Tractor,
  cultivos: Sprout,
  riegos: Droplets,
  produccion: TrendingUp,
  gastos: Wallet,
  ingresos: Landmark,
  configuracion: Settings,
};
